#!/usr/bin/env bun

// --- Core MCP/Bun Imports ---
import { OAuthRegisteredClientsStore } from "@modelcontextprotocol/sdk/server/auth/clients.js";
import { InsufficientScopeError, InvalidClientError, InvalidGrantError, InvalidRequestError, InvalidTokenError, OAuthError, ServerError, UnsupportedGrantTypeError } from "@modelcontextprotocol/sdk/server/auth/errors.js";
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import { AuthorizationParams, OAuthServerProvider } from "@modelcontextprotocol/sdk/server/auth/provider.js";
import { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { OAuthClientInformationFull, OAuthClientMetadata, OAuthTokenRevocationRequest, OAuthTokens } from "@modelcontextprotocol/sdk/shared/auth.js";
import {
    ErrorCode,
    Implementation,
    McpError,
    ServerCapabilities
} from "@modelcontextprotocol/sdk/types.js";

import { Database } from 'bun:sqlite';
import cors from 'cors';
import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import https from 'https';
import fs from 'fs/promises';
import _ from 'lodash';
import { verifyChallenge } from 'pkce-challenge';
import { v4 as uuidv4 } from 'uuid';
import vm from 'vm';
import { z } from 'zod';
import { Command } from 'commander';
import cookie from 'cookie'; // Need to parse cookies
import path from 'path'; // Import path module
import { execSync } from 'child_process'; // Import for running build command

// --- Configuration Loading ---
import { loadConfig, AppConfig } from './src/config.js'; // Import config loader
import { ClientFullEHR } from './clientTypes.js'; // Import client types
import { ehrToSqlite, sqliteToEhr } from './src/dbUtils.js'; // Import the functions

// --- Add Type Declaration for req.auth ---
declare module "express-serve-static-core" {
  interface Request {
    auth?: AuthInfo;
  }
}

// --- Global Config Variable ---
// This will be populated by loadConfig() during startup
let config: AppConfig;

// --- Runtime Checks (Using Config) ---
const SERVER_INFO: Implementation = { name: "EHR-Search-MCP-Server-SMART-Public-Bun", version: "0.5.0" };
const SERVER_CAPABILITIES: ServerCapabilities = { tools: {}, sampling: {} };
const SERVER_OPTIONS = {
    capabilities: SERVER_CAPABILITIES,
    instructions: "Server using SMART on FHIR (Public Client) via Bun to search and query patient EHR data (USCDI)."
};


// --- In-Memory Stores (Demo purposes only!) ---

// State store for the temporary /authorize -> /ehr-retriever-callback flow
interface AuthFlowState { // RENAMED: Was AuthorizeSessionData
    mcpClientId: string;
    mcpRedirectUri: string;
    mcpCodeChallenge: string;
    mcpOriginalState?: string;
    nonce: string;
    expiresAt: number; // Timestamp for expiration
}
const authFlowStates = new Map<string, AuthFlowState>(); // Renamed map
const AUTH_FLOW_COOKIE_NAME = 'mcpAuthFlow'; // Renamed cookie name
const AUTH_FLOW_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes validity


// Represents the active, authenticated session after MCP token exchange
interface UserSession {
    transportSessionId: string; // Renamed from sessionId, represents the SSE transport ID
    mcpAccessToken: string;
    // databaseId: string; // REMOVED: Unique ID for this session's data/DB - managed internally now

    // Data (Received from client or loaded from DB)
    fullEhr: ClientFullEHR; // UPDATED: Use client-side type
    db?: Database;

    // MCP Client Info
    mcpClientInfo: OAuthClientInformationFull;

    // Transient MCP Auth Code details (used between callback and token exchange)
    mcpAuthCode?: string;
    mcpAuthCodeChallenge?: string;
}
const activeSessions = new Map<string, UserSession>(); // Keyed by mcpAccessToken
const sessionsByMcpAuthCode = new Map<string, UserSession>(); // Keyed by temporary mcpAuthCode
const registeredMcpClients = new Map<string, OAuthClientInformationFull>();
// Keyed by transportSessionId, holds SSE transport and associated token/auth info
const activeSseTransports = new Map<string, { transport: SSEServerTransport; mcpAccessToken: string; authInfo: AuthInfo }>();


// --- Session Creation & DB Management --- 

/**
 * Creates a new UserSession, initializes its database (in-memory or file-based based on config),
 * populates it with the provided EHR data, and returns the complete session object.
 * 
 * @param mcpClientInfo - Information about the MCP client initiating the session.
 * @param mcpCodeChallenge - The PKCE code challenge provided by the MCP client.
 * @param ehrData - The full EHR data received from the client-side retriever.
 * @returns A Promise resolving to the initialized UserSession.
 */
async function createSessionFromEhrData(
    mcpClientInfo: OAuthClientInformationFull,
    mcpCodeChallenge: string,
    ehrData: ClientFullEHR
): Promise<UserSession> {
    const newDatabaseId = uuidv4(); // Generate a unique ID for this session's DB context
    console.log(`[SESSION CREATE] Creating new session with DB ID: ${newDatabaseId}`);

    let db: Database;
    try {
        // Initialize the database (creates file if persistent, or uses :memory:)
        db = await initializeDatabase(newDatabaseId);
        console.log(`[SESSION CREATE] Database initialized for ${newDatabaseId}. File: ${db.filename || ':memory:'}`);
    } catch (initError) {
        console.error(`[SESSION CREATE] Failed to initialize database for ${newDatabaseId}:`, initError);
        throw new Error(`Database initialization failed: ${initError}`);
    }

    try {
        // Populate the database with the provided EHR data
        console.log(`[SESSION CREATE] Populating database ${db.filename || ':memory:'} for ${newDatabaseId}...`);
        await ehrToSqlite(ehrData, db);
        console.log(`[SESSION CREATE] Database population complete for ${newDatabaseId}.`);
    } catch (populateError) {
        console.error(`[SESSION CREATE] Failed to populate database ${db.filename || ':memory:'} for ${newDatabaseId}:`, populateError);
        // Attempt to clean up the DB connection if population fails
        try { db.close(); } catch (closeErr) { console.error(`[SESSION CREATE] Error closing DB after population failure for ${newDatabaseId}:`, closeErr); }
        throw new Error(`Database population failed: ${populateError}`);
    }

    // Construct the session object
    const session: UserSession = {
        transportSessionId: "", // Will be set by transport connection
        mcpAccessToken: "", // Will be set upon token exchange
        fullEhr: ehrData, // Store the original data
        db: db, // Store the open, populated DB handle
        mcpClientInfo: mcpClientInfo,
        mcpAuthCodeChallenge: mcpCodeChallenge,
        // mcpAuthCode will be added just before storing in sessionsByMcpAuthCode
    };

    console.log(`[SESSION CREATE] Session successfully created for MCP Client ${mcpClientInfo.client_id} (DB ID internally associated: ${newDatabaseId})`);
    return session;
}

// TODO (Future): Implement loadSessionFromDatabaseId if needed
// async function loadSessionFromDatabaseId(...) { ... }


// --- SQLite Persistence Functions (REVISED: Needs adaptation for ClientFullEHR) ---

// Helper to get the file path using a unique session database ID
async function getSqliteFilePath(databaseId: string): Promise<string> {
    if (!databaseId) throw new Error("Database ID is required for persistence path.");
    // Simple sanitization for the ID, although UUIDs should be safe
    const sanitizedDbId = databaseId.replace(/[^a-zA-Z0-9-]/g, '_'); 
    
    return `${config.persistence.directory}/${sanitizedDbId}.sqlite`;
}

// Initializes either a file-backed or in-memory DB based on config
async function initializeDatabase(databaseId: string): Promise<Database> {
    if (config.persistence.enabled) {
        // Pass databaseId to get the correct path
        const filePath = await getSqliteFilePath(databaseId); 
        console.log(`[SQLITE Init] Initializing persistent database for ID ${databaseId} at: ${filePath}`);
        // Bun automatically creates the file if it doesn't exist
        // and handles persistence for file-backed DBs.
        try {
        const db = new Database(filePath);
            // Optional: Add PRAGMAs for performance/safety if needed
            // db.exec("PRAGMA journal_mode = WAL;");
            // db.exec("PRAGMA synchronous = NORMAL;");
        return db;
    } catch (error) {
            console.error(`[SQLITE Init] Error initializing persistent database at ${filePath}:`, error);
            throw new Error(`Failed to initialize persistent database: ${error}`);
        }
    } else {
        console.log("[SQLITE Init] Initializing in-memory database.");
        return new Database(':memory:');
    }
}

// --- `getSessionDb` (Simplified) ---
// Returns the existing DB handle from the session, checking if it's still open.
// Assumes the DB was initialized and populated during session creation.
async function getSessionDb(session: UserSession): Promise<Database> {
    if (!session.db) {
        // This should ideally not happen if sessions are created correctly
        console.error("[DB GET] Critical Error: Session DB handle is missing.");
        throw new Error("Session database connection is missing unexpectedly.");
    }

    try {
        // Simple query to check if the connection is still open
        session.db.query("PRAGMA user_version;").get(); 
        // console.log(`[DB GET] Using existing open DB connection. File: ${session.db.filename || ':memory:'}`);
        return session.db;
    } catch (e) {
        console.error(`[DB GET] Error: Session DB connection (File: ${session.db.filename || ':memory:'}) appears closed or invalid.`, e);
        // Should we attempt to re-establish? For now, throw an error as state is likely lost.
        session.db = undefined; // Clear the invalid reference
        throw new Error(`Session database connection was closed or became invalid: ${e}`);
    }
}


// --- Tool Schemas & Logic ---

const GrepRecordInputSchema = z.object({
    query: z.string().min(1).describe("The text string or JavaScript-style regular expression to search for (case-insensitive). Example: 'heart attack|myocardial infarction|mi'"),
    resource_types: z.array(z.string()).optional().describe(
        `Optional list to filter the search scope. Supports FHIR resource type names (e.g., "Patient", "Observation") and the special keyword "Attachment".
        Behavior based on the list:
        - **If omitted or an empty list is provided:** Searches EVERYTHING - all FHIR resources and all attachment plaintext.
        - **List contains only FHIR types (e.g., ["Condition", "Procedure"]):** Searches ONLY the specified FHIR resource types AND the plaintext of attachments belonging *only* to those specified resource types.
        - **List contains only ["Attachment"]:** Searches ONLY the plaintext content of ALL attachments, regardless of which resource they belong to.
        - **List contains FHIR types AND "Attachment" (e.g., ["DocumentReference", "Attachment"]):** Searches the specified FHIR resource types (e.g., DocumentReference) AND the plaintext of ALL attachments (including those not belonging to the specified FHIR types).`
    )
});

const GrepMatchedResourceSchema = z.object({
    resourceType: z.string(),
    resource: z.record(z.unknown()).describe("The full FHIR resource JSON object.")
}).describe("Results of the text search across the patient's record using a case-insensitive string or JavaScript-style regular expression, returning full matching resources or attachment text.");

const GrepMatchedAttachmentSchema = z.object({
    resourceType: z.string().describe("The FHIR resource type the attachment belongs to."),
    resourceId: z.string().describe("The ID of the FHIR resource the attachment belongs to."),
    path: z.string().describe("Path within the original resource where the attachment was found (e.g., 'content.attachment')."),
    contentType: z.string().optional().describe("The content type of the attachment."),
    plaintext: z.string().describe("The full extracted plaintext content of the attachment.")
});

const GrepRecordOutputSchema = z.object({
    matched_resources: z.array(GrepMatchedResourceSchema).describe("Full FHIR resources where the query matched anywhere within their JSON representation."),
    matched_attachments: z.array(GrepMatchedAttachmentSchema).describe("Attachments where the query matched within their extracted plaintext content."),
    resources_searched_count: z.number().int().describe("Number of FHIR resources searched."),
    attachments_searched_count: z.number().int().describe("Number of attachments searched."),
    resources_matched_count: z.number().int().describe("Number of unique FHIR resources matched."),
    attachments_matched_count: z.number().int().describe("Number of unique attachments matched.")
}).describe("Results of the text search across the patient's record using a case-insensitive string or JavaScript-style regular expression, returning full matching resources or attachment text.");


const QueryRecordInputSchema = z.object({
    sql: z.string().min(1).describe("The read-only SQL SELECT statement to execute against the in-memory FHIR data. FHIR resources are stored in the 'fhir_resources' table with columns 'resource_type', 'resource_id', and 'json'. For example, 'SELECT json FROM fhir_resources WHERE resource_type = \"Patient\"' or 'SELECT json FROM fhir_resources WHERE resource_type = \"Observation\" AND json LIKE \"%diabetes%\"'.")
});
const QueryRecordOutputSchema = z.array(z.record(z.unknown())).describe("An array of rows returned by the SQL query. Each row is an object where keys are column names.");

const AskQuestionInputSchema = z.object({
    question: z.string().min(1).describe("The natural language question to ask about the patient's record.")
});
const AskQuestionOutputSchema = z.object({ answer: z.string() }).describe("The natural language answer generated by the LLM based on the record context."); // Simple wrapper for now

const ResyncRecordInputSchema = z.object({}).describe("No arguments needed.");
const ResyncRecordOutputSchema = z.object({ message: z.string() }).describe("A confirmation message indicating the outcome of the resync attempt.");


const EvalRecordInputSchema = z.object({
    code: z.string().min(1).describe(
        `A string containing the body of an async JavaScript function.
        This function receives the following arguments:
        1. 'fullEhr': An object containing the patient's EHR data (ClientFullEHR format):
           - 'fullEhr.fhir': An object where keys are FHIR resource type strings... and values are arrays of the corresponding FHIR resource JSON objects.
           - 'fullEhr.attachments': An array of processed attachment objects (ClientProcessedAttachment format). Each object includes:
             - 'resourceType', 'resourceId', 'path', 'contentType'
             - 'contentPlaintext': The extracted plaintext content (string or null).
             - 'contentBase64': Raw content encoded as a base64 string (string or null).
             - 'json': The original JSON string of the attachment node.
        2. 'console': A limited console object...
        3. '_': The Lodash library...

        The function MUST conclude with a 'return' statement... Console output will be captured separately.

        Example Input (Note: Access .contentBase64 for binary, .contentPlaintext for text):
        {
          "code": "const conditions = fullEhr.fhir[\"Condition\"] || [];\n//... rest of example code ..."
        }`
    )
});

const EvalRecordOutputSchema = z.object({
    result: z.any().optional().describe("The JSON-serializable result returned by the executed code (if successful)."),
    logs: z.array(z.string()).describe("An array of messages logged via console.log or console.warn during execution."),
    errors: z.array(z.string()).describe("An array of messages logged via console.error during execution.")
}).describe("The result of executing the provided JavaScript code against the patient record, including captured console output.");


// --- Logic Functions ---

async function grepRecordLogic(
    fullEhr: ClientFullEHR, // Use ClientFullEHR
    query: string,
    inputResourceTypes?: string[]
): Promise<z.infer<typeof GrepRecordOutputSchema>> {
    let regex: RegExp;
    try {
        regex = new RegExp(query, 'i');
        console.log(`[GREP] Using regex: ${regex}`);
    } catch (e) {
        console.error(`[GREP] Invalid regular expression provided: "${query}"`, e);
        throw new Error(`Invalid regular expression provided: ${query}`);
    }

    const matchedResourceIds = new Set<string>();
    const matchedAttachmentKeys = new Set<string>();
    const matchedResourcesResult: z.infer<typeof GrepMatchedResourceSchema>[] = [];
    const matchedAttachmentsResult: z.infer<typeof GrepMatchedAttachmentSchema>[] = [];

    let resourcesSearched = 0;
    let attachmentsSearched = 0;

    const searchOnlyAttachments = inputResourceTypes?.length === 1 && inputResourceTypes[0] === "Attachment";

    let typesForResourceSearch: string[] = [];
    let typesForAttachmentFilter: string[] | null = null; // null means search all

    if (searchOnlyAttachments) {
        typesForResourceSearch = [];
        typesForAttachmentFilter = null;
        console.log("[GREP] Scope: Attachments Only");
    } else if (!inputResourceTypes || inputResourceTypes.length === 0) {
        typesForResourceSearch = Object.keys(fullEhr.fhir);
        typesForAttachmentFilter = null;
        console.log("[GREP] Scope: All Resources and All Attachments (Default)");
    } else {
        typesForResourceSearch = inputResourceTypes.filter(t => t !== "Attachment");
        if (inputResourceTypes.includes("Attachment")) {
            typesForAttachmentFilter = null; // Search ALL attachments
             console.log(`[GREP] Scope: Resources [${typesForResourceSearch.join(', ')}] and ALL Attachments`);
        } else {
            typesForAttachmentFilter = typesForResourceSearch; // Only attachments of specified types
             console.log(`[GREP] Scope: Resources [${typesForResourceSearch.join(', ')}] and their Attachments`);
        }
    }

    // Search FHIR Resources
    if (typesForResourceSearch.length > 0) {
        console.log(`[GREP] Searching ${typesForResourceSearch.length} resource types in memory...`);
        for (const resourceType of typesForResourceSearch) {
            if (fullEhr.fhir[resourceType]) {
                for (const resource of fullEhr.fhir[resourceType]) {
                    if (!resource || !resource.id || !resource.resourceType) continue;
                    resourcesSearched++;
                    const resourceKey = `${resource.resourceType}/${resource.id}`;

                    if (matchedResourceIds.has(resourceKey)) continue;

                    try {
                        const resourceString = JSON.stringify(resource);
                        if (regex.test(resourceString)) {
                            matchedResourceIds.add(resourceKey);
                            matchedResourcesResult.push({
                                resourceType: resource.resourceType,
                                resource: resource
                            });
                        }
                    } catch (e) {
                        console.warn(`[GREP] Error stringifying resource ${resourceKey}:`, e);
                    }
                }
            } else {
                 console.warn(`[GREP] Requested resource type "${resourceType}" not found in loaded fullEhr.fhir.`);
             }
        }
         console.log(`[GREP] Found ${matchedResourcesResult.length} matching resources after searching ${resourcesSearched}.`);
    } else {
        console.log("[GREP] Skipping resource search based on scope.");
    }

    // Search Attachments
    console.log(`[GREP] Searching ${fullEhr.attachments.length} attachments in memory (Filter: ${typesForAttachmentFilter ? `[${typesForAttachmentFilter.join(', ')}]` : 'None'})...`);
    for (const attachment of fullEhr.attachments) {
        attachmentsSearched++;
        const attachmentKey = `${attachment.resourceType}/${attachment.resourceId}#${attachment.path}`;

        if (typesForAttachmentFilter && !typesForAttachmentFilter.includes(attachment.resourceType)) {
            continue;
        }

        if (matchedAttachmentKeys.has(attachmentKey)) continue;

        // Use contentPlaintext from ClientFullEHR
        if (attachment.contentPlaintext && attachment.contentPlaintext.length > 0) {
            if (regex.test(attachment.contentPlaintext)) {
                matchedAttachmentKeys.add(attachmentKey);
                matchedAttachmentsResult.push({
                    resourceType: attachment.resourceType,
                    resourceId: attachment.resourceId,
                    path: attachment.path,
                    contentType: attachment.contentType,
                    plaintext: attachment.contentPlaintext // Return the plaintext content
                });
            }
        }
    }
    console.log(`[GREP] Found ${matchedAttachmentsResult.length} matching attachments after searching ${attachmentsSearched} in memory.`);

    return {
        matched_resources: matchedResourcesResult,
        matched_attachments: matchedAttachmentsResult,
        resources_searched_count: resourcesSearched,
        attachments_searched_count: attachmentsSearched,
        resources_matched_count: matchedResourcesResult.length,
        attachments_matched_count: matchedAttachmentsResult.length,
    };
}

async function queryRecordLogic(db: Database, sql: string): Promise<z.infer<typeof QueryRecordOutputSchema>> {
    // This function primarily interacts with the DB, 
    // assumes dbUtils are adapted to store/retrieve ClientFullEHR compatible data
     const sqlLower = sql.trim().toLowerCase();
     if (!sqlLower.startsWith('select')) throw new Error("Only SELECT queries are allowed.");
     const writeKeywords = ['insert', 'update', 'delete', 'drop', 'create', 'alter', 'attach', 'detach', 'replace', 'pragma'];
     if (writeKeywords.some(keyword => sqlLower.includes(keyword))) throw new Error("Potentially harmful SQL operation detected.");
     try {
         const results = await db.query(sql).all() as Record<string, unknown>[];
         if (results.length > 500) { console.warn(`[SQLITE] Query returned ${results.length} rows. Truncating to 500.`); return results.slice(0, 500); }
         return results;
     } catch (err) { console.error("[SQLITE] Execution Error:", err); throw new Error(`SQL execution failed: ${(err as Error).message}`); }
}

async function evalRecordLogic(fullEhr: ClientFullEHR, userCode: string): Promise<{ result?: any, logs: string[], errors: string[] }> {
    // Update sandbox context and documentation string
    const logs: string[] = [];
    const errors: string[] = [];

    const sandboxConsole = {
        log: (...args: any[]) => {
            const message = args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ');
            logs.push(message);
            console.log('[SANDBOX Eval LOG]', message);
        },
        warn: (...args: any[]) => {
            const message = args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ');
            logs.push(`WARN: ${message}`);
            console.warn('[SANDBOX Eval WARN]', message);
        },
        error: (...args: any[]) => {
            const message = args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ');
            errors.push(message);
            console.error('[SANDBOX Eval ERROR]', message);
        },
    };

    const sandbox = {
        fullEhr: fullEhr, // Pass ClientFullEHR
        console: sandboxConsole,
        _: _,
        Buffer: Buffer, // Provide Buffer for base64 decoding
        __resultPromise__: undefined as Promise<any> | undefined
    };

    const scriptCode = `
        async function userFunction(fullEhr, console, _, Buffer) {
            "use strict";
            ${userCode}
        }
        __resultPromise__ = userFunction(fullEhr, console, _, Buffer);
    `;

     const context = vm.createContext(sandbox);
     const script = new vm.Script(scriptCode, { filename: 'userCode.vm' });
     const timeoutMs = 5000;
     let executionResult: any = undefined;

     try {
         console.log(`[TOOL eval_record] Executing sandboxed code (Timeout: ${timeoutMs}ms)...`);
         script.runInContext(context, { timeout: timeoutMs, displayErrors: true });

         executionResult = await Promise.race([
             sandbox.__resultPromise__,
             new Promise((_, reject) =>
                 setTimeout(() => reject(new Error('Async operation timed out')), timeoutMs + 500)
             )
         ]);

         console.log(`[TOOL eval_record] Sandboxed code finished successfully.`);

         try {
             JSON.stringify(executionResult);
              return { result: executionResult, logs, errors };
         } catch (stringifyError: any) {
             console.error("[TOOL eval_record] Result is not JSON serializable:", stringifyError);
              errors.push(`Execution Error: Result is not JSON-serializable: ${stringifyError.message}`);
              return { result: undefined, logs, errors };
         }

     } catch (error: any) {
         console.error("[TOOL eval_record] Error executing sandboxed code:", error);
          let errorMessage: string;
         if (error.message.includes('timed out') || error.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT') {
              errorMessage = `Code execution timed out after ${timeoutMs / 1000} seconds.`;
         } else if (error instanceof SyntaxError) {
              errorMessage = `Syntax error in provided code: ${error.message}`;
         } else {
              errorMessage = `Error during code execution: ${error.message}`;
         }
          errors.push(`Execution Error: ${errorMessage}`);
          return { result: undefined, logs, errors };
     }
}

// --- OAuth Provider Implementation ---
class MyOAuthClientStore implements OAuthRegisteredClientsStore {
    async getClient(clientId: string): Promise<OAuthClientInformationFull | undefined> { console.log(`[OAuthStore] Getting MCP client: ${clientId}`); return registeredMcpClients.get(clientId); }
    async registerClient(clientInfo: OAuthClientInformationFull): Promise<OAuthClientInformationFull> { console.log(`[OAuthStore] Registering MCP Client: ${clientInfo.client_name || clientInfo.client_id}`); if (clientInfo.token_endpoint_auth_method === 'none') { clientInfo.client_secret = undefined; clientInfo.client_secret_expires_at = undefined; } registeredMcpClients.set(clientInfo.client_id, clientInfo); return clientInfo; }
}

class MyOAuthServerProvider implements OAuthServerProvider {
    readonly clientsStore = new MyOAuthClientStore();

    async authorize(mcpClientInfo: OAuthClientInformationFull, params: AuthorizationParams, _res: any): Promise<void> {
        // This method is now effectively bypassed as the redirect happens directly in the /authorize route
        // But we keep the structure. The important part is generating the EHR auth URL.
        console.log(`[AUTH Provider] Authorize called (should be bypassed by direct redirect). Client: ${mcpClientInfo.client_id}`);
        throw new Error("This authorize method should not be directly called; redirect happens in route handler.");
    }

    async challengeForAuthorizationCode(mcpClientInfo: OAuthClientInformationFull, mcpAuthorizationCode: string): Promise<string> {
        console.log(`[AUTH Provider] Retrieving challenge for MCP code: ${mcpAuthorizationCode}`);
        const session = sessionsByMcpAuthCode.get(mcpAuthorizationCode);
        if (!session || session.mcpClientInfo.client_id !== mcpClientInfo.client_id) throw new InvalidGrantError("Invalid or expired authorization code");
        if (!session.mcpAuthCodeChallenge) { console.error("[AUTH Provider] Internal error: MCP Code Challenge not found."); throw new ServerError("Internal error retrieving PKCE challenge"); }
        return session.mcpAuthCodeChallenge;
    }

    async exchangeAuthorizationCode(mcpClientInfo: OAuthClientInformationFull, mcpAuthorizationCode: string): Promise<OAuthTokens> {
        console.log(`[AUTH Provider] Exchanging MCP code: ${mcpAuthorizationCode} for client ${mcpClientInfo.client_id}`);
        const session = sessionsByMcpAuthCode.get(mcpAuthorizationCode);
        sessionsByMcpAuthCode.delete(mcpAuthorizationCode); // Single-use

        if (!session || session.mcpClientInfo.client_id !== mcpClientInfo.client_id) { console.error(`[AUTH Provider] Exchange failed: Invalid/used MCP code ${mcpAuthorizationCode}`); throw new InvalidGrantError("Invalid, expired, or previously used authorization code"); }

        const mcpAccessToken = uuidv4();
        session.mcpAccessToken = mcpAccessToken;
        session.transportSessionId = ""; // Transport will set this later
        activeSessions.set(mcpAccessToken, session);

        delete session.mcpAuthCode;
        delete session.mcpAuthCodeChallenge;

        console.log(`[AUTH Provider] Issuing MCP token: ${mcpAccessToken.substring(0, 8)}... for client ${mcpClientInfo.client_id}`);
        return { access_token: mcpAccessToken, token_type: "Bearer", expires_in: 3600 };
    }

    async verifyAccessToken(mcpAccessToken: string): Promise<AuthInfo> {
        console.log(`[AUTH Provider] Verifying MCP token: ${mcpAccessToken.substring(0, 8)}...`);
        const session = activeSessions.get(mcpAccessToken);

        if (!session) {
            console.warn(`[AUTH Provider] MCP Token ${mcpAccessToken.substring(0,8)}... not found in active sessions.`);
            throw new InvalidTokenError("Invalid or expired access token");
        }

        console.log(`[AUTH Provider] MCP Token verified for client: ${session.mcpClientInfo.client_id}`);
        return {
            token: mcpAccessToken,
            clientId: session.mcpClientInfo.client_id,
            scopes: session.mcpClientInfo.scope?.split(' ') || [],
        };
    }

    async exchangeRefreshToken(mcpClientInfo: OAuthClientInformationFull, refreshToken: string, scopes?: string[] | undefined): Promise<OAuthTokens> { throw new UnsupportedGrantTypeError("Refresh tokens are not supported by this server."); }

    async revokeToken(mcpClientInfo: OAuthClientInformationFull, request: OAuthTokenRevocationRequest): Promise<void> {
        const tokenToRevoke = request.token;
        console.log(`[AUTH Provider] Revoking MCP token ${tokenToRevoke.substring(0, 8)}... for client ${mcpClientInfo.client_id}`);

        const session = activeSessions.get(tokenToRevoke);

        if (session) {
            if (!config.security.disableClientChecks && session.mcpClientInfo.client_id !== mcpClientInfo.client_id) {
                console.warn(`[AUTH Provider] Revocation attempt failed: Client ${mcpClientInfo.client_id} does not own token ${tokenToRevoke.substring(0, 8)}...`);
            }

            // Close the associated database connection IF IT EXISTS AND IS OPEN
            if (session.db) {
                try {
                    console.log(`[AUTH Provider] Closing database connection for revoked session (Token: ${tokenToRevoke.substring(0, 8)}...).`);
                    session.db.close();
                    session.db = undefined; // Clear reference
                } catch(e) {
                    console.error(`Error closing DB for session on revoke (Token: ${tokenToRevoke.substring(0, 8)}...):`, e);
                     session.db = undefined; // Clear reference even on error
                }
            }

            activeSessions.delete(tokenToRevoke);

            let transportSessionIdToRemove: string | null = null;
            for (const [transportSessionId, entry] of activeSseTransports.entries()) {
                if (entry.mcpAccessToken === tokenToRevoke) {
                    transportSessionIdToRemove = transportSessionId;
                    try {
                        entry.transport.close();
                        console.log(`[SSE] Closed transport connection ${transportSessionId} due to token revocation.`);
                    } catch (closeErr) {
                        console.error(`[SSE] Error closing transport ${transportSessionId} during revocation:`, closeErr);
                    }
                    break;
                }
            }
            if (transportSessionIdToRemove) {
                activeSseTransports.delete(transportSessionIdToRemove);
                 console.log(`[AUTH Provider] Removed active SSE transport entry for revoked token ${tokenToRevoke.substring(0, 8)}...`);
            }

            console.log(`[AUTH Provider] MCP Token ${tokenToRevoke.substring(0, 8)}... revoked, session cleared, and DB closed (if existed).`);
        } else {
            console.log(`[AUTH Provider] MCP Token ${tokenToRevoke.substring(0, 8)}... not found or already revoked.`);
        }
    }
}

// --- MCP Server Instance ---
const mcpServer = new McpServer(SERVER_INFO);
const oauthProvider = new MyOAuthServerProvider();

// --- Custom Bearer Auth Middleware using our provider ---
const bearerAuthMiddleware = requireBearerAuth({ provider: oauthProvider });

// --- Register Tools ---

mcpServer.tool(
    "grep_record",
    GrepRecordInputSchema.shape,
    async (args, extra) => {
        const transportSessionId = extra.sessionId; // Rename variable
        if (!transportSessionId) throw new McpError(ErrorCode.InvalidRequest, "Missing session identifier."); // Use renamed variable
        const transportEntry = activeSseTransports.get(transportSessionId); // Use renamed variable
        if (!transportEntry) throw new McpError(ErrorCode.InvalidRequest, "Invalid or disconnected session.");
        const mcpAccessToken = transportEntry.mcpAccessToken;
        const session = activeSessions.get(mcpAccessToken);
        if (!session) throw new McpError(ErrorCode.InternalError, "Session data not found for active connection.");
        console.log(`[TOOL grep_record] Session found for token ${mcpAccessToken.substring(0,8)}...`, session.fullEhr);

        try {
            const resultData = await grepRecordLogic(session.fullEhr, args.query, args.resource_types);
             const MAX_JSON_LENGTH = 2 * 1024 * 1024; // 2 MB limit
             let resultString = JSON.stringify(resultData, null, 2);
             if (resultString.length > MAX_JSON_LENGTH) {
                 console.warn(`[TOOL grep_record] Result too large (${resultString.length} bytes), truncating.`);
                 resultData.matched_resources = resultData.matched_resources.slice(0, 5);
                 resultData.matched_attachments = resultData.matched_attachments.slice(0, 10);
                 resultData.matched_attachments.forEach(att => (att as any).plaintext = "[Truncated due to size limit]");
                 resultString = JSON.stringify({
                      warning: `Result truncated due to size limit (${(MAX_JSON_LENGTH / 1024 / 1024).toFixed(1)} MB). Showing subset of matches.`,
                      ...resultData
                      }, null, 2);
                  if (resultString.length > MAX_JSON_LENGTH) {
                      resultString = JSON.stringify({ error: "Result too large to return, even after truncation." });
                  }
             }
            return { content: [{ type: "text", text: resultString }] };
        } catch (error: any) {
            console.error(`Error executing tool grep_record:`, error);
            return { content: [{ type: "text", text: `Error executing grep_record: ${error.message}` }], isError: true };
        }
    }
);

mcpServer.tool(
    "query_record",
    QueryRecordInputSchema.shape,
    async (args, extra) => {
        const transportSessionId = extra.sessionId; // Rename variable
        if (!transportSessionId) throw new McpError(ErrorCode.InvalidRequest, "Missing session identifier."); // Use renamed variable
        const transportEntry = activeSseTransports.get(transportSessionId); // Use renamed variable
        if (!transportEntry) throw new McpError(ErrorCode.InvalidRequest, "Invalid or disconnected session.");
        const mcpAccessToken = transportEntry.mcpAccessToken;
        const session = activeSessions.get(mcpAccessToken);
        if (!session) throw new McpError(ErrorCode.InternalError, "Session data not found for active connection.");

        try {
            // Ensure DB is initialized using the helper - this handles population if needed
            const db = await getSessionDb(session);

            const resultData = await queryRecordLogic(db, args.sql);
             const MAX_JSON_LENGTH = 500 * 1024; // 500 KB limit
             let resultString = JSON.stringify(resultData, null, 2);
             if (resultString.length > MAX_JSON_LENGTH) {
                 console.warn(`[TOOL query_record] Result too large (${resultString.length} bytes), truncating.`);
                 resultString = JSON.stringify({ warning: "Result truncated due to size limit.", truncated_results: resultData.slice(0, 100) }, null, 2);
             }
            return { content: [{ type: "text", text: resultString }] };
        } catch (error: any) {
            console.error(`Error executing tool query_record:`, error);
             // Check if it's a DB init/population error from getSessionDb or SQL error
            return { content: [{ type: "text", text: `Error executing query_record: ${error.message}` }], isError: true };
        }
    }
);

mcpServer.tool(
    "eval_record",
    EvalRecordInputSchema.shape,
    async (args, extra) => {
         const transportSessionId = extra.sessionId; // Rename variable
        if (!transportSessionId) throw new McpError(ErrorCode.InvalidRequest, "Missing session identifier."); // Use renamed variable
         const transportEntry = activeSseTransports.get(transportSessionId); // Use renamed variable
        if (!transportEntry) throw new McpError(ErrorCode.InvalidRequest, "Invalid or disconnected session.");
         const mcpAccessToken = transportEntry.mcpAccessToken;
         const session = activeSessions.get(mcpAccessToken);
        if (!session) throw new McpError(ErrorCode.InternalError, "Session data not found for active connection.");

        try {
            // Execute the sandboxed code - passing fullEhr
            const evalOutput = await evalRecordLogic(session.fullEhr, args.code);
             const finalOutput = {
                result: evalOutput.result,
                 logs: evalOutput.logs,
                 errors: evalOutput.errors,
             };
             const MAX_JSON_LENGTH = 1 * 1024 * 1024; // 1 MB limit
             let resultString = JSON.stringify(finalOutput, null, 2);
             if (resultString.length > MAX_JSON_LENGTH) {
                console.warn(`[TOOL eval_record] Final output too large (${resultString.length} bytes), returning error message.`);
                 const truncatedOutput = {
                     result: "[Result omitted due to excessive size]",
                    logs: evalOutput.logs,
                     errors: [...evalOutput.errors, `Execution successful, but the JSON result combined with logs/errors is too large (${(resultString.length / 1024 / 1024).toFixed(1)} MB) to return.`],
                 };
                  resultString = JSON.stringify(truncatedOutput, null, 2);
                  if (resultString.length > MAX_JSON_LENGTH) {
                      resultString = JSON.stringify({
                          result: "[Result omitted due to excessive size]",
                          logs: ["Logs omitted due to excessive size"],
                          errors: ["Errors omitted due to excessive size", "Output exceeded size limit"]
                      });
                  }
             }
              const isError = finalOutput.errors.length > 0 && finalOutput.result === undefined;
            return { content: [{ type: "text", text: resultString }], isError: isError };
        } catch (evalOrResyncError: any) { // Catch errors from implicit resync or eval itself
             console.error(`Error during eval_record (potentially during implicit resync):`, evalOrResyncError);
              const errorOutput = {
                  result: undefined,
                  logs: [], // Logs from evalLogic might not be available if resync failed
                  errors: [`Failed during evaluation or data preparation: ${evalOrResyncError.message}`]
              };
              return { content: [{ type: "text", text: JSON.stringify(errorOutput, null, 2)}], isError: true };
        }
    }
);

// --- Express Server Setup ---
const app = express();

// --- Main Application Startup Function ---
async function main() {
    try {
        // Set up command-line argument parsing
        const program = new Command();
        program
            .name('smart-mcp')
            .description('SMART on FHIR MCP Server')
            .version('0.5.0')
            .option('-c, --config <path>', 'Path to configuration file', './config.json')
            .parse(process.argv);
        
        const options = program.opts();
        const configPath = options.config || Bun.env.MCP_CONFIG_PATH || './config.json';
        
        console.log(`[CONFIG] Loading configuration from: ${configPath}`);
        config = await loadConfig(configPath);

        // --- Build the client-side retriever using the determined config ---
        console.log(`[BUILD] Building ehretriever with config: ${configPath}...`);
        try {
            const buildCommand = `bun run build:ehretriever --config ${configPath}`;
            // Execute synchronously, inherit stdio to see build output/errors
            execSync(buildCommand, { stdio: 'inherit' }); 
            console.log(`[BUILD] Successfully built ehretriever.`);
        } catch (buildError) {
            console.error(`[BUILD] FATAL ERROR: Failed to build ehretriever with config ${configPath}. See error below.`);
            // The error from execSync usually includes stdout/stderr, so no need to log buildError directly unless needed
            process.exit(1); // Exit if build fails
        }
        // --- End Build Step ---

// Middleware
        app.use(cors());
        app.use(express.urlencoded({ extended: true }));

// Logging Middleware
app.use((req, res, next) => {
    console.log(`[HTTP] ${req.method} ${req.path}`);
    next();
});

// --- Serve Static Files from ./static --- 
const staticPath = path.resolve(process.cwd(), 'static'); // UPDATED path
console.log(`[STATIC] Serving static files from: ${staticPath}`);
app.use('/static', express.static(staticPath)); // UPDATED mount path

// --- MCP Auth Endpoints ---
        // Use config for base URLs
        app.options("/.well-known/oauth-authorization-server", cors());
app.get("/.well-known/oauth-authorization-server", cors(), (req, res) => {
    const metadata = {
                issuer: config.server.baseUrl,
                authorization_endpoint: `${config.server.baseUrl}/authorize`,
                token_endpoint: `${config.server.baseUrl}/token`,
                registration_endpoint: `${config.server.baseUrl}/register`,
                revocation_endpoint: `${config.server.baseUrl}/revoke`,
        response_types_supported: ["code"],
        grant_types_supported: ["authorization_code"],
        code_challenge_methods_supported: ["S256"],
        token_endpoint_auth_methods_supported: ["none", "client_secret_post"],
        revocation_endpoint_auth_methods_supported: ["none", "client_secret_post"],
    };
    res.json(metadata);
});

app.get("/authorize", async (req, res) => {
    const clientId = req.query.client_id as string | undefined;
    const redirectUri = req.query.redirect_uri as string | undefined;
    const responseType = req.query.response_type as string | undefined;
    const codeChallenge = req.query.code_challenge as string | undefined;
    const codeChallengeMethod = req.query.code_challenge_method as string | undefined;
    const state = req.query.state as string | undefined; // MCP state
    const scope = req.query.scope as string | undefined; // MCP scope (unused for now, but might be needed later)
            console.log(`[AUTHORIZE] Request for client_id: ${clientId}, redirect_uri: ${redirectUri}`);

             try {
                if (!clientId) throw new InvalidRequestError("client_id required");

                let mcpClientInfo: OAuthClientInformationFull | undefined;
                let validatedRedirectUri = redirectUri;

                // Use config for client check bypass
                if (config.security.disableClientChecks) {
                    console.log(`[AUTHORIZE] Client checks disabled for client: ${clientId}`);
                    if (!validatedRedirectUri) {
                         throw new InvalidRequestError("redirect_uri required when client checks are disabled");
                    }
                    // Create minimal placeholder for validation purposes
                     mcpClientInfo = {
                         client_id: clientId,
                client_name: `Placeholder Client (${clientId})`,
                         redirect_uris: [validatedRedirectUri],
                token_endpoint_auth_method: 'none',
                scope: scope || '',
                grant_types: ['authorization_code'],
                response_types: ['code'],
                     };
                } else {
                    mcpClientInfo = await oauthProvider.clientsStore.getClient(clientId);
                    if (!mcpClientInfo) throw new InvalidClientError("Invalid client_id");

                    if (!validatedRedirectUri) {
                        if (mcpClientInfo.redirect_uris.length === 1) validatedRedirectUri = mcpClientInfo.redirect_uris[0];
                        else throw new InvalidRequestError("redirect_uri required or ambiguous");
                    } else if (!mcpClientInfo.redirect_uris.includes(validatedRedirectUri)) {
                        throw new InvalidRequestError("Unregistered redirect_uri");
                    }
                }

                if (responseType !== 'code') throw new InvalidRequestError("response_type must be 'code'");
                if (!codeChallenge) throw new InvalidRequestError("code_challenge required");
                if (codeChallengeMethod !== 'S256') throw new InvalidRequestError("code_challenge_method must be 'S256'");

                // --- Store state and redirect to client-side retriever ---
                const authFlowId = `mcp-auth-${uuidv4()}`;

                authFlowStates.set(authFlowId, {
                    mcpClientId: clientId,
                    mcpRedirectUri: validatedRedirectUri!, // Store the validated URI for the final redirect
                    mcpCodeChallenge: codeChallenge,
                    mcpOriginalState: state, // Pass along the original MCP state
                    // Nonce isn't strictly needed anymore as we don't render a form server-side
                    nonce: 'server-redirect', // Placeholder nonce
                    expiresAt: Date.now() + AUTH_FLOW_EXPIRY_MS 
                });
                console.log(`[AUTHORIZE] Stored auth flow state ${authFlowId} for MCP client ${clientId}.`);

                // Set the session cookie
                const cookieOptions: cookie.SerializeOptions = {
                    httpOnly: true,
                    path: '/',
                    maxAge: AUTH_FLOW_EXPIRY_MS / 1000, // maxAge is in seconds
                    secure: config.server.https.enabled, // Use Secure flag only if HTTPS is enabled
                    sameSite: 'lax' // Recommended for security
                };
                res.setHeader('Set-Cookie', cookie.serialize(AUTH_FLOW_COOKIE_NAME, authFlowId, cookieOptions));

                // Redirect to the client-side retriever app, instructing it to deliver back here
                const retrieverUrl = '/static/ehretriever.html#deliver-to:mcp-callback'; // UPDATED: Point to file within /static
                console.log(`[AUTHORIZE] Redirecting user to client-side retriever: ${retrieverUrl}`);
                res.redirect(302, retrieverUrl);
                // --- End State Store and Redirect ---

        } catch (error: any) {
            console.error("[AUTHORIZE] /authorize error:", error);
                let clientRedirectUriOnError = redirectUri || '/'; // Fallback redirect
                // Try to get original redirect URI if possible, even on error
                if (!config.security.disableClientChecks && clientId) {
                    try {
                    const info = await oauthProvider.clientsStore.getClient(clientId);
                        if (info?.redirect_uris?.includes(redirectUri!)) {
                            clientRedirectUriOnError = redirectUri!;
                        } else if (info?.redirect_uris?.[0]) {
                            clientRedirectUriOnError = info.redirect_uris[0];
                        }
                    } catch {}
            }

            try {
                    const redirectUrl = new URL(clientRedirectUriOnError, config.server.baseUrl || undefined);
                if (error instanceof OAuthError) {
                    redirectUrl.searchParams.set("error", error.errorCode);
                    redirectUrl.searchParams.set("error_description", error.message);
                } else {
                    redirectUrl.searchParams.set("error", "server_error");
                    redirectUrl.searchParams.set("error_description", "Internal authorization error: " + (error?.message || 'Unknown reason'));
                }
                if (state) redirectUrl.searchParams.set("state", state); // Pass back MCP state on error
                if (!res.headersSent) {
                    res.redirect(302, redirectUrl.toString());
                }
            } catch (urlError) {
                console.error(`[AUTHORIZE] Invalid redirect URI for error reporting: ${clientRedirectUriOnError}`);
                if (!res.headersSent) {
                    res.status(500).send("Server error during authorization and invalid error redirect URI.");
                }
            }
        }
    });

        app.options("/token", cors());
app.post("/token", cors(), async (req, res) => {
    try {
        const {
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: grantType,
            code: mcpCode,
            code_verifier: mcpCodeVerifier
        } = req.body;

                console.log(`[TOKEN] Request grant_type: ${grantType}`);
                 if (!grantType) throw new InvalidRequestError("grant_type required");
                 if (!clientId) throw new InvalidRequestError("client_id required");

                 let mcpClientInfo: OAuthClientInformationFull | undefined;
                 // Use config for client check bypass
                 if (!config.security.disableClientChecks) {
                     mcpClientInfo = await oauthProvider.clientsStore.getClient(clientId);
                     if (!mcpClientInfo) throw new InvalidClientError("Invalid client_id");
                     if (mcpClientInfo.client_secret && mcpClientInfo.token_endpoint_auth_method !== 'none') {
                        if (!clientSecret) throw new InvalidClientError("client_secret required");
                        if (clientSecret !== mcpClientInfo.client_secret) throw new InvalidClientError("Invalid client_secret");
                        if (mcpClientInfo.client_secret_expires_at && mcpClientInfo.client_secret_expires_at < Math.floor(Date.now() / 1000)) {
                            throw new InvalidClientError("Client secret expired");
                        }
                     }
                 } else {
                     console.log(`[TOKEN] Client checks disabled for client: ${clientId}`);
                      mcpClientInfo = { // Minimal placeholder needed for provider calls
                         client_id: clientId, redirect_uris: [], token_endpoint_auth_method: 'none'
                     };
                 }

                 if (grantType === 'authorization_code') {
                    if (!mcpCode) throw new InvalidRequestError("code required");
                    if (!mcpCodeVerifier) throw new InvalidRequestError("code_verifier required");
                    const expectedChallenge = await oauthProvider.challengeForAuthorizationCode(mcpClientInfo!, mcpCode);
            if (!await verifyChallenge(mcpCodeVerifier, expectedChallenge)) {
                throw new InvalidGrantError("code_verifier does not match challenge");
            }
                    const tokens = await oauthProvider.exchangeAuthorizationCode(mcpClientInfo!, mcpCode);
            res.setHeader('Cache-Control', 'no-store');
            res.setHeader('Pragma', 'no-cache');
            res.json(tokens);
        } else {
            throw new UnsupportedGrantTypeError("Unsupported grant_type");
        }

            } catch (error: any) {
                 console.error("[AUTH] /token error:", error);
                 const status = (error instanceof OAuthError && !(error instanceof ServerError)) ? 400 : 500;
                 const errorResp = (error instanceof OAuthError) ? error.toResponseObject() : new ServerError("Token exchange failed").toResponseObject();
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Pragma', 'no-cache');
        res.status(status).json(errorResp);
    }
});

        app.options("/register", cors());
app.post("/register", cors(), express.json(), async (req, res) => {
    console.log(`[REGISTER] Received register request`);
    try {
        if (!oauthProvider.clientsStore.registerClient) {
            throw new ServerError("Dynamic client registration not supported");
        }
        const clientMetadata = req.body as Partial<OAuthClientMetadata>;
        if (!clientMetadata || !Array.isArray(clientMetadata.redirect_uris) || clientMetadata.redirect_uris.length === 0) {
            throw new InvalidClientError("redirect_uris required");
        }
                 const buf = new Uint8Array(32);
                 crypto.getRandomValues(buf);
                 const secretHex = Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
                 const isPublic = clientMetadata.token_endpoint_auth_method === 'none';
                 const generatedInfo: OAuthClientInformationFull = {
                    ...(clientMetadata as OAuthClientMetadata),
                     client_id: crypto.randomUUID(),
                     client_secret: isPublic ? undefined : secretHex,
                     client_id_issued_at: Math.floor(Date.now() / 1000),
                     client_secret_expires_at: isPublic ? undefined : (Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)), // 30 days
                 };
                 const registeredInfo = await oauthProvider.clientsStore.registerClient(generatedInfo);
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Pragma', 'no-cache');
        res.status(201).json(registeredInfo);
            } catch (error: any) {
                console.error("[AUTH] /register error:", error);
                 const status = (error instanceof OAuthError && !(error instanceof ServerError)) ? 400 : 500;
                 const errorResp = (error instanceof OAuthError) ? error.toResponseObject() : new ServerError("Client registration failed").toResponseObject();
        res.status(status).json(errorResp);
    }
});

        app.options("/revoke", cors());
app.post("/revoke", cors(), async (req, res) => {
    try {
        if (!oauthProvider.revokeToken) {
            throw new ServerError("Token revocation not supported");
        }
        const {
            client_id: clientId,
            client_secret: clientSecret,
            token: tokenToRevoke,
            token_type_hint: tokenTypeHint
        } = req.body;

                 if (!tokenToRevoke) throw new InvalidRequestError("token required");
                 if (!clientId) throw new InvalidRequestError("client_id required");

                 let mcpClientInfo: OAuthClientInformationFull | undefined;
                 // Use config for client check bypass
                 if (!config.security.disableClientChecks) {
                     mcpClientInfo = await oauthProvider.clientsStore.getClient(clientId);
                     if (!mcpClientInfo) throw new InvalidClientError("Invalid client_id");
                     if (mcpClientInfo.client_secret && mcpClientInfo.token_endpoint_auth_method !== 'none') {
                        if (!clientSecret) throw new InvalidClientError("client_secret required");
                        if (clientSecret !== mcpClientInfo.client_secret) throw new InvalidClientError("Invalid client_secret");
                        if (mcpClientInfo.client_secret_expires_at && mcpClientInfo.client_secret_expires_at < Math.floor(Date.now() / 1000)) {
                            throw new InvalidClientError("Client secret expired");
                        }
                     }
                 } else {
                     console.log(`[REVOKE] Client checks disabled for client: ${clientId}`);
                     mcpClientInfo = { // Minimal placeholder
                         client_id: clientId, redirect_uris: [], token_endpoint_auth_method: 'none'
                     };
                 }

                 await oauthProvider.revokeToken(mcpClientInfo!, { token: tokenToRevoke, token_type_hint: tokenTypeHint });
        res.sendStatus(200);
            } catch (error: any) {
                 console.error("[AUTH] /revoke error:", error);
                 const status = (error instanceof OAuthError && !(error instanceof ServerError)) ? 400 : 500;
                 const errorResp = (error instanceof OAuthError) ? error.toResponseObject() : new ServerError("Token revocation failed").toResponseObject();
        res.status(status).json(errorResp);
    }
});

        // --- MCP SSE Endpoint ---
app.get("/mcp-sse", bearerAuthMiddleware, async (req: Request, res: Response) => {
    const authInfo = req.auth;
    if (!authInfo) {
        console.error("[SSE GET] Middleware succeeded but req.auth is missing!");
        if (!res.headersSent) res.status(500).send("Authentication failed unexpectedly.");
        return;
    }

    const mcpAccessToken = authInfo.token;
    console.log(`[SSE GET] Auth successful for token ${mcpAccessToken.substring(0, 8)}..., client: ${authInfo.clientId}`);

    const session = activeSessions.get(mcpAccessToken);
    if (!session) {
        console.log(activeSessions, "no session for", mcpAccessToken);
        console.error(`[SSE GET] Internal Error: Session data not found for valid token ${mcpAccessToken.substring(0, 8)}...`);
        res.set("WWW-Authenticate", `Bearer error="invalid_token", error_description="Session associated with token not found or expired."`)
        res.status(401).json({ error: "invalid_token", error_description: "Session associated with token not found or expired." });
        return;
    }

            // Use config for client check bypass? Generally SSE connection implies ownership.
            // Let's keep the check unless explicitly disabled.
            if (!config.security.disableClientChecks && session.mcpClientInfo.client_id !== authInfo.clientId) {
        console.error(`[SSE GET] Forbidden: Client ID mismatch for token ${mcpAccessToken.substring(0, 8)}... Token Client: ${authInfo.clientId}, Session Client: ${session.mcpClientInfo.client_id}`);
        res.set("WWW-Authenticate", `Bearer error="invalid_token", error_description="Token client ID does not match session client ID."`);
        res.status(401).json({ error: "invalid_token", error_description: "Token client ID does not match session client ID." });
        return;
    }

    let transport: SSEServerTransport | null = null;
    try {
                transport = new SSEServerTransport(`/mcp-messages`, res);
                const transportSessionId = transport.sessionId; // Assign to renamed local variable
                session.transportSessionId = transportSessionId; // Set the renamed field in UserSession

        activeSseTransports.set(transportSessionId, { // Use renamed variable
            transport: transport,
            mcpAccessToken: mcpAccessToken,
            authInfo: authInfo
        });
        console.log(`[SSE GET] Client connected & authenticated. Transport Session ID: ${transportSessionId}, linked to MCP Token: ${mcpAccessToken.substring(0, 8)}...`);

        res.on('close', () => {
            activeSseTransports.delete(transportSessionId); // Use renamed variable
            if (session && session.transportSessionId === transportSessionId) { // Check renamed field
                        session.transportSessionId = ""; // Reset renamed field
            }
            console.log(`[SSE GET] Client disconnected. Cleaned up transport session: ${transportSessionId}`); // Use renamed variable
        });

        await mcpServer.connect(transport);

    } catch (error) {
        console.error("[SSE GET] Error setting up authenticated SSE connection:", error);
        if (transport && activeSseTransports.has(transport.sessionId)) { // transport.sessionId is correct here (from SDK)
            const transportSessionId = transport.sessionId; // Assign for clarity
            activeSseTransports.delete(transportSessionId);
            if (session && session.transportSessionId === transportSessionId) { // Check renamed field
                 session.transportSessionId = ""; // Reset renamed field
             }
        }
        if (!res.headersSent) {
             const message = (error instanceof OAuthError) ? "SSE connection setup failed due to authorization issue." : "Failed to establish SSE connection";
             const statusCode = (error instanceof InvalidTokenError) ? 401 : (error instanceof InsufficientScopeError ? 403 : 500);
             if (statusCode === 401 || statusCode === 403) {
                         res.set("WWW-Authenticate", `Bearer error="server_error", error_description="${message}"`);
             }
             res.status(statusCode).send(message);
        } else if (!res.writableEnded) {
                    res.end();
        }
    }
});

// --- MCP Message POST Endpoint ---
        app.post("/mcp-messages", (req: Request, res: Response) => {
            const transportSessionId = req.query.sessionId as string | undefined; // Rename variable
    if (!transportSessionId) { // Check renamed variable
        console.warn("[MCP POST] Received POST without transport sessionId query param.");
        res.status(400).send("Missing sessionId query parameter");
        return;
    }

    const transportEntry = activeSseTransports.get(transportSessionId); // Use renamed variable
    if (!transportEntry) {
        console.warn(`[MCP POST] Received POST for unknown/expired transport sessionId: ${transportSessionId}`); // Use renamed variable
                res.status(404).send("Invalid or expired sessionId");
        return;
    }

    const transport = transportEntry.transport;
    try {
        console.log(`[MCP POST] Received POST for transport session ${transportSessionId}, linked to MCP Token: ${transportEntry.mcpAccessToken.substring(0,8)}...`); // Use renamed variable
        console.log(req.headers);
        transport.handlePostMessage(req, res);
    } catch (error) {
        console.error(`[MCP POST] Error in handlePostMessage for session ${transportSessionId}:`, error); // Use renamed variable
        if (!res.headersSent) {
            res.status(500).send("Error processing message");
        } else if (!res.writableEnded) {
            res.end();
        }
    }
});


// --- Error Handling Middleware ---
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("[HTTP] Unhandled Route Error:", err);
    if (res.headersSent) {
        return next(err);
    }
    res.status(500).json({ error: "Internal Server Error", message: err.message });
});


// --- Start Server ---
    let server;
        let serverOptions: https.ServerOptions = {}; // Use https.ServerOptions type

        // Use config for HTTPS settings
        if (config.server.https.enabled) {
        console.log("[HTTP] HTTPS is enabled. Loading certificates...");
            // Paths validated by loadConfig
        try {
                const cert = await fs.readFile(config.server.https.certPath!);
                const key = await fs.readFile(config.server.https.keyPath!);
                serverOptions = { key: key, cert: cert };
                console.log(`[HTTP] Certificates loaded from ${config.server.https.certPath} and ${config.server.https.keyPath}`);
                server = https.createServer(serverOptions, app);
        } catch (error) {
            console.error(`[HTTP] FATAL ERROR: Failed to read certificate files: ${error}`);
            process.exit(1);
        }
    } else {
        console.log("[HTTP] HTTPS is disabled. Creating HTTP server.");
            server = http.createServer(app);
        }

        // Use config for port and base URL
        server.listen(config.server.port, () => {
            console.log(`[HTTP] Server listening on ${config.server.baseUrl}`);
        });

        // --- Graceful Shutdown ---
    const shutdown = async () => {
        console.log("\nShutting down...");
            server.close(async (err) => {
            if (err) {
                    console.error(`Error closing ${config.server.https.enabled ? 'HTTPS' : 'HTTP'} server:`, err);
            } else {
                    console.log(`${config.server.https.enabled ? 'HTTPS' : 'HTTP'} server closed.`);
            }
        });

        await mcpServer.close().catch(e => console.error("Error closing MCP server:", e));

        // Close any open database connections in active sessions
        for (const [id, session] of activeSessions.entries()) {
            if (session.db) {
                try {
                         console.log(`[Shutdown] Closing DB for session ${id}`);
                    session.db.close();
                     } catch (e) { console.error(`[Shutdown] Error closing DB for session ${id}:`, e); }
            }
        }
        activeSessions.clear();
         // Also clear pending auth map? Probably good practice.
         // pendingEhrAuth.clear(); // Ensure this is commented or removed
         sessionsByMcpAuthCode.clear(); // Clear temporary auth codes
         activeSseTransports.clear(); // Clear active transports

        console.log("Closed active sessions, cleared caches, and closed DBs (if existed).");
        process.exit(0);
    };

    process.removeListener('SIGINT', shutdown);
    process.removeListener('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    } catch (error) {
        console.error("FATAL ERROR during startup:", error);
    process.exit(1);
    }
}

// Start the application
main();

// New callback endpoint for the client-side retriever
app.post("/ehr-retriever-callback", express.json({ limit: '50mb' }), async (req: Request, res: Response, next: NextFunction) => {
    console.log("[MCP CB] Received POST from client-side retriever.");

    // 1. Get Auth Flow ID from cookie
    const cookies = cookie.parse(req.headers.cookie || '');
    const authFlowId = cookies[AUTH_FLOW_COOKIE_NAME];

    // Clear the cookie immediately
    const cookieOptions: cookie.SerializeOptions = {
        httpOnly: true, path: '/', maxAge: -1, secure: config.server.https.enabled, sameSite: 'lax'
    };
    res.setHeader('Set-Cookie', cookie.serialize(AUTH_FLOW_COOKIE_NAME, '', cookieOptions));

    if (!authFlowId) {
        console.error("[MCP CB] Error: Missing auth flow cookie.");
        // Respond with JSON error instead of redirecting
        res.status(400).json({ success: false, error: "missing_session", error_description: "Auth flow cookie missing." });
        return;
    }

    // 2. Retrieve original MCP request details
    const authFlowData = authFlowStates.get(authFlowId);
    authFlowStates.delete(authFlowId); // Consume the state

    if (!authFlowData) {
        console.error(`[MCP CB] Error: Invalid or expired auth flow ID: ${authFlowId}`);
        // Respond with JSON error instead of redirecting
        res.status(400).json({ success: false, error: "invalid_session", error_description: "Invalid or expired auth flow session." });
        return;
    }
    if (authFlowData.expiresAt < Date.now()) {
        console.error(`[MCP CB] Error: Expired auth flow ID: ${authFlowId}`);
        // Respond with JSON error instead of redirecting
        res.status(400).json({ success: false, error: "expired_session", error_description: "Auth flow session expired." });
        return;
    }

    const { mcpClientId, mcpRedirectUri, mcpCodeChallenge, mcpOriginalState } = authFlowData;
    console.log(`[MCP CB] Retrieved state for MCP Client: ${mcpClientId}`);

    try {
        // Wrap the core logic in a try block
        // 3. Parse incoming ClientFullEHR data
        // Ensure body parsing middleware (express.json) was used
        const clientFullEhr: ClientFullEHR = req.body;
        if (!clientFullEhr || !clientFullEhr.fhir || !clientFullEhr.attachments) {
             console.error("[MCP CB] Error: Invalid or missing ClientFullEHR data in request body.");
             throw new InvalidRequestError("Missing or invalid EHR data in request body.");
        }
        console.log(`[MCP CB] Received ClientFullEHR: ${Object.keys(clientFullEhr.fhir).length} resource types, ${clientFullEhr.attachments.length} attachments.`);

        // 4. Get MCP Client Info (needed for UserSession)
        let mcpClientInfo: OAuthClientInformationFull | undefined;
        if (config.security.disableClientChecks) {
            console.log(`[MCP CB] Client checks disabled. Creating placeholder client info for: ${mcpClientId}`);
            // Reconstruct minimal info needed for session
            mcpClientInfo = {
                client_id: mcpClientId,
                client_name: `Placeholder Client (${mcpClientId})`,
                redirect_uris: [mcpRedirectUri], // Essential for final redirect logic
                token_endpoint_auth_method: 'none',
                // Other fields like scope, grant_types aren't strictly needed here but could be added
            };
        } else {
            mcpClientInfo = await oauthProvider.clientsStore.getClient(mcpClientId);
            if (!mcpClientInfo) {
                console.error(`[MCP CB] Failed to retrieve MCP client info for ID: ${mcpClientId}.`);
                throw new Error("MCP Client information not found during callback processing.");
            }
             // Validate redirect URI again just in case
             if (!mcpClientInfo.redirect_uris.includes(mcpRedirectUri)) {
                 console.error(`[MCP CB] Stored redirect URI ${mcpRedirectUri} not valid for client ${mcpClientId}.`);
                 throw new InvalidRequestError("Redirect URI mismatch.");
             }
        }

        // 5. Create User Session using the new function
        const session = await createSessionFromEhrData(
            mcpClientInfo, 
            mcpCodeChallenge, 
            clientFullEhr
        );

        // 6. Generate MCP Auth Code & Store Session
        const mcpAuthCode = `mcp-code-${uuidv4()}`;
        session.mcpAuthCode = mcpAuthCode; // Add the auth code to the session
        sessionsByMcpAuthCode.set(mcpAuthCode, session);
        console.log(`[MCP CB] Stored UserSession, generated MCP Auth Code: ${mcpAuthCode.substring(0,12)}...`);

        // 7. Redirect back to MCP Client
        const clientRedirectUrl = new URL(mcpRedirectUri);
        clientRedirectUrl.searchParams.set("code", mcpAuthCode);
        if (mcpOriginalState) clientRedirectUrl.searchParams.set("state", mcpOriginalState);
        console.log(`[MCP CB] Redirecting back to MCP Client: ${clientRedirectUrl.toString()}`);
        // Instead of redirect, send JSON with the target URL
        res.json({ success: true, redirectTo: clientRedirectUrl.toString() });
        return;

    } catch (error: any) {
        // Catch any errors from the try block and respond with JSON error
        console.error("[MCP CB] Caught error in main handler logic:", error);
        const errorCode = error instanceof OAuthError ? error.errorCode : "server_error";
        const errorDesc = error instanceof Error ? error.message : "Internal server error during callback processing.";
        // Ensure headers aren't already sent (though unlikely here with explicit returns)
        if (!res.headersSent) {
            res.status(error instanceof InvalidRequestError ? 400 : 500)
               .json({ success: false, error: errorCode, error_description: errorDesc });
        }
        // No longer calling next(error)
    }
});


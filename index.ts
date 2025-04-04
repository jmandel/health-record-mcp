// Edit file: index.ts
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
// import vm from 'vm'; // No longer needed here
import { z } from 'zod';
import { Command } from 'commander';
import cookie from 'cookie'; // Need to parse cookies
import path from 'path'; // Import path module
import { execSync } from 'child_process'; // Import for running build command
import { ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';

// --- Configuration Loading ---
import { loadConfig, AppConfig } from './src/config.js'; // Import config loader
import { ClientFullEHR } from './clientTypes.js'; // Import client types
import { ehrToSqlite, sqliteToEhr } from './src/dbUtils.js'; // Import the functions

// --- Tool Schemas & Logic (Imported) ---
import {
    GrepRecordInputSchema,
    GrepRecordOutputSchema,
    QueryRecordInputSchema,
    QueryRecordOutputSchema,
    EvalRecordInputSchema,
    EvalRecordOutputSchema,
    grepRecordLogic,
    queryRecordLogic,
    evalRecordLogic
} from './src/tools.js'; // Import from the new file

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

// State store for the temporary /authorize -> db-picker flow
interface PickerSessionState {
    clientId: string;
    redirectUri: string;
    codeChallenge: string;
    originalState?: string;
    scope?: string;
    expiresAt: number;
}
const pickerSessions = new Map<string, PickerSessionState>();
const PICKER_SESSION_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes validity for picker choice


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

/**
 * Loads session data (EHR + DB handle) from a persistent SQLite file.
 * 
 * @param databaseId The unique identifier corresponding to the database file name.
 * @returns A Promise resolving to an object containing the loaded fullEhr and the open db handle.
 * @throws Throws an error if the database file cannot be found, opened, or read.
 */
async function loadSessionFromDb(databaseId: string): Promise<{ fullEhr: ClientFullEHR, db: Database }> {
    if (!config.persistence.enabled) {
        throw new Error("Cannot load session from DB: Persistence is not enabled in configuration.");
    }
    console.log(`[SESSION LOAD] Attempting to load session from DB ID: ${databaseId}`);
    let db: Database | undefined = undefined;
    try {
        const filePath = await getSqliteFilePath(databaseId);
        console.log(`[SESSION LOAD] Opening database file: ${filePath}`);
        db = new Database(filePath); // Opens the existing file, throws if not found/readable

        console.log(`[SESSION LOAD] Reconstructing EHR data from database ${db.filename}...`);
        const fullEhr = await sqliteToEhr(db);
        console.log(`[SESSION LOAD] Successfully loaded EHR data for DB ID: ${databaseId}. Resources: ${Object.keys(fullEhr.fhir).length}, Attachments: ${fullEhr.attachments.length}`);

        return { fullEhr, db };

    } catch (error: any) {
        console.error(`[SESSION LOAD] Failed to load session for DB ID ${databaseId}:`, error);
        // Attempt to close the DB if it was opened before the error occurred during sqliteToEhr
        if (db) {
            try { db.close(); } catch (closeErr) { console.error(`[SESSION LOAD] Error closing DB after load failure for ${databaseId}:`, closeErr); }
        }
        // Re-throw a more specific error
        if (error.code === 'SQLITE_CANTOPEN') {
            throw new Error(`Database file not found or inaccessible for ID: ${databaseId}`);
        }
        throw new Error(`Failed to load session data from database ${databaseId}: ${error.message}`);
    }
}


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

// MOVED TO src/tools.ts


// --- Logic Functions ---

// MOVED TO src/tools.ts


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
                // Do not throw error, just warn and proceed with revocation if owned by someone else (or checks disabled)
                // Or should we prevent revoking someone else's token even if checks disabled? Current logic allows it.
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
        const transportSessionId = extra.sessionId;
        if (!transportSessionId) throw new McpError(ErrorCode.InvalidRequest, "Missing session identifier.");
        const transportEntry = activeSseTransports.get(transportSessionId);
        if (!transportEntry) throw new McpError(ErrorCode.InvalidRequest, "Invalid or disconnected session.");
        const mcpAccessToken = transportEntry.mcpAccessToken;
        const session = activeSessions.get(mcpAccessToken);
        if (!session || !session.fullEhr) throw new McpError(ErrorCode.InternalError, "Session data (fullEhr) not found for active connection.");
        console.log(`[TOOL grep_record] Session found for token ${mcpAccessToken.substring(0,8)}...`);

        try {
            // Call the imported logic function which now handles truncation
            const resultString = await grepRecordLogic(session.fullEhr, args.query, args.resource_types);

            // Determine if the result indicates an error (e.g., contains '"error":')
            const isError = resultString.includes('"error":');

            // Directly return the string from the logic function
            return { content: [{ type: "text", text: resultString }], isError: isError };
        } catch (error: any) { // Catch errors from session finding or *unexpected* logic errors
            console.error(`[TOOL grep_record] Unexpected error in handler:`, error);
            const errorResult = JSON.stringify({ error: `Internal server error during handler execution: ${error.message}` });
            return { content: [{ type: "text", text: errorResult }], isError: true };
        }
    }
);

mcpServer.tool(
    "query_record",
    QueryRecordInputSchema.shape,
    async (args, extra) => {
        const transportSessionId = extra.sessionId;
        if (!transportSessionId) throw new McpError(ErrorCode.InvalidRequest, "Missing session identifier.");
        const transportEntry = activeSseTransports.get(transportSessionId);
        if (!transportEntry) throw new McpError(ErrorCode.InvalidRequest, "Invalid or disconnected session.");
        const mcpAccessToken = transportEntry.mcpAccessToken;
        const session = activeSessions.get(mcpAccessToken);
        if (!session) throw new McpError(ErrorCode.InternalError, "Session data not found for active connection.");

        try {
            // Ensure DB is available (potentially initializing/loading)
            const db = await getSessionDb(session); // Use the helper to get the validated DB handle

            // Call the imported logic function which now handles truncation
            const resultString = await queryRecordLogic(db, args.sql);

            // Determine if the result indicates an error
            const isError = resultString.includes('"error":');

            // Directly return the string from the logic function
            return { content: [{ type: "text", text: resultString }], isError: isError };
        } catch (error: any) { // Catch errors from session/DB getting or *unexpected* logic errors
            console.error(`[TOOL query_record] Error executing logic or getting DB:`, error);
            const errorResult = JSON.stringify({ error: `Internal server error during handler execution: ${error.message}` });
            return { content: [{ type: "text", text: errorResult }], isError: true };
        }
    }
);

mcpServer.tool(
    "eval_record",
    EvalRecordInputSchema.shape,
    async (args, extra) => {
         const transportSessionId = extra.sessionId;
        if (!transportSessionId) throw new McpError(ErrorCode.InvalidRequest, "Missing session identifier.");
         const transportEntry = activeSseTransports.get(transportSessionId);
        if (!transportEntry) throw new McpError(ErrorCode.InvalidRequest, "Invalid or disconnected session.");
         const mcpAccessToken = transportEntry.mcpAccessToken;
         const session = activeSessions.get(mcpAccessToken);
        if (!session || !session.fullEhr) throw new McpError(ErrorCode.InternalError, "Session data (fullEhr) not found for active connection.");

        try {
            // Call the imported logic function which now handles truncation and errors
            const resultString = await evalRecordLogic(session.fullEhr, args.code);

            // Determine if the result indicates an error (contains "Execution Error:" or other "error": key)
            const isError = resultString.includes('"error":') || resultString.includes('Execution Error:');

            // Directly return the string from the logic function
            return { content: [{ type: "text", text: resultString }], isError: isError };

        } catch (error: any) { // Catch unexpected errors during the handler itself
             console.error(`[TOOL eval_record] Unexpected error in handler:`, error);
              const errorResult = JSON.stringify({ error: `Internal server error during handler execution: ${error.message}` });
              return { content: [{ type: "text", text: errorResult}], isError: true };
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
        // Note: express.json() is added selectively to specific POST endpoints where needed

// Logging Middleware
app.use((req, res, next) => {
    console.log(`[HTTP] ${req.method} ${req.path}`);
    next();
});

// --- Serve Static Files from ./static --- 
const staticPath = path.resolve(process.cwd(), 'static'); // UPDATED path
console.log(`[STATIC] Serving static files from: ${staticPath}`);
app.use('/static', express.static(staticPath)); // UPDATED mount path

// --- API Endpoints (New) ---

app.get('/api/list-stored-records', async (req, res) => { // Renamed endpoint
    if (!config.persistence.enabled) {
        console.log("[/api/list-stored-records] Request received but persistence is disabled.");
        res.json([]); // Return empty array if persistence is off
        return;
    }
    if (!config.persistence.directory) {
        console.error("[/api/list-stored-records] Persistence directory not configured.");
        res.status(500).json({ error: "Server configuration error: persistence directory missing." });
        return;
    }

    console.log(`[/api/list-stored-records] Scanning directory: ${config.persistence.directory}`);
    const recordList: any[] = []; // Renamed variable
    let db: Database | undefined = undefined;

    try {
        // Ensure the directory exists
        try {
            await fs.access(config.persistence.directory);
        } catch (dirError: any) {
            if (dirError.code === 'ENOENT') {
                console.log(`[/api/list-stored-records] Persistence directory ${config.persistence.directory} does not exist. Returning empty list.`);
                res.json([]); // Directory doesn't exist, so no records
                return;
            } else {
                throw dirError; // Re-throw other errors
            }
        }

        const files = await fs.readdir(config.persistence.directory);
        for (const file of files) {
            if (file.endsWith('.sqlite')) {
                const databaseId = file.replace('.sqlite', '');
                const filePath = path.join(config.persistence.directory, file);
                console.log(`[/api/list-stored-records] Processing file: ${file} (DB ID: ${databaseId})`);

                try {
                    db = new Database(filePath);
                    // Query for Patient resource
                    const patientQuery = db.query<{ json: string }, []>(
                        `SELECT json FROM fhir_resources WHERE resource_type = 'Patient' LIMIT 1`
                    );
                    const patientRow = patientQuery.get(); // Use get() for LIMIT 1

                    if (patientRow) {
                        const patientResource = JSON.parse(patientRow.json);
                        const patientName = patientResource.name?.[0] ?
                            `${patientResource.name[0].given?.join(' ') || ''} ${patientResource.name[0].family || ''}`.trim()
                            : 'Unknown Name';
                        const patientId = patientResource.id || 'Unknown ID';
                        const patientBirthDate = patientResource.birthDate || undefined;

                        recordList.push({ // Use renamed variable
                            databaseId,
                            patientName,
                            patientId,
                            patientBirthDate
                        });
                        console.log(`[/api/list-stored-records] Added patient: ${patientName} (ID: ${patientId}) from DB: ${databaseId}`);
                    } else {
                        console.warn(`[/api/list-stored-records] No Patient resource found in DB: ${databaseId}`);
                        // Optionally add a placeholder if you want to list DBs without patients
                        // recordList.push({ databaseId, patientName: "No Patient Found", patientId: "N/A" });
                    }
                    db.close(); // Close DB after querying
                    db = undefined;
                } catch (error: any) {
                    console.error(`[/api/list-stored-records] Error processing DB file ${file}:`, error);
                    // Simpler check: If db was assigned, try closing it.
                    if (db) {
                        try { db.close(); } catch (e) { /* ignore close error */ }
                    }
                    db = undefined;
                    // Continue to the next file
                }
            }
        }
        console.log(`[/api/list-stored-records] Finished scan. Found ${recordList.length} valid stored records.`); // Updated log
        res.json(recordList); // Use renamed variable
    } catch (error: any) {
        console.error("[/api/list-stored-records] Failed to list stored records:", error); // Updated log
        res.status(500).json({ error: "Failed to list stored records", message: error.message }); // Updated error message
    }
});

// Endpoint called by db-picker.js when "New EHR" is clicked
// Needs express.json() to parse the body
app.post('/store-auth-flow', express.json(), (req, res) => {
    console.log("[/store-auth-flow] Received request to store MCP params.");
    try {
        // Basic validation of expected parameters in the body
        const { 
            client_id: mcpClientId, 
            redirect_uri: mcpRedirectUri, 
            code_challenge: mcpCodeChallenge, 
            state: mcpOriginalState 
            // Add other essential params if needed by authFlowStates structure
        } = req.body;

        if (!mcpClientId || !mcpRedirectUri || !mcpCodeChallenge) {
            console.error("[/store-auth-flow] Missing required MCP parameters in request body.");
            res.status(400).json({ error: "invalid_request", error_description: "Missing required MCP parameters." });
            return;
        }

        const authFlowId = `mcp-auth-${uuidv4()}`;
        authFlowStates.set(authFlowId, {
            mcpClientId: mcpClientId,
            mcpRedirectUri: mcpRedirectUri,
            mcpCodeChallenge: mcpCodeChallenge,
            mcpOriginalState: mcpOriginalState, // Can be undefined
            nonce: 'db-picker-new-ehr', // Indicate origin
            expiresAt: Date.now() + AUTH_FLOW_EXPIRY_MS
        });

        console.log(`[/store-auth-flow] Stored auth flow state ${authFlowId} for MCP client ${mcpClientId}.`);
        res.status(200).json({ authFlowId: authFlowId });

    } catch (error: any) {
        console.error("[/store-auth-flow] Error storing auth flow state:", error);
        res.status(500).json({ error: "server_error", error_description: "Failed to store auth flow state." });
    }
});

// Endpoint called by db-picker.js when an existing session tile is clicked
app.get('/initiate-session-from-db', async (req, res) => {
    // Only read databaseId and pickerSessionId from query
    const databaseId = req.query.databaseId as string | undefined;
    const pickerSessionId = req.query.pickerSessionId as string | undefined;

    // Removed destructuring of other MCP params from req.query

    let pickerState: PickerSessionState | undefined = undefined; // Define pickerState here for broader scope

    try {
        // --- Parameter Validation (Query Params) ---
        if (!databaseId) throw new InvalidRequestError("databaseId required");
        if (!pickerSessionId) throw new InvalidRequestError("pickerSessionId required");
        console.log(`[/initiate-session-from-db] Parameters: dbId=${databaseId}, pickerSessionId=${pickerSessionId}`);

        // --- Retrieve and Validate Picker Session State ---
        pickerState = pickerSessions.get(pickerSessionId); // Assign to outer variable
        pickerSessions.delete(pickerSessionId); // Consume the state

        if (!pickerState) throw new InvalidRequestError("Invalid or expired picker session ID.");
        if (pickerState.expiresAt < Date.now()) throw new InvalidRequestError("Picker session expired.");

        // Log retrieved state
        console.log(`[/initiate-session-from-db] Retrieved picker state for client ${pickerState.clientId}`);

        // --- Removed validation for MCP params from req.query --- 

        // --- Load Session Data ---
        const { fullEhr, db } = await loadSessionFromDb(databaseId);

        // --- Get/Validate MCP Client Info (using pickerState) ---
        let mcpClientInfo: OAuthClientInformationFull | undefined;
        if (config.security.disableClientChecks) {
             console.log(`[/initiate-session-from-db] Client checks disabled for client: ${pickerState.clientId}`);
             mcpClientInfo = { // Minimal placeholder based on stored state
                 client_id: pickerState.clientId, 
                 client_name: `Placeholder Client (${pickerState.clientId})`, // Added name
                 redirect_uris: [pickerState.redirectUri], // Use from pickerState
                 token_endpoint_auth_method: 'none',
                 // Add other required fields if UserSession type needs them
                 scope: pickerState.scope || '', 
                 grant_types: ['authorization_code'],
                 response_types: ['code'],
             };
        } else {
            mcpClientInfo = await oauthProvider.clientsStore.getClient(pickerState.clientId); // Use from pickerState
            if (!mcpClientInfo) {
                // Use a more specific error perhaps? 
                throw new InvalidClientError(`MCP Client information not found for ID: ${pickerState.clientId}`);
            }
            // Double-check redirect URI consistency
            if (!mcpClientInfo.redirect_uris.includes(pickerState.redirectUri)) { // Use from pickerState
                throw new InvalidRequestError("Redirect URI from picker session does not match client registration.");
            }
        }

        // --- Create UserSession Object ---
        const session: UserSession = {
            transportSessionId: "", // Will be set by transport
            mcpAccessToken: "", // Will be set upon token exchange
            fullEhr: fullEhr,
            db: db,
            mcpClientInfo: mcpClientInfo, // Use the obtained/constructed info
            mcpAuthCodeChallenge: pickerState.codeChallenge, // Use from pickerState
        };

        // --- Generate MCP Auth Code & Store Session --- 
        const mcpAuthCode = `mcp-code-${uuidv4()}`;
        session.mcpAuthCode = mcpAuthCode;
        sessionsByMcpAuthCode.set(mcpAuthCode, session);
        console.log(`[/initiate-session-from-db] Stored UserSession from DB ${databaseId}, generated MCP Auth Code: ${mcpAuthCode.substring(0,12)}...`);

        // --- Redirect back to MCP Client --- 
        const clientRedirectUrl = new URL(pickerState.redirectUri); // Use URI from pickerState
        clientRedirectUrl.searchParams.set("code", mcpAuthCode);
        if (pickerState.originalState) { // Use from pickerState
            clientRedirectUrl.searchParams.set("state", pickerState.originalState);
        }
        console.log(`[/initiate-session-from-db] Redirecting back to MCP Client: ${clientRedirectUrl.toString()}`);
        res.redirect(302, clientRedirectUrl.toString());

    } catch (error: any) {
        console.error(`[/initiate-session-from-db] Error initiating session from DB ${databaseId} for picker session ${pickerSessionId}:`, error);
        
        // Try closing DB if it was opened during loadSessionFromDb before error
        if (error.db && typeof error.db.close === 'function') { // Check if DB handle exists on a potentially custom error or find it if it was partially created
           try { error.db.close(); console.log("[/initiate-session-from-db] Closed DB connection after error."); } catch (e) {}
        }
        
        // Try to redirect back to the MCP client with an error
        // Use pickerState safely, as it might be undefined if error happened early
        const clientRedirectUriOnError = pickerState?.redirectUri;
        if (clientRedirectUriOnError) {
            try {
                const redirectUrl = new URL(clientRedirectUriOnError);
                if (error instanceof OAuthError) {
                    redirectUrl.searchParams.set("error", error.errorCode);
                    if (error.message) redirectUrl.searchParams.set("error_description", error.message);
                } else {
                    redirectUrl.searchParams.set("error", "server_error");
                    redirectUrl.searchParams.set("error_description", "Failed to initialize session from stored record: " + (error?.message || 'Unknown error'));
                }
                if (pickerState?.originalState) { // Use optional chaining
                    redirectUrl.searchParams.set("state", pickerState.originalState);
                }
                if (!res.headersSent) {
                     console.log(`[/initiate-session-from-db] Redirecting to client with error: ${redirectUrl.toString()}`);
                    res.redirect(302, redirectUrl.toString());
                    return; // Explicit return after redirect
                }
            } catch (urlError) {
                console.error(`[/initiate-session-from-db] Invalid redirect URI for error reporting: ${clientRedirectUriOnError}`);
            }
        }
        // Fallback if redirect fails or URI is bad
        if (!res.headersSent) {
             res.status(500).send("Internal server error initiating session from stored record.");
        }
    }
});

// Endpoint to handle the "Connect to New EHR" button click from the picker
app.get('/initiate-new-ehr-flow', async (req, res) => {
    const pickerSessionId = req.query.pickerSessionId as string | undefined;

    if (!pickerSessionId) {
         console.error("[/initiate-new-ehr-flow] Missing pickerSessionId parameter.");
        res.status(400).send("Missing pickerSessionId parameter.");
        return;
    }

    // Retrieve and consume the picker session state
    const pickerState = pickerSessions.get(pickerSessionId);
    pickerSessions.delete(pickerSessionId); // Consume the state

    if (!pickerState) {
         console.error(`[/initiate-new-ehr-flow] Invalid or expired picker session ID: ${pickerSessionId}`);
        res.status(400).send("Invalid or expired picker session ID.");
        return;
    }
    if (pickerState.expiresAt < Date.now()) {
         console.error(`[/initiate-new-ehr-flow] Picker session expired: ${pickerSessionId}`);
        res.status(400).send("Picker session expired.");
        return;
    }

    console.log(`[/initiate-new-ehr-flow] Starting flow for picker session ${pickerSessionId}, client ${pickerState.clientId}`);

    try {
        // Now, set up the AuthFlowState using the retrieved picker state
        const authFlowId = `mcp-auth-${uuidv4()}`;
        authFlowStates.set(authFlowId, {
            mcpClientId: pickerState.clientId,
            mcpRedirectUri: pickerState.redirectUri,
            mcpCodeChallenge: pickerState.codeChallenge,
            mcpOriginalState: pickerState.originalState,
            nonce: 'picker-redirect-new', // More specific nonce
            expiresAt: Date.now() + AUTH_FLOW_EXPIRY_MS
        });
        console.log(`[/initiate-new-ehr-flow] Created auth flow state ${authFlowId} for client ${pickerState.clientId}.`);

        // Set the cookie for the EHR retriever callback
        const cookieOptions: cookie.SerializeOptions = {
            httpOnly: true,
            path: '/', // Set path specifically for the callback? '/' should work.
            maxAge: AUTH_FLOW_EXPIRY_MS / 1000,
            secure: config.server.https.enabled,
            sameSite: 'lax' // Lax is usually appropriate here
        };
        res.setHeader('Set-Cookie', cookie.serialize(AUTH_FLOW_COOKIE_NAME, authFlowId, cookieOptions));

        // Redirect to the EHR retriever page
        const retrieverUrl = '/static/ehretriever.html#deliver-to:mcp-callback';
        console.log(`[/initiate-new-ehr-flow] Redirecting user to EHR retriever: ${retrieverUrl}`);
        res.redirect(302, retrieverUrl);

    } catch (error: any) {
        console.error(`[/initiate-new-ehr-flow] Error initiating new EHR flow for picker session ${pickerSessionId}:`, error);
        // Generic error back to browser if something unexpected happens
        res.status(500).send("Internal server error initiating EHR flow.");
    }
});

// --- MCP Auth Endpoints ---
        // Use config for base URLs
        app.options("/.well-known/oauth-authorization-server", cors());
app.get("/.well-known/oauth-authorization-server", cors(), (req, res) => {
    // Construct URLs using config.server.baseUrl
    const issuer = config.server.baseUrl;
    const metadata = {
                issuer: issuer,
                authorization_endpoint: `${issuer}/authorize`,
                token_endpoint: `${issuer}/token`,
                registration_endpoint: `${issuer}/register`,
                revocation_endpoint: `${issuer}/revoke`,
        response_types_supported: ["code"],
        grant_types_supported: ["authorization_code"], // Only auth code supported
        code_challenge_methods_supported: ["S256"], // Only S256 PKCE
        token_endpoint_auth_methods_supported: ["none", "client_secret_post"], // Allow public and secret clients
        revocation_endpoint_auth_methods_supported: ["none", "client_secret_post"], // Allow public and secret clients
        scopes_supported: [], // TODO: Define supported scopes if applicable
        // service_documentation: `${issuer}/docs`, // Optional: Link to docs
        // ui_locales_supported: ["en-US"] // Optional
    };
    res.json(metadata);
});

app.get("/authorize", async (req, res) => {
    // Extract parameters with type assertion for clarity
    const clientId = req.query.client_id as string | undefined;
    const redirectUri = req.query.redirect_uri as string | undefined;
    const responseType = req.query.response_type as string | undefined;
    const codeChallenge = req.query.code_challenge as string | undefined;
    const codeChallengeMethod = req.query.code_challenge_method as string | undefined;
    const state = req.query.state as string | undefined; // MCP client state
    const scope = req.query.scope as string | undefined; // MCP scope (optional)
    
    console.log(`[AUTHORIZE] Request received. Client ID: ${clientId}, Redirect URI: ${redirectUri}, State: ${state ? state.substring(0,10)+'...' : 'none'}`);

    let validatedRedirectUri = redirectUri; // To store the validated URI

    try {
        // --- Parameter Validation ---
        if (!clientId) throw new InvalidRequestError("client_id required");
        if (responseType !== 'code') throw new InvalidRequestError("response_type must be 'code'");
        if (!codeChallenge) throw new InvalidRequestError("code_challenge required");
        if (codeChallengeMethod !== 'S256') throw new InvalidRequestError("code_challenge_method must be 'S256'");

        let mcpClientInfo: OAuthClientInformationFull | undefined;

        // --- Client and Redirect URI Validation (respecting config.security.disableClientChecks) ---
        if (config.security.disableClientChecks) {
            console.warn(`[AUTHORIZE] Client checks disabled for client: ${clientId}. Accepting provided redirect_uri.`);
            if (!validatedRedirectUri) {
                 throw new InvalidRequestError("redirect_uri required when client checks are disabled");
            }
            // Create minimal placeholder client info - needed for storing state later
            mcpClientInfo = {
                 client_id: clientId,
                 client_name: `Placeholder Client (${clientId})`,
                 redirect_uris: [validatedRedirectUri], // Use the provided one
                 token_endpoint_auth_method: 'none', // Assume public if checks disabled
                 scope: scope || '', // Pass scope through
                 grant_types: ['authorization_code'],
                 response_types: ['code'],
                 // Other fields aren't strictly needed for this step
             };
        } else {
            // Standard client validation
            mcpClientInfo = await oauthProvider.clientsStore.getClient(clientId);
            if (!mcpClientInfo) throw new InvalidClientError("Invalid client_id");

            // Validate redirect_uri against registered URIs
            if (!validatedRedirectUri) {
                // If only one URI is registered, default to it
                if (mcpClientInfo.redirect_uris.length === 1) {
                    validatedRedirectUri = mcpClientInfo.redirect_uris[0];
                     console.log(`[AUTHORIZE] Defaulting to registered redirect_uri: ${validatedRedirectUri}`);
                } else {
                    throw new InvalidRequestError("redirect_uri required (client has multiple registered URIs)");
                }
            } else if (!mcpClientInfo.redirect_uris.includes(validatedRedirectUri)) {
                 console.error(`[AUTHORIZE] Provided redirect_uri "${validatedRedirectUri}" not registered for client ${clientId}. Registered: [${mcpClientInfo.redirect_uris.join(', ')}]`);
                throw new InvalidRequestError("Unregistered redirect_uri");
            }
        }

        // --- Store parameters for Picker & Redirect --- 
        const pickerSessionId = `mcp-picker-${uuidv4()}`;

        // Store the validated parameters server-side, associated with the picker session
        pickerSessions.set(pickerSessionId, {
            clientId: clientId,
            redirectUri: validatedRedirectUri!, // Use the validated URI
            codeChallenge: codeChallenge,
            originalState: state, // Store the original MCP client state
            scope: scope, // Store the requested scope
            expiresAt: Date.now() + PICKER_SESSION_EXPIRY_MS
        });
        console.log(`[AUTHORIZE] Stored picker session ${pickerSessionId} for client ${clientId}. Redirect URI: ${validatedRedirectUri}`);

        // Construct the picker URL, passing *only* the session ID
        // Ensure baseUrl includes the protocol (http/https)
        const pickerUrl = new URL('/static/db-picker.html', config.server.baseUrl);
        pickerUrl.searchParams.set('pickerSessionId', pickerSessionId);

        console.log(`[AUTHORIZE] Redirecting user to DB picker: ${pickerUrl.toString()}`);
        res.redirect(302, pickerUrl.toString());
        // --- End Redirect to DB Picker ---

    } catch (error: any) {
        console.error("[AUTHORIZE] /authorize error:", error);
        
        // Attempt to redirect back to the client with error parameters
        // Use the initially provided redirectUri for error reporting if validation failed early,
        // otherwise use the validatedRedirectUri if it was determined.
        let clientRedirectUriOnError = validatedRedirectUri || redirectUri;

        if (!clientRedirectUriOnError && !config.security.disableClientChecks && clientId) {
             // If no redirect URI was provided AND checks are enabled, try to get the default registered one
            try {
                const info = await oauthProvider.clientsStore.getClient(clientId);
                if (info?.redirect_uris?.length === 1) {
                    clientRedirectUriOnError = info.redirect_uris[0];
                 }
            } catch { /* Ignore error fetching client info here */ }
        }
        
        if (clientRedirectUriOnError) {
             try {
                 const redirectUrl = new URL(clientRedirectUriOnError); // Validate the error redirect URI itself
                 if (error instanceof OAuthError) {
                     redirectUrl.searchParams.set("error", error.errorCode);
                     if (error.message) redirectUrl.searchParams.set("error_description", error.message);
                 } else {
                     // General server error
                     redirectUrl.searchParams.set("error", "server_error");
                     redirectUrl.searchParams.set("error_description", "Internal authorization error: " + (error?.message || 'Unknown reason'));
                 }
                 // IMPORTANT: Pass back the original MCP client state on error
                 if (state) redirectUrl.searchParams.set("state", state); 
                 
                 if (!res.headersSent) {
                      console.log(`[AUTHORIZE] Redirecting to client with error: ${redirectUrl.toString()}`);
                     res.redirect(302, redirectUrl.toString());
                     return; // Exit after redirect
                 }
             } catch (urlError) {
                 console.error(`[AUTHORIZE] Invalid redirect URI provided for error reporting: ${clientRedirectUriOnError}`, urlError);
                 // Fall through to generic error response if error redirect URI is bad
             }
        }
        
        // Fallback if no redirect URI is available or it's invalid
        if (!res.headersSent) {
             // Don't send specific error details here if redirect failed, could leak info.
            res.status(400).send("Authorization failed. Unable to redirect back to client with error details.");
        }
    }
});

        app.options("/token", cors());
// Needs urlencoded middleware for form data, NOT express.json()
app.post("/token", cors(), express.urlencoded({ extended: true }), async (req, res) => {
    try {
        // Extract parameters from URL-encoded body
        const {
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: grantType,
            code: mcpCode, // This is the MCP authorization code
            code_verifier: mcpCodeVerifier, // PKCE verifier
            // redirect_uri: redirectUri // Optional, could be validated if needed
        } = req.body;

        console.log(`[TOKEN] Request received. Grant Type: ${grantType}, Client ID: ${clientId}`);

        // --- Parameter Validation ---
         if (!grantType) throw new InvalidRequestError("grant_type required");
         if (!clientId) throw new InvalidRequestError("client_id required");

         let mcpClientInfo: OAuthClientInformationFull | undefined;

         // --- Client Authentication (if required) ---
         if (!config.security.disableClientChecks) {
             mcpClientInfo = await oauthProvider.clientsStore.getClient(clientId);
             if (!mcpClientInfo) throw new InvalidClientError("Invalid client_id");

             // Check if client requires authentication (client_secret_post)
             if (mcpClientInfo.token_endpoint_auth_method === 'client_secret_post') {
                 if (!clientSecret) throw new InvalidClientError("client_secret required for this client");
                 if (!mcpClientInfo.client_secret) {
                     console.error(`[TOKEN] Client ${clientId} configured for secret auth, but no secret is registered!`);
                     throw new ServerError("Server configuration error for client secret");
                 }
                 if (clientSecret !== mcpClientInfo.client_secret) throw new InvalidClientError("Invalid client_secret");
                 // Check secret expiry if applicable
                 if (mcpClientInfo.client_secret_expires_at && mcpClientInfo.client_secret_expires_at < Math.floor(Date.now() / 1000)) {
                    throw new InvalidClientError("Client secret expired");
                 }
                 console.log(`[TOKEN] Client secret verified for ${clientId}`);
             } else if (mcpClientInfo.token_endpoint_auth_method === 'none') {
                 // Public client, no secret check needed
                 console.log(`[TOKEN] Public client ${clientId}, no secret check needed.`);
             } else {
                 console.error(`[TOKEN] Unsupported auth method '${mcpClientInfo.token_endpoint_auth_method}' for client ${clientId}`);
                 throw new InvalidClientError("Unsupported authentication method for this client");
             }
         } else {
             // Client checks disabled - create placeholder info
             console.warn(`[TOKEN] Client checks disabled for client: ${clientId}. Assuming public client.`);
              mcpClientInfo = { // Minimal placeholder needed for provider calls
                 client_id: clientId, 
                 redirect_uris: [], // Not needed for token exchange itself
                 token_endpoint_auth_method: 'none', // Assume public
                 // These might not be strictly necessary depending on provider implementation
                 client_name: `Placeholder Client (${clientId})`, 
                 scope: '', 
                 grant_types: ['authorization_code'], 
                 response_types: ['code'],
             };
         }

        // --- Grant Type Handling ---
         if (grantType === 'authorization_code') {
             console.log(`[TOKEN] Processing authorization_code grant.`);
            if (!mcpCode) throw new InvalidRequestError("code required for authorization_code grant");
            if (!mcpCodeVerifier) throw new InvalidRequestError("code_verifier required for authorization_code grant");

            // 1. Get the expected PKCE challenge associated with the MCP code
            const expectedChallenge = await oauthProvider.challengeForAuthorizationCode(mcpClientInfo!, mcpCode);
            
            // 2. Verify the provided code_verifier against the stored challenge
            if (!await verifyChallenge(mcpCodeVerifier, expectedChallenge)) {
                 console.error(`[TOKEN] PKCE verification failed for code ${mcpCode}. Verifier: ${mcpCodeVerifier}, Challenge: ${expectedChallenge}`);
                throw new InvalidGrantError("code_verifier does not match challenge");
            }
             console.log(`[TOKEN] PKCE verification successful for code ${mcpCode}.`);

            // 3. Exchange the MCP code for tokens
            const tokens = await oauthProvider.exchangeAuthorizationCode(mcpClientInfo!, mcpCode);
            
            // --- Success Response ---
            res.setHeader('Cache-Control', 'no-store'); // Prevent caching of token response
            res.setHeader('Pragma', 'no-cache');
            res.json(tokens); // Send OAuthTokens object { access_token, token_type, expires_in, ... }
            console.log(`[TOKEN] Issued tokens for client ${clientId}`);

        } else {
             console.error(`[TOKEN] Unsupported grant_type: ${grantType}`);
            throw new UnsupportedGrantTypeError(`Unsupported grant_type: ${grantType}`);
        }

    } catch (error: any) {
         console.error("[TOKEN] /token error:", error);
         
         // Determine appropriate HTTP status code
         const status = (error instanceof OAuthError && !(error instanceof ServerError)) 
             ? (error instanceof InvalidClientError ? 401 : 400) // 401 for auth fail, 400 for bad request
             : 500; // Internal server error
         
         // Get standardized error response object
         const errorResp = (error instanceof OAuthError) 
             ? error.toResponseObject() 
             : new ServerError("Token exchange failed").toResponseObject();

        // Set headers for error response too
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Pragma', 'no-cache');
         if (status === 401) { // Add WWW-Authenticate header for client auth errors
             res.set("WWW-Authenticate", `Basic error="${errorResp.error}", error_description="${errorResp.error_description}"`); // Assuming Basic for now, adjust if needed
         }
        res.status(status).json(errorResp);
    }
});

        app.options("/register", cors());
// Needs express.json() to parse client metadata
app.post("/register", cors(), express.json(), async (req, res) => {
    console.log(`[REGISTER] Received dynamic client registration request`);
    try {
        // Check if registration is actually supported by the provider implementation
        if (!oauthProvider.clientsStore.registerClient) {
            throw new ServerError("Dynamic client registration not supported by this server configuration.");
        }
        
        // Basic validation of incoming metadata (as per RFC 7591)
        const clientMetadata = req.body as Partial<OAuthClientMetadata>;
        if (!clientMetadata || typeof clientMetadata !== 'object') {
             throw new InvalidClientError("Invalid client metadata format.");
        }
        if (!Array.isArray(clientMetadata.redirect_uris) || clientMetadata.redirect_uris.length === 0 || !clientMetadata.redirect_uris.every(u => typeof u === 'string')) {
            throw new InvalidClientError("redirect_uris is required and must be an array of strings.");
        }
        // Add more validation as needed (e.g., validate URI format, grant_types, response_types, token_endpoint_auth_method)
        const requestedAuthMethod = clientMetadata.token_endpoint_auth_method || 'none'; // Default to public
        const supportedAuthMethods = ['none', 'client_secret_post']; // Methods supported by this server
        if (!supportedAuthMethods.includes(requestedAuthMethod)) {
             throw new InvalidClientError(`Unsupported token_endpoint_auth_method: ${requestedAuthMethod}. Supported methods: ${supportedAuthMethods.join(', ')}`);
        }
        const isPublic = requestedAuthMethod === 'none';

        // Generate client credentials
        const clientId = crypto.randomUUID();
        let clientSecret: string | undefined = undefined;
        let secretExpiresAt: number | undefined = undefined;

        if (!isPublic) {
            // Generate a secure random secret (e.g., 32 bytes hex encoded)
            const buf = new Uint8Array(32);
            crypto.getRandomValues(buf);
            clientSecret = Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
            // Set an expiry time for the secret (e.g., 30 days from now)
            secretExpiresAt = Math.floor(Date.now() / 1000) + (30) * 24 * 60 * 60; 
        }

        // Construct the full client information object
        const generatedInfo: OAuthClientInformationFull = {
            // Start with validated/provided metadata
            ...(clientMetadata as OAuthClientMetadata), // Cast after validation
            // Overwrite/set mandatory fields
            client_id: clientId,
            client_secret: clientSecret, // Undefined for public clients
            client_id_issued_at: Math.floor(Date.now() / 1000),
            client_secret_expires_at: secretExpiresAt, // Undefined for public clients
            // Ensure required fields have defaults if not provided
            token_endpoint_auth_method: requestedAuthMethod,
            grant_types: clientMetadata.grant_types || ['authorization_code'], // Default grant type
            response_types: clientMetadata.response_types || ['code'], // Default response type
            // scope: clientMetadata.scope || '', // Default scope
        };

        // Register the client using the provider's store
        const registeredInfo = await oauthProvider.clientsStore.registerClient(generatedInfo);
        console.log(`[REGISTER] Successfully registered client: ${registeredInfo.client_id}, Name: ${registeredInfo.client_name || 'N/A'}, Auth Method: ${registeredInfo.token_endpoint_auth_method}`);

        // --- Success Response (201 Created) ---
        // Return the registered client information (including generated secrets/IDs)
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Pragma', 'no-cache');
        res.status(201).json(registeredInfo);

    } catch (error: any) {
        console.error("[REGISTER] /register error:", error);
        
        const status = (error instanceof OAuthError && !(error instanceof ServerError)) ? 400 : 500;
        const errorResp = (error instanceof OAuthError) 
            ? error.toResponseObject() 
            : new ServerError("Client registration failed").toResponseObject();
        
        res.status(status).json(errorResp);
    }
});

        app.options("/revoke", cors());
// Needs urlencoded middleware for form data
app.post("/revoke", cors(), express.urlencoded({ extended: true }), async (req, res) => {
     console.log(`[REVOKE] Received token revocation request`);
    try {
        // Check if revocation is supported
        if (!oauthProvider.revokeToken) {
            throw new ServerError("Token revocation not supported by this server configuration.");
        }
        
        // Extract parameters
        const {
            client_id: clientId,
            client_secret: clientSecret,
            token: tokenToRevoke,
            token_type_hint: tokenTypeHint // Optional hint (e.g., "access_token", "refresh_token")
        } = req.body;

        // --- Parameter Validation ---
        if (!tokenToRevoke) throw new InvalidRequestError("token required");
        // Client ID is required for authentication, even if the client is public
        if (!clientId) throw new InvalidRequestError("client_id required for authentication");

        let mcpClientInfo: OAuthClientInformationFull | undefined;

         // --- Client Authentication (Similar to /token endpoint) ---
         if (!config.security.disableClientChecks) {
             mcpClientInfo = await oauthProvider.clientsStore.getClient(clientId);
             if (!mcpClientInfo) throw new InvalidClientError("Invalid client_id");

             // Use configured auth method for revocation endpoint
             const requiredAuthMethod =  mcpClientInfo.token_endpoint_auth_method; // Fallback to token endpoint method

             if (requiredAuthMethod === 'client_secret_post') {
                 if (!clientSecret) throw new InvalidClientError("client_secret required for this client");
                 if (!mcpClientInfo.client_secret) {
                      console.error(`[REVOKE] Client ${clientId} configured for secret auth, but no secret is registered!`);
                     throw new ServerError("Server configuration error for client secret");
                 }
                 if (clientSecret !== mcpClientInfo.client_secret) throw new InvalidClientError("Invalid client_secret");
                 if (mcpClientInfo.client_secret_expires_at && mcpClientInfo.client_secret_expires_at < Math.floor(Date.now() / 1000)) {
                    throw new InvalidClientError("Client secret expired");
                 }
                 console.log(`[REVOKE] Client secret verified for ${clientId}`);
             } else if (requiredAuthMethod === 'none') {
                 console.log(`[REVOKE] Public client ${clientId}, no secret check needed.`);
             } else {
                  console.error(`[REVOKE] Unsupported auth method '${requiredAuthMethod}' for client ${clientId} on revocation`);
                 throw new InvalidClientError("Unsupported authentication method for this client");
             }
         } else {
             // Client checks disabled
             console.warn(`[REVOKE] Client checks disabled for client: ${clientId}. Assuming public client.`);
              mcpClientInfo = { // Minimal placeholder
                 client_id: clientId, 
                 redirect_uris: [], 
                 token_endpoint_auth_method: 'none',
                 client_name: `Placeholder Client (${clientId})`, 
                 scope: '', 
                 grant_types: [], 
                 response_types: [],
             };
         }

        // --- Perform Revocation ---
        // Pass the authenticated client info and the token details to the provider
         await oauthProvider.revokeToken(mcpClientInfo!, { 
             token: tokenToRevoke, 
             token_type_hint: tokenTypeHint 
            });
         console.log(`[REVOKE] Attempted revocation for token starting with ${tokenToRevoke.substring(0, 8)}... by client ${clientId}`);

        // --- Success Response (200 OK) ---
        // RFC 7009 specifies returning 200 OK on success, even if the token was invalid/already revoked.
        // Do NOT reveal whether the token was valid or not.
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Pragma', 'no-cache');
        res.sendStatus(200);

    } catch (error: any) {
         console.error("[REVOKE] /revoke error:", error);
         
         // Handle errors similarly to /token
         const status = (error instanceof OAuthError && !(error instanceof ServerError)) 
             ? (error instanceof InvalidClientError ? 401 : 400) 
             : 500;
         
         const errorResp = (error instanceof OAuthError) 
             ? error.toResponseObject() 
             : new ServerError("Token revocation failed").toResponseObject();
        
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Pragma', 'no-cache');
         if (status === 401) {
             res.set("WWW-Authenticate", `Basic error="${errorResp.error}", error_description="${errorResp.error_description}"`);
         }
        res.status(status).json(errorResp);
    }
});

        // --- MCP SSE Endpoint ---
app.get("/mcp-sse", bearerAuthMiddleware, async (req: Request, res: Response) => {
    const authInfo = req.auth; // Provided by bearerAuthMiddleware
    if (!authInfo) {
        // This *shouldn't* happen if middleware is correct, but safeguard anyway
        console.error("[SSE GET] Middleware succeeded but req.auth is missing!");
        if (!res.headersSent) res.status(500).send("Authentication failed unexpectedly.");
        return;
    }

    const mcpAccessToken = authInfo.token;
    console.log(`[SSE GET] Auth successful for token ${mcpAccessToken.substring(0, 8)}..., client: ${authInfo.clientId}`);

    // --- Find the corresponding UserSession ---
    const session = activeSessions.get(mcpAccessToken);
    if (!session) {
        // Valid token, but no active session found (e.g., revoked, expired, server restart)
        console.warn(`[SSE GET] Session data not found for valid token ${mcpAccessToken.substring(0, 8)}... Client: ${authInfo.clientId}`);
        // Respond with 401 and specific error message
        res.set("WWW-Authenticate", `Bearer error="invalid_token", error_description="Session associated with token not found or expired."`)
        res.status(401).json({ error: "invalid_token", error_description: "Session associated with token not found or expired." });
        return;
    }

    // --- Verify Client ID Match (Optional but recommended unless checks disabled) ---
    if (!config.security.disableClientChecks && session.mcpClientInfo.client_id !== authInfo.clientId) {
         // Should be rare if token verification worked, but could happen with token theft / session mismatch
        console.error(`[SSE GET] Forbidden: Client ID mismatch for token ${mcpAccessToken.substring(0, 8)}... Token Client: ${authInfo.clientId}, Session Client: ${session.mcpClientInfo.client_id}`);
        res.set("WWW-Authenticate", `Bearer error="invalid_token", error_description="Token client ID does not match session client ID."`);
        // Use 403 Forbidden might be more appropriate than 401 here
        res.status(403).json({ error: "forbidden", error_description: "Token client ID does not match session client ID." });
        return;
    }

    // --- Check for existing transport for this session ---
     if (session.transportSessionId && activeSseTransports.has(session.transportSessionId)) {
         console.warn(`[SSE GET] Client ${authInfo.clientId} attempting to reconnect SSE for token ${mcpAccessToken.substring(0, 8)}... while another transport (${session.transportSessionId}) is already active. Closing old transport.`);
         const oldTransportEntry = activeSseTransports.get(session.transportSessionId);
         try {
             oldTransportEntry?.transport.close(); // Attempt to close the old connection
         } catch (closeErr) {
             console.error(`[SSE GET] Error closing old transport ${session.transportSessionId}:`, closeErr);
         }
         activeSseTransports.delete(session.transportSessionId);
         session.transportSessionId = ""; // Clear the old ID reference
     }


    // --- Establish SSE Connection ---
    let transport: SSEServerTransport | null = null;
    try {
        // Create the SSE transport using the response object
        transport = new SSEServerTransport(`/mcp-messages`, res); // Pass base path for POST messages
        const transportSessionId = transport.sessionId; // Get the unique ID generated by the transport

        // Link the transport session ID back to the UserSession
        session.transportSessionId = transportSessionId;

        // Store the active transport, linking it to the MCP token and auth info
        activeSseTransports.set(transportSessionId, { 
            transport: transport,
            mcpAccessToken: mcpAccessToken,
            authInfo: authInfo // Store auth info for potential use in POST handler
        });
        console.log(`[SSE GET] Client connected & authenticated. Transport Session ID: ${transportSessionId}, linked to MCP Token: ${mcpAccessToken.substring(0, 8)}...`);

        // --- Handle Client Disconnection ---
        res.on('close', () => {
            console.log(`[SSE Closed] Client disconnected. Cleaning up transport session: ${transportSessionId}`);
            // Remove the transport from the active map
            activeSseTransports.delete(transportSessionId); 
            // If the session still references this transport ID, clear it
            // Check session exists in case it was cleared by token revocation during the connection
            const currentSession = activeSessions.get(mcpAccessToken); 
            if (currentSession && currentSession.transportSessionId === transportSessionId) { 
                currentSession.transportSessionId = ""; // Mark session as disconnected
                 console.log(`[SSE Closed] Cleared transportSessionId for MCP Token ${mcpAccessToken.substring(0, 8)}...`);
            }

            // TODO Stop deleting
            // console.log(`[SSE Closed] Deleting session for MCP Token ${mcpAccessToken.substring(0, 8)}...`);
            // activeSessions.delete(mcpAccessToken);
            // MCP Server SDK might also have cleanup via transport.close() internally
        });

        // --- Connect the MCP Server to the Transport ---
        // This starts the MCP message handling loop for this connection
        await mcpServer.connect(transport);
         console.log(`[SSE GET] MCP Server connected to transport ${transportSessionId}. Waiting for messages...`);

    } catch (error) {
        console.error("[SSE GET] Error setting up authenticated SSE connection:", error);
        // --- Cleanup on Error ---
        if (transport) {
             const transportSessionId = transport.sessionId; // Get ID even if setup failed mid-way
             console.log(`[SSE Error Cleanup] Removing transport entry for ${transportSessionId}`);
            activeSseTransports.delete(transportSessionId);
            // If the session was partially updated, reset its transport ID
            if (session && session.transportSessionId === transportSessionId) {
                 session.transportSessionId = ""; 
             }
             // Ensure transport is closed if possible
             try { transport.close(); } catch(e) {}
        }
        
        // --- Send Error Response if possible ---
        if (!res.headersSent) {
             const message = (error instanceof OAuthError) ? "SSE connection setup failed due to authorization issue." : "Failed to establish SSE connection";
             const statusCode = (error instanceof InvalidTokenError) ? 401 : (error instanceof InsufficientScopeError ? 403 : 500);
             if (statusCode === 401 || statusCode === 403) {
                 // Provide WWW-Authenticate header for auth-related errors
                 res.set("WWW-Authenticate", `Bearer error="server_error", error_description="${message}"`); // More specific error code?
             }
             res.status(statusCode).send(message);
        } else if (!res.writableEnded) {
             // If headers sent but connection not ended, try to end it cleanly
             console.log("[SSE GET] Ending response stream after error during setup.");
             res.end();
        }
    }
});

// --- MCP Message POST Endpoint ---
// Needs express.json() to parse message body
app.post("/mcp-messages", (req: Request, res: Response) => { // Added JSON middleware with limit
    // Get session ID from query param
    const transportSessionId = req.query.sessionId as string | undefined; // Use transport session ID
    if (!transportSessionId) {
        console.warn("[MCP POST] Received POST without transport sessionId query param.");
        res.status(400).send("Missing sessionId query parameter");
        return;
    }

    // Find the active transport entry
    const transportEntry = activeSseTransports.get(transportSessionId); // Use transport session ID
    if (!transportEntry) {
        console.warn(`[MCP POST] Received POST for unknown/expired transport sessionId: ${transportSessionId}`);
        // 404 or 410 Gone might be appropriate if the session *was* active but disconnected
        res.status(404).send("Invalid or expired sessionId"); 
        return;
    }

    const transport = transportEntry.transport;
    try {
        console.log(`[MCP POST] Received POST for transport session ${transportSessionId}, linked to MCP Token: ${transportEntry.mcpAccessToken.substring(0,8)}...`);
        // Log headers or body if needed for debugging (careful with sensitive data)
        // console.log("[MCP POST] Headers:", req.headers);
        // console.log("[MCP POST] Body (partial):", JSON.stringify(req.body).substring(0, 200)); 
        
        // Pass the request and response to the transport's handler
        // The SDK's handlePostMessage will parse the MCP message, find the handler, execute it, and send the response.
        transport.handlePostMessage(req, res);
        console.log(`[MCP POST] Handled POST for session ${transportSessionId}`);

    } catch (error) {
        // Catch errors specifically from handlePostMessage (e.g., invalid message format, handler execution error)
        console.error(`[MCP POST] Error in handlePostMessage for session ${transportSessionId}:`, error);
        if (!res.headersSent) {
            // Send a generic 500 error if the handler failed internally
            res.status(500).send("Error processing message");
        } else if (!res.writableEnded) {
             console.log("[MCP POST] Ending response stream after error during handling.");
            res.end(); // Ensure the response is closed if an error occurred after headers were sent
        }
    }
});


// --- Error Handling Middleware (Last Resort) ---
// Catches errors not handled by specific route handlers
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("[HTTP Unhandled Error] An unexpected error occurred:", err);
    
    // If headers already sent, delegate to Express default handler (closes connection)
    if (res.headersSent) {
        console.error("[HTTP Unhandled Error] Headers already sent, cannot send error response.");
        return next(err);
    }

    // Send a generic 500 response
    res.status(500).json({ 
        error: "Internal Server Error", 
        // Avoid sending detailed error messages in production unless configured
        message: err.message
    });
});


// --- Start Server ---
    let server: http.Server | https.Server; // Union type
    let serverOptions: https.ServerOptions = {}; // Use https.ServerOptions type

    // Use config for HTTPS settings
    if (config.server.https.enabled) {
        console.log("[HTTP] HTTPS is enabled. Loading certificates...");
        // Paths validated by loadConfig earlier
        try {
            // Use await with fs.readFile
            const cert = await fs.readFile(config.server.https.certPath!);
            const key = await fs.readFile(config.server.https.keyPath!);
            serverOptions = { key: key, cert: cert };
            console.log(`[HTTP] Certificates loaded successfully from ${config.server.https.certPath} and ${config.server.https.keyPath}`);
            server = https.createServer(serverOptions, app); // Create HTTPS server
        } catch (error) {
            console.error(`[HTTP] FATAL ERROR: Failed to read certificate files:`, error);
            process.exit(1); // Exit if certs can't be loaded
        }
    } else {
        console.log("[HTTP] HTTPS is disabled. Creating HTTP server.");
        server = http.createServer(app); // Create HTTP server
    }

    // Use config for port and derive protocol for logging
    const protocol = config.server.https.enabled ? 'https' : 'http';
    server.listen(config.server.port, () => {
        // Log the actual base URL from config
        console.log(`[HTTP] Server listening on ${config.server.baseUrl}`);
        console.log(`[MCP] OAuth Issuer: ${config.server.baseUrl}`);
        console.log(`[MCP] Authorization Endpoint: ${config.server.baseUrl}/authorize`);
        console.log(`[MCP] Token Endpoint: ${config.server.baseUrl}/token`);
        console.log(`[MCP] SSE Endpoint: ${config.server.baseUrl}/mcp-sse`);
    });

    // --- Graceful Shutdown ---
    const shutdown = async (signal: string) => {
        console.log(`\nReceived ${signal}. Shutting down gracefully...`);
            
        // 1. Stop accepting new connections
        server.close(async (err) => {
            if (err) {
                console.error(`[Shutdown] Error closing ${protocol} server:`, err);
            } else {
                console.log(`[Shutdown] ${protocol} server closed. No longer accepting connections.`);
            }
             // Proceed with other cleanup even if server close had error

             // 2. Close MCP Server (closes active SSE transports via SDK)
             try {
                await mcpServer.close();
                console.log("[Shutdown] MCP server and active SSE transports closed.");
             } catch (e) { 
                console.error("[Shutdown] Error closing MCP server:", e); 
             }

             // 3. Close remaining resources (DBs, clear caches)
            console.log(`[Shutdown] Closing ${activeSessions.size} active session(s) and their database connections...`);
             for (const [token, session] of activeSessions.entries()) {
                 if (session.db) {
                     try {
                         // console.log(`[Shutdown] Closing DB for session token ${token.substring(0, 8)}...`);
                         session.db.close();
                     } catch (dbErr) { 
                         console.error(`[Shutdown] Error closing DB for session token ${token.substring(0, 8)}...:`, dbErr); 
                     }
                 }
             }
             activeSessions.clear();
             console.log("[Shutdown] Active sessions cleared.");
             
             // Clear other state maps
             sessionsByMcpAuthCode.clear();
             authFlowStates.clear();
             pickerSessions.clear();
             registeredMcpClients.clear(); // Clear registered clients if dynamic
             activeSseTransports.clear(); // Should be cleared by mcpServer.close, but clear again to be sure
             console.log("[Shutdown] Temporary state maps cleared.");

             console.log("[Shutdown] Shutdown complete.");
             process.exit(0); // Exit cleanly
        });

        // If server close takes too long, force exit
         setTimeout(() => {
             console.error('[Shutdown] Could not close connections in time, forcing shutdown.');
             process.exit(1);
         }, 10000); // 10 second timeout

    };

    // Listen for termination signals
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    } catch (error) {
        console.error("[Startup] FATAL ERROR during application startup:", error);
    process.exit(1);
    }
}

// Start the application
main();

// New GET route to redirect to the static retriever page
app.get('/ehr-callback', (req, res) => {
    console.log("[GET /ehr-callback] Redirecting to static retriever page, preserving query parameters.");
    const originalUrl = req.originalUrl; // e.g., '/ehr-callback?foo=bar'
    const queryIndex = originalUrl.indexOf('?');
    const queryString = (queryIndex !== -1) ? originalUrl.substring(queryIndex) : ''; // e.g., '?foo=bar' or ''
    const targetUrl = '/static/ehretriever.html' + queryString;
    res.redirect(targetUrl);
});

// New callback endpoint for the client-side retriever
// Needs express.json() with a large limit for the EHR data
app.post("/ehr-retriever-callback", express.json({ limit: '50mb' }), async (req: Request, res: Response, next: NextFunction) => {
    console.log("[MCP CB] Received POST from client-side retriever.");

    // 1. Get Auth Flow ID from cookie
    const cookies = cookie.parse(req.headers.cookie || '');
    const authFlowId = cookies[AUTH_FLOW_COOKIE_NAME];

    // Clear the cookie immediately regardless of success/failure
    const cookieOptions: cookie.SerializeOptions = {
        httpOnly: true, 
        path: '/', // Ensure path matches where it was set
        maxAge: -1, // Expire the cookie
        secure: config.server.https.enabled, 
        sameSite: 'lax' // Match the setting used previously
    };
    res.setHeader('Set-Cookie', cookie.serialize(AUTH_FLOW_COOKIE_NAME, '', cookieOptions));
    console.log("[MCP CB] Cleared auth flow cookie.");

    if (!authFlowId) {
        console.error("[MCP CB] Error: Missing auth flow cookie.");
        // Respond with JSON error
        res.status(400).json({ success: false, error: "missing_session", error_description: "Auth flow cookie missing or expired." });
        return;
    }

    // 2. Retrieve original MCP request details using the flow ID
    const authFlowData = authFlowStates.get(authFlowId);
    authFlowStates.delete(authFlowId); // Consume the state immediately

    if (!authFlowData) {
        console.error(`[MCP CB] Error: Invalid or expired auth flow ID: ${authFlowId}`);
        res.status(400).json({ success: false, error: "invalid_session", error_description: "Invalid or expired auth flow session." });
        return;
    }
    // Check expiry *after* retrieving, before processing
    if (authFlowData.expiresAt < Date.now()) {
        console.error(`[MCP CB] Error: Expired auth flow ID: ${authFlowId}`);
        res.status(400).json({ success: false, error: "expired_session", error_description: "Auth flow session expired." });
        return;
    }

    // Destructure the retrieved data
    const { mcpClientId, mcpRedirectUri, mcpCodeChallenge, mcpOriginalState } = authFlowData;
    console.log(`[MCP CB] Retrieved state for MCP Client: ${mcpClientId}. Redirect URI: ${mcpRedirectUri}`);

    try {
        // 3. Parse incoming ClientFullEHR data from request body
        // Use Zod or basic checks for validation
        const clientFullEhr: ClientFullEHR = req.body; // Assume express.json worked
        // Basic validation: check for core structures
        if (!clientFullEhr || typeof clientFullEhr !== 'object' || !clientFullEhr.fhir || typeof clientFullEhr.fhir !== 'object' || !Array.isArray(clientFullEhr.attachments)) {
             console.error("[MCP CB] Error: Invalid or missing ClientFullEHR data structure in request body.");
             // Use InvalidRequestError for consistency if desired, or standard Error
             throw new Error("Missing or invalid EHR data structure in request body."); // Changed from InvalidRequestError for simplicity here
        }
        console.log(`[MCP CB] Received ClientFullEHR: ${Object.keys(clientFullEhr.fhir).length} resource types, ${clientFullEhr.attachments.length} attachments.`);

        // 4. Get MCP Client Info (needed for UserSession creation)
        let mcpClientInfo: OAuthClientInformationFull | undefined;
        if (config.security.disableClientChecks) {
            console.warn(`[MCP CB] Client checks disabled. Creating placeholder client info for: ${mcpClientId}`);
            // Reconstruct minimal info needed for session and redirect logic
            mcpClientInfo = {
                client_id: mcpClientId,
                client_name: `Placeholder Client (${mcpClientId})`,
                redirect_uris: [mcpRedirectUri], // Essential for final redirect logic
                token_endpoint_auth_method: 'none', // Assume public
                // Add other required fields if UserSession type expects them
                scope: '', grant_types: ['authorization_code'], response_types: ['code'],
            };
        } else {
            mcpClientInfo = await oauthProvider.clientsStore.getClient(mcpClientId);
            if (!mcpClientInfo) {
                console.error(`[MCP CB] Failed to retrieve MCP client info for ID: ${mcpClientId}.`);
                // Throw an error that indicates a configuration or registration issue
                throw new Error("MCP Client information not found. Client may need to be registered."); 
            }
             // Validate the stored redirect URI against the registered ones for this client
             if (!mcpClientInfo.redirect_uris.includes(mcpRedirectUri)) {
                 console.error(`[MCP CB] Stored redirect URI "${mcpRedirectUri}" is not valid for client ${mcpClientId}. Registered: [${mcpClientInfo.redirect_uris.join(', ')}]`);
                 throw new InvalidRequestError("Redirect URI mismatch between auth initiation and callback."); // Use OAuth error type
             }
             console.log(`[MCP CB] Verified MCP client info for ${mcpClientId}.`);
        }

        // 5. Create User Session (includes DB init and population)
        console.log(`[MCP CB] Creating user session from EHR data for client ${mcpClientId}...`);
        const session = await createSessionFromEhrData(
            mcpClientInfo, // Pass the validated/constructed client info
            mcpCodeChallenge, 
            clientFullEhr
        );
         console.log(`[MCP CB] User session created successfully.`);

        // 6. Generate MCP Authorization Code & Store Session temporarily by code
        const mcpAuthCode = `mcp-code-${uuidv4()}`;
        session.mcpAuthCode = mcpAuthCode; // Add the auth code *before* storing
        sessionsByMcpAuthCode.set(mcpAuthCode, session);
        // TODO: Add expiry to sessionsByMcpAuthCode entries (e.g., 1 minute cleanup timer)
        console.log(`[MCP CB] Stored UserSession by temporary MCP Auth Code: ${mcpAuthCode.substring(0,12)}...`);

        // 7. Respond to the client-side retriever with success and the final redirect URL
        const clientRedirectUrl = new URL(mcpRedirectUri); // Use the validated redirect URI
        clientRedirectUrl.searchParams.set("code", mcpAuthCode); // Add the generated MCP code
        if (mcpOriginalState) {
            clientRedirectUrl.searchParams.set("state", mcpOriginalState); // Pass back original state
        }
        const finalRedirect = clientRedirectUrl.toString();
        console.log(`[MCP CB] Sending success response to retriever. Final redirect target: ${finalRedirect}`);
        
        // Send JSON response { success: true, redirectTo: ... }
        res.json({ success: true, redirectTo: finalRedirect });
        // DO NOT perform the redirect here; the client-side JS will do it.

    } catch (error: any) {
        // Catch errors from parsing, client lookup, session creation, etc.
        console.error("[MCP CB] Error processing EHR callback:", error);
        
        // Determine error code and description
        const errorCode = (error instanceof OAuthError) ? error.errorCode : "server_error";
        const errorDesc = (error instanceof Error) ? error.message : "Internal server error during callback processing.";
        
        // Respond with JSON error - ensure headers aren't already sent
        if (!res.headersSent) {
            // Use 400 for client errors (bad data, bad redirect), 500 for server issues (DB fail, etc.)
            const statusCode = (error instanceof InvalidRequestError || error.message.includes("invalid EHR data")) ? 400 : 500;
            res.status(statusCode)
               .json({ success: false, error: errorCode, error_description: errorDesc });
        } else {
             console.error("[MCP CB] Headers already sent, cannot send JSON error response.");
             // If response is still writable, try ending it
             if (!res.writableEnded) res.end();
        }
    }
});
#!/usr/bin/env bun

// --- Core MCP/Bun Imports ---
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
    CallToolRequestSchema, CallToolResultSchema,
    ErrorCode, ListToolsRequestSchema, ListToolsResult, McpError,
    Tool, CreateMessageRequestSchema, ServerCapabilities, Implementation, InitializeResult,
    ListPromptsResult, ListResourcesResult, ListResourceTemplatesResult, ReadResourceResult,
    Result, ResultSchema, GetPromptResultSchema, CompatibilityCallToolResultSchema
} from "@modelcontextprotocol/sdk/types.js";
import { OAuthServerProvider, AuthorizationParams } from "@modelcontextprotocol/sdk/server/auth/provider.js";
import { OAuthRegisteredClientsStore } from "@modelcontextprotocol/sdk/server/auth/clients.js";
import { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { InvalidGrantError, InvalidTokenError, ServerError, UnsupportedGrantTypeError, OAuthError, InvalidClientError, InvalidRequestError, InsufficientScopeError } from "@modelcontextprotocol/sdk/server/auth/errors.js";
import { OAuthClientInformationFull, OAuthClientMetadata, OAuthTokenRevocationRequest, OAuthTokens } from "@modelcontextprotocol/sdk/shared/auth.js";
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";

import { Database } from 'bun:sqlite';
import { convert as htmlToText } from 'html-to-text';
import { XMLParser } from 'fast-xml-parser';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { v4 as uuidv4 } from 'uuid';
import pkceChallenge from 'pkce-challenge';
import { verifyChallenge } from 'pkce-challenge'; // Import verifyChallenge
import dotenv from 'dotenv'; // Import dotenv
import express, { Request, Response, NextFunction, RequestHandler } from 'express'; // Import express types
import cors from 'cors'; // Import cors
import http from 'http'; // Import http for server creation

// --- Add Type Declaration for req.auth ---
declare module "express-serve-static-core" {
  interface Request {
    /**
     * Information about the validated access token, if the `requireBearerAuth` middleware was used.
     */
    auth?: AuthInfo;
  }
}

// --- Load Environment Variables ---
dotenv.config(); // Load .env file

// --- Default Configuration ---
const DEFAULT_SMART_LAUNCHER_FHIR_BASE = "https://launch.smarthealthit.org/v/r4/sim/WzMsIjgzNjRmZjc0LWQ5MDQtNDQyYi1iOTg0LWY5ZDY0MDUzMTYzOSIsIiIsIkFVVE8iLDEsMSwwLCIiLCIiLCIiLCIiLCIiLDAsMSwiIl0/fhir";
const DEFAULT_SMART_LAUNCHER_CLIENT_ID = "mcp_app";

// --- Configuration ---
let EHR_AUTH_URL = Bun.env.EHR_AUTH_URL;
let EHR_TOKEN_URL = Bun.env.EHR_TOKEN_URL;
let EHR_FHIR_URL = Bun.env.EHR_FHIR_URL;
let MCP_SERVER_EHR_CLIENT_ID = Bun.env.MCP_SERVER_EHR_CLIENT_ID;

const MCP_SERVER_BASE_URL = Bun.env.MCP_SERVER_BASE_URL || "http://localhost:3001";
const MCP_SERVER_PORT = parseInt(Bun.env.MCP_SERVER_PORT || "3001");
const MCP_SERVER_EHR_CALLBACK_PATH = "/ehr-callback";
const REQUIRED_EHR_SCOPES = Bun.env.EHR_SCOPES || [
    "openid", "fhirUser", "launch/patient",
    "patient/Patient.read", "patient/Observation.read", "patient/Condition.read",
    "patient/DocumentReference.read", "patient/MedicationRequest.read",
    "patient/MedicationStatement.read", "patient/AllergyIntolerance.read",
    "patient/Procedure.read", "patient/Immunization.read"
].join(" ");

// --- Disable Client Checks Flag ---
const DISABLE_CLIENT_CHECKS = Bun.env.DISABLE_CLIENT_CHECKS?.toLowerCase() === 'true';
if (DISABLE_CLIENT_CHECKS) {
    console.warn("[CONFIG] WARNING: MCP client checks (ID lookup, redirect URI validation) are DISABLED via environment variable.");
}

// --- SMART Configuration Discovery ---
async function fetchSmartConfiguration(fhirBaseUrl: string): Promise<{ authorization_endpoint?: string; token_endpoint?: string }> {
    const wellKnownUrl = `${fhirBaseUrl.replace(/\/$/, "")}/.well-known/smart-configuration`;
    console.log(`[CONFIG] Fetching SMART configuration from: ${wellKnownUrl}`);
    try {
        const response = await fetch(wellKnownUrl, { headers: { "Accept": "application/json" } });
        if (!response.ok) {
            console.warn(`[CONFIG] Failed to fetch SMART configuration (${response.status}): ${await response.text()}`);
            return {};
        }
        const config = await response.json();
        console.log(`[CONFIG] Discovered endpoints: Auth - ${config.authorization_endpoint}, Token - ${config.token_endpoint}`);
        return {
            authorization_endpoint: config.authorization_endpoint,
            token_endpoint: config.token_endpoint
        };
    } catch (error) {
        console.error(`[CONFIG] Error fetching SMART configuration: ${error}`);
        return {};
    }
}

// --- Apply Defaults and Discover ---
async function initializeConfiguration() {
    // Apply default FHIR URL if none provided
    if (!EHR_FHIR_URL) {
        console.log(`[CONFIG] No EHR_FHIR_URL provided, using default SMART Launcher: ${DEFAULT_SMART_LAUNCHER_FHIR_BASE}`);
        EHR_FHIR_URL = DEFAULT_SMART_LAUNCHER_FHIR_BASE;
    }

    // Attempt discovery if Auth or Token URL is missing
    if (EHR_FHIR_URL && (!EHR_AUTH_URL || !EHR_TOKEN_URL)) {
        console.log("[CONFIG] Auth or Token URL missing, attempting SMART configuration discovery...");
        const discoveredEndpoints = await fetchSmartConfiguration(EHR_FHIR_URL);
        if (!EHR_AUTH_URL && discoveredEndpoints.authorization_endpoint) {
            EHR_AUTH_URL = discoveredEndpoints.authorization_endpoint;
        }
        if (!EHR_TOKEN_URL && discoveredEndpoints.token_endpoint) {
            EHR_TOKEN_URL = discoveredEndpoints.token_endpoint;
        }
    }

    // Apply default Client ID if none provided and using default FHIR URL
    if (!MCP_SERVER_EHR_CLIENT_ID && EHR_FHIR_URL === DEFAULT_SMART_LAUNCHER_FHIR_BASE) {
        console.log(`[CONFIG] No MCP_SERVER_EHR_CLIENT_ID provided, using default for SMART Launcher: ${DEFAULT_SMART_LAUNCHER_CLIENT_ID}`);
        MCP_SERVER_EHR_CLIENT_ID = DEFAULT_SMART_LAUNCHER_CLIENT_ID;
    }

    // Final Runtime Check
    if (!EHR_AUTH_URL || !EHR_TOKEN_URL || !EHR_FHIR_URL || !MCP_SERVER_EHR_CLIENT_ID) {
        console.error("FATAL ERROR: Missing required EHR configuration after checking environment, discovery, and defaults.");
        console.error("Required: EHR_AUTH_URL, EHR_TOKEN_URL, EHR_FHIR_URL, MCP_SERVER_EHR_CLIENT_ID");
        console.error("Current Values:");
        console.error(`  EHR_AUTH_URL: ${EHR_AUTH_URL}`);
        console.error(`  EHR_TOKEN_URL: ${EHR_TOKEN_URL}`);
        console.error(`  EHR_FHIR_URL: ${EHR_FHIR_URL}`);
        console.error(`  MCP_SERVER_EHR_CLIENT_ID: ${MCP_SERVER_EHR_CLIENT_ID}`);
        process.exit(1);
    }

    console.log("[CONFIG] Configuration loaded successfully.");
}

// Initialize configuration asynchronously before starting the server
await initializeConfiguration();

// --- Runtime Checks ---
const SERVER_INFO: Implementation = { name: "EHR-Search-MCP-Server-SMART-Public-Bun", version: "0.5.0" };
const SERVER_CAPABILITIES: ServerCapabilities = { tools: {}, sampling: {} }; // Added sampling
const SERVER_OPTIONS = {
    capabilities: SERVER_CAPABILITIES,
    instructions: "Server using SMART on FHIR (Public Client) via Bun to search and query patient EHR data (USCDI)."
};

// --- In-Memory Stores (Demo purposes only!) ---
interface AuthPendingState {
    ehrState: string; ehrCodeVerifier: string; mcpClientId: string;
    mcpRedirectUri: string; mcpCodeChallenge: string; mcpOriginalState?: string;
}
const pendingEhrAuth = new Map<string, AuthPendingState>();

interface UserSession {
    sessionId: string; // Transport Session ID (Added later by transport)
    mcpAccessToken: string; // The actual bearer token for this session
    ehrAccessToken: string; ehrTokenExpiry?: number;
    ehrGrantedScopes?: string; ehrPatientId?: string; record: Record<string, any[]>;
    db: Database; mcpClientInfo: OAuthClientInformationFull;
    mcpAuthCode?: string; mcpAuthCodeChallenge?: string; mcpAuthCodeRedirectUri?: string;
}
// Key is now the mcpAccessToken
const activeSessions = new Map<string, UserSession>(); // Keyed by MCP Access Token
const sessionsByMcpAuthCode = new Map<string, UserSession>(); // Temp map for code exchange
const registeredMcpClients = new Map<string, OAuthClientInformationFull>();
// Key is transport sessionId, value contains transport and authenticated mcpAccessToken/AuthInfo
const activeSseTransports = new Map<string, { transport: SSEServerTransport; mcpAccessToken: string; authInfo: AuthInfo }>();

// --- FHIR Data Fetching ---
async function fetchFhirResource(url: string, accessToken: string): Promise<any> {
    console.log(`[FHIR Fetch] GET ${url}`);
    const headers = new Headers({ "Authorization": `Bearer ${accessToken}`, "Accept": "application/fhir+json" });
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        const response = await fetch(url, { headers: headers, signal: controller.signal });
        clearTimeout(timeoutId);
        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[FHIR Fetch] Error ${response.status} from ${url}: ${errorBody}`);
            throw new Error(`FHIR request failed with status ${response.status} for ${url}`);
        }
        return await response.json();
    } catch (error) {
        clearTimeout(timeoutId);
        if ((error as any).name === 'AbortError') {
            console.error(`[FHIR Fetch] Timeout fetching ${url}`);
            throw new Error(`Timeout fetching FHIR resource: ${url}`);
        }
        throw error;
    }
}

async function fetchAllPages(initialUrl: string, accessToken: string): Promise<any[]> {
    let resources: any[] = [];
    let nextUrl: string | undefined = initialUrl;
    let pageCount = 0;
    const maxPages = 20;

    console.log(`[FHIR Fetch] Starting pagination for ${initialUrl}`);
    while (nextUrl && pageCount < maxPages) {
        pageCount++;
        console.log(`[FHIR Fetch] Fetching page ${pageCount}: ${nextUrl}`);
        const bundle = await fetchFhirResource(nextUrl, accessToken);
        if (bundle.entry) {
            const pageResources = bundle.entry.map((e: any) => e.resource).filter((r: any) => r);
            resources = resources.concat(pageResources);
            console.log(`[FHIR Fetch] Added ${pageResources.length} resources from page ${pageCount}. Total: ${resources.length}`);
        }
        const nextLink = bundle.link?.find((link: any) => link.relation === 'next');
        nextUrl = nextLink?.url;
    }
    if (pageCount >= maxPages && nextUrl) {
        console.warn(`[FHIR Fetch] Reached maximum pagination limit (${maxPages}) for ${initialUrl}. Data may be incomplete.`);
    }
    console.log(`[FHIR Fetch] Pagination complete for ${initialUrl}. Total resources fetched: ${resources.length}`);
    return resources;
}

async function fetchEhrData(ehrAccessToken: string, fhirBaseUrl: string, patientId: string): Promise<Record<string, any[]>> {
    console.log(`[DATA] Fetching specific FHIR resources from ${fhirBaseUrl} for Patient: ${patientId}`);
    if (!patientId) throw new Error("Patient ID is required to fetch data.");

    const record: Record<string, any[]> = {};
    let totalFetched = 0;
    const patientReadUrl = `${fhirBaseUrl}/Patient/${patientId}`;
    const searchQueries: { resourceType: string; params?: Record<string, string> }[] = [
        { resourceType: 'Observation', params: { 'category': 'laboratory', patient: patientId, '_count': '100' } },
        { resourceType: 'Observation', params: { 'category': 'vital-signs', patient: patientId, '_count': '100' } },
        { resourceType: 'Observation', params: { 'category': 'social-history', patient: patientId, '_count': '100' } },
        { resourceType: 'Condition', params: { patient: patientId, '_count': '100' } },
        { resourceType: 'MedicationRequest', params: { patient: patientId, '_count': '100' } },
        { resourceType: 'MedicationStatement', params: { patient: patientId, '_count': '100' } },
        { resourceType: 'AllergyIntolerance', params: { patient: patientId, '_count': '100' } },
        { resourceType: 'Procedure', params: { patient: patientId, '_count': '100' } },
        { resourceType: 'Immunization', params: { patient: patientId, '_count': '100' } },
        { resourceType: 'DocumentReference', params: { patient: patientId, '_count': '100' } },
    ];

    try {
        const patientResource = await fetchFhirResource(patientReadUrl, ehrAccessToken);
        record['Patient'] = [patientResource];
        totalFetched++;
    } catch (error) {
        console.error(`[DATA] Failed to fetch Patient resource: ${error}`);
        throw new Error(`Could not fetch core Patient resource: ${error instanceof Error ? error.message : String(error)}`);
    }

    await Promise.allSettled(searchQueries.map(async (query) => {
        try {
            const url = new URL(`${fhirBaseUrl}/${query.resourceType}`);
            if (query.params) {
                Object.entries(query.params).forEach(([key, value]) => url.searchParams.set(key, value));
            }
            const resources = await fetchAllPages(url.toString(), ehrAccessToken);
            record[query.resourceType] = resources;
            totalFetched += resources.length;
        } catch (error) {
            console.warn(`[DATA] Failed to fetch ${query.resourceType} resources (continuing): ${error}`);
            record[query.resourceType] = [];
        }
    }));

    console.log(`[DATA] Completed fetching. Total resources retrieved: ${totalFetched} across ${Object.keys(record).length} types.`);
    return record;
}

// --- Attachment Processing ---
function processAttachments(record: Record<string, any[]>): void {
    console.log("[ATTACHMENT] Starting attachment processing...");
    const xmlParser = new XMLParser({ ignoreAttributes: true, textNodeName: "_text", parseTagValue: false, trimValues: true, stopNodes: ["*.html"], });
    const resourcesToProcess = record["DocumentReference"] || [];
    let processedCount = 0; let errorCount = 0;

    for (const resource of resourcesToProcess) {
        if (!resource.content || !Array.isArray(resource.content)) continue;
        let extractedTexts: string[] = [];
        for (const contentItem of resource.content) {
            if (!contentItem.attachment) continue;
            const attachment = contentItem.attachment;
            let textContent: string | null = null; let rawData: Buffer | null = null;
            const contentType = attachment.contentType?.toLowerCase() || '';
            try {
                if (attachment.data) { rawData = Buffer.from(attachment.data, 'base64'); }
                else if (attachment.url) { console.warn(`[ATTACHMENT] URL fetching skip: ${attachment.url}`); textContent = `[Attachment URL not fetched: ${attachment.url}]`; }
                if (rawData && textContent === null) {
                    if (contentType.startsWith('text/plain')) { textContent = rawData.toString('utf8'); }
                    else if (contentType.startsWith('text/html')) { try { textContent = htmlToText(rawData.toString('utf8'), { wordwrap: false }); } catch (htmlErr) { console.error(`[ATTACHMENT] HTML err ${resource.id}:`, htmlErr); textContent = `[Error parsing HTML]`; errorCount++; } }
                    else if (contentType.includes('xml')) { try { const pXml = xmlParser.parse(rawData.toString('utf8')); const eTxt = (n: any): string => { if (typeof n === 'string') return n + " "; if (typeof n !== 'object' || n === null) return ""; return Object.values(n).map(eTxt).join(""); }; textContent = eTxt(pXml).replace(/\s+/g, ' ').trim(); } catch (xmlErr) { textContent = `[Error parsing XML]`; console.error(xmlErr); errorCount++; } }
                    else if (contentType === 'application/rtf') { textContent = `[RTF Placeholder]`; console.warn(`RTF skipped ${resource.id}`); }
                    else { textContent = `[Unsupported type: ${contentType}]`; console.warn(`Unsupported type: ${contentType} in ${resource.id}`); }
                }
            } catch (decodeError) { textContent = `[Error processing data]`; console.error(decodeError); errorCount++; }
            if (textContent) { extractedTexts.push(textContent); processedCount++; }
        }
        if (extractedTexts.length > 0) resource._extractedAttachmentText = extractedTexts.join("\n\n---\n\n");
    }
    console.log(`[ATTACHMENT] Complete. Processed: ${processedCount}, Errors: ${errorCount}`);
}

// --- SQLite Population ---
async function populateSqlite(record: Record<string, any[]>, db: Database): Promise<void> {
    console.log("[SQLITE] Populating in-memory SQLite DB...");
    const resourceTypes = Object.keys(record);
    db.exec('BEGIN TRANSACTION;');
    try {
        for (const resourceType of resourceTypes) {
            const safeTableName = `fhir_${resourceType.replace(/[^a-zA-Z0-9_]/g, '_')}`;
            db.exec(`DROP TABLE IF EXISTS "${safeTableName}";`);
            db.exec(`CREATE TABLE "${safeTableName}" (id TEXT PRIMARY KEY, resource_json TEXT NOT NULL);`);
            const stmt = db.prepare(`INSERT INTO "${safeTableName}" (id, resource_json) VALUES (?, ?)`);
            let count = 0;
            for (const resource of record[resourceType]) {
                if (resource.id) {
                    try { stmt.run(resource.id, JSON.stringify(resource)); count++; }
                    catch (insertErr: any) { if (insertErr?.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') { console.warn(`[SQLITE] Duplicate ID '${resource.id}' for ${resourceType}. Skipping.`); } else { throw insertErr; } }
                } else { console.warn(`[SQLITE] Resource ${resourceType} missing ID, skipping.`); }
            }
            stmt.finalize();
            console.log(`[SQLITE] Inserted ${count} resources into ${safeTableName}.`);
        }
        db.exec('COMMIT;');
        console.log("[SQLITE] DB population complete.");
    } catch (err) { console.error("[SQLITE] Error during population:", err); db.exec('ROLLBACK;'); throw err; }
}

// --- Tool Schemas & Logic ---

// Input Schemas
const GrepRecordInputSchema = z.object({
    query: z.string().min(1).describe("The text string to search for."),
    resource_types: z.array(z.string()).optional().describe('List of FHIR resource types (e.g., ["Observation", "DocumentReference"]) to limit the search to. Defaults to searching all loaded resource types.'),
    max_hits: z.number().int().positive().optional().default(20).describe("Maximum number of distinct matches to return."),
    context_lines: z.number().int().nonnegative().optional().default(0).describe("Number of lines before/after the match to include (best effort).")
});
const QueryRecordInputSchema = z.object({
    sql: z.string().min(1).describe("The read-only SQL SELECT statement to execute against the in-memory FHIR data.")
});
const AskQuestionInputSchema = z.object({
    question: z.string().min(1).describe("The natural language question to ask about the patient's record.")
});
const ResyncRecordInputSchema = z.object({}).describe("No arguments needed."); // Explicitly empty

// Output Schemas
const GrepMatchSchema = z.object({
    resourceType: z.string().describe("The FHIR resource type where the match was found."),
    resourceId: z.string().describe("The ID of the FHIR resource containing the match."),
    path: z.string().describe("A JSON path indicating the location of the match within the resource (e.g., 'Observation.code.text')."),
    line_number: z.number().optional().describe("The line number within the matched field, if applicable (e.g., for notes)."),
    match_snippet: z.string().describe("The specific line or field value containing the search query."),
    context_before: z.array(z.string()).optional().describe("Lines immediately preceding the match snippet."),
    context_after: z.array(z.string()).optional().describe("Lines immediately following the match snippet.")
});
const GrepRecordOutputSchema = z.object({
    matches: z.array(GrepMatchSchema).describe("An array of found matches."),
    total_hits_found: z.number().int().describe("The total number of matches identified across the searched resources."),
    hits_returned: z.number().int().describe("The number of matches included in the `matches` array (limited by `max_hits`)."),
    warning: z.string().optional().describe("A warning message, e.g., if the maximum hit limit was reached.")
}).describe("Results of the text search across the patient's record.");

const QueryRecordOutputSchema = z.array(z.record(z.unknown())).describe("An array of rows returned by the SQL query. Each row is an object where keys are column names.");
const AskQuestionOutputSchema = z.object({ answer: z.string() }).describe("The natural language answer generated by the LLM based on the record context."); // Simple wrapper for now
const ResyncRecordOutputSchema = z.object({ message: z.string() }).describe("A confirmation message indicating the outcome of the resync attempt.");


function grepRecordLogic(record: Record<string, any[]>, query: string, resourceTypes?: string[], maxHits: number = 20, contextLines: number = 0): z.infer<typeof GrepRecordOutputSchema> {
    const results: z.infer<typeof GrepMatchSchema>[] = [];
    let totalHits = 0;
    const queryLower = query.toLowerCase();
    const typesToSearch = resourceTypes && resourceTypes.length > 0 ? resourceTypes : Object.keys(record);

    const searchNode = (node: any, path: string, resourceId: string, resourceType: string): boolean => {
        if (results.length >= maxHits) return true;
        if (node === null || node === undefined) return false;
        let stopRecursion = false;

        if (typeof node === 'string') {
            const lines = node.split('\n');
            lines.forEach((line, index) => {
                if (stopRecursion) return;
                if (line.toLowerCase().includes(queryLower)) {
                    totalHits++;
                    if (results.length < maxHits) {
                        const start = Math.max(0, index - contextLines);
                        const end = Math.min(lines.length, index + 1 + contextLines);
                        results.push({
                            resourceType: resourceType, resourceId: resourceId, path: path,
                            line_number: index + 1, match_snippet: line.trim(),
                            context_before: lines.slice(start, index).map(l => l.trim()),
                            context_after: lines.slice(index + 1, end).map(l => l.trim()),
                        });
                        if (results.length >= maxHits) stopRecursion = true;
                    } else { stopRecursion = true; }
                }
            });
        } else if (Array.isArray(node)) {
            for (let index = 0; index < node.length; index++) { if (stopRecursion) break; stopRecursion = searchNode(node[index], `${path}[${index}]`, resourceId, resourceType); }
        } else if (typeof node === 'object') {
            for (const key in node) {
                 if (stopRecursion) break;
                 if (key.toLowerCase().includes(queryLower)) {
                     totalHits++;
                     if (results.length < maxHits) { results.push({ resourceType, resourceId, path: `${path}.${key}`, match_snippet: `Matched key: ${key}`}); if (results.length >= maxHits) { stopRecursion = true; break; } } else { stopRecursion = true; break; }
                 }
                stopRecursion = searchNode(node[key], `${path}.${key}`, resourceId, resourceType);
            }
        }
        return stopRecursion;
    };

    for (const resourceType of typesToSearch) { if (record[resourceType]) { for (const resource of record[resourceType]) { if (results.length >= maxHits) break; searchNode(resource, resourceType, resource.id || 'unknown-id', resourceType); } } if (results.length >= maxHits) break; }
    return { matches: results, total_hits_found: totalHits, hits_returned: results.length, warning: totalHits > maxHits ? `Hit limit (${maxHits}) reached. ${totalHits} total matches found.` : undefined, };
}

async function queryRecordLogic(db: Database, sql: string): Promise<z.infer<typeof QueryRecordOutputSchema>> {
    const sqlLower = sql.trim().toLowerCase();
    if (!sqlLower.startsWith('select')) throw new Error("Only SELECT queries are allowed.");
    const writeKeywords = ['insert', 'update', 'delete', 'drop', 'create', 'alter', 'attach', 'detach', 'replace', 'pragma'];
    if (writeKeywords.some(keyword => sqlLower.includes(keyword))) throw new Error("Potentially harmful SQL operation detected.");
    try {
        const results = await db.query(sql).all() as Record<string, unknown>[]; // Use Bun's query().all() and assert type
        if (results.length > 500) { console.warn(`[SQLITE] Query returned ${results.length} rows. Truncating to 500.`); return results.slice(0, 500); }
        return results;
    } catch (err) { console.error("[SQLITE] Execution Error:", err); throw new Error(`SQL execution failed: ${(err as Error).message}`); }
}

// --- OAuth Provider Implementation ---
class MyOAuthClientStore implements OAuthRegisteredClientsStore {
    async getClient(clientId: string): Promise<OAuthClientInformationFull | undefined> { console.log(`[OAuthStore] Getting MCP client: ${clientId}`); return registeredMcpClients.get(clientId); }
    async registerClient(clientInfo: OAuthClientInformationFull): Promise<OAuthClientInformationFull> { console.log(`[OAuthStore] Registering MCP Client: ${clientInfo.client_name || clientInfo.client_id}`); if (clientInfo.token_endpoint_auth_method === 'none') { clientInfo.client_secret = undefined; clientInfo.client_secret_expires_at = undefined; } registeredMcpClients.set(clientInfo.client_id, clientInfo); return clientInfo; }
}

class MyOAuthServerProvider implements OAuthServerProvider {
    readonly clientsStore = new MyOAuthClientStore();

    async authorize(mcpClientInfo: OAuthClientInformationFull, params: AuthorizationParams, _res: any): Promise<void> {
        console.log(`[AUTH] MCP Client ${mcpClientInfo.client_id} starting authorization. Redirect URI: ${params.redirectUri}, State: ${params.state}`);
        const ehrState = uuidv4();
        const { code_verifier: ehrCodeVerifier, code_challenge: ehrCodeChallenge } = await pkceChallenge();
        pendingEhrAuth.set(ehrState, { ehrState, ehrCodeVerifier, mcpClientId: mcpClientInfo.client_id, mcpRedirectUri: params.redirectUri, mcpCodeChallenge: params.codeChallenge, mcpOriginalState: params.state, });
        console.log(`[AUTH] Stored pending state for EHR state: ${ehrState}`);
        const ehrAuthUrl = new URL(EHR_AUTH_URL!);
        ehrAuthUrl.searchParams.set("response_type", "code");
        ehrAuthUrl.searchParams.set("client_id", MCP_SERVER_EHR_CLIENT_ID!);
        ehrAuthUrl.searchParams.set("scope", REQUIRED_EHR_SCOPES);
        ehrAuthUrl.searchParams.set("redirect_uri", `${MCP_SERVER_BASE_URL}${MCP_SERVER_EHR_CALLBACK_PATH}`);
        ehrAuthUrl.searchParams.set("state", ehrState);
        ehrAuthUrl.searchParams.set("aud", EHR_FHIR_URL!);
        ehrAuthUrl.searchParams.set("code_challenge", ehrCodeChallenge);
        ehrAuthUrl.searchParams.set("code_challenge_method", "S256");
        console.log(`[AUTH] User needs to be redirected to EHR: ${ehrAuthUrl.toString()}`);
        // NOTE: Cannot directly redirect from Bun.serve handler; need to return redirect response
        // This logic is now handled in the /authorize handler itself.
        throw new Error("Redirect required"); // Signal to the handler to perform redirect
    }

    async challengeForAuthorizationCode(mcpClientInfo: OAuthClientInformationFull, mcpAuthorizationCode: string): Promise<string> {
        console.log(`[AUTH] Retrieving challenge for MCP code: ${mcpAuthorizationCode}`);
        const session = sessionsByMcpAuthCode.get(mcpAuthorizationCode);
        if (!session || session.mcpClientInfo.client_id !== mcpClientInfo.client_id) throw new InvalidGrantError("Invalid or expired authorization code");
        if (!session.mcpAuthCodeChallenge) { console.error("[AUTH] Internal error: MCP Code Challenge not found."); throw new ServerError("Internal error retrieving PKCE challenge"); }
        return session.mcpAuthCodeChallenge;
    }

    async exchangeAuthorizationCode(mcpClientInfo: OAuthClientInformationFull, mcpAuthorizationCode: string): Promise<OAuthTokens> {
        console.log(`[AUTH] Exchanging MCP code: ${mcpAuthorizationCode} for client ${mcpClientInfo.client_id}`);
        const session = sessionsByMcpAuthCode.get(mcpAuthorizationCode);
        sessionsByMcpAuthCode.delete(mcpAuthorizationCode); // Code is single-use

        if (!session || session.mcpClientInfo.client_id !== mcpClientInfo.client_id) { console.error(`[AUTH] Exchange failed: Invalid/used MCP code ${mcpAuthorizationCode}`); throw new InvalidGrantError("Invalid, expired, or previously used authorization code"); }

        // --- Generate Real Access Token ---
        const mcpAccessToken = uuidv4(); // Generate a secure, opaque token
        session.mcpAccessToken = mcpAccessToken; // Store it in the session object

        // --- Store Session by Real Token ---
        // Note: The transport sessionId is NOT YET known here. It will be added when SSE connects.
        session.sessionId = ""; // Initialize transport sessionId as empty
        activeSessions.set(mcpAccessToken, session); // Use the real token as the key

        // --- Clean up temporary code-related fields ---
        delete session.mcpAuthCode;
        delete session.mcpAuthCodeChallenge;
        delete session.mcpAuthCodeRedirectUri;

        console.log(`[AUTH] Issuing MCP token: ${mcpAccessToken.substring(0, 8)}... for client ${mcpClientInfo.client_id}`);
        return { access_token: mcpAccessToken, token_type: "Bearer", expires_in: 3600 }; // Return the REAL token
    }

    async verifyAccessToken(mcpAccessToken: string): Promise<AuthInfo> {
        console.log(`[AUTH] Verifying MCP token: ${mcpAccessToken.substring(0, 8)}...`);
        // --- Look up session using the REAL access token ---
        const session = activeSessions.get(mcpAccessToken);
        console.log(activeSessions);

        if (!session) {
            console.warn(`[AUTH] MCP Token ${mcpAccessToken.substring(0,8)}... not found in active sessions.`);
            throw new InvalidTokenError("Invalid or expired access token");
        }

        // Add expiry check if needed (depends on session management strategy)
        // Example: Check if session has an expiry timestamp
        // if (session.sessionExpiry && session.sessionExpiry < Date.now() / 1000) {
        //     activeSessions.delete(mcpAccessToken); // Clean up expired session
        //     throw new InvalidTokenError("Token has expired");
        // }

        console.log(`[AUTH] MCP Token verified for client: ${session.mcpClientInfo.client_id}`);
        // Return AuthInfo based on the found session
        return {
            token: mcpAccessToken, // The verified token
            clientId: session.mcpClientInfo.client_id,
            scopes: session.mcpClientInfo.scope?.split(' ') || [],
            // Add expiresAt if you implement session expiry
        };
    }

    async exchangeRefreshToken(mcpClientInfo: OAuthClientInformationFull, refreshToken: string, scopes?: string[] | undefined): Promise<OAuthTokens> { throw new UnsupportedGrantTypeError("Refresh tokens are not supported by this server."); }

    async revokeToken(mcpClientInfo: OAuthClientInformationFull, request: OAuthTokenRevocationRequest): Promise<void> {
        const tokenToRevoke = request.token;
        console.log(`[AUTH] Revoking MCP token ${tokenToRevoke.substring(0, 8)}... for client ${mcpClientInfo.client_id}`);

        // --- Look up session using the REAL access token ---
        const session = activeSessions.get(tokenToRevoke);

        if (session) {
            // Optional: Verify the client requesting revocation owns the token
            // --- LINTER FIX: Skip check if DISABLE_CLIENT_CHECKS is true ---
            if (!DISABLE_CLIENT_CHECKS && session.mcpClientInfo.client_id !== mcpClientInfo.client_id) {
                console.warn(`[AUTH] Revocation attempt failed: Client ${mcpClientInfo.client_id} does not own token ${tokenToRevoke.substring(0, 8)}...`);
                // Depending on spec/policy, you might silently succeed or throw an error.
                // For simplicity here, we proceed but log a warning.
                // throw new InvalidRequestError("Client does not own the token");
            }

            try {
                session.db.close(); // Close the associated SQLite DB
            } catch(e) {
                console.error(`Error closing DB for session on revoke (Token: ${tokenToRevoke.substring(0, 8)}...):`, e);
            }

            // Remove from active sessions map (keyed by token)
            activeSessions.delete(tokenToRevoke);

            // --- Also remove any associated SSE transport ---
            // Find the transport session ID associated with this token
            let transportSessionIdToRemove: string | null = null;
            for (const [transportSessionId, entry] of activeSseTransports.entries()) {
                if (entry.mcpAccessToken === tokenToRevoke) {
                    transportSessionIdToRemove = transportSessionId;
                    // Optionally close the SSE connection gracefully
                    try {
                        entry.transport.close(); // Assuming SSEServerTransport has a close method
                        console.log(`[SSE] Closed transport connection ${transportSessionId} due to token revocation.`);
                    } catch (closeErr) {
                        console.error(`[SSE] Error closing transport ${transportSessionId} during revocation:`, closeErr);
                    }
                    break;
                }
            }
            if (transportSessionIdToRemove) {
                activeSseTransports.delete(transportSessionIdToRemove);
                 console.log(`[AUTH] Removed active SSE transport entry for revoked token ${tokenToRevoke.substring(0, 8)}...`);
            }


            console.log(`[AUTH] MCP Token ${tokenToRevoke.substring(0, 8)}... revoked, session cleared, and DB closed.`);
        } else {
            console.log(`[AUTH] MCP Token ${tokenToRevoke.substring(0, 8)}... not found or already revoked.`);
        }
    }
}

// --- Resync Logic ---
async function handleResync(session: UserSession) {
    console.log(`[RESYNC] Starting resync for session: ${session.sessionId}`);
    const now = Math.floor(Date.now() / 1000);
    if (session.ehrTokenExpiry && session.ehrTokenExpiry <= now) { console.error(`[RESYNC] EHR token expired. Cannot resync.`); throw new Error("EHR session token has expired. Re-auth required."); }
    console.log(`[RESYNC] Attempting resync with current EHR token.`);
    console.log(`[RESYNC] Clearing existing data.`);
    session.record = {};
    try {
        const tables = await session.db.query("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'fhir_%';").all();
        session.db.exec('BEGIN TRANSACTION;');
        for (const table of tables as { name: string }[]) { session.db.exec(`DROP TABLE IF EXISTS "${table.name}";`); }
        session.db.exec('COMMIT;'); console.log('[SQLITE] Dropped existing tables.');
    } catch (dbErr) { console.error("[SQLITE] Error clearing tables:", dbErr); try { session.db.exec('ROLLBACK;'); } catch(e) { console.error("Rollback failed", e); } }
    try {
        session.record = await fetchEhrData(session.ehrAccessToken, EHR_FHIR_URL!, session.ehrPatientId!);
        processAttachments(session.record);
        await populateSqlite(session.record, session.db);
        console.log(`[RESYNC] Data re-fetched and processed.`);
    } catch (fetchErr) { console.error(`[RESYNC] Failed to fetch/process data:`, fetchErr); throw new Error(`Failed to refresh data from EHR: ${fetchErr instanceof Error ? fetchErr.message : String(fetchErr)}`); }
}

// --- MCP Server Instance ---
const mcpServer = new McpServer(SERVER_INFO);
const oauthProvider = new MyOAuthServerProvider();

// --- Custom Bearer Auth Middleware using our provider ---
// This ensures req.auth is typed correctly within our routes
const bearerAuthMiddleware = requireBearerAuth({ provider: oauthProvider });

// --- Register Tools using High-Level API ---

mcpServer.tool(
    "grep_record",
    GrepRecordInputSchema.shape, // Pass .shape for ZodRawShape
    async (args, extra) => {
        // --- LINTER FIX: Correctly retrieve session using transport ID ---
        const transportSessionId = extra.sessionId;
        if (!transportSessionId) {
            console.error(`[TOOL grep_record] Error: Missing transport sessionId.`);
            throw new McpError(ErrorCode.InvalidRequest, "Missing session identifier.");
        }

        const transportEntry = activeSseTransports.get(transportSessionId);
        if (!transportEntry) {
            console.warn(`[TOOL grep_record] Received call for unknown/disconnected transport sessionId: ${transportSessionId}`);
            // Don't throw InvalidRequest, as the request structure might be fine, but the session is gone.
            // InternalError or a custom error might be more appropriate, but InvalidRequest is handled by MCP.
            throw new McpError(ErrorCode.InvalidRequest, "Invalid or disconnected session.");
        }

        const mcpAccessToken = transportEntry.mcpAccessToken;
        const session = activeSessions.get(mcpAccessToken);

        if (!session) {
            // This indicates an internal inconsistency (transport exists but session is gone)
            console.error(`[TOOL grep_record] Internal Error: No session found for active transport ${transportSessionId} (Token: ${mcpAccessToken.substring(0,8)}...)`);
            throw new McpError(ErrorCode.InternalError, "Session data not found for active connection.");
        }
        // --- End Linter Fix ---

        try {
            // Ensure record is loaded (implicit resync)
            if (Object.keys(session.record).length === 0) {
                console.warn(`[TOOL grep_record] Session ${session.sessionId} record empty. Attempting implicit resync.`);
                await handleResync(session);
            }
            const resultData = grepRecordLogic(session.record, args.query, args.resource_types, args.max_hits, args.context_lines);
            return { content: [{ type: "text", text: JSON.stringify(resultData, null, 2) }] };
        } catch (error: any) {
            console.error(`Error executing tool grep_record:`, error);
            return { content: [{ type: "text", text: `Error executing grep_record: ${error.message}` }], isError: true };
        }
    }
);

mcpServer.tool(
    "query_record",
    QueryRecordInputSchema.shape, // Pass .shape
    async (args, extra) => {
        // --- LINTER FIX: Correctly retrieve session using transport ID ---
        const transportSessionId = extra.sessionId;
        if (!transportSessionId) {
            console.error(`[TOOL query_record] Error: Missing transport sessionId.`);
            throw new McpError(ErrorCode.InvalidRequest, "Missing session identifier.");
        }

        const transportEntry = activeSseTransports.get(transportSessionId);
        if (!transportEntry) {
            console.warn(`[TOOL query_record] Received call for unknown/disconnected transport sessionId: ${transportSessionId}`);
            throw new McpError(ErrorCode.InvalidRequest, "Invalid or disconnected session.");
        }

        const mcpAccessToken = transportEntry.mcpAccessToken;
        const session = activeSessions.get(mcpAccessToken);

        if (!session) {
            console.error(`[TOOL query_record] Internal Error: No session found for active transport ${transportSessionId} (Token: ${mcpAccessToken.substring(0,8)}...)`);
            throw new McpError(ErrorCode.InternalError, "Session data not found for active connection.");
        }
        // --- End Linter Fix ---

        try {
            // Ensure record is loaded (implicit resync)
            if (Object.keys(session.record).length === 0) {
                console.warn(`[TOOL query_record] Session ${session.sessionId} record empty. Attempting implicit resync.`);
                await handleResync(session);
            }
            const resultData = await queryRecordLogic(session.db, args.sql);
            // Limit result size before stringifying
            const MAX_JSON_LENGTH = 500 * 1024; // 500 KB limit
            let resultString = JSON.stringify(resultData, null, 2);
            if (resultString.length > MAX_JSON_LENGTH) {
                console.warn(`[TOOL query_record] Result too large (${resultString.length} bytes), truncating.`);
                resultString = JSON.stringify({ warning: "Result truncated due to size limit.", truncated_results: resultData.slice(0, 100) }, null, 2);
            }
            return { content: [{ type: "text", text: resultString }] };
        } catch (error: any) {
            console.error(`Error executing tool query_record:`, error);
            return { content: [{ type: "text", text: `Error executing query_record: ${error.message}` }], isError: true };
        }
    }
);

// Temporarily comment out ask_question tool as mcpServer.createMessage is not available
/*
mcpServer.tool(
    "ask_question",
    AskQuestionInputSchema.shape, // Pass .shape
    async (args, extra) => {
        // Manual Auth Check
        const sessionId = extra.sessionId;
        let authInfo: AuthInfo;
        try {
            if (!sessionId) throw new Error("Missing session identifier.");
            authInfo = await oauthProvider.verifyAccessToken(sessionId);
        } catch (e) {
            console.error(`[TOOL AUTH ask_question] Failed: ${e instanceof Error ? e.message : e}`);
            throw new McpError(ErrorCode.InvalidRequest, "Authentication required.");
        }

        const session = activeSessions.get(sessionId);
        if (!session) {
            console.error(`[TOOL ask_question] Internal Error: No session for verified token ${sessionId.substring(0,8)}...`);
            throw new McpError(ErrorCode.InternalError, "Session data not found for valid token.");
        }
        if (authInfo.clientId !== session.mcpClientInfo.client_id) {
            console.error(`[TOOL ask_question] Forbidden: Client ID mismatch ${sessionId.substring(0,8)}...`);
            throw new McpError(ErrorCode.InvalidRequest, "Client ID mismatch."); // Use InvalidRequest for AuthZ issues
        }

        try {
             // Ensure record is loaded (implicit resync)
             if (Object.keys(session.record).length === 0) {
                 console.warn(`[TOOL ask_question] Session ${session.sessionId} record empty. Attempting implicit resync.`);
                 await handleResync(session);
             }

            // This needs to be handled differently, e.g., by the client calling tools then the LLM.
            // const sysPrompt = "...";
            // const ctxMsg = "...";
            // const samplingResult = await mcpServer.createMessage({ ... }); // NOT AVAILABLE
            // return { content: [{ type: "text", text: JSON.stringify({ answer: samplingResult.content.text }) }] };
            throw new Error("ask_question tool implementation needs redesign for McpServer.");

        } catch (error: any) {
            console.error(`Error executing tool ask_question:`, error);
             if (error instanceof McpError) {
                 return { content: [{ type: "text", text: `Error during question processing: ${error.message}` }], isError: true };
             }
            return { content: [{ type: "text", text: `Error executing ask_question: ${error.message}` }], isError: true };
        }
    }
);
*/

mcpServer.tool(
    "resync_record",
    ResyncRecordInputSchema.shape, // Pass .shape
    async (args, extra) => {
        // --- LINTER FIX: Correctly retrieve session using transport ID ---
        const transportSessionId = extra.sessionId;
        if (!transportSessionId) {
            console.error(`[TOOL resync_record] Error: Missing transport sessionId.`);
            throw new McpError(ErrorCode.InvalidRequest, "Missing session identifier.");
        }

        const transportEntry = activeSseTransports.get(transportSessionId);
        if (!transportEntry) {
            console.warn(`[TOOL resync_record] Received call for unknown/disconnected transport sessionId: ${transportSessionId}`);
            throw new McpError(ErrorCode.InvalidRequest, "Invalid or disconnected session.");
        }

        const mcpAccessToken = transportEntry.mcpAccessToken;
        const session = activeSessions.get(mcpAccessToken);

        if (!session) {
            console.error(`[TOOL resync_record] Internal Error: No session found for active transport ${transportSessionId} (Token: ${mcpAccessToken.substring(0,8)}...)`);
            throw new McpError(ErrorCode.InternalError, "Session data not found for active connection.");
        }
        // --- End Linter Fix ---

        try {
            await handleResync(session);
            const resultData = { message: "Record resynchronization attempt complete." };
            return { content: [{ type: "text", text: JSON.stringify(resultData) }] };
        } catch (error: any) {
            console.error(`Error executing tool resync_record:`, error);
            return { content: [{ type: "text", text: `Error executing resync_record: ${error.message}` }], isError: true };
        }
    }
);

// --- Express Server Setup ---
const app = express();

// Middleware
app.use(cors()); // Enable CORS for all origins (adjust for production)
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Logging Middleware
app.use((req, res, next) => {
    console.log(`[HTTP] ${req.method} ${req.path}`);
    next();
});

        // --- EHR Callback Handling ---
app.get(MCP_SERVER_EHR_CALLBACK_PATH, async (req, res) => {
    const ehrCode = req.query.code as string | undefined;
    const ehrState = req.query.state as string | undefined;

    if (!ehrCode || !ehrState) {
        res.status(400).send("Missing code or state from EHR.");
        return;
    }

            const pendingAuth = pendingEhrAuth.get(ehrState);
            pendingEhrAuth.delete(ehrState);

    if (!pendingAuth) {
        res.status(400).send("Invalid or expired state parameter from EHR.");
        return;
    }
            console.log(`[AUTH] Processing EHR callback for state: ${ehrState}, MCP Client: ${pendingAuth.mcpClientId}`);

            try {
                console.log(`[AUTH] Exchanging EHR code at ${EHR_TOKEN_URL}`);
        const tokenParams = new URLSearchParams({
            grant_type: "authorization_code",
            code: ehrCode,
            redirect_uri: `${MCP_SERVER_BASE_URL}${MCP_SERVER_EHR_CALLBACK_PATH}`,
            client_id: MCP_SERVER_EHR_CLIENT_ID!,
            code_verifier: pendingAuth.ehrCodeVerifier,
        });
        const tokenResponse = await fetch(EHR_TOKEN_URL!, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json"
            },
            body: tokenParams,
        });

        if (!tokenResponse.ok) {
            const errBody = await tokenResponse.text();
            console.error(`[AUTH] EHR token exchange failed (${tokenResponse.status}): ${errBody}`);
            throw new Error(`EHR token exchange failed: ${tokenResponse.statusText}`);
        }
                const ehrTokens = await tokenResponse.json() as any;
                const patientId = ehrTokens.patient;
        if (!patientId) {
            console.error("[AUTH] Crucial Error: Patient ID not returned.");
            throw new Error("Patient context (patient ID) was not provided by the EHR.");
        }
                console.log(`[AUTH] Received EHR tokens (Access Token: ${ehrTokens?.access_token?.substring(0, 8)}..., Patient: ${patientId})`);

        const db = new Database(':memory:');
                const record = await fetchEhrData(ehrTokens.access_token, EHR_FHIR_URL!, patientId);
                processAttachments(record);
        await populateSqlite(record, db);
                console.log("[DATA] Initial data fetched, processed, and loaded into SQLite.");

        // --- Create UserSession (without mcpAccessToken or transport sessionId yet) ---
        let mcpClientInfo: OAuthClientInformationFull | undefined;
        if (DISABLE_CLIENT_CHECKS) {
            console.log(`[AUTH Callback] Client checks disabled. Creating placeholder client info for: ${pendingAuth.mcpClientId}`);
            mcpClientInfo = {
                client_id: pendingAuth.mcpClientId,
                client_name: `Placeholder Client (${pendingAuth.mcpClientId})`,
                redirect_uris: [pendingAuth.mcpRedirectUri], // Use the one provided
                token_endpoint_auth_method: 'none', // Assume public if checks disabled
                scope: 'offline_access', // Default scope
                grant_types: ['authorization_code'], // Default grant type
                response_types: ['code'], // Default response type
                // No secrets or expiry needed for placeholder
            };
        } else {
            mcpClientInfo = await oauthProvider.clientsStore.getClient(pendingAuth.mcpClientId);
            if (!mcpClientInfo) {
                 console.error(`[AUTH Callback] Failed to retrieve MCP client info for ID: ${pendingAuth.mcpClientId} during callback.`);
                throw new Error("MCP Client information not found during callback processing.");
            }
        }

        const session: UserSession = {
            sessionId: "", // Will be set by transport later
            mcpAccessToken: "", // Will be set during token exchange
            ehrAccessToken: ehrTokens.access_token,
            ehrTokenExpiry: ehrTokens.expires_in ? Math.floor(Date.now() / 1000) + ehrTokens.expires_in : undefined,
            ehrGrantedScopes: ehrTokens.scope,
            ehrPatientId: patientId,
            record,
            db,
            mcpClientInfo, // Now guaranteed to be defined
            mcpAuthCodeChallenge: pendingAuth.mcpCodeChallenge, // Store challenge for token exchange
            mcpAuthCodeRedirectUri: pendingAuth.mcpRedirectUri, // Store redirect URI for token exchange
        };

        const mcpAuthCode = `mcp-code-${uuidv4()}`;
        session.mcpAuthCode = mcpAuthCode; // Add temporary code to session object
        sessionsByMcpAuthCode.set(mcpAuthCode, session); // Map the temporary code to the session object

        const clientRedirectUrl = new URL(pendingAuth.mcpRedirectUri);
        clientRedirectUrl.searchParams.set("code", mcpAuthCode); // Use the MCP code
        if (pendingAuth.mcpOriginalState) clientRedirectUrl.searchParams.set("state", pendingAuth.mcpOriginalState);
        console.log(`[AUTH] Redirecting back to MCP Client with MCP Auth Code: ${clientRedirectUrl.toString()}`);
        res.redirect(302, clientRedirectUrl.toString());

    } catch (error) {
        console.error("[AUTH] Error in /ehr-callback:", error);
        const clientRedirectUrl = new URL(pendingAuth?.mcpRedirectUri || '/error_fallback');
        clientRedirectUrl.searchParams.set("error", "ehr_callback_failed");
        clientRedirectUrl.searchParams.set("error_description", error instanceof Error ? error.message : "Processing failed after EHR callback");
        if (pendingAuth?.mcpOriginalState) clientRedirectUrl.searchParams.set("state", pendingAuth.mcpOriginalState);
        res.redirect(302, clientRedirectUrl.toString());
    }
});


// --- MCP Auth Endpoints ---
app.options("/.well-known/oauth-authorization-server", cors()); // Handle preflight
app.get("/.well-known/oauth-authorization-server", cors(), (req, res) => {
    const metadata = {
        issuer: MCP_SERVER_BASE_URL,
        authorization_endpoint: `${MCP_SERVER_BASE_URL}/authorize`,
        token_endpoint: `${MCP_SERVER_BASE_URL}/token`,
        registration_endpoint: `${MCP_SERVER_BASE_URL}/register`,
        revocation_endpoint: `${MCP_SERVER_BASE_URL}/revoke`,
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
    const state = req.query.state as string | undefined;
    console.log(`[AUTHORIZE] Received authorize request for client_id: ${clientId}, redirect_uri: ${redirectUri}, response_type: ${responseType}, code_challenge: ${codeChallenge}, code_challenge_method: ${codeChallengeMethod}, state: ${state}`);

             try {
                if (!clientId) throw new InvalidRequestError("client_id required");
                // --- LINTER FIX: Conditionally skip client lookup and validation ---
                let mcpClientInfo: OAuthClientInformationFull | undefined;
                let validatedRedirectUri = redirectUri;

                if (DISABLE_CLIENT_CHECKS) {
                    console.log(`[AUTHORIZE] Client checks disabled. Skipping client lookup and redirect URI validation for client: ${clientId}`);
                    // Use provided redirectUri or try to guess if only one was ever registered (less ideal)
                    // For simplicity, require redirect_uri if checks are disabled and not provided.
                    if (!validatedRedirectUri) {
                         throw new InvalidRequestError("redirect_uri required when client checks are disabled");
                    }
                    // Create a minimal placeholder if needed later (currently not strictly needed here)
                    mcpClientInfo = { // Minimal placeholder
                         client_id: clientId,
                         redirect_uris: [validatedRedirectUri],
                         token_endpoint_auth_method: 'none' // Assume public
                     };
                } else {
                    mcpClientInfo = await oauthProvider.clientsStore.getClient(clientId);
                    if (!mcpClientInfo) throw new InvalidClientError("Invalid client_id");

                    if (!validatedRedirectUri) {
                        if (mcpClientInfo.redirect_uris.length === 1) validatedRedirectUri = mcpClientInfo.redirect_uris[0];
                        else throw new InvalidRequestError("redirect_uri required");
                    } else if (!mcpClientInfo.redirect_uris.includes(validatedRedirectUri)) {
                        throw new InvalidRequestError("Unregistered redirect_uri");
                    }
                }
                // --- End Linter Fix ---

                if (responseType !== 'code') throw new InvalidRequestError("response_type must be 'code'");
                if (!codeChallenge) throw new InvalidRequestError("code_challenge required");
                if (codeChallengeMethod !== 'S256') throw new InvalidRequestError("code_challenge_method must be 'S256'");

        // Trigger EHR redirect by generating URL here
                         const ehrState = uuidv4();
                         const { code_verifier: ehrCodeVerifier, code_challenge: ehrCodeChallenge } = await pkceChallenge();
        pendingEhrAuth.set(ehrState, {
            ehrState,
            ehrCodeVerifier,
            mcpClientId: mcpClientInfo.client_id,
            mcpRedirectUri: validatedRedirectUri,
            mcpCodeChallenge: codeChallenge,
            mcpOriginalState: state,
        });
                         const ehrAuthUrl = new URL(EHR_AUTH_URL!);
                         ehrAuthUrl.searchParams.set("response_type", "code");
                         ehrAuthUrl.searchParams.set("client_id", MCP_SERVER_EHR_CLIENT_ID!);
                         ehrAuthUrl.searchParams.set("scope", REQUIRED_EHR_SCOPES);
                         ehrAuthUrl.searchParams.set("redirect_uri", `${MCP_SERVER_BASE_URL}${MCP_SERVER_EHR_CALLBACK_PATH}`);
                         ehrAuthUrl.searchParams.set("state", ehrState);
                         ehrAuthUrl.searchParams.set("aud", EHR_FHIR_URL!);
                         ehrAuthUrl.searchParams.set("code_challenge", ehrCodeChallenge);
                         ehrAuthUrl.searchParams.set("code_challenge_method", "S256");
                         console.log(`[AUTH] Redirecting user to EHR from /authorize: ${ehrAuthUrl.toString()}`);
        res.redirect(302, ehrAuthUrl.toString());

            } catch (error: any) {
        console.error("[AUTH] /authorize error:", error);
        let clientRedirectUri = '/error_fallback'; // Default fallback
        if (redirectUri) clientRedirectUri = redirectUri;
        else if (clientId) {
            const info = await oauthProvider.clientsStore.getClient(clientId);
            if (info?.redirect_uris?.[0]) clientRedirectUri = info.redirect_uris[0];
        }

        const redirectUrl = new URL(clientRedirectUri, MCP_SERVER_BASE_URL); // Base URL helps if redirect is relative
        if (error instanceof OAuthError) {
            redirectUrl.searchParams.set("error", error.errorCode);
            redirectUrl.searchParams.set("error_description", error.message);
        } else {
            redirectUrl.searchParams.set("error", "server_error");
            redirectUrl.searchParams.set("error_description", "Internal authorization error: " + (error?.message || 'Unknown reason'));
        }
        if (state) redirectUrl.searchParams.set("state", state);
        res.redirect(302, redirectUrl.toString());
    }
});

app.options("/token", cors()); // Handle preflight
app.post("/token", cors(), async (req, res) => {
    try {
        // Use req.body thanks to express.urlencoded middleware
        const {
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: grantType,
            code: mcpCode,
            code_verifier: mcpCodeVerifier
        } = req.body;

                console.log(`[TOKEN] Received token request for grant_type: ${grantType}`);
                 if (!grantType) throw new InvalidRequestError("grant_type required");
                 if (!clientId) throw new InvalidRequestError("client_id required");
                 // --- LINTER FIX: Conditionally skip client lookup and validation ---
                 let mcpClientInfo: OAuthClientInformationFull | undefined;
                 if (!DISABLE_CLIENT_CHECKS) {
                     mcpClientInfo = await oauthProvider.clientsStore.getClient(clientId);
                     if (!mcpClientInfo) throw new InvalidClientError("Invalid client_id");

                     // Validate secret if present and required
                     if (mcpClientInfo.client_secret && mcpClientInfo.token_endpoint_auth_method !== 'none') {
                        if (!clientSecret) throw new InvalidClientError("client_secret required");
                        if (clientSecret !== mcpClientInfo.client_secret) throw new InvalidClientError("Invalid client_secret");
                        if (mcpClientInfo.client_secret_expires_at && mcpClientInfo.client_secret_expires_at < Math.floor(Date.now() / 1000)) {
                            throw new InvalidClientError("Client secret expired");
                        }
                     }
                 } else {
                     console.log(`[TOKEN] Client checks disabled. Skipping client lookup and secret validation for client: ${clientId}`);
                     // Create placeholder if needed for challengeForAuthorizationCode/exchangeAuthorizationCode
                     // These functions now primarily rely on the code mapping to a session.
                     // We still need a placeholder object to pass type checks.
                      mcpClientInfo = { // Minimal placeholder
                         client_id: clientId,
                         redirect_uris: [], // Not relevant here
                         token_endpoint_auth_method: 'none' // Assume public
                     };
                 }
                 // --- End Linter Fix ---

                 if (grantType === 'authorization_code') {
                    if (!mcpCode) throw new InvalidRequestError("code required");
                    if (!mcpCodeVerifier) throw new InvalidRequestError("code_verifier required");
                    // Pass the potentially placeholder mcpClientInfo - the function needs client_id mainly
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

app.options("/register", cors()); // Handle preflight
app.post("/register", cors(), express.json(), async (req, res) => {
    console.log(`[REGISTER] Received register request`);
    try {
        if (!oauthProvider.clientsStore.registerClient) {
            throw new ServerError("Dynamic client registration not supported");
        }
        // Use req.body thanks to express.json middleware
        const clientMetadata = req.body as Partial<OAuthClientMetadata>;

                 // Basic validation - SDK's registerClient handler does more thorough checks
        if (!clientMetadata || !Array.isArray(clientMetadata.redirect_uris) || clientMetadata.redirect_uris.length === 0) {
            throw new InvalidClientError("redirect_uris required");
        }

                 // Generate credentials before passing to provider
                 const buf = new Uint8Array(32);
                 crypto.getRandomValues(buf);
                 const secretHex = Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
                 const isPublic = clientMetadata.token_endpoint_auth_method === 'none';

                 const generatedInfo: OAuthClientInformationFull = {
            ...(clientMetadata as OAuthClientMetadata), // Assume valid metadata shape for now
                     client_id: crypto.randomUUID(),
                     client_secret: isPublic ? undefined : secretHex,
                     client_id_issued_at: Math.floor(Date.now() / 1000),
            client_secret_expires_at: isPublic ? undefined : (Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)), // Default 30 days
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

app.options("/revoke", cors()); // Handle preflight
app.post("/revoke", cors(), async (req, res) => {
    try {
        if (!oauthProvider.revokeToken) {
            throw new ServerError("Token revocation not supported");
        }
        // Use req.body thanks to express.urlencoded middleware
        const {
            client_id: clientId,
            client_secret: clientSecret,
            token: tokenToRevoke,
            token_type_hint: tokenTypeHint
        } = req.body;

                 if (!tokenToRevoke) throw new InvalidRequestError("token required");
                 if (!clientId) throw new InvalidRequestError("client_id required"); // Client must authenticate

                 // --- LINTER FIX: Conditionally skip client lookup and validation ---
                 let mcpClientInfo: OAuthClientInformationFull | undefined;
                 if (!DISABLE_CLIENT_CHECKS) {
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
                     console.log(`[REVOKE] Client checks disabled. Skipping client lookup and secret validation for client: ${clientId}`);
                     // Create placeholder needed for revokeToken call signature
                     mcpClientInfo = { // Minimal placeholder
                         client_id: clientId,
                         redirect_uris: [], // Not relevant here
                         token_endpoint_auth_method: 'none' // Assume public
                     };
                 }
                 // --- End Linter Fix ---

                 await oauthProvider.revokeToken(mcpClientInfo!, { token: tokenToRevoke, token_type_hint: tokenTypeHint });
        res.sendStatus(200);
            } catch (error: any) {
                 console.error("[AUTH] /revoke error:", error);
                 const status = (error instanceof OAuthError && !(error instanceof ServerError)) ? 400 : 500;
                 const errorResp = (error instanceof OAuthError) ? error.toResponseObject() : new ServerError("Token revocation failed").toResponseObject();
        res.status(status).json(errorResp);
    }
});

// --- MCP SSE Endpoint using SSEServerTransport ---
app.get("/mcp-sse", bearerAuthMiddleware, async (req: Request, res: Response) => {
    // At this point, bearerAuthMiddleware has run.
    // If successful, req.auth contains validated AuthInfo.
    // If failed, middleware already sent 401/403/500 response.
    const authInfo = req.auth;
    if (!authInfo) {
        // This should technically not happen if middleware is set up correctly,
        // but adding a safeguard. The middleware handles the actual response.
        console.error("[SSE GET] Middleware succeeded but req.auth is missing!");
        if (!res.headersSent) res.status(500).send("Authentication failed unexpectedly.");
        return;
    }

    const mcpAccessToken = authInfo.token;
    console.log(`[SSE GET] Auth successful for token ${mcpAccessToken.substring(0, 8)}..., client: ${authInfo.clientId}`);

    // Retrieve the UserSession using the verified MCP Access Token
    const session = activeSessions.get(mcpAccessToken);
    if (!session) {
        // This implies the token was valid according to verifyAccessToken, but the session data is gone.
        // This could happen if the token was revoked between verification and now, or server restart etc.
        console.error(`[SSE GET] Internal Error: Session data not found for valid token ${mcpAccessToken.substring(0, 8)}...`);
        // Respond with an error - perhaps 401 Unauthorized as the token *effectively* is invalid now
        res.set("WWW-Authenticate", `Bearer error="invalid_token", error_description="Session associated with token not found or expired."`)
        res.status(401).json({ error: "invalid_token", error_description: "Session associated with token not found or expired." });
        return;
    }

    // Verify the client ID from the token matches the session's client ID
    if (session.mcpClientInfo.client_id !== authInfo.clientId) {
        console.error(`[SSE GET] Forbidden: Client ID mismatch for token ${mcpAccessToken.substring(0, 8)}... Token Client: ${authInfo.clientId}, Session Client: ${session.mcpClientInfo.client_id}`);
        res.set("WWW-Authenticate", `Bearer error="invalid_token", error_description="Token client ID does not match session client ID."`);
        res.status(401).json({ error: "invalid_token", error_description: "Token client ID does not match session client ID." });
        return;
    }

    let transport: SSEServerTransport | null = null;
    try {
        // Create the transport AFTER successful authentication
        transport = new SSEServerTransport(`/mcp-messages`, res); // Specify POST endpoint relative path
        const transportSessionId = transport.sessionId; // Get the transport-generated ID

        // --- Link Transport Session ID to User Session ---
        session.sessionId = transportSessionId; // Update the UserSession with the transport ID

        // --- Store Authenticated Transport Info ---
        // Key: transportSessionId, Value: { transport object, verified token, authInfo }
        activeSseTransports.set(transportSessionId, {
            transport: transport,
            mcpAccessToken: mcpAccessToken,
            authInfo: authInfo
        });
        console.log(`[SSE GET] Client connected & authenticated. Transport Session ID: ${transportSessionId}, linked to MCP Token: ${mcpAccessToken.substring(0, 8)}...`);

        // Cleanup on close: Remove the transport from our active list
        res.on('close', () => {
            activeSseTransports.delete(transportSessionId);
            // Also clear the transport sessionId from the UserSession if it still exists
            if (session && session.sessionId === transportSessionId) {
                session.sessionId = ""; // Mark as disconnected
            }
            console.log(`[SSE GET] Client disconnected. Cleaned up transport session: ${transportSessionId}`);
            // SSEServerTransport should handle its internal cleanup
        });

        // Connect the transport to the MCP server. This handles the handshake.
        // Pass the verified authInfo into the connection context if needed by mcpServer
        // (Currently, mcpServer gets sessionId, we use it to look up authInfo)
        await mcpServer.connect(transport);
        // The connection remains open until the client disconnects or the server closes it.

    } catch (error) {
        console.error("[SSE GET] Error setting up authenticated SSE connection:", error);
        // Clean up if transport was created but connection failed
        if (transport && activeSseTransports.has(transport.sessionId)) {
            activeSseTransports.delete(transport.sessionId);
            if (session && session.sessionId === transport.sessionId) {
                 session.sessionId = "";
             }
        }
        // Ensure the response is properly ended if an error occurs before/during connection
        if (!res.headersSent) {
            // Avoid sending OAuthError details directly unless intended
             const message = (error instanceof OAuthError) ? "SSE connection setup failed due to authorization issue." : "Failed to establish SSE connection";
             const statusCode = (error instanceof InvalidTokenError) ? 401 : (error instanceof InsufficientScopeError ? 403 : 500);
             if (statusCode === 401 || statusCode === 403) {
                 res.set("WWW-Authenticate", `Bearer error="server_error", error_description="${message}"`); // Generic header for setup failure
             }
             res.status(statusCode).send(message);
        } else if (!res.writableEnded) {
            res.end(); // Close the connection if headers were sent
        }
    }
});

// --- MCP Message POST Endpoint ---
// No bearer token needed here; auth is tied to the transport session established via GET
app.post("/mcp-messages", (req: Request, res: Response) => { // Add types
    const transportSessionId = req.query.sessionId as string | undefined; // Transport's ID
    if (!transportSessionId) {
        console.warn("[MCP POST] Received POST without transport sessionId query param.");
        res.status(400).send("Missing sessionId query parameter");
        return;
    }

    // --- Look up authenticated transport session ---
    const transportEntry = activeSseTransports.get(transportSessionId);

    if (!transportEntry) {
        console.warn(`[MCP POST] Received POST for unknown/expired transport sessionId: ${transportSessionId}`);
        res.status(404).send("Invalid or expired sessionId"); // 404 likely better than 401 here
        return;
    }

    // --- Use the correct transport object ---
    const transport = transportEntry.transport;

    try {
        // Let the specific transport instance handle the POST request body and processing
        console.log(`[MCP POST] Received POST for transport session ${transportSessionId}, linked to MCP Token: ${transportEntry.mcpAccessToken.substring(0,8)}...`);
        transport.handlePostMessage(req, res); // Call on the transport object
    } catch (error) {
        console.error(`[MCP POST] Error in handlePostMessage for session ${transportSessionId}:`, error);
        // Ensure response is sent if handlePostMessage fails unexpectedly
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
const expressServer = http.createServer(app); // Create HTTP server instance

expressServer.listen(MCP_SERVER_PORT, () => {
    console.log(`[HTTP] Server listening on http://localhost:${MCP_SERVER_PORT}`);
});

// Graceful shutdown
const shutdown = async () => {
    console.log("\nShutting down...");
    expressServer.close(async (err) => { // Use the HTTP server instance
        if (err) {
            console.error("Error closing Express server:", err);
        } else {
            console.log("Express server closed.");
        }
    await mcpServer.close().catch(e => console.error("Error closing MCP server:", e));
    for (const [id, session] of activeSessions.entries()) {
        try { session.db.close(); } catch(e) { console.error(`Error closing DB for session ${id}:`, e); }
    }
    activeSessions.clear();
    console.log("Closed active sessions and DBs.");
        process.exit(err ? 1 : 0);
    });

    // Force close remaining connections after a timeout
    setTimeout(() => {
        console.error("Could not close connections gracefully, forcing shutdown.");
        process.exit(1);
    }, 10000); // 10 seconds timeout
};

// Replace process listeners to use new shutdown
process.removeListener('SIGINT', shutdown); // Remove old listener if it existed with same name
process.removeListener('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

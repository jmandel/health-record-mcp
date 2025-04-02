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
import cors from 'cors'; // Import cors
import express, { Request, Response } from 'express'; // Import express types
import { XMLParser } from 'fast-xml-parser';
import { convert as htmlToText } from 'html-to-text';
import http from 'http'; // Import http for server creation
import https from 'https'; // Import https module
import fs from 'fs/promises'; // Import fs promises for reading certs
import _ from 'lodash'; // Import lodash
import pkceChallenge, { verifyChallenge } from 'pkce-challenge';
import { v4 as uuidv4 } from 'uuid';
import vm from 'vm'; // Import Node.js vm module for sandboxing
import { z } from 'zod';

// --- RTF Parser Imports ---
import { deEncapsulateSync } from 'rtf-stream-parser';
import * as iconvLite from 'iconv-lite';

// --- Add Type Declaration for req.auth ---
declare module "express-serve-static-core" {
  interface Request {
    /**
     * Information about the validated access token, if the `requireBearerAuth` middleware was used.
     */
    auth?: AuthInfo;
  }
}


// --- Default Configuration ---
const DEFAULT_SMART_LAUNCHER_FHIR_BASE = "https://launch.smarthealthit.org/v/r4/sim/WzMsIjgzNjRmZjc0LWQ5MDQtNDQyYi1iOTg0LWY5ZDY0MDUzMTYzOSIsIiIsIkFVVE8iLDEsMSwwLCIiLCIiLCIiLCIiLCIiLDAsMSwiIl0/fhir";
const DEFAULT_SMART_LAUNCHER_CLIENT_ID = "mcp_app";

// --- Configuration ---
let EHR_AUTH_URL = Bun.env.EHR_AUTH_URL;
let EHR_TOKEN_URL = Bun.env.EHR_TOKEN_URL;
let EHR_FHIR_URL = Bun.env.EHR_FHIR_URL;
let MCP_SERVER_EHR_CLIENT_ID = Bun.env.MCP_SERVER_EHR_CLIENT_ID;

// --- SQLite Persistence Configuration ---
const SQLITE_PERSISTENCE_DIR = Bun.env.SQLITE_PERSISTENCE_DIR || "./data";
const SQLITE_PERSISTENCE_ENABLED = Bun.env.SQLITE_PERSISTENCE_ENABLED?.toLowerCase() === 'true';

// --- Create persistence directory if enabled ---
if (SQLITE_PERSISTENCE_ENABLED) {
    try {
        // Use Node's fs.mkdir instead of Bun.mkdir
        await import('fs/promises').then(fs => fs.mkdir(SQLITE_PERSISTENCE_DIR, { recursive: true }));
        console.log(`[CONFIG] SQLite persistence directory created/verified: ${SQLITE_PERSISTENCE_DIR}`);
    } catch (error) {
        console.error(`[CONFIG] Error creating SQLite persistence directory: ${error}`);
        process.exit(1);
    }
}


// --- HTTPS Configuration ---
const MCP_SERVER_HTTPS_ENABLED = Bun.env.MCP_SERVER_HTTPS_ENABLED?.toLowerCase() === 'true';
const MCP_SERVER_CERT_PATH = Bun.env.MCP_SERVER_CERT_PATH; // e.g., './healthsearch.snarked.com+3.pem'
const MCP_SERVER_KEY_PATH = Bun.env.MCP_SERVER_KEY_PATH; // e.g., './healthsearch.snarked.com+3-key.pem'

// --- Determine Base URL based on HTTPS ---
const MCP_SERVER_PROTOCOL = MCP_SERVER_HTTPS_ENABLED ? 'https' : 'http';
// Default host to localhost if not specified, but allow override
const MCP_SERVER_HOST = Bun.env.MCP_SERVER_HOST || 'localhost';
const MCP_SERVER_PORT = MCP_SERVER_HTTPS_ENABLED
    ? parseInt(Bun.env.MCP_SERVER_PORT || "443")
    : parseInt(Bun.env.MCP_SERVER_PORT || "3001");


console.log(`[CONFIG] MCP_SERVER_PROTOCOL: ${MCP_SERVER_PROTOCOL}`);
console.log(`[CONFIG] MCP_SERVER_HOST: ${MCP_SERVER_HOST}`);
console.log(`[CONFIG] MCP_SERVER_PORT: ${MCP_SERVER_PORT}`);

// Construct default base URLs with and without port
const defaultBaseUrlWithoutPort = `${MCP_SERVER_PROTOCOL}://${MCP_SERVER_HOST}`;
const defaultBaseUrlWithPort = `${defaultBaseUrlWithoutPort}:${MCP_SERVER_PORT}`;

// Set MCP_SERVER_BASE_URL: Use env var if provided, otherwise construct based on HTTPS
let MCP_SERVER_BASE_URL = Bun.env.MCP_SERVER_BASE_URL;
if (!MCP_SERVER_BASE_URL) {
    // If env var is NOT set, determine default based on HTTPS
    MCP_SERVER_BASE_URL = MCP_SERVER_HTTPS_ENABLED && MCP_SERVER_PORT === 443 ? defaultBaseUrlWithoutPort : defaultBaseUrlWithPort;
     console.log(`[CONFIG] MCP_SERVER_BASE_URL not set in environment. Defaulting to: ${MCP_SERVER_BASE_URL}`);
} else {
    // If env var IS set, validate its protocol
    console.log(`[CONFIG] Using MCP_SERVER_BASE_URL from environment: ${MCP_SERVER_BASE_URL}`);
    if (!MCP_SERVER_BASE_URL.startsWith(`${MCP_SERVER_PROTOCOL}://`)) {
        console.warn(`[CONFIG] WARNING: MCP_SERVER_BASE_URL (${MCP_SERVER_BASE_URL}) protocol does not match MCP_SERVER_HTTPS_ENABLED setting (${MCP_SERVER_PROTOCOL}). Using environment variable value anyway.`);
    }
}

console.log(`[CONFIG] MCP Server Port set to: ${MCP_SERVER_PORT}`);
console.log(`[CONFIG] MCP Server Base URL set to: ${MCP_SERVER_BASE_URL}`);

const MCP_SERVER_EHR_CALLBACK_PATH = "/ehr-callback";
const REQUIRED_EHR_SCOPES = Bun.env.EHR_SCOPES || [
    "openid", "fhirUser", "launch/patient",
    "patient/Patient.read", "patient/Observation.read", "patient/Condition.read",
    "patient/DocumentReference.read", "patient/MedicationRequest.read",
    "patient/MedicationStatement.read", "patient/AllergyIntolerance.read",
    "patient/Procedure.read", "patient/Immunization.read",
    "patient/CommunicationRequest", "patient/Contract"
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

// --- START Moved Type Definitions ---
// Structure for processed attachments (needed by FullEHR)
interface ProcessedAttachment {
    resourceType: string;
    resourceId: string;
    path: string;
    contentType: string;
    json: string; // JSON string of the original attachment node
    contentRaw: Buffer | null;
    contentPlaintext: string | null;
}

// New structure to hold all processed EHR data (needed by UserSession)
interface FullEHR {
    fhir: Record<string, any[]>; // Renamed from 'record'
    attachments: ProcessedAttachment[];
}
// --- END Moved Type Definitions ---

const pendingEhrAuth = new Map<string, AuthPendingState>();

interface UserSession {
    sessionId: string; // Transport Session ID (Added later by transport)
    mcpAccessToken: string; // The actual bearer token for this session
    ehrAccessToken: string;
    ehrTokenExpiry?: number;
    ehrGrantedScopes?: string;
    ehrPatientId?: string;
    fullEhr: FullEHR; // NEW: Uses the FullEHR interface defined above
    db?: Database; // NEW: Make DB optional, initialized when needed
    mcpClientInfo: OAuthClientInformationFull;
    mcpAuthCode?: string;
    mcpAuthCodeChallenge?: string;
    mcpAuthCodeRedirectUri?: string;
}
// Key is now the mcpAccessToken
const activeSessions = new Map<string, UserSession>(); // Keyed by MCP Access Token
const sessionsByMcpAuthCode = new Map<string, UserSession>(); // Temp map for code exchange
const registeredMcpClients = new Map<string, OAuthClientInformationFull>();
// Key is transport sessionId, value contains transport and authenticated mcpAccessToken/AuthInfo
const activeSseTransports = new Map<string, { transport: SSEServerTransport; mcpAccessToken: string; authInfo: AuthInfo }>();

// --- FHIR Data Fetching ---

// --- START Attachment Processing Helpers (Moved here) ---
interface AttachmentLike {
    contentType?: string;
    data?: string;
    url?: string;
    // Add other potential fields if needed, e.g., title, size, hash
}

// Known FHIR paths that contain attachments (Reinstated)
const KNOWN_ATTACHMENT_PATHS = new Map<string, string[]>([
    ['DocumentReference', ['content.attachment']],
    ['Binary', ['']],  // The entire resource is an attachment
    ['Media', ['content']],
    ['DiagnosticReport', ['presentedForm']],
    ['Observation', ['valueAttachment']],
    ['Patient', ['photo']],
    ['Practitioner', ['photo']],
    ['Organization', ['photo']],
    ['Communication', ['payload.content.attachment']],
    ['CommunicationRequest', ['payload.content.attachment']],
    ['Contract', ['legal.contentAttachment', 'rule.contentAttachment']]
]);

// Helper to fetch content from attachment URLs (Reinstated)
async function fetchAttachmentContent(attachmentUrl: string, fhirBaseUrl: string, accessToken: string): Promise<{ contentRaw: Buffer, contentType: string | null }> {
    // Resolve potential relative URLs (e.g., "Binary/123")
    const resolvedUrl = new URL(attachmentUrl, fhirBaseUrl);
    console.log(`[ATTACHMENT Fetch] GET ${resolvedUrl}`);
    const headers = new Headers({ "Authorization": `Bearer ${accessToken}`, "Accept": "*/*" }); // Accept any content type
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout for attachments

    try {
        const response = await fetch(resolvedUrl.toString(), { headers: headers, signal: controller.signal });
        clearTimeout(timeoutId);
        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[ATTACHMENT Fetch] Error ${response.status} from ${resolvedUrl}: ${errorBody}`);
            throw new Error(`Attachment fetch failed with status ${response.status} for ${resolvedUrl}`);
        }
        const contentRaw = Buffer.from(await response.arrayBuffer());
        const contentType = response.headers.get("Content-Type"); // Get type from header
        console.log(`[ATTACHMENT Fetch] Success (${contentRaw.length} bytes, Type: ${contentType || 'N/A'}) for ${resolvedUrl}`);
        return { contentRaw, contentType };
    } catch (error) {
        clearTimeout(timeoutId);
        if ((error as any).name === 'AbortError') {
            console.error(`[ATTACHMENT Fetch] Timeout fetching ${resolvedUrl}`);
            throw new Error(`Timeout fetching attachment: ${resolvedUrl}`);
        }
        console.error(`[ATTACHMENT Fetch] Network/Fetch error for ${resolvedUrl}:`, error);
        throw error; // Re-throw original error
    }
}

// Get value at path from object
function getValueAtPath(obj: any, path: string): any | any[] | undefined {
    if (!obj || !path) return undefined;
    if (path === '') return obj; // Special case for Binary resources

    const parts = path.split('.');
    let current: any = obj;

    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (current === null || current === undefined) return undefined;

        // Handle array indexing within path (e.g., content[0].attachment)
        const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
        if (arrayMatch) {
            const arrayKey = arrayMatch[1];
            const index = parseInt(arrayMatch[2], 10);
            if (!current[arrayKey] || !Array.isArray(current[arrayKey]) || index >= current[arrayKey].length) {
                return undefined; // Array or index out of bounds
            }
            current = current[arrayKey][index];
        } else {
            current = current[part];
        }

        // If we encounter an array midway and it's not the last part, it's ambiguous.
        // However, for attachment paths, we usually expect a single object or an array of objects at the *end*.
        // Let's refine the logic: getValueAtPath primarily targets a specific node or an array of nodes.
        // If the target path *ends* in an array, return the filtered array.
        if (Array.isArray(current) && i === parts.length - 1) {
            return current.filter(item => item !== null && item !== undefined);
        }
    }

    // If the final result is not an array, wrap it in one for consistent processing,
    // unless it's undefined/null.
    return current ? [current] : [];
}

// --- END Attachment Processing Helpers ---

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
    const maxPages = 200;

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

// Modified to fetch and process attachments internally AND return FullEHR
async function fetchEhrData(ehrAccessToken: string, fhirBaseUrl: string, patientId: string): Promise<FullEHR> { // Changed return type
    console.log(`[DATA] Fetching specific FHIR resources from ${fhirBaseUrl} for Patient: ${patientId}`);
    if (!patientId) throw new Error("Patient ID is required to fetch data.");

    const fhirRecord: Record<string, any[]> = {}; // Use a local variable
    const processedAttachments: ProcessedAttachment[] = []; // Store processed attachments here
    let totalFetched = 0;
    // Use URL constructor for robust path joining
    const patientReadUrl = new URL(`Patient/${patientId}`, fhirBaseUrl).toString();
    const searchQueries: { resourceType: string; params?: Record<string, string> }[] = [
        { resourceType: 'Observation', params: { 'category': 'laboratory', patient: patientId, '_count': '1000' } },
        { resourceType: 'Observation', params: { 'category': 'vital-signs', patient: patientId, '_count': '1000' } },
        { resourceType: 'Observation', params: { 'category': 'social-history', patient: patientId, '_count': '1000' } },
        { resourceType: 'Condition', params: { patient: patientId, '_count': '1000' } },
        { resourceType: 'MedicationRequest', params: { patient: patientId, '_count': '1000' } },
        { resourceType: 'MedicationStatement', params: { patient: patientId, '_count': '1000' } },
        { resourceType: 'AllergyIntolerance', params: { patient: patientId, '_count': '1000' } },
        { resourceType: 'Procedure', params: { patient: patientId, '_count': '1000' } },
        { resourceType: 'Immunization', params: { patient: patientId, '_count': '1000' } },
        { resourceType: 'DocumentReference', params: { patient: patientId, '_count': '1000' } },
    ];

    try {
        const patientResource = await fetchFhirResource(patientReadUrl, ehrAccessToken);
        fhirRecord['Patient'] = [patientResource]; // Populate local variable
        totalFetched++;
    } catch (error) {
        console.error(`[DATA] Failed to fetch Patient resource: ${error}`);
        throw new Error(`Could not fetch core Patient resource: ${error instanceof Error ? error.message : String(error)}`);
    }

    await Promise.allSettled(searchQueries.map(async (query) => {
        try {
            // Use URL constructor for robust path joining
            const url = new URL(query.resourceType, fhirBaseUrl);
            if (query.params) {
                Object.entries(query.params).forEach(([key, value]) => url.searchParams.set(key, value));
            }
            const resources = await fetchAllPages(url.toString(), ehrAccessToken);
            fhirRecord[query.resourceType] = resources; // Populate local variable
            totalFetched += resources.length;
        } catch (error) {
            console.warn(`[DATA] Failed to fetch ${query.resourceType} resources (continuing): ${error}`);
            fhirRecord[query.resourceType] = []; // Populate local variable
        }
    }));

    console.log(`[DATA] Completed fetching. Total resources retrieved: ${totalFetched} across ${Object.keys(fhirRecord).length} types.`); // Use local variable

    // --- START Internal Attachment Processing Logic ---
    console.log("[DATA:ATTACHMENT] Starting attachment processing within fetchEhrData...");
    const xmlParser = new XMLParser({ ignoreAttributes: true, textNodeName: "_text", parseTagValue: false, trimValues: true, stopNodes: ["*.html"] });
    let processedCount = 0;
    let processingErrorCount = 0;
    let fetchErrorCount = 0;

    // Internal helper to process a single attachment node (remains the same)
    async function processSingleAttachmentNode(node: AttachmentLike, resourceType: string, resourceId: string, path: string): Promise<void> {
        // ... logic remains identical, pushes to processedAttachments ...
         let contentRaw: Buffer | null = null;
         let contentPlaintext: string | null = null;
         let finalContentType = (node.contentType || 'application/octet-stream').toLowerCase();

         try {
             if (node.url) {
                 console.log(`[DATA:ATTACHMENT Process] Found URL: ${node.url} in ${resourceType}/${resourceId} at ${path}`);
                 try {
                     const fetched = await fetchAttachmentContent(node.url, fhirBaseUrl, ehrAccessToken);
                     contentRaw = fetched.contentRaw;
                     if (fetched.contentType) {
                         finalContentType = fetched.contentType.split(';')[0].trim().toLowerCase();
                         console.log(`[DATA:ATTACHMENT Process] Using fetched content type: ${finalContentType}`);
                     } else {
                         console.log(`[DATA:ATTACHMENT Process] Fetched content type missing, using type from resource: ${finalContentType}`);
                     }
                 } catch (fetchErr) {
                     console.error(`[DATA:ATTACHMENT Process] Failed to fetch content from ${node.url}:`, fetchErr);
                     contentPlaintext = `[Error fetching external content at ${node.url}: ${fetchErr instanceof Error ? fetchErr.message : String(fetchErr)}]`;
                     fetchErrorCount++;
                 }
             } else if (node.data) {
                 console.log(`[DATA:ATTACHMENT Process] Found inline data in ${resourceType}/${resourceId} at ${path}`);
                 contentRaw = Buffer.from(node.data, 'base64');
                 finalContentType = (node.contentType || 'application/octet-stream').toLowerCase();
             } else {
                 console.warn(`[DATA:ATTACHMENT Process] Attachment node in ${resourceType}/${resourceId} at ${path} has neither URL nor data.`);
                 contentPlaintext = '[Attachment has no data or URL]';
             }

             if (contentRaw !== null && contentPlaintext === null) {
                 if (finalContentType.startsWith('text/plain')) {
                     contentPlaintext = contentRaw.toString('utf8');
                 } else if (finalContentType === 'application/rtf') {
                     try {
                         console.log(`[DATA:ATTACHMENT Process] Attempting RTF de-encapsulation for ${resourceType}/${resourceId} at ${path}`);
                         const result = deEncapsulateSync(contentRaw, { decode: iconvLite.decode });
                         // The library might return HTML or plain text
                         if (result.mode === 'html') {
                             console.log(`[DATA:ATTACHMENT Process] RTF contained HTML, converting to text.`);
                             try {
                                 contentPlaintext = htmlToText(result.text.toString(), { wordwrap: false });
                             } catch (htmlErr) {
                                 console.error(`[DATA:ATTACHMENT Process] HTML parsing error after RTF extraction in ${resourceType}/${resourceId} at ${path}:`, htmlErr);
                                 contentPlaintext = '[Error parsing HTML from RTF]';
                                 processingErrorCount++;
                             }
                         } else { // Assumes 'text' mode
                              console.log(`[DATA:ATTACHMENT Process] RTF contained text.`);
                              contentPlaintext = result.text.toString();
                         }
                          if (!contentPlaintext) contentPlaintext = '[Empty RTF content after processing]';
                     } catch (rtfErr) {
                         console.error(`[DATA:ATTACHMENT Process] RTF de-encapsulation error in ${resourceType}/${resourceId} at ${path}:`, rtfErr);
                         contentPlaintext = '[Error processing RTF]';
                         processingErrorCount++;
                     }
                 } else if (finalContentType.startsWith('text/html')) {
                     try {
                         contentPlaintext = htmlToText(contentRaw.toString('utf8'), { wordwrap: false });
                     } catch (htmlErr) {
                         console.error(`[DATA:ATTACHMENT Process] HTML parsing error in ${resourceType}/${resourceId} at ${path}:`, htmlErr);
                         contentPlaintext = '[Error parsing HTML]';
                         processingErrorCount++;
                     }
                 } else if (finalContentType.includes('xml')) {
                     try {
                         const parsed = xmlParser.parse(contentRaw.toString('utf8'));
                         const extractText = (n: any): string => {
                             // Add newline instead of space to separate text from different elements
                             if (typeof n === 'string') return n + "\n";
                             if (typeof n !== 'object' || n === null) return "";
                             return Object.values(n).map(extractText).join("");
                         };
                         // Preserve single newlines, collapse multiple spaces/newlines
                         contentPlaintext = extractText(parsed).replace(/ +/g, ' ').replace(/\n+/g, '\n').trim();
                         if (!contentPlaintext) contentPlaintext = '[Empty XML content]';
                     } catch (xmlErr) {
                         console.error(`[DATA:ATTACHMENT Process] XML parsing error in ${resourceType}/${resourceId} at ${path}:`, xmlErr);
                         contentPlaintext = '[Error parsing XML]';
                         processingErrorCount++;
                     }
                 } else {
                     contentPlaintext = `[Binary content type: ${finalContentType}]`;
                 }
             }

             // Add to the results array
             processedAttachments.push({
                 resourceType,
                 resourceId,
                 path,
                 contentType: finalContentType,
                 json: JSON.stringify(node),
                 contentRaw,
                 contentPlaintext
             });
             processedCount++;

         } catch (processError) {
             console.error(`[DATA:ATTACHMENT Process] Error processing node in ${resourceType}/${resourceId} at ${path}:`, processError);
             processingErrorCount++;
             // Add error marker to results
             processedAttachments.push({
                 resourceType, resourceId, path,
                 contentType: finalContentType,
                 json: JSON.stringify({ error: `Processing failed: ${processError}` }),
                 contentRaw: null,
                 contentPlaintext: `[Error during attachment processing: ${processError}]`
             });
         }
    }

    // Internal recursive function to find attachments (remains the same)
    async function findAndProcessAttachments(obj: any, resourceType: string, resourceId: string, currentPath: string = '', processedPaths: Set<string>): Promise<void> {
        // ... logic remains identical ...
         if (!obj || typeof obj !== 'object') return;

         const knownPathsForType = KNOWN_ATTACHMENT_PATHS.get(resourceType);
         if (knownPathsForType) {
             for (const knownPath of knownPathsForType) {
                 if (processedPaths.has(knownPath)) continue;
                 const attachments = getValueAtPath(obj, knownPath);
                 if (Array.isArray(attachments)) {
                     for (const attachment of attachments) {
                         if (attachment && typeof attachment === 'object') {
                             await processSingleAttachmentNode(attachment, resourceType, resourceId, knownPath);
                             processedPaths.add(knownPath);
                         }
                     }
                 }
             }
         }

         const isAttachmentLike = (node: any): node is AttachmentLike =>
             node && typeof node === 'object' && node.contentType && (node.data || node.url);

         if (isAttachmentLike(obj) && !processedPaths.has(currentPath)) {
             console.log(`[DATA:ATTACHMENT Heuristic] Found potential attachment at path: ${currentPath || '<root>'}`);
             await processSingleAttachmentNode(obj, resourceType, resourceId, currentPath || 'content');
             processedPaths.add(currentPath);
             return;
         }

         if (Array.isArray(obj)) {
             await Promise.all(obj.map((item, index) =>
                 findAndProcessAttachments(item, resourceType, resourceId, `${currentPath}[${index}]`, processedPaths)
             ));
         } else if (!isAttachmentLike(obj)) {
             await Promise.all(Object.entries(obj).map(([key, value]) => {
                 const newPath = currentPath ? `${currentPath}.${key}` : key;
                 if (processedPaths.has(newPath)) return Promise.resolve();
                 return findAndProcessAttachments(value, resourceType, resourceId, newPath, processedPaths);
             }));
         }
    }

    // Iterate through the fetched record and process attachments
    try {
        // Use local variable fhirRecord here
        await Promise.allSettled(Object.entries(fhirRecord).map(async ([resourceType, resources]) => {
            for (const resource of resources) {
                if (resource && resource.id) {
                    const processedPaths = new Set<string>();
                    try {
                        await findAndProcessAttachments(resource, resourceType, resource.id, '', processedPaths);
                    } catch (resourceErr) {
                        console.error(`[DATA:ATTACHMENT] Error processing attachments for ${resourceType}/${resource.id}:`, resourceErr);
                        processingErrorCount++;
                    }
                } else {
                    // console.warn(`[DATA:ATTACHMENT] Skipping resource of type ${resourceType} because it lacks an ID or is invalid.`);
                }
            }
        }));
        console.log(`[DATA:ATTACHMENT] Processing complete. Found: ${processedCount}, URL Fetch Errors: ${fetchErrorCount}, Other Processing Errors: ${processingErrorCount}`);
    } catch (err) {
        console.error("[DATA:ATTACHMENT] Fatal error during attachment processing loop:", err);
        // Decide if this should throw or just log
    }
    // --- END Internal Attachment Processing Logic ---

    // Return the combined FullEHR object
    return { fhir: fhirRecord, attachments: processedAttachments };
}

// --- Attachment Processing ---
/* --- DELETED: Standalone processAttachments function --- */

// --- SQLite Persistence Functions ---
async function getSqliteFilePath(patientId: string): Promise<string> {
    // Get FHIR server origin
    const fhirUrl = new URL(EHR_FHIR_URL!);
    // Sanitize origin: remove protocol, replace non-alphanumeric chars with underscore
    const sanitizedOrigin = fhirUrl.origin
        .replace(/^https?:\/\//, '')  // Remove protocol
        .replace(/[^a-zA-Z0-9]/g, '_'); // Replace non-alphanumeric with underscore
    
    // Sanitize patient ID (just in case)
    const sanitizedPatientId = patientId.replace(/[^a-zA-Z0-9]/g, '_');
    
    return `${SQLITE_PERSISTENCE_DIR}/${sanitizedOrigin}__${sanitizedPatientId}.sqlite`;
}

async function loadSqliteFromDisk(patientId: string): Promise<Database | null> {
    if (!SQLITE_PERSISTENCE_ENABLED) return null;
    
    const filePath = await getSqliteFilePath(patientId);
    try {
        const fileExists = await Bun.file(filePath).exists();
        if (!fileExists) {
            console.log(`[SQLITE] No existing database file found for patient ${patientId}`);
            return null;
        }

        console.log(`[SQLITE] Loading database from disk for patient ${patientId}`);
        const db = new Database(filePath);
        
        // Verify the database has expected tables
        const tables = await db.query("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'fhir_%';").all() as { name: string }[];
        if (tables.length === 0) {
            console.warn(`[SQLITE] Database file exists but contains no FHIR tables. Creating new database.`);
            db.close();
            return null;
        }
        
        return db;
    } catch (error) {
        console.error(`[SQLITE] Error loading database from disk:`, error);
        return null;
    }
}

async function saveSqliteToDisk(patientId: string, db: Database): Promise<void> {
    if (!SQLITE_PERSISTENCE_ENABLED) return;

    const filePath = await getSqliteFilePath(patientId);
    let diskDb: Database | null = null;
    let allData: { name: string; sql: string; data: any[] }[] = [];

    try {
        console.log(`[SQLITE] Reading data from in-memory DB for patient ${patientId} before saving to disk...`);

        // 1. Read all schema and data from the source DB first
        const tables = await db.query("SELECT name, sql FROM sqlite_master WHERE type='table' AND (name LIKE 'fhir_%' OR name = 'attachments');").all() as { name: string; sql: string }[];

        for (const table of tables) {
            const tableData = await db.query(`SELECT * FROM "${table.name}";`).all();
            allData.push({ name: table.name, sql: table.sql, data: tableData });
            console.log(`[SQLITE Pre-Read] Read ${tableData.length} rows from ${table.name}.`);
        }

        console.log(`[SQLITE] Opening database file for writing: ${filePath}`);
        // 2. Create/Open the disk database
        diskDb = new Database(filePath);

        // 3. Perform write operations in a transaction on the disk DB
        console.log(`[SQLITE] Starting disk write transaction...`);
        diskDb.exec('BEGIN IMMEDIATE TRANSACTION;'); // Use IMMEDIATE for faster locking
        try {
            // First drop any existing tables in the disk DB
            for (const tableInfo of allData) {
                diskDb.exec(`DROP TABLE IF EXISTS "${tableInfo.name}";`);
            }

            // Then recreate tables and insert data
            for (const tableInfo of allData) {
                // Recreate table
                diskDb.exec(tableInfo.sql);

                // Insert data
                if (tableInfo.data.length > 0) {
                    const columnNames = Object.keys(tableInfo.data[0]).join(', ');
                    const placeholders = Object.keys(tableInfo.data[0]).map(() => '?').join(', ');
                    const stmt = diskDb.prepare(`INSERT INTO "${tableInfo.name}" (${columnNames}) VALUES (${placeholders})`);
                    // Consider using transaction for inserts if many rows
                    // diskDb.transaction(() => {
                        for (const row of tableInfo.data) {
                            // Ensure values are in the correct order matching columns
                            const values = Object.keys(tableInfo.data[0]).map(col => (row as any)[col]);
                            stmt.run(...values);
                        }
                    // })(); // End transaction for inserts
                    stmt.finalize();
                    console.log(`[SQLITE Disk Write] Inserted ${tableInfo.data.length} rows into ${tableInfo.name}.`);
                }
            }
            diskDb.exec('COMMIT;');
            console.log(`[SQLITE] Successfully saved database to ${filePath}`);
        } catch (error) {
            console.error(`[SQLITE] Error during disk save transaction:`, error);
            diskDb.exec('ROLLBACK;'); // Rollback on error
            throw error; // Re-throw the error
        }
    } catch (error) {
        console.error(`[SQLITE] Error saving database to disk:`, error);
        // No need to rollback here as the outer try/catch handles the overall process error
        throw error; // Re-throw the error
    } finally {
        // 4. Always close the disk database connection
        if (diskDb) {
            try {
                diskDb.close();
                console.log(`[SQLITE] Closed disk database connection.`);
            } catch (closeError) {
                console.error(`[SQLITE] Error closing disk database connection:`, closeError);
            }
        }
        // NOTE: We are NOT closing the source 'db' here. Its lifecycle is managed elsewhere (e.g., in the session).
    }
}

// Simplified function signature: Takes FullEHR directly
async function populateSqlite(fullEhr: FullEHR, db: Database, patientId?: string): Promise<void> { // Changed parameter
    console.log("[SQLITE] Populating SQLite DB from FullEHR data...");
    const { fhir: record, attachments } = fullEhr; // Destructure the input
    const resourceTypes = Object.keys(record);

    db.exec('BEGIN TRANSACTION;');
    try {
        // Drop all existing FHIR tables and attachments table
        const tables = await db.query("SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE 'fhir_%' OR name = 'attachments');").all() as { name: string }[];
        for (const table of tables) {
            db.exec(`DROP TABLE IF EXISTS "${table.name}";`);
        }
        console.log("[SQLITE] Dropped existing tables.");

        // 1. Create tables and populate main resources (using 'record' from destructuring)
        for (const resourceType of resourceTypes) {
            const safeTableName = `fhir_${resourceType.replace(/[^a-zA-Z0-9_]/g, '_')}`;
            db.exec(`CREATE TABLE "${safeTableName}" (id TEXT PRIMARY KEY, resource_json TEXT NOT NULL);`);
            const stmt = db.prepare(`INSERT INTO "${safeTableName}" (id, resource_json) VALUES (?, ?)`);
            let count = 0;
            // Use 'record' here
            for (const resource of record[resourceType]) {
                if (resource && resource.id) { // Check resource validity
                    try {
                        stmt.run(resource.id, JSON.stringify(resource));
                        count++;
                    } catch (insertErr: any) {
                        if (insertErr?.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
                            console.warn(`[SQLITE] Duplicate ID '${resource.id}' for ${resourceType}. Skipping.`);
                        } else {
                            throw insertErr;
                        }
                    }
                } else {
                    console.warn(`[SQLITE] Resource ${resourceType} missing ID or invalid, skipping.`);
                }
            }
            stmt.finalize();
            console.log(`[SQLITE] Inserted ${count} resources into ${safeTableName}.`);
        }

        // 2. Create and populate attachments table from processed data (using 'attachments' from destructuring)
        console.log(`[SQLITE] Populating attachments table with ${attachments.length} entries...`);
        db.exec(`
            CREATE TABLE attachments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                resource_type TEXT NOT NULL,
                resource_id TEXT NOT NULL,
                path TEXT NOT NULL,
                content_type TEXT,
                json TEXT NOT NULL,
                content_raw BLOB,
                content_plaintext TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(resource_type, resource_id, path, json)
            )
        `);

        if (attachments.length > 0) {
            const attachStmt = db.prepare(`
                INSERT OR REPLACE INTO attachments (
                    resource_type, resource_id, path, content_type, json, content_raw, content_plaintext
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            let attachCount = 0;
            // Use 'attachments' here
            for (const attach of attachments) {
                try {
                    attachStmt.run(
                        attach.resourceType,
                        attach.resourceId,
                        attach.path,
                        attach.contentType,
                        attach.json,
                        attach.contentRaw,
                        attach.contentPlaintext
                    );
                    attachCount++;
                } catch (attachInsertErr: any) {
                    // Log error but continue transaction if possible
                    console.error(`[SQLITE] Failed to insert attachment for ${attach.resourceType}/${attach.resourceId} at ${attach.path}:`, attachInsertErr);
                    // Consider how fatal this should be. For now, just log.
                }
            }
            attachStmt.finalize();
            console.log(`[SQLITE] Inserted ${attachCount} attachments.`);
        }

        db.exec('COMMIT;');
        console.log("[SQLITE] DB population complete.");

        // 3. Save to disk if persistence is enabled
        if (SQLITE_PERSISTENCE_ENABLED && patientId) {
            await saveSqliteToDisk(patientId, db);
        }
    } catch (err) {
        console.error("[SQLITE] Error during DB population transaction:", err);
        try {
            db.exec('ROLLBACK;');
            console.log("[SQLITE] Transaction rolled back.");
        } catch (rollbackErr) {
            console.error("[SQLITE] Error during rollback:", rollbackErr);
        }
        throw err;
    }
}

// --- Modify handleResync to use new data flow ---
async function handleResync(session: UserSession) {
    console.log(`[RESYNC] Starting resync for session: ${session.sessionId}`);
    if (!session.ehrAccessToken || !EHR_FHIR_URL || !session.ehrPatientId) {
        console.error("[RESYNC] Cannot resync: Missing EHR access token, FHIR URL, or Patient ID in session.");
        throw new Error("Cannot resync data: Session is missing required EHR context.");
    }
    const now = Math.floor(Date.now() / 1000);
    if (session.ehrTokenExpiry && session.ehrTokenExpiry <= now) {
        console.error(`[RESYNC] EHR token expired. Cannot resync.`);
        throw new Error("EHR session token has expired. Re-auth required.");
    }
    console.log(`[RESYNC] Attempting resync with current EHR token.`);
    console.log(`[RESYNC] Clearing existing data (in-memory fullEhr).`);
    // Clear the FullEHR structure
    session.fullEhr = { fhir: {}, attachments: [] };

    // --- Database Handling during Resync ---
    // Close existing database connection if it exists and is open
    if (session.db) {
        try {
            session.db.close();
            session.db = undefined; // Remove reference
            console.log("[RESYNC] Closed existing database connection.");
        } catch (e) {
            console.warn("[RESYNC] Error closing existing database (may already be closed):", e);
            session.db = undefined; // Still remove reference
        }
    }

    // Create new database connection ONLY if needed (persistence or query tool usage)
    // It will be lazy-loaded by getSessionDb or created during populateSqlite if persistence enabled
    let dbForPopulation: Database | null = null;
    if (SQLITE_PERSISTENCE_ENABLED && session.ehrPatientId) {
        dbForPopulation = await loadSqliteFromDisk(session.ehrPatientId);
        if (dbForPopulation) {
            console.log("[RESYNC] Loaded existing DB from disk for repopulation.");
            session.db = dbForPopulation; // Store the loaded DB back in the session
        } else {
            console.log("[RESYNC] No existing DB found on disk, creating new in-memory DB for population.");
            dbForPopulation = new Database(':memory:');
            session.db = dbForPopulation; // Store the new DB in the session
        }
    } else {
        console.log("[RESYNC] Persistence disabled or no patient ID. DB will be created in-memory if needed later by query_record.");
        // Don't create session.db here unless explicitly needed
    }
    // --- End Database Handling ---


    try {
        // 1. Fetch data (includes attachment processing, returns FullEHR)
        console.log("[RESYNC] Fetching EHR data and processing attachments...");
        const fetchedFullEhr = await fetchEhrData(session.ehrAccessToken, EHR_FHIR_URL!, session.ehrPatientId!);
        session.fullEhr = fetchedFullEhr; // Update session with the new FullEHR

        // 2. Populate the database IF a connection exists (i.e., persistence enabled)
        if (session.db) {
            console.log("[RESYNC] Populating database...");
             // Pass the fetched data and the existing/newly created DB connection
            await populateSqlite(session.fullEhr, session.db, session.ehrPatientId);
        } else {
            console.log("[RESYNC] Skipping database population (persistence disabled or DB not loaded).");
        }

        console.log(`[RESYNC] Data re-fetched and processed into memory (fullEhr). DB populated if applicable.`);
    } catch (fetchOrPopulateErr) {
        console.error(`[RESYNC] Failed during fetch or population:`, fetchOrPopulateErr);
        // Attempt to close the DB if it was opened during this resync attempt
        try { session.db?.close(); session.db = undefined; } catch(e) { console.warn("[RESYNC] Error closing DB after failed resync:", e); }
        throw new Error(`Failed to refresh data from EHR: ${fetchOrPopulateErr instanceof Error ? fetchOrPopulateErr.message : String(fetchOrPopulateErr)}`);
    }
}

// Helper function to ensure DB is initialized when needed (e.g., for query_record)
async function getSessionDb(session: UserSession): Promise<Database> {
    if (session.db) {
        // Check if DB is actually open (Bun throws if closed)
        try {
            session.db.query("PRAGMA user_version;").get(); // Simple query
            return session.db;
        } catch (e) {
            console.warn(`[DB GET] Session DB for patient ${session.ehrPatientId} was closed. Reinitializing.`);
            session.db = undefined; // Clear closed reference
        }
    }

    console.log(`[DB GET] Initializing DB connection for session (Patient: ${session.ehrPatientId}).`);
    let newDb: Database | null = null;
    if (SQLITE_PERSISTENCE_ENABLED && session.ehrPatientId) {
        newDb = await loadSqliteFromDisk(session.ehrPatientId);
        if (newDb) {
            console.log("[DB GET] Loaded existing DB from disk.");
        } else {
            console.log("[DB GET] No existing DB on disk, creating new in-memory DB and populating.");
            newDb = new Database(':memory:');
            // Populate the newly created DB from the in-memory fullEhr data
            if (session.fullEhr && (Object.keys(session.fullEhr.fhir).length > 0 || session.fullEhr.attachments.length > 0)) {
                await populateSqlite(session.fullEhr, newDb, session.ehrPatientId);
            } else {
                 console.warn("[DB GET] In-memory fullEhr data is empty, cannot populate new DB.");
             }
        }
    } else {
        console.log("[DB GET] Persistence disabled or no patient ID, creating new in-memory DB and populating.");
        newDb = new Database(':memory:');
        // Populate the newly created DB from the in-memory fullEhr data
        if (session.fullEhr && (Object.keys(session.fullEhr.fhir).length > 0 || session.fullEhr.attachments.length > 0)) {
            await populateSqlite(session.fullEhr, newDb, session.ehrPatientId);
        } else {
             console.warn("[DB GET] In-memory fullEhr data is empty, cannot populate new DB.");
         }
    }
    session.db = newDb; // Store the initialized DB in the session
    return session.db;
}

// --- Tool Schemas & Logic ---

// Input Schema (Updated Documentation)
const GrepRecordInputSchema = z.object({
    query: z.string().min(1).describe("The text string or JavaScript-style regular expression to search for (case-insensitive). Example: 'heart attack|myocardial infarction|mi'"),
    resource_types: z.array(z.string()).optional().describe(
        `List of FHIR resource types (e.g., ["DocumentReference"]) or the special keyword "Attachment" to limit the search scope.
        - If omitted or empty: Searches all loaded resource types AND all attachments.
        - If ["DocumentReference"]: Searches only DocumentReference resources AND attachments belonging to DocumentReferences.
        - If ["Attachment"]: Searches ONLY the plaintext content of all attachments.
        - If ["DocumentReference", "Attachment"]: Searches DocumentReference resources AND ALL attachments.`
    )
});

// Output Schemas (New)
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


// query_record schemas remain the same...
const QueryRecordInputSchema = z.object({
    sql: z.string().min(1).describe("The read-only SQL SELECT statement to execute against the in-memory FHIR data.")
});
const QueryRecordOutputSchema = z.array(z.record(z.unknown())).describe("An array of rows returned by the SQL query. Each row is an object where keys are column names.");
// ask_question schemas remain the same...
const AskQuestionInputSchema = z.object({
    question: z.string().min(1).describe("The natural language question to ask about the patient's record.")
});
const AskQuestionOutputSchema = z.object({ answer: z.string() }).describe("The natural language answer generated by the LLM based on the record context."); // Simple wrapper for now
// resync_record schemas remain the same...
const ResyncRecordInputSchema = z.object({}).describe("No arguments needed."); // Explicitly empty
const ResyncRecordOutputSchema = z.object({ message: z.string() }).describe("A confirmation message indicating the outcome of the resync attempt.");

// Input Schema for Eval (Updated Docs)
const EvalRecordInputSchema = z.object({
    code: z.string().min(1).describe(
        `A string containing the body of an async JavaScript function.
        This function will receive 'fullEhr' ({ fhir: Record<string, any[]>, attachments: ProcessedAttachment[] }), a limited 'console' object, and the Lodash library as '_' (underscore).
        Console output (log, warn, error) will be captured.
        It MUST end with a 'return' statement providing a JSON-serializable value.
        Example: 'const conditions = fullEhr.fhir["Condition"] || []; return _.filter(conditions, c => c.clinicalStatus?.coding?.[0]?.code === "active");'`
    )
});

// Output Schema for Eval (Updated Fields)
const EvalRecordOutputSchema = z.object({
    result: z.any().optional().describe("The JSON-serializable result returned by the executed code (if successful)."),
    logs: z.array(z.string()).describe("An array of messages logged via console.log or console.warn during execution."),
    errors: z.array(z.string()).describe("An array of messages logged via console.error during execution.")
}).describe("The result of executing the provided JavaScript code against the patient record, including captured console output.");


// --- Logic Functions ---

// grepRecordLogic (Rewritten to use FullEHR, no DB)
async function grepRecordLogic(
    fullEhr: FullEHR, // Takes FullEHR as input
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
    // Use a composite key for attachments now (resType/resId/path) as DB ID is gone
    const matchedAttachmentKeys = new Set<string>();
    const matchedResourcesResult: z.infer<typeof GrepMatchedResourceSchema>[] = [];
    const matchedAttachmentsResult: z.infer<typeof GrepMatchedAttachmentSchema>[] = [];

    let resourcesSearched = 0;
    let attachmentsSearched = 0;

    // --- Determine Search Scope (Logic remains the same) ---
    const searchAllResources = !inputResourceTypes || inputResourceTypes.length === 0 || inputResourceTypes.includes("Attachment") && inputResourceTypes.length > 1;
    const searchAllAttachments = !inputResourceTypes || inputResourceTypes.length === 0 || inputResourceTypes.includes("Attachment");
    const searchOnlyAttachments = inputResourceTypes?.length === 1 && inputResourceTypes[0] === "Attachment";

    let typesForResourceSearch: string[] = [];
    let typesForAttachmentFilter: string[] | null = null; // null means search all attachments

    if (searchOnlyAttachments) {
        typesForResourceSearch = []; // Don't search any resources
        typesForAttachmentFilter = null; // Search all attachments
        console.log("[GREP] Scope: Attachments Only");
    } else if (!inputResourceTypes || inputResourceTypes.length === 0) {
        typesForResourceSearch = Object.keys(fullEhr.fhir); // Default: all resource types from fullEhr.fhir
        typesForAttachmentFilter = null; // Default: all attachments
        console.log("[GREP] Scope: All Resources and All Attachments (Default)");
    } else {
        // Filter out "Attachment" keyword for resource search
        typesForResourceSearch = inputResourceTypes.filter(t => t !== "Attachment");
        if (inputResourceTypes.includes("Attachment")) {
            // If "Attachment" is present, search *all* attachments
            typesForAttachmentFilter = null;
             console.log(`[GREP] Scope: Resources [${typesForResourceSearch.join(', ')}] and ALL Attachments`);
        } else {
            // Only search attachments belonging to the specified resource types
            typesForAttachmentFilter = typesForResourceSearch;
             console.log(`[GREP] Scope: Resources [${typesForResourceSearch.join(', ')}] and their Attachments`);
        }
    }
    // --- End Determine Search Scope ---


    // 1. Search FHIR Resources in memory (if applicable)
    if (typesForResourceSearch.length > 0) {
        console.log(`[GREP] Searching ${typesForResourceSearch.length} resource types in memory (fullEhr.fhir)...`);
        for (const resourceType of typesForResourceSearch) {
             // Ensure the type exists in the record before iterating
            if (fullEhr.fhir[resourceType]) { // Use fullEhr.fhir
                for (const resource of fullEhr.fhir[resourceType]) { // Use fullEhr.fhir
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
                                resource: resource // Pass the full resource object
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


    // 2. Search Attachments in memory (fullEhr.attachments)
    console.log(`[GREP] Searching ${fullEhr.attachments.length} attachments in memory (fullEhr.attachments) (Filter: ${typesForAttachmentFilter ? `[${typesForAttachmentFilter.join(', ')}]` : 'None'})...`);
    for (const attachment of fullEhr.attachments) {
        attachmentsSearched++;
        const attachmentKey = `${attachment.resourceType}/${attachment.resourceId}#${attachment.path}`; // Unique key

        // Apply resource type filter if needed
        if (typesForAttachmentFilter && !typesForAttachmentFilter.includes(attachment.resourceType)) {
            continue; // Skip attachment if its parent resource type is not in the filter list
        }

        if (matchedAttachmentKeys.has(attachmentKey)) continue;

        // Check if plaintext exists and is non-empty before testing
        if (attachment.contentPlaintext && attachment.contentPlaintext.length > 0) {
            if (regex.test(attachment.contentPlaintext)) {
                matchedAttachmentKeys.add(attachmentKey);
                // Construct the output object (no database ID anymore)
                matchedAttachmentsResult.push({
                    resourceType: attachment.resourceType,
                    resourceId: attachment.resourceId,
                    path: attachment.path,
                    contentType: attachment.contentType, // Already have this from ProcessedAttachment
                    plaintext: attachment.contentPlaintext // Include full plaintext
                });
            }
        }
    }
    console.log(`[GREP] Found ${matchedAttachmentsResult.length} matching attachments after searching ${attachmentsSearched} in memory.`);


    return {
        matched_resources: matchedResourcesResult,
        matched_attachments: matchedAttachmentsResult,
        resources_searched_count: resourcesSearched,
        attachments_searched_count: attachmentsSearched, // Count of attachments iterated over in memory
        resources_matched_count: matchedResourcesResult.length,
        attachments_matched_count: matchedAttachmentsResult.length,
    };
}


// queryRecordLogic still needs the DB - ensure getSessionDb is called before this
async function queryRecordLogic(db: Database, sql: string): Promise<z.infer<typeof QueryRecordOutputSchema>> {
    // ... implementation remains the same ...
     const sqlLower = sql.trim().toLowerCase();
     if (!sqlLower.startsWith('select')) throw new Error("Only SELECT queries are allowed.");
     const writeKeywords = ['insert', 'update', 'delete', 'drop', 'create', 'alter', 'attach', 'detach', 'replace', 'pragma'];
     if (writeKeywords.some(keyword => sqlLower.includes(keyword))) throw new Error("Potentially harmful SQL operation detected.");
     try {
         // Ensure tables exist before querying? Maybe too complex. Assume caller knows schema.
         const results = await db.query(sql).all() as Record<string, unknown>[]; // Use Bun's query().all() and assert type
         if (results.length > 500) { console.warn(`[SQLITE] Query returned ${results.length} rows. Truncating to 500.`); return results.slice(0, 500); }
         return results;
     } catch (err) { console.error("[SQLITE] Execution Error:", err); throw new Error(`SQL execution failed: ${(err as Error).message}`); }
}

// evalRecordLogic (Updated for FullEHR & Console Capture)
async function evalRecordLogic(fullEhr: FullEHR, userCode: string): Promise<{ result?: any, logs: string[], errors: string[] }> { // Takes FullEHR
    const logs: string[] = [];
    const errors: string[] = [];

    // Capture console output within the sandbox
    const sandboxConsole = { /* ... same as before ... */
        log: (...args: any[]) => {
            const message = args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ');
            logs.push(message);
            console.log('[SANDBOX Eval LOG]', message); // Also log to server console
        },
        warn: (...args: any[]) => {
            const message = args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ');
            logs.push(`WARN: ${message}`); // Distinguish warnings if needed
            console.warn('[SANDBOX Eval WARN]', message); // Also log to server console
        },
        error: (...args: any[]) => {
            const message = args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ');
            errors.push(message);
            console.error('[SANDBOX Eval ERROR]', message); // Also log to server console
        },
    };

    const sandbox = {
        fullEhr: fullEhr, // Pass fullEhr instead of record
        console: sandboxConsole,
        _: _, // Inject Lodash as '_'
        __resultPromise__: undefined as Promise<any> | undefined
    };

    const scriptCode = `
        async function userFunction(fullEhr, console, _) { // Use fullEhr in function signature
            "use strict";
            ${userCode}
        }
        __resultPromise__ = userFunction(fullEhr, console, _); // Pass fullEhr when calling
    `;

    // ... rest of the execution logic remains the same ...
     const context = vm.createContext(sandbox);
     const script = new vm.Script(scriptCode, { filename: 'userCode.vm' });
     const timeoutMs = 5000;
     let executionResult: any = undefined; // Store result separately

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
             JSON.stringify(executionResult); // Validate serializability
              return { result: executionResult, logs, errors }; // Return result + logs/errors
         } catch (stringifyError: any) {
             console.error("[TOOL eval_record] Result is not JSON serializable:", stringifyError);
              // Still return logs/errors even if result is bad
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
          errors.push(`Execution Error: ${errorMessage}`); // Add execution error to errors array
          return { result: undefined, logs, errors }; // Return undefined result + logs/errors
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

            // Close the associated SQLite DB IF IT EXISTS (Fix for optional db)
            if (session.db) {
                try {
                    session.db.close();
                    console.log(`[AUTH] Closed database connection for revoked session (Token: ${tokenToRevoke.substring(0, 8)}...).`);
                } catch(e) {
                    console.error(`Error closing DB for session on revoke (Token: ${tokenToRevoke.substring(0, 8)}...):`, e);
                }
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


            console.log(`[AUTH] MCP Token ${tokenToRevoke.substring(0, 8)}... revoked, session cleared, and DB closed (if existed).`);
        } else {
            console.log(`[AUTH] MCP Token ${tokenToRevoke.substring(0, 8)}... not found or already revoked.`);
        }
    }
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
    GrepRecordInputSchema.shape, // Use updated input schema shape
    async (args, extra) => {
        const transportSessionId = extra.sessionId;
        if (!transportSessionId) {
            console.error(`[TOOL grep_record] Error: Missing transport sessionId.`);
            throw new McpError(ErrorCode.InvalidRequest, "Missing session identifier.");
        }

        const transportEntry = activeSseTransports.get(transportSessionId);
        if (!transportEntry) {
            console.warn(`[TOOL grep_record] Received call for unknown/disconnected transport sessionId: ${transportSessionId}`);
            throw new McpError(ErrorCode.InvalidRequest, "Invalid or disconnected session.");
        }

        const mcpAccessToken = transportEntry.mcpAccessToken;
        const session = activeSessions.get(mcpAccessToken);

        if (!session) {
            console.error(`[TOOL grep_record] Internal Error: No session found for active transport ${transportSessionId} (Token: ${mcpAccessToken.substring(0,8)}...)`);
            throw new McpError(ErrorCode.InternalError, "Session data not found for active connection.");
        }

        try {
            const resultData = await grepRecordLogic(session.fullEhr, args.query, args.resource_types);

            // Limit result size before stringifying (important now we return full resources)
             const MAX_JSON_LENGTH = 2 * 1024 * 1024; // 2 MB limit (adjust as needed)
             let resultString = JSON.stringify(resultData, null, 2);
             if (resultString.length > MAX_JSON_LENGTH) {
                 console.warn(`[TOOL grep_record] Result too large (${resultString.length} bytes), truncating heavily.`);
                 // Truncate both resources and attachments arrays significantly
                 resultData.matched_resources = resultData.matched_resources.slice(0, 5); // Keep only first 5 matching resources
                 resultData.matched_attachments = resultData.matched_attachments.slice(0, 10); // Keep only first 10 matching attachments
                 // Remove plaintext from truncated attachments to save space
                 resultData.matched_attachments.forEach(att => (att as any).plaintext = "[Truncated due to size limit]"); // Use 'any' to bypass type check for this ad-hoc change
                 resultString = JSON.stringify({
                      warning: `Result truncated due to size limit (${(MAX_JSON_LENGTH / 1024 / 1024).toFixed(1)} MB). Showing subset of matches.`,
                      ...resultData
                      }, null, 2);
                  // Ensure it's *definitely* under the limit now
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

// query_record registration remains the same...
mcpServer.tool(
    "query_record",
    QueryRecordInputSchema.shape, // Pass .shape
    async (args, extra) => {
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

        try {
            // Ensure fullEhr is loaded (implicit resync) - still useful before DB access
            if (!session.fullEhr || Object.keys(session.fullEhr.fhir).length === 0 && session.fullEhr.attachments.length === 0 ) {
                console.warn(`[TOOL query_record] Session ${session.sessionId} fullEhr missing or empty. Attempting implicit resync.`);
                await handleResync(session);
                // After resync, check again if data is present
                if (!session.fullEhr || Object.keys(session.fullEhr.fhir).length === 0 && session.fullEhr.attachments.length === 0 ) {
                     throw new Error("Data could not be loaded after resync attempt.");
                 }
            }

            // Ensure DB is initialized for this session using the helper
            const db = await getSessionDb(session);

            const resultData = await queryRecordLogic(db, args.sql); // Pass the initialized DB
             // ... (Size limiting logic remains the same) ...
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

// eval_record registration (Updated for FullEHR)
mcpServer.tool(
    "eval_record",
    EvalRecordInputSchema.shape,
    async (args, extra) => {
        // ... (session lookup logic remains the same) ...
         const transportSessionId = extra.sessionId;
         if (!transportSessionId) {
             console.error(`[TOOL eval_record] Error: Missing transport sessionId.`);
             throw new McpError(ErrorCode.InvalidRequest, "Missing session identifier.");
         }

         const transportEntry = activeSseTransports.get(transportSessionId);
         if (!transportEntry) {
             console.warn(`[TOOL eval_record] Received call for unknown/disconnected transport sessionId: ${transportSessionId}`);
             throw new McpError(ErrorCode.InvalidRequest, "Invalid or disconnected session.");
         }

         const mcpAccessToken = transportEntry.mcpAccessToken;
         const session = activeSessions.get(mcpAccessToken);

         if (!session) {
             console.error(`[TOOL eval_record] Internal Error: No session found for active transport ${transportSessionId} (Token: ${mcpAccessToken.substring(0,8)}...)`);
             throw new McpError(ErrorCode.InternalError, "Session data not found for active connection.");
         }


        try {
             // Ensure fullEhr is loaded (implicit resync)
             let needsResync = !session.fullEhr || Object.keys(session.fullEhr.fhir).length === 0 && session.fullEhr.attachments.length === 0;
             // No DB check needed here unless the eval code itself needs it (which is unlikely/discouraged)
              if (needsResync) {
                  console.warn(`[TOOL eval_record] Session ${session.sessionId} fullEhr missing or empty. Attempting implicit resync.`);
                  await handleResync(session);
                  // Check again after resync
                  if (!session.fullEhr || Object.keys(session.fullEhr.fhir).length === 0 && session.fullEhr.attachments.length === 0 ) {
                       throw new Error("Data could not be loaded after resync attempt for eval.");
                   }
              }


            // Execute the sandboxed code - passing fullEhr
            const evalOutput = await evalRecordLogic(session.fullEhr, args.code); // Pass fullEhr

            // ... (Output processing and size limiting remains the same) ...
             const finalOutput = {
                 result: evalOutput.result, // Might be undefined if execution failed or result wasn't serializable
                 logs: evalOutput.logs,
                 errors: evalOutput.errors,
             };

             const MAX_JSON_LENGTH = 1 * 1024 * 1024; // 1 MB limit
             let resultString = JSON.stringify(finalOutput, null, 2);

             if (resultString.length > MAX_JSON_LENGTH) {
                 console.warn(`[TOOL eval_record] Final output (result + logs/errors) too large (${resultString.length} bytes), returning error message instead.`);
                 // Return only the logs/errors and a message indicating the result was too large
                 const truncatedOutput = {
                     result: "[Result omitted due to excessive size]",
                     logs: evalOutput.logs, // Keep logs/errors if possible
                     errors: [...evalOutput.errors, `Execution successful, but the JSON result combined with logs/errors is too large (${(resultString.length / 1024 / 1024).toFixed(1)} MB) to return.`],
                 };
                  resultString = JSON.stringify(truncatedOutput, null, 2);

                  // Final safety check in case logs/errors themselves are huge
                  if (resultString.length > MAX_JSON_LENGTH) {
                      resultString = JSON.stringify({
                          result: "[Result omitted due to excessive size]",
                          logs: ["Logs omitted due to excessive size"],
                          errors: ["Errors omitted due to excessive size", "Output exceeded size limit"]
                      });
                  }
             }
              // Determine if the overall operation should be marked as an MCP error
              // Mark as error if the eval logic caught a fatal error (represented by non-empty errors array AND undefined result)
              const isError = finalOutput.errors.length > 0 && finalOutput.result === undefined;

             return { content: [{ type: "text", text: resultString }], isError: isError }; // Set isError flag based on execution outcome


        } catch (resyncError: any) { // Catch errors from handleResync specifically
             // ... (Resync error handling remains the same) ...
             console.error(`Error during implicit resync for eval_record:`, resyncError);
              // If resync fails, we can't run eval. Return specific error.
              const errorOutput = {
                  result: undefined,
                  logs: [],
                  errors: [`Failed to prepare data for evaluation: ${resyncError.message}`]
              };
              return { content: [{ type: "text", text: JSON.stringify(errorOutput, null, 2)}], isError: true };
        }
    }
);

// resync_record registration (No changes needed inside the handler itself, handleResync does the work)
mcpServer.tool(
    "resync_record",
    ResyncRecordInputSchema.shape, // Pass .shape
    async (args, extra) => {
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

        // Ensure EHR_FHIR_URL is defined before proceeding
        if (!EHR_FHIR_URL) {
            console.error("[AUTH Callback] Configuration Error: EHR_FHIR_URL is not defined.");
            throw new Error("Server configuration error: FHIR Base URL is missing.");
        }

        // Try to load existing database from disk first (but don't populate yet)
        let db: Database | null = null;
        if (SQLITE_PERSISTENCE_ENABLED) {
            // Okay to await this brief check/load
            db = await loadSqliteFromDisk(patientId);
            if (db) {
                console.log(`[AUTH Callback] Loaded existing DB from disk for patient ${patientId}.`);
            }
        }

        // If no database loaded from disk, create new in-memory database (still don't populate)
        if (!db) {
            db = new Database(':memory:');
            console.log(`[AUTH Callback] Created new in-memory DB for patient ${patientId}.`);
        }

        // --- Get MCP Client Info (logic remains the same) ---
        let mcpClientInfo: OAuthClientInformationFull | undefined;
        if (DISABLE_CLIENT_CHECKS) {
            // ... (placeholder logic) ...
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


        // --- Create UserSession (INITIAL state - empty fullEhr) ---
        const session: UserSession = {
            sessionId: "", // Will be set by transport later
            mcpAccessToken: "", // Will be set during token exchange
            ehrAccessToken: ehrTokens.access_token,
            ehrTokenExpiry: ehrTokens.expires_in ? Math.floor(Date.now() / 1000) + ehrTokens.expires_in : undefined,
            ehrGrantedScopes: ehrTokens.scope,
            ehrPatientId: patientId,
            fullEhr: { fhir: {}, attachments: [] }, // Initialize as empty! Data fetched in background.
            db, // Assign the potentially initialized DB connection
            mcpClientInfo, // Assign the MCP client info
            mcpAuthCodeChallenge: pendingAuth.mcpCodeChallenge, // Store challenge for token exchange
            mcpAuthCodeRedirectUri: pendingAuth.mcpRedirectUri, // Store redirect URI for token exchange
        };

        // Generate MCP Auth Code and map it
        const mcpAuthCode = `mcp-code-${uuidv4()}`;
        session.mcpAuthCode = mcpAuthCode; // Add temporary code to session object
        sessionsByMcpAuthCode.set(mcpAuthCode, session); // Map the temporary code to the session object

        // --- Redirect User Immediately ---
        const clientRedirectUrl = new URL(pendingAuth.mcpRedirectUri);
        clientRedirectUrl.searchParams.set("code", mcpAuthCode); // Use the MCP code
        if (pendingAuth.mcpOriginalState) clientRedirectUrl.searchParams.set("state", pendingAuth.mcpOriginalState);
        console.log(`[AUTH Callback] Redirecting back to MCP Client with MCP Auth Code: ${clientRedirectUrl.toString()}`);
        res.redirect(302, clientRedirectUrl.toString());

        // --- Trigger Background Data Fetch & Populate --- 
        // Use an IIAFE (Immediately Invoked Async Function Expression) - DO NOT await this
        console.log(`[AUTH Callback] Triggering background data fetch/populate for patient ${patientId}...`);
        (async () => {
            const bgPatientId = session.ehrPatientId!; // Capture for logging
            console.log(`[AUTH Callback BG ${bgPatientId}] Starting background task.`);
            try {
                // Ensure we have necessary info (redundant check, but safe)
                if (!session.ehrAccessToken || !EHR_FHIR_URL || !session.ehrPatientId) {
                    throw new Error("Missing necessary session info for background fetch.");
                }
                
                // 1. Fetch data (includes attachment processing, returns FullEHR)
                console.log(`[AUTH Callback BG ${bgPatientId}] Fetching EHR data...`);
                const fetchedData = await fetchEhrData(session.ehrAccessToken, EHR_FHIR_URL!, session.ehrPatientId!);
                console.log(`[AUTH Callback BG ${bgPatientId}] Fetched ${Object.keys(fetchedData.fhir).length} resource types and ${fetchedData.attachments.length} attachments.`);

                // 2. Update the session's fullEhr in place
                // Check if session still exists (might have been revoked quickly)
                const currentSession = activeSessions.get(session.mcpAccessToken) || sessionsByMcpAuthCode.get(session.mcpAuthCode || '');
                if (currentSession) {
                    currentSession.fullEhr = fetchedData;
                    console.log(`[AUTH Callback BG ${bgPatientId}] Updated session fullEhr in memory.`);
                    
                     // 3. Populate the database if it exists in the session
                    if (currentSession.db) {
                        console.log(`[AUTH Callback BG ${bgPatientId}] Populating database...`);
                        // Pass the updated currentSession.fullEhr, the existing db, and patientId
                        await populateSqlite(currentSession.fullEhr, currentSession.db, currentSession.ehrPatientId);
                        console.log(`[AUTH Callback BG ${bgPatientId}] Database population complete.`);
                    } else {
                         console.log(`[AUTH Callback BG ${bgPatientId}] Skipping database population (DB not initialized/enabled in session).`);
                    }
                } else {
                     console.log(`[AUTH Callback BG ${bgPatientId}] Session no longer active. Skipping fullEhr update and DB population.`);
                 }

            } catch (backgroundError) {
                console.error(`[AUTH Callback BG ${bgPatientId}] Error during background data fetch/populate:`, backgroundError);
                // Optional: Update session state to indicate error?
                // if (session) { session.syncStatus = 'error'; }
            }
        })(); // Immediately invoke the async function


    } catch (error) { // This outer catch handles errors *before* the redirect
        console.error("[AUTH Callback] Error processing EHR callback before redirect:", error);
        // --- Error redirection logic (remains the same) ---
        const clientRedirectUrl = new URL(pendingAuth?.mcpRedirectUri || '/error_fallback');
        clientRedirectUrl.searchParams.set("error", "ehr_callback_failed");
        clientRedirectUrl.searchParams.set("error_description", error instanceof Error ? error.message : "Processing failed after EHR callback");
        if (pendingAuth?.mcpOriginalState) clientRedirectUrl.searchParams.set("state", pendingAuth.mcpOriginalState);
        if (!res.headersSent) { // Ensure we don't try to redirect twice
            res.redirect(302, clientRedirectUrl.toString());
        }
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

async function startServer() {
    let server;
    let serverOptions = {}; // Options for https server

    if (MCP_SERVER_HTTPS_ENABLED) {
        console.log("[HTTP] HTTPS is enabled. Loading certificates...");
        if (!MCP_SERVER_CERT_PATH || !MCP_SERVER_KEY_PATH) {
            console.error("[HTTP] FATAL ERROR: HTTPS is enabled, but MCP_SERVER_CERT_PATH or MCP_SERVER_KEY_PATH is not set in environment variables.");
            process.exit(1);
        }
        try {
            const cert = await fs.readFile(MCP_SERVER_CERT_PATH);
            const key = await fs.readFile(MCP_SERVER_KEY_PATH);
            serverOptions = { key: key, cert: cert };
            console.log(`[HTTP] Certificates loaded from ${MCP_SERVER_CERT_PATH} and ${MCP_SERVER_KEY_PATH}`);
            server = https.createServer(serverOptions, app); // Create HTTPS server
        } catch (error) {
            console.error(`[HTTP] FATAL ERROR: Failed to read certificate files: ${error}`);
            process.exit(1);
        }
    } else {
        console.log("[HTTP] HTTPS is disabled. Creating HTTP server.");
        server = http.createServer(app); // Create HTTP server
    }

    server.listen(MCP_SERVER_PORT, () => {
        // Use the determined base URL for the log message
        console.log(`[HTTP] Server listening on ${MCP_SERVER_BASE_URL}`);
    });

    // Graceful shutdown setup (ensure it references the correct server instance)
    const shutdown = async () => {
        console.log("\nShutting down...");
        server.close(async (err) => { // Use the created server instance
            if (err) {
                console.error(`Error closing ${MCP_SERVER_PROTOCOL} server:`, err);
            } else {
                console.log(`${MCP_SERVER_PROTOCOL} server closed.`);
            }
        });

        await mcpServer.close().catch(e => console.error("Error closing MCP server:", e));

        for (const [id, session] of activeSessions.entries()) {
            // Close DB if it exists for the session
            if (session.db) {
                try {
                    session.db.close();
                } catch (e) {
                    console.error(`Error closing DB for session ${id}:`, e);
                }
            }
        }
        activeSessions.clear();
        console.log("Closed active sessions and DBs (if existed).");
        process.exit(0);
    };

    // Remove potential old listeners before adding new ones
    process.removeListener('SIGINT', shutdown);
    process.removeListener('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}

// Initialize configuration and then start the server
initializeConfiguration().then(startServer).catch(err => {
    console.error("FATAL ERROR during initialization or server start:", err);
    process.exit(1);
});

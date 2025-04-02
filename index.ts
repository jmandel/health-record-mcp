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
import express, { Request, Response } from 'express';
import { XMLParser } from 'fast-xml-parser';
import { convert as htmlToText } from 'html-to-text';
import http from 'http';
import https from 'https';
import fs from 'fs/promises';
import _ from 'lodash';
import pkceChallenge, { verifyChallenge } from 'pkce-challenge';
import { v4 as uuidv4 } from 'uuid';
import vm from 'vm';
import { z } from 'zod';
import { Command } from 'commander';

// --- RTF Parser Imports ---
import { deEncapsulateSync } from 'rtf-stream-parser';
import * as iconvLite from 'iconv-lite';

// --- Configuration Loading ---
import { loadConfig, AppConfig } from './src/config.js'; // Import config loader

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
interface AuthPendingState {
    ehrState: string; ehrCodeVerifier: string; mcpClientId: string;
    mcpRedirectUri: string; mcpCodeChallenge: string; mcpOriginalState?: string;
}

// Structure for processed attachments
interface ProcessedAttachment {
    resourceType: string;
    resourceId: string;
    path: string;
    contentType: string;
    json: string; // JSON string of the original attachment node
    contentRaw: Buffer | null;
    contentPlaintext: string | null;
}

// New structure to hold all processed EHR data
interface FullEHR {
    fhir: Record<string, any[]>; // Renamed from 'record'
    attachments: ProcessedAttachment[];
}

const pendingEhrAuth = new Map<string, AuthPendingState>();

interface UserSession {
    sessionId: string;
    mcpAccessToken: string;
    ehrAccessToken: string;
    ehrTokenExpiry?: number;
    ehrGrantedScopes?: string;
    ehrPatientId?: string;
    fullEhr: FullEHR;
    db?: Database;
    mcpClientInfo: OAuthClientInformationFull;
    mcpAuthCode?: string;
    mcpAuthCodeChallenge?: string;
    mcpAuthCodeRedirectUri?: string;
}
const activeSessions = new Map<string, UserSession>();
const sessionsByMcpAuthCode = new Map<string, UserSession>();
const registeredMcpClients = new Map<string, OAuthClientInformationFull>();
const activeSseTransports = new Map<string, { transport: SSEServerTransport; mcpAccessToken: string; authInfo: AuthInfo }>();

// --- FHIR Data Fetching ---

interface AttachmentLike {
    contentType?: string;
    data?: string;
    url?: string;
}

const KNOWN_ATTACHMENT_PATHS = new Map<string, string[]>([
    ['DocumentReference', ['content.attachment']],
    ['Binary', ['']],
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

/**
 * Resolves a relative or absolute path against the FHIR base URL.
 * Ensures correct joining regardless of trailing slash on the base URL.
 * Handles both relative paths (e.g., "Patient/123", "Observation?category=...") and absolute URLs.
 * @param relativeOrAbsolutePath - The relative path (e.g., "Patient/123", "Observation?category=...") or an absolute URL.
 * @param fhirBaseUrl - The base URL of the FHIR server.
 * @returns The fully resolved URL object.
 */
function resolveFhirUrl(relativeOrAbsolutePath: string, fhirBaseUrl: string): URL {
    try {
        // Ensure the base URL itself is valid before using it
        const baseWithSlash = fhirBaseUrl.endsWith("/") ? fhirBaseUrl : fhirBaseUrl + "/";
        const base = new URL(baseWithSlash);
        // Now resolve the relative/absolute path against the valid base
        return new URL(relativeOrAbsolutePath, base);
    } catch (error) {
        console.error(`[URL RESOLVE] Error creating URL: relativeOrAbsolute='${relativeOrAbsolutePath}', base='${fhirBaseUrl}'`, error);
        throw new Error(`Failed to resolve URL: ${error instanceof Error ? error.message : String(error)}`);
    }
}

async function fetchAttachmentContent(attachmentUrl: string, fhirBaseUrl: string, accessToken: string): Promise<{ contentRaw: Buffer, contentType: string | null }> {
    const resolvedUrl = resolveFhirUrl(attachmentUrl, fhirBaseUrl); // Use helper
    console.log(`[ATTACHMENT Fetch] GET ${resolvedUrl.toString()}`); // Use toString()
    const headers = new Headers({ "Authorization": `Bearer ${accessToken}`, "Accept": "*/*" });
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
        const response = await fetch(resolvedUrl.toString(), { headers: headers, signal: controller.signal }); // Use toString()
        clearTimeout(timeoutId);
        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[ATTACHMENT Fetch] Error ${response.status} from ${resolvedUrl.toString()}: ${errorBody}`); // Use toString()
            throw new Error(`Attachment fetch failed with status ${response.status} for ${resolvedUrl.toString()}`); // Use toString()
        }
        const contentRaw = Buffer.from(await response.arrayBuffer());
        const contentType = response.headers.get("Content-Type");
        console.log(`[ATTACHMENT Fetch] Success (${contentRaw.length} bytes, Type: ${contentType || 'N/A'}) for ${resolvedUrl.toString()}`); // Use toString()
        return { contentRaw, contentType };
    } catch (error) {
        clearTimeout(timeoutId);
        if ((error as any).name === 'AbortError') {
            console.error(`[ATTACHMENT Fetch] Timeout fetching ${resolvedUrl.toString()}`); // Use toString()
            throw new Error(`Timeout fetching attachment: ${resolvedUrl.toString()}`); // Use toString()
        }
        console.error(`[ATTACHMENT Fetch] Network/Fetch error for ${resolvedUrl.toString()}:`, error); // Use toString()
        throw error;
    }
}

function getValueAtPath(obj: any, path: string): any | any[] | undefined {
    if (!obj || !path) return undefined;
    if (path === '') return obj;

    const parts = path.split('.');
    let current: any = obj;

    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (current === null || current === undefined) return undefined;

        const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
        if (arrayMatch) {
            const arrayKey = arrayMatch[1];
            const index = parseInt(arrayMatch[2], 10);
            if (!current[arrayKey] || !Array.isArray(current[arrayKey]) || index >= current[arrayKey].length) {
                return undefined;
            }
            current = current[arrayKey][index];
        } else {
            current = current[part];
        }

        if (Array.isArray(current) && i === parts.length - 1) {
            return current.filter(item => item !== null && item !== undefined);
        }
    }
    return current ? [current] : [];
}

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

async function fetchEhrData(ehrAccessToken: string, fhirBaseUrl: string, patientId: string): Promise<FullEHR> {
    console.log(`[DATA] Fetching specific FHIR resources from ${fhirBaseUrl} for Patient: ${patientId}`);
    if (!patientId) throw new Error("Patient ID is required to fetch data.");

    const fhirRecord: Record<string, any[]> = {};
    const processedAttachments: ProcessedAttachment[] = [];
    let totalFetched = 0;
    const patientReadUrl = resolveFhirUrl(`Patient/${patientId}`, fhirBaseUrl).toString(); // Use helper
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
        fhirRecord['Patient'] = [patientResource];
        totalFetched++;
    } catch (error) {
        console.error(`[DATA] Failed to fetch Patient resource: ${error}`);
        throw new Error(`Could not fetch core Patient resource: ${error instanceof Error ? error.message : String(error)}`);
    }

    await Promise.allSettled(searchQueries.map(async (query) => {
        try {
            const url = resolveFhirUrl(query.resourceType, fhirBaseUrl); // Use helper
            if (query.params) {
                Object.entries(query.params).forEach(([key, value]) => url.searchParams.set(key, value));
            }
            const resources = await fetchAllPages(url.toString(), ehrAccessToken); // Use toString()
            fhirRecord[query.resourceType] = resources;
            totalFetched += resources.length;
        } catch (error) {
            console.warn(`[DATA] Failed to fetch ${query.resourceType} resources (continuing): ${error}`);
            fhirRecord[query.resourceType] = [];
        }
    }));

    console.log(`[DATA] Completed fetching. Total resources retrieved: ${totalFetched} across ${Object.keys(fhirRecord).length} types.`);

    // --- Internal Attachment Processing Logic ---
    console.log("[DATA:ATTACHMENT] Starting attachment processing within fetchEhrData...");
    const xmlParser = new XMLParser({ ignoreAttributes: true, textNodeName: "_text", parseTagValue: false, trimValues: true, stopNodes: ["*.html"] });
    let processedCount = 0;
    let processingErrorCount = 0;
    let fetchErrorCount = 0;

    async function processSingleAttachmentNode(node: AttachmentLike, resourceType: string, resourceId: string, path: string): Promise<void> {
         let contentRaw: Buffer | null = null;
         let contentPlaintext: string | null = null;
         let finalContentType = (node.contentType || 'application/octet-stream').toLowerCase();

         try {
             if (node.url) {
                 console.log(`[DATA:ATTACHMENT Process] Found URL: ${node.url} in ${resourceType}/${resourceId} at ${path}`);
                 try {
                     const fetched = await fetchAttachmentContent(node.url, fhirBaseUrl, ehrAccessToken); // Pass base URL directly
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
                         if (result.mode === 'html') {
                             console.log(`[DATA:ATTACHMENT Process] RTF contained HTML, converting to text.`);
                             try {
                                 contentPlaintext = htmlToText(result.text.toString(), { wordwrap: false });
                             } catch (htmlErr) {
                                 console.error(`[DATA:ATTACHMENT Process] HTML parsing error after RTF extraction in ${resourceType}/${resourceId} at ${path}:`, htmlErr);
                                 contentPlaintext = '[Error parsing HTML from RTF]';
                                 processingErrorCount++;
                             }
                         } else {
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
                             if (typeof n === 'string') return n + "\n";
                             if (typeof n !== 'object' || n === null) return "";
                             return Object.values(n).map(extractText).join("");
                         };
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
             processedAttachments.push({
                 resourceType, resourceId, path,
                 contentType: finalContentType,
                 json: JSON.stringify({ error: `Processing failed: ${processError}` }),
                 contentRaw: null,
                 contentPlaintext: `[Error during attachment processing: ${processError}]`
             });
         }
    }

    async function findAndProcessAttachments(obj: any, resourceType: string, resourceId: string, currentPath: string = '', processedPaths: Set<string>): Promise<void> {
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

    try {
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
                }
            }
        }));
        console.log(`[DATA:ATTACHMENT] Processing complete. Found: ${processedCount}, URL Fetch Errors: ${fetchErrorCount}, Other Processing Errors: ${processingErrorCount}`);
    } catch (err) {
        console.error("[DATA:ATTACHMENT] Fatal error during attachment processing loop:", err);
    }

    return { fhir: fhirRecord, attachments: processedAttachments };
}


// --- SQLite Persistence Functions (NEW & REVISED) ---

// Helper to get the file path (Unchanged logic, just moved)
async function getSqliteFilePath(patientId: string): Promise<string> {
    if (!config.ehr.fhirBaseUrl) throw new Error("EHR FHIR Base URL not configured");
    const fhirUrl = new URL(config.ehr.fhirBaseUrl);
    const sanitizedOrigin = fhirUrl.origin
        .replace(/^https?:\/\//, '')
        .replace(/[^a-zA-Z0-9]/g, '_');
    
    const sanitizedPatientId = patientId.replace(/[^a-zA-Z0-9]/g, '_');
    
    return `${config.persistence.directory}/${sanitizedOrigin}__${sanitizedPatientId}.sqlite`;
}

// Initializes either a file-backed or in-memory DB based on config
async function initializeDatabase(patientId: string): Promise<Database> {
    if (config.persistence.enabled) {
    const filePath = await getSqliteFilePath(patientId);
        console.log(`[SQLITE Init] Initializing persistent database at: ${filePath}`);
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

// Populates the given DB instance (memory or file) - NO SAVE NEEDED
async function populateSqlite(fullEhr: FullEHR, db: Database): Promise<void> {
    console.log("[SQLITE Populate] Populating database from FullEHR data...");
    const { fhir: record, attachments } = fullEhr;
    const resourceTypes = Object.keys(record);

    db.exec('BEGIN TRANSACTION;');
    try {
        // Drop existing tables first to ensure clean slate
        const tables = await db.query("SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE 'fhir_%' OR name = 'attachments');").all() as { name: string }[];
        for (const table of tables) {
            db.exec(`DROP TABLE IF EXISTS "${table.name}";`);
        }
        console.log("[SQLITE Populate] Dropped existing FHIR/attachment tables.");

        // 1. Create/Populate FHIR resource tables
        for (const resourceType of resourceTypes) {
            const safeTableName = `fhir_${resourceType.replace(/[^a-zA-Z0-9_]/g, '_')}`;
            db.exec(`CREATE TABLE "${safeTableName}" (id TEXT PRIMARY KEY, resource_json TEXT NOT NULL);`);
            const stmt = db.prepare(`INSERT INTO "${safeTableName}" (id, resource_json) VALUES (?, ?)`);
            let count = 0;
            for (const resource of record[resourceType]) {
                if (resource && resource.id) {
                    try {
                        stmt.run(resource.id, JSON.stringify(resource));
                        count++;
                    } catch (insertErr: any) {
                        if (insertErr?.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
                            console.warn(`[SQLITE Populate] Duplicate ID '${resource.id}' for ${resourceType}. Skipping.`);
                        } else {
                            console.error(`[SQLITE Populate] Error inserting ${resourceType}/${resource.id}:`, insertErr);
                            // Decide whether to throw or continue
                        }
                    }
                } else {
                    console.warn(`[SQLITE Populate] Resource ${resourceType} missing ID or invalid, skipping.`);
                }
            }
            stmt.finalize();
            console.log(`[SQLITE Populate] Inserted ${count} resources into ${safeTableName}.`);
        }

        // 2. Create/Populate attachments table
        console.log(`[SQLITE Populate] Populating attachments table with ${attachments.length} entries...`);
        db.exec(`
            CREATE TABLE attachments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                resource_type TEXT NOT NULL,
                resource_id TEXT NOT NULL,
                path TEXT NOT NULL,
                content_type TEXT,
                json TEXT NOT NULL, -- Store the original JSON node
                content_raw BLOB,    -- Store raw bytes if available
                content_plaintext TEXT, -- Store extracted text if available
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(resource_type, resource_id, path, json) -- Use json in uniqueness constraint
            )
        `);

        if (attachments.length > 0) {
            const attachStmt = db.prepare(`
                INSERT OR REPLACE INTO attachments (
                    resource_type, resource_id, path, content_type, json, content_raw, content_plaintext
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            let attachCount = 0;
            for (const attach of attachments) {
                try {
                    // Ensure contentRaw is passed correctly (Buffer or null)
                    const rawBuffer = attach.contentRaw instanceof Buffer ? attach.contentRaw : null;
                    attachStmt.run(
                        attach.resourceType,
                        attach.resourceId,
                        attach.path,
                        attach.contentType,
                        attach.json,
                        rawBuffer, // Pass Buffer or null
                        attach.contentPlaintext
                    );
                    attachCount++;
                } catch (attachInsertErr: any) {
                    console.error(`[SQLITE Populate] Failed to insert attachment for ${attach.resourceType}/${attach.resourceId} at ${attach.path}:`, attachInsertErr);
                }
            }
            attachStmt.finalize();
            console.log(`[SQLITE Populate] Inserted ${attachCount} attachments.`);
        }

        db.exec('COMMIT;');
        console.log("[SQLITE Populate] Database population complete. Changes committed (or persisted if file-backed).");

        // REMOVED: No need for explicit saveSqliteToDisk call

    } catch (err) {
        console.error("[SQLITE Populate] Error during DB population transaction:", err);
        try {
            db.exec('ROLLBACK;');
            console.log("[SQLITE Populate] Transaction rolled back.");
        } catch (rollbackErr) {
            console.error("[SQLITE Populate] Error during rollback:", rollbackErr);
        }
        // Re-throw the original error after attempting rollback
        throw err;
    }
}

// NEW function to reconstruct FullEHR from DB
async function reconstructFullEhrFromDb(db: Database): Promise<FullEHR> {
    console.log("[SQLITE Reconstruct] Reconstructing FullEHR from database...");
    const fullEhr: FullEHR = { fhir: {}, attachments: [] };

    try {
        // 1. Reconstruct FHIR resources
        const fhirTables = await db.query("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'fhir_%';").all() as { name: string }[];
        console.log(`[SQLITE Reconstruct] Found ${fhirTables.length} FHIR tables.`);

        for (const table of fhirTables) {
            const resourceType = table.name.replace(/^fhir_/, '');
            const rows = await db.query(`SELECT resource_json FROM "${table.name}";`).all() as { resource_json: string }[];
            fullEhr.fhir[resourceType] = rows.map(row => {
                try {
                    return JSON.parse(row.resource_json);
        } catch (e) {
                    console.error(`[SQLITE Reconstruct] Failed to parse JSON for a resource in ${table.name}:`, e);
                    return null; // Or handle error differently
                }
            }).filter(r => r !== null); // Filter out parse failures
            console.log(`[SQLITE Reconstruct] Reconstructed ${fullEhr.fhir[resourceType].length} resources of type ${resourceType}.`);
        }

        // 2. Reconstruct Attachments
        try {
            const attachmentRows = await db.query(`
                SELECT resource_type, resource_id, path, content_type, json, content_raw, content_plaintext
                FROM attachments;
            `).all() as {
                resource_type: string; resource_id: string; path: string; content_type: string;
                json: string; content_raw: Buffer | null; content_plaintext: string | null; // Bun returns Buffer for BLOB
            }[];

            fullEhr.attachments = attachmentRows.map(row => {
                // Basic reconstruction. Assumes `json` field contains the necessary original info if needed.
                // Bun automatically returns BLOB columns as Buffers.
                return {
                    resourceType: row.resource_type,
                    resourceId: row.resource_id,
                    path: row.path,
                    contentType: row.content_type,
                    json: row.json, // The original JSON node string
                    contentRaw: row.content_raw, // Should be Buffer or null
                    contentPlaintext: row.content_plaintext
                };
            });
            console.log(`[SQLITE Reconstruct] Reconstructed ${fullEhr.attachments.length} attachments.`);
        } catch (e: any) {
             // Handle case where attachments table might not exist yet
             if (e.message?.includes('no such table: attachments')) {
                 console.warn("[SQLITE Reconstruct] Attachments table not found, assuming no attachments.");
                 fullEhr.attachments = [];
        } else {
                 console.error("[SQLITE Reconstruct] Error querying attachments table:", e);
                 throw e; // Re-throw other errors
             }
         }


    } catch (error) {
        console.error("[SQLITE Reconstruct] Error reconstructing FullEHR from database:", error);
        // Depending on requirements, might return partial data or throw
        throw new Error(`Failed to reconstruct EHR data from DB: ${error}`);
    }

    console.log("[SQLITE Reconstruct] FullEHR reconstruction complete.");
    return fullEhr;
}


// --- `getSessionDb` (Revised) ---
// Ensures DB is initialized for the session, using the appropriate backend
async function getSessionDb(session: UserSession): Promise<Database> {
    // Check if DB exists and is open
    if (session.db) {
        try {
            session.db.query("PRAGMA user_version;").get(); // Simple query to check if open
            // console.log(`[DB GET] Using existing open DB connection for session (Patient: ${session.ehrPatientId}).`);
            return session.db;
        } catch (e) {
            console.warn(`[DB GET] Session DB for patient ${session.ehrPatientId} was closed or invalid. Reinitializing.`);
            session.db = undefined; // Clear closed/invalid reference
        }
    }

    // Initialize new DB connection (file or memory)
    console.log(`[DB GET] Initializing new DB connection for session (Patient: ${session.ehrPatientId}). Persistence: ${config.persistence.enabled}`);
    if (!session.ehrPatientId) {
         // Should generally not happen if called appropriately, but safety check
         console.error("[DB GET] Cannot initialize DB without patientId in session.");
         throw new Error("Cannot initialize database without patient context.");
    }
    const newDb = await initializeDatabase(session.ehrPatientId);
    session.db = newDb; // Store the initialized DB in the session

    // If persistence is DISABLED, we need to populate the new in-memory DB from fullEhr
    // If persistence is ENABLED, the DB file might already contain data (from previous runs)
    // or it might be empty (first run). We rely on handleResync or the initial background fetch
    // to populate it correctly later. reconstructFullEhrFromDb could be used here if needed,
    // but let's keep population tied to data fetching for now.
    let shouldPopulate = false;
    if (!config.persistence.enabled) {
        console.log("[DB GET] Persistence disabled. Will populate in-memory DB if fullEhr data exists.");
        shouldPopulate = true;
        } else {
        // For persistent DBs, check if it's empty (e.g., first time use)
        try {
            const tables = await newDb.query("SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE 'fhir_%' OR name = 'attachments');").all();
            if (tables.length === 0) {
                 console.log("[DB GET] Persistent DB is empty. Will populate if fullEhr data exists.");
                 shouldPopulate = true;
            } else {
                 console.log("[DB GET] Persistent DB exists and has tables. Population will be handled by resync/fetch if necessary.");
             }
        } catch (dbCheckError) {
             console.error("[DB GET] Error checking persistent DB tables, attempting population:", dbCheckError);
             shouldPopulate = true; // Attempt population on error
         }
    }


    if (shouldPopulate && session.fullEhr && (Object.keys(session.fullEhr.fhir).length > 0 || session.fullEhr.attachments.length > 0)) {
        console.log("[DB GET] Populating newly initialized DB from existing session fullEhr data.");
        await populateSqlite(session.fullEhr, newDb); // No patientId needed here as saving is automatic for file DBs
    } else if (shouldPopulate) {
         console.warn("[DB GET] DB is new/in-memory but session fullEhr data is empty. Cannot populate.");
     }

    return session.db;
}


// --- Tool Schemas & Logic ---

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
    sql: z.string().min(1).describe("The read-only SQL SELECT statement to execute against the in-memory FHIR data.")
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
        1. 'fullEhr': An object containing the patient's EHR data:
           - 'fullEhr.fhir': An object where keys are FHIR resource type strings (e.g., "Patient", "Observation", "DocumentReference") and values are arrays of the corresponding FHIR resource JSON objects fetched from the EHR.
           - 'fullEhr.attachments': An array of processed attachment objects. Each object typically includes:
             - 'resourceType': The FHIR type of the resource the attachment belongs to (e.g., "DocumentReference").
             - 'resourceId': The ID of the parent FHIR resource.
             - 'path': The path within the parent resource where the attachment was found (e.g., "content.attachment").
             - 'contentType': The MIME type of the attachment (e.g., "text/plain", "application/pdf").
             - 'contentPlaintext': The extracted plaintext content of the attachment, if available and text-based (string or null).
             - 'contentRaw': Raw attachment bytes as a Buffer, if available (Buffer or null).
             - 'json': The original JSON string of the attachment node from the FHIR resource.
        2. 'console': A limited console object (log, warn, error) for capturing output.
        3. '_': The Lodash library, accessible via the underscore variable.

        The function MUST conclude with a 'return' statement providing a JSON-serializable value. Console output will be captured separately.

        Example Input JSON:
        {
          "code": "const conditions = fullEhr.fhir[\\"Condition\\"] || [];\\nconst activeConditions = _.filter(conditions, c => c.clinicalStatus?.coding?.[0]?.code === 'active');\\nconsole.log(\`Found \${activeConditions.length} active conditions.\`);\\nreturn activeConditions.map(c => ({ id: c.id, code: c.code?.text }));"
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
    fullEhr: FullEHR,
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

        if (attachment.contentPlaintext && attachment.contentPlaintext.length > 0) {
            if (regex.test(attachment.contentPlaintext)) {
                matchedAttachmentKeys.add(attachmentKey);
                matchedAttachmentsResult.push({
                    resourceType: attachment.resourceType,
                    resourceId: attachment.resourceId,
                    path: attachment.path,
                    contentType: attachment.contentType,
                    plaintext: attachment.contentPlaintext
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

async function evalRecordLogic(fullEhr: FullEHR, userCode: string): Promise<{ result?: any, logs: string[], errors: string[] }> {
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
        fullEhr: fullEhr,
        console: sandboxConsole,
        _: _,
        __resultPromise__: undefined as Promise<any> | undefined
    };

    const scriptCode = `
        async function userFunction(fullEhr, console, _) {
            "use strict";
            ${userCode}
        }
        __resultPromise__ = userFunction(fullEhr, console, _);
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
        session.sessionId = ""; // Transport will set this later
        activeSessions.set(mcpAccessToken, session);

        delete session.mcpAuthCode;
        delete session.mcpAuthCodeChallenge;
        delete session.mcpAuthCodeRedirectUri;

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
        const transportSessionId = extra.sessionId;
        if (!transportSessionId) throw new McpError(ErrorCode.InvalidRequest, "Missing session identifier.");
        const transportEntry = activeSseTransports.get(transportSessionId);
        if (!transportEntry) throw new McpError(ErrorCode.InvalidRequest, "Invalid or disconnected session.");
        const mcpAccessToken = transportEntry.mcpAccessToken;
        const session = activeSessions.get(mcpAccessToken);
        if (!session) throw new McpError(ErrorCode.InternalError, "Session data not found for active connection.");

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
        const transportSessionId = extra.sessionId;
        if (!transportSessionId) throw new McpError(ErrorCode.InvalidRequest, "Missing session identifier.");
        const transportEntry = activeSseTransports.get(transportSessionId);
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
         const transportSessionId = extra.sessionId;
        if (!transportSessionId) throw new McpError(ErrorCode.InvalidRequest, "Missing session identifier.");
         const transportEntry = activeSseTransports.get(transportSessionId);
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

// Middleware
        app.use(cors());
        app.use(express.urlencoded({ extended: true }));

// Logging Middleware
app.use((req, res, next) => {
    console.log(`[HTTP] ${req.method} ${req.path}`);
    next();
});

        // --- EHR Callback Handling (Revised DB Handling) ---
        app.get(config.server.ehrCallbackPath, async (req, res) => {
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
            console.log(`[AUTH Callback] Processing EHR callback for state: ${ehrState}, MCP Client: ${pendingAuth.mcpClientId}`);

            try {
                console.log(`[AUTH Callback] Exchanging EHR code at ${config.ehr.tokenUrl}`);
        const tokenParams = new URLSearchParams({
            grant_type: "authorization_code",
            code: ehrCode,
                    redirect_uri: `${config.server.baseUrl}${config.server.ehrCallbackPath}`,
                    client_id: config.ehr.clientId!, // Should be validated by loadConfig
            code_verifier: pendingAuth.ehrCodeVerifier,
        });
                const tokenResponse = await fetch(config.ehr.tokenUrl!, { // Should be validated by loadConfig
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json"
            },
            body: tokenParams,
        });

        if (!tokenResponse.ok) {
            const errBody = await tokenResponse.text();
                    console.error(`[AUTH Callback] EHR token exchange failed (${tokenResponse.status}): ${errBody}`);
            throw new Error(`EHR token exchange failed: ${tokenResponse.statusText}`);
        }
                const ehrTokens = await tokenResponse.json() as any;
                const patientId = ehrTokens.patient;
        if (!patientId) {
                    console.error("[AUTH Callback] Crucial Error: Patient ID not returned.");
            throw new Error("Patient context (patient ID) was not provided by the EHR.");
        }
                console.log(`[AUTH Callback] Received EHR tokens (Access Token: ${ehrTokens?.access_token?.substring(0, 8)}..., Patient: ${patientId})`);

                if (!config.ehr.fhirBaseUrl) { // Should not happen due to loadConfig validation
            console.error("[AUTH Callback] Configuration Error: EHR_FHIR_URL is not defined.");
            throw new Error("Server configuration error: FHIR Base URL is missing.");
        }

                let db: Database | undefined = undefined; // Start as undefined
                // DB will be initialized lazily later by getSessionDb when needed
                console.log("[AUTH Callback] DB will be initialized on first use (via getSessionDb).");

        let mcpClientInfo: OAuthClientInformationFull | undefined;
                if (config.security.disableClientChecks) {
            console.log(`[AUTH Callback] Client checks disabled. Creating placeholder client info for: ${pendingAuth.mcpClientId}`);
            mcpClientInfo = {
                client_id: pendingAuth.mcpClientId,
                client_name: `Placeholder Client (${pendingAuth.mcpClientId})`,
                        redirect_uris: [pendingAuth.mcpRedirectUri],
                        token_endpoint_auth_method: 'none',
                        scope: 'offline_access',
                        grant_types: ['authorization_code'],
                        response_types: ['code'],
            };
        } else {
            mcpClientInfo = await oauthProvider.clientsStore.getClient(pendingAuth.mcpClientId);
            if (!mcpClientInfo) {
                 console.error(`[AUTH Callback] Failed to retrieve MCP client info for ID: ${pendingAuth.mcpClientId} during callback.`);
                throw new Error("MCP Client information not found during callback processing.");
            }
        }

        const session: UserSession = {
                    sessionId: "",
                    mcpAccessToken: "",
            ehrAccessToken: ehrTokens.access_token,
            ehrTokenExpiry: ehrTokens.expires_in ? Math.floor(Date.now() / 1000) + ehrTokens.expires_in : undefined,
            ehrGrantedScopes: ehrTokens.scope,
            ehrPatientId: patientId,
                    fullEhr: { fhir: {}, attachments: [] }, // Initialize empty
                    db, // Assign undefined initially
                    mcpClientInfo,
                    mcpAuthCodeChallenge: pendingAuth.mcpCodeChallenge,
                    mcpAuthCodeRedirectUri: pendingAuth.mcpRedirectUri,
                };

        const mcpAuthCode = `mcp-code-${uuidv4()}`;
                session.mcpAuthCode = mcpAuthCode;
                sessionsByMcpAuthCode.set(mcpAuthCode, session);

        const clientRedirectUrl = new URL(pendingAuth.mcpRedirectUri);
                clientRedirectUrl.searchParams.set("code", mcpAuthCode);
        if (pendingAuth.mcpOriginalState) clientRedirectUrl.searchParams.set("state", pendingAuth.mcpOriginalState);
        console.log(`[AUTH Callback] Redirecting back to MCP Client with MCP Auth Code: ${clientRedirectUrl.toString()}`);
        res.redirect(302, clientRedirectUrl.toString());

        // --- Trigger Background Data Fetch & Populate --- 
        console.log(`[AUTH Callback] Triggering background data fetch/populate for patient ${patientId}...`);
        (async () => {
                    const bgPatientId = session.ehrPatientId!;
            console.log(`[AUTH Callback BG ${bgPatientId}] Starting background task.`);
            try {
                         // Ensure we reference the potentially updated session object
                         // It might have moved from sessionsByMcpAuthCode to activeSessions
                         const getUpToDateSession = () => activeSessions.get(session.mcpAccessToken) || sessionsByMcpAuthCode.get(session.mcpAuthCode || '');

                         let currentSessionRef = getUpToDateSession();
                         if (!currentSessionRef?.ehrAccessToken || !config.ehr.fhirBaseUrl || !currentSessionRef?.ehrPatientId) {
                             console.log(`[AUTH Callback BG ${bgPatientId}] Session seems inactive or missing info. Aborting background task.`);
                             return; // Exit if session is gone or lacks info
                         }

                console.log(`[AUTH Callback BG ${bgPatientId}] Fetching EHR data...`);
                console.log(currentSessionRef);
                        const fetchedData = await fetchEhrData(currentSessionRef.ehrAccessToken, config.ehr.fhirBaseUrl!, currentSessionRef.ehrPatientId!);
                console.log(`[AUTH Callback BG ${bgPatientId}] Fetched ${Object.keys(fetchedData.fhir).length} resource types and ${fetchedData.attachments.length} attachments.`);

                        // Re-check session existence before updating/populating
                        currentSessionRef = getUpToDateSession();
                        if (currentSessionRef) {
                            currentSessionRef.fullEhr = fetchedData;
                    console.log(`[AUTH Callback BG ${bgPatientId}] Updated session fullEhr in memory.`);
                    
                            // Ensure DB is initialized and populate it
                            try {
                                const dbToPopulate = await getSessionDb(currentSessionRef); // Initializes if needed
                        console.log(`[AUTH Callback BG ${bgPatientId}] Populating database...`);
                                await populateSqlite(currentSessionRef.fullEhr, dbToPopulate);
                        console.log(`[AUTH Callback BG ${bgPatientId}] Database population complete.`);
                            } catch (dbError) {
                                 console.error(`[AUTH Callback BG ${bgPatientId}] Error initializing or populating database:`, dbError);
                    }

                } else {
                             console.log(`[AUTH Callback BG ${bgPatientId}] Session became inactive during fetch. Skipping fullEhr update and DB population.`);
                 }

            } catch (backgroundError) {
                console.error(`[AUTH Callback BG ${bgPatientId}] Error during background data fetch/populate:`, backgroundError);
                        // Consider closing DB if opened? getSessionDb might handle this on next call.
            }
                })(); // Immediately invoke

            } catch (error) { // Outer catch for pre-redirect errors
        console.error("[AUTH Callback] Error processing EHR callback before redirect:", error);
                const clientRedirectUri = pendingAuth?.mcpRedirectUri || '/error_fallback';
                try {
                    const redirectUrl = new URL(clientRedirectUri); // Assume absolute or handle base later
                    redirectUrl.searchParams.set("error", "ehr_callback_failed");
                    redirectUrl.searchParams.set("error_description", error instanceof Error ? error.message : "Processing failed after EHR callback");
                    if (pendingAuth?.mcpOriginalState) redirectUrl.searchParams.set("state", pendingAuth.mcpOriginalState);
                     if (!res.headersSent) {
                         res.redirect(302, redirectUrl.toString());
                     }
                } catch (urlError) {
                     console.error(`[AUTH Callback] Invalid redirect URI provided: ${clientRedirectUri}`);
                     if (!res.headersSent) {
                         res.status(500).send("Invalid redirect URI configured for error reporting.");
                     }
        }
    }
});


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
    const state = req.query.state as string | undefined;
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
                    mcpClientInfo = { // Minimal placeholder
                         client_id: clientId,
                         redirect_uris: [validatedRedirectUri],
                         token_endpoint_auth_method: 'none'
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

                // --- Directly generate EHR redirect URL ---
                         const ehrState = uuidv4();
                         const { code_verifier: ehrCodeVerifier, code_challenge: ehrCodeChallenge } = await pkceChallenge();
        pendingEhrAuth.set(ehrState, {
                    ehrState, ehrCodeVerifier,
            mcpClientId: mcpClientInfo.client_id,
                    mcpRedirectUri: validatedRedirectUri!, // Validated above
            mcpCodeChallenge: codeChallenge,
            mcpOriginalState: state,
        });
                const ehrAuthUrl = new URL(config.ehr.authUrl!); // Validated by loadConfig
                         ehrAuthUrl.searchParams.set("response_type", "code");
                ehrAuthUrl.searchParams.set("client_id", config.ehr.clientId!); // Validated by loadConfig
                ehrAuthUrl.searchParams.set("scope", config.ehr.requiredScopes.join(" "));
                ehrAuthUrl.searchParams.set("redirect_uri", `${config.server.baseUrl}${config.server.ehrCallbackPath}`);
                         ehrAuthUrl.searchParams.set("state", ehrState);
                ehrAuthUrl.searchParams.set("aud", config.ehr.fhirBaseUrl!); // Validated by loadConfig
                         ehrAuthUrl.searchParams.set("code_challenge", ehrCodeChallenge);
                         ehrAuthUrl.searchParams.set("code_challenge_method", "S256");
                console.log(`[AUTHORIZE] Redirecting user to EHR: ${ehrAuthUrl.toString()}`);
        res.redirect(302, ehrAuthUrl.toString());

            } catch (error: any) {
                console.error("[AUTHORIZE] /authorize error:", error);
                let clientRedirectUriOnError = redirectUri || '/error_fallback';
                if (!config.security.disableClientChecks && clientId && !redirectUri) {
                     try { // Try to get default redirect URI if not provided
            const info = await oauthProvider.clientsStore.getClient(clientId);
                         if (info?.redirect_uris?.[0]) clientRedirectUriOnError = info.redirect_uris[0];
                     } catch {} // Ignore errors fetching client info here
        }

                 try {
                    const redirectUrl = new URL(clientRedirectUriOnError, config.server.baseUrl!); // Use base URL context
        if (error instanceof OAuthError) {
            redirectUrl.searchParams.set("error", error.errorCode);
            redirectUrl.searchParams.set("error_description", error.message);
        } else {
            redirectUrl.searchParams.set("error", "server_error");
            redirectUrl.searchParams.set("error_description", "Internal authorization error: " + (error?.message || 'Unknown reason'));
        }
        if (state) redirectUrl.searchParams.set("state", state);
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
                const transportSessionId = transport.sessionId;
                session.sessionId = transportSessionId;

        activeSseTransports.set(transportSessionId, {
            transport: transport,
            mcpAccessToken: mcpAccessToken,
            authInfo: authInfo
        });
        console.log(`[SSE GET] Client connected & authenticated. Transport Session ID: ${transportSessionId}, linked to MCP Token: ${mcpAccessToken.substring(0, 8)}...`);

        res.on('close', () => {
            activeSseTransports.delete(transportSessionId);
            if (session && session.sessionId === transportSessionId) {
                        session.sessionId = "";
            }
            console.log(`[SSE GET] Client disconnected. Cleaned up transport session: ${transportSessionId}`);
        });

        await mcpServer.connect(transport);

    } catch (error) {
        console.error("[SSE GET] Error setting up authenticated SSE connection:", error);
        if (transport && activeSseTransports.has(transport.sessionId)) {
            activeSseTransports.delete(transport.sessionId);
            if (session && session.sessionId === transport.sessionId) {
                 session.sessionId = "";
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
            const transportSessionId = req.query.sessionId as string | undefined;
    if (!transportSessionId) {
        console.warn("[MCP POST] Received POST without transport sessionId query param.");
        res.status(400).send("Missing sessionId query parameter");
        return;
    }

    const transportEntry = activeSseTransports.get(transportSessionId);
    if (!transportEntry) {
        console.warn(`[MCP POST] Received POST for unknown/expired transport sessionId: ${transportSessionId}`);
                res.status(404).send("Invalid or expired sessionId");
        return;
    }

    const transport = transportEntry.transport;
    try {
        console.log(`[MCP POST] Received POST for transport session ${transportSessionId}, linked to MCP Token: ${transportEntry.mcpAccessToken.substring(0,8)}...`);
        console.log(req.headers);
        transport.handlePostMessage(req, res);
    } catch (error) {
        console.error(`[MCP POST] Error in handlePostMessage for session ${transportSessionId}:`, error);
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
                         console.log(`[Shutdown] Closing DB for session ${id} (Patient: ${session.ehrPatientId})`);
                    session.db.close();
                     } catch (e) { console.error(`[Shutdown] Error closing DB for session ${id}:`, e); }
            }
        }
        activeSessions.clear();
         // Also clear pending auth map? Probably good practice.
         pendingEhrAuth.clear();
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


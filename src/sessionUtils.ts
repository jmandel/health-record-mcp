import { Database } from 'bun:sqlite';
import fs from 'fs/promises';
import path from 'path';

import { ClientFullEHR } from '../clientTypes.js'; // Adjust path as needed
import { ehrToSqlite, sqliteToEhr } from './dbUtils.js'; // Import functions from dbUtils

// --- Add SDK Imports ---
import {
    AuthInfo,
} from "@modelcontextprotocol/sdk/server/auth/types.js";
import { OAuthClientInformationFull } from "@modelcontextprotocol/sdk/shared/auth.js";
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

// --- Session and State Types ---

// Renamed OAuthClientInfo to ClientInfo if that's the SDK convention
export interface UserSession {
    // Unique identifier for this session instance (could be MCP Access Token)
    sessionId: string;
    // Information about the MCP client that initiated the session
    mcpClientInfo: OAuthClientInformationFull; // Use the imported type
    // Full EHR data loaded into memory
    fullEhr?: ClientFullEHR;
    // Path to the SQLite file (if persisted)
    dbPath?: string;
    // Optional database handle (can be opened on demand)
    db?: Database;
    // Timestamp when the session was created
    createdAt: number;
    // ID of the active transport connection, if any
    transportSessionId?: string;
    // Add PKCE challenge details needed for token exchange verification
    mcpCodeChallenge?: string;
    mcpCodeChallengeMethod?: string;
}

export interface ActiveTransportEntry {
    transport: SSEServerTransport; // Use imported type
    mcpAccessToken: string; // Link back to the UserSession via the token
    authInfo: AuthInfo;     // Use imported type
}


// --- In-Memory State ---

// Stores active user sessions, keyed by MCP Access Token
export const activeSessions = new Map<string, UserSession>();

// Stores active SSE transport connections, keyed by their unique transport ID
export const activeSseTransports = new Map<string, ActiveTransportEntry>();

// --- Database Utility Functions ---

/**
 * Initializes an SQLite database connection and ensures the directory exists.
 * Table creation is handled by ehrToSqlite.
 * @param dbPath The path to the SQLite file.
 * @returns The opened Database instance.
 */
export async function initializeDatabase(dbPath: string): Promise<Database> {
    try {
        const dir = path.dirname(dbPath);
        await fs.mkdir(dir, { recursive: true }); // Ensure directory exists
        const db = new Database(dbPath, { create: true });

        // Table creation is now handled within ehrToSqlite from dbUtils
        // db.run(` CREATE TABLE IF NOT EXISTS ... `);

        console.log(`[DB] Database connection opened at ${dbPath}`);
        return db;
    } catch (error) {
        console.error(`[DB] Error initializing database at ${dbPath}:`, error);
        throw error; // Re-throw to indicate failure
    }
}

/**
 * Gets the SQLite database handle associated with a session.
 * If the session is persisted, ensures the DB handle is open.
 * Throws an error if the session requires a DB but it cannot be accessed.
 * @param session The UserSession object.
 * @returns The Database handle.
 */
export async function getSessionDb(session: UserSession): Promise<Database> {
    if (session.db) {
        return session.db; // Return existing open handle
    }
    // If there's no handle, but a path exists, it means it should have been opened
    // during loadSessionFromDb. This indicates an issue.
    if (session.dbPath) {
         console.error(`[DB Get] Session ${session.sessionId.substring(0, 8)}... has dbPath but DB handle is missing. Attempting to reopen...`);
         // Attempt to reopen - this might mask underlying issues but could recover
         try {
             const db = new Database(session.dbPath);
             session.db = db; // Store the reopened handle
             console.log(`[DB Get] Successfully reopened DB for session ${session.sessionId.substring(0, 8)}...`);
             return db;
         } catch (error) {
             console.error(`[DB Get] Error reopening database from path ${session.dbPath} for session ${session.sessionId.substring(0, 8)}...:`, error);
             throw new Error(`Failed to reopen database for session ${session.sessionId.substring(0, 8)}...`);
         }
    }

    // If no dbPath exists, it's an in-memory session without persistence
    console.error(`[DB Get] Session ${session.sessionId.substring(0, 8)}... is not persisted and has no database handle.`);
    throw new Error(`Session ${session.sessionId.substring(0, 8)}... has no associated database.`);
}


/**
 * Constructs the full path for a session's SQLite file based on persistence config and session ID.
 * @param persistenceDir The base directory for persistence.
 * @param sessionId The unique ID for the session (e.g., MCP access token).
 * @returns The absolute path to the SQLite file.
 */
export function getSqliteFilePath(persistenceDir: string, sessionId: string): string {
    // Sanitize sessionId slightly if needed, although UUIDs/tokens are generally safe
    const safeSessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '');
    return path.resolve(persistenceDir, `${safeSessionId}.sqlite`);
}

/**
 * Creates a new UserSession from fetched EHR data, optionally persisting it.
 * Initializes the SQLite DB and saves data if persistence is enabled.
 * @param sessionId Unique ID for the session (MCP Access Token).
 * @param mcpClientInfo Info about the initiating MCP client.
 * @param fullEhr The fetched EHR data.
 * @param persistenceEnabled Whether to save the data to disk.
 * @param persistenceDir Directory to save the DB file if enabled.
 * @returns The newly created UserSession object.
 */
export async function createSessionFromEhrData(
    sessionId: string,
    mcpClientInfo: OAuthClientInformationFull, // Use the imported type
    fullEhr: ClientFullEHR,
    persistenceEnabled: boolean,
    persistenceDir?: string
): Promise<UserSession> {
    // Construct the initial session object structure
    const session: UserSession = {
        sessionId: sessionId,
        mcpClientInfo: mcpClientInfo,
        fullEhr: fullEhr, // Keep original data in memory
        createdAt: Date.now(),
        // db and dbPath will be added if persistence is enabled
        // PKCE details are added later before creating auth code
    };

    if (persistenceEnabled && persistenceDir) {
        session.dbPath = getSqliteFilePath(persistenceDir, sessionId);
        console.log(`[SESSION CREATE] Persistence enabled. DB Path: ${session.dbPath}`);
        let db: Database | undefined = undefined;
        try {
            // Initialize DB (creates file/tables if needed)
            console.log(`[SESSION CREATE] Initializing database connection for ${sessionId.substring(0,8)}...`);
            db = await initializeDatabase(session.dbPath);
            console.log(`[SESSION CREATE] Database connection opened for ${sessionId.substring(0,8)}. File: ${db.filename || ':memory:'}`);

            // Populate the database using ehrToSqlite from dbUtils
            await ehrToSqlite(fullEhr, db);

            // Store the OPEN DB handle in the session
            session.db = db;
            console.log(`[SESSION CREATE] Successfully created and populated DB for session ${sessionId.substring(0,8)}... DB handle stored.`);

        } catch (error) {
            console.error(`[SESSION CREATE] Error during DB initialization or population for ${sessionId.substring(0,8)}...:`, error);
            // Clean up DB connection if initialization or population failed
            if (db) {
                 try { db.close(); } catch (e) { console.error("[SESSION CREATE] Error closing DB after creation/population failure:", e); }
            }
            // Remove dbPath and db handle if persistence failed
            delete session.dbPath;
            delete session.db;
            console.warn(`[SESSION CREATE] Proceeding without persistence for session ${sessionId.substring(0,8)}... due to error.`);
        }
    } else {
        console.log(`[SESSION CREATE] Persistence disabled. Session ${sessionId.substring(0,8)}... data stored in memory only.`);
    }

    // Add the session to the active map
    activeSessions.set(sessionId, session);
    console.log(`[SESSION] Active session count: ${activeSessions.size}`);
    return session;
}


/**
 * Loads a UserSession from a persisted SQLite file.
 * Reads data from the DB and populates the session object.
 * @param sessionId The unique ID of the session to load (MCP Access Token).
 * @param mcpClientInfo Info about the initiating MCP client (needed to create the session object).
 * @param dbPath The path to the SQLite file.
 * @returns The loaded UserSession object, or null if loading fails.
 */
export async function loadSessionFromDb(
    sessionId: string,
    mcpClientInfo: OAuthClientInformationFull, // Use the imported type
    dbPath: string
): Promise<UserSession | null> {
    console.log(`[SESSION LOAD] Attempting to load session ${sessionId.substring(0,8)}... from DB: ${dbPath}`);
    let db: Database | undefined = undefined;
    try {
        // Check if file exists before trying to open
        await fs.access(dbPath);
        console.log(`[SESSION LOAD] Opening database file: ${dbPath}`);
        db = new Database(dbPath); // Open existing DB

        // Load data from DB using sqliteToEhr from dbUtils
        const fullEhr = await sqliteToEhr(db);

        const session: UserSession = {
            sessionId: sessionId,
            mcpClientInfo: mcpClientInfo,
            fullEhr: fullEhr,
            dbPath: dbPath,
            createdAt: Date.now(),
        };

         // Keep the DB handle open and store it in the session
         session.db = db;
         console.log(`[SESSION LOAD] Successfully loaded session ${sessionId.substring(0,8)}... from DB. FHIR Types: ${Object.keys(fullEhr.fhir).length}, Attachments: ${fullEhr.attachments.length}. DB handle stored.`);
         activeSessions.set(sessionId, session); // Add to active sessions
         console.log(`[SESSION] Active session count: ${activeSessions.size}`);
         return session;

    } catch (error: any) {
        if (db) {
             try { db.close(); } catch (e) { console.error("[SESSION] Error closing DB after load failure:", e); }
        }
        // Distinguish between file not found and other errors
        if (error.code === 'ENOENT') {
             console.warn(`[SESSION] DB file not found for session ${sessionId.substring(0,8)}... at path: ${dbPath}`);
        } else {
             console.error(`[SESSION] Error loading session ${sessionId.substring(0,8)}... from DB ${dbPath}:`, error);
        }
        return null; // Indicate loading failed
    }
}


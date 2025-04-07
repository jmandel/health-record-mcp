import { Database } from 'bun:sqlite';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

import { ClientFullEHR } from '../clientTypes.js'; // Adjust path as needed
import { ehrToSqlite, sqliteToEhr } from './dbUtils.js'; // Import functions from dbUtils

// --- Add SDK Imports ---
import {
    AuthInfo,
} from "@modelcontextprotocol/sdk/server/auth/types.js";
import { OAuthClientInformationFull } from "@modelcontextprotocol/sdk/shared/auth.js";
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import type { AuthzRequestState } from './oauth';
import { AppConfig } from './config'; // Import AppConfig

// --- Session and State Types ---

// Renamed OAuthClientInfo to ClientInfo if that's the SDK convention
export interface UserSession {
    sessionId: string;
    mcpClientInfo: OAuthClientInformationFull;
    authzRequestState?: AuthzRequestState;
    fullEhr?: ClientFullEHR; // Original EHR data, potentially kept in memory
    db?: Database; // Handle can be file-based or in-memory
    databaseFilename?: string; // Only set if persistence is enabled
    createdAt: number;
    transportSessionId?: string;
}

export interface ActiveTransportEntry {
    transport: SSEServerTransport;
}

// --- In-Memory State ---

// Stores active user sessions, keyed by MCP Access Token
export const activeSessions = new Map<string, UserSession>();

// Stores active SSE transport connections, keyed by their unique transport ID
export const activeSseTransports = new Map<string, ActiveTransportEntry>();

// --- Centralized DB Handling ---

/**
 * Constructs the full path for a session's SQLite file.
 * @param persistenceDir The base directory for persistence.
 * @param databaseFilename The unique base name for the file (e.g., a UUID).
 * @returns The absolute path to the SQLite file.
 */
export function getSqliteFilePath(persistenceDir: string, databaseFilename: string): string {
    // Basic sanitization might still be good, though UUIDs are generally safe.
    const safeFilename = databaseFilename.replace(/[^a-zA-Z0-9_-]/g, '');
    return path.resolve(persistenceDir, `${safeFilename}.sqlite`);
}

/**
 * Gets or creates the SQLite database handle for a session.
 * - Returns existing handle if present.
 * - Opens/creates file-backed DB if persistence enabled and filename exists. Populates if newly created and fullEhr exists.
 * - Creates in-memory DB if persistence disabled or no filename. Populates if fullEhr exists.
 * Stores the opened/created handle back into session.db.
 * Throws errors if DB access fails.
 * @param session The UserSession object.
 * @param config The application configuration.
 * @returns The Database handle.
 */
export async function createOrOpenDbForSession(session: UserSession, config: AppConfig): Promise<Database> {
    if (session.db) {
        // Return existing open handle (could be file or memory)
        return session.db;
    }

    let db: Database;
    let wasNewlyCreated = false; // Flag to track if DB file was created in this call

    // --- Case 1: Persistence Enabled and Filename Exists ---
    if (config.persistence?.enabled && session.databaseFilename && config.persistence.directory) {
        const dbPath = getSqliteFilePath(config.persistence.directory, session.databaseFilename);
        console.log(`[DB Get/Create] Attempting to open file-backed DB for session ${session.sessionId.substring(0, 8)}... Path: ${dbPath}`);
        try {
            // Ensure directory exists first
            const dir = path.dirname(dbPath);
            await fs.mkdir(dir, { recursive: true });

            // Check if file exists *before* opening/creating
            try {
                await fs.access(dbPath);
                console.log(`[DB Get/Create] File exists: ${dbPath}`);
            } catch (accessError: any) {
                if (accessError.code === 'ENOENT') {
                    console.log(`[DB Get/Create] File does not exist, will be created: ${dbPath}`);
                    wasNewlyCreated = true; // Mark for potential population
                } else {
                    throw accessError; // Re-throw other access errors
                }
            }

            // Open existing or create if it doesn't exist
            db = new Database(dbPath); // { create: true } is default
            console.log(`[DB Get/Create] Successfully opened/created file-backed DB: ${db.filename}`);

            // Populate *only if* it was newly created AND EHR data is available
            if (wasNewlyCreated && session.fullEhr) {
                console.log(`[DB Get/Create] Populating newly created file DB for session ${session.sessionId.substring(0, 8)}...`);
                try {
                    await ehrToSqlite(session.fullEhr, db); // Populate the new file DB
                    console.log(`[DB Get/Create] Newly created file DB population complete for session ${session.sessionId.substring(0, 8)}...`);
                } catch (populateError) {
                    console.error(`[DB Get/Create] Error populating newly created file DB for session ${session.sessionId.substring(0, 8)}...:`, populateError);
                    try { db.close(); } catch (e) { /* ignore close error */ } // Clean up handle
                    // Also attempt to delete the potentially corrupted/partially populated file
                    try { await fs.unlink(dbPath); console.log(`[DB Get/Create] Deleted incomplete DB file ${dbPath}`); } catch (e) {}
                    throw new Error(`Failed to populate newly created database for session ${session.sessionId.substring(0, 8)}...`);
                }
            } else if (wasNewlyCreated) {
                 console.log(`[DB Get/Create] Newly created file DB for session ${session.sessionId.substring(0, 8)} is empty (no EHR data).`);
            }

            session.db = db; // Store handle
            return db;
        } catch (error: any) {
            console.error(`[DB Get/Create] CRITICAL: Error opening/creating database from path ${dbPath} for session ${session.sessionId.substring(0, 8)}...:`, error);
            if (error.code === 'SQLITE_CANTOPEN') {
                 throw new Error(`Failed to open database file for session ${session.sessionId.substring(0, 8)}... Check permissions or file corruption at ${dbPath}.`);
            }
            throw new Error(`Failed to access database for session ${session.sessionId.substring(0, 8)}...`);
        }
    }
    // --- Case 2: Persistence Disabled or No Filename ---
    else {
        console.log(`[DB Get/Create] Creating in-memory database for session ${session.sessionId.substring(0, 8)}... (Persistence disabled or no filename)`);
        try {
            db = new Database(':memory:');
            console.log(`[DB Get/Create] In-memory DB created for session ${session.sessionId.substring(0, 8)}...`);
            wasNewlyCreated = true; // In-memory is always 'new' in this context

            // Populate if EHR data exists on the session
            if (wasNewlyCreated && session.fullEhr) {
                console.log(`[DB Get/Create] Populating new in-memory DB for session ${session.sessionId.substring(0, 8)}... from existing fullEhr data.`);
                try {
                    await ehrToSqlite(session.fullEhr, db);
                    console.log(`[DB Get/Create] In-memory DB population complete for session ${session.sessionId.substring(0, 8)}...`);
                } catch (populateError) {
                    console.error(`[DB Get/Create] Error populating in-memory DB for session ${session.sessionId.substring(0, 8)}...:`, populateError);
                    try { db.close(); } catch (e) { /* ignore */ }
                    throw new Error(`Failed to populate in-memory database for session ${session.sessionId.substring(0, 8)}...`);
                }
            } else {
                console.log(`[DB Get/Create] Created empty in-memory DB for session ${session.sessionId.substring(0, 8)}... (no EHR data to populate).`);
            }
            session.db = db; // Store handle
            return db;
        } catch (error) {
            console.error(`[DB Get/Create] CRITICAL: Error creating in-memory database for session ${session.sessionId.substring(0, 8)}...:`, error);
            throw new Error(`Failed to create in-memory database for session ${session.sessionId.substring(0, 8)}...`);
        }
    }
}

// --- Session Creation and Loading ---

/**
 * Creates a new UserSession object from fetched EHR data.
 * If persistence is enabled in config, assigns a unique databaseFilename.
 * Does NOT create/open the database file or handle itself. DB creation/opening
 * and initial population happens lazily via createOrOpenDbForSession.
 * @param sessionId Unique ID for the session (MCP Access Token).
 * @param mcpClientInfo Info about the initiating MCP client.
 * @param fullEhr The fetched EHR data.
 * @param config The application configuration.
 * @returns The newly created UserSession object (without an active DB handle initially).
 */
export function createSessionFromEhrData(
    sessionId: string,
    mcpClientInfo: OAuthClientInformationFull, // Use the imported type
    fullEhr: ClientFullEHR,
    config: AppConfig // Pass AppConfig
): UserSession { // Return type is now synchronous
    const session: UserSession = {
        sessionId: sessionId,
        mcpClientInfo: mcpClientInfo,
        fullEhr: fullEhr, // Keep original data in memory for now
        createdAt: Date.now(),
        // databaseFilename will be set below if persistence is enabled
        // db handle will be created/opened/populated on first access via createOrOpenDbForSession
    };

    if (config.persistence?.enabled && config.persistence.directory) {
        session.databaseFilename = uuidv4(); // Generate unique filename for the DB
        console.log(`[SESSION CREATE] Persistence enabled. Assigned DB Filename: ${session.databaseFilename}.sqlite for session ${sessionId.substring(0,8)}... DB will be created/populated on first access.`);
        // DB creation/population is now handled lazily by createOrOpenDbForSession
    } else {
        console.log(`[SESSION CREATE] Persistence disabled for session ${sessionId.substring(0,8)}... In-memory DB will be created and populated on first access.`);
    }

    // Add the session to the active map
    activeSessions.set(sessionId, session);
    console.log(`[SESSION] Active session count: ${activeSessions.size}`);
    return session;
}

/**
 * Loads session data from a persisted SQLite file into a NEW UserSession.
 * Uses createOrOpenDbForSession to get the handle (which opens existing file),
 * then sqliteToEhr to load data.
 * @param mcpClientInfo Info about the initiating MCP client for this load operation.
 * @param databaseFilename The unique base name of the SQLite file (without .sqlite extension).
 * @param authzRequestState The state from the original /authorize request to link to this new session.
 * @param config The application configuration.
 * @returns The newly created UserSession object populated with data, or null if loading fails.
 */
export async function loadSessionFromDb(
    mcpClientInfo: OAuthClientInformationFull,
    databaseFilename: string, // Base filename (e.g., UUID)
    authzRequestState: AuthzRequestState, // Pass the state to associate with the new session
    config: AppConfig // Pass config
): Promise<UserSession | null> {
    const newSessionId = uuidv4(); // Generate a NEW unique session ID (MCP Access Token)

    // Create a preliminary session object to pass to createOrOpenDb
    const preliminarySession: UserSession = {
        sessionId: newSessionId,
        mcpClientInfo: mcpClientInfo,
        authzRequestState: authzRequestState,
        databaseFilename: databaseFilename, // Crucial for opening file DB
        createdAt: Date.now(),
        // db and fullEhr will be populated below
    };

    let db: Database | undefined;
    try {
        // --- Step 1: Get the DB handle ---
        // This will open the existing file based on databaseFilename.
        // Since the file exists, it should NOT attempt population from fullEhr (which is undefined here anyway).
        console.log(`[SESSION LOAD] Getting DB handle for file ID ${databaseFilename} for new session ${newSessionId.substring(0,8)}...`);
        db = await createOrOpenDbForSession(preliminarySession, config);
        // 'db' is now stored in preliminarySession.db

        // --- Step 2: Load EHR data from the opened handle ---
        // This assumes the DB file was correctly populated when it was initially created.
        console.log(`[SESSION LOAD] Loading EHR data from DB for session ${newSessionId.substring(0,8)}...`);
        const fullEhr = await sqliteToEhr(db);
        preliminarySession.fullEhr = fullEhr; // Populate fullEhr on the session object

        // --- Finalize and Store Session ---
        console.log(`[SESSION LOAD] Successfully loaded data for session ${newSessionId.substring(0,8)}... from DB ${databaseFilename}.sqlite. FHIR Types: ${Object.keys(fullEhr.fhir).length}, Attachments: ${fullEhr.attachments?.length ?? 0}.`);
        activeSessions.set(newSessionId, preliminarySession); // Add the fully populated session
        console.log(`[SESSION] Active session count: ${activeSessions.size}`);
        return preliminarySession; // Return the now complete session object

    } catch (error: any) {
        console.error(`[SESSION LOAD] Error loading session from DB file ID ${databaseFilename} for new session ${newSessionId.substring(0,8)}...:`, error);
        // If an error occurred (either opening DB or reading from it),
        // try to close the handle if it was successfully opened before the error.
        if (preliminarySession.db) { // Check the session object as createOrOpenDb stores it there
             try {
                 console.warn(`[SESSION LOAD] Closing DB handle for ${newSessionId.substring(0,8)} due to loading error.`);
                 preliminarySession.db.close();
             } catch (e) { console.error("[SESSION LOAD] Error closing DB after load failure:", e); }
        }
        return null; // Indicate loading failed
    }
}

// --- Helper to delete a persisted session file ---
/**
 * Deletes a persisted session's SQLite file.
 * @param persistenceDir The base directory where SQLite files are stored.
 * @param databaseFilename The unique base name of the SQLite file to delete.
 */
export async function deletePersistedSession(persistenceDir: string, databaseFilename: string): Promise<void> {
    const dbPath = getSqliteFilePath(persistenceDir, databaseFilename);
    console.log(`[SESSION DELETE] Attempting to delete DB file: ${dbPath}`);
    try {
        await fs.unlink(dbPath);
        console.log(`[SESSION DELETE] Successfully deleted DB file: ${dbPath}`);
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            console.warn(`[SESSION DELETE] File not found, nothing to delete: ${dbPath}`);
        } else {
            console.error(`[SESSION DELETE] Error deleting file ${dbPath}:`, error);
        }
    }
}


// Edit file: index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
    ErrorCode,
    Implementation,
    McpError
} from "@modelcontextprotocol/sdk/types.js";

import { Database } from 'bun:sqlite';
import cors from 'cors';
import express, { Request, Response } from 'express';
import fs from 'fs/promises';
import http from 'http';
import https from 'https';
import { execSync } from 'child_process'; // Import for running build command
import { Command } from 'commander';
import path from 'path'; // Import path module

// --- Local Imports ---
import { AppConfig, loadConfig } from './src/config.ts'; 
import { addOauthRoutesAndProvider } from './src/oauth.ts'; 
import { getSessionDb, loadSessionFromDb, activeSessions, activeSseTransports } from './src/sessionUtils.js'; // Import session/DB utils and state
import {
    EvalRecordInputSchema,
    evalRecordLogic,
    GrepRecordInputSchema,
    grepRecordLogic,
    QueryRecordInputSchema,
    queryRecordLogic
} from './src/tools.js'; // Import from the new file
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { OAuthServerProvider } from "@modelcontextprotocol/sdk/server/auth/provider.js";


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
const SERVER_INFO: Implementation = { name: "Health Record Search MCP", version: "0.5.0" };

// --- MCP Server Instance ---
const mcpServer = new McpServer(SERVER_INFO);

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

        // --- Global Middleware ---
        app.use(cors());
        app.use(express.urlencoded({ extended: true }));
        // Note: express.json() is added selectively to specific POST endpoints where needed so it doesn't break SSE

        // Logging Middleware
        app.use((req, res, next) => {
            console.log(`[HTTP] ${req.method} ${req.path}`);
            next();
        });

        // --- Serve Static Files from ./static --- 
        const staticPath = path.resolve(process.cwd(), 'static'); 
        console.log(`[STATIC] Serving static files from: ${staticPath}`);
        app.use('/static', express.static(staticPath)); 

        // --- Add OAuth Routes and Get Provider ---
        const oauthProvider = addOauthRoutesAndProvider(app, config, activeSessions, activeSseTransports, loadSessionFromDb);
        console.log("[INIT] OAuth routes and provider initialized.");
        
        // --- Custom Bearer Auth Middleware using the returned provider ---
        const bearerAuthMiddleware = requireBearerAuth({ provider: oauthProvider  } );
        console.log("[INIT] Bearer auth middleware initialized.");
        console.log(oauthProvider);

        // --- API Endpoints (Not OAuth related) ---

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
        
                    // Only if we want to delete sessions when the transport closes
                    // (Useful debugging with MCP Inspector tppl)
                    // console.log(`[SSE Closed] Deleting session for MCP Token ${mcpAccessToken.substring(0, 8)}...`);
                    // activeSessions.delete(mcpAccessToken);
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
                    // TODO: Improve error typing and mapping to OAuthError codes
                     const message = (error instanceof Error /* OAuthError */) ? "SSE connection setup failed due to authorization issue." : "Failed to establish SSE connection";
                     const statusCode = 500; // Default to 500, refine if OAuthError is used
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
                     
                     // Clear other state maps (Moved inside src/oauth.ts - how to clear?)
                     // We might need an explicit shutdown function exported from oauth.ts
                     // Or rely on process exit to clear memory.
                     // sessionsByMcpAuthCode.clear();
                     // authFlowStates.clear();
                     // pickerSessions.clear();
                     // registeredMcpClients.clear(); // Clear registered clients if dynamic
                     activeSseTransports.clear(); // Should be cleared by mcpServer.close, but clear again to be sure
                     console.log("[Shutdown] Temporary state maps cleared (Note: OAuth internal state persists until exit).");
        
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
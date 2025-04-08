import { Command } from 'commander';
import { Database } from 'bun:sqlite';
import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'bun'; // Needed for running build

// --- Imports for --create-db mode ---
import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import https from 'https'; // Import https
import cors from 'cors';
// --- End imports for --create-db ---

// Corrected MCP SDK imports
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Implementation } from "@modelcontextprotocol/sdk/types.js"; // Import common types

// Corrected local module imports (assuming cli.ts is in src/)
import { ClientFullEHR } from '../clientTypes.js'; // Assumes clientTypes.ts is in project root
import { sqliteToEhr, ehrToSqlite } from './dbUtils.js'; // Assumes dbUtils.ts is in src/
import { AppConfig, loadConfig } from './config.ts'; // Import config loading and AppConfig type

// --- Tool Schemas & Logic (Imported) ---
import {
    GrepRecordInputSchema, QueryRecordInputSchema, EvalRecordInputSchema, grepRecordLogic,
    queryRecordLogic,
    evalRecordLogic,
    registerEhrTools
} from './tools.js'; // Assumes tools.ts is in src/

// --- Server Info ---
const SERVER_INFO: Implementation = { name: "EHR-Search-MCP-CLI", version: "0.1.0" };

// --- Function for --create-db mode ---

async function startEhrFetchServer(
    dbPath: string,
    serverConfig: AppConfig['server'] // Use the server part of AppConfig
): Promise<void> {
    return new Promise(async (resolve, reject) => { // Make the outer function async for cert loading
        const app = express();
        app.use(cors());
        app.use(express.json({ limit: '50mb' })); // For receiving EHR data

        let server: http.Server | https.Server | null = null; // Union type
        const protocol = serverConfig.https.enabled ? 'https' : 'http';
        const port = serverConfig.port; // Use port from config
        const host = serverConfig.host; // Use host from config
        const baseUrl = serverConfig.baseUrl || `${protocol}://${host}:${port}`; // Construct base URL

        const shutdown = (error?: Error) => {
            if (server) {
                server.close((closeErr) => {
                    if (closeErr) {
                        console.error(`[Server] Error closing server: ${closeErr.message}`);
                    } else {
                        console.error('[Server] Web server stopped.');
                    }
                    // Resolve or reject the main promise
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                });
                // Force close after timeout
                setTimeout(() => {
                    console.error('[Server] Forcing shutdown after timeout.');
                     if (error) reject(error); else resolve(); // Might resolve/reject twice, but ensures exit
                }, 5000);
            } else {
                 if (error) reject(error); else resolve();
            }
        };

        // 1. Serve static files (Retriever HTML/JS)
        // Assuming cli.ts is in src/, static is one level up
        const staticPath = path.resolve(__dirname, '..', 'static');
        console.error(`[Server] Serving static files from: ${staticPath}`);
        // Serve static files relative to the base URL
        app.use(express.static(staticPath));

        // 2. Initial endpoint to start the flow
        app.get('/start', (req, res) => {
            console.error('[Server] /start requested. Redirecting to retriever UI...');
            // Construct URL relative to the dynamic base URL
            const retrieverUrl = `/ehretriever.html#deliver-to:cli-callback`;
            res.redirect(retrieverUrl);
        });

        // 3. Placeholder Redirect URI for SMART flow within retriever
        app.get('/ehr-callback', (req, res) => {
            console.error('[Server] /ehr-callback hit (intermediate step). Redirecting back to retriever base.');
            // Construct URL relative to the dynamic base URL
            const originalUrl = req.originalUrl;
            const queryIndex = originalUrl.indexOf('?');
            const queryString = (queryIndex !== -1) ? originalUrl.substring(queryIndex) : '';
            // Redirect back to the retriever's root path
            res.redirect(`/ehretriever.html${queryString}`);
        });

        // 4. Endpoint to receive final EHR data FROM the retriever
        // Ensure this path matches the 'cli-callback' postUrl built into the retriever
        app.post('/ehr-data', async (req: Request, res: Response) => {
            console.error('[Server] /ehr-data received POST request.');
            try {
                const clientFullEhr: ClientFullEHR = req.body;
                // Basic validation
                if (!clientFullEhr || typeof clientFullEhr !== 'object' || !clientFullEhr.fhir || !clientFullEhr.attachments) {
                    throw new Error("Invalid or missing ClientFullEHR data structure in request body.");
                }
                console.error(`[Server] Received EHR data. Resource types: ${Object.keys(clientFullEhr.fhir).length}, Attachments: ${clientFullEhr.attachments.length}`);

                // Check if DB file already exists
                 try {
                     await fs.access(dbPath);
                     console.warn(`[Server] Warning: Output database file "${dbPath}" already exists. It will be overwritten.`);
                     // Optionally delete it first if Database() doesn't overwrite cleanly
                     // await fs.unlink(dbPath); 
                 } catch (accessError: any) {
                     if (accessError.code !== 'ENOENT') {
                         throw new Error(`Cannot access target database path "${dbPath}": ${accessError.message}`);
                     }
                     // ENOENT is expected, means file doesn't exist yet
                     console.error(`[Server] Output database file "${dbPath}" does not exist, will be created.`);
                 }


                console.error(`[Server] Initializing database at: ${dbPath}`);
                const db = new Database(dbPath); // Bun automatically creates/opens

                try {
                    console.error('[Server] Populating database...');
                    await ehrToSqlite(clientFullEhr, db);
                    console.error(`[Server] Successfully saved EHR data to ${dbPath}`);
                    // Tell the retriever JS that the POST was successful.
                    // The retriever JS doesn't expect a redirect URL in this flow.
                    res.status(200).json({ success: true });
                    // Initiate graceful shutdown after success
                    console.error('[Server] Data saved. Shutting down server...');
                    shutdown();
                } finally {
                    // Ensure DB is closed even if ehrToSqlite fails
                    try { db.close(); } catch (e) { console.error('[Server] Error closing DB:', e); }
                }

            } catch (error: any) {
                console.error('[Server] Error processing /ehr-data:', error.message);
                res.status(500).json({ success: false, error: "processing_failed", error_description: error.message });
                // Shut down server on failure too
                shutdown(error);
            }
        });

        // Error handling middleware
        app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
            console.error("[Server] Unhandled Error:", err.stack);
             res.status(500).send('Internal Server Error');
             shutdown(err); // Shut down on unhandled errors
        });

        // --- Create Server (HTTP or HTTPS based on config) ---
        try {
            if (serverConfig.https.enabled) {
                console.log("[Server] HTTPS is enabled. Loading certificates...");
                 if (!serverConfig.https.keyPath || !serverConfig.https.certPath) {
                     throw new Error("HTTPS enabled but keyPath or certPath missing in server config.");
                 }
                try {
                    const key = await fs.readFile(serverConfig.https.keyPath);
                    const cert = await fs.readFile(serverConfig.https.certPath);
                    const serverOptions: https.ServerOptions = { key: key, cert: cert };
                    console.log(`[Server] Certificates loaded successfully.`);
                    server = https.createServer(serverOptions, app);
                 } catch (certError: any) {
                    console.error(`[Server] FATAL ERROR loading certificate files:`, certError.message);
                     // Reject the main promise, triggering shutdown logic if needed
                     return reject(new Error(`Failed to load certificates: ${certError.message}`));
                 }
            } else {
                console.log("[Server] HTTPS is disabled. Creating HTTP server.");
                server = http.createServer(app);
            }

            server.listen(port, host, () => { // Use host from config
                 console.error(`[Server] Temporary ${protocol.toUpperCase()} server listening on ${baseUrl}`);
                 console.error(`[Action Required] Please open your web browser to: ${baseUrl}/start`);
                 console.error('[Server] Fill in the EHR details in the browser UI to connect and fetch data.');
                 console.error(`[Server] Waiting for data to be received at ${baseUrl}/ehr-data...`);
            });

            server.on('error', (error: NodeJS.ErrnoException) => {
                console.error(`[Server] Failed to start server on ${host}:${port}: ${error.message}`);
                if (error.code === 'EADDRINUSE') {
                    console.error(`[Server] Address ${host}:${port} is already in use. Check config or processes using the port.`);
                }
                server = null; // Ensure server is null so shutdown doesn't try to close it
                shutdown(error); // Reject the promise
            });
        } catch (serverSetupError: any) {
             console.error(`[Server] Error during server setup:`, serverSetupError.message);
             reject(serverSetupError); // Reject promise if initial setup (like cert loading check) fails
        }
    });
}

// --- Main CLI Function ---
async function main() {
    const program = new Command();

    program
        .name('ehr-mcp-cli')
        .description('Exposes EHR tools (grep, query, eval) over stdio or fetches EHR data to a DB.')
        .version(SERVER_INFO.version)
        .requiredOption('-d, --db <path>', 'Path to the SQLite database file (read for stdio mode, write for --create-db mode).')
        // Options for --create-db mode
        .option('--create-db', 'Initiate EHR fetch via browser UI and save to the --db path.')
        .option('-c, --config <path>', 'Optional path to config file (used by retriever build and server settings in --create-db mode).', './config.stdio.json') // Default config path
        // .option('--port <port>', 'Port for the temporary web server (for --create-db).', '8088') // Port now comes from config
        // Add new mutually exclusive flags for handling existing DB in --create-db mode
        .option('--force-overwrite', 'If --db exists in --create-db mode, delete it before creating a new one.')
        .option('--force-concat', 'If --db exists in --create-db mode, add new data to the existing file.')
        .parse(process.argv);

    const options = program.opts();
    const dbPath = path.resolve(options.db);

    if (options.createDb) {
        // --- Create DB Mode ---
        console.error('[CLI] Running in --create-db mode.');

        // --- Load Configuration ---
        const configPath = path.resolve(options.config);
        let appConfig: AppConfig;
        try {
             console.log(`[CLI] Loading configuration from: ${configPath}`);
             appConfig = await loadConfig(configPath);
             // Basic validation of server config needed for this mode
             if (!appConfig.server || typeof appConfig.server.port !== 'number' || !appConfig.server.host) {
                 throw new Error("Server 'host' and 'port' must be defined in the config file.");
             }
             if (appConfig.server.https.enabled && (!appConfig.server.https.keyPath || !appConfig.server.https.certPath)) {
                 throw new Error("HTTPS is enabled in config, but 'keyPath' or 'certPath' is missing.");
             }
             console.log(`[CLI] Configuration loaded successfully. Server Base URL: ${appConfig.server.baseUrl}`);
        } catch (configError: any) {
             console.error(`[CLI] FATAL ERROR loading or validating configuration from "${configPath}": ${configError.message}`);
             process.exit(1);
        }
        // --- End Load Configuration ---

        // const port = parseInt(options.port, 10); // Port now comes from config
        // if (isNaN(port)) {
        //     console.error('[CLI] Error: Invalid port number provided.');
        //     process.exit(1);
        // }

        // --- Upfront check for existing DB file ---
        try {
            await fs.access(dbPath); // Check if file exists (throws if not)
            console.warn(`[CLI] Database file "${dbPath}" already exists.`);
            if (options.forceOverwrite && options.forceConcat) {
                console.error('[CLI] Error: --force-overwrite and --force-concat cannot be used together.');
                process.exit(1);
            } else if (options.forceOverwrite) {
                console.warn(`[CLI] --force-overwrite specified. Deleting existing file: ${dbPath}`);
                try {
                    await fs.unlink(dbPath);
                    console.error(`[CLI] Successfully deleted existing file.`);
                } catch (unlinkError: any) {
                    console.error(`[CLI] Error deleting existing file "${dbPath}": ${unlinkError.message}`);
                    process.exit(1);
                }
            } else if (options.forceConcat) {
                console.warn(`[CLI] --force-concat specified. New data will be added to the existing file.`);
                // No action needed here, the database will be opened and appended to later.
            } else {
                console.error(`[CLI] Error: Database file "${dbPath}" already exists.`);
                console.error('[CLI] Use --force-overwrite to delete it or --force-concat to add to it.');
                process.exit(1);
            }
        } catch (accessError: any) {
            if (accessError.code === 'ENOENT') {
                // File doesn't exist, which is the normal case, proceed silently.
                console.error(`[CLI] Database file "${dbPath}" does not exist, will be created.`);
            } else {
                // Other access error (e.g., permissions)
                console.error(`[CLI] Error checking database path "${dbPath}": ${accessError.message}`);
                process.exit(1);
            }
        }
        // --- End upfront check ---

        // --- Dynamically build ehretriever.ts for CLI mode ---

        // Define the specific endpoint needed for CLI mode, using the loaded config base URL
        const cliPostUrl = new URL('/ehr-data', appConfig.server.baseUrl).toString();
        console.error(`[CLI] Configuring retriever to POST data to: ${cliPostUrl}`);
        const cliDeliveryEndpoint = {
            "cli-callback": { postUrl: cliPostUrl } // Use the fully qualified URL
        };

        // Prepare arguments for the build script
        const buildScriptPath = path.resolve(__dirname, '..', 'scripts', 'build-ehretriever.ts');
        const buildScriptArgs = [
            buildScriptPath,
            // Pass the CLI-specific endpoint as a JSON string
            '--extra-endpoints', JSON.stringify(cliDeliveryEndpoint)
            // Pass the original config file path to the build script as well
            // so it can read retrieverConfig, vendorConfig etc.
        ];
        // Always pass the config path used by the CLI to the build script
        console.error(`[CLI] Using config file for retriever build: ${configPath}`);
        buildScriptArgs.push('--config', configPath);
        
        // If a base config file is provided via CLI args, pass it to the build script
        // This logic is now handled by always passing options.config
        // if (options.config) {
        //     const configPath = path.resolve(options.config);
        //     console.error(`[CLI] Using config file for retriever build: ${configPath}`);
        //     buildScriptArgs.push('--config', configPath);
        // }

        // Execute the build script
        console.error(`[CLI] Running build script: bun ${buildScriptArgs.join(' ')}`);
        const buildProc = spawn(['bun', ...buildScriptArgs], {
            stdio: ['ignore', 'pipe', 'pipe'], // Capture stdout/stderr
            // cwd: process.cwd(), // Optional: ensure correct working directory if needed
        });

        // Capture and log output in real-time (or after exit)
        let buildStdout = '';
        let buildStderr = '';
        buildProc.stdout.pipeTo(new WritableStream({ write(chunk) { buildStdout += chunk; console.error('[Build stdout]:', new TextDecoder().decode(chunk).trim()); } }));
        buildProc.stderr.pipeTo(new WritableStream({ write(chunk) { buildStderr += chunk; console.error('[Build stderr]:', new TextDecoder().decode(chunk).trim()); } }));

        const buildExitCode = await buildProc.exited;

        if (buildExitCode !== 0) {
            console.error('[CLI] FATAL ERROR: Failed to build ehretriever for --create-db mode.');
            console.error(`[CLI] Exit Code: ${buildExitCode}`);
            process.exit(1);
        }
        console.error('[CLI] Successfully built ehretriever for CLI mode.');
        // --- End dynamic build ---

        try {
            // Pass dbPath and the loaded server configuration
            await startEhrFetchServer(dbPath, appConfig.server);
            console.error(`[CLI] Successfully created database: ${dbPath}`);
            process.exit(0);
        } catch (error: any) {
            console.error(`[CLI] Failed to create database: ${error.message}`);
            process.exit(1);
        }

    } else {
        // --- Stdio Mode (Original Logic) ---
        console.error(`[CLI] Running in stdio mode.`);
        console.error(`[CLI] Using database: ${dbPath}`);

        // --- Database and Data Loading ---
        let db: Database | undefined = undefined; // Initialize as potentially undefined
        let fullEhr: ClientFullEHR;

        try {
            await fs.access(dbPath, fs.constants.R_OK);
            console.error(`[CLI] Database file found. Opening...`);
            db = new Database(dbPath, { readonly: true });
            console.error(`[CLI] Database opened successfully.`);
            console.error(`[CLI] Loading EHR data from database...`);
            fullEhr = await sqliteToEhr(db);
            console.error(`[CLI] EHR data loaded. Resources: ${Object.values(fullEhr.fhir).flat().length}, Attachments: ${fullEhr.attachments.length}`);
        } catch (error: any) {
            console.error(`[CLI] FATAL ERROR loading database or EHR data from "${dbPath}":`, error.message);
            if (error.code === 'ENOENT') console.error(`[CLI] Error: Database file not found at ${dbPath}. Use --create-db mode to generate one.`);
            else if (error.code === 'EACCES') console.error(`[CLI] Error: Permission denied reading database file at ${dbPath}`);
            // Attempt to close DB if it was opened before the error during loading
            if (db) {
                 try { db.close(); console.error("[CLI] Closed DB connection after load error."); } catch (closeErr) {}
            }
            process.exit(1);
        }

        // --- MCP Server Setup ---
        const server = new McpServer(SERVER_INFO, {
            capabilities: { tools: {}, sampling: {} },
            instructions: `Server providing tools to interact with EHR data loaded from ${path.basename(dbPath)}.`
        });

        // --- Register Tools (Using Imported Logic) ---

        // Context retrieval function for CLI stdio environment
        async function getCliContext(
            _toolName: string,
            extra?: Record<string, any> 
        ): Promise<{ fullEhr?: ClientFullEHR, db?: Database }> {
             // In CLI stdio mode, db and fullEhr are pre-loaded in the outer scope
             // We don't need 'extra' here
             return { fullEhr, db };
        }

        // Register tools using the centralized function
        registerEhrTools(server, getCliContext);

        // --- Start Stdio Transport ---
        const transport = new StdioServerTransport();

        // Graceful shutdown handling
        const shutdown = async (signal: string) => {
            console.error(`\n[CLI] Received ${signal}. Shutting down...`);
            try { await server.close(); console.error("[CLI] MCP server closed."); }
            catch (e) { console.error("[CLI] Error closing MCP server:", e); }
            try {
                // Check if db object exists and attempt to close
                if (db) {
                    db.close(); // Just attempt to close
                    console.error("[CLI] Database connection closed.");
                }
            }
            catch(e) { console.error("[CLI] Error closing database:", e); }
            console.error("[CLI] Shutdown complete.");
            process.exit(0);
        };

        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));

        console.error("[CLI] MCP Server initialized. Connecting to stdio transport...");
        try {
            await server.connect(transport);
            console.error("[CLI] Connected. Waiting for MCP messages on stdin...");
        } catch (error: any) {
            console.error("[CLI] FATAL ERROR connecting MCP server to stdio transport:", error.message);
            // Attempt to close db if it exists
            if (db) {
                 try { db.close(); } catch (closeErr) {}
            }
            process.exit(1);
        }
    }
}

// Run the main function
main().catch(err => {
    console.error("[CLI] Unhandled error in main function:", err);
    process.exit(1);
});

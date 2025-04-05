import { Command } from 'commander';
import { Database } from 'bun:sqlite';
import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'bun'; // Needed for running build

// --- Imports for --create-db mode ---
import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import cors from 'cors';
// --- End imports for --create-db ---

// Corrected MCP SDK imports
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Implementation } from "@modelcontextprotocol/sdk/types.js"; // Import common types

// Corrected local module imports (assuming cli.ts is in src/)
import { ClientFullEHR } from '../clientTypes.js'; // Assumes clientTypes.ts is in project root
import { sqliteToEhr, ehrToSqlite } from './dbUtils.js'; // Assumes dbUtils.ts is in src/

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
    port: number
): Promise<void> {
    return new Promise((resolve, reject) => {
        const app = express();
        app.use(cors());
        app.use(express.json({ limit: '50mb' })); // For receiving EHR data

        let server: http.Server | null = null;

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
        app.use('/static', express.static(staticPath));

        // 2. Initial endpoint to start the flow
        app.get('/start', (req, res) => {
            console.error('[Server] /start requested. Redirecting to retriever UI...');
            // This CLI server provides a placeholder for that.
            const retrieverUrl = `/static/ehretriever.html#deliver-to:cli-callback`;
            res.redirect(retrieverUrl);
        });

        // 3. Placeholder Redirect URI for SMART flow within retriever
        app.get('/ehr-callback-placeholder', (req, res) => {
            console.error('[Server] /ehr-callback-placeholder hit (intermediate step). Redirecting back to retriever base.');
            // This takes the code/state from the EHR redirect and puts them back on the query string
            // for the main retriever JS running at /static/ehretriever.html
            const originalUrl = req.originalUrl;
            const queryIndex = originalUrl.indexOf('?');
            const queryString = (queryIndex !== -1) ? originalUrl.substring(queryIndex) : '';
            res.redirect(`/static/ehretriever.html${queryString}`);
        });

        // 4. Endpoint to receive final EHR data FROM the retriever
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

        server = http.createServer(app);

        server.listen(port, () => {
            console.error(`[Server] Temporary web server listening on http://localhost:${port}`);
            console.error(`[Action Required] Please open your web browser to: http://localhost:${port}/start`);
            console.error('[Server] Fill in the EHR details in the browser UI to connect and fetch data.');
            console.error('[Server] Waiting for data to be received at /ehr-data...');
        });

        server.on('error', (error: NodeJS.ErrnoException) => {
            console.error(`[Server] Failed to start server on port ${port}: ${error.message}`);
            if (error.code === 'EADDRINUSE') {
                console.error(`[Server] Port ${port} is already in use. Try a different port using --port.`);
            }
             server = null; // Ensure server is null so shutdown doesn't try to close it
            shutdown(error); // Reject the promise
        });
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
        .option('-c, --config <path>', 'Optional path to config file (used by retriever build in --create-db mode).')
        .option('--port <port>', 'Port for the temporary web server (for --create-db).', '8088')
        // Add new mutually exclusive flags for handling existing DB in --create-db mode
        .option('--force-overwrite', 'If --db exists in --create-db mode, delete it before creating a new one.')
        .option('--force-concat', 'If --db exists in --create-db mode, add new data to the existing file.')
        .parse(process.argv);

    const options = program.opts();
    const dbPath = path.resolve(options.db);

    if (options.createDb) {
        // --- Create DB Mode ---
        console.error('[CLI] Running in --create-db mode.');

        const port = parseInt(options.port, 10);
        if (isNaN(port)) {
             console.error('[CLI] Error: Invalid port number provided.');
             process.exit(1);
        }

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

        // Define the specific endpoint needed for CLI mode
        const cliDeliveryEndpoint = {
            "cli-callback": { postUrl: `./ehr-data` }
        };

        // Prepare arguments for the build script
        const buildScriptPath = path.resolve(__dirname, '..', 'scripts', 'build-ehretriever.ts');
        const buildScriptArgs = [
            buildScriptPath,
            // Pass the CLI-specific endpoint as a JSON string
            '--extra-endpoints', JSON.stringify(cliDeliveryEndpoint)
        ];

        // If a base config file is provided via CLI args, pass it to the build script
        if (options.config) {
            const configPath = path.resolve(options.config);
            console.error(`[CLI] Using config file for retriever build: ${configPath}`);
            buildScriptArgs.push('--config', configPath);
        }

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
            // Pass only dbPath and port
            await startEhrFetchServer(dbPath, port);
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
            toolName: 'grep_record' | 'query_record' | 'eval_record',
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

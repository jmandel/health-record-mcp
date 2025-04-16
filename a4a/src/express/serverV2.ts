// a4a/src/express/serverV2.ts
import express from 'express'; 
import cors from 'cors'; 
import http from 'node:http';
import type net from 'node:net'; // For graceful shutdown

// Import Core V2 and types directly
import { A2AServerCoreV2 } from '../core/A2AServerCoreV2';
import { SseConnectionManager } from '../core/SseConnectionManager'; // Default notification service
// Import V2 Processor Interfaces
import type { TaskProcessorV2 } from '../interfaces/processorV2'; 
// Import Core Interfaces (TaskStore, NotificationService, GetAuthContextFn)
import type { 
    TaskStore, 
    NotificationService, 
    GetAuthContextFn // Trying import from main interfaces file
} from '../interfaces'; 
// Import Core Types (AgentCard etc.)
import type { AgentCard } from '../types'; 
import type * as A2ATypes from '../types'; // Keep for RPC types
import { A2AErrorCodes } from '../types'; // Keep for error codes

// --- V2 Configuration Interface --- //
// Stays defined locally as library export might be incorrect
export interface A2AServerConfigV2 {
    agentCard: Partial<AgentCard>; 
    taskStore: TaskStore;
    taskProcessors: TaskProcessorV2[]; // Expects V2 Processors
    notificationServices?: NotificationService[];
    port?: number; // Added back
    baseUrl?: string;
    rpcPath?: string;
    agentCardPath?: string;
    serverCapabilities?: Partial<AgentCard['capabilities']>;
    serverAuthentication?: AgentCard['authentication'];
    getAuthContext?: GetAuthContextFn; // Should now resolve
    configureApp?: (app: express.Application, core: A2AServerCoreV2, completeAgentCard: AgentCard) => void;
    maxHistoryLength?: number;
}

// --- V2 Handler Creation --- //

/**
 * Creates Express request handlers specifically for A2AServerCoreV2.
 */
export function createA2AExpressHandlersV2(core: A2AServerCoreV2, config: A2AServerConfigV2) {

    const agentCardHandler: express.RequestHandler = (req, res) => {
        try {
            res.json(core.getAgentCard());
        } catch (error: any) {
            console.error("[AgentCard Handler V2] Error:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    };

    const a2aRpcHandler: express.RequestHandler = async (req, res) => {
        if (req.headers['content-type'] !== 'application/json') {
            return res.status(415).json({
                jsonrpc: "2.0", id: null,
                error: { code: A2AErrorCodes.ParseError, message: "Unsupported Media Type: Content-Type must be application/json" }
            });
        }

        const body = req.body as A2ATypes.JsonRpcRequest;
        let requestId: string | number | null = null;

        try {
            if (body.jsonrpc !== "2.0" || typeof body.method !== 'string') {
                throw createJsonRpcError(A2AErrorCodes.InvalidRequest, "Invalid JSON-RPC request structure.", body.id ?? null);
            }
            requestId = body.id;

            let authContext: any = null;
            if (config.getAuthContext) { 
                authContext = await config.getAuthContext(req);
            }

            let result: any;

            if (body.method === 'tasks/sendSubscribe' || body.method === 'tasks/resubscribe') {
                if (!core.getAgentCard().capabilities?.streaming) {
                    throw createJsonRpcError(A2AErrorCodes.UnsupportedOperation, `Method ${body.method} requires streaming capability, which is not supported.`, requestId);
                }
                
                res.setHeader('Content-Type', 'text/event-stream');
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Connection', 'keep-alive');
                res.flushHeaders(); 

                if (body.method === 'tasks/sendSubscribe') {
                    await core.handleTaskSendSubscribe(requestId, body.params, res, authContext);
                } else { 
                    await core.handleTaskResubscribe(requestId, body.params, res, authContext);
                }
                return; 
            }

            switch (body.method) {
                case 'tasks/send':
                    result = await core.handleTaskSend(body.params, authContext);
                    break;
                case 'tasks/get':
                    result = await core.handleTaskGet(body.params, authContext);
                    break;
                case 'tasks/cancel':
                    result = await core.handleTaskCancel(body.params, authContext);
                    break;
                // Add other V2 methods if needed
                default:
                    throw createJsonRpcError(A2AErrorCodes.MethodNotFound, `Method not found: ${body.method}`, requestId);
            }

            const response: A2ATypes.JsonRpcSuccessResponse = {
                jsonrpc: "2.0",
                id: requestId,
                result: result
            };
            res.json(response);

        } catch (error: any) {
            console.error("[A2A RPC Handler V2] Error processing request:", error);
            let jsonRpcError: A2ATypes.JsonRpcError;

            // Use helper to ensure error has standard A2AError structure
            const structuredError = ensureA2AError(error, requestId);
            jsonRpcError = { code: structuredError.code, message: structuredError.message, data: structuredError.data };

            if (!res.headersSent) {
                const errorResponse: A2ATypes.JsonRpcErrorResponse = {
                    jsonrpc: "2.0",
                    id: requestId, 
                    error: jsonRpcError
                };
                let statusCode = getStatusCodeForA2AError(jsonRpcError.code);
                res.status(statusCode).json(errorResponse);
            } else {
                console.error("[A2A RPC Handler V2] Error occurred after SSE headers sent. Cannot send JSON error.");
                if (!res.closed) { res.end(); } 
            }
        }
    };

    return { agentCardHandler, a2aRpcHandler };
}

// --- V2 Server Setup Function --- //

export function startA2AExpressServerV2(config: A2AServerConfigV2): http.Server {
    const { 
        agentCard: agentDefinition, // Rename for clarity within function
        taskProcessors, 
        taskStore,
        notificationServices: configNotificationServices,
        port: configPort,
        baseUrl: configBaseUrl,
        rpcPath: configRpcPath = '/a2a', // Default RPC path
        agentCardPath: configAgentCardPath = '/.well-known/agent.json', // Default card path
        serverCapabilities,
        serverAuthentication,
        getAuthContext, // Pass getAuthContext from config
        configureApp,
        maxHistoryLength 
    } = config;

    const PORT = configPort ?? parseInt(process.env.PORT || '3001', 10);
    const BASE_URL = configBaseUrl ?? process.env.BASE_URL ?? `http://localhost:${PORT}`;

    // --- Determine Notification Services --- 
    // Check capabilities defined in the partial card first
    const streamingEnabled = agentDefinition.capabilities?.streaming ?? serverCapabilities?.streaming ?? false;
    let servicesToUse = configNotificationServices;
    if ((!servicesToUse || servicesToUse.length === 0) && streamingEnabled) {
        console.log("[A2A Setup V2] No notification services provided but streaming enabled; adding default SseConnectionManager.");
        servicesToUse = [new SseConnectionManager()]; 
    }

    // --- Configure the A2A Server Core V2 --- 
    // Pass the potentially updated services and auth function
    const coreV2Config: A2AServerConfigV2 = {
         ...config, // Spread the original config
         notificationServices: servicesToUse,
         baseUrl: BASE_URL,
         rpcPath: configRpcPath,
         // The core itself will merge capabilities and auth, and build the final agent card
         // We pass the partial definition and overrides.
         agentCard: agentDefinition,
         serverCapabilities: serverCapabilities,
         serverAuthentication: serverAuthentication,
         getAuthContext: getAuthContext, 
         maxHistoryLength: maxHistoryLength,
    };
    const a2aCore = new A2AServerCoreV2(coreV2Config);
    const completeAgentCard = a2aCore.getAgentCard(); // Get the final card built by the core

    // --- Set up Express app --- 
    const app = express();
    app.use(cors()); 
    app.use(express.json()); 

    // --- Create Handlers using V2 Core --- 
    const { agentCardHandler, a2aRpcHandler } = createA2AExpressHandlersV2(a2aCore, config); // Pass core and original config

    // --- Standard A2A Routes --- 
    app.get(configAgentCardPath, agentCardHandler);
    app.post(configRpcPath, a2aRpcHandler);

    // --- Custom App Configuration --- 
    if (configureApp) {
        configureApp(app, a2aCore, completeAgentCard);
    }

    // --- Basic Root Endpoint --- 
    app.get('/', (req, res) => {
        res.send(`${completeAgentCard.name} running! Visit ${configAgentCardPath} for capabilities. POST to ${configRpcPath} for A2A communication.`);
    });

    // --- Start Server --- 
    const server = http.createServer(app);
    server.listen(PORT, () => {
        console.log(`-------------------------------------------------------`);
        console.log(`🚀 ${completeAgentCard.name} (v${completeAgentCard.version}) [V2 Core] server started`);
        console.log(`👂 Listening on port: ${PORT}`);
        console.log(`🔗 Base URL: ${BASE_URL}`);
        console.log(`🃏 Agent Card: ${BASE_URL}${configAgentCardPath}`);
        console.log(`⚡ A2A Endpoint (POST): ${completeAgentCard.url}`);
        console.log(`-------------------------------------------------------`);
    }).on('error', (err: NodeJS.ErrnoException) => {
        console.error(`❌ Failed to start V2 server on port ${PORT}:`, err);
        process.exit(1);
    });

    // --- Graceful Shutdown Logic (Optional but Recommended) --- 
    const connections = new Map<string, net.Socket>();
    server.on('connection', (conn) => {
        const key = `${conn.remoteAddress}:${conn.remotePort}`;
        connections.set(key, conn);
        conn.on('close', () => { connections.delete(key); });
    });

    let shuttingDown = false;
    const gracefulShutdown = async (signal: string) => {
        if (shuttingDown) return;
        shuttingDown = true;
        console.log(`[A2A Server V2] Received ${signal}. Starting graceful shutdown...`);

        // 1. Close Notification Services
        if (servicesToUse && servicesToUse.length > 0) {
            console.log('[A2A Server V2] Closing notification services...');
            await Promise.all(servicesToUse
                .filter(s => typeof s.closeAll === 'function')
                .map(s => s.closeAll!().catch((e: any) => console.error(`Error closing ${s.constructor.name}:`, e))) // Corrected lambda syntax
            );
            console.log('[A2A Server V2] Notification services closed.');
        }

        // 2. Stop accepting new connections & close existing
        server.close((err) => {
            if (err) console.error('[A2A Server V2] Error closing server:', err);
            else console.log('[A2A Server V2] Server closed.');
        });

        // 3. Destroy remaining connections after a short delay
        setTimeout(() => {
            console.log(`[A2A Server V2] Destroying ${connections.size} remaining connections...`);
            connections.forEach((conn) => conn.destroy());
        }, 500); // Adjust delay as needed

         // 4. Failsafe exit
         setTimeout(() => {
             console.error('[A2A Server V2] Shutdown timeout reached. Forcing exit.');
             process.exit(1);
         }, 5000).unref(); // e.g., 5 seconds
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    return server;
}

// --- Helper Functions --- //
// (Copied from manual server setup, could be further centralized)

interface StructuredA2AError extends Error {
    isA2AError: true;
    code: number;
    data?: any;
    id?: string | number | null;
}

function createJsonRpcError(code: number, message: string, id: string | number | null, data?: any): StructuredA2AError {
     const error = new Error(message) as StructuredA2AError;
     error.isA2AError = true;
     error.code = code;
     error.id = id; 
     error.data = data;
     return error;
}

function ensureA2AError(error: any, id: string | number | null): StructuredA2AError {
     if (error && error.isA2AError && typeof error.code === 'number') {
         return error as StructuredA2AError;
     }
     // Convert generic errors to internal server error
     return createJsonRpcError(A2AErrorCodes.InternalError, "An internal server error occurred.", id, error?.message);
}

function getStatusCodeForA2AError(errorCode: number): number {
     switch (errorCode) {
         case A2AErrorCodes.ParseError:
         case A2AErrorCodes.InvalidRequest:
             return 400;
         case A2AErrorCodes.MethodNotFound:
         case A2AErrorCodes.TaskNotFound:
             return 404;
         case A2AErrorCodes.AuthenticationRequired:
             return 401;
         case A2AErrorCodes.AuthorizationFailed:
             return 403;
          case A2AErrorCodes.UnsupportedOperation:
              return 405; 
         case A2AErrorCodes.InvalidParams:
             return 400; 
         default:
             return 500; 
     }
} 
import express from 'express'; // Keep as default import
import * as http from 'node:http'; // Import http
import * as net from 'node:net'; // <-- Import net
import {
    type AgentCard,
    type TaskStore,
    type TaskProcessor,
    type GetAuthContextFn,
    A2AServerCore,
    createA2AExpressHandlers,
    type A2AErrorCodes,
} from '../index'; // Adjust path based on actual file structure
// Import NotificationService separately if needed
import type { NotificationService } from '../interfaces';
// Import SseConnectionManager directly
import { SseConnectionManager } from '../core/SseConnectionManager';

export interface StartA2AExpressServerConfig {
    /** Agent-specific definition (Partial AgentCard) */
    agentDefinition: Partial<AgentCard>;
    /** Array of TaskProcessor instances for the agent */
    taskProcessors: TaskProcessor[];
    /** TaskStore instance */
    taskStore: TaskStore;
    /** Optional array of NotificationService instances */
    notificationServices?: NotificationService[];
    /** Optional port number (defaults to process.env.PORT or 3001) */
    port?: number;
    /** Optional base URL (defaults to http://localhost:PORT) */
    baseUrl?: string;
    /** Optional overrides for server capabilities (merged with agentDefinition if provided) */
    serverCapabilities?: Partial<AgentCard['capabilities']>;
    /** Optional server authentication settings (overrides agentDefinition if provided) */
    serverAuthentication?: AgentCard['authentication'];
    /** Optional function to get authentication context from requests */
    getAuthContext?: GetAuthContextFn;
    /** Optional function to add custom middleware or routes to the Express app */
    configureApp?: (app: express.Application, core: A2AServerCore, completeAgentCard: AgentCard) => void;
    /** Optional limit for task history retrieval (defaults to 50) */
    maxHistoryLength?: number;
}

/**
 * Creates, configures, and starts an Express server for an A2A Agent.
 *
 * @param config Configuration options for the server.
 * @returns The running http.Server instance.
 */
export function startA2AExpressServer(config: StartA2AExpressServerConfig): http.Server { // Return http.Server
    const { 
        agentDefinition, 
        taskProcessors, 
        taskStore,
        notificationServices: configNotificationServices,
        port: configPort,
        baseUrl: configBaseUrl,
        serverCapabilities,
        serverAuthentication,
        getAuthContext,
        configureApp,
        maxHistoryLength 
    } = config;

    const PORT = configPort ?? parseInt(process.env.PORT || '3001', 10);
    const BASE_URL = configBaseUrl ?? process.env.BASE_URL ?? `http://localhost:${PORT}`;

    // --- Construct the complete Agent Card ---
    const completeAgentCard: AgentCard = {
        // Start with agent-specific properties, providing defaults for required fields
        name: agentDefinition.name ?? 'Unnamed Agent',
        version: agentDefinition.version ?? '0.0.0',
        description: agentDefinition.description ?? 'No description provided.',
        provider: agentDefinition.provider,
        defaultInputModes: agentDefinition.defaultInputModes ?? ['text/plain'],
        defaultOutputModes: agentDefinition.defaultOutputModes ?? ['text/plain'],
        skills: agentDefinition.skills ?? [],
        documentationUrl: agentDefinition.documentationUrl,
        
        // Add/Override server-specific properties
        url: `${BASE_URL}/a2a`, // A2A endpoint URL
        authentication: serverAuthentication ?? agentDefinition.authentication ?? { schemes: [] }, 
        capabilities: {
            // Sensible defaults, can be overridden by serverCapabilities
            streaming: true, 
            pushNotifications: false, 
            stateTransitionHistory: false, // Assume false unless store indicates otherwise
            ...(agentDefinition.capabilities ?? {}), // Merge agent definition capabilities
            ...(serverCapabilities ?? {}), // Server overrides take precedence
        },
    };

    // Validate required fields after merging
    if (!completeAgentCard.name || !completeAgentCard.version || !completeAgentCard.url) {
        throw new Error("Cannot start server: AgentCard is missing required fields (name, version, url) after merging.");
    }

    // --- Determine Notification Services ---
    let servicesToUse = configNotificationServices; // Start with user-provided list

    // If no services provided AND agent card indicates streaming, add default SSE
    if ((!servicesToUse || servicesToUse.length === 0) && completeAgentCard.capabilities.streaming) {
        console.log("[A2A Setup] No notification services provided but streaming enabled; adding default SseConnectionManager.");
        // Make sure SseConnectionManager is imported correctly
        servicesToUse = [new SseConnectionManager()]; 
    }

    // --- Configure the A2A Server Core ---
    const a2aCore = new A2AServerCore({
        agentCard: completeAgentCard,
        taskStore: taskStore,
        taskProcessors: taskProcessors,
        notificationServices: servicesToUse,
        getAuthContext: getAuthContext,
        maxHistoryLength: maxHistoryLength,
        // TODO: Potentially pass TaskStore capabilities to infer stateTransitionHistory?
    });

    // --- Set up Express app ---
    const app = express();

    // Standard Middleware
    app.use(express.json()); // Use built-in Express JSON parser

    // --- Create A2A Handlers ---
    const { agentCardHandler, a2aRpcHandler } = createA2AExpressHandlers(a2aCore);

    // --- Standard A2A Routes ---
    // Allow overriding the well-known path?
    const agentCardPath = '/.well-known/agent.json';
    app.get(agentCardPath, agentCardHandler);

    // Allow overriding the RPC path?
    const rpcPath = '/a2a';
    app.post(rpcPath, a2aRpcHandler);

    // --- Custom App Configuration ---
    if (configureApp) {
        configureApp(app, a2aCore, completeAgentCard);
    }

    // --- Basic Root Endpoint (Optional but helpful) ---
    app.get('/', (req: express.Request, res: express.Response) => {
        res.send(`${completeAgentCard.name} running! Visit ${agentCardPath} for capabilities. POST to ${rpcPath} for A2A communication.`);
    });

    // --- Start Server ---
    const server = app.listen(PORT, () => { // Capture server instance
        console.log(`-------------------------------------------------------`);
        console.log(`🚀 ${completeAgentCard.name} (v${completeAgentCard.version}) server started`);
        console.log(`👂 Listening on port: ${PORT}`);
        console.log(`🔗 Base URL: ${BASE_URL}`);
        console.log(`🃏 Agent Card: ${BASE_URL}${agentCardPath}`);
        console.log(`⚡ A2A Endpoint (POST): ${completeAgentCard.url}`);
        console.log(`-------------------------------------------------------`);
        // Log custom routes added via configureApp? Could be tricky.
    }).on('error', (err: NodeJS.ErrnoException) => {
        console.error(`❌ Failed to start server on port ${PORT}:`, err);
        process.exit(1);
    });

    // --- Connection Tracking for Graceful Shutdown ---
    const connections = new Map<string, net.Socket>();
    server.on('connection', (conn: net.Socket) => {
        const key = `${conn.remoteAddress}:${conn.remotePort}`;
        connections.set(key, conn);
        // console.log(`[Server] Connection ${key} established.`); // Verbose logging
        conn.on('close', () => {
            // console.log(`[Server] Connection ${key} closed.`); // Verbose logging
            connections.delete(key);
        });
    });

    // Handle graceful shutdown
    let shuttingDown = false; // Flag to prevent double execution
    const gracefulShutdown = async () => {
        if (shuttingDown) return;
        shuttingDown = true;
        console.log('[A2A Server] Received shutdown signal. Starting graceful shutdown...');

        // 1. Close Notification Services first
        if (servicesToUse && servicesToUse.length > 0) { 
             console.log('[A2A Server] Closing notification services...');
             const closePromises = servicesToUse
                 .filter(service => typeof service.closeAll === 'function')
                 .map(service => service.closeAll!().catch(e => {
                     console.error(`[A2A Server] Error closing ${service.constructor.name}:`, e);
                 }));
             try {
                 await Promise.all(closePromises);
                 console.log('[A2A Server] Notification services closed.');
             } catch (e) {
                 console.error('[A2A Server] Error awaiting notification service closure:', e);
             }
         } else {
             console.log('[A2A Server] No configured notification services to close.');
         }

        // 2. Destroy existing connections
        console.log(`[A2A Server] Destroying ${connections.size} remaining connections...`);
        connections.forEach((conn, key) => {
            conn.destroy();
            connections.delete(key);
        });
        console.log('[A2A Server] Remaining connections destroyed.');

        // 3. Stop accepting new connections
        console.log('[A2A Server] Calling server.close()...');
        server.close((err?: Error) => {
            if (err) {
                console.error('[A2A Server] Error during server.close() callback:', err);
            }
            console.log('[A2A Server] server.close() callback executed.');
            // Don't exit here, rely on the timeout below
        });

        // 4. Set a failsafe timeout to exit
        const SHUTDOWN_TIMEOUT = 500; // ms
        console.log(`[A2A Server] Setting ${SHUTDOWN_TIMEOUT}ms timeout for process exit.`);
        const failSafeTimer = setTimeout(() => {
            console.error(`[A2A Server] Shutdown timeout reached. Forcing exit.`);
            process.exit(1); // Exit with error code if timeout needed
        }, SHUTDOWN_TIMEOUT);
        failSafeTimer.unref(); // unref() allows the program to exit if this is the only timer left

        console.log("[A2A Server] Graceful shutdown initiated. Process should exit cleanly.");
    };

    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);

    return server;
} 
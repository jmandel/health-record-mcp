import express from 'express';
import cors from 'cors';
import * as http from 'node:http';
import * as net from 'node:net';
import {
    type AgentCard,
    type TaskStore,
    type GetAuthContextFn,
    A2AServerCoreV2,
    type TaskProcessorV2,
    createA2AExpressHandlers,
    type A2AErrorCodes,
} from '../index';
import type { NotificationService } from '../interfaces';
import { SseConnectionManager } from '../core/SseConnectionManager';

export interface StartA2AExpressServerConfigV2 {
    /** Agent-specific definition (Partial AgentCard) */
    agentDefinition: Partial<AgentCard>;
    /** Array of TaskProcessorV2 instances for the agent */
    taskProcessors: TaskProcessorV2[];
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
    configureApp?: (
        app: express.Application,
        core: A2AServerCoreV2,
        completeAgentCard: AgentCard
    ) => void;
    /** Optional limit for task history retrieval (defaults to 50) */
    maxHistoryLength?: number;
    /** Optional RPC path (defaults to /a2a) */
    rpcPath?: string;
}

/**
 * Creates, configures, and starts an Express server for an A2A Agent using V2 Processors.
 *
 * @param config Configuration options for the V2 server.
 * @returns The running http.Server instance.
 */
export function startA2AExpressServerV2(config: StartA2AExpressServerConfigV2): http.Server {
    const {
        agentDefinition,
        taskProcessors,
        taskStore,
        notificationServices: configNotificationServices,
        port: configPort,
        baseUrl: configBaseUrl,
        rpcPath: configRpcPath,
        serverCapabilities,
        serverAuthentication,
        getAuthContext,
        configureApp,
        maxHistoryLength
    } = config;

    const PORT = configPort ?? parseInt(process.env.PORT || '3001', 10);
    const BASE_URL = configBaseUrl ?? process.env.BASE_URL ?? `http://localhost:${PORT}`;
    const RPC_PATH = configRpcPath ?? '/a2a';

    // --- Construct the complete Agent Card --- //
    const completeAgentCard: AgentCard = {
        name: agentDefinition.name ?? 'Unnamed Agent V2',
        version: agentDefinition.version ?? '0.0.0',
        description: agentDefinition.description ?? 'No description provided.',
        provider: agentDefinition.provider,
        defaultInputModes: agentDefinition.defaultInputModes ?? ['text/plain'],
        defaultOutputModes: agentDefinition.defaultOutputModes ?? ['text/plain'],
        skills: agentDefinition.skills ?? [],
        documentationUrl: agentDefinition.documentationUrl,
        url: `${BASE_URL.replace(/\/$/, '')}${RPC_PATH}`,
        authentication: serverAuthentication ?? agentDefinition.authentication ?? { schemes: [] },
        capabilities: {
            streaming: false,
            pushNotifications: false,
            stateTransitionHistory: false,
            ...(agentDefinition.capabilities ?? {}),
            ...(serverCapabilities ?? {}),
        },
    };

    if (!completeAgentCard.name || !completeAgentCard.version || !completeAgentCard.url) {
        throw new Error("Cannot start V2 server: AgentCard is missing required fields (name, version, url) after merging.");
    }

    // --- Determine Notification Services --- //
    let servicesToUse = configNotificationServices ?? [];
    let sseManager = servicesToUse.find(
        (service): service is SseConnectionManager => service instanceof SseConnectionManager
    ) ?? null;

    // If no services provided BUT streaming enabled in card, add default SSE manager
    if (servicesToUse.length === 0 && completeAgentCard.capabilities.streaming) {
        console.log("[A2A Setup V2] No notification services provided but streaming enabled; adding default SseConnectionManager.");
        sseManager = new SseConnectionManager();
        servicesToUse = [sseManager];
    }
    // If services WERE provided, ensure the found/created sseManager is in the list if streaming is enabled
    else if (completeAgentCard.capabilities.streaming && !sseManager) {
        console.warn("[A2A Setup V2] Streaming enabled but SseConnectionManager not found in provided services. Adding one.");
        sseManager = new SseConnectionManager();
        servicesToUse.push(sseManager);
    }
    // Ensure streaming capability reflects reality
    if (completeAgentCard.capabilities.streaming && !sseManager) {
        console.warn("[A2A Setup V2] Streaming capability set to true, but no SseConnectionManager configured. Disabling streaming capability.");
        completeAgentCard.capabilities.streaming = false;
    }

    // --- Configure the A2A Server Core V2 --- //
    const a2aCoreV2 = new A2AServerCoreV2({
        agentCard: completeAgentCard,
        taskStore: taskStore,
        taskProcessors: taskProcessors,
        notificationServices: servicesToUse,
        getAuthContext: getAuthContext,
        maxHistoryLength: maxHistoryLength,
        baseUrl: BASE_URL,
        rpcPath: RPC_PATH,
    });

    // --- Set up Express app --- //
    const app = express();
    app.use(cors());
    app.use(express.json());

    // --- Create A2A Handlers using V2 Core --- //
    const { agentCardHandler, a2aRpcHandler } = createA2AExpressHandlers(a2aCoreV2);

    // --- Standard A2A Routes --- //
    const agentCardPath = '/.well-known/agent.json';
    app.get(agentCardPath, agentCardHandler);
    app.post(RPC_PATH, a2aRpcHandler);

    // --- Custom App Configuration --- //
    if (configureApp) {
        configureApp(app, a2aCoreV2, completeAgentCard);
    }

    // --- Basic Root Endpoint --- //
    app.get('/', (req: express.Request, res: express.Response) => {
        res.send(`${completeAgentCard.name} running! Visit ${agentCardPath} for capabilities. POST to ${RPC_PATH} for A2A communication.`);
    });

    // --- Start Server --- //
    const server = app.listen(PORT, () => {
        console.log('-------------------------------------------------------');
        console.log(`🚀 ${completeAgentCard.name} (v${completeAgentCard.version}) V2 server started`);
        console.log(`�� Listening on port: ${PORT}`);
        console.log(`🔗 Base URL: ${BASE_URL}`);
        console.log(`🃏 Agent Card: ${BASE_URL}${agentCardPath}`);
        console.log(`⚡ A2A Endpoint (POST): ${completeAgentCard.url}`);
        console.log('-------------------------------------------------------');
    }).on('error', (err: NodeJS.ErrnoException) => {
        console.error(`❌ Failed to start V2 server on port ${PORT}:`, err);
        process.exit(1);
    });

    // --- Connection Tracking & Graceful Shutdown (mostly unchanged) --- //
    const connections = new Map<string, net.Socket>();
    server.on('connection', (conn: net.Socket) => {
        const key = `${conn.remoteAddress}:${conn.remotePort}`;
        connections.set(key, conn);
        conn.on('close', () => { connections.delete(key); });
    });

    let shuttingDown = false;
    const gracefulShutdown = async () => {
        if (shuttingDown) return;
        shuttingDown = true;
        console.log('[A2A Server V2] Received shutdown signal. Starting graceful shutdown...');

        // 1. Close Notification Services
        if (servicesToUse && servicesToUse.length > 0) {
            console.log('[A2A Server V2] Closing notification services...');
            const closePromises = servicesToUse
                .filter(service => typeof (service as any).closeAll === 'function')
                .map(service => (service as any).closeAll!().catch((e: any) => {
                    console.error(`[A2A Server V2] Error closing ${service.constructor.name}:`, e);
                }));
            try {
                await Promise.all(closePromises);
                console.log('[A2A Server V2] Notification services closed.');
            } catch (e) {
                console.error('[A2A Server V2] Error awaiting notification service closure:', e);
            }
        } else {
            console.log('[A2A Server V2] No configured notification services to close.');
        }

        // 2. Destroy existing connections
        console.log(`[A2A Server V2] Destroying ${connections.size} remaining connections...`);
        connections.forEach((conn, key) => { conn.destroy(); connections.delete(key); });
        console.log('[A2A Server V2] Remaining connections destroyed.');

        // 3. Stop accepting new connections
        console.log('[A2A Server V2] Calling server.close()...');
        server.close((err?: Error) => {
            if (err) { console.error('[A2A Server V2] Error during server.close() callback:', err); }
            console.log('[A2A Server V2] server.close() callback executed.');
        });

        // 4. Set a failsafe timeout
        const SHUTDOWN_TIMEOUT = 500;
        console.log(`[A2A Server V2] Setting ${SHUTDOWN_TIMEOUT}ms timeout for process exit.`);
        const failSafeTimer = setTimeout(() => {
            console.error(`[A2A Server V2] Shutdown timeout reached. Forcing exit.`);
            process.exit(1);
        }, SHUTDOWN_TIMEOUT);
        failSafeTimer.unref();

        console.log("[A2A Server V2] Graceful shutdown initiated. Process should exit cleanly.");
    };

    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);

    return server;
} 
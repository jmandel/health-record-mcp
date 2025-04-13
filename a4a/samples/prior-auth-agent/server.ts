import express from 'express';
import {
    A2AServerCore,
    InMemoryTaskStore,
    createA2AExpressHandlers,
    GetAuthContextFn
} from '@a2a/bun-express';

import { priorAuthAgentCard } from './agentCard';
import { PriorAuthProcessor } from './PriorAuthProcessor';

const PORT = process.env.PORT || 3002;

// 1. Create Task Store instance
const taskStore = new InMemoryTaskStore();

// 2. Create Task Processor instance(s)
const paProcessor = new PriorAuthProcessor();

// 3. Mock Authentication Middleware/Context Extractor
const getAuthContext: GetAuthContextFn = (req) => {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        // Super simple mock validation
        if (token === 'valid-client-token') {
            console.log('[Auth] Valid Bearer token found.');
            return { userId: 'ehr-system-user-123', clientId: 'ehr-client-abc' };
        }
    }
    console.warn('[Auth] No valid Bearer token found.');
    return null; // No valid authentication found
};

// 4. Configure the A2A Server Core
const a2aCore = new A2AServerCore({
    agentCard: priorAuthAgentCard,
    taskStore: taskStore,
    taskProcessors: [paProcessor],
    getAuthContext: getAuthContext // Pass our auth context function
});

// 5. Create Express handlers using the library helper
const { agentCardHandler, a2aRpcHandler } = createA2AExpressHandlers(a2aCore);

// 6. Set up Express app
const app = express();

// Middleware for JSON body parsing
app.use(express.json());

// Route for Agent Card
app.get('/.well-known/agent.json', agentCardHandler);

// Route for A2A JSON-RPC endpoint
app.post('/a2a', a2aRpcHandler);

// --- Add Internal Callback Endpoint (for simulation) ---
app.post('/internal-callback/:taskId', async (req, res) => {
    const taskId = req.params.taskId;
    const payload = req.body;
    console.log(`[Server] Received internal callback for task ${taskId}`);
    try {
        // Use the core instance to trigger the internal update flow
        await a2aCore.triggerInternalUpdate(taskId, payload);
        res.status(200).send({ message: "Internal update processed successfully." });
    } catch (error: any) {
        console.error(`[Server] Error processing internal callback for task ${taskId}:`, error);
        const statusCode = error.code === -32001 ? 404 : 500; // TaskNotFound vs other errors
        res.status(statusCode).send({ error: `Failed to process internal update: ${error.message}` });
    }
});


// Basic root endpoint
app.get('/', (req, res) => {
    res.send(`Prior Auth Agent running! Visit /.well-known/agent.json for capabilities. POST to /a2a for A2A communication.`);
});

// Start the server using Bun's native HTTP server with express adapter
const server = Bun.serve({
    port: PORT,
    fetch: app // Use Express app as the fetch handler
});

console.log(`Prior Auth Agent server running on port ${server.port}`);
console.log(`Agent Card: http://localhost:${server.port}/.well-known/agent.json`);
console.log(`A2A Endpoint: http://localhost:${server.port}/a2a`);
console.log(`Internal Callback Endpoint (POST): http://localhost:${server.port}/internal-callback/:taskId`);


import express from 'express';
import {
    InMemoryTaskStore,
    startA2AExpressServer,
    GetAuthContextFn
} from '@a2a/bun-express';

import { priorAuthAgentCard } from './agentCard';
import { PriorAuthProcessor } from './PriorAuthProcessor';

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

// 4. Start the server using the reusable helper function
startA2AExpressServer({
    agentDefinition: priorAuthAgentCard,
    taskStore: taskStore,
    taskProcessors: [paProcessor],
    getAuthContext: getAuthContext, // Pass the auth context function
    port: parseInt(process.env.PORT || '3002', 10),
    // Define server-level auth requirements (consistent with getAuthContext)
    serverAuthentication: { schemes: ['Bearer'] }, 
    // Configure server capabilities (can differ from agent definition if needed)
    serverCapabilities: {
        streaming: false, // This specific server setup doesn't support streaming yet
        pushNotifications: false // This server setup doesn't support push yet
        // stateTransitionHistory is likely false for InMemoryStore
    },
    // Add agent-specific routes like the internal callback
    configureApp: (app, core, completeAgentCard) => {
        console.log(`Applying custom configuration for ${completeAgentCard.name}`);
        // Internal Callback Endpoint (for simulation/backend interaction)
        app.post('/internal-callback/:taskId', async (req: express.Request, res: express.Response) => {
            const taskId = req.params.taskId;
            const payload = req.body;
            console.log(`[Server] Received internal callback for task ${taskId}`);
            try {
                await core.triggerInternalUpdate(taskId, payload); // Use the passed core instance
                res.status(200).send({ message: "Internal update processed successfully." });
            } catch (error: any) {
                console.error(`[Server] Error processing internal callback for task ${taskId}:`, error);
                // Use A2AErrorCodes if available and error has .code
                const statusCode = error.code === -32001 /* TaskNotFound */ ? 404 : 500;
                res.status(statusCode).send({ error: `Failed to process internal update: ${error.message}` });
            }
        });

        // Log the callback endpoint URL after server starts
        // Note: We can't access the final server port *here*, but we log it in startA2AExpressServer
        // We can log the relative path though.
        console.log(`   -> Internal Callback Endpoint (POST): /internal-callback/:taskId`);
    }
});


// Import only necessary types for config

import { priorAuthAgentCardPartial } from './agentCard';
import { PriorAuthProcessor } from './PriorAuthProcessor';


import {
    InMemoryTaskStore,
    A2AServerConfigV2,
    startA2AExpressServerV2
} from '@jmandel/a2a-bun-express-server'; 


// --- Configuration --- //
const PORT = parseInt(process.env.PORT || '3001', 10);
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const RPC_PATH = '/a2a';
// const AGENT_CARD_PATH = '/.well-known/agent.json'; // Handled by helper

// --- Instantiate Core Components --- //

const taskStore = new InMemoryTaskStore();
const priorAuthProcessor = new PriorAuthProcessor();

// --- Configure Server using V2 Helper --- //
const coreConfig: A2AServerConfigV2 = {
    agentCard: priorAuthAgentCardPartial, // OK: Partial Agent Card
    taskStore: taskStore,
    taskProcessors: [priorAuthProcessor], // OK: V2 Processor
    port: PORT,
    baseUrl: BASE_URL, // Optional: Helper defaults to localhost:PORT
    rpcPath: RPC_PATH, // Optional: Helper defaults to /a2a
    // agentCardPath: AGENT_CARD_PATH, // Optional: Helper defaults
    // getAuthContext: myAuthFunction, // Optional: Add if auth is needed
    // configureApp: (app, core, completeAgentCard) => { // Optional: Add custom routes/middleware
    //    app.get('/custom-route', (req, res) => res.send('Hello!'));
    // },
};

// Start the server using the helper
startA2AExpressServerV2(coreConfig);

// The helper function now handles server creation, logging, and graceful shutdown.
// The manual Express setup, handler creation, routing, and server start logic
// are no longer needed here. 

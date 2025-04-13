import express from 'express';
import {
    A2AServerCore,
    InMemoryTaskStore,
    createA2AExpressHandlers,
    type AgentCard // Import full AgentCard type
} from '@a2a/bun-express'; // Use library import

import { jokeAgentCard } from './agentCard';
import { JokeProcessor } from './JokeProcessor';

const PORT = process.env.PORT || 3001;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`; // Base URL for the server

// 1. Create Task Store instance
const taskStore = new InMemoryTaskStore();

// 2. Create Task Processor instance(s)
const jokeProcessor = new JokeProcessor();

// --- Construct the complete Agent Card ---
// Combine the agent-specific definition with server-level configuration
const completeAgentCard: AgentCard = {
  // Start with agent-specific properties (ensure required fields like name, version are present)
  name: jokeAgentCard.name ?? 'Unnamed Agent', // Provide defaults if partial card might miss them
  version: jokeAgentCard.version ?? '0.0.0',
  description: jokeAgentCard.description ?? 'No description provided.',
  provider: jokeAgentCard.provider,
  defaultInputModes: jokeAgentCard.defaultInputModes ?? ['text/plain'],
  defaultOutputModes: jokeAgentCard.defaultOutputModes ?? ['text/plain'],
  skills: jokeAgentCard.skills ?? [],
  // Add server-specific properties
  url: `${BASE_URL}/a2a`, // A2A endpoint URL
  authentication: { schemes: [] }, // Define server auth (none for this sample)
  capabilities: { // Define server capabilities
    streaming: true, // This server supports SSE
    pushNotifications: false, // This server setup doesn't support push (can be configured)
    stateTransitionHistory: false // Depends on TaskStore, InMemory doesn't store history
  },
  // documentationUrl: jokeAgentCard.documentationUrl // Include if defined in partial
};
// ---

// 3. Configure the A2A Server Core with the complete card
const a2aCore = new A2AServerCore({
    agentCard: completeAgentCard, // Use the merged card
    taskStore: taskStore,
    taskProcessors: [jokeProcessor],
    // No auth context needed for this sample
    // getAuthContext: (req) => { /* ... */ }
});

// 4. Create Express handlers using the library helper
const { agentCardHandler, a2aRpcHandler } = createA2AExpressHandlers(a2aCore);

// 5. Set up Express app
const app = express();

// Middleware for JSON body parsing
app.use(express.json());

// Route for Agent Card
app.get('/.well-known/agent.json', agentCardHandler);

// Route for A2A JSON-RPC endpoint
app.post('/a2a', a2aRpcHandler);

// Basic root endpoint
app.get('/', (req, res) => {
    res.send(`Joke Agent running! Visit /.well-known/agent.json for capabilities. POST to /a2a for A2A communication.`);
});

// Start the server using Express's standard listen method
// Bun's Node.js compatibility layer will handle this
app.listen(PORT, () => {
    console.log(`${completeAgentCard.name} server running on port ${PORT}`); // Use complete card name
    console.log(`Agent Card: ${BASE_URL}/.well-known/agent.json`);
    console.log(`A2A Endpoint: ${completeAgentCard.url}`);
    // Add specific endpoint logs if needed (like the internal callback for PA agent)
    if (completeAgentCard.skills.some(s => s.id === 'prior-auth-medication')) {
        console.log(`Internal Callback Endpoint (POST): ${BASE_URL}/internal-callback/:taskId`);
    }
});

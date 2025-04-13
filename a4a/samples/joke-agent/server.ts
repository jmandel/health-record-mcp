import express from 'express';
import {
    A2AServerCore,
    InMemoryTaskStore,
    createA2AExpressHandlers
} from '@a2a/bun-express'; // Use library import

import { jokeAgentCard } from './agentCard';
import { JokeProcessor } from './JokeProcessor';

const PORT = process.env.PORT || 3001;

// 1. Create Task Store instance
const taskStore = new InMemoryTaskStore();

// 2. Create Task Processor instance(s)
const jokeProcessor = new JokeProcessor();

// 3. Configure the A2A Server Core
const a2aCore = new A2AServerCore({
    agentCard: jokeAgentCard,
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
    console.log(`${jokeAgentCard.name} server running on port ${PORT}`); // Use agentCard name
    console.log(`Agent Card: http://localhost:${PORT}/.well-known/agent.json`);
    console.log(`A2A Endpoint: http://localhost:${PORT}/a2a`);
    // Add specific endpoint logs if needed (like the internal callback for PA agent)
    if (jokeAgentCard.skills.some(s => s.id === 'prior-auth-medication')) {
        console.log(`Internal Callback Endpoint (POST): http://localhost:${PORT}/internal-callback/:taskId`);
    }
});

console.log(`Joke Agent server running on port ${PORT}`);

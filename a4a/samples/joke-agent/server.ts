import {
    InMemoryTaskStore,
    startA2AExpressServer // Import the new helper
} from '@a2a/bun-express'; // Use library import

import { jokeAgentCard } from './agentCard'; // Keep agent-specific card definition
import { JokeProcessor } from './JokeProcessor'; // Keep agent processor

// 1. Create Task Store instance (could also be configured/passed in)
const taskStore = new InMemoryTaskStore();

// 2. Create Task Processor instance(s)
const jokeProcessor = new JokeProcessor();

// 3. Start the server using the reusable helper function
startA2AExpressServer({
    agentDefinition: jokeAgentCard, // Pass the partial agent card
    taskStore: taskStore,
    taskProcessors: [jokeProcessor],
    // Optional: Specify port, baseUrl, capabilities, auth, configureApp etc.
    // port: 3005, 
    // configureApp: (app, core, card) => { 
    //    // Add joke-agent specific routes here if needed 
    //    console.log(`Custom configuration applied for ${card.name}`);
    // }
});

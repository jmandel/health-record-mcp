import {
    InMemoryTaskStore,
    startA2AExpressServer // Import the new helper
} from '@a2a/bun-express'; // Use library import

import { jokeAgentCard } from './agentCard'; // Keep agent-specific card definition
// Remove the old processor import
// import { JokeProcessor } from './JokeProcessor';
// Import the new processors
import { TopicJokeProcessor } from './TopicJokeProcessor';
import { RandomJokeProcessor } from './RandomJokeProcessor';

// 1. Create Task Store instance (could also be configured/passed in)
const taskStore = new InMemoryTaskStore();

// 2. Create Task Processor instance(s)
// const jokeProcessor = new JokeProcessor(); // Remove old instance
const randomJokeProcessor = new RandomJokeProcessor();
const topicJokeProcessor = new TopicJokeProcessor();

// 3. Start the server using the reusable helper function
startA2AExpressServer({
    agentDefinition: jokeAgentCard, // Pass the partial agent card
    taskStore: taskStore,
    // Add both processors. Order matters: check Random first, then Topic (default).
    taskProcessors: [randomJokeProcessor, topicJokeProcessor],
    // Optional: Specify port, baseUrl, capabilities, auth, configureApp etc.
    // port: 3005,
    // configureApp: (app, core, card) => {
    //    // Add joke-agent specific routes here if needed
    //    console.log(`Custom configuration applied for ${card.name}`);
    // }
});

import {
    InMemoryTaskStore,
    // Import the V2 server setup function
    startA2AExpressServerV2 
} from '@a2a/bun-express'; 

import { jokeAgentCard } from './agentCard'; // Import V2 agent card
// Import the V2 processors
import { TopicJokeProcessorV2 } from './TopicJokeProcessorV2';
import { RandomJokeProcessorV2 } from './RandomJokeProcessorV2';

// 1. Create Task Store instance
const taskStore = new InMemoryTaskStore();

// 2. Create V2 Task Processor instances
const randomJokeProcessorV2 = new RandomJokeProcessorV2();
const topicJokeProcessorV2 = new TopicJokeProcessorV2();

// 3. Start the server using the V2 helper function
startA2AExpressServerV2({ // Call the V2 setup function
    agentDefinition: jokeAgentCard, // Pass the V2 partial agent card
    taskStore: taskStore,
    // Pass the V2 processors
    taskProcessors: [randomJokeProcessorV2, topicJokeProcessorV2],
    // Optional: Specify port, baseUrl, etc.
    port: 3006, // Use a different port if running V1 and V2 simultaneously
    // configureApp: (app, core, card) => { 
    //    // Add joke-agent V2 specific routes here if needed
    //    console.log(`Custom configuration applied for ${card.name}`);
    // }
}); 
import {
    InMemoryTaskStore,
    A2AServerConfigV2,
    startA2AExpressServerV2
} from '@jmandel/a2a-bun-express-server';

import { jokeAgentCard } from './agentCard'; // Partial Agent Card
import { TopicJokeProcessorV2 } from './TopicJokeProcessorV2';
import { RandomJokeProcessorV2 } from './RandomJokeProcessorV2';

// --- Configuration -------------------------------------------------------- //
const PORT = parseInt(process.env.PORT || '3006', 10);
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const RPC_PATH = '/a2a'; // default path (can change if desired)

// --- Core Components ------------------------------------------------------ //
const taskStore = new InMemoryTaskStore();

const randomJokeProcessor = new RandomJokeProcessorV2();
const topicJokeProcessor = new TopicJokeProcessorV2();

// --- Server Configuration ------------------------------------------------- //
const coreConfig: A2AServerConfigV2 = {
    agentCard: jokeAgentCard,
    taskStore,
    taskProcessors: [randomJokeProcessor, topicJokeProcessor],
    port: PORT,
    baseUrl: BASE_URL,
    rpcPath: RPC_PATH,
    // configureApp: (app, core, completeCard) => {
    //     // Custom routes or middleware here.
    // }
};

// --- Start Server --------------------------------------------------------- //
startA2AExpressServerV2(coreConfig); 

import type { AgentCard } from '@jmandel/a2a-bun-express-server';

// Define the agent card
// Note: The server setup function will merge this with server-specific capabilities/URLs.
export const jokeAgentCard: Partial<AgentCard> = {
    name: "Joke Agent V2",
    version: "0.1.0", // Use a different version or name to distinguish from V1
    description: "Tells jokes about a specific topic (using V2 Processors).",
    provider: {
        organization: "Example Inc.",
        url: "https://example.com"
    },
    // Specify desired capabilities. Server config might override or add more.
    capabilities: {
        streaming: true, // Indicate support for SSE
        pushNotifications: false, // Example capability
        stateTransitionHistory: true // Example capability (if store supports it)
    },
    authentication: {
        schemes: [] // No authentication required for this example
    },
    defaultInputModes: ["text/plain"],
    defaultOutputModes: ["text/plain", "application/json"], // Indicate JSON is possible via data parts
    skills: [
        {
            id: "jokeAboutTopic",
            name: "Joke About Topic",
            description: "Tells a joke about a specific topic provided by the user.",
            inputModes: ["text/plain"],
            outputModes: ["text/plain"]
        },
        {
             id: "randomJoke",
             name: "Random Joke",
             description: "Tells a random joke.",
             inputModes: ["text/plain"],
             outputModes: ["text/plain"]
        }
    ],
    documentationUrl: "https://example.com/docs/joke-agent"
}; 
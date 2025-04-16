import type { AgentCard } from '../../src'; // Adjusted path

export const priorAuthAgentCardPartial: Partial<AgentCard> = {
    name: "Prior Authorization Agent V2",
    version: "1.0.0",
    description: "Handles prior authorization requests based on configured policies.",
    provider: {
        organization: "Example Health Inc.",
        url: "https://example.com/health"
    },
    // Default input is data, default output is also data (the decision)
    defaultInputModes: ["application/json"], 
    defaultOutputModes: ["application/json"],
    skills: [
        {
            id: 'priorAuthRequest', 
            name: 'Submit Prior Authorization Request',
            description: 'Manages a prior authorization conversation, typically involving text-based exchange to gather necessary information. Can optionally accept FHIR data in DataParts, but can reach a final decision based solely on the text conversation.',
            tags: ['prior-auth', 'policy', 'clinical'],
            inputModes: ["application/json"], // Expects a DataPart
            outputModes: ["application/json"] // Returns a DataPart with decision
        }
    ],
    documentationUrl: "https://example.com/docs/prior-auth-agent",
    // Capabilities will be filled in by the server setup
    capabilities: {
        streaming: false, // This agent doesn't stream by default
        pushNotifications: false,
        stateTransitionHistory: true // Assuming store supports it
    },
    // No specific authentication defined here, can be added by server setup
    authentication: { schemes: [] }
}; 
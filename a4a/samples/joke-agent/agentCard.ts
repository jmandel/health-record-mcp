import type { AgentCard } from '@a2a/bun-express';

export const jokeAgentCard: AgentCard = {
  name: 'Joke Agent',
  description: 'Tells jokes on demand using the A2A protocol.',
  url: 'http://localhost:3001/a2a', // Adjust port if needed
  version: '1.0.0',
  provider: {
      organization: "A2A Samples Inc.",
      url: "http://example.com"
  },
  authentication: { schemes: [] }, // No auth for this simple sample
  defaultInputModes: ['text/plain'],
  defaultOutputModes: ['text/plain'],
  capabilities: {
    streaming: true,
    pushNotifications: true,
    stateTransitionHistory: false // InMemoryStore doesn't store status history explicitly
  },
  skills: [{
    id: 'tell-joke',
    name: 'Tell Joke',
    description: 'Responds with a simple text-based joke.',
    tags: ['humor', 'jokes', 'entertainment'],
    examples: ['tell me a joke', 'make me laugh', 'joke please'],
    inputModes: ['text/plain'],
    outputModes: ['text/plain']
  }],
};

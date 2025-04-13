import type { AgentCard } from '@a2a/bun-express';

export const jokeAgentCard: Partial<AgentCard> = {
  name: 'Joke Agent',
  description: 'Tells jokes on demand using the A2A protocol.',
  version: '1.0.0',
  provider: {
      organization: "A2A Samples Inc.",
      url: "http://example.com"
  },
  defaultInputModes: ['text/plain'],
  defaultOutputModes: ['text/plain'],
  skills: [{
    id: 'tell-joke',
    name: 'Tell Joke',
    description: 'Responds with a simple text-based joke.',
    tags: ['humor', 'jokes', 'entertainment'],
    examples: ['tell me a joke', 'make me laugh', 'joke please'],
    inputModes: ['text/plain'],
    outputModes: ['text/plain']
  },
  {
    id: 'jokeAboutTopic',
    name: 'Tell Joke About Topic',
    description: 'Tells a joke about a specific topic provided by the user.',
    tags: ['jokes', 'humor', 'topic'],
    examples: ['tell me a joke about computers', 'make a joke about cats'],
    inputModes: ['text/plain'],
    outputModes: ['text/plain']
  }],
};

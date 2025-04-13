import type { AgentCard } from '@a2a/bun-express';

export const priorAuthAgentCard: AgentCard = {
  name: 'Prior Authorization Agent (Sample)',
  description: 'Handles medication prior authorization requests via A2A.',
  url: 'http://localhost:3002/a2a', // Adjust port if needed
  version: '0.2.0',
   provider: {
      organization: "Payer Sample Systems",
      url: "http://example-payer.com"
  },
  authentication: { schemes: ["Bearer"] }, // Requires Bearer token (mocked in sample)
  defaultInputModes: ['application/json', 'text/plain'],
  defaultOutputModes: ['application/json', 'text/plain', 'application/pdf'],
  capabilities: {
    streaming: false, // TODO
    pushNotifications: true, // Store supports it, Core needs implementation
    stateTransitionHistory: false
  },
  skills: [{
    id: 'prior-auth-medication',
    name: 'Medication Prior Authorization',
    description: 'Submit and manage PA requests for medications.',
    tags: ['prior-authorization', 'pa', 'medication', 'clinical', 'payer'],
    examples: ['Request PA for Patient X, Med Y', 'Submit LMN for PA Task 123'],
    inputModes: ['application/json', 'text/plain', 'application/pdf'], // Accepts structured data, text, and potentially PDFs via URI/bytes
    outputModes: ['application/json', 'text/plain', 'application/pdf'] // Can return structured status, text messages, and determination PDFs
  }],
};

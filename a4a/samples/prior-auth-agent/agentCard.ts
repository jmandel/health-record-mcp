import type { AgentCard } from '@a2a/bun-express';

// Define only the agent-specific parts. Server config will be layered on.
export const priorAuthAgentCard: Partial<AgentCard> = {
  name: 'Prior Authorization Agent (Sample)',
  description: 'Handles simulated medication prior authorization requests.',
  version: '0.1.0',
  provider: {
      organization: "A2A Samples Inc.",
      url: "http://example.com"
  },
  defaultInputModes: ['application/json', 'text/plain'], // Example: accepts structured data and text
  defaultOutputModes: ['application/json', 'text/plain'],
  skills: [{
    id: 'prior-auth-medication',
    name: 'Request Medication Prior Authorization',
    description: 'Submit clinical information and necessary documents to request prior authorization for a medication.',
    tags: ['prior-authorization', 'medication', 'healthcare', 'payer'],
    examples: [
        'Request PA for Ozempic, patient has T2DM, A1C > 7. See attached chart notes.',
        'Prior auth needed for medication X, see attached LMN.'
    ],
    // Expecting structured data (e.g., FHIR Task?) and potentially text/files
    inputModes: ['application/json', 'text/plain', 'application/pdf'], 
    // Outputting structured status and potentially PDF determination
    outputModes: ['application/json', 'text/plain', 'application/pdf']
  }],
};

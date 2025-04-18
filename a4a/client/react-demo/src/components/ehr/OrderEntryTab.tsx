import { DataPart, Message, Task, TextPart } from '@a2a/client/src/types';
import { FunctionCallingConfigMode, FunctionDeclaration, GoogleGenAI, Type } from '@google/genai';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useEhrContext } from '../../context/EhrContext';
import { useTaskLiaison } from '../../hooks/useTaskLiaison';

interface OrderEntryTabProps {
    serviceRequest: any; // Replace 'any' with ServiceRequest FHIR type
    // Add callbacks for updating/saving the order if needed (e.g., updateEhrData)
}

// Add OrderFormData interface definition
interface OrderFormData {
    medication: string;
    dose: string;
    frequency: string;
    instructions: string;
    startDate: string;
}

// Restore DRAFT_STORAGE_KEY as it's still used for draft logic
const DRAFT_STORAGE_KEY = 'botoxOrderDraft';

// Define the new types near the top of the file
export type RequirementStatus = 'met' | 'missing' | 'pending_user' | 'error' | 'unknown'; // Added 'unknown' for initial state

export interface EvidenceItem {
  fhirSource: string; // e.g., "Condition/123" referencing the FHIR resource anchor
  text: string; // 1–3 sentence excerpt or attachment plain‑text
  score: number; // rough relevance score (0–1)
}

export interface Requirement {
  id: string; // stable slug e.g. "chronic-migraine-15-days"
  label?: string; // Added: Brief summary label for display
  description: string; // human wording from payer policy
  evidence: EvidenceItem[]; // filled by LLM or search tooling
  status: RequirementStatus;
  keywords?: string[]; // Added: Suggested keywords for EHR search from extraction step
  userPrompt?: string; // if status == 'pending_user'
  // subRequirements?: Requirement[]; // Not implementing sub-requirements initially for simplicity
}

export interface RequirementOption {
  id: string;
  label: string;
  description: string;
  keywords?: string[];
  evidence: EvidenceItem[];
  status: RequirementStatus;
  userPrompt?: string;
}

export interface RequirementClause {
  id: string;
  label: string;
  options: RequirementOption[];
  evidence: EvidenceItem[];
  status: RequirementStatus;
  userPrompt?: string;
}

export type RequirementsCNF = RequirementClause[];

// Function declarations for LLM tool calls
// Renamed from extractRequirementsFn
const reportExtractedRequirementsFn: FunctionDeclaration = {
    name: 'reportExtractedRequirements', // New name
    parameters: {
        type: Type.OBJECT,
        description: 'Reports a list of structured requirements (including id, a brief label, full description, and keywords) that the LLM has already extracted from the payer policy found in the conversation history.',
        properties: {
            // Parameter contains the already-extracted data
            requirementsToReport: { // Renamed parameter
                type: Type.ARRAY,
                description: 'The array of requirement objects ({id, label, description, keywords}) extracted by the LLM.',
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING, description: 'Stable requirement ID slug.' },
                        label: { type: Type.STRING, description: 'A brief summary label (5-10 words) for the requirement.' },
                        description: { type: Type.STRING, description: 'Full requirement description text.' },
                        keywords: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Relevant single-word keywords for EHR search.' }
                    },
                    required: ['id', 'label', 'description'] // Label is now required
                }
            }
        },
        required: ['requirementsToReport'], // The LLM must provide this list
    },
    // This function call primarily serves to deliver data
};

// Renamed from assessRequirementFn
const reportRequirementAssessmentFn: FunctionDeclaration = {
    name: 'reportRequirementAssessment', // New name
    parameters: {
        type: Type.OBJECT,
        description: 'Reports the assessment status (met, missing, pending_user) and supporting evidence for a single requirement, based on provided EHR context snippets.',
        properties: {
            requirementId: { type: Type.STRING, description: 'The ID of the requirement being assessed.' }, // Renamed parameter
            status: { type: Type.STRING, description: 'Assessment status: met, missing, or pending_user.'}, // Moved status/evidence to args
            evidence: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        fhirSource: { type: Type.STRING, description: 'FHIR resource type/id, e.g., "Condition/123"' },
                        text: { type: Type.STRING },
                        score: { type: Type.NUMBER }
                    },
                    required: ['fhirSource', 'text', 'score']
                },
                description: 'List of evidence items supporting the status.'
            },
            userPrompt: { type: Type.STRING, description: 'Optional prompt for the user if status is pending_user.' } // Added userPrompt
        },
        required: ['requirementId', 'status'], // Evidence and userPrompt might be optional depending on status
    },
};

// Update searchEhr function declaration
const searchEhrFn: FunctionDeclaration = {
    name: 'searchEhr',
    parameters: {
        type: Type.OBJECT,
        description: 'Search the EHR for matching text snippets. Returns at most 5 snippets.',
        properties: {
            query: { type: Type.STRING, description: 'Search query string - MUST be only one word (no spaces or punctuation).' }
        },
        required: ['query'],
    },
    // Specify return type schema if possible/needed
     // responseSchema: { type: Type.OBJECT, properties: { snippets: { type: Type.ARRAY, items: {type: Type.STRING}}} }
};

// Rename synthesizeNarrativeFn to reportFinalNarrativeFn
const reportFinalNarrativeFn: FunctionDeclaration = {
    name: 'reportFinalNarrative', // New name
    parameters: {
        type: Type.OBJECT,
        description: 'Reports the final payer-ready narrative and any referenced resource IDs, generated based on all met requirements.',
        properties: {
            // Renamed parameter
            finalNarrative: { type: Type.STRING, description: 'The generated payer-ready narrative text.' },
            resourceIds: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'List of FHIR resource IDs referenced in the narrative.' }
        },
        required: ['finalNarrative'], // resourceIds is optional
    },
};

// Rename askUserFn to reportUserInteractionNeededFn
const reportUserInteractionNeededFn: FunctionDeclaration = {
    name: 'reportUserInteractionNeeded', // New name
    parameters: {
        type: Type.OBJECT,
        description: 'Reports that user input is needed for specific requirements and provides prompts for the user.',
        properties: {
            batchPrompt: { type: Type.STRING, description: 'A single summary prompt explaining what information is needed overall.' },
            requirementsWithPrompts: { // Renamed parameter
                type: Type.ARRAY,
                description: 'The list of requirements needing user input, each including its id and a specific userPrompt.',
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        userPrompt: { type: Type.STRING }
                    },
                    required: ['id', 'userPrompt']
                 }
            }
        },
        required: ['batchPrompt', 'requirementsWithPrompts'],
    },
};

// New extraction fn
const reportExtractedClausesFn: FunctionDeclaration = {
  name: 'reportExtractedClauses',
  parameters: {
    type: Type.OBJECT,
    description: 'Extracts an AND‑of‑ORs structure: array of clauses, each with options (id, label, description, keywords).',
    properties: {
      clausesToReport: {
        type: Type.ARRAY,
        description: 'Array of clauses with their options.',
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            label: { type: Type.STRING },
            options: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  label: { type: Type.STRING },
                  description: { type: Type.STRING },
                  keywords: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ['id','label','description']
              }
            }
          },
          required: ['id','label','options']
        }
      }
    },
    required: ['clausesToReport']
  }
};

// New clause‐level assess fn
const reportClauseAssessmentFn: FunctionDeclaration = {
  name: 'reportClauseAssessment',
  parameters: {
    type: Type.OBJECT,
    description: 'For a single clause, reports which option satisfied it (or missing/pending_user), plus evidence or prompt.',
    properties: {
      clauseId: { type: Type.STRING },
      chosenOptionId: { type: Type.STRING, description: 'ID of the met option; omitted if none met.' },
      status: { type: Type.STRING },             // met / missing / pending_user
      evidence: {                                 // only if status==='met'
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            fhirSource: { type: Type.STRING, description: 'FHIR resource type/id, e.g., "Condition/123"' },
            text: { type: Type.STRING },
            score: { type: Type.NUMBER }
          },
          required:['fhirSource','text','score']
        }
      },
      userPrompt: { type: Type.STRING }           // only if pending_user
    },
    required: ['clauseId','status']
  }
};

// Define constants for configuration
// const GEMINI_MODEL_NAME = 'gemini-2.5-flash-preview-04-17';
const GEMINI_MODEL_NAME = 'gemini-2.5-pro-preview-03-25';

const OrderEntryTab: React.FC<OrderEntryTabProps> = ({ serviceRequest }) => {
    // Replace old state with new state based on blueprint
    const [policyText, setPolicyText] = useState<string>(''); // Need a way to input this, maybe a textarea
    const [clauses, setClauses] = useState<RequirementsCNF>([]);
    const [paStatus, setPaStatus] = useState<'idle' | 'initiating' | 'extracting' | 'assessing' | 'awaiting_user' | 'synthesizing' | 'completed' | 'error'>('idle');
    const [lastError, setLastError] = useState<string | null>(null);
    const [finalNarrative, setFinalNarrative] = useState<string | null>(null);
    const [finalResourceIds, setFinalResourceIds] = useState<string[]>([]);
    const [userResponses, setUserResponses] = useState<Record<string, string>>({}); // For pending_user inputs { reqId: response }
    const [formData, setFormData] = useState<OrderFormData>({
        medication: 'Botulinum Toxin A (Botox)', // Example default
        dose: '',
        frequency: 'Every 3 months',
        instructions: '',
        startDate: new Date().toISOString().split('T')[0], // Default to today
    });
    const [draftLoaded, setDraftLoaded] = useState(false); // Track if draft was loaded
    const [chatInput, setChatInput] = useState<string>('');
    // Sidebar state
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'summary' | 'chat'>('summary');

    // Keyboard shortcut to toggle sidebar (Ctrl+P)
    useEffect(() => {
      const handler = (e: KeyboardEvent) => {
        if (e.ctrlKey && e.key.toLowerCase() === 'p') {
          e.preventDefault();
          setSidebarOpen(open => !open);
          setActiveTab('summary');
        }
      };
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
    }, []);

    const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
    const ai = useMemo(() => new GoogleGenAI({ apiKey: GEMINI_API_KEY }), [GEMINI_API_KEY]);
    // Update the tools array with new function names
    const tools = useMemo(
        () => [{ functionDeclarations: [
            reportExtractedRequirementsFn, // New name
            reportRequirementAssessmentFn, // New name
            searchEhrFn, // Keep as is
            reportFinalNarrativeFn, // New name
            reportUserInteractionNeededFn, // New name
            reportExtractedClausesFn,
            reportClauseAssessmentFn
        ] }],
        []
    );

    // EHR context for search tool
    const ehrData = useEhrContext();
    // Update the searchEhr IMPLEMENTATION to match blueprint constraints
    const searchEhr = useCallback(async (query: string): Promise<{ snippets: string[] }> => {
        const snippets: string[] = [];
        const lower = query.toLowerCase(); // Assuming single word query based on new function declaration

        // Helper to add snippet (limit removed)
        const addSnippet = (text: string) => {
            // No limit check here anymore
            snippets.push(text);
        };

        // Search FHIR resources
        for (const [type, resources] of Object.entries(ehrData.fhir)) {
            // Removed limit check: if (snippets.length >= 5) break;
            for (const r of resources) {
                 // Removed limit check: if (snippets.length >= 5) break;
                const resourceText = JSON.stringify(r); // Keep full JSON string
                if (resourceText.toLowerCase().includes(lower)) {
                    // Return full resource JSON in the snippet
                    addSnippet(`Matched FHIR Resource ${type}/${r.id}:\n${resourceText}`);
                }
            }
        }
        // Search attachments plaintext
        // Removed limit check: if (snippets.length < 5)
        for (const att of ehrData.attachments) {
            // Removed limit check: if (snippets.length >= 5) break;
            // Use full plaintext if available
            if (att.contentPlaintext && att.contentPlaintext.toLowerCase().includes(lower)) {
                // Return full attachment plaintext in the snippet
                addSnippet(`Matched Attachment ${att.resourceType}/${att.resourceId} (${att.path}):\n${att.contentPlaintext}`);
            }
        }
        
        console.log(`searchEhr('${query}') found ${snippets.length} snippets (returning ALL matches).`);
        return { snippets };
    }, [ehrData]);

    // Restore Helper to format task history as markdown
    const formatHistoryMarkdown = (history: Message[] = []): string => {
        // Simple markdown formatting
        return history.map(msg => {
            const role = msg.role === 'user' ? 'User' : 'Agent';
            const partsText = msg.parts.map(p => {
                if (p.type === 'text') return p.text;
                if (p.type === 'data') return `[Data: ${JSON.stringify(p.data, null, 2)}]`;
                // Add other part types if necessary
                return '[Unsupported Part]';
            }).join('\n\n');
            return `**${role}**:\n${partsText}`;
        }).join('\n\n---\n'); // Separator between messages
    };

    // Placeholder for the new orchestrator logic within autoInputHandler
    const runPriorAuthOrchestrator = useCallback(async (task: Task | null): Promise<Message | null> => {
        // This function will implement the pseudo-code from the blueprint.
        // It will manage the state (requirements, paStatus) and make LLM calls.
        // It needs access to the current state (requirements, paStatus).
        // Since it's called by useTaskLiaison, it might need to be adapted slightly.

        console.log("runPriorAuthOrchestrator called. Current status:", paStatus, "Task:", task);

        // ** START: Blueprint Orchestration Logic **

        // Handle Initiating state: Wait for history to populate
        if (paStatus === 'initiating') {
            // Basic check: Does history exist and have more than the initial user message?
            if (task?.history && task.history.length > 1) {
                console.log("Orchestrator: Task history seems ready. Transitioning to extracting state.");
                setPaStatus('extracting');
            } else {
                console.log("Orchestrator: In initiating state, waiting for task history update (e.g., policy text)...");
            }
            return null; // Wait for next trigger
        }
        // Handle Extracting state
        else if (paStatus === 'extracting') {
            try {
                console.log("Orchestrator: Attempting to extract requirements from history...");

                // --- Format History for LLM --- 
                if (!task || !task.history || task.history.length === 0) {
                    // This check might be redundant now due to the initiating state handling, but keep as safeguard
                    console.warn("Orchestrator: Attempting extraction but task history is missing or empty.");
                    return null; // Wait
                    // throw new Error("Task history is missing or empty, cannot extract policy.");
                }
                const formattedHistory = formatHistoryMarkdown(task.history);
                // --- End Format History --- 

                // --- Check if Policy Text is likely present (Refined Check) ---
                // Instead of throwing error immediately, check and wait if not found yet.
                let policyLikelyPresent = false;
                for (let i = task.history.length - 1; i >= 0; i--) {
                     const msg = task.history[i];
                     if (msg.role === 'agent') { // Assuming agent adds the policy
                          const textPart = msg.parts.find(p => p.type === 'text') as TextPart | undefined;
                          // Look for a reasonably long text part from the agent
                          if (textPart?.text && textPart.text.length > 100) { // Arbitrary length check
                               policyLikelyPresent = true;
                               break;
                          }
                     }
                }
                if (!policyLikelyPresent) {
                    console.log("Orchestrator: Policy text not yet found in history (agent message with sufficient length). Waiting...");
                    return null; // Wait for history to be updated
                }
                // --- End Policy Presence Check ---

                // Prepare content for LLM: extract clauses (AND-of-ORs) structure
                const systemInstruction = `// TypeScript interfaces for extraction:
interface Clause {
  id: string;        // clause slug
  label: string;     // summary
  options: Option[]; // array of options
}
interface Option {
  id: string;
  label: string;
  description: string;
  keywords: string[];
}
interface ReportExtractedClausesArgs {
  clausesToReport: Clause[];
}

You are a prior-authorization expert.
Review the conversation history and locate the payer policy text.
Extract the policy requirements as an AND‑of‑ORs structure.
Prepare a JSON array named 'clausesToReport' where each clause object has:
  - id: string slug for the clause
  - label: concise summary (5–10 words)
  - options: array of option objects, each with:
      • id: string slug for the option
      • label: concise summary of the option
      • description: full policy text for that option
      • keywords: array of single words for EHR searching

Then call the 'reportExtractedClauses' function with argument 'clausesToReport' set to that array.
Respond ONLY with the function call JSON; do NOT include any other text or commentary.`;
                const userHistory = `Conversation History:\n\n${formattedHistory}`;

                const contents = [{ role: "user", parts: [{ text: `${systemInstruction}\n\n${userHistory}` }] }];

            const response = await ai.models.generateContent({
                    model: GEMINI_MODEL_NAME,
                    contents,
                config: {
                        tools,
                        toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.ANY, allowedFunctionNames: ['reportExtractedClauses'] } }
                    }
                });

                console.log("Orchestrator: reportExtractedClauses LLM response (expecting function call):", JSON.stringify(response, null, 2));

                // Parse the LLM function call
                const functionCallPart = response.candidates?.[0]?.content?.parts?.find(p => p.functionCall);

                if (!functionCallPart || functionCallPart.functionCall?.name !== 'reportExtractedClauses') {
                    throw new Error('LLM did not call reportExtractedClauses.');
                }

                // Build RequirementsCNF from args.clausesToReport
                const args = functionCallPart.functionCall.args as { clausesToReport: any[] };
                if (!Array.isArray(args.clausesToReport)) {
                    throw new Error('Missing clausesToReport in reportExtractedClauses args');
                }
                const validatedClauses: RequirementsCNF = args.clausesToReport.map((c, i) => {
                    const clauseId = typeof c.id === 'string' ? c.id : `clause-${i}`;
                    const clauseLabel = typeof c.label === 'string' ? c.label : `Clause ${i+1}`;
                    const options = Array.isArray(c.options) ? c.options.map((opt: any, j: number) => ({
                        id: typeof opt.id === 'string' ? opt.id : `${clauseId}-opt-${j}`,
                        label: typeof opt.label === 'string' ? opt.label : `Option ${j+1}`,
                        description: typeof opt.description === 'string' ? opt.description : '',
                        keywords: Array.isArray(opt.keywords) ? opt.keywords.filter((kw: any) => typeof kw === 'string') : [],
                        status: 'unknown' as RequirementStatus,
                        evidence: []
                    })) : [];
                    // Initialize evidence at clause level as empty until option-level evidence collapses
                    return { id: clauseId, label: clauseLabel, options, status: 'unknown' as RequirementStatus, evidence: [] };
                });

                console.log('Orchestrator: Parsed clauses:', validatedClauses);
                setClauses(validatedClauses);
                setPaStatus('assessing');
                console.log('Orchestrator: Extraction complete, moving to assessing.');

            } catch (error: any) {
                console.error("Orchestrator: Error during requirement extraction:", error);
                setLastError(`Extraction failed: ${error.message || 'Unknown error'}`);
                setPaStatus('error');
            }
        } else if (paStatus === 'assessing') {
            // --- START ASSESSING LOGIC ---
            console.log("Orchestrator: Assessing requirements...");
            // Use a mutable copy to track updates within this run
            let updatedClauses = [...clauses];
            let assessmentErrors: string[] = [];
            let needsUserInput = false;

            // Track attempts per requirement ID within this assessment cycle
            // NOTE: This simple approach resets attempts each time 'assessing' state is entered.
            // A more robust solution would store attempts alongside requirements or in component state.
            const assessmentAttempts: Record<string, number> = {};
            const MAX_ASSESSMENT_ATTEMPTS = 3;

            // Identify requirements needing assessment in this cycle
            const clausesToAssess = updatedClauses.filter(clause =>
                (clause.status === 'unknown' || clause.status === 'missing')
            );

            if (clausesToAssess.length === 0) {
                console.log("Orchestrator: No requirements need assessment in this cycle. Checking final state...");
                // If none to assess, check if we should move to synthesizing or awaiting user
                const anyMissing = updatedClauses.some(clause => clause.status === 'missing' || clause.status === 'pending_user');
                if (anyMissing) {
                     setPaStatus('awaiting_user');
                } else {
                     setPaStatus('synthesizing');
                }
                return null; // Exit orchestrator run
            }

            console.log(`Orchestrator: Found ${clausesToAssess.length} requirements to assess in this cycle.`);
            // Process assessments in parallel with a pool of 2
            const PARALLEL_LLM_CALLS_ALLOWED = 2;
            for (let i = 0; i < clausesToAssess.length; i += PARALLEL_LLM_CALLS_ALLOWED) {
                const chunk = clausesToAssess.slice(i, i + PARALLEL_LLM_CALLS_ALLOWED);
                await Promise.all(chunk.map(async clause => {
                    const clauseId = clause.id;
                    assessmentAttempts[clauseId] = (assessmentAttempts[clauseId] || 0) + 1;
                    const currentAttempt = assessmentAttempts[clauseId];
                    if (currentAttempt > MAX_ASSESSMENT_ATTEMPTS) {
                        console.warn(`Orchestrator: Max attempts (${MAX_ASSESSMENT_ATTEMPTS}) reached for requirement ${clauseId}. Marking missing.`);
                        const idx = updatedClauses.findIndex(c => c.id === clauseId);
                        if (idx !== -1 && updatedClauses[idx].status !== 'met') {
                            updatedClauses[idx] = { ...updatedClauses[idx], status: 'missing' };
                            needsUserInput = true;
                        }
                        return;
                    }
                    try {
                        // Build keyword list and search EHR
                        const allOptionKeywords = clause.options.flatMap(opt => opt.keywords || []);
                        const keyword = allOptionKeywords.length > 0 ? allOptionKeywords[0] : 'requirement';
                        console.log(`Orchestrator: Assessing clause '${clauseId}' using keyword '${keyword}'`);
                        const { snippets } = await searchEhr(keyword);
                        console.log(`Orchestrator: Found ${snippets.length} snippets for keyword '${keyword}'.`);

                        // Prepare LLM instruction and call
                        const systemInstruction_assess = `// TypeScript interfaces for assessment:
interface ClauseAssessment {
  clauseId: string;               // clause identifier
  status: 'met' | 'missing' | 'pending_user';
  evidence?: EvidenceItem[];
  userPrompt?: string;
}
interface EvidenceItem {
  fhirSource: string; // FHIR resource type/id, e.g., 'Condition/123'
  text: string;
  score: number;
}

You are an expert clinical reviewer.
Your task is to assess if a specific prior authorization clause is met based *only* on the provided EHR snippets.

Clause ID: ${clauseId}
Clause Label: ${clause.label}

EHR Snippets:
${snippets.map((s, idx) => `--- Snippet ${idx+1} ---\n${s}`).join('\n\n')}
--- End of Snippets ---

Determine the requirement status:
- 'met': the snippets definitively confirm this clause. Provide supporting evidence items (fhirSource, text, score).
- 'missing': the snippets do not confirm the clause.
- 'pending_user': information is ambiguous or insufficient—formulate a brief question for the user ('userPrompt').

Your ONLY output MUST be a call to the 'reportClauseAssessment' function with arguments:
- clauseId: the clause ID
- status: 'met' | 'missing' | 'pending_user'
- evidence: array of evidence items (fhirSource, text, score) only if status is 'met'
- userPrompt: question string only if status is 'pending_user'

Respond ONLY with the function call JSON; do NOT include any other text or commentary.`;
                        const contents_assess = [{ role: 'user', parts: [{ text: systemInstruction_assess }] }];
                        const response = await ai.models.generateContent({
                            model: GEMINI_MODEL_NAME,
                            contents: contents_assess,
                            config: { tools, toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.ANY, allowedFunctionNames: ['reportClauseAssessment'] } } }
                        });
                        console.log(`Orchestrator: reportClauseAssessment response for ${clauseId}:`, JSON.stringify(response, null, 2));
                        const functionCallPart = response.candidates?.[0]?.content?.parts?.find(p => p.functionCall);
                        if (!functionCallPart || functionCallPart.functionCall?.name !== 'reportClauseAssessment') {
                            throw new Error(`LLM did not call reportClauseAssessment for ${clauseId}.`);
                        }
                        const args = functionCallPart.functionCall.args as { clauseId: string; status: RequirementStatus; evidence?: EvidenceItem[]; userPrompt?: string };
                        const idx = updatedClauses.findIndex(c => c.id === args.clauseId);
                        if (idx !== -1) {
                            updatedClauses[idx] = { ...updatedClauses[idx], status: args.status, evidence: args.evidence || [], userPrompt: args.userPrompt };
                            if (args.status === 'missing' || args.status === 'pending_user') needsUserInput = true;
                        }
                    } catch (error: any) {
                        console.error(`Orchestrator: Error assessing clause ${clauseId}:`, error);
                        assessmentErrors.push(`Failed assessment for ${clauseId} (attempt ${currentAttempt}): ${error.message}`);
                        if (currentAttempt >= MAX_ASSESSMENT_ATTEMPTS) {
                            const idx = updatedClauses.findIndex(c => c.id === clauseId);
                            if (idx !== -1) {
                                updatedClauses[idx] = { ...updatedClauses[idx], status: 'error' };
                            }
                        }
                    }
                }));
            }
            // --- Determine Next State after assessment cycle ---
            setClauses(updatedClauses); // Commit updates from this cycle

            // Aggregate errors for display
            if (assessmentErrors.length > 0) {
                 setLastError(`Assessment cycle errors: ${assessmentErrors.join('; ')}`);
                 console.warn("Orchestrator: Errors occurred during assessment cycle.", assessmentErrors);
                 // Decide whether to halt on error or continue
            }

            // Check final status of all requirements after this cycle
            const anyStillUnknown = updatedClauses.some(clause => clause.status === 'unknown');
            const anyMissingOrPending = updatedClauses.some(clause => clause.status === 'missing' || clause.status === 'pending_user');
            const allDone = updatedClauses.every(clause => clause.status === 'met' || clause.status === 'error');

            if (allDone) {
                console.log("Orchestrator: All requirements assessed (met or error). Moving to synthesizing.");
                setPaStatus('synthesizing');
            } else if (anyMissingOrPending) {
                 console.log("Orchestrator: Some requirements are missing or need user input. Moving to awaiting_user.");
                 setPaStatus('awaiting_user');
                 // The awaiting_user state will handle the askUser LLM call if needed
            } else if (anyStillUnknown) {
                console.log("Orchestrator: Some requirements still unknown (likely due to errors or retries needed). Staying in assessing state.");
                // Remain in 'assessing' state; the orchestrator should be triggered again.
            } else {
                 // Should not happen if logic is correct
                 console.warn("Orchestrator: Unexpected state after assessment cycle. Defaulting to awaiting_user.");
                 setPaStatus('awaiting_user');
            }
            // --- END ASSESSING LOGIC ---
        } else if (paStatus === 'awaiting_user') {
            console.log("Orchestrator: State is awaiting_user.");

            // Find requirements that are pending user input or missing
            const pendingClauses = clauses.filter(clause => clause.status === 'missing' || clause.status === 'pending_user');

            if (pendingClauses.length === 0) {
                console.log("Orchestrator: In awaiting_user state, but no requirements found pending. Moving back to assessing.");
                setPaStatus('assessing'); // Re-assess in case state is inconsistent
                return null;
            }

            // Check if we have *already* generated prompts for these (to avoid redundant LLM calls)
            // If ANY pending clause is missing a userPrompt, generate prompts for ALL pending.
            const needsPromptGeneration = pendingClauses.some(clause => !clause.userPrompt);

            if (!needsPromptGeneration) {
                console.log("Orchestrator: User prompts already generated. Waiting for user interaction.");
                // UI should display prompts based on `clauses` state. Wait for `handleResumePA`.
                return null;
            }

            console.log("Orchestrator: Generating user prompts via reportUserInteractionNeeded LLM call...");
            // Prepare LLM call to generate the user prompts
            try {
                // Construct context for the LLM
                const contextForLLM = pendingClauses
                    .map(clause => `- Clause ID: ${clause.id}\n  Label: ${clause.label}\n  Current Status: ${clause.status}`)
                    .join('\n\n');

                // Prepare LLM call for askUser (reportUserInteractionNeeded) 
                const systemInstruction_ask = `// TypeScript interface for user prompt:
interface ReportUserInteractionNeededArgs {
  batchPrompt: string;
  requirementsWithPrompts: { id: string; userPrompt: string; }[];
}

You are a prior-authorization assistant.
For the following clauses that need user input:
${contextForLLM}

Generate:
  - batchPrompt: one summary instruction telling the user what information is required overall.
  - requirementsWithPrompts: an array of objects, each with:
      • id: clause ID
      • userPrompt: a concise question asking the user for the specific missing information from that clause.

Then call the 'reportUserInteractionNeeded' function with arguments:
{ batchPrompt: "<batch prompt>", requirementsWithPrompts: [ { id: "<clauseId>", userPrompt: "<question>" }, ... ] }

Respond ONLY with the function call JSON; do NOT include any other text or commentary.`;

                // Contents only contain the instruction, the LLM generates the function call
                const contents_ask = [
                    { role: "user", parts: [{ text: systemInstruction_ask }] }
                ];

                const response = await ai.models.generateContent({
                    model: GEMINI_MODEL_NAME, // Use constant
                    contents: contents_ask, 
                    config: {
                        tools: tools, // Ensure 'tools' includes reportUserInteractionNeededFn
                    toolConfig: {
                        functionCallingConfig: {
                            mode: FunctionCallingConfigMode.ANY,
                                // We expect the LLM to call this function back
                                allowedFunctionNames: ['reportUserInteractionNeeded'],
                            }
                        }
                    }
                });

                console.log(`Orchestrator: reportUserInteractionNeeded LLM response (expecting function call):`, JSON.stringify(response, null, 2));

                // --- Parse the LLM's FUNCTION CALL --- 
                const functionCallPart = response.candidates?.[0]?.content?.parts?.find(part => part.functionCall);
                if (!functionCallPart || !functionCallPart.functionCall || functionCallPart.functionCall.name !== 'reportUserInteractionNeeded') {
                     throw new Error(`LLM did not call the expected reportUserInteractionNeeded function.`);
                }

                // --- Data is now in the CALL ARGUMENTS returned by the LLM --- 
                const args = functionCallPart.functionCall.args;
                if (!args || typeof args !== 'object' || typeof args.batchPrompt !== 'string' || !Array.isArray(args.requirementsWithPrompts)) {
                    throw new Error(`Invalid or missing arguments received from reportUserInteractionNeeded function call. Expected batchPrompt and requirementsWithPrompts array. Received: ${JSON.stringify(args)}`);
                }
                
                const { batchPrompt, requirementsWithPrompts } = args as { batchPrompt: string; requirementsWithPrompts: { id: string; userPrompt: string }[] };

                // --- Update Requirements State with Prompts --- 
                console.log("Orchestrator: Received prompts from LLM. Batch prompt:", batchPrompt);
                // You might want to display the batchPrompt somewhere in the UI later
                
                // Create a map for quick lookup
                const promptsMap = new Map(requirementsWithPrompts.map(p => [p.id, p.userPrompt]));

                // Update the main requirements state with prompts
                setClauses(prevClauses => {
                    return prevClauses.map(clause => {
                        // Only update pending/missing clauses for which we received a prompt
                        const promptFromLLM = promptsMap.get(clause.id);
                        if ((clause.status === 'missing' || clause.status === 'pending_user') && promptFromLLM) {
                            return {
                                ...clause,
                                status: 'pending_user' as RequirementStatus, // Ensure status is pending_user
                                userPrompt: promptFromLLM // Use the prompt from LLM
                            };
                        } else if (clause.status === 'missing' && !promptFromLLM) {
                            // Handle case where LLM didn't provide a prompt for a missing clause (fallback)
                             return { 
                                 ...clause, 
                                 status: 'pending_user' as RequirementStatus, 
                                 userPrompt: `Please provide details for: ${clause.label || clause.id}`
                             }; 
                        }
                        return clause; // No change for other clauses
                    });
                });

                console.log("Orchestrator: Updated clauses with user prompts. Waiting for user interaction.");
                // Stay in awaiting_user state. UI will now show prompts.

            } catch (error: any) {
                console.error("Orchestrator: Error calling reportUserInteractionNeeded LLM:", error);
                setLastError(`Failed to generate user prompts: ${error.message}`);
                setPaStatus('error'); // Transition to error state
            }

        } else if (paStatus === 'synthesizing') {
            console.log("Orchestrator: Generating final report deterministically...");
            try {
                // Build bullet-list narrative from clauses
                const lines = clauses.map(clause => {
                    // choose met option label if any
                    const opt = clause.options.find(o => o.status === 'met');
                    if (opt) {
                        return `- ${clause.label}: ${opt.label}`;
                    }
                    return `- ${clause.label}: ${clause.status}`;
                });
                const narrativeText = lines.join('\n');

                // Build a FHIR Bundle from evidence resource IDs
                const bundle: any = { resourceType: 'Bundle', type: 'collection', entry: [] };
                clauses.forEach(clause => {
                    clause.evidence.forEach(ev => {
                        // Parse FHIR source in format "ResourceType/ID"
                        const parts = ev.fhirSource.split('/');
                        if (parts.length === 2) {
                            const [resourceType, resourceId] = parts;
                            const resource = ehrData.fhir[resourceType]?.find((r: any) => r.id === resourceId);
                            if (resource) {
                                bundle.entry.push({ resource });
                            }
                        }
                    });
                });

                // Send back as Message: text part + data part
                setPaStatus('completed');
                return {
                    role: 'agent',
                    parts: [
                        { type: 'text', text: narrativeText },
                        { type: 'data', data: bundle }
                    ]
                };
            } catch (error: any) {
                console.error('Orchestrator: Error generating final report:', error);
                setLastError(`Final report generation failed: ${error.message}`);
                setPaStatus('error');
                return null;
            }
        } else if (paStatus === 'completed' || paStatus === 'idle' || paStatus === 'error') {
            console.log("Orchestrator: In terminal state or idle, no action needed.");
        }
        // ** END: Blueprint Orchestration Logic **

        // Return null because the orchestrator manages state transitions internally
        // and doesn't directly produce a message for the task liaison loop in this model.
        return null;
    }, [ai, tools, paStatus, clauses, searchEhr]); // Add dependencies

    // Initialize task liaison using the new hook structure with orchestrator
    const { state, actions } = useTaskLiaison({
        agentUrl: 'http://localhost:3001/a2a', // Replace with your agent endpoint
        autoInputHandler: runPriorAuthOrchestrator, // Use the new orchestrator
    });

    // Open sidebar and switch to chat tab when agent needs manual input
    useEffect(() => {
      if (state.status === 'awaiting-input') {
        setSidebarOpen(true);
        setActiveTab('chat');
      }
    }, [state.status]);

    // Effect to trigger orchestrator when paStatus changes to an actionable state
    useEffect(() => {
        if (paStatus === 'assessing' || paStatus === 'synthesizing') {
            // Potentially trigger the orchestrator again if needed,
            // but it might already be called by the liaison hook's state changes.
            // Consider if a direct call is needed here or if the hook handles the re-triggering.
            // For now, assume the hook's autoInputHandler is sufficient.
             console.log(`useEffect[paStatus=${paStatus}]: Orchestrator should run.`);
            // runPriorAuthOrchestrator(state.task); // Maybe needed? Test carefully.
        }

        // Log status changes and errors
        console.log("PA Status changed:", paStatus);
        if (paStatus === 'error') {
            console.error("PA Error:", lastError);
            if (state.status !== 'idle' && state.status !== 'completed') {
                // actions.cancelTask(); // Consider implications
            }
        }
         // TODO: Implement persistence (localStorage/IndexedDB)
         // Example: Save state whenever it changes (debounce if needed)
         // const draftState = { policyText, clauses, paStatus, userResponses, finalNarrative, finalResourceIds, lastError };
         // localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftState));

    }, [paStatus, lastError, state.status, actions, clauses, policyText, userResponses, finalNarrative, finalResourceIds]); // Add other state vars if persisting

    // Rename and modify handleStartPA to handleSaveDraftAndStartPA
    const handleSaveDraftAndStartPA = useCallback(async () => {
        // Maybe add validation for formData here?

        // Clear previous PA state
        setPaStatus('initiating'); // Indicate task is starting
        setLastError(null);
        setClauses([]);
        setFinalNarrative(null);
        setFinalResourceIds([]);
        setUserResponses({});
        setDraftLoaded(true); // Mark as "draft saved" or in progress

        // Save current form state to local storage (simulating draft save)
        const draftState = {
            formData,
            clauses: [], // Start with empty clauses
            paStatus: 'initiating', // Persist the initial state
            userResponses: {},
            finalNarrative: null,
            finalResourceIds: [],
            lastError: null
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftState));
        console.log("Saved draft and starting PA task.", draftState);

        // Construct the initial message containing the order data
        const initialMessage: Message = {
            role: 'user',
            parts: [
                { type: 'text', text: 'Initiating Prior Authorization Request for Botox Order.' },
                { type: 'data', data: formData } // Send the form data
            ]
        };
        actions.startTask(initialMessage); // This should trigger the agent, which eventually adds policy and triggers orchestrator

    }, [formData, actions]);

    // Update handleResumePA logic for blueprint
    const handleResumePA = useCallback(() => {
        // Ensure user provided at least one response
        const filled = clauses.filter(c => c.status === 'pending_user' && userResponses[c.id]?.trim());
        if (filled.length === 0) {
            alert('Please provide input for the pending items.');
            return;
        }

        // Build markdown summary
        let summaryMd = '## Prior Authorization Summary\n\n';
        clauses.forEach(clause => {
            summaryMd += `### ${clause.label}\n`;
            const metOption = clause.options.find(opt => opt.status === 'met');
            if (metOption) {
                summaryMd += `- **Result**: ${metOption.label}\n`;
            } else if (clause.status === 'pending_user') {
                summaryMd += `- **User Input**: ${clause.userPrompt || ''}\n`;
                if (userResponses[clause.id]?.trim()) {
                    summaryMd += `  - **User Response**: ${userResponses[clause.id]}\n`;
                }
            } else {
                summaryMd += `- **Status**: ${clause.status}\n`;
            }
            if (clause.evidence.length > 0) {
                summaryMd += '- **Evidence**:\n';
                clause.evidence.forEach(ev => {
                    summaryMd += `  - (${ev.score.toFixed(2)}) ${ev.text} [${ev.fhirSource}]\n`;
                });
            }
            summaryMd += '\n';
        });

        // Build FHIR Bundle from evidence
        const bundle: any = { resourceType: 'Bundle', type: 'collection', entry: [] };
        clauses.forEach(clause => {
            clause.evidence.forEach(ev => {
                const parts = ev.fhirSource.split('/');
                if (parts.length === 2) {
                    const [resourceType, resourceId] = parts;
                    const resource = ehrData.fhir[resourceType]?.find((r: any) => r.id === resourceId);
                    if (resource) bundle.entry.push({ resource });
                }
            });
        });

        // Send markdown summary and bundle to agent
        const message: Message = {
            role: 'user',
            parts: [
                { type: 'text', text: summaryMd },
                { type: 'data', data: bundle }
            ]
        };
        actions.sendInput(message);
        // Mark PA as completed locally
        setPaStatus('completed');
    }, [clauses, ehrData, userResponses, actions]);

    // UI interaction handlers
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    }, []);

    const handleUserResponseChange = (clauseId: string, value: string) => {
        // Explicitly type prev state
        setUserResponses((prev: Record<string, string>) => ({ ...prev, [clauseId]: value }));
    };

    // Placeholder for submitting the final FORM (not PA narrative)
    const handleSubmitOrder = () => {
        // Logic to submit the actual order form data (e.g., to an EMR endpoint)
        // This is separate from the PA process handled by the orchestrator.
        console.log("Submitting Order Form Data (Simulated):", formData);
        alert("Order Submitted (Simulated) - PA status: " + paStatus);
        // Optionally clear state after submitting order?
        // handleCancelChat(false); // Reset without confirm
    };

    // Update handleCancelPA to handleCancelChat
    const handleCancelChat = (confirmFirst = true) => {
        if (!confirmFirst || confirm('Cancel the current Prior Authorization chat and clear PA state?')) {
             if (state.taskId) {
                 actions.cancelTask(); // Cancel the backend task if active
             }
             setPaStatus('idle');
             setClauses([]);
             // Keep formData, but reset PA-specific state
             setLastError(null);
             setFinalNarrative(null);
             setFinalResourceIds([]);
             setUserResponses({});
             setDraftLoaded(false); // No longer considered an active draft
             localStorage.removeItem(DRAFT_STORAGE_KEY); // Clear PA draft on cancel
             console.log("PA chat cancelled and state reset.");
        }
    };

    // Update getStatusLabel (add initiating state)
    const getStatusLabel = () => {
        switch (paStatus) {
            case 'idle': return 'Idle';
            case 'initiating': return 'Initiating PA Request...'; // Added
            case 'extracting': return 'Extracting Requirements...';
            case 'assessing': return 'Assessing Requirements...';
            case 'awaiting_user': return 'Awaiting User Input';
            case 'synthesizing': return 'Synthesizing Narrative...';
            case 'completed': return finalNarrative ? 'PA Complete - Ready to Submit Narrative' : 'PA Complete (No Narrative)';
            case 'error': return `PA Error: ${lastError || 'Unknown Error'}`;
            default: return 'Unknown';
        }
    };

    // Main view: Order form + PA status/requirements display
        return (
        <div style={{ display: 'flex', height: '100%' }}>
          {/* Main Order Entry Form */}
          <div id="order-entry" className="tab-content active" style={{ flex: 1, paddingRight: '10px' }}>
                <h2>Order Entry</h2>
              <div className="order-form-container">
                  <h3>Botox Injection</h3> {/* Could be dynamic based on formData.medication? */}
                  <p><strong>Indication:</strong> {serviceRequest?.reasonCode?.[0]?.text || 'Chronic Migraine'}</p> {/* Example */} 

                  {/* Restore Order Form */} 
                  <form id="botox-form" style={{ marginBottom: '20px' }}>
                      {/* Display Task/PA status if active */}
                      {(paStatus !== 'idle' || state.status !== 'idle') && (
                          <p style={{ fontStyle: 'italic', background: '#eee', padding: '5px' }}>
                              PA Status: {getStatusLabel()} (Task: {state.status}{state.taskId ? ` - ${state.taskId.substring(0,8)}` : ''})
                          </p>
                      )}

                    <div className="form-group">
                        <label htmlFor="medication">Medication:</label>
                          <input type="text" id="medication" value={formData.medication} onChange={handleChange} readOnly={draftLoaded || paStatus !== 'idle'} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="dose">Dose:</label>
                          <input type="text" id="dose" value={formData.dose} onChange={handleChange} placeholder="e.g., 155 units" readOnly={draftLoaded || paStatus !== 'idle'} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="frequency">Frequency:</label>
                          <select id="frequency" value={formData.frequency} onChange={handleChange} disabled={draftLoaded || paStatus !== 'idle'}>
                            <option>Every 3 months</option>
                              <option>One-time</option>
                            <option>Other...</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="instructions">Instructions:</label>
                          <textarea id="instructions" value={formData.instructions} onChange={handleChange} rows={3} placeholder="Injection sites, technique, etc." readOnly={draftLoaded || paStatus !== 'idle'}></textarea>
                    </div>
                    <div className="form-group">
                        <label htmlFor="start-date">Start Date:</label>
                          <input type="date" id="startDate" value={formData.startDate} onChange={handleChange} readOnly={draftLoaded || paStatus !== 'idle'} />
                    </div>
                    <div className="buttons">
                          {/* Submit Order - separate from PA */}
                          <button type="button" onClick={handleSubmitOrder} className="btn-primary">Submit Order</button>
                          {/* Only keep 'Draft' button */}
                          <button type="button" onClick={handleSaveDraftAndStartPA} className="btn-secondary" disabled={draftLoaded || paStatus !== 'idle'}>Draft</button>
                          {/* Cancel PA Chat */}
                          <button type="button" onClick={() => handleCancelChat(true)} className="btn-danger" disabled={paStatus === 'idle'}>Cancel PA Chat</button>
                    </div>
                </form>
                  {/* End Restore Order Form */}
                        </div>

              {/* The PA requirements are now displayed in the sidebar summary */}
                                  </div>
          {/* PA Sidebar with Summary & Chat Tabs */}
          <div className={`conversation-panel pa-sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
            <div className="status-display">
              <span>PA Status:</span>
              <span className="detail">{getStatusLabel()}</span>
              <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ marginLeft: 'auto' }}>
                {sidebarOpen ? '◀︎' : '▶︎'}
              </button>
                                            </div>
            {sidebarOpen && (
              <>
                {/* Semantic tabs using nav.tabs */}
                <nav className="tabs">
                  <ul>
                    <li className={activeTab === 'summary' ? 'active' : ''}>
                      <button onClick={() => setActiveTab('summary')}>Summary</button>
                    </li>
                    <li className={activeTab === 'chat' ? 'active' : ''}>
                      <button onClick={() => setActiveTab('chat')}>Chat</button>
                    </li>
                  </ul>
                </nav>
                {activeTab === 'summary' ? (
                  <>
                    <ul className="pa-summary-list">
                      {clauses.map(c => {
                        // map status to icon
                        const icon = c.status === 'met' ? '✔️'
                                     : c.status === 'missing' ? '❌'
                                     : c.status === 'pending_user' ? '📝'
                                     : c.status === 'error' ? '⚠️'
                                     : '⌛';
                        return (
                        <li key={c.id} className="pa-summary-item">
                          <div className="status-display">
                            <span className="detail">{c.label}</span>
                            <span>{icon}</span>
                                                </div>
                          {c.status === 'met' && c.evidence.length > 0 && (
                            <ul className="pa-summary-evidence">
                              {c.evidence.map((ev, i) => (
                                <li key={i} className="pa-evidence-item">({ev.score.toFixed(2)}) {ev.text} [{ev.fhirSource}]</li>
                              ))}
                            </ul>
                          )}
                          {c.status === 'pending_user' && (
                            <div className="input-section">
                                                <input
                                                    type="text"
                                value={userResponses[c.id] || ''}
                                onChange={e => handleUserResponseChange(c.id, e.target.value)}
                                placeholder={c.userPrompt || 'Enter details...'}
                              />
                            </div>
                                            )}
                                        </li>
                        );
                      })}
                                </ul>
                    <div className="input-section">
                      <button onClick={handleResumePA} className="btn-primary">Submit Responses</button>
                             </div>
                  </>
                ) : (
                    <div className="conversation-history">
                        {(state.task?.history ?? []).map((msg, idx) => (
                          <div key={idx}>
                            <strong>{msg.role === 'user' ? 'You' : 'Agent'}:</strong>{' '}
                            {msg.parts.map(p => p.type === 'text' ? p.text : JSON.stringify((p as DataPart).data, null, 2)).join(' ')}
                          </div>
                        ))}
                    </div>
                )}
                {activeTab === 'chat' && (
                  <div className="input-section">
                                <input
                                    type="text"
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      placeholder="Type your response..."
                      onKeyDown={e => e.key === 'Enter' && chatInput.trim() && (actions.sendInput({ role: 'user', parts: [{ type: 'text', text: chatInput }] }), setChatInput(''))}
                    />
                            </div>
                )}
              </>
                )}
            </div>
        </div>
    );
};

export default OrderEntryTab; 
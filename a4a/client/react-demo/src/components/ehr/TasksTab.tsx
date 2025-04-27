import { DataPart, Message, Task, TextPart } from '@jmandel/a2a-client/src/types';
import { FunctionCallingConfigMode, FunctionDeclaration, GoogleGenAI, Type } from '@google/genai';
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useEhrContext } from '../../context/EhrContext';

// Import PA-specific types (Requirement, Clause, etc.) - these might need to be moved to a shared types file
// Assuming types are defined here for now, copy from OrderEntryTab.tsx
export type RequirementStatus = 'met' | 'missing' | 'pending_user' | 'error' | 'unknown';

export interface EvidenceItem {
  fhirSource: string;
  text: string;
  score: number;
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

// --- Function Declarations (Complete) ---
const reportExtractedRequirementsFn: FunctionDeclaration = {
    name: 'reportExtractedRequirements',
    parameters: {
        type: Type.OBJECT,
        description: 'Reports a list of structured requirements (including id, a brief label, full description, and keywords) that the LLM has already extracted from the payer policy found in the conversation history.',
        properties: {
            requirementsToReport: {
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
                    required: ['id', 'label', 'description']
                }
            }
        },
        required: ['requirementsToReport'],
    },
};
const reportRequirementAssessmentFn: FunctionDeclaration = {
    name: 'reportRequirementAssessment',
    parameters: {
        type: Type.OBJECT,
        description: 'Reports the assessment status (met, missing, pending_user) and supporting evidence for a single requirement, based on provided EHR context snippets.',
        properties: {
            requirementId: { type: Type.STRING, description: 'The ID of the requirement being assessed.' },
            status: { type: Type.STRING, description: 'Assessment status: met, missing, or pending_user.'},
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
            userPrompt: { type: Type.STRING, description: 'Optional prompt for the user if status is pending_user.' }
        },
        required: ['requirementId', 'status'],
    },
};
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
};
const reportFinalNarrativeFn: FunctionDeclaration = {
    name: 'reportFinalNarrative',
    parameters: {
        type: Type.OBJECT,
        description: 'Reports the final payer-ready narrative and any referenced resource IDs, generated based on all met requirements.',
        properties: {
            finalNarrative: { type: Type.STRING, description: 'The generated payer-ready narrative text.' },
            resourceIds: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'List of FHIR resource IDs referenced in the narrative.' }
        },
        required: ['finalNarrative'],
    },
};
const reportUserInteractionNeededFn: FunctionDeclaration = {
    name: 'reportUserInteractionNeeded',
    parameters: {
        type: Type.OBJECT,
        description: 'Reports that user input is needed for specific requirements and provides prompts for the user.',
        properties: {
            batchPrompt: { type: Type.STRING, description: 'A single summary prompt explaining what information is needed overall.' },
            requirementsWithPrompts: {
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
const reportClauseAssessmentFn: FunctionDeclaration = {
  name: 'reportClauseAssessment',
  parameters: {
    type: Type.OBJECT,
    description: 'For a single clause, reports which option satisfied it (or missing/pending_user), plus evidence or prompt.',
    properties: {
      clauseId: { type: Type.STRING },
      chosenOptionId: { type: Type.STRING, description: 'ID of the met option; omitted if none met.' },
      status: { type: Type.STRING },
      evidence: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { fhirSource: { type: Type.STRING }, text: { type: Type.STRING }, score: { type: Type.NUMBER } }, required:['fhirSource','text','score'] } },
      userPrompt: { type: Type.STRING }
    },
    required: ['clauseId','status']
  }
};

// Define constants
const GEMINI_MODEL_NAME = 'gemini-2.5-pro-preview-03-25'; // Keep consistent

const TasksTab: React.FC = () => {
    // --- Existing PA State --- 
    const [clauses, setClauses] = useState<RequirementsCNF>([]);
    const [paStatus, setPaStatus] = useState<'idle' | 'initiating' | 'extracting' | 'assessing' | 'awaiting_user' | 'synthesizing' | 'completed' | 'error'>('idle');
    const [lastError, setLastError] = useState<string | null>(null);
    const [finalNarrative, setFinalNarrative] = useState<string | null>(null);
    const [finalResourceIds, setFinalResourceIds] = useState<string[]>([]);
    const [userResponses, setUserResponses] = useState<Record<string, string>>({});
    const [activeServiceRequest, setActiveServiceRequest] = useState<any | null>(null); // State to hold the target SR

    // --- Use EhrContext --- 
    const { ehrData, isLoading: isContextLoading, error: contextError } = useEhrContext(); // Get full context

    // --- AI Hooks (Keep for now, may need adaptation) --- 
    const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
    const ai = useMemo(() => new GoogleGenAI({ apiKey: GEMINI_API_KEY }), [GEMINI_API_KEY]);
    const tools = useMemo(() => [{ functionDeclarations: [
        reportExtractedRequirementsFn, reportRequirementAssessmentFn, searchEhrFn, reportFinalNarrativeFn, reportUserInteractionNeededFn, reportExtractedClausesFn, reportClauseAssessmentFn
    ] }], []);

    // --- Effect to find and set the active ServiceRequest (Draft) --- 
    useEffect(() => {
        if (isContextLoading || !ehrData?.fhir?.ServiceRequest) {
            setActiveServiceRequest(null); // Clear if loading or no data
            setPaStatus('idle'); // Reset PA state
            return;
        }

        // Find the first draft ServiceRequest
        const draftRequest = ehrData.fhir.ServiceRequest.find((sr: any) => sr.status === 'draft');
        
        if (draftRequest) {
             // Check if it's different from the current active one to avoid resetting state unnecessarily
             if (draftRequest.id !== activeServiceRequest?.id) {
                console.log(`TasksTab: Found draft ServiceRequest: ${draftRequest.id}`);
                setActiveServiceRequest(draftRequest);
                // Reset PA state when the target request changes
                 setClauses([]);
                 setPaStatus('idle'); 
                 setLastError(null);
                 setFinalNarrative(null);
                 setFinalResourceIds([]);
                 setUserResponses({});
             }
        } else {
            // No draft found
             if (activeServiceRequest) { // Clear if one was previously active
                 setActiveServiceRequest(null);
                 setPaStatus('idle'); 
                 console.log("TasksTab: No draft ServiceRequest found.");
             }
        }
    }, [ehrData, isContextLoading, activeServiceRequest?.id]); // Depend on ehrData, loading state, and the ID of the active request


    // --- Internal searchEhr (TODO: Replace/Integrate with grepRecordLogic if desired) ---
    const searchEhr = useCallback(async (query: string): Promise<{ snippets: string[] }> => {
        if (!ehrData) return { snippets: [] }; // Handle no data
        const snippets: string[] = [];
        const lower = query.toLowerCase();
        for (const [type, resources] of Object.entries(ehrData.fhir)) {
            for (const r of resources) {
                const resourceText = JSON.stringify(r);
                if (resourceText.toLowerCase().includes(lower)) {
                    snippets.push(`Matched FHIR Resource ${type}/${r.id}:\n${resourceText}`);
                }
            }
        }
        for (const att of ehrData.attachments) {
            if (att.contentPlaintext && att.contentPlaintext.toLowerCase().includes(lower)) {
                snippets.push(`Matched Attachment ${att.resourceType}/${att.resourceId} (${att.path}):\n${att.contentPlaintext}`);
            }
        }
        console.log(`searchEhr('${query}') found ${snippets.length} snippets.`);
        return { snippets };
    }, [ehrData]);

    // --- formatHistoryMarkdown (Keep) ---
    const formatHistoryMarkdown = (history: Message[] = []): string => {
        return history.map(msg => {
            const role = msg.role === 'user' ? 'User' : 'Agent';
            const partsText = msg.parts.map(p => {
                if (p.type === 'text') return p.text;
                if (p.type === 'data') return `[Data: ${JSON.stringify(p.data, null, 2)}]`;
                return '[Unsupported Part]';
            }).join('\n\n');
            return `**${role}**: ${partsText}`;
        }).join('\n\n---\n');
    };

    // --- Placeholder for Task Liaison Logic --- 
    // The original useTaskLiaison hook and its integration needs to be adapted
    // based on how `activeServiceRequest` is now managed. 
    // For now, we'll just have placeholders for handlers it might provide.
    const { initiatePa, submitUserResponse } = useMemo(() => {
        // Replace with actual adapted hook logic or implementation
        console.warn("Task Liaison logic needs adaptation for context-based ServiceRequest.");
        return {
             initiatePa: async () => { setLastError("PA initiation logic not fully implemented after refactor."); setPaStatus('error'); },
             submitUserResponse: async () => { setLastError("User response submission not fully implemented after refactor."); setPaStatus('error'); }
        };
    }, [activeServiceRequest /* other dependencies? */]);


    // --- Handler for User Input Changes (Keep) ---
    const handleUserResponseChange = (clauseId: string, value: string) => {
        setUserResponses(prev => ({ ...prev, [clauseId]: value }));
    };

    // --- Render Logic ---
    if (isContextLoading) return <p>Loading Tasks...</p>;
    if (contextError) return <p>Error loading EHR data: {contextError}</p>;
    if (!ehrData) return <p>No patient data loaded.</p>;

    // Main tab content
    return (
        <div className="tab-content"> {/* Remove active class */}
            <h2 className="text-lg font-semibold mb-2">Prior Auth Task Runner</h2>

            {/* Section to display which task is being processed */}
            <div className="mb-4 p-3 border rounded bg-blue-50 text-sm">
                {activeServiceRequest ? (
                    <p>Processing Task for ServiceRequest: <strong>{activeServiceRequest.id}</strong> ({activeServiceRequest.code?.text || 'Unknown Service'})</p>
                ) : (
                    <p className="text-gray-500 italic">No active draft ServiceRequest found to process.</p>
                )}
            </div>

            {/* Display PA status and controls only if a task is active */}
            {activeServiceRequest && (
                 <div className="pa-workflow-container space-y-4">
                     {/* Button to initiate PA */}
                    {paStatus === 'idle' && (
                        <button 
                            onClick={initiatePa}
                            className="px-4 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                        >
                            Start Prior Auth Process
                        </button>
                    )}

                     {/* Display status and error messages */}
                    <p className="text-sm font-medium">Status: <span className="font-normal px-2 py-0.5 rounded bg-gray-200">{paStatus}</span></p>
                    {lastError && <p className="text-sm text-red-600 border border-red-300 p-2 rounded bg-red-50">Error: {lastError}</p>}

                     {/* Display Requirements/Clauses (Existing UI logic - needs clauses state) */}
                     {clauses.length > 0 && (paStatus === 'assessing' || paStatus === 'awaiting_user' || paStatus === 'completed') && (
                         // ... (Render RequirementClause components based on `clauses` state) ...
                         // This part remains largely the same, assuming `clauses` state is populated correctly
                         // by the adapted PA logic (placeholder `initiatePa`)
                         <div>
                            <h3 className="text-md font-semibold mb-1">Policy Requirements:</h3>
                             {clauses.map(clause => (
                                 <div key={clause.id} className="mb-2 p-2 border rounded">
                                     <p>Clause: {clause.label} (Status: {clause.status})</p>
                                     {/* Render options, evidence, user prompts etc. */} 
                                      {/* Example: User prompt rendering */}
                                     {clause.status === 'pending_user' && clause.userPrompt && (
                                         <div className="mt-1 p-2 bg-yellow-50 border border-yellow-200 rounded">
                                             <label htmlFor={`user_resp_${clause.id}`} className="block text-xs font-medium text-yellow-800 mb-1">{clause.userPrompt}</label>
                                             <input 
                                                 type="text" 
                                                 id={`user_resp_${clause.id}`} 
                                                 value={userResponses[clause.id] || ''} 
                                                 onChange={(e) => handleUserResponseChange(clause.id, e.target.value)} 
                                                 className="w-full p-1 border border-yellow-300 rounded text-xs"
                                             />
                        </div>
                                     )}
                                </div>
                             ))}
                            </div>
                     )}
                    
                     {/* Submit Button for User Responses */}
                     {paStatus === 'awaiting_user' && (
                         <button 
                            onClick={submitUserResponse} 
                            className="px-4 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                            // disabled={!Object.keys(userResponses).length} // Or more specific validation
                         >
                             Submit User Info
                         </button>
                     )}

                    {/* Display Final Narrative (Existing UI logic) */}
                    {paStatus === 'completed' && finalNarrative && (
                        <div className="mt-4 p-3 border rounded bg-green-50">
                            <h3 className="text-md font-semibold mb-1">Final Narrative</h3>
                            <pre className="text-xs whitespace-pre-wrap bg-white p-2 rounded border">{finalNarrative}</pre>
                            {finalResourceIds.length > 0 && <p className="text-xs mt-1">Referenced IDs: {finalResourceIds.join(', ')}</p>}
                        </div>
                )}
            </div>
            )}
        </div>
    );
};

export default TasksTab;
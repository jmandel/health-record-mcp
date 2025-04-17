import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GoogleGenAI, FunctionCallingConfigMode, FunctionDeclaration, Type } from '@google/genai';
import { useEhrContext } from '../../context/EhrContext';
import { useTaskLiaison } from '../../hooks/useTaskLiaison';
import { Message, DataPart, TextPart, Part, Task } from '@a2a/client/src/types';

interface OrderEntryTabProps {
    serviceRequest: any; // Replace 'any' with ServiceRequest FHIR type
    // Add callbacks for updating/saving the order if needed (e.g., updateEhrData)
}

interface OrderFormData {
    medication: string;
    dose: string;
    frequency: string;
    instructions: string;
    startDate: string;
}

const DRAFT_STORAGE_KEY = 'botoxOrderDraft';

// Function declarations for LLM tool calls
const ehrSearchFn: FunctionDeclaration = {
    name: 'searchEhr',
    parameters: {
        type: Type.OBJECT,
        description: 'Search the EHR for matching text snippets.',
        properties: { query: { type: Type.STRING, description: 'Search query string -- use only one word.' } },
        required: ['query'],
    },
};
const createResponseFn: FunctionDeclaration = {
    name: 'createResponse',
    parameters: {
        type: Type.OBJECT,
        description: 'Compose a narrative response based on the case.',
        properties: {
            narrative: { type: Type.STRING, description: 'Narrative free-text for the response.' },
            resourceIds: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Array of FHIR resource IDs referenced.' }
        },
        required: ['narrative'],
    },
};
const askUserFn: FunctionDeclaration = {
    name: 'askUser',
    parameters: {
        type: Type.OBJECT,
        description: 'Prompt the user with a to-do list and summary for further input.',
        properties: {
            summary: { type: Type.STRING, description: 'Instruction summary for the user.' },
            todos: {
                type: Type.ARRAY,
                description: 'Array of to-do items for the user to complete.',
                items: {
                    type: Type.OBJECT,
                    description: 'A single to-do item including status and optional assistant note.',
                    properties: {
                        id: { type: Type.STRING, description: 'Unique identifier for the to-do item.' },
                        text: { type: Type.STRING, description: 'Description of the task to complete.' },
                        done: { type: Type.BOOLEAN, description: 'Whether this task is already done.' },
                        note: { type: Type.STRING, description: 'Optional note from the assistant explaining how this task was completed.' }
                    },
                    required: ['id', 'text', 'done']
                }
            }
        },
        required: ['summary', 'todos'],
    },
};

const OrderEntryTab: React.FC<OrderEntryTabProps> = ({ serviceRequest }) => {
    const [formData, setFormData] = useState<OrderFormData>({
        medication: 'OnabotulinumtoxinA (Botox)', // Default based on mock
        dose: '',
        frequency: 'One-time',
        instructions: '',
        startDate: ''
    });
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [draftLoaded, setDraftLoaded] = useState(false);
    const [showConversation, setShowConversation] = useState(false);
    const [askUserPrompt, setAskUserPrompt] = useState<string | null>(null);
    const [userAnswer, setUserAnswer] = useState<string>('');
    const [rawLLMResponses, setRawLLMResponses] = useState<string[]>([]);
    const [showRawResponses, setShowRawResponses] = useState<boolean>(false);
    const [askUserTodo, setAskUserTodo] = useState<any[] | null>(null);
    const [todoResponses, setTodoResponses] = useState<Record<string,string>>({});

    const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
    const ai = useMemo(() => new GoogleGenAI({ apiKey: GEMINI_API_KEY }), [GEMINI_API_KEY]);
    const tools = useMemo(
        () => [{ functionDeclarations: [ehrSearchFn, createResponseFn, askUserFn] }],
        []
    );

    // EHR context for search tool
    const ehrData = useEhrContext();
    const searchEhr = useCallback(async (query: string): Promise<{ snippets: string[] }> => {
        const snippets: string[] = [];
        const lower = query.toLowerCase();
        // Search FHIR resources
        for (const [type, resources] of Object.entries(ehrData.fhir)) {
            for (const r of resources) {
                const text = JSON.stringify(r);
                if (text.toLowerCase().includes(lower)) {
                    snippets.push(`Found in ${type}/${r.id}: ${text.substring(0, 200)}...`);
                }
            }
        }
        // Search attachments plaintext
        for (const att of ehrData.attachments) {
            if (att.contentPlaintext?.toLowerCase().includes(lower)) {
                snippets.push(`Attachment ${att.resourceType}/${att.resourceId}: ${att.contentPlaintext.substring(0,200)}...`);
            }
        }
        return { snippets };
    }, [ehrData]);

    // Initial form population and draft loading
    useEffect(() => {
        // Try loading from draft first
        const draft = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (draft) {
            try {
                const parsedDraft = JSON.parse(draft);
                setFormData(parsedDraft);
                // Don't set draftLoaded here, let the hook resuming handle it
                console.log("Loaded form data draft from localStorage");
                // We might need to resume the task based on stored taskId if app reloads
                // This example doesn't store/resume taskId from localStorage, assumes fresh start or hook handles resume via props
                // if (parsedDraft.taskId) {
                //     actions.resumeTask(parsedDraft.taskId); // Requires taskId to be saved with form draft
                // }
            } catch (e) {
                console.error("Failed to parse draft:", e);
                localStorage.removeItem(DRAFT_STORAGE_KEY); // Clear invalid draft
            }
        }

        // If no draft, potentially populate from serviceRequest (simplified)
        if (!draft && serviceRequest) { // Only if no draft was loaded
            setFormData(prev => ({
                ...prev,
                // Extract initial values if available in a real scenario
                // medication: serviceRequest.note?.[0]?.text?.split(':')?.[1]?.trim() || prev.medication,
                // reason: serviceRequest.reasonCode?.[0]?.text || '', // Example
            }));
        }
    }, [serviceRequest]); // Re-run if serviceRequest changes (might need adjustment)

    // Helper to format task history as markdown
    const formatHistoryMarkdown = (history: Message[] = []): string => {
        return history.map(msg => {
            const role = msg.role === 'user' ? 'User' : 'Agent';
            const partsText = msg.parts.map(p => {
                if (p.type === 'text') return p.text;
                if (p.type === 'data') {
                    const data = (p as DataPart).data as { snippets: string[] };
                    return data.snippets.map(s => `> ${s}`).join('\n');
                }
                return '';
            }).join('\n\n');
            return `**${role}**:\n${partsText}`;
        }).join('\n\n');
    };

    // Auto-input handler using Google GenAI with function calling and a tool-use loop
    const handleAutoInput = useCallback(async (task: Task): Promise<Message | null> => {
        // Prepare base instructions, history, and form data
        const markdownHistory = formatHistoryMarkdown(task.history || []);
        const formMarkdown = [
            `- Medication: ${formData.medication}`,
            `- Dose: ${formData.dose}`,
            `- Frequency: ${formData.frequency}`,
            `- Instructions: ${formData.instructions}`,
            `- Start Date: ${formData.startDate}`
        ].join('\n');

        const PRIOR_AUTH_SYSTEM_PROMPT = `
You are a smart prior‐authorization assistant. Your goal is to gather all necessary information from the patient's EHR and the user form, then produce exactly one of:

  • A complete payor‐ready narrative via createResponse (with any referenced FHIR resource IDs), or  
  • A single, focused clarifying question via askUser.

Steps:
1. Review the conversation history and current form data.
2. If key clinical details are missing, perform up to 3 targeted EHR searches by calling searchEhr(query):
   – Query must be one single word (no spaces/punctuation).
   – searchEhr matches raw EHR JSON substrings, so choose terms present in records.
3. After each search, reason over returned snippets.
4. Once ready, call createResponse with:
     • narrative: concise payer‐focused justification
     • resourceIds: list of FHIR IDs cited
5. If after 5 searches details remain missing, call askUser ONCE with a JSON-serialized to-do list array, for example:
   [{"id":"search-migraine","text":"Search EHR for migraine","done":true},{"id":"confirm-frequency","text":"Confirm headache days per month","done":false}]
   Our UI will render this list as tasks; users complete or provide details for each, then click Resume to return a single data part.
6. Never call createResponse or askUser for any other purpose.

Be concise, clinically accurate, and payer‑centric.
`.trim();

        const initialPrompt = `Your job is to review the prior authorization conversation up to this point and prepare a response that will satisfy the payor system if possible. Don't ask the user until you have ahready tried to search the EHR for relevant information.\n\n### Conversation History:\n${markdownHistory}\n\n### Form Data:\n${formMarkdown}`;
        // Start with initial prompt text
        const contents: any[] = [{role: "system", text: PRIOR_AUTH_SYSTEM_PROMPT}, initialPrompt];
        // Loop up to 10 tool steps
        for (let step = 0; step < 10; step++) {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-preview-04-17',
                contents: contents,
                config: {
                    toolConfig: {
                        functionCallingConfig: {
                            mode: FunctionCallingConfigMode.ANY,
                            allowedFunctionNames: ['searchEhr', 'createResponse', 'askUser'],
                        }
                    },
                    tools: tools,
                }
            });
            // Save raw response
            setRawLLMResponses(prev => [...prev, JSON.stringify(response, null, 2)]);
            const calls = response.functionCalls || [];
            if (calls.length === 0) break;
            const call = calls[0];
            // Add the function call as a new content part
            contents.push({ functionCall: { id: call.id, name: call.name, args: call.args ?? {} } });
            if (call.name === 'searchEhr') {
                // Execute the searchEhr tool and feed result back
                const result = await searchEhr((call.args as any).query);
                contents.push({ functionResponse: { id: call.id, name: call.name, response: { output: result } } });
                continue;
            }
            if (call.name === 'createResponse') {
                const narrative: string = (call.args as any).narrative;
                const resourceIds: string[] = (call.args as any).resourceIds || [];
                const text = narrative + (resourceIds.length ? ` (refs: ${resourceIds.join(',')})` : '');
                return { role: 'agent', parts: [{ type: 'text', text }] };
            }
            if (call.name === 'askUser') {
                // Parse structured to-do schema
                const args = call.args as { summary: string; todos: Array<{id:string; text:string; done:boolean}> };
                setAskUserPrompt(args.summary);
                setAskUserTodo(args.todos);
                // Pre-fill responses for already done tasks
                const initial: Record<string,string> = {};
                args.todos.forEach(item => {
                    if (item.done) initial[item.id] = '';
                });
                setTodoResponses(initial);
                setShowConversation(true);
                return null;
            }
        }
        // Fallback after exhausting loop
        setAskUserPrompt('LLM failed to produce an answer; please assist');
        setShowConversation(true);
        return null;
    }, [ai, formData, searchEhr]);

    // Initialize task liaison using the new hook structure with autoInput
    const { state, actions } = useTaskLiaison({
        agentUrl: 'http://localhost:3001/a2a', // Replace with your agent endpoint
        autoInputHandler: handleAutoInput,
    });

    // Update draftLoaded state when a task becomes active
    useEffect(() => {
        if (state.taskId && state.status !== 'idle' && state.status !== 'completed' && state.status !== 'error') {
            setDraftLoaded(true);
            // Optionally save taskId to resume later
            // localStorage.setItem('lastBotoxTaskId', state.taskId);
            // Save form data when task is active? Maybe only on specific user action.
             localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(formData));
        }
        // Clear draft state if task completes or is cancelled implicitly by hook closing
        if (state.status === 'completed' || (state.status === 'idle' && draftLoaded)) {
            setDraftLoaded(false);
            // Decide whether to clear task ID on completion
            // localStorage.removeItem('lastBotoxTaskId');
             localStorage.removeItem(DRAFT_STORAGE_KEY); // Clear form draft on completion/idle after being active
        }

    }, [state.status, state.taskId, draftLoaded, formData]); // Add formData dependency for saving

    // Clear askUserPrompt when user sends a response
    useEffect(() => {
        if (askUserPrompt && state.status !== 'awaiting-input') {
            setAskUserPrompt(null);
        }
    }, [state.status, askUserPrompt]);

    const handleAskUserSubmit = useCallback(() => {
        if (!userAnswer.trim()) return;
        const message: Message = { role: 'user', parts: [{ type: 'text', text: userAnswer }] };
        actions.sendInput(message);
        setUserAnswer('');
        setAskUserPrompt(null);
        setShowConversation(false);
    }, [userAnswer, actions]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    }, []);

    const handleSaveDraft = useCallback(() => {
        // Send initial form data both as a data part and a text part for LLM visibility
        const textPart: TextPart = {
            type: 'text',
            text: JSON.stringify(formData)
        };
        const message: Message = { role: 'user', parts: [textPart] };
        try {
            // startTask now just takes the message and optional taskId
            actions.startTask(message);
            setShowConversation(true); // Show conversation panel when task starts
             // draftLoaded state will be set by the useEffect watching state.status
        } catch (e) {
            // The hook/middleware now handles errors internally and updates state.error
            console.error('Error dispatching startTask action (should be caught by hook):', e);
        }
    }, [formData, actions]);

    const handleSubmitOrder = useCallback(() => {
        // In a real app, you would send this data to a backend/API
        console.log("Submitting order:", formData);
        setIsSubmitted(true);
        localStorage.removeItem(DRAFT_STORAGE_KEY); // Clear draft on successful submission
        // Potentially update parent state (e.g., change serviceRequest status)
        // If a task was running, cancel it?
        if (state.status !== 'idle' && state.status !== 'completed') {
            actions.cancelTask();
        }
        alert('Order submitted (simulated).');
    }, [formData, actions, state.status]);

    const handleCancelOrder = useCallback(() => {
        if (confirm('Cancel conversation and clear current form?')) {
            actions.cancelTask();
            setShowConversation(false);
            setDraftLoaded(false); // Explicitly clear draft state
            // Maybe clear form data too?
            // setFormData({ ...initial state... });
            localStorage.removeItem(DRAFT_STORAGE_KEY);
        }
    }, [actions]);

    // Handle user text input submission
    const handleSendUserInput = useCallback((text: string) => {
        if (!text.trim()) return;
        const textPart: TextPart = { type: 'text', text };
        const message: Message = { role: 'user', parts: [textPart] };
        actions.sendInput(message);
        // Clear askUser prompt when user responds
        setAskUserPrompt(null);
        setShowConversation(false);
    }, [actions]);

    // Handler to resume with completed to-dos and synthesize PA narrative
    const handleAskUserResume = useCallback(() => {
        // Build instruction and structured data for LLM
        const textPart: TextPart = {
            type: 'text',
            text: 'I have completed the following tasks. Please synthesize a complete prior-authorization submission narrative to submit to the payor based on this.'
        };
        const dataPart: DataPart = {
            type: 'data',
            data: { todos: askUserTodo, responses: todoResponses }
        };
        const message: Message = { role: 'user', parts: [textPart, dataPart] };
        actions.sendInput(message);
        // Clear the to-do UI state
        setAskUserTodo(null);
        setTodoResponses({});
        setShowConversation(false);
    }, [askUserTodo, todoResponses, actions]);

    // Determine status label based on hook state
    const getStatusLabel = () => {
        switch (state.status) {
            case 'idle': return 'Idle';
            case 'connecting': return 'Connecting...';
            case 'running': return 'Working...';
            case 'awaiting-input': return 'Input Required';
            case 'completed':
                 // Check task sub-status if available
                 if (state.task?.status.state === 'canceled') return 'Canceled';
                 if (state.task?.status.state === 'failed') return 'Failed';
                 return 'Completed';
            case 'error': return 'Error';
            default: return 'Unknown';
        }
    };


    if (isSubmitted) {
        return (
            <div id="order-entry" className="tab-content active">
                <h2>Order Entry</h2>
                <div className="order-confirmation">
                    <h4>Order Confirmation</h4>
                    <p><strong>Medication:</strong> {formData.medication}</p>
                    <p><strong>Dose:</strong> {formData.dose}</p>
                    <p><strong>Frequency:</strong> {formData.frequency}</p>
                    <p><strong>Instructions:</strong> {formData.instructions}</p>
                    <p><strong>Start Date:</strong> {formData.startDate}</p>
                    <button onClick={() => setIsSubmitted(false)} className="btn-secondary">Place New Order</button>
                </div>
            </div>
        );
    }

    return (
        <div id="order-entry" className="tab-content active">
            <h2>Order Entry</h2>
            <div className="order-in-progress">
                <h3>Botox Injection</h3> {/* Could be dynamic */}
                <p><strong>Indication:</strong> {serviceRequest?.reasonCode?.[0]?.text || 'Post-Concussion Syndrome Headaches'}</p>
                <form id="botox-form">
                    {/* Show message based on draftLoaded state */}
                    {draftLoaded && state.status !== 'idle' && <p><em>Conversation in progress... (Task ID: {state.taskId})</em></p>}
                    <div className="form-group">
                        <label htmlFor="medication">Medication:</label>
                        <input type="text" id="medication" value={formData.medication} onChange={handleChange} readOnly={draftLoaded} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="dose">Dose:</label>
                        <input type="text" id="dose" value={formData.dose} onChange={handleChange} placeholder="e.g., 155 units" readOnly={draftLoaded} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="frequency">Frequency:</label>
                        <select id="frequency" value={formData.frequency} onChange={handleChange} disabled={draftLoaded}>
                            <option>One-time</option>
                            <option>Every 3 months</option>
                            <option>Other...</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="instructions">Instructions:</label>
                        <textarea id="instructions" value={formData.instructions} onChange={handleChange} rows={3} placeholder="Injection sites, technique, etc." readOnly={draftLoaded}></textarea>
                    </div>
                    <div className="form-group">
                        <label htmlFor="start-date">Start Date:</label>
                        <input type="date" id="startDate" value={formData.startDate} onChange={handleChange} readOnly={draftLoaded} />
                    </div>
                    <div className="buttons">
                        {/* Only allow Submit if no conversation is active? Or Submit cancels conversation? */}
                        <button type="button" onClick={handleSubmitOrder} className="btn-primary" disabled={draftLoaded && state.status !== 'completed' && state.status !== 'idle'}>Submit Order</button>
                        {/* Disable Save Draft if already started */}
                        <button type="button" onClick={handleSaveDraft} className="btn-secondary" disabled={draftLoaded}>Save Draft &amp; Chat</button>
                        {/* Only allow Cancel if conversation is active */}
                        <button type="button" onClick={handleCancelOrder} className="btn-danger" disabled={!draftLoaded || state.status === 'completed' || state.status === 'idle'}>Cancel Chat</button>
                    </div>
                </form>

                {/* Show conversation panel if task is active or if user explicitly showed it */}
                {(draftLoaded || showConversation) && (
                    <div className="conversation-panel">
                        {/* Display status derived from state */}
                        <div className="status-display">
                             <span>Status: {getStatusLabel()}</span>
                             {/* Display error message if present */}
                             {state.error && <div className="error-detail" style={{ color: 'red', marginTop: '5px' }}>Error: {state.error.message}</div>}
                        </div>

                        {/* If the LLM asked the user for input, show askUser form; otherwise show standard input when awaiting-input */}
                        {askUserTodo ? (
                            <div className="ask-user-section todo-section">
                                {/* Show LLM completed responses */}
                                {rawLLMResponses.length > 0 && (
                                  <div className="llm-completed-section">
                                     <h5>Assistant completed steps:</h5>
                                     {rawLLMResponses.map((resp, idx) => (
                                       <pre key={idx} className="llm-completed-response" style={{ background: '#eef', padding: '8px', marginBottom: '8px' }}>
                                         {resp}
                                       </pre>
                                     ))}
                                  </div>
                                )}
                                <h4>To-Do List</h4>
                                <ul className="todo-list" style={{ listStyle: 'none', paddingLeft: 0 }}>
                                    {askUserTodo.map(item => (
                                        <li key={item.id} className="todo-item" style={{ marginBottom: '10px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                {item.done ? (
                                                    <span style={{ color: 'green', marginRight: '8px' }}>✔</span>
                                                ) : (
                                                    <input
                                                        type="checkbox"
                                                        style={{ marginRight: '8px' }}
                                                        checked={!!todoResponses[item.id]}
                                                        onChange={e => {
                                                            const done = e.target.checked;
                                                            setTodoResponses(prev => ({ ...prev, [item.id]: done ? prev[item.id] || '' : undefined }));
                                                        }}
                                                    />
                                                )}
                                                <span>{item.text}</span>
                                            </div>
                                            {item.done && item.note && (
                                                <div className="todo-note" style={{ marginLeft: '24px', color: '#555', fontStyle: 'italic' }}>
                                                    {item.note}
                                                </div>
                                            )}
                                            {!item.done && todoResponses[item.id] !== undefined && (
                                                <input
                                                    type="text"
                                                    className="todo-input"
                                                    placeholder="Enter details"
                                                    style={{ width: '100%', marginTop: '4px', padding: '4px' }}
                                                    value={todoResponses[item.id] || ''}
                                                    onChange={e => setTodoResponses(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                />
                                            )}
                                        </li>
                                    ))}
                                </ul>
                                <button onClick={handleAskUserResume} className="btn-primary">Resume</button>
                             </div>
                        ) : askUserPrompt ? (
                            <div className="ask-user-section">
                                <p><strong>Question:</strong> {askUserPrompt}</p>
                                {/* If LLM failed fallback, provide raw responses toggle */}
                                {askUserPrompt === 'LLM failed to produce an answer; please assist' && (
                                    <>
                                        <button type="button" onClick={() => setShowRawResponses(prev => !prev)} className="btn-secondary" style={{ margin: '8px 0' }}>
                                            {showRawResponses ? 'Hide' : 'View'} LLM Responses
                                        </button>
                                        {showRawResponses && (
                                            <pre className="llm-raw-responses" style={{ maxHeight: '200px', overflowY: 'auto', background: '#f9f9f9', padding: '8px' }}>
                                                {rawLLMResponses.join('\n\n')}
                                            </pre>
                                        )}
                                    </>
                                )}
                                <input
                                    type="text"
                                    value={userAnswer}
                                    onChange={e => setUserAnswer(e.target.value)}
                                    placeholder="Your answer..."
                                />
                                <button onClick={handleAskUserSubmit} disabled={!userAnswer.trim()}>
                                    Submit Response
                                </button>
                            </div>
                        ) : null}
                         
                        {/* Toggle history visibility */}
                        <button onClick={() => setShowConversation(prev => !prev)} className="btn-secondary" style={{ marginTop: '10px' }}>
                            {showConversation ? 'Hide' : 'Show'} Full History
                        </button>
                        {/* Display task history if shown */}
                        {showConversation && state.task && (
                            <pre className="conversation-history">{JSON.stringify(state.task, null, 2)}</pre>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrderEntryTab; 
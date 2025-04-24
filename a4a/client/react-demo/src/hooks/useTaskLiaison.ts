// src/hooks/useTaskLiaison.ts

import { Dispatch, useCallback, useEffect, useMemo, useReducer } from 'react';
// Assuming A2AClient resolves to the correct V2 client in your environment
// import { A2AClient } from '@a2a/client';
// Use corrected imports for V2 client file
import { A2AClient } from '@a2a/client/src/A2AClientV2';
import {
    AgentCard, // Needed for start/resume
    JsonRpcError,
    Message,
    Task,
    TaskStatus
} from '@a2a/client/src/types';
import { v4 as uuid } from 'uuid'; // Use uuid for ID generation

// --- State & Action Types ---

// Define the structure for the summary
export interface TaskSummary {
    friendlyLabel: string;
    emoji: string;
}

type A2AStatus = 'idle' | 'connecting' | 'running' | 'awaiting-input' | 'completed' | 'error';

interface A2AState {
    status: A2AStatus;
    task: Task | null;
    question: Message | null; // The specific message requiring input
    error: Error | JsonRpcError | null;
    taskId: string | null;
    agentUrl: string | null; // Store agentUrl used
    summary: TaskSummary; // Add the summary field
}

type A2AAction =
    | { type: 'STARTING'; payload: { agentUrl: string } }
    | { type: 'TASK_UPDATED'; payload: Task }
    | { type: 'ERROR'; payload: Error | JsonRpcError }
    | { type: 'CLOSED' } // Client connection closed
    | { type: 'RESUME_TASK'; payload: { agentUrl: string; id: string } }
    | { type: 'START_TASK'; payload: { agentUrl: string; id: string; message: Message } }
    | { type: 'SEND_INPUT'; payload: Message }
    | { type: 'CANCEL_TASK' }
    | { type: 'UPDATE_SUMMARY'; payload: TaskSummary }; // New action type

// --- Initial State ---

// Define the default summary generator function
const defaultSummaryGenerator = (task: Task | null): TaskSummary => {
    console.log("sumamry gen", task)
    if (!task) {
        return { friendlyLabel: 'Idle', emoji: '😴' };
    }

    switch (task.status.state) {
        case 'submitted':
        case 'working':
            return { friendlyLabel: 'Working', emoji: '⏳' };
        case 'input-required':
            return { friendlyLabel: 'Input Required', emoji: '❓' };
        case 'completed':
            return { friendlyLabel: 'Completed', emoji: '✅' };
        case 'canceled':
            return { friendlyLabel: 'Canceled', emoji: '❌' };
        case 'failed':
            return { friendlyLabel: 'Failed', emoji: '🔥' };
        default:
            // Should not happen with known states, but provide a fallback
            return { friendlyLabel: task.status.state, emoji: '🤔' };
    }
};

const initialState: A2AState = {
    status: 'idle',
    task: null,
    question: null,
    error: null,
    taskId: null,
    agentUrl: null,
    summary: defaultSummaryGenerator(null), // Initialize with default idle summary
};

// --- Reducer (Simplified) ---

// No longer need a factory
function reducer(state: A2AState, action: A2AAction): A2AState {
    switch (action.type) {
        case 'STARTING':
            // Reset state, status is connecting, summary will be updated by useEffect
            return {
                ...initialState,
                agentUrl: action.payload.agentUrl,
                status: 'connecting',
            };
        case 'TASK_UPDATED': {
            const task = action.payload;
            const taskState = task.status.state;
            let newStatus: A2AStatus;

            if (taskState === 'input-required') {
                newStatus = 'awaiting-input';
            } else if (['completed', 'canceled', 'failed'].includes(taskState)) {
                newStatus = 'completed';
            } else if (state.status !== 'connecting' && state.status !== 'error') {
                newStatus = 'running';
            } else {
                newStatus = state.status;
            }

            // Update status, task, question, taskId; summary will be updated by useEffect
            return {
                ...state,
                status: newStatus,
                task: task,
                question: taskState === 'input-required' ? (task.status.message ?? null) : null,
                taskId: task.id,
                error: null,
            };
        }
        case 'ERROR': {
            console.error("Reducer received ERROR:", action.payload);
            return { ...state, status: 'error', error: action.payload, question: null  };
        }
        case 'CLOSED': {
            const finalStates: TaskStatus['state'][] = ['completed', 'canceled', 'failed'];
            const isFinal = state.task && finalStates.includes(state.task.status.state);
            const newStatus = isFinal ? 'completed' : 'idle';
            return {
                ...state,
                status: newStatus,
                question: null,
            };
        }
        case 'UPDATE_SUMMARY': // Handle the new action
            return {
                ...state,
                summary: action.payload,
            };
        // Actions handled by middleware or optimistic updates
        case 'RESUME_TASK':
            return { ...state, agentUrl: action.payload.agentUrl, taskId: action.payload.id };
        case 'START_TASK':
            return { ...state, agentUrl: action.payload.agentUrl, taskId: action.payload.id };
        case 'SEND_INPUT':
            return { ...state, status: 'running', question: null }; // Optimistic
        case 'CANCEL_TASK':
            return { ...state, status: 'running', question: null }; // Optimistic
        default:
            return state;
    }
}

// --- Middleware to wire A2AClient events ---

// Define a type for the dispatch function the middleware receives
type MiddlewareDispatch = Dispatch<A2AAction>;

function createA2AMiddleware(getAuthHeaders?: () => Record<string, string> | Promise<Record<string, string>>) {
    // --- NEW: Generate ID and set up logging ---
    const middlewareId = `a2a-mw-${Math.random().toString(36).substring(2, 8)}`;
    console.log(`Middleware created: ${middlewareId}`);
    let client: A2AClient | null = null; // Client instance managed by the middleware

    // const _logInterval = setInterval(() => {
    //     // Log the current client object associated with this middleware instance
    //     console.log(`[${middlewareId}] Interval Log - Current Client:`, client);
    // }, 5000); // Log every 5 seconds

    // Note: Standard Zustand/Redux middleware patterns don't have a built-in
    // teardown hook directly within the middleware function itself.
    // This interval will continue as long as the middleware exists in memory.
    // If the store is destroyed or reconfigured, this interval might persist
    // if not explicitly handled by the store's lifecycle management.
    // For debugging purposes, this is often acceptable.
    // --- END NEW ---

    let storeApi: any = null; // Will be set by the store

    // The middleware takes dispatch and returns a function that takes an action
    return (dispatch: MiddlewareDispatch) => (action: A2AAction) => {
        console.log("Middleware: createA2AMiddleware: action", middlewareId, action);
        if (action.type === 'RESUME_TASK' || action.type === 'START_TASK') {
            const { agentUrl } = action.payload; // Get agentUrl from payload
            dispatch({ type: 'STARTING', payload: { agentUrl } }); // Dispatch STARTING with agentUrl
            console.log("Middleware: createA2AMiddleware: STARTING", agentUrl);

            // Construct the correct URL for the agent card
            let cardUrl: string;
            try {
                cardUrl = new URL('.well-known/agent.json', agentUrl).href;
            } catch (e) {
                console.error("Middleware: Invalid agentUrl provided:", agentUrl, e);
                dispatch({ type: 'ERROR', payload: new Error(`Invalid agentUrl: ${agentUrl}`) });
                return; // Stop processing if URL is invalid
            }

            // Fetch agent card (optional, but good practice)
            // You might want to store the card in state if needed
            fetch(cardUrl)
                .then(res => {
                    if (!res.ok) throw new Error(`Failed to fetch agent card: ${res.statusText}`);
                    return res.json() as Promise<AgentCard>;
                })
                .then(card => {
                    console.log("Middleware: Fetched agent card:", card.name);
                    const clientOptions = {
                        getAuthHeaders: getAuthHeaders ?? (async () => ({})),
                    }; // Add other options like forcePoll if needed

                    if (action.type === 'START_TASK') {
                        const { id, message } = action.payload;
                        console.log(`Middleware: Starting task ${id}...`);
                        client = A2AClient.start(agentUrl, { id, message }, clientOptions);
                    } else { // RESUME_TASK
                        const { id } = action.payload;
                        console.log(`Middleware: Resuming task ${id}...`);
                        client = A2AClient.resume(agentUrl, id, clientOptions);
                    }


                    // --- Attach Event Listeners ---
                    client.on('task-update', (task: Task) => { // V2 often passes the object directly
                         console.log("Middleware: task-update event", task.status.state);
                        dispatch({ type: 'TASK_UPDATED', payload: task });
                     });

                    // Use 'status-update' for more granular state tracking if needed,
                    // but 'task-update' usually covers the necessary task object changes.
                    // client.on('status-update', ({ status, task }: { status: TaskStatus, task: Task }) => {
                    //     console.log("Middleware: status-update event", status.state);
                    //     // You might dispatch a different action or handle status specially
                    //     // For now, TASK_UPDATED driven by task-update handles state transitions
                    //     dispatch({ type: 'TASK_UPDATED', payload: task });
                    // });

                    client.on('error', (error: unknown) => { // V2 often passes error directly
                        console.error("Middleware: error event", middlewareId, error);
                        dispatch({ type: 'ERROR', payload: error as Error | JsonRpcError });
                     });

                     client.on('close', () => {
                         console.log("Middleware: client close event, ignoring", middlewareId, client);
                     });

                    // Get initial snapshot after listeners are attached
                     const initialTask = client.getCurrentTask();
                     if (initialTask) {
                         console.log("Middleware: Got initial task snapshot", initialTask.status.state);
                         dispatch({ type: 'TASK_UPDATED', payload: initialTask });
                } else {
                         console.warn("Middleware: No initial task snapshot available after connect.");
                         // Could indicate an issue or just that the task hasn't been created yet.
                     }
                 })
                 .catch(err => {
                     console.error("Middleware: Error during client setup:", err);
                     dispatch({ type: 'ERROR', payload: err });
                 });

        } else if (action.type === 'SEND_INPUT') {
            console.log("Middleware: SEND_INPUT action");
            console.log("Middleware: client?.getCurrentState()", client?.getCurrentState())
            if (client && client.getCurrentState() === 'input-required') {
                console.log("Middleware: Sending input...", action.payload);
                client.send(action.payload)
                 .catch((err: any) => {
                     console.error("Middleware: Error sending input:", err);
                     dispatch({ type: 'ERROR', payload: err as Error | JsonRpcError });
                 }); // Handle potential error on send
             } else if (client) {
                console.warn("Middleware: Attempted to send input, but client not awaiting input. State:", client.getCurrentState());
             } else {
                 console.error("Middleware: Cannot send input, client not initialized.");
                 console.error(client, client?.getCurrentState())
             }
        } else if (action.type === 'CANCEL_TASK') {
            if (client) {
                console.log("Middleware: Canceling task...");
                client.cancel()
                 .catch((err: any) => {
                     console.error("Middleware: Error canceling task:", err);
                     dispatch({ type: 'ERROR', payload: err as Error | JsonRpcError });
                 }); // Handle potential error on cancel
                } else {
                 console.warn("Middleware: Cannot cancel task, client not initialized.");
             }
        }
        return dispatch(action); // Don't pass the original action to the reducer if middleware handles it
    };
}

// --- Hook ---

export interface UseTaskLiaisonProps {
    agentUrl: string;
    initialTaskId?: string | null;
    getAuthHeaders?: () => Record<string, string> | Promise<Record<string, string>>;
    autoInputHandler?: (task: Task) => Promise<Message | null>;
    summaryGenerator?: (task: Task | null) => TaskSummary;
}

export interface UseTaskLiaisonResult {
    state: A2AState;
    actions: {
        startTask: (message: Message, taskId?: string) => void;
        sendInput: (message: Message) => void;
        cancelTask: () => void;
        resumeTask: (taskId: string) => void;
    };
}

export function useTaskLiaison({
    agentUrl,
    initialTaskId,
    getAuthHeaders,
    autoInputHandler,
    summaryGenerator = defaultSummaryGenerator,
}: UseTaskLiaisonProps): UseTaskLiaisonResult {
    // Use the plain reducer now
    const [state, rawDispatch] = useReducer(reducer, initialState);

    // Memoize middleware (remains the same)
    const middleware = useMemo(() => createA2AMiddleware(getAuthHeaders), []);
    const dispatch = useMemo(() => middleware(rawDispatch), [middleware]);

    // Effect to handle resuming task on mount (remains the same)
    useEffect(() => {
        if (initialTaskId && state.status === 'idle') {
            console.log(`useTaskLiaison Hook: Resuming task ${initialTaskId} on mount.`);
            dispatch({ type: 'RESUME_TASK', payload: { agentUrl, id: initialTaskId } });
        }
    }, [agentUrl, initialTaskId, dispatch, state.status]);

    // Effect to handle auto input (remains the same)
    useEffect(() => {
        if (state.status === 'awaiting-input' && state.task && autoInputHandler) {
            console.log("useTaskLiaison Hook: Auto-input handler triggered for task:", state.task.id);
            // Pass the full task object to the handler
            autoInputHandler(state.task)
                .then(responseMessage => {
                    // Check if still awaiting input *and* the task ID hasn't changed
                    // This prevents race conditions if the state changed rapidly or a new task started
                    if (responseMessage && state.status === 'awaiting-input' && state.task && state.task.id === state.task.id) {
                        console.log("useTaskLiaison Hook: Auto-input handler provided response.");
                        dispatch({ type: 'SEND_INPUT', payload: responseMessage });
                    } else if (!responseMessage) {
                        console.log("useTaskLiaison Hook: Auto-input handler returned null, manual input required.");
                    } else {
                        console.log("useTaskLiaison Hook: Auto-input response received, but state is no longer awaiting-input. Ignoring response.")
                    }
                })
                .catch((err) => {
                    console.error("useTaskLiaison Hook: Error in autoInputHandler:", err);
                    // Optionally dispatch an error action here if the handler fails critically
                    // dispatch({ type: 'ERROR', payload: new Error("Auto-input handler failed") });
                });
        }
    }, [state.status, state.task, autoInputHandler, dispatch]);

    // --- NEW Effect for Summary Generation ---
    useEffect(() => {
        let newSummary: TaskSummary;
            // If a task exists, use the provided summaryGenerator
        newSummary = summaryGenerator(state.task);
        dispatch({ type: 'UPDATE_SUMMARY', payload: newSummary });
    }, [state.task, state.status, summaryGenerator, dispatch]); // Depend on task, status, generator, and dispatch

    // --- Action Creators (remain the same) ---
    const startTask = useCallback((message: Message, taskId?: string) => {
        const id = taskId || uuid();
        console.log(`useTaskLiaison Hook: Dispatching START_TASK action for ID ${id}`);
        dispatch({ type: 'START_TASK', payload: { agentUrl, id, message } });
    }, [dispatch, agentUrl]);

    const sendInput = useCallback((message: Message) => {
        console.log("useTaskLiaison Hook: Dispatching SEND_INPUT action.");
        dispatch({ type: 'SEND_INPUT', payload: message });
    }, [dispatch]);

    const cancelTask = useCallback(() => {
        console.log("useTaskLiaison Hook: Dispatching CANCEL_TASK action.");
        dispatch({ type: 'CANCEL_TASK' });
    }, [dispatch]);

    const resumeTask = useCallback((taskId: string) => {
         console.log(`useTaskLiaison Hook: Dispatching RESUME_TASK action for ID ${taskId}`);
         dispatch({ type: 'RESUME_TASK', payload: { agentUrl, id: taskId } });
     }, [dispatch, agentUrl]);


    return {
        state, // State still includes summary, now updated via useEffect
        actions: { startTask, sendInput, cancelTask, resumeTask },
    };
}

// Default export if this is the primary export of the file
export default useTaskLiaison;

// src/hooks/useTaskLiaison.ts

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    A2AClient,
    A2AClientConfig,
    ClientManagedState as InternalClientState, // Rename for clarity
    TaskUpdatePayload,
    StatusUpdatePayload,
    ArtifactUpdatePayload,
    ErrorPayload,
    ClosePayload,
    ClientErrorContext,
    ClientCloseReason,
} from '@a2a/client/src/A2AClient';
import {
    Task,
    Message,
    JsonRpcError,
    TaskSendParams,
    TaskState,
    TextPart
} from '@a2a/client/src/types';

// --- Hook Configuration & Return Types ---

// Simplified state exposed by the hook
export type LiaisonClientStatus =
    | 'idle'
    | 'initializing' // Includes fetching card, determining strategy
    | 'connecting'   // Starting SSE or initial Poll
    | 'running'      // Connected SSE or actively Polling
    | 'awaiting-input'
    | 'reconnecting' // Only relevant for SSE
    | 'sending'      // Sending subsequent input
    | 'canceling'
    | 'completed'    // Task reached a final state (completed, canceled, failed)
    | 'error';

export interface LiaisonSummary {
    label: string;
    icon?: string;
    detail?: string;
}

export interface TaskLiaisonConfig {
    taskId?: string | null; // Task to resume
    agentUrl: string;
    initialParams?: TaskSendParams | null; // Params to auto-start a new task on mount
    getAuthHeaders?: () => Record<string, string> | Promise<Record<string, string>>; // Made optional
    autoInputHandler?: (question: Message) => Promise<Message | null>;
    summaryGenerator?: (task: Task | null) => LiaisonSummary;
    // Include relevant A2AClientConfig options to pass through
    forcePoll?: boolean;
    pollIntervalMs?: number;
    // ... other config options if needed
}

export interface TaskLiaisonResult {
    task: Task | null;
    summary: LiaisonSummary;
    questionForUser: Message | null;
    clientStatus: LiaisonClientStatus;
    error: Error | JsonRpcError | null;
    startTask: (params: Omit<TaskSendParams, 'id'>) => Promise<string | undefined>;
    sendInput: (message: Message) => Promise<void>;
    cancelTask: () => Promise<void>;
    taskId: string | null;
}

// --- Default Summary Generator ---

const defaultSummaryGenerator = (task: Task | null): LiaisonSummary => {
    if (!task) return { label: 'Idle' };
    switch (task.status.state) {
        case 'submitted': return { label: 'Submitted...', icon: '⏳' };
        case 'working': return { label: 'Working...', icon: '⏳' };
        case 'input-required': return { label: 'Input Required', icon: '❓' };
        case 'completed': return { label: 'Completed', icon: '✅' };
        case 'canceled': return { label: 'Canceled', icon: '❌' };
        case 'failed': return { label: 'Failed', icon: '🔥' };
        default: return { label: `Status: ${task.status.state}` };
    }
};

// --- The Hook ---

export function useTaskLiaison(config: TaskLiaisonConfig): TaskLiaisonResult {
    const {
        taskId: initialTaskId,
        agentUrl,
        initialParams,
        getAuthHeaders,
        autoInputHandler,
        summaryGenerator = defaultSummaryGenerator,
        ...clientConfigOptions // Rest are A2AClient options
    } = config;

    const clientRef = useRef<A2AClient | null>(null);
    const isMountedRef = useRef(true); // Track mount state for async operations

    // Internal state mirroring A2AClient events
    const [internalClientState, setInternalClientState] = useState<InternalClientState>('idle');
    const [task, setTask] = useState<Task | null>(null);
    const [error, setError] = useState<Error | JsonRpcError | null>(null);
    const [lastCloseReason, setLastCloseReason] = useState<ClientCloseReason | null>(null);
    const [managedTaskId, setManagedTaskId] = useState<string | null>(initialTaskId ?? null);

    // State derived for the hook consumer
    const [questionForUser, setQuestionForUser] = useState<Message | null>(null);

    // --- Client Lifecycle Management ---

    useEffect(() => {
        isMountedRef.current = true;
        let localClient: A2AClient | null = null; // Keep local ref for cleanup

        const initializeClient = async () => {
            if (!agentUrl) {
                console.error("useTaskLiaison: agentUrl is required.");
                if (isMountedRef.current) {
                    setError(new Error("Missing agentUrl in config."));
                    setInternalClientState('error');
                }
                return;
            }

            // Determine if resuming or starting
            const taskIdToUse = managedTaskId ?? initialTaskId; // Prefer state over initial prop after first run
            const shouldResume = !!taskIdToUse;
            const shouldStart = !shouldResume && !!initialParams;

            if (!shouldResume && !shouldStart) {
                console.log("useTaskLiaison: Idle - No taskId to resume and no initialParams to start.");
                if (isMountedRef.current) setInternalClientState('idle');
                return; // Do nothing if no action specified
            }

            const a2aConfig: Omit<A2AClientConfig, 'getAuthHeaders'> & { getAuthHeaders?: TaskLiaisonConfig['getAuthHeaders'] } = {
                agentEndpointUrl: agentUrl, // Pass explicitly
                ...clientConfigOptions, // Pass through other options
            };

            try {
                // Prepare auth function or default
                const finalGetAuth = getAuthHeaders ?? (async () => ({}));

                if (shouldResume && taskIdToUse) {
                    console.log(`useTaskLiaison: Resuming task ${taskIdToUse}...`);
                    if (isMountedRef.current) setInternalClientState('initializing');
                    localClient = await A2AClient.resume(agentUrl, taskIdToUse, { ...a2aConfig, getAuthHeaders: finalGetAuth });
                } else if (shouldStart && initialParams) {
                    console.log("useTaskLiaison: Starting task with initialParams...");
                    if (isMountedRef.current) setInternalClientState('initializing');
                    localClient = await A2AClient.create(agentUrl, initialParams, { ...a2aConfig, getAuthHeaders: finalGetAuth });
                    if (isMountedRef.current && localClient.taskId) {
                        setManagedTaskId(localClient.taskId);
                    }
                } else {
                    return; // Should not happen based on checks above
                }

                if (!isMountedRef.current) { // Check mount state *after* await
                    localClient?.close('closed-by-restart'); // Cleanup if unmounted during creation
                    return;
                }

                clientRef.current = localClient;

                // --- Register Listeners ---
                localClient.on('task-update', (payload: TaskUpdatePayload) => {
                    if (isMountedRef.current) setTask(payload.task);
                });
                localClient.on('status-update', (payload: StatusUpdatePayload) => {
                    if (!isMountedRef.current) return;
                    setInternalClientState(localClient?.getCurrentState() ?? 'error');
                    setTask(payload.task);

                    // Pass the raw message if input is required
                    if (payload.status.state === 'input-required') {
                        setQuestionForUser(payload.task.status.message ?? null);
                    } else {
                        setQuestionForUser(null);
                    }
                });
                 localClient.on('artifact-update', (payload: ArtifactUpdatePayload) => {
                     if (isMountedRef.current) setTask(payload.task); // Task object contains updated artifacts
                 });
                localClient.on('error', (payload: ErrorPayload) => {
                    console.error("useTaskLiaison: Received client error:", payload);
                    if (isMountedRef.current) {
                        setError(payload.error);
                        // Sync state, client might already be 'error' but call getCurrentState
                        setInternalClientState(localClient?.getCurrentState() ?? 'error');
                    }
                });
                localClient.on('close', (payload: ClosePayload) => {
                    console.log(`useTaskLiaison: Received client close: ${payload.reason}`);
                    if (isMountedRef.current) {
                        setInternalClientState(localClient?.getCurrentState() ?? 'closed');
                        setLastCloseReason(payload.reason);
                        setQuestionForUser(null); // Clear question on close
                        clientRef.current = null; // Release client instance ref
                    }
                });

                // Set initial state after registering listeners
                setInternalClientState(localClient.getCurrentState());
                setTask(localClient.getCurrentTask()); // Get initial task state if available after resume/create
                 // Check initial state immediately
                 const initialTaskState = localClient.getCurrentTask();
                 if (localClient.getCurrentState() === 'input-required') {
                    // Pass the raw message
                    setQuestionForUser(initialTaskState?.status.message ?? null);
                 }


            } catch (err: any) {
                console.error("useTaskLiaison: Error initializing client:", err);
                 if (isMountedRef.current) {
                     setError(err);
                     setInternalClientState('error');
                 }
            }
        };

        initializeClient();

        // Cleanup function
        return () => {
            isMountedRef.current = false;
            console.log("useTaskLiaison: Unmounting, closing client connection...");
            // Use the localClient captured at effect start for cleanup
            localClient?.close('closed-by-restart');
            clientRef.current = null;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        initialTaskId, // Re-run if the *initial* task ID prop changes
        agentUrl,
        // Do NOT include initialParams here - it's only for the very first init
        // Include other config options that might change how the client behaves if necessary
        autoInputHandler, // If handler logic changes, re-init
        clientConfigOptions.forcePoll,
        clientConfigOptions.pollIntervalMs,
    ]);

    // --- Automatic Input Handling ---
    const handleInputRequired = useCallback(async (question: Message) => {
        if (!autoInputHandler || !clientRef.current) {
            // No handler or client gone, expose question to user
            if (isMountedRef.current) setQuestionForUser(question);
            return;
        }

        // Clear previous question while auto-handler runs
        if (isMountedRef.current) setQuestionForUser(null);

        try {
            console.log("useTaskLiaison: Attempting auto-input handling...");
            const responseMessage = await autoInputHandler(question);

            if (!isMountedRef.current) return; // Check after await

            if (responseMessage) {
                console.log("useTaskLiaison: Auto-handler provided response, sending input...");
                setError(null); // Clear previous errors
                // State handled by sendInput calling _setState internally via client events
                await clientRef.current?.send(responseMessage);
                console.log("useTaskLiaison: Auto-input sent.");
            } else {
                // Auto-handler couldn't handle it, expose question
                console.log("useTaskLiaison: Auto-handler returned null, exposing question.");
                setQuestionForUser(question);
            }
        } catch (err: any) {
            console.error("useTaskLiaison: Error during auto-input handling or sending:", err);
            if (isMountedRef.current) {
                 setError(err);
                 setInternalClientState(clientRef.current?.getCurrentState() ?? 'error');
                 setQuestionForUser(question); // Re-expose question on error? Maybe.
            }
        }
    }, [autoInputHandler]);

    // --- Actions exposed by the hook ---

    const startTask = useCallback(async (params: Omit<TaskSendParams, 'id'>): Promise<string | undefined> => {
        if (clientRef.current) {
            console.warn("useTaskLiaison: Cannot start new task, client already active.");
            throw new Error("Client already managing a task.");
        }
        if (!agentUrl) {
             throw new Error("Missing agentUrl in config.");
        }

        console.log("useTaskLiaison: Starting new task via startTask action...");
        // Reset state before starting
        if (isMountedRef.current) {
            setInternalClientState('initializing');
            setTask(null);
            setError(null);
            setLastCloseReason(null);
            setQuestionForUser(null);
            setManagedTaskId(null); // Clear any previous managed ID
        }

        const finalGetAuth = getAuthHeaders ?? (async () => ({}));
        const a2aConfig: A2AClientConfig = {
            agentEndpointUrl: agentUrl,
            getAuthHeaders: finalGetAuth,
            ...clientConfigOptions,
        };

        try {
             // Explicitly create client *here* instead of relying on useEffect trigger
             // This makes startTask more imperative
            const newClient = await A2AClient.create(agentUrl, params, a2aConfig);
            if (!isMountedRef.current) {
                newClient.close('closed-by-restart');
                return undefined;
            }

            clientRef.current = newClient;
            const newTaskId = newClient.taskId;
            if (isMountedRef.current) setManagedTaskId(newTaskId);

            // Re-register listeners for the new client instance
            newClient.on('task-update', (payload: TaskUpdatePayload) => { if (isMountedRef.current) setTask(payload.task); });
            newClient.on('status-update', (payload: StatusUpdatePayload) => {
                 if (!isMountedRef.current) return;
                 setInternalClientState(newClient.getCurrentState());
                 setTask(payload.task);
                 // Pass the raw message if input is required
                 if (payload.status.state === 'input-required') {
                    setQuestionForUser(payload.task.status.message ?? null);
                 } else { setQuestionForUser(null); }
            });
            newClient.on('artifact-update', (payload: ArtifactUpdatePayload) => { if (isMountedRef.current) setTask(payload.task); });
            newClient.on('error', (payload: ErrorPayload) => { if (isMountedRef.current) { setError(payload.error); setInternalClientState(newClient.getCurrentState()); }});
            newClient.on('close', (payload: ClosePayload) => { if (isMountedRef.current) { setInternalClientState(newClient.getCurrentState()); setLastCloseReason(payload.reason); setQuestionForUser(null); clientRef.current = null; }});


            // Set initial state from new client
            if (isMountedRef.current) {
                 setInternalClientState(newClient.getCurrentState());
                 setTask(newClient.getCurrentTask());
                 // Check initial state immediately
                 if (newClient.getCurrentState() === 'input-required') {
                    // Pass the raw message
                    setQuestionForUser(newClient.getCurrentTask()?.status.message ?? null);
                 }
            }

            return newTaskId;

        } catch (err: any) {
            console.error("useTaskLiaison: Error in startTask action:", err);
             if (isMountedRef.current) {
                 setError(err);
                 setInternalClientState('error');
             }
             return undefined;
        }
    }, [agentUrl, clientConfigOptions, handleInputRequired]); // Dependencies for startTask - removed getAuthHeaders

    // This function now becomes the exported sendInput
    const sendInput = useCallback(async (message: Message) => {
        // Check message structure minimally (optional)
        if (!message || typeof message !== 'object' || !message.role || !Array.isArray(message.parts)) {
             console.error("useTaskLiaison: Invalid message object passed to sendInput.", message);
             throw new Error("Invalid message format provided to sendInput.");
         }

        if (!clientRef.current) {
            throw new Error("Cannot send input, client not active.");
        }
        const currentClientLibState = clientRef.current?.getCurrentState();
        if (currentClientLibState !== 'input-required') {
             console.warn(`useTaskLiaison: Sending input while client state is ${currentClientLibState}`);
        }
        console.log("useTaskLiaison: Sending input message...");
        if (isMountedRef.current) {
            setError(null);
            setQuestionForUser(null);
        }
        try {
            await clientRef.current.send(message);
            console.log("useTaskLiaison: Send input successful.");
            if (isMountedRef.current) {
                 setInternalClientState(clientRef.current?.getCurrentState() ?? internalClientState);
            }
        } catch (err: any) {
            console.error("useTaskLiaison: Error sending input:", err);
            if (isMountedRef.current) {
                setError(err);
                setInternalClientState(clientRef.current?.getCurrentState() ?? 'error');
            }
            // Re-throw or handle as needed - maybe just let error state reflect it
        }
    }, [internalClientState]); // Dependency remains internal state for now

    const cancelTask = useCallback(async () => {
        if (!clientRef.current) {
            console.warn("useTaskLiaison: Cannot cancel, client not active.");
            return;
        }
        console.log("useTaskLiaison: Canceling task...");
        if (isMountedRef.current) {
             // Optionally set 'canceling' state? A2AClient handles internal state.
             setQuestionForUser(null);
        }
        try {
            // A2AClient handles state transitions internally (will emit 'close')
            await clientRef.current.cancel();
            console.log("useTaskLiaison: Cancel request sent (client managing state).");
            // State update handled by the 'close' event listener
        } catch (err: any) {
            console.error("useTaskLiaison: Error canceling task:", err);
            if (isMountedRef.current) {
                 setError(err);
                 setInternalClientState(clientRef.current?.getCurrentState() ?? 'error'); // Reflect potential error state
            }
        }
    }, []);

    // --- Derived State ---

    const clientStatus = useMemo((): LiaisonClientStatus => {
        // Map internal A2AClient state to simplified hook status
        switch (internalClientState) {
            case 'idle': return 'idle';
            case 'initializing':
            case 'fetching-card':
            case 'determining-strategy':
                 return 'initializing';
            case 'starting-sse':
            case 'starting-poll':
                 return 'connecting';
            case 'connecting-sse': return 'connecting'; // Maybe map to 'running'? or keep connecting?
            case 'connected-sse':
            case 'polling':
                 return 'running';
            case 'reconnecting-sse':
            case 'retrying-poll': // Map retrying-poll to reconnecting?
                 return 'reconnecting';
            case 'sending': return 'sending';
            case 'canceling': return 'canceling';
            case 'input-required': return 'awaiting-input';
            case 'closed':
                 // If closed because task finished, return 'completed'
                 if (lastCloseReason === 'task-completed' || lastCloseReason === 'task-canceled-by-agent' || lastCloseReason === 'task-canceled-by-client' || lastCloseReason === 'task-failed') {
                     return 'completed';
                 }
                 return 'idle'; // Otherwise, treat other closes like idle (e.g., closed-by-caller)
            case 'error': return 'error';
            default: return 'idle'; // Should not happen
        }
    }, [internalClientState, lastCloseReason]);

    const summary = useMemo(() => {
        // Use custom generator if provided, otherwise default
        return summaryGenerator(task);
    }, [task, summaryGenerator]);

    // --- Return Value ---

    return {
        task,
        summary,
        questionForUser,
        clientStatus,
        error,
        startTask,
        sendInput, // Export sendInput again
        cancelTask,
        taskId: managedTaskId,
    };
}

import { A2AClient, A2AClientConfig, ClientCloseReason, ClientEventType, ClientManagedState, ErrorPayload, TaskUpdatePayload, ClosePayload, SimpleEventEmitter } from './A2AClient';
import * as A2ATypes from './types';
import type { TaskState as A2ATaskState, Message, Task as A2ATask, Part as A2APart, TextPart as A2ATextPart } from './types'; // Use aliases

// Simple EventEmitter - reuse or import a shared one
type Listener = (...args: any[]) => void;

// Removed UserFacingSummaryView - No longer managed by Liaison

export type TaskLiaisonState =
    | 'idle'             // No active client/task
    | 'starting'         // A2AClient.create called, waiting for initial state
    | 'running'          // Task is active (polling/sse connected)
    | 'awaiting-input'   // Waiting for strategy *or* external response via waitForUserResponse
    | 'sending-input'    // Input received, calling client.send
    | 'canceling'        // Cancel requested
    | 'closed'           // Task completed, canceled, or closed by user
    | 'error';           // Liaison or Client encountered an error

// Simplified Snapshot - No specific view structures managed here
export interface TaskLiaisonSnapshot {
    taskId: string | null;
    task: A2ATask | null;      // Latest known full task state from client
    liaisonState: TaskLiaisonState; // Current state of the liaison itself
    clientState: ClientManagedState | null; // Underlying client state
    lastError: Error | A2ATypes.JsonRpcError | null;
    closeReason?: ClientCloseReason | null; // Added close reason
}

// --- Removed Strategy Types ---

// --- Configuration Interface (Simplified) --- 
export interface TaskLiaisonConfig {
    // No view-related config needed anymore
}

// --- Internal Listener Types for onTransition ---
type TransitionListener = (prevSnapshot: TaskLiaisonSnapshot | null, currentSnapshot: TaskLiaisonSnapshot) => void;
type FilterFunction = (prevSnapshot: TaskLiaisonSnapshot | null, currentSnapshot: TaskLiaisonSnapshot) => boolean;
interface ListenerRecord {
    listener: TransitionListener;
    filter?: FilterFunction;
}


// --- TaskLiaison Class (Simplified Generics) --- 

export class TaskLiaison { // Removed <TSummaryView, TPromptView>

    // --- Core State ---
    private client: A2AClient | null = null;
    private taskId: string | null = null;
    private _liaisonState: TaskLiaisonState = 'idle';
    private _lastError: Error | A2ATypes.JsonRpcError | null = null;
    // Removed _summaryView and _promptView
    private _closeReason: ClientCloseReason | null = null;
    // Emitter now handles 'transition' events
    private _emitter = new SimpleEventEmitter(); 
    private _previousA2ATaskState: A2ATaskState | null = null;
    // Store previous snapshot for onTransition
    private _previousSnapshot: TaskLiaisonSnapshot | null = null; 
    // Store listeners for onTransition
    private _transitionListeners: Map<TransitionListener, ListenerRecord> = new Map();


    // --- Removed Strategies ---

    // Bound listener references for easy add/remove
    private readonly _boundHandleTaskUpdate: (payload: TaskUpdatePayload) => void;
    private readonly _boundHandleError: (payload: ErrorPayload) => void;
    private readonly _boundHandleClose: (payload: ClosePayload) => void;

    /**
     * Creates a TaskLiaison instance.
     * @param config Configuration object for the liaison (currently empty).
     */
    constructor(config?: TaskLiaisonConfig) { // Config is now optional and empty
        // No view strategies or initial view to process
        // this.on("change", () => this._callSummaryViewUpdateStrategy()); // Removed strategy call

        // Bind handlers
        this._boundHandleTaskUpdate = this._handleTaskUpdate.bind(this);
        this._boundHandleError = this._handleError.bind(this);
        this._boundHandleClose = this._handleClose.bind(this);
        
        // Initialize previous snapshot
        this._previousSnapshot = null; 
        // Emit initial state transition
        this._updateLiaisonStateAndEmit('idle'); 
    }

    // --- Public API ---

    /**
     * Starts a new A2A task by creating and managing an A2AClient.
     * @param initialParams Parameters for the first tasks/send or tasks/sendSubscribe call.
     * @param config Configuration for the underlying A2AClient.
     * @returns Promise resolving when the client creation is initiated.
     */
    public async startTask(
        initialParams: A2ATypes.TaskSendParams,
        config: A2AClientConfig
    ): Promise<void> {
        console.log('TaskLiaison.startTask called');
        if (this.client || this._liaisonState !== 'idle') {
            console.warn('TaskLiaison.startTask called while already active. Closing existing task first.');
            await this.closeTask('closed-by-restart'); // Wait for close completion
        }
        
        this._resetInternalState(); // Reset before starting a new task
        this._updateLiaisonStateAndEmit('starting');

        try {
            const mergedConfig = { 
                 pollIntervalMs: 5000, 
                 ...config 
             };

            this.client = await A2AClient.create(initialParams, mergedConfig);
            this.taskId = this.client.taskId;
            console.log(`TaskLiaison.startTask: A2AClient created with taskId: ${this.taskId}`);

            this._registerClientListeners();

            this._updateLiaisonStateAndEmit('starting', { 
                taskId: this.taskId, 
                clientState: this.client.getCurrentState() 
            });

        } catch (error: any) {
            console.error('TaskLiaison.startTask: Error creating A2AClient:', error);
            this._handleErrorAndSetState(error, 'error-fatal'); // Map to valid reason
        }
    }

    /**
     * Requests cancellation of the active task via the A2AClient.
     */
    public async cancelTask(): Promise<void> {
        console.log('TaskLiaison.cancelTask called');
        const currentState = this._liaisonState;
        if (!this.client || currentState === 'closed' || currentState === 'canceling' || currentState === 'error') {
            console.warn(`TaskLiaison.cancelTask: Cannot cancel in state ${currentState} or without client.`);
            return;
        }

        // No prompt view to clear
        this._updateLiaisonStateAndEmit('canceling');
        try {
            await this.client.cancel();
            // Close event from client will handle final state
        } catch (err: any) {
            this._handleErrorAndSetState(err, 'error-fatal'); // Map to valid reason
        }
    }

    /**
     * Closes the connection and cleans up resources, optionally providing a reason.
     */
    public async closeTask(reason: ClientCloseReason = 'closed-by-caller'): Promise<void> {
        console.log(`TaskLiaison.closeTask called with reason: ${reason}`);
        await this._closeClient(reason);
    }

    /**
     * Gets a snapshot of the current state of the liaison and the underlying task/client.
     */
    public getCurrentSnapshot(): TaskLiaisonSnapshot { // Removed generics
        return {
            taskId: this.taskId,
            task: this.client?.getCurrentTask() ?? null,
            liaisonState: this._liaisonState,
            clientState: this.client?.getCurrentState() ?? null,
            lastError: this._lastError,
            // Removed summaryView and promptView
            closeReason: this._closeReason,
        };
    }

    /** 
     * Provides the user's input response when the liaison is in the 'awaiting-input' state.
     * @param responseMessage The A2A message containing the user's response.
     */
    public async provideInput(responseMessage: Message): Promise<void> {
        console.log('TaskLiaison.provideInput called');
        if (this._liaisonState !== 'awaiting-input') {
            console.error(`TaskLiaison.provideInput called in invalid state: ${this._liaisonState}. Input ignored.`);
            throw new Error(`Cannot provide input when liaison state is not 'awaiting-input' (currently ${this._liaisonState}).`);
        }
        if (!this.client) {
             console.error("TaskLiaison.provideInput: Client is null. Cannot send.");
             this._handleErrorAndSetState(new Error("Cannot provide input: A2A client is not available."), 'error-fatal'); // Map to valid reason
             return; 
        }

        try {
            this._updateLiaisonStateAndEmit('sending-input');
            // No prompt view to clear
            await this.client.send(responseMessage);
             console.log('TaskLiaison: client.send called successfully for input response.');
            // State transitions out of 'sending-input' will be handled by _handleTaskUpdate
        } catch (error: any) {
            console.error('TaskLiaison: Error calling client.send in provideInput:', error);
             this._handleErrorAndSetState(error, 'error-fatal'); // Map to valid reason
        }
    }

    /** 
     * Registers a listener for state transitions.
     * @param listener Function to call on transition: (prevSnapshot | null, currentSnapshot) => void
     * @param filter Optional function to filter transitions: (prevSnapshot | null, currentSnapshot) => boolean
     */
    public onTransition(listener: TransitionListener, filter?: FilterFunction): void {
         console.log("TaskLiaison: Adding transition listener", listener, filter);
         // Store the record including the filter
         const record: ListenerRecord = { listener, filter };
         this._transitionListeners.set(listener, record);
         // Optionally, immediately call the listener with (null, currentSnapshot) 
         // if it passes the filter, so it gets the initial state?
         // const current = this.getCurrentSnapshot();
         // if (!filter || filter(null, current)) {
         //    try { listener(null, current); } catch (e) { console.error("Error in initial onTransition call:", e); }
         // }
    }

    /** Removes a previously registered transition listener. */
    public offTransition(listener: TransitionListener): void {
         console.log("TaskLiaison: Removing transition listener", listener);
         this._transitionListeners.delete(listener);
    }
    
    // --- Internal Event Handlers ---

    private _registerClientListeners(): void {
        if (!this.client) return;
        console.log('TaskLiaison: Registering A2AClient listeners');
        this.client.on('task-update', this._boundHandleTaskUpdate);
        this.client.on('error', this._boundHandleError);
        this.client.on('close', this._boundHandleClose);
    }

    private _unregisterClientListeners(): void {
        if (!this.client) return;
        console.log('TaskLiaison: Unregistering A2AClient listeners');
        this.client.off('task-update', this._boundHandleTaskUpdate);
        this.client.off('error', this._boundHandleError);
        this.client.off('close', this._boundHandleClose);
    }

    private async _handleTaskUpdate(payload: TaskUpdatePayload): Promise<void> {
        const newTask = payload.task;
        const newAgentState = newTask.status.state;
        this._previousA2ATaskState = this.getCurrentSnapshot().task?.status?.state ?? null; // Get previous from snapshot

        console.log(`TaskLiaison._handleTaskUpdate: Agent State: ${newAgentState}, Prev Agent State: ${this._previousA2ATaskState}, Liaison State: ${this._liaisonState}`);
        if (this._liaisonState === 'closed' || this._liaisonState === 'error') return;

        // --- Handle state transitions --- 
        if (newAgentState === 'input-required' && this._liaisonState !== 'awaiting-input' && this._liaisonState !== 'sending-input') {
            const requiredPrompt = newTask.status.message ?? { role: 'agent', parts: [{ type: 'text', text: 'Input required' }] };
             
            // 1. Update liaison state to awaiting-input and emit (this triggers onTransition)
            this._updateLiaisonStateAndEmit('awaiting-input', { task: newTask }); 

            // 2. Call the Prompt Strategy equivalent for onTransition listeners
            //    We pass the raw prompt message here. Consumers listening to onTransition
            //    can filter for this state change and use the prompt from the snapshot.
            //    No separate prompt strategy concept needed anymore.
            console.log('TaskLiaison: Now in awaiting-input state. Raw prompt was:', requiredPrompt);
            // STOP - Wait for external call to provideInput

        } else if (newAgentState !== 'input-required' && (this._liaisonState === 'awaiting-input' || this._liaisonState === 'sending-input')) {
             console.log(`TaskLiaison: Task state (${newAgentState}) moved out of input-required while liaison was in ${this._liaisonState}. Resetting state.`);
             // No prompt view to clear
             this._updateLiaisonStateAndEmit('running', { task: newTask });
        } else if (this._liaisonState === 'starting' || this._liaisonState === 'sending-input') {
             this._updateLiaisonStateAndEmit('running', { task: newTask });
        } else if (this._liaisonState === 'running') {
             this._updateLiaisonStateAndEmit(this._liaisonState, { task: newTask }); // Emit update even if liaison state same
        }
    }

    private _handleError(payload: ErrorPayload): void {
        console.error(`TaskLiaison._handleError: Received error from A2AClient (Task: ${this.taskId || 'N/A'}):`, payload.error);
        if (this._liaisonState === 'closed' || this._liaisonState === 'error') return; 
        this._handleErrorAndSetState(payload.error, 'error-fatal');
    }

    private _handleClose(payload: ClosePayload): void {
        console.log(`TaskLiaison._handleClose: Received close from A2AClient with reason: ${payload.reason}`);
        if (this._liaisonState === 'closed' || this._liaisonState === 'error') return; 
        this._closeClient(payload.reason, false); 
    }

    // Centralized helper to update error state and potentially close client
    private _handleErrorAndSetState(error: Error | A2ATypes.JsonRpcError, reason: ClientCloseReason = 'error-fatal'): void {
        if (this._liaisonState === 'closed' || this._liaisonState === 'error') return;
        this._lastError = error;
        // No prompt view to clear
        this._updateLiaisonStateAndEmit('error', { lastError: error }); // Ensure error is in emitted snapshot
        // Don't await close here, let it happen
        this._closeClient(reason, false); 
    }

    // Update liaison state and emit transition event
    private _updateLiaisonStateAndEmit(newState: TaskLiaisonState, updates: Partial<Omit<TaskLiaisonSnapshot, 'liaisonState'>> = {}): void {
        const previousState = this._liaisonState;
        const previousSnapshot = this._previousSnapshot; // Capture before modifying state
        
        // Apply direct updates (taskId, lastError, closeReason)
        // task and clientState are derived in getCurrentSnapshot based on this.client
        if (updates.taskId !== undefined) this.taskId = updates.taskId;
        if (updates.lastError !== undefined) this._lastError = updates.lastError;
        if (updates.closeReason !== undefined) this._closeReason = updates.closeReason;

        // Update the core state *after* applying other direct updates
        this._liaisonState = newState;

        const currentSnapshot = this.getCurrentSnapshot();

        // Avoid emitting if nothing substantial changed (optional optimization)
        // if (previousState === newState && JSON.stringify(previousSnapshot) === JSON.stringify(currentSnapshot)) {
        //      return; 
        // }
        
        console.log(`TaskLiaison: State change ${previousState} -> ${newState}`);
        this._emitTransition(previousSnapshot, currentSnapshot); 

        // Update the stored previous snapshot *after* emitting
        this._previousSnapshot = currentSnapshot;
    }

    // Emit the transition event
    private _emitTransition(prevSnapshot: TaskLiaisonSnapshot | null, currentSnapshot: TaskLiaisonSnapshot): void {
        console.log("TaskLiaison: Emitting transition event with snapshots:", prevSnapshot, currentSnapshot);
        // Use the stored map of listeners
        this._transitionListeners.forEach((record) => {
            if (!record.filter || record.filter(prevSnapshot, currentSnapshot)) {
                try {
                    record.listener(prevSnapshot, currentSnapshot);
                } catch (e) {
                    console.error("TaskLiaison: Error in transition listener:", e);
                }
            }
        });
    }
    
    private async _closeClient(reason: ClientCloseReason = 'closed-by-caller', callClientClose: boolean = true): Promise<void> {
        console.log(`TaskLiaison._closeClient: Closing client (Reason: ${reason}, Call Client Close: ${callClientClose})`);
        const clientToClose = this.client; 
        const stateBeforeClose = this._liaisonState;

        if (stateBeforeClose === 'closed') return; // Already closed

        this._unregisterClientListeners(); 
        
        // No prompt view to clear

        let clientCloseError: Error | null = null;
        if (callClientClose && clientToClose) {
            try {
                await clientToClose.close(reason); 
            } catch (err: any) {
                 clientCloseError = err as Error; 
                 console.error(`TaskLiaison._closeClient: Error during client.close():`, clientCloseError);
                 // Set error state only if we weren't already erroring
                 if (!this._lastError && stateBeforeClose !== 'error') {
                    this._lastError = clientCloseError; 
                    // Force state to error if closing failed unexpectedly? Or stick with original reason?
                    // Let's stick with the original reason for now, but log the error.
                 }
             }
        }
        
        // Set final state details
        this._closeReason = reason;
        const finalState = (stateBeforeClose === 'error' || this._lastError) ? 'error' : 'closed';
        
        // Emit final state transition
        this._updateLiaisonStateAndEmit(finalState, { closeReason: this._closeReason, lastError: this._lastError });
        
        // Nullify the client *after* emitting the final snapshot
        this.client = null; 
    }

    private _resetInternalState(): void {
         console.log("TaskLiaison: Resetting internal state for new task.");
         // Don't reset the emitter or listeners
         this.client = null; 
         this.taskId = null;
         this._liaisonState = 'idle'; // Start from idle
         this._lastError = null;
         this._closeReason = null;
         this._previousA2ATaskState = null;
         this._previousSnapshot = null; // Reset previous snapshot
         // Don't remove listeners between tasks
    }
}

// No default strategies needed anymore
import { A2AClient, A2AClientConfig, ClientCloseReason, ClientEventType, ClientManagedState, ErrorPayload, TaskUpdatePayload, ClosePayload, SimpleEventEmitter } from './A2AClient';
import * as A2ATypes from './types';
import type { TaskState as A2ATaskState, Message, Task as A2ATask, Part as A2APart, TextPart as A2ATextPart } from './types'; // Use aliases

// Simple EventEmitter - reuse or import a shared one
type Listener = (...args: any[]) => void;

/** Example base interface for the user-facing representation */
export interface UserFacingSummaryView {
    icon?: string;  // e.g., material icon name
    label: string;  // Primary display text
    detail?: string; // Secondary display text
    // Add other app-specific view properties as needed
    // e.g., statusColor?: string; progress?: number;
}

export type TaskLiaisonState =
    | 'idle'             // No active client/task
    | 'starting'         // A2AClient.create called, waiting for initial state
    | 'running'          // Task is active (polling/sse connected)
    | 'awaiting-input'   // Waiting for strategy *or* external response via waitForUserResponse
    | 'sending-input'    // Input received, calling client.send
    | 'canceling'        // Cancel requested
    | 'closed'           // Task completed, canceled, or closed by user
    | 'error';           // Liaison or Client encountered an error

export interface TaskLiaisonSnapshot<TSummaryView extends UserFacingSummaryView, TPromptView = any> {
    taskId: string | null;
    task: A2ATask | null;      // Latest known full task state from client
    liaisonState: TaskLiaisonState; // Current state of the liaison itself
    clientState: ClientManagedState | null; // Underlying client state
    lastError: Error | A2ATypes.JsonRpcError | null;
    summaryView: TSummaryView; // The current user-facing view
    promptView: TPromptView | null; // Added for prompt-specific UI state
    closeReason?: ClientCloseReason | null; // Added close reason
}

// --- Strategy Types (Return void, call setters) ---
export type SummaryViewStrategy<TSummaryView extends UserFacingSummaryView, TPromptView = any> = 
    (liaison: TaskLiaison<TSummaryView, TPromptView>, snapshot: TaskLiaisonSnapshot<TSummaryView, TPromptView>) => void; // Returns void

export type PromptViewStrategy<TSummaryView extends UserFacingSummaryView, TPromptView = any> = 
    (liaison: TaskLiaison<TSummaryView, TPromptView>, prompt: Message | null) => void; // Returns void

// --- Configuration Interface --- 
export interface TaskLiaisonConfig<TSummaryView extends UserFacingSummaryView, TPromptView = any> {
    /** Optional: The initial state for the main user-facing view. Defaults will be used if omitted. */
    initialSummaryView?: TSummaryView; 
    /** Optional: Strategy to update the summary view based on task state. Defaults will be used if omitted. */
    updateSummaryViewStrategy?: SummaryViewStrategy<TSummaryView, TPromptView>;
    /** Optional: Strategy to update the prompt view based on task state or input. Defaults will be used if omitted. */
    updatePromptViewStrategy?: PromptViewStrategy<TSummaryView, TPromptView>;
}

// --- TaskLiaison Class --- 

export class TaskLiaison<TSummaryView extends UserFacingSummaryView, TPromptView = any> {

    // --- Core State ---
    private client: A2AClient | null = null;
    private taskId: string | null = null;
    private _liaisonState: TaskLiaisonState = 'idle';
    private _lastError: Error | A2ATypes.JsonRpcError | null = null;
    private _summaryView: TSummaryView;
    private _promptView: TPromptView | null = null;
    private _closeReason: ClientCloseReason | null = null;
    public _emitter = new SimpleEventEmitter();
    private _previousA2ATaskState: A2ATaskState | null = null;

    // Strategies provided by consumer or defaults
    private readonly updateSummaryViewStrategy: SummaryViewStrategy<TSummaryView, TPromptView>;
    private readonly updatePromptViewStrategy: PromptViewStrategy<TSummaryView, TPromptView>;

    // Bound listener references for easy add/remove
    private readonly _boundHandleTaskUpdate: (payload: TaskUpdatePayload) => void;
    private readonly _boundHandleError: (payload: ErrorPayload) => void;
    private readonly _boundHandleClose: (payload: ClosePayload) => void; // Use ClosePayload from A2AClient

    /**
     * Creates a TaskLiaison instance.
     * @param config Configuration object for the liaison.
     */
    constructor(config: TaskLiaisonConfig<TSummaryView, TPromptView>) {
        // Destructure config with defaults where applicable
        const {
            initialSummaryView,
            updateSummaryViewStrategy,
            updatePromptViewStrategy
        } = config;
        
        this._summaryView = initialSummaryView ?? createDefaultSummaryView("Task", "Initializing...") as TSummaryView;
        if (!this._summaryView) { 
            throw new Error("Failed to initialize summary view.");
        }
        
        // Assign provided strategies or defaults
        this.updateSummaryViewStrategy = updateSummaryViewStrategy ?? this._defaultUpdateSummaryViewStrategy;
        this.updatePromptViewStrategy = updatePromptViewStrategy ?? this._defaultUpdatePromptViewStrategy;
        this.on("change", () => this._callSummaryViewUpdateStrategy());

        // Bind handlers
        this._boundHandleTaskUpdate = this._handleTaskUpdate.bind(this);
        this._boundHandleError = this._handleError.bind(this);
        this._boundHandleClose = this._handleClose.bind(this);
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
        
        // Reset state before starting
        // this._resetInternalState();
        this._updateLiaisonStateAndEmit('starting');

        try {
            // Add config defaults if needed
            const mergedConfig = { 
                 pollIntervalMs: 5000, // Example default
                 ...config 
             };

            this.client = await A2AClient.create(initialParams, mergedConfig);
            this.taskId = this.client.taskId;
            console.log(`TaskLiaison.startTask: A2AClient created with taskId: ${this.taskId}`);

            this._registerClientListeners();

            // Emit 'starting' again with taskId and client state
            this._updateLiaisonStateAndEmit('starting', { 
                taskId: this.taskId, 
                clientState: this.client.getCurrentState() 
            });

        } catch (error: any) {
            console.error('TaskLiaison.startTask: Error creating A2AClient:', error);
            this._lastError = error;
            this.client = null; // Ensure client is null on failure
            this.taskId = null;
            // Emit 'error' state AFTER resetting internal state
            // this._resetInternalState(); 
            this._updateLiaisonStateAndEmit('error'); 
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

        this.updatePromptViewStrategy(this, null); 
        this._updateLiaisonStateAndEmit('canceling');
        try {
            await this.client.cancel();
        } catch (err: any) {
            this._handleErrorAndSetState(err); 
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
    public getCurrentSnapshot(): TaskLiaisonSnapshot<TSummaryView, TPromptView> {
        return {
            taskId: this.taskId,
            task: this.client?.getCurrentTask() ?? null,
            liaisonState: this._liaisonState,
            clientState: this.client?.getCurrentState() ?? null,
            lastError: this._lastError,
            summaryView: this._summaryView,
            promptView: this._promptView,
            closeReason: this._closeReason,
        };
    }

    /** Sets the summary view data. Called by the SummaryViewStrategy. */
    public setSummaryView(view: TSummaryView): void {
        // Simple equality check, consider deep comparison for complex views
        if (JSON.stringify(this._summaryView) !== JSON.stringify(view)) { 
            console.log('TaskLiaison.setSummaryView updated.');
            this._summaryView = view;
            this._emitChange(); // Emit change whenever view is updated
        }
    }

    /** Sets the prompt-specific view data. Called by PromptViewStrategy. */
    public setPromptView(view: TPromptView | null): void {
        if (JSON.stringify(this._promptView) !== JSON.stringify(view)) { 
            console.log('TaskLiaison.setPromptView called with:', view);
            this._promptView = view;
            this._emitChange(); // Emit change whenever view is updated
        }
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
             this._handleErrorAndSetState(new Error("Cannot provide input: A2A client is not available."));
             return; 
        }

        try {
            // Update state *before* sending
            this._updateLiaisonStateAndEmit('sending-input');
            // Clear the prompt view *after* successfully initiating send
            this.updatePromptViewStrategy(this, null); 
            await this.client.send(responseMessage);
             console.log('TaskLiaison: client.send called successfully for input response.');
            // Subsequent task-update/close events will handle state changes out of sending-input
        } catch (error: any) {
            console.error('TaskLiaison: Error calling client.send in provideInput:', error);
            // If send fails, revert state? Or go straight to error?
            // Let's go to error state for clarity.
             this.updatePromptViewStrategy(this, null); // Ensure prompt view is cleared
             this._handleErrorAndSetState(error);
        }
    }

    /** Registers a listener for the liaison's 'change' event. */
    public on(event: 'change', listener: (snapshot: TaskLiaisonSnapshot<TSummaryView, TPromptView>) => void): void {
        console.log("TaskLiaison: Adding change listener", listener);
        this._emitter.on(event, listener);
    }

    /** Removes a listener for the liaison's 'change' event. */
    public off(event: 'change', listener: (snapshot: TaskLiaisonSnapshot<TSummaryView, TPromptView>) => void): void {
        this._emitter.off(event, listener);
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
        const previousAgentState = this._previousA2ATaskState;
        this._previousA2ATaskState = newAgentState;

        console.log(`TaskLiaison._handleTaskUpdate: Agent State: ${newAgentState}, Prev Agent State: ${previousAgentState}, Liaison State: ${this._liaisonState}`);
        if (this._liaisonState === 'closed' || this._liaisonState === 'error') return;

        // --- Handle state transitions --- 
        if (newAgentState === 'input-required' && this._liaisonState !== 'awaiting-input' && this._liaisonState !== 'sending-input') {
            const requiredPrompt = newTask.status.message ?? { role: 'agent', parts: [{ type: 'text', text: 'Input required' }] };

             // 1. Call prompt view strategy to set prompt UI
            this.updatePromptViewStrategy(this, requiredPrompt); 
             
            // 2. Update liaison state to awaiting-input and emit
            this._updateLiaisonStateAndEmit('awaiting-input', { task: newTask }); 

           // 3. STOP - Wait for external call to provideInput
            console.log('TaskLiaison: Now in awaiting-input state.');

        } else if (newAgentState !== 'input-required' && (this._liaisonState === 'awaiting-input' || this._liaisonState === 'sending-input')) {
            // Task moved out of input-required state (e.g. server timed out, or maybe input was provided just before this update)
             console.log(`TaskLiaison: Task state (${newAgentState}) moved out of input-required while liaison was in ${this._liaisonState}. Resetting prompt/state.`);
             this.updatePromptViewStrategy(this, null); // Clear prompt view
             this._updateLiaisonStateAndEmit('running', { task: newTask });
        } else if (this._liaisonState === 'starting' || this._liaisonState === 'sending-input') {
             // Transition to running after starting or sending input completes
             this._updateLiaisonStateAndEmit('running', { task: newTask });
        } else if (this._liaisonState === 'running') {
             this._emitChange(); // Emit change as summary view might have updated
        }
    }

    private _handleError(payload: ErrorPayload): void {
        // Use this.taskId if available, payload doesn't have it directly
        console.error(`TaskLiaison._handleError: Received error from A2AClient (Task: ${this.taskId || 'N/A'}):`, payload.error);
        if (this._liaisonState === 'closed' || this._liaisonState === 'error') return; 
        
        // Call centralized handler which will reject completer
        this._handleErrorAndSetState(payload.error, 'error-fatal');
    }

    private _handleClose(payload: ClosePayload): void {
        console.log(`TaskLiaison._handleClose: Received close from A2AClient with reason: ${payload.reason}`);
        if (this._liaisonState === 'closed' || this._liaisonState === 'error') return; 
        
        // Call closeClient which handles rejecting completer
        this._closeClient(payload.reason, false); 
    }

    // --- Internal Helpers ---

    private _callSummaryViewUpdateStrategy(): void {
        try {
            this.updateSummaryViewStrategy(this, this.getCurrentSnapshot());
        } catch (err: any) {
             console.error("TaskLiaison: Error executing updateSummaryViewStrategy:", err);
             // Decide how to handle strategy errors - log? set error state?
             // For now, just log it.
        }
    }

    // Centralized helper to update error state and potentially close client
    private _handleErrorAndSetState(error: Error | A2ATypes.JsonRpcError, reason: ClientCloseReason = 'error-fatal'): void {
        if (this._liaisonState === 'closed' || this._liaisonState === 'error') return;
        this._lastError = error;
        this.updatePromptViewStrategy(this, null); 
        this._updateLiaisonStateAndEmit('error');
        this._closeClient(reason, false); 
    }

    // Update liaison state and emit change
    private _updateLiaisonStateAndEmit(newState: TaskLiaisonState, updates: Partial<Omit<TaskLiaisonSnapshot<TSummaryView, TPromptView>, 'liaisonState' | 'summaryView' | 'promptView'>> = {}): void {
        const previousState = this._liaisonState;
        if (previousState === newState && !Object.keys(updates).length) {
             return; // No state change and no other snapshot updates
        }
        
        this._liaisonState = newState;
        // Apply direct updates (taskId, clientState, lastError, closeReason)
        if (updates.taskId !== undefined) this.taskId = updates.taskId;
        // Note: clientState is derived in getCurrentSnapshot
        if (updates.lastError !== undefined) this._lastError = updates.lastError;
        if (updates.closeReason !== undefined) this._closeReason = updates.closeReason;

        console.log(`TaskLiaison: State change ${previousState} -> ${newState}`);
        this._emitChange(); // Emit change whenever state or core fields change
    }

    // Emit the change event
    private _emitChange(): void {
        console.log("TaskLiaison: Emitting change event with snapshot:", this.getCurrentSnapshot(), this._emitter);
         this._emitter.emit('change', this.getCurrentSnapshot());
    }
    
    private async _closeClient(reason: ClientCloseReason = 'closed-by-caller', callClientClose: boolean = true): Promise<void> {
        console.log(`TaskLiaison._closeClient: Closing client (Reason: ${reason}, Call Client Close: ${callClientClose})`);
        const clientToClose = this.client; 

        this._unregisterClientListeners(); 
        
        this.updatePromptViewStrategy(this, null); // Clear prompt view

        // Set state before potentially closing client
        this._closeReason = reason;
        this._liaisonState = 'closed'; 

        let clientCloseError: Error | null = null;
        if (callClientClose && clientToClose) {
            try {
                await clientToClose.close(reason); 
            } catch (err: any) {
                 clientCloseError = err as Error; 
                 if (!this._lastError) this._lastError = clientCloseError; 
             }
        }
        // Emit final state
        this._updateLiaisonStateAndEmit('closed', { closeReason: this._closeReason, lastError: this._lastError });
    }

    private _resetInternalState(): void {
         console.log("TaskLiaison: Resetting internal state.");
         // Keep initialSummaryView
         this.client = null; // IMPORTANT: Still nullify client when resetting for a NEW task
         this.taskId = null;
         this._liaisonState = 'idle';
         this._lastError = null;
         this._promptView = null;
         this._closeReason = null;
         this._previousA2ATaskState = null;
         this._emitter.removeAllListeners('change'); 
    }

    // --- Default Strategies --- 
    private _defaultUpdateSummaryViewStrategy(liaison: TaskLiaison<TSummaryView, TPromptView>, snapshot: TaskLiaisonSnapshot<TSummaryView, TPromptView>): void {
        const task = snapshot.task;
        const currentView = snapshot.summaryView;
        if (!task) {
             liaison.setSummaryView({ ...currentView, label: 'No Task', detail: '' } as TSummaryView); // Use setter
             return;
        }

        let label = currentView.label; 
        let detail: string = currentView.detail ?? ''; 
        const getMessageText = (message: Message | undefined | null): string | undefined => {
             return message?.parts?.find((p): p is A2ATextPart => p.type === 'text')?.text;
        };

        switch (task.status.state) {
            case 'submitted': label = 'Submitting...'; detail = ''; break;
            case 'working': label = 'Working...'; detail = ''; break; 
            case 'input-required': label = 'Action Required'; detail = getMessageText(task.status.message) ?? 'Provide input'; break;
            case 'completed': label = 'Completed'; detail = 'Task finished successfully.'; break;
            case 'failed': label = 'Failed'; detail = getMessageText(task.status.message) ?? 'Task failed.'; break;
            case 'canceled': label = 'Canceled'; detail = 'Task was canceled.'; break;
            // Keep a default case for safety, though all states should be covered
            default: detail = task.status.state; break;
        }
        // Use setter only if changed
        if (label !== currentView.label || detail !== currentView.detail) {
            liaison.setSummaryView({ ...currentView, label, detail } as TSummaryView);
        }
    }

     private _defaultUpdatePromptViewStrategy(liaison: TaskLiaison<TSummaryView, TPromptView>, prompt: Message | null): void {
         // Default strategy just wraps the prompt message or sets null
         // A real app might parse the prompt or generate UI elements
         console.log("TaskLiaison: Updating prompt view with:", prompt);
         const newPromptView = prompt ? { promptMessage: prompt } : null;
         liaison.setPromptView(newPromptView as TPromptView | null); // Use setter
     }
}

// Helper function to create a default summary view
export function createDefaultSummaryView(label: string = "Task", detail: string = "", icon?: string): UserFacingSummaryView {
    return { label, detail, icon };
} 
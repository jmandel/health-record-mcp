import * as A2ATypes from './types';
import type { Task, TaskSendParams, TaskGetParams, TaskCancelParams, TaskStatus, TaskState, Artifact, Message, JsonRpcError, TaskSubscribeParams, TaskResubscribeParams, TaskStatusUpdateEvent, TaskArtifactUpdateEvent } from './types';
import { deepEqual } from './utils'; // Import the utility

// Simple EventEmitter - replace with a library like 'mitt' or 'eventemitter3' in a real implementation
type Listener = (...args: any[]) => void;


// --- Configuration ---
export interface A2AClientConfig {
    // REQUIRED: The base URL of the A2A agent server.
    // This is passed separately to the constructor/factory methods, but included here
    // for completeness and potential internal use within config merging.
    agentEndpointUrl: string;
    getAuthHeaders: () => Record<string, string> | Promise<Record<string, string>>;
    agentCardUrl?: string; // Optional: Defaults to endpoint + /.well-known/agent.json
    forcePoll?: boolean; // Default: false
    pollIntervalMs?: number; // Default: 2000
    sseMaxReconnectAttempts?: number; // Default: 5
    sseInitialReconnectDelayMs?: number; // Default: 1000
    sseMaxReconnectDelayMs?: number; // Default: 30000
    pollMaxErrorAttempts?: number; // Default: 3
    pollHistoryLength?: number; // How much history to request in tasks/get calls
}

// --- Client State Machine ---
export type ClientManagedState =
    | 'idle'             // Initial state before create is called
    | 'initializing'     // Create called, validating config, generating ID
    | 'fetching-card'    // Fetching agent card
    | 'determining-strategy' // Deciding between SSE and polling
    | 'starting-sse'     // Initial SSE connection attempt (sendSubscribe)
    | 'connecting-sse'   // SSE connection established, waiting for first event
    | 'connected-sse'    // Actively receiving SSE events
    | 'reconnecting-sse' // Attempting to reconnect SSE after disconnect
    | 'starting-poll'    // Initial polling request (send)
    | 'polling'          // Actively polling for updates (get)
    | 'retrying-poll'    // Attempting to poll again after an error
    | 'sending'          // Sending a subsequent message (send) - will restart comms
    | 'canceling'        // Sending cancel request
    | 'closed'           // Communication stopped deliberately or after completion/error
    | 'error'            // Unrecoverable error state
    | 'input-required';  // Explicit state for awaiting input

// --- Event Types and Payloads ---
export type ClientEventType =
    | 'status-update'
    | 'artifact-update'
    | 'task-update'
    | 'error'
    | 'close';

export interface StatusUpdatePayload { status: TaskStatus; task: Task; }
export interface ArtifactUpdatePayload { artifact: Artifact; task: Task; }
export interface TaskUpdatePayload { task: Task; }
export interface ErrorPayload { error: Error | JsonRpcError; context: ClientErrorContext; }
export interface ClosePayload { reason: ClientCloseReason; }

export type ClientErrorContext =
    | 'config-validation'
    | 'agent-card-fetch'
    | 'agent-card-parse'
    | 'authentication' // Added for getAuthHeaders failure
    | 'initial-send' // Error on first send/sendSubscribe
    | 'initial-get' // Error on first get (for resume poll)
    | 'sse-connect'
    | 'sse-stream'
    | 'sse-parse'
    | 'sse-reconnect-failed'
    | 'sse-task-sync' // Error synthesizing task state from SSE
    | 'poll-get'
    | 'poll-retry-failed'
    | 'poll-task-diff' // Error diffing task state from Poll
    | 'send' // Error on subsequent tasks/send
    | 'cancel'
    | 'internal';

export type ClientCloseReason =
    | 'closed-by-caller'
    | 'task-completed'
    | 'task-canceled-by-agent'
    | 'task-canceled-by-client'
    | 'task-failed'
    | 'error-fatal' // Generic fatal client error
    | 'sse-reconnect-failed'
    | 'poll-retry-failed'
    | 'sending-new-message' // Intermediate reason during send()
    | 'canceling' // Intermediate reason during cancel()
    | 'error-on-cancel' // If cancel request itself fails
    | 'closed-by-server' // SSE stream ended cleanly with final=true
    | 'closed-by-restart'; // Closed because a new task start was requested


// --- Main Client Class ---

export class A2AClient {
    public readonly agentEndpointUrl: string;
    public readonly taskId: string;
    private readonly config: Required<A2AClientConfig>;

    // Internal State
    private _emitter = new SimpleEventEmitter();
    private _agentCard: A2ATypes.AgentCard | null = null;
    private _strategy: 'sse' | 'poll' = 'poll';
    private _currentState: ClientManagedState = 'idle';
    private _lastKnownTask: Task | null = null;
    private _abortController: AbortController | null = null;
    private _pollTimerId: ReturnType<typeof setTimeout> | null = null;
    private _reconnectTimerId: ReturnType<typeof setTimeout> | null = null;
    private _sseReconnectAttempts: number = 0;
    private _pollErrorAttempts: number = 0;

    // --- Static Factory Methods ---

    /**
     * Creates a new A2AClient instance and initiates communication for a NEW task.
     * @param agentEndpointUrl The base URL of the A2A agent server.
     * @param initialParams Parameters for the first tasks/send or tasks/sendSubscribe call.
     * @param config Optional configuration overrides.
     */
    public static async create(
        agentEndpointUrl: string,
        initialParams: TaskSendParams,
        config: Omit<Partial<A2AClientConfig>, 'agentEndpointUrl'> = {} // Make config optional, exclude endpointUrl
    ): Promise<A2AClient> {
        // 1. Validate config (basic checks) - agentEndpointUrl checked here
        if (!agentEndpointUrl || typeof config.getAuthHeaders !== 'function') {
            throw new Error("Invalid A2AClientConfig: agentEndpointUrl and getAuthHeaders are required.");
        }

        // 2. Generate task ID if absent
        const taskId = initialParams.id ?? crypto.randomUUID();
        const paramsWithId = { ...initialParams, id: taskId };

        // 3. Instantiate client (using private constructor)
        const client = new A2AClient(agentEndpointUrl, taskId, config);
        client._currentState = 'initializing';

        // 4. Start async initialization
        // Pass initial params to know it's a 'create' flow for comms start
        client._initialize(paramsWithId).catch(error => {
            client._handleFatalError(error, 'internal');
        });

        return client;
    }

    /**
     * Creates a new A2AClient instance and initiates communication for an EXISTING task.
     * @param agentEndpointUrl The base URL of the A2A agent server.
     * @param taskId The ID of the existing task to resume.
     * @param config Optional configuration overrides.
     */
    public static async resume(
        agentEndpointUrl: string,
        taskId: string,
        config: Omit<Partial<A2AClientConfig>, 'agentEndpointUrl'> = {}
    ): Promise<A2AClient> {
        // 1. Validate config
        if (!agentEndpointUrl || !taskId || typeof config.getAuthHeaders !== 'function') {
            throw new Error("Invalid A2AClientConfig: agentEndpointUrl, taskId, and getAuthHeaders are required for resume.");
        }

        // 3. Instantiate client
        const client = new A2AClient(agentEndpointUrl, taskId, config);
        client._currentState = 'initializing';

        // 4. Start async initialization
        // Pass null for initial params to signal a 'resume' flow
        client._initialize(null).catch(error => {
            client._handleFatalError(error, 'internal');
        });

        return client;
    }

    // Private constructor - use static factories
    private constructor(
        agentEndpointUrl: string,
        taskId: string,
        config: Omit<Partial<A2AClientConfig>, 'agentEndpointUrl'>
    ) {
        this.agentEndpointUrl = agentEndpointUrl;
        this.taskId = taskId;
        // Set defaults and merge config
        this.config = {
            agentEndpointUrl: agentEndpointUrl, // Store it in the Required config
            getAuthHeaders: () => ({}), // Provided by caller
            agentCardUrl: "", // Default determined in _initialize
            forcePoll: false,
            pollIntervalMs: 5000,
            sseMaxReconnectAttempts: 5,
            sseInitialReconnectDelayMs: 1000,
            sseMaxReconnectDelayMs: 30000,
            pollMaxErrorAttempts: 3,
            pollHistoryLength: 0,
            ...config,
        };
        this._currentState = 'idle'; // Initial state before factories run
    }

    // --- State Management ---
    private _setState(newState: ClientManagedState, context?: string) {
        if (this._currentState !== newState) {
            console.log(`A2AClient STATE: ${this._currentState} -> ${newState}${context ? ` (Context: ${context})` : ''}`);
            this._currentState = newState;
        } else {
            // Optional: Log if state is being set to the same value
            // console.log(`A2AClient STATE: ${this._currentState} (already set)${context ? ` (Context: ${context})` : ''}`);
        }
    }

    // --- Internal Initialization ---
    private async _initialize(initialParams: TaskSendParams | null): Promise<void> {
        this._setState('initializing'); // Use helper
        try {
            // 1. Fetch Agent Card
            // NOTE: Auth headers are fetched *inside* _getAgentCard if needed,
            // but initial auth errors for the *first* request happen later.
            const agentCardUrl = this.config.agentCardUrl || new URL('/.well-known/agent.json', this.agentEndpointUrl).toString();
            this._setState('fetching-card'); // Set state BEFORE awaiting the fetch
            this._agentCard = await this._getAgentCard(agentCardUrl);

            // 2. Determine Strategy
            this._strategy = this._determineStrategy();
            // this._setState('determining-strategy'); // Use helper

            // 3. Initiate Communication (different start based on create/resume and strategy)
            this._abortController = new AbortController(); // Create initial controller

            if (initialParams) { // === CREATE Flow ===
                if (this._strategy === 'sse') {
                    this._setState('connecting-sse');
                    await this._startSse('tasks/sendSubscribe', initialParams as TaskSubscribeParams);
                } else { // Polling strategy for create
                    this._setState('starting-poll');
                    await this._startPolling(initialParams); // Pass params
                }
            } else { // === RESUME Flow ===
                // --- Fetch current state first! ---
                console.log("A2AClient._initialize (Resume): Fetching initial task state via tasks/get...");
                try {
                    const getParams: TaskGetParams = { id: this.taskId, historyLength: this.config.pollHistoryLength };
                    // Use _request directly, requires new abort controller if main one not set yet?
                    // Let's assume _request uses the main _abortController which *was* just created.
                    const initialTask = await this._request<TaskGetParams, Task>('tasks/get', getParams);
                    console.log("A2AClient._initialize (Resume): Got initial task state:", initialTask.status.state);

                    // Store initial state & emit events
                    this._lastKnownTask = initialTask;
                    this._emitSyntheticEventsFromTask(initialTask); // Update UI/listeners

                    // --- Check state BEFORE starting comms ---
                    const currentState = initialTask.status.state;
                    if (this._isFinalTaskState(currentState)) {
                        const reason = this._getCloseReasonFromState(currentState);
                        console.log(`A2AClient._initialize (Resume): Task already in final state (${currentState}). Closing.`);
                        this._stopCommunication(reason, true); // Close immediately, emit event
                        return; // Initialization complete (closed)
                    } else if (currentState === 'input-required') {
                        console.log("A2AClient._initialize (Resume): Task requires input.");
                        this._setState('input-required', 'resume initial get');
                        return; // Initialization complete (waiting for input)
                    } else {
                        // Task is active, proceed with chosen strategy
                        console.log(`A2AClient._initialize (Resume): Task is active (${currentState}). Starting communication strategy: ${this._strategy}`);
                        if (this._strategy === 'sse') {
                             this._setState('connecting-sse');
                             await this._startSse('tasks/resubscribe', { id: this.taskId });
                        } else { // Polling strategy for resume
                             this._setState('polling', 'resume initial get OK'); // Directly to polling state
                             this._pollTaskLoop(); // Start polling loop (don't need _startPolling which does another get)
                        }
                    }
                } catch (getError: any) {
                    console.error("A2AClient._initialize (Resume): Error fetching initial task state:", getError);
                    // If the initial get fails, we can't resume
                    this._handleFatalError(getError, 'initial-get');
                    return;
                }
            }

        } catch (error: any) {
            // Determine context based on current state during the error
            let context: ClientErrorContext = 'internal';

            console.log(`A2AClient _initialize CATCH block. State: ${this._currentState}, Error:`, error); // DEBUG

            // Check if the error is specifically an authentication error bubbled up
            if (error instanceof AuthenticationError) {
                context = 'authentication'; // Context if getAuthHeaders fails
            } else if (this._currentState === 'fetching-card') {
                // Error during card fetch/parse (assuming auth was okay *for the card fetch itself* if it needed it)
                // Note: 'initializing' state errors are now caught by the AuthenticationError check above if auth fails first.
                context = error.message.includes('JSON') ? 'agent-card-parse' : 'agent-card-fetch';
            } else if (this._currentState === 'starting-sse' || this._currentState === 'starting-poll') { // Removed connecting-sse from here
                // Error during the *first* communication attempt (send/subscribe/resubscribe/get)
                // This will be overridden by _startSse or _startPolling if auth fails there.
                context = initialParams ? 'initial-send' : 'initial-get';
            }
            // Add more specific context checks if needed

            this._handleFatalError(error, context);
        }
    }

    // --- Agent Card Fetching & Strategy ---
    private async _getAgentCard(url: string): Promise<A2ATypes.AgentCard> {
        console.log(`A2AClient._getAgentCard: Fetching from ${url}`);
        // Use a temporary abort controller for card fetch? Or rely on main? Rely on main for now.
        const signal = this._abortController?.signal;
        let response: Response;
        try {
            response = await fetch(url, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                signal // Use the main controller's signal
            });
        } catch (error: any) {
             console.error('Agent Card fetch network error:', error);
              if (signal?.aborted) throw new Error(`Agent card fetch aborted.`); // Check if aborted
             throw new Error(`Agent card fetch failed: ${error.message}`);
        }

         if (signal?.aborted) throw new Error(`Agent card fetch aborted.`); // Check after fetch call returns

        if (!response.ok) {
            const errorText = await response.text().catch(() => `Status ${response.status}`);
            console.error(`Agent Card fetch failed: ${response.status} ${response.statusText}. Body: ${errorText}`);
            throw new Error(`Agent card fetch failed: ${response.status} ${response.statusText}`);
        }

        try {
            const card: any = await response.json(); // Cast to any first
            // TODO: Add more robust validation using a schema validator
            if (!card || typeof card !== 'object' || !card.name || !card.url || !card.capabilities || !card.authentication) {
                console.error('Invalid Agent Card structure received:', card);
                throw new Error('Invalid Agent Card structure received.');
            }
            console.log('A2AClient._getAgentCard: Successfully fetched and parsed card.');
            return card as A2ATypes.AgentCard; // Cast to specific type before returning
        } catch (error: any) {
            console.error('Agent Card JSON parse error:', error);
            throw new Error(`Agent card JSON parse failed: ${error.message}`);
        }
    }

    private _determineStrategy(): 'sse' | 'poll' {
        const canUseSse = this._agentCard?.capabilities?.streaming === true && !this.config.forcePoll;
        const strategy = canUseSse ? 'sse' : 'poll';
        console.log(`A2AClient._determineStrategy: Selected strategy: ${strategy}`);
        return strategy;
    }

    // --- Public API Methods ---

    /**
     * Sends a subsequent message to the agent for the managed task.
     * Stops existing communication (SSE/polling) and restarts the flow using tasks/send.
     */
    public async send(message: A2ATypes.Message): Promise<void> {
         console.log('A2AClient.send called');
         if (this._isTerminalState(this._currentState) || this._currentState === 'canceling' || this._currentState === 'sending') {
             console.warn(`A2AClient.send: Cannot send message in state: ${this._currentState}`); // Added log
             throw new Error(`Cannot send message in state: ${this._currentState}`);
         }

         // Stop existing communication gracefully
         const reason: ClientCloseReason = 'sending-new-message';
         this._stopCommunication(reason, false); // false = Don't emit close event yet

         this._setState('sending', 'send called'); // Intermediate state
         this._resetCounters();

         const params: TaskSendParams = {
             id: this.taskId,
             sessionId: this._lastKnownTask?.sessionId, // Include session ID if known
             message: message,
             // Include pushNotification config if needed/supported?
             // Include historyLength if needed?
         };

         try {
             // Re-initialize communication using the *original* strategy
            console.log(`A2AClient.send: Restarting communication (original strategy: ${this._strategy})...`);
             this._abortController = new AbortController(); // New controller for this attempt

             if (this._strategy === 'sse') {
                 // Send message and immediately try to resubscribe for updates
                 this._setState('connecting-sse', 'send restarting comms');
                 await this._startSse('tasks/sendSubscribe', params as TaskSubscribeParams);
             } else {
                 // Use polling strategy (starts with tasks/send)
                 this._setState('starting-poll', 'send restarting comms');
                 await this._startPolling(params);
             }

             // Note: _startSse or _startPolling will handle subsequent state transitions
             console.log("A2AClient.send: Communication restart initiated.");

         } catch (error: any) {
              console.error("A2AClient.send: Error during communication restart:", error);
              // Handle fatal error, which will emit 'error' and 'close'
              this._handleFatalError(error, 'send');
         }
     }


    /**
     * Requests the agent to cancel the task and stops client communication.
     */
    public async cancel(): Promise<void> {
        console.log('A2AClient.cancel called');
        if (this._isTerminalState(this._currentState) || this._currentState === 'canceling') {
            console.warn(`Cannot cancel task in state: ${this._currentState}`);
            return; // Or throw?
        }

        const reason: ClientCloseReason = 'canceling';
        this._stopCommunication(reason, false); // Stop comms, don't emit close yet

        this._setState('canceling'); // Intermediate state

        try {
            // Perform the cancel request using the current abort controller
            const result = await this._request<TaskCancelParams, Task>('tasks/cancel', { id: this.taskId });
            console.log('A2AClient.cancel: tasks/cancel successful.');

            // Update local task state based on cancel response
            // Use the new _updateAndEmit method for consistency
            this._updateTaskStateAndEmit(result, 'task-canceled-by-client'); // Force update with final state

            // Explicitly close with the final reason
             this._stopCommunication('task-canceled-by-client', true); // true = emit close event

        } catch (error: any) {
            console.error('Error during tasks/cancel request:', error);
            this._emitter.emit('error', { error, context: 'cancel' } satisfies ErrorPayload);
             // Close with an error reason
             this._stopCommunication('error-on-cancel', true); // true = emit close event
        }
    }

    /**
     * Permanently stops all communication (SSE/polling), cleans up resources,
     * and marks the client as closed.
     */
    public close(reason: ClientCloseReason = 'closed-by-caller'): void {
        console.log(`A2AClient.close called with reason: ${reason}`);
        if (this._isTerminalState(this._currentState)) {
            return;
        }
        this._stopCommunication(reason, true); // true = emit close event
    }

    /**
     * Gets the latest known state of the task.
     * Returns a deep copy.
     */
    public getCurrentTask(): Task | null {
        return this._lastKnownTask ? structuredClone(this._lastKnownTask) : null;
    }

    /** Gets the current internal management state of the client. */
    public getCurrentState(): ClientManagedState {
        return this._currentState;
    }

    /** Registers an event listener. */
    public on(event: ClientEventType, listener: Listener): void {
        this._emitter.on(event, listener);
    }

    /** Removes an event listener. */
    public off(event: ClientEventType, listener: Listener): void {
        this._emitter.off(event, listener);
    }

    // --- SSE Implementation ---

    private async _startSse(method: 'tasks/sendSubscribe' | 'tasks/resubscribe', params: TaskSubscribeParams | TaskResubscribeParams): Promise<void> {
        console.log(`A2AClient._startSse: START. Method: ${method}, Reconnect attempt: ${this._sseReconnectAttempts}, State: ${this._currentState}`);
        // State should be 'connecting-sse' or 'reconnecting-sse'

        this._abortController = new AbortController(); // Ensure a fresh controller for this attempt
        const signal = this._abortController.signal;

        let headers: Record<string, string> = { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' };
        try {
            const authHeaders = await this.config.getAuthHeaders();
            headers = { ...headers, ...authHeaders };
        } catch (authError: any) {
             this._handleFatalError(new AuthenticationError(`Authentication failed: ${authError.message}`), 'authentication');
             return; // Stop further execution
        }

        try {
            const requestId = crypto.randomUUID();
            const requestBody = { jsonrpc: "2.0", id: requestId, method, params };
            console.log(`A2AClient._startSse: Sending ${method} request...`);
            const response = await fetch(this.agentEndpointUrl, { method: 'POST', headers, body: JSON.stringify(requestBody), signal });

            if (signal.aborted) { console.log(`A2AClient._startSse (${method}): Fetch aborted.`); return; }

            if (!response.ok) {
                const errorText = await response.text().catch(() => `Status ${response.status}`);
                throw new Error(`SSE connection failed: ${response.status} ${response.statusText}. Body: ${errorText}`);
            }
            const contentType = response.headers.get('content-type');
            if (!contentType?.includes('text/event-stream')) {
                throw new Error(`Expected text/event-stream, got ${contentType}`);
            }
            if (!response.body) { throw new Error("SSE response body is null"); }

            console.log(`A2AClient._startSse (${method}): SSE connection established, processing stream...`);
            this._setState('connected-sse', `startSse ${method} success`); // Transition state *before* processing
            this._sseReconnectAttempts = 0; // Reset on successful connection
            if(this._reconnectTimerId) clearTimeout(this._reconnectTimerId); this._reconnectTimerId = null;

            await this._processSseStream(response.body);

            // If processing finishes without error/abort/final event, it implies server closed prematurely
             if (!signal.aborted && !this._isTerminalState(this._currentState)) {
                  console.warn(`A2AClient._startSse (${method}): SSE stream ended without explicit close/final event.`);
                  this._reconnectSse(); // Attempt reconnect if stream ends unexpectedly
             }

        } catch (error: any) {
             if (signal?.aborted || this._isTerminalState(this._currentState)) {
                 console.warn(`A2AClient._startSse (${method}): Ignoring error as client aborted or in terminal state: ${this._currentState}`);
                 return; // Don't reconnect if aborted or closed/errored
             }
            console.error(`A2AClient._startSse (${method}): Error establishing/processing SSE connection:`, error);
            this._emitter.emit('error', { error, context: 'sse-connect' } satisfies ErrorPayload);
            this._reconnectSse(); // Attempt reconnect on error
        }
    }

    private async _processSseStream(stream: ReadableStream<Uint8Array>): Promise<void> {
        // Implementation similar to before, but calls _handleSseEvent
        // Needs careful handling of abort signals within the read loop
         const reader = stream.getReader();
         const decoder = new TextDecoder();
         let buffer = "";
         let eventDataBuffer = "";
         let eventType = "message"; // Default SSE event type

         try {
             while (true) {
                 if (this._abortController?.signal?.aborted) {
                     console.log("A2AClient._processSseStream: Abort detected, stopping stream processing.");
                     break;
                 }

                 const { done, value } = await reader.read();

                 if (done) {
                     console.log("A2AClient._processSseStream: Stream finished (done=true).");
                     // Server closed the connection. Reconnect handled by _startSse if unexpected.
                     break;
                 }

                 buffer += decoder.decode(value, { stream: true });

                 let boundaryIndex;
                 while ((boundaryIndex = buffer.indexOf('\n\n')) >= 0) {
                     const eventBlock = buffer.substring(0, boundaryIndex);
                     buffer = buffer.substring(boundaryIndex + 2);

                     if (!eventBlock.trim()) continue;

                     eventDataBuffer = "";
                     eventType = "message"; // Reset for each block

                     for (const line of eventBlock.split('\n')) {
                         if (line.startsWith(':')) continue;
                         const separatorIndex = line.indexOf(':');
                         if (separatorIndex === -1) continue;

                         const field = line.substring(0, separatorIndex).trim();
                         const val = line.substring(separatorIndex + 1).trim();

                         switch (field) {
                             case 'event': eventType = val; break;
                             case 'data': eventDataBuffer += (eventDataBuffer ? '\n' : '') + val; break;
                         }
                     }

                     if (eventDataBuffer) {
                         if (this._abortController?.signal?.aborted || this._isTerminalState(this._currentState)) {
                            console.log("A2AClient._processSseStream: Client closed/aborted during event processing, discarding event:", eventType);
                            continue;
                         }
                         try {
                             const parsedData = JSON.parse(eventDataBuffer);
                             // Check for JSON-RPC error structure within the SSE data
                             if (parsedData.error) {
                                 console.error("A2AClient._processSseStream: Received JSON-RPC error via SSE:", parsedData.error);
                                 this._emitter.emit('error', { error: parsedData.error as JsonRpcError, context: 'sse-stream' });
                                 // Should we reconnect on RPC error? Or is it fatal for the task? Assume fatal for now.
                                 this._handleFatalError(parsedData.error, 'sse-stream');
                                 return; // Stop processing stream on fatal error
                             }
                             // Assuming result structure based on spec examples
                             const eventResult = parsedData.result;
                              if (!eventResult || typeof eventResult !== 'object') {
                                 throw new Error(`Invalid SSE event data structure: ${eventDataBuffer}`);
                             }
                             this._handleSseEvent(eventType, eventResult);
                         } catch (parseError: any) {
                             console.error("A2AClient._processSseStream: Failed to parse SSE event data JSON:", parseError, "Data:", eventDataBuffer);
                             // Don't emit error for single parse failure, just log
                             // this._emitter.emit('error', { error: parseError, context: 'sse-parse' } satisfies ErrorPayload);
                             // Continue processing stream despite parse error for one event? Or reconnect? Let's continue for now.
                         }
                     }
                 } // end while(boundaryIndex)
             } // end while(true) reader loop
         } catch (readError: any) {
              // Check if the error is due to an intentional abort
              if (readError.name === 'AbortError' || this._abortController?.signal?.aborted) {
                  console.log("A2AClient._processSseStream: Stream reading aborted intentionally.");
                  return; // Don't treat as error, don't reconnect
              }

              // Handle other, unexpected read errors
              if (this._isTerminalState(this._currentState)) {
                  console.warn("A2AClient._processSseStream: Ignoring read error as client already in terminal state.");
                  return;
              }
              // Error during reader.read()
              console.error("A2AClient._processSseStream: Error reading SSE stream:", readError);
              this._emitter.emit('error', { error: readError, context: 'sse-stream' } satisfies ErrorPayload);
              this._reconnectSse(); // Reconnect on *unexpected* read errors
         } finally {
             reader.releaseLock();
             console.log("A2AClient._processSseStream: Released reader lock.");
             // Don't try to cancel reader here, let abort controller handle it.
         }
    }

    private _handleSseEvent(eventType: string, eventData: any): void {
        console.log(`A2AClient._handleSseEvent: Received SSE message. Analyzing data...`);
        // NOTE: eventType parameter is now ignored as server omits 'event:' line.
        // We determine type by inspecting eventData (the result object).

        // Ensure we have a base task object to update, create shell if needed (esp. for resubscribe)
        if (!this._lastKnownTask) {
             console.warn("A2AClient._handleSseEvent: _lastKnownTask is null. Creating shell task.");
             this._lastKnownTask = {
                 id: this.taskId,
                 status: { state: 'unknown', timestamp: new Date().toISOString() },
                 artifacts: [],
                 history: [],
                 createdAt: new Date().toISOString(),
                 updatedAt: new Date().toISOString(),
             };
        }

        let taskChanged = false;
        let specificUpdate: { status: TaskStatus } | { artifact: Artifact } | null = null;
        let isFinalEvent = false;

        try {
            // Check for Status Update
            if ('status' in eventData && eventData.status) {
                 console.log("A2AClient._handleSseEvent: Detected TaskStatusUpdate.");
                 const statusUpdate = eventData as Partial<TaskStatusUpdateEvent>; // Payload is the result object
                 const newStatus = statusUpdate.status!;
                 const oldStatus = this._lastKnownTask!.status; // Should exist by now
                 isFinalEvent = statusUpdate.final === true;
                 console.log(`A2AClient._handleSseEvent: TaskStatusUpdate - State: ${newStatus.state}, Final: ${isFinalEvent}`);

                 if (!deepEqual(newStatus, oldStatus)) {
                     this._lastKnownTask!.status = newStatus;
                     this._lastKnownTask!.updatedAt = newStatus.timestamp || new Date().toISOString();
                     if (oldStatus.state !== newStatus.state || !deepEqual(oldStatus.message, newStatus.message)) {
                         taskChanged = true;
                     }
                     specificUpdate = { status: newStatus };
                 }
                 if (newStatus.state === 'input-required' && this._currentState !== 'input-required') {
                     this._setState('input-required', 'sse status update');
                 } else if (newStatus.state !== 'input-required' && this._currentState === 'input-required') {
                     this._setState('connected-sse', 'sse status recovered from input-required');
                 }
            }
            // Check for Artifact Update
            else if ('artifact' in eventData && eventData.artifact) {
                 console.log("A2AClient._handleSseEvent: Detected TaskArtifactUpdate.");
                 const artifactUpdate = eventData as Partial<TaskArtifactUpdateEvent>; // Payload is the result object
                 const artifactData = artifactUpdate.artifact!;

                 if (typeof artifactData.index !== 'number') {
                      throw new Error("Invalid TaskArtifactUpdate event: missing or invalid artifact index.");
                 }
                 console.log(`A2AClient._handleSseEvent: TaskArtifactUpdate - Index: ${artifactData.index}, Append: ${artifactData.append}, LastChunk: ${artifactData.lastChunk}`);

                 if (!this._lastKnownTask!.artifacts) this._lastKnownTask!.artifacts = [];

                 let existingArtifact = this._lastKnownTask!.artifacts.find(a => a.index === artifactData.index);
                 let updatedArtifact: Artifact | null = null;

                 if (artifactData.append && existingArtifact) {
                     // Append parts
                     if (!existingArtifact.parts) existingArtifact.parts = [];
                     existingArtifact.parts.push(...(artifactData.parts || []));
                     existingArtifact.lastChunk = artifactData.lastChunk;
                     existingArtifact.timestamp = artifactData.timestamp || new Date().toISOString();
                     updatedArtifact = existingArtifact;
                     console.log(`A2AClient._handleSseEvent: Appended parts to artifact index ${artifactData.index}. Total parts: ${existingArtifact.parts.length}`);
                 } else {
                     // Replace or add new artifact
                     const newArtifact: Artifact = {
                         index: artifactData.index,
                         parts: artifactData.parts || [],
                         timestamp: artifactData.timestamp || new Date().toISOString(),
                         name: artifactData.name,
                         description: artifactData.description,
                         append: artifactData.append,
                         lastChunk: artifactData.lastChunk,
                         metadata: artifactData.metadata,
                     };
                     if (existingArtifact) {
                         const idx = this._lastKnownTask!.artifacts.indexOf(existingArtifact);
                         this._lastKnownTask!.artifacts[idx] = newArtifact;
                         console.log(`A2AClient._handleSseEvent: Replaced artifact at index ${artifactData.index}.`);
                     } else {
                         this._lastKnownTask!.artifacts.push(newArtifact);
                         this._lastKnownTask!.artifacts.sort((a, b) => a.index - b.index);
                         console.log(`A2AClient._handleSseEvent: Added new artifact at index ${artifactData.index}.`);
                     }
                     updatedArtifact = newArtifact;
                 }
                 this._lastKnownTask!.updatedAt = new Date().toISOString();
                 taskChanged = true;
                 if (updatedArtifact) {
                     specificUpdate = { artifact: updatedArtifact };
                 }
            }
            // Handle other potential event types (if any added later)
            else {
                 console.warn(`A2AClient._handleSseEvent: Received SSE data with unknown structure:`, eventData);
            }

             // --- Emit Events ---
             if (taskChanged && this._lastKnownTask) {
                 const currentTaskSnapshot = this.getCurrentTask()!; // Get deep copy
                 if (specificUpdate) {
                     if ('status' in specificUpdate) {
                         this._emitter.emit('status-update', { status: specificUpdate.status, task: currentTaskSnapshot } satisfies StatusUpdatePayload);
                     } else if ('artifact' in specificUpdate) {
                         // Type guard specificUpdate again before accessing artifact property
                          if (specificUpdate.artifact) {
                             this._emitter.emit('artifact-update', { artifact: specificUpdate.artifact, task: currentTaskSnapshot } satisfies ArtifactUpdatePayload);
                          }
                     }
                 }
                 this._emitter.emit('task-update', { task: currentTaskSnapshot } satisfies TaskUpdatePayload);
             }

             // --- Handle Final Event ---
             if (isFinalEvent) {
                 console.log("A2AClient._handleSseEvent: Final event received. Checking task state...");
                 // Determine close reason based on the final *task* state reported
                 const finalTaskState = this._lastKnownTask?.status?.state ?? 'unknown';
                 if (this._isFinalTaskState(finalTaskState)) {
                     const reason = this._getCloseReasonFromState(finalTaskState);
                     console.log(`A2AClient._handleSseEvent: Task state ${finalTaskState} is final. Closing communication with reason: ${reason}.`);
                     this._stopCommunication(reason, true); // true = emit close event
                 } else {
                     console.log(`A2AClient._handleSseEvent: Task state ${finalTaskState} is not final. SSE stream ended, but client remains active (State: ${this._currentState}).`);
                     // Do nothing - client should already be in the correct state (e.g., 'input-required')
                     // Abort the current SSE request processing, but don't change client state from input-required etc.
                     this._abortController?.abort(); // Abort any further processing of *this* stream
                 }
             }

        } catch (e: any) {
            console.error(`A2AClient._handleSseEvent: Error processing event:`, e);
            this._emitter.emit('error', { error: e, context: 'sse-task-sync' } satisfies ErrorPayload);
            // Consider reconnecting or going fatal on processing errors? Let's try reconnecting.
             this._reconnectSse();
        }
    }

    private _reconnectSse(): void {
        if (this._isTerminalState(this._currentState) || this._currentState === 'sending' || this._currentState === 'canceling') {
            console.log(`A2AClient._reconnectSse: Cannot reconnect in state ${this._currentState}.`);
            return;
        }
         if (this._reconnectTimerId) {
             console.log("A2AClient._reconnectSse: Reconnect already scheduled.");
             return;
         }

        this._sseReconnectAttempts++;
        console.log(`A2AClient._reconnectSse: Attempting SSE reconnect (${this._sseReconnectAttempts}/${this.config.sseMaxReconnectAttempts}).`);

        if (this._sseReconnectAttempts > this.config.sseMaxReconnectAttempts) {
            // FIX: Call _handleFatalError without returning its result
            this._handleFatalError(new Error("SSE reconnection failed."), 'sse-reconnect-failed');
            return; // Exit after handling fatal error
        }

        const delay = this._calculateBackoff(this._sseReconnectAttempts, this.config.sseInitialReconnectDelayMs, this.config.sseMaxReconnectDelayMs);
        console.log(`A2AClient._reconnectSse: Scheduling reconnect in ${delay}ms.`);
        this._setState('reconnecting-sse');

        this._reconnectTimerId = setTimeout(async () => {
            console.log(`A2AClient._reconnectSse: TIMER FIRED. Current state: ${this._currentState}`); // DEBUG
            this._reconnectTimerId = null;
            if (this._currentState !== 'reconnecting-sse') {
                 console.log(`A2AClient._reconnectSse: Reconnect timer fired, but state is now ${this._currentState}. Aborting.`);
                 return;
            }
            // Start SSE using resubscribe
            await this._startSse('tasks/resubscribe', { id: this.taskId });
            // _startSse will handle errors and potentially call _reconnectSse again
        }, delay);
    }


    // --- Polling Implementation ---

    private async _startPolling(initialParams: TaskSendParams | null): Promise<void> {
        console.log('A2AClient._startPolling: Initiating polling...');
        this._resetCounters();
        this._abortController = new AbortController(); // Ensure fresh controller

        try {
            let initialTask: Task;
            if (initialParams) { // Create flow
                console.log('A2AClient._startPolling: Sending initial tasks/send');
                 initialTask = await this._request<TaskSendParams, Task>('tasks/send', initialParams);
                 console.log('A2AClient._startPolling: Received initial task response from send.');
            } else { // Resume flow
                console.log('A2AClient._startPolling: Sending initial tasks/get');
                 const getParams: TaskGetParams = { id: this.taskId, historyLength: this.config.pollHistoryLength };
                 initialTask = await this._request<TaskGetParams, Task>('tasks/get', getParams);
                 console.log('A2AClient._startPolling: Received initial task response from get.');
            }

            // Set initial state *before* emitting events
            this._lastKnownTask = initialTask; // No diff needed for first response

            // Emit synthetic events based on the first full task response
            this._emitSyntheticEventsFromTask(initialTask);

            // Check initial state for completion or input required
            if (this._isFinalTaskState(initialTask.status.state)) {
                const reason = this._getCloseReasonFromState(initialTask.status.state);
                console.log(`A2AClient._startPolling: Task finished on initial response (${initialTask.status.state}). Closing.`);
                this._stopCommunication(reason, true); // Emit close
            } else if (initialTask.status.state === 'input-required') {
                console.log('A2AClient._startPolling: Task requires input on initial response.');
                this._setState('input-required', 'initial poll response'); // Set state explicitly
                // Do NOT start polling loop
            } else {
                // Task is active, start polling loop
                console.log('A2AClient._startPolling: Task active, starting poll loop.');
                this._setState('polling', 'initial poll response OK');
                this._pollTaskLoop(); // Start the loop
            }

        } catch (error: any) {
            // Catch errors during initial send/get
            const context = initialParams ? 'initial-send' : 'initial-get';
            console.error(`A2AClient._startPolling: Error during initial request (${context}):`, error);
            this._handleFatalError(error, context);
        }
    }

    private _pollTaskLoop(): void {
        // Check if polling should continue
        if (this._currentState !== 'polling' && this._currentState !== 'retrying-poll') {
             console.log(`A2AClient._pollTaskLoop: Not scheduling poll, state is ${this._currentState}`);
            return;
        }

        // Clear existing timer
        if (this._pollTimerId) clearTimeout(this._pollTimerId);

        console.log(`A2AClient._pollTaskLoop: Scheduling poll task via setTimeout in ${this.config.pollIntervalMs}ms.`); // DEBUG
        this._pollTimerId = setTimeout(async () => {
            console.log(`A2AClient._pollTaskLoop: setTimeout CALLBACK FIRED. Current state: ${this._currentState}`); // DEBUG
            this._pollTimerId = null; // Clear ID before running
            if (this._currentState !== 'polling' && this._currentState !== 'retrying-poll') {
                 console.log('A2AClient._pollTaskLoop: Poll timer fired, but state changed. Aborting poll.');
                 return;
            }
            await this._pollTask(); // Perform the poll
        }, this.config.pollIntervalMs);
    }

    private async _pollTask(): Promise<void> {
         if (this._currentState !== 'polling' && this._currentState !== 'retrying-poll') {
             console.log(`A2AClient._pollTask: Aborting poll, state is ${this._currentState}`);
             return;
         }
        this._setState('polling', 'pollTask execution');

        try {
            console.log('A2AClient._pollTask: Performing tasks/get');
            const getParams: TaskGetParams = { id: this.taskId, historyLength: this.config.pollHistoryLength };
            const newTask = await this._request<TaskGetParams, Task>('tasks/get', getParams);
            console.log('A2AClient._pollTask: Received tasks/get response.');

            this._pollErrorAttempts = 0; // Reset error count on success

            // Diff and emit updates based on the new full task state
            this._diffAndEmitUpdates(newTask);

            // Check new state for completion or input required (state updated by diff)
            if (this._isFinalTaskState(newTask.status.state)) {
                const reason = this._getCloseReasonFromState(newTask.status.state);
                console.log(`A2AClient._pollTask: Task finished (${newTask.status.state}). Stopping poll.`);
                this._stopCommunication(reason, true); // Emit close
            } else if (newTask.status.state === 'input-required') {
                 console.log('A2AClient._pollTask: Task requires input. Stopping poll loop.');
                 this._setState('input-required', 'pollTask found input-required'); // Ensure state is set
                 // Do NOT schedule next poll
            } else {
                // Task still active, schedule next poll
                this._pollTaskLoop();
            }

        } catch (error: any) {
            this._pollErrorAttempts++;
            console.error(`A2AClient._pollTask: Error during tasks/get (attempt ${this._pollErrorAttempts}/${this.config.pollMaxErrorAttempts}):`, error);
            this._emitter.emit('error', { error, context: 'poll-get' } satisfies ErrorPayload);

            if (this._pollErrorAttempts >= this.config.pollMaxErrorAttempts) {
                this._handleFatalError(new Error(`Polling failed after ${this.config.pollMaxErrorAttempts} attempts.`), 'poll-retry-failed');
            } else {
                // Schedule retry
                this._setState('retrying-poll');
                console.log(`A2AClient._pollTask: Scheduling poll retry.`);
                this._pollTaskLoop(); // Schedule the next attempt (with delay)
            }
        }
    }

    // Diffing logic for Polling
    private _diffAndEmitUpdates(newTask: Task): void {
        const oldTask = this._lastKnownTask;
        // Always update internal state first
        this._lastKnownTask = newTask;

        if (!oldTask) {
            // Should not happen after initial poll, but handle defensively
            console.warn('A2AClient._diffAndEmitUpdates: No previous task state found. Emitting synthetic events.');
            this._emitSyntheticEventsFromTask(newTask);
            return;
        }

        let statusChanged = false;
        let artifactsChanged = false;
        const changedArtifacts: Artifact[] = []; // Store *new* or *changed* artifacts

        // 1. Diff Status
        if (!deepEqual(newTask.status, oldTask.status)) {
            console.log(`A2AClient._diffAndEmitUpdates: Status changed from ${oldTask.status.state} to ${newTask.status.state}`);
            statusChanged = true;
        }

        // 2. Diff Artifacts (basic diff: check for new indices or changed content at existing indices)
        const oldArtifacts = oldTask.artifacts ?? [];
        const newArtifacts = newTask.artifacts ?? [];
        const oldIndices = new Set(oldArtifacts.map(a => a.index));
        const newIndices = new Set(newArtifacts.map(a => a.index));

        for (const newArt of newArtifacts) {
            if (!oldIndices.has(newArt.index)) {
                // New artifact found
                artifactsChanged = true;
                changedArtifacts.push(newArt);
                 console.log(`A2AClient._diffAndEmitUpdates: New artifact found at index ${newArt.index}`);
            } else {
                // Existing index, check if content changed
                const oldArt = oldArtifacts.find(a => a.index === newArt.index);
                if (!deepEqual(newArt, oldArt)) {
                    artifactsChanged = true;
                    changedArtifacts.push(newArt);
                     console.log(`A2AClient._diffAndEmitUpdates: Artifact changed at index ${newArt.index}`);
                }
            }
        }
        // More sophisticated diffing (e.g., detecting deleted artifacts) could be added if needed

        // --- Emit Events based on Diff ---
        const currentTaskSnapshot = this.getCurrentTask()!; // Get deep copy of *new* state

        if (statusChanged) {
            this._emitter.emit('status-update', { status: newTask.status, task: currentTaskSnapshot } satisfies StatusUpdatePayload);
        }
        if (artifactsChanged) {
            changedArtifacts.forEach(art => {
                 this._emitter.emit('artifact-update', { artifact: art, task: currentTaskSnapshot } satisfies ArtifactUpdatePayload);
            });
        }
        if (statusChanged || artifactsChanged) {
            console.log(`A2AClient._diffAndEmitUpdates: Emitting task-update.`);
            this._emitter.emit('task-update', { task: currentTaskSnapshot } satisfies TaskUpdatePayload);
        } else {
             console.log(`A2AClient._diffAndEmitUpdates: No changes detected.`);
        }

         // Handle client state transition based on *new* task state
         if (newTask.status.state === 'input-required' && oldTask.status.state !== 'input-required') {
             this._setState('input-required', 'diff found input-required'); // Stop polling loop next cycle
         } else if (newTask.status.state !== 'input-required' && this._currentState === 'input-required') {
             // Recovered from input-required? Resume polling.
             this._setState('polling', 'diff recovered from input-required');
             this._pollTaskLoop(); // Explicitly restart loop if needed
         }
    }

    // Helper to emit initial/polled events based on a full task object
    private _emitSyntheticEventsFromTask(task: Task): void {
        const taskSnapshot = structuredClone(task); // Ensure deep copy for events
        // Emit status update
        console.log("A2AClient._emitSyntheticEventsFromTask: Emitting status-update event.", taskSnapshot.status);
        this._emitter.emit('status-update', { status: taskSnapshot.status, task: taskSnapshot } satisfies StatusUpdatePayload);
        // Emit artifact updates for all existing artifacts
        taskSnapshot.artifacts?.forEach(artifact => {
            this._emitter.emit('artifact-update', { artifact, task: taskSnapshot } satisfies ArtifactUpdatePayload);
        });
        // Emit the overall task update
        this._emitter.emit('task-update', { task: taskSnapshot } satisfies TaskUpdatePayload);
        console.log("A2AClient._emitSyntheticEventsFromTask: Emitted initial events for task:", task.id);
    }


     // Helper to centralize updating internal state and emitting events
     // Used by cancel() and potentially other places that directly know the final task state
     private _updateTaskStateAndEmit(newTask: Task, sourceReason: ClientCloseReason | 'sse' | 'poll' = 'poll'): void {
         console.log(`A2AClient._updateTaskStateAndEmit: Updating task from source: ${sourceReason}`);
         const oldTask = this._lastKnownTask;
         this._lastKnownTask = newTask; // Update internal state

         // Determine if events should be emitted (usually yes, unless no change)
         let emitEvents = true;
         if (oldTask && deepEqual(newTask, oldTask)) {
              console.log("A2AClient._updateTaskStateAndEmit: No change detected, skipping event emission.");
              emitEvents = false;
         }

         if (emitEvents) {
              // Emit synthetic events based on the new task state
              this._emitSyntheticEventsFromTask(newTask);

              // Update client state based on task status, if applicable
               if (newTask.status.state === 'input-required' && this._currentState !== 'input-required') {
                   this._setState('input-required', 'sse status update');
               } else if (this._isFinalTaskState(newTask.status.state) && !this._isTerminalState(this._currentState)) {
                   // If task is final, but client isn't closed/error yet, update client state
                   const reason = this._getCloseReasonFromState(newTask.status.state);
                   console.log(`A2AClient._updateTaskStateAndEmit: Task state ${newTask.status.state} is final, client state ${this._currentState} is not terminal. Reason: ${reason}`);
                   // Don't call stopCommunication here, let the caller handle final closure
                   // Just update the state conceptually if needed, but typically handled by close()
               }
         }
     }


    // --- Core Communication ---
    private async _request<TParams, TResult>(method: string, params: TParams): Promise<TResult> {
        console.log(`A2AClient._request: Sending method '${method}'`);
        const requestId = crypto.randomUUID();
        const requestBody = { jsonrpc: "2.0", id: requestId, method, params };

        let headers: Record<string, string> = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
        try {
            const authHeaders = await this.config.getAuthHeaders();
            headers = { ...headers, ...authHeaders };
        } catch (authError: any) {
             console.error('A2AClient._request: Failed to get auth headers:', authError);
             // Throw specific error type? For now, wrap it.
             throw new AuthenticationError(`Authentication failed: ${authError.message}`);
        }

        const signal = this._abortController?.signal; // Use current abort controller
        let response: Response;
        try {
            response = await fetch(this.agentEndpointUrl, { method: 'POST', headers, body: JSON.stringify(requestBody), signal });
        } catch (fetchError: any) {
            console.error(`A2AClient._request: Fetch error for method '${method}':`, fetchError);
            if (signal?.aborted || fetchError.name === 'AbortError') { throw new Error(`Request aborted: ${method}`); }
            throw new Error(`Network error during request: ${fetchError.message}`);
        }

         if (signal?.aborted) { throw new Error(`Request aborted: ${method}`); } // Check after fetch

        if (!response.ok) {
             const responseText = await response.text().catch(() => '{Could not read response body}');
             console.error(`A2AClient._request: HTTP error for method '${method}': ${response.status} ${response.statusText}. Body: ${responseText}`);
             // Construct a JsonRpcError-like object for HTTP errors?
             // Or just throw a generic error. Let's throw generic for now.
             throw new Error(`HTTP error ${response.status} for method ${method}. Body: ${responseText}`);
        }

        let responseData: any; // Use any initially
        try {
            responseData = await response.json();
        } catch (parseError: any) {
            console.error(`A2AClient._request: JSON parse error for method '${method}':`, parseError);
            throw new Error(`Failed to parse JSON response: ${parseError.message}`);
        }

        // Now check the structure and cast
        const rpcResponse = responseData as A2ATypes.JsonRpcResponse<TResult>; // Cast here

        if ('error' in rpcResponse && rpcResponse.error) {
            console.warn(`A2AClient._request: Received JSON-RPC error for method '${method}':`, rpcResponse.error);
            throw rpcResponse.error; // Throw the JsonRpcError object itself
        }
        if ('result' in rpcResponse) {
            console.log(`A2AClient._request: Successfully received result for method '${method}'`);
            return rpcResponse.result;
        } else {
            console.error(`A2AClient._request: Invalid JSON-RPC response for method '${method}':`, rpcResponse);
            throw new Error('Invalid JSON-RPC response structure received.');
        }
    }

    // --- Cleanup & State Management ---

    private _stopCommunication(reason: ClientCloseReason, emitCloseEvent: boolean): void {
        console.log(`A2AClient._stopCommunication: Stopping communication. Reason: "${reason}", EmitClose: ${emitCloseEvent}, CurrentState: ${this._currentState}`);

        if (this._isTerminalState(this._currentState)) {
            console.log(`A2AClient._stopCommunication: Already in terminal state ${this._currentState}.`);
            return;
        }

        const previousState = this._currentState;

        // 1. Abort in-flight operations
        if (this._abortController) {
            console.log('A2AClient._stopCommunication: Aborting controller.');
            this._abortController.abort();
            this._abortController = null; // Clear controller
        } else {
            console.log('A2AClient._stopCommunication: No active abort controller to abort.');
        }


        // 2. Clear timers
        if (this._pollTimerId) { clearTimeout(this._pollTimerId); this._pollTimerId = null; }
        if (this._reconnectTimerId) { clearTimeout(this._reconnectTimerId); this._reconnectTimerId = null; }

        // 3. Reset counters
        this._resetCounters();

        // 4. Set final state and emit close event ONLY if requested
        if (emitCloseEvent) {
            // Determine final state based on reason
            let finalState: ClientManagedState = 'closed';
             const errorReasons: ClientCloseReason[] = ['error-fatal', 'sse-reconnect-failed', 'poll-retry-failed', 'error-on-cancel'];
             if (errorReasons.includes(reason) || this._currentState === 'error') { // Check current state too in case error happened before stop
                 finalState = 'error';
             }
             console.log(`A2AClient._stopCommunication: Transitioning state from ${previousState} to ${finalState}`);
             this._setState(finalState);
             this._emitter.emit('close', { reason } satisfies ClosePayload);

             console.log(`A2AClient._stopCommunication: Communication stopped. Final state: ${this._currentState}`);
        } else {
             // If not emitting close, the state is likely transitioning to an intermediate
             // state like 'sending' or 'canceling', handled by the caller.
             console.log(`A2AClient._stopCommunication: Intermediate stop for reason "${reason}". State managed by caller.`);
             // State is set by caller (e.g., _send sets to 'sending')
        }
    }

    // Centralized fatal error handler
    private _handleFatalError(error: Error | JsonRpcError, context: ClientErrorContext): Error | JsonRpcError {
        console.error(`>>> A2AClient FATAL ERROR (${context}):`, error);
        if (this._isTerminalState(this._currentState)) {
             console.warn("Fatal error occurred but client already in terminal state:", this._currentState);
             return error; // Return error but don't process further
        }
        // Emit error first
        this._emitter.emit('error', { error, context } satisfies ErrorPayload);
        // Stop communication and transition to 'error' state, emitting 'close'
        const reason: ClientCloseReason = context === 'sse-reconnect-failed' ? 'sse-reconnect-failed'
                                        : context === 'poll-retry-failed' ? 'poll-retry-failed'
                                        : 'error-fatal';
        this._stopCommunication(reason, true); // true = emit close event
        return error; // Return the error after handling
    }

    private _resetCounters(): void {
        this._sseReconnectAttempts = 0;
        this._pollErrorAttempts = 0;
    }

    // --- Utility Helpers ---
    private _isTerminalState(state: ClientManagedState): boolean {
        return state === 'closed' || state === 'error';
    }
    private _isFinalTaskState(state: TaskState): boolean {
         return state === 'completed' || state === 'canceled' || state === 'failed';
    }

    private _getCloseReasonFromState(state: TaskState): ClientCloseReason {
        switch (state) {
            case 'completed': return 'task-completed';
            case 'canceled': return 'task-canceled-by-agent';
            case 'failed': return 'task-failed';
            default:
                 console.warn(`_getCloseReasonFromState called with non-final state: ${state}`);
                 return 'closed-by-caller'; // Fallback, should ideally not happen
        }
    }

     private _calculateBackoff(attempt: number, initialDelay: number, maxDelay: number): number {
         const baseDelay = initialDelay;
         const backoff = Math.min(maxDelay, baseDelay * Math.pow(2, attempt - 1));
         const jitter = backoff * 0.2 * (Math.random() - 0.5); // +/- 10% jitter
         return Math.round(backoff + jitter);
     }

}

// Custom error class for authentication issues
class AuthenticationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AuthenticationError';
    }
}

// Re-add SimpleEventEmitter implementation if not external
export class SimpleEventEmitter {
    private events: Record<string, Listener[]> = {};

    on(event: string, listener: Listener): void {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        // Avoid adding the same listener multiple times
        if (!this.events[event].includes(listener)) {
             this.events[event].push(listener);
        }
    }

    off(event: string, listener: Listener): void {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(l => l !== listener);
    }

    emit(event: string, ...args: any[]): void {
        if (!this.events[event]) return;
        // Use slice to avoid issues if listener removes itself during emit
        this.events[event].slice().forEach(listener => {
             try {
                 listener(...args);
             } catch (e) {
                 console.error(`Error in event listener for "${event}":`, e);
             }
         });
    }

    removeAllListeners(event?: string): void {
        if (event) {
            delete this.events[event];
        } else {
            this.events = {};
        }
    }
}
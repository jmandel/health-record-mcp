import * as A2ATypes from './types';
import { Task, TaskSendParams, TaskGetParams, TaskCancelParams, TaskStatus, TaskState, Artifact, Message, JsonRpcError, TaskSubscribeParams, TaskResubscribeParams, TaskStatusUpdateEvent, TaskArtifactUpdateEvent } from './types';
import { deepEqual } from './utils'; // Import the utility

// Simple EventEmitter - replace with a library like 'mitt' or 'eventemitter3' in a real implementation
type Listener = (...args: any[]) => void;
export class SimpleEventEmitter {
    private events: Record<string, Listener[]> = {};

    on(event: string, listener: Listener): void {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(listener);
    }

    off(event: string, listener: Listener): void {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(l => l !== listener);
    }

    emit(event: string, ...args: any[]): void {
        if (!this.events[event]) return;
        this.events[event].forEach(listener => listener(...args));
    }

    removeAllListeners(event?: string): void {
        if (event) {
            delete this.events[event];
        } else {
            this.events = {};
        }
    }
}


// --- Configuration ---
export interface A2AClientConfig {
    agentEndpointUrl: string;
    getAuthHeaders: () => Record<string, string> | Promise<Record<string, string>>;
    agentCardUrl?: string; // Optional: Defaults to endpoint + /.well-known/agent.json
    forcePoll?: boolean; // Default: false
    pollIntervalMs?: number; // Default: 2000
    sseMaxReconnectAttempts?: number; // Default: 5
    sseInitialReconnectDelayMs?: number; // Default: 1000
    sseMaxReconnectDelayMs?: number; // Default: 30000
    pollMaxErrorAttempts?: number; // Default: 3
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

export interface TaskUpdatePayload { task: A2ATypes.Task; }
export interface ErrorPayload {
    error: Error | A2ATypes.JsonRpcError; 
    context: ClientErrorContext;
}
export interface ClosePayload { reason: ClientCloseReason; }

export type ClientErrorContext =
    | 'config-validation'
    | 'agent-card-fetch'
    | 'agent-card-parse'
    | 'initial-send' // Error on initial tasks/send or tasks/sendSubscribe
    | 'sse-connect'
    | 'sse-stream'
    | 'sse-parse'
    | 'sse-reconnect-failed'
    | 'poll-get'
    | 'poll-retry-failed'
    | 'send' // Error on subsequent tasks/send
    | 'cancel'
    | 'internal'; // Unexpected client error

export type ClientCloseReason =
    | 'closed-by-caller'
    | 'task-completed'
    | 'task-canceled-by-agent'
    | 'task-canceled-by-client'
    | 'task-failed'
    | 'error-fatal'
    | 'sse-reconnect-failed'
    | 'poll-retry-failed'
    | 'sending-new-message'
    | 'canceling'
    | 'error-on-cancel'
    | 'closed-by-restart'; // Added for TaskLiaison restart scenario


// --- Main Client Class ---

export class A2AClient {
    public readonly taskId: string;
    private readonly config: A2AClientConfig;

    // Internal State
    private _emitter = new SimpleEventEmitter();
    private _agentCard: A2ATypes.AgentCard | null = null;
    private _strategy: 'sse' | 'poll' | 'unknown' = 'unknown';
    private _currentState: ClientManagedState = 'idle';
    private _lastKnownTask: A2ATypes.Task | null = null;
    private _abortController: AbortController | null = null;
    private _pollTimerId: ReturnType<typeof setTimeout> | null = null;
    private _reconnectTimerId: ReturnType<typeof setTimeout> | null = null;
    private _sseReconnectAttempts: number = 0;
    private _pollErrorAttempts: number = 0;

    // --- Static Factory ---

    /**
     * Creates a new A2AClient instance and initiates communication for a new task.
     * Handles async initialization steps internally.
     */
    public static async create(
        initialParams: A2ATypes.TaskSendParams,
        config: A2AClientConfig
    ): Promise<A2AClient> {
        // 1. Validate config (basic checks)
        if (!config.agentEndpointUrl || typeof config.getAuthHeaders !== 'function') {
            throw new Error("Invalid A2AClientConfig: agentEndpointUrl and getAuthHeaders are required.");
        }

        // 2. Generate task ID if absent
        const taskId = initialParams.id ?? crypto.randomUUID();
        const paramsWithId = { ...initialParams, id: taskId };

        // 3. Instantiate client
        const client = new A2AClient(taskId, config);
        client._currentState = 'initializing';

        // 4. Start async initialization (don't await here)
        client._initialize(paramsWithId).catch(error => {
            // Handle potential synchronous errors during early init steps if _initialize throws immediately
             client._handleFatalError(error, 'internal'); // Or a more specific context if possible
        });

        // 5. Return client instance immediately
        return client;
    }

    // Private constructor - use A2AClient.create()
    private constructor(taskId: string, config: A2AClientConfig) {
        this.taskId = taskId;
        // Set defaults for config
        this.config = {
            pollIntervalMs: 2000,
            sseMaxReconnectAttempts: 5,
            sseInitialReconnectDelayMs: 1000,
            sseMaxReconnectDelayMs: 30000,
            pollMaxErrorAttempts: 3,
            ...config, // User config overrides defaults
        };
        this._currentState = 'idle'; // Will be updated by create()
    }

    // --- Public API ---

    /**
     * Sends a subsequent message to the agent for the managed task.
     * Stops existing communication (SSE/polling) and restarts the flow.
     */
    public async send(message: A2ATypes.Message): Promise<void> {
        console.log('A2AClient.send called - Implementation Pending');
        if (this._currentState === 'closed' || this._currentState === 'error' || this._currentState === 'canceling' || this._currentState === 'sending') {
            throw new Error(`Cannot send message in state: ${this._currentState}`);
        }

        const reason: ClientCloseReason = 'sending-new-message';
        this._stopCommunication(reason); // Stop existing SSE/polling

        this._currentState = 'sending';
        this._pollErrorAttempts = 0; // Reset counters
        this._sseReconnectAttempts = 0;

        const params: A2ATypes.TaskSendParams = {
            id: this.taskId,
            sessionId: this._lastKnownTask?.sessionId, // Resend session ID if available
            message: message
        };

        try {
            // Re-determine strategy? Or assume it doesn't change mid-task?
            // Assuming strategy remains the same for simplicity.
            // If we need to re-fetch card/re-determine, do it here.
            if (!this._strategy || this._strategy === 'unknown') {
                // This shouldn't happen if initialized correctly, but handle defensively
                this._agentCard = await this._getAgentCard(this.config.agentCardUrl || new URL('/.well-known/agent.json', this.config.agentEndpointUrl).toString());
                this._strategy = this._determineStrategy();
            }
            await this._initiateCommunication(params);
        } catch (error: any) {
            this._handleFatalError(error, 'send');
        }
    }

    /**
     * Requests the agent to cancel the task and stops client communication.
     */
    public async cancel(): Promise<void> {
        console.log('A2AClient.cancel called');
        if (this._currentState === 'closed' || this._currentState === 'error' || this._currentState === 'canceling') {
            console.warn(`Cannot cancel task in state: ${this._currentState}`);
            return; // Or throw?
        }

        const reason: ClientCloseReason = 'canceling';
        this._stopCommunication(reason); // Stop existing SSE/polling immediately

        this._currentState = 'canceling';

        try {
            const result = await this._request<TaskCancelParams, Task>('tasks/cancel', { id: this.taskId });
            // Update task state based on cancel response
            this._updateTaskState(result);
             this._emitter.emit('task-update', { task: this.getCurrentTask()! } satisfies TaskUpdatePayload);
            this._updateStateAndEmitClose('task-canceled-by-client');
        } catch (error: any) {
            console.error('Error during tasks/cancel request:', error);
            // Emit error, but still transition to closed state
            this._emitter.emit('error', { error, context: 'cancel' } satisfies ErrorPayload);
            this._updateStateAndEmitClose('error-on-cancel' as ClientCloseReason); // Use a specific reason if needed
        }
    }

    /**
     * Permanently stops all communication (SSE/polling), cleans up resources,
     * and marks the client as closed.
     */
    public close(reason: ClientCloseReason = 'closed-by-caller'): void {
        console.log(`A2AClient.close called with reason: ${reason}`);
        if (this._currentState === 'closed') {
            return;
        }
        // The actual stopping logic is now centralized in _stopCommunication
        this._stopCommunication(reason);
         // _stopCommunication now calls _updateStateAndEmitClose internally
    }

    /**
     * Gets the latest known state of the task based on received events or polls.
     * Returns a deep copy.
     */
    public getCurrentTask(): A2ATypes.Task | null {
        // Simple deep copy for now, consider structuredClone or a library for robustness
        return this._lastKnownTask ? JSON.parse(JSON.stringify(this._lastKnownTask)) : null;
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

    // --- Internal Logic ---

    private async _initialize(initialParams: A2ATypes.TaskSendParams): Promise<void> {
        try {
            this._currentState = 'fetching-card';
            const agentCardUrl = this.config.agentCardUrl || new URL('/.well-known/agent.json', this.config.agentEndpointUrl).toString();
            this._agentCard = await this._getAgentCard(agentCardUrl);

            this._currentState = 'determining-strategy';
            this._strategy = this._determineStrategy();

            await this._initiateCommunication(initialParams);

        } catch (error: any) {
            // Determine context based on current state during the error
            let context: ClientErrorContext = 'internal';
            if (this._currentState === 'fetching-card') {
                context = error.message.includes('JSON') ? 'agent-card-parse' : 'agent-card-fetch';
            } else if (this._currentState === 'determining-strategy') {
                context = 'internal'; // Error likely happened after card fetch but before comms start
            } else if (this._currentState === 'starting-sse' || this._currentState === 'starting-poll') {
                context = 'initial-send'; // Error during the first send/subscribe call
            }
            // Add more specific context checks if needed based on where _initiateCommunication might fail

            this._handleFatalError(error, context);
        }
    }

    private async _getAgentCard(url: string): Promise<A2ATypes.AgentCard> {
        console.log(`A2AClient._getAgentCard: Fetching from ${url}`);
        let response: Response;
        try {
            // Use a separate AbortController for card fetch? Maybe not necessary unless we want to cancel it specifically.
            // Let's assume the main abort controller handles it if closed during fetch.
             this._abortController = new AbortController();
            response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
                signal: this._abortController.signal
            });
        } catch (error: any) {
             console.error('Agent Card fetch network error:', error);
             throw new Error(`Agent card fetch failed: ${error.message}`);
        }

        if (!response.ok) {
            console.error(`Agent Card fetch failed: ${response.status} ${response.statusText}`);
            throw new Error(`Agent card fetch failed: ${response.status} ${response.statusText}`);
        }

        try {
            const card = await response.json();
            // TODO: Add more robust validation of the AgentCard structure?
            if (!card || typeof card !== 'object' || !card.name || !card.url || !card.capabilities || !card.authentication) {
                console.error('Invalid Agent Card structure received:', card);
                throw new Error('Invalid Agent Card structure received.');
            }
            console.log('A2AClient._getAgentCard: Successfully fetched and parsed card.');
            return card as A2ATypes.AgentCard;
        } catch (error: any) {
            console.error('Agent Card JSON parse error:', error);
            throw new Error(`Agent card JSON parse failed: ${error.message}`);
        }
    }

    private _determineStrategy(): 'sse' | 'poll' {
        const canUseSse = this._agentCard?.capabilities?.streaming === true && !this.config.forcePoll;
        const strategy = canUseSse ? 'sse' : 'poll';
        console.log(`A2AClient._determineStrategy: Selected strategy: ${strategy} (SSE capable: ${this._agentCard?.capabilities?.streaming}, forcePoll: ${this.config.forcePoll})`);
        return strategy;
    }

    private async _initiateCommunication(params: A2ATypes.TaskSendParams): Promise<void> {
        console.log(`A2AClient._initiateCommunication (strategy: ${this._strategy})`);
        this._abortController = new AbortController();
        this._pollErrorAttempts = 0; // Reset counters
        this._sseReconnectAttempts = 0;

        try {
            if (this._strategy === 'sse') {
                this._currentState = 'starting-sse';
                console.log('A2AClient._initiateCommunication: Starting SSE with tasks/sendSubscribe...');
                // Cast params for sendSubscribe (same structure as send)
                await this._startSse('tasks/sendSubscribe', params as TaskSubscribeParams);
            } else {
                this._currentState = 'starting-poll';
                console.log('A2AClient._initiateCommunication: Starting Polling...');
                await this._startPolling(params);
            }
        } catch (error) {
            // Catch synchronous errors from _startSse or _startPolling
            console.error("A2AClient._initiateCommunication: Error during start:", error);
            this._handleFatalError(error as Error, 'initial-send');
        }
    }

    // --- SSE Handling ---

    private async _startSse(method: 'tasks/sendSubscribe' | 'tasks/resubscribe', params: TaskSubscribeParams | TaskResubscribeParams): Promise<void> {
        const isReconnect = method === 'tasks/resubscribe';
        console.log(`A2AClient._startSse: Starting SSE connection (Method: ${method}, Reconnect attempt: ${this._sseReconnectAttempts})`);

        // State is already 'starting-sse' or 'reconnecting-sse' before this is called

        const requestId = crypto.randomUUID();
        const requestBody: A2ATypes.JsonRpcRequest<any> = {
            jsonrpc: "2.0",
            id: requestId, // Include ID for SSE request for potential correlation? Spec is unclear here.
            method: method,
            params: params
        };

        let headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream', // Critical for SSE
        };

        try {
            const authHeaders = await this.config.getAuthHeaders();
            headers = { ...headers, ...authHeaders };
        } catch (error: any) {
            console.error(`A2AClient._startSse (${method}): Failed to get auth headers:`, error);
            // Treat auth failure as fatal before even attempting connection
             this._handleFatalError(new Error(`Failed to get authentication headers: ${error.message}`), 'internal');
            return;
        }

        let response: Response;
        try {
            // Use the current abort controller
            const signal = this._abortController?.signal;
            response = await fetch(this.config.agentEndpointUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody),
                signal: signal
            });

            // Check if aborted during fetch
             if (signal?.aborted) {
                console.log(`A2AClient._startSse (${method}): Fetch aborted.`);
                 // StopCommunication should handle state/cleanup
                return;
             }

            // Handle HTTP errors immediately
            if (!response.ok) {
                const errorText = await response.text().catch(() => `Status ${response.status}`);
                console.error(`A2AClient._startSse (${method}): HTTP error ${response.status}. Body: ${errorText}`);
                throw new Error(`SSE connection failed: ${response.status} ${response.statusText}`);
            }

            // Verify content type
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('text/event-stream')) {
                console.error(`A2AClient._startSse (${method}): Invalid content-type received: ${contentType}`);
                throw new Error(`Expected text/event-stream, got ${contentType}`);
            }

            if (!response.body) {
                throw new Error("SSE response body is null");
            }

            console.log(`A2AClient._startSse (${method}): SSE connection established, processing stream...`);
            this._currentState = 'connecting-sse'; // Connection successful, waiting for first event
            await this._processSseStream(response.body); // Start processing the stream

            // If _processSseStream finishes without error (e.g., server closed connection cleanly after final event)
            console.log(`A2AClient._startSse (${method}): SSE stream finished processing.`);
             // State/closure should be handled by the 'final: true' event within _processSseStream/_handleSseEvent
             // If it finishes without 'final: true', it might be an unexpected closure.

        } catch (error: any) {
            // Handle errors during fetch or initial connection setup
            console.error(`A2AClient._startSse (${method}): Error establishing SSE connection:`, error);

             // Check if the error is due to abort
             if (this._currentState === 'closed' || this._currentState === 'error' || this._currentState === 'canceling' || this._currentState === 'sending') {
                 console.warn(`A2AClient._startSse (${method}): Ignoring error as client state is ${this._currentState}`);
                 return;
             }

            // If not aborted and not fatal state, attempt reconnect
            this._emitter.emit('error', { error, context: 'sse-connect' } satisfies ErrorPayload);
            this._reconnectSse();
        }
    }

    private async _processSseStream(stream: ReadableStream<Uint8Array>): Promise<void> {
        let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
        try {
            reader = stream.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let eventDataBuffer = "";
            let eventType = "message"; // Default SSE event type

            while (true) {
                 // Check for abort signal before reading
                 if (this._abortController?.signal?.aborted) {
                    console.log("A2AClient._processSseStream: Abort detected, stopping stream processing.");
                    break; // Exit loop if aborted
                 }

                const { done, value } = await reader.read();

                if (done) {
                    console.log("A2AClient._processSseStream: Stream finished (done=true).");
                    // Process any remaining buffer content if server didn't end with \n\n
                    if (buffer.trim()) {
                        console.warn("A2AClient._processSseStream: Stream ended with unprocessed buffer:", buffer);
                        // Attempt to parse last incomplete event? Risky.
                    }
                    // If done is true, but we haven't received a final event, trigger reconnect?
                    // Or assume server closed connection cleanly after final event.
                    // Let's rely on the final:true flag in the event data. If it's missing, it's an issue.
                     if (this._currentState !== 'closed' && this._currentState !== 'error') {
                        console.warn("A2AClient._processSseStream: Stream closed by server without a final event.");
                        // Consider this an error and attempt reconnect? Or just close?
                        // Let's try reconnecting.
                        this._reconnectSse();
                     }
                    break; // Exit loop
                }

                buffer += decoder.decode(value, { stream: true });

                // Process buffer line by line, looking for event boundaries (\n\n)
                let boundaryIndex;
                while ((boundaryIndex = buffer.indexOf('\n\n')) >= 0) {
                    const eventBlock = buffer.substring(0, boundaryIndex);
                    buffer = buffer.substring(boundaryIndex + 2); // Consume block + boundary

                    if (!eventBlock.trim()) continue; // Skip empty blocks

                    // Reset for next event
                    eventDataBuffer = "";
                    eventType = "message";

                    // Parse lines within the block
                    for (const line of eventBlock.split('\n')) {
                        if (line.startsWith(':')) continue; // Ignore comments
                        const separatorIndex = line.indexOf(':');
                        if (separatorIndex === -1) continue; // Ignore lines without ':'

                        const field = line.substring(0, separatorIndex).trim();
                        const val = line.substring(separatorIndex + 1).trim();

                        switch (field) {
                            case 'event':
                                eventType = val;
                                break;
                            case 'data':
                                // Append data, handling multi-line data fields
                                eventDataBuffer += (eventDataBuffer ? '\n' : '') + val;
                                break;
                            // case 'id': // Handle lastEventId if needed for reconnect logic
                            // case 'retry': // Handle retry interval if needed
                            //     break;
                        }
                    }

                    // Process the complete event data
                    if (eventDataBuffer) {
                        try {
                            const parsedData = JSON.parse(eventDataBuffer);
                            // Check if the client was closed/aborted while parsing/processing
                             if (this._currentState === 'closed' || this._currentState === 'error' || this._abortController?.signal?.aborted) {
                                console.log("A2AClient._processSseStream: Client closed/aborted during event processing, discarding event:", eventType);
                                continue; // Skip handling if closed
                             }
                            this._handleSseEvent(eventType, parsedData);
                        } catch (parseError: any) {
                            console.error("A2AClient._processSseStream: Failed to parse SSE event data JSON:", parseError, "Data:", eventDataBuffer);
                             if (this._currentState !== 'closed' && this._currentState !== 'error') {
                                this._emitter.emit('error', { error: parseError, context: 'sse-parse' } satisfies ErrorPayload);
                             }
                            // Don't stop processing the stream for a single parse error
                        }
                    }
                } // end while(boundaryIndex)
            } // end while(true) reader loop

        } catch (error: any) {
            // Handle errors from reader.read() or decoder
            // console.error("A2AClient._processSseStream: Error reading or processing SSE stream:", error.name, error);
             if (this._currentState !== 'closed' && this._currentState !== 'error' && this._currentState !== 'canceling' && this._currentState !== 'sending') {
                 // If error wasn't due to abort/close, attempt reconnect
                 if (error.name !== 'AbortError') {
                    this._emitter.emit('error', { error, context: 'sse-stream' } satisfies ErrorPayload);
                    this._reconnectSse();
                 }
             }
        } finally {
            if (reader) {
                try {
                    reader.releaseLock(); // Release lock if stream processing stopped unexpectedly
                     if (!reader.closed) { // Try cancelling if still open
                        await reader.cancel().catch(e => console.warn("Error cancelling SSE reader:", e));
                     }
                } catch (e) {
                    console.warn("Error releasing SSE reader lock:", e);
                }
            }
        }
    }

    private _handleSseEvent(eventType: string, eventData: any): void {
        console.log(`A2AClient._handleSseEvent: Received SSE event type: ${eventType}`); // Add data logging cautiously

        // Reset reconnect attempts on any valid event received
        this._sseReconnectAttempts = 0;
        if (this._reconnectTimerId) {
            clearTimeout(this._reconnectTimerId);
            this._reconnectTimerId = null;
        }

        // Update state if connecting
        if (this._currentState === 'connecting-sse') {
            this._currentState = 'connected-sse';
             console.log(`A2AClient._handleSseEvent: State transitioned to connected-sse`);
        }

        // Ensure we have a task object to update, create a shell if not (e.g., for resubscribe)
        if (!this._lastKnownTask) {
            console.warn("A2AClient._handleSseEvent: _lastKnownTask is null. Creating shell task.");
            // Create a minimal task shell - resubscribe should ideally send initial state?
            this._lastKnownTask = {
                id: this.taskId,
                status: { state: 'unknown', timestamp: new Date().toISOString() }, // Unknown state initially
                artifacts: [],
                history: [],
                 createdAt: new Date().toISOString(), // Placeholder
                 updatedAt: new Date().toISOString(), // Placeholder
            };
        }

        try {
            switch (eventType) {
                case 'TaskStatusUpdate': {
                    const statusUpdate = eventData as TaskStatusUpdateEvent;
                    if (!statusUpdate || !statusUpdate.status) {
                         console.warn("Invalid TaskStatusUpdate event received:", eventData); return;
                    }
                    console.log(`A2AClient._handleSseEvent: TaskStatusUpdate - State: ${statusUpdate.status.state}, Final: ${statusUpdate.final}`);

                    const oldStatus = this._lastKnownTask.status;
                    const newStatus = statusUpdate.status;

                    // Emit status-update event
                    this._emitter.emit('status-update', statusUpdate satisfies TaskStatusUpdateEvent);

                    // Update internal task state
                    this._lastKnownTask.status = newStatus;
                    this._lastKnownTask.updatedAt = newStatus.timestamp; // Update timestamp

                    // Emit full task-update event
                    this._emitter.emit('task-update', { task: this.getCurrentTask()! } satisfies TaskUpdatePayload);

                    // Check for input required transition
                    if (newStatus.state === 'input-required' && oldStatus.state !== 'input-required') {
                        this._currentState = 'input-required';
                        console.log("A2AClient._handleSseEvent: State set to input-required.");
                        // Polling/SSE stream processing should inherently pause if state is input-required
                        // because _reconnectSse and _pollTaskLoop check the state.
                    } else if (newStatus.state !== 'input-required' && this._currentState === 'input-required') {
                        // Transitioning out of input-required
                         this._currentState = 'connected-sse'; // Go back to connected state
                    }


                    // Check for final event
                    if (statusUpdate.final) {
                        console.log("A2AClient._handleSseEvent: Final event received. Closing communication.");
                        const reason = this._getCloseReasonFromState(newStatus.state);
                        this._stopCommunication(reason);
                    }
                    break;
                }

                case 'TaskArtifactUpdate': {
                    const artifactUpdate = eventData as TaskArtifactUpdateEvent;
                     if (!artifactUpdate || !artifactUpdate.artifact || typeof artifactUpdate.artifact.index !== 'number') {
                        console.warn("Invalid TaskArtifactUpdate event received:", eventData); return;
                    }
                    const artifact = artifactUpdate.artifact;
                    console.log(`A2AClient._handleSseEvent: TaskArtifactUpdate - Index: ${artifact.index}, Append: ${artifact.append}, Parts: ${artifact.parts?.length}, LastChunk: ${artifact.lastChunk}`);

                    // Ensure artifacts array exists
                    if (!this._lastKnownTask.artifacts) {
                        this._lastKnownTask.artifacts = [];
                    }

                    // Find existing artifact by index
                    let existingArtifact = this._lastKnownTask.artifacts.find(a => a.index === artifact.index);

                    if (artifact.append && existingArtifact) {
                        // Append parts to existing artifact
                         if (!existingArtifact.parts) existingArtifact.parts = [];
                        existingArtifact.parts.push(...artifact.parts);
                        // Update other metadata if needed (e.g., description, name - though append shouldn't change these?)
                         existingArtifact.lastChunk = artifact.lastChunk; // Update lastChunk status
                         existingArtifact.timestamp = artifact.timestamp || new Date().toISOString(); // Update timestamp
                        console.log(`A2AClient._handleSseEvent: Appended parts to artifact index ${artifact.index}. Total parts: ${existingArtifact.parts.length}`);
                    } else {
                        // Replace or add new artifact
                        if (existingArtifact) {
                             console.log(`A2AClient._handleSseEvent: Replacing artifact at index ${artifact.index}.`);
                             const idx = this._lastKnownTask.artifacts.indexOf(existingArtifact);
                             this._lastKnownTask.artifacts[idx] = artifact; // Replace
                        } else {
                             console.log(`A2AClient._handleSseEvent: Adding new artifact at index ${artifact.index}.`);
                             // Ensure array is large enough (might receive out of order theoretically?)
                             // Simple push assumes order for now. More robust: sort or place by index.
                             this._lastKnownTask.artifacts.push(artifact);
                             // Sort by index after push to maintain order?
                             this._lastKnownTask.artifacts.sort((a, b) => a.index - b.index);
                        }
                        existingArtifact = artifact; // Point to the newly added/replaced artifact
                    }
                    this._lastKnownTask.updatedAt = new Date().toISOString(); // Update task timestamp

                    // Emit artifact-update event with the *complete, updated* artifact
                    this._emitter.emit('artifact-update', { id: this.taskId, artifact: existingArtifact } satisfies TaskArtifactUpdateEvent);

                    // Emit full task-update event
                    this._emitter.emit('task-update', { task: this.getCurrentTask()! } satisfies TaskUpdatePayload);
                    break;
                }

                default:
                    console.warn(`A2AClient._handleSseEvent: Received unknown SSE event type: ${eventType}`);
                    break;
            }
        } catch (e: any) {
            // Catch errors during event handling/state update
             console.error(`A2AClient._handleSseEvent: Error processing event ${eventType}:`, e);
             // Emit non-fatal error? Or potentially fatal if state is corrupted?
              this._emitter.emit('error', { error: e, context: 'internal' } satisfies ErrorPayload);
        }
    }

    private _reconnectSse(): void {
         // Check state before attempting reconnect
         if (this._currentState === 'closed' || this._currentState === 'error' || this._currentState === 'canceling' || this._currentState === 'sending') {
             console.log(`A2AClient._reconnectSse: Cannot reconnect in state ${this._currentState}.`);
             return;
         }
          if (this._reconnectTimerId) {
             console.log("A2AClient._reconnectSse: Reconnect already scheduled.");
             return; // Prevent multiple reconnect schedules
         }

        this._sseReconnectAttempts++;
        console.log(`A2AClient._reconnectSse: Attempting SSE reconnect (${this._sseReconnectAttempts}/${this.config.sseMaxReconnectAttempts}).`);

        if (this._sseReconnectAttempts > this.config.sseMaxReconnectAttempts!) {
            console.error("A2AClient._reconnectSse: Max SSE reconnect attempts exceeded.");
             this._handleFatalError(new Error("SSE reconnection failed."), 'sse-reconnect-failed');
            return;
        }

        // Calculate backoff delay (exponential with jitter)
        const baseDelay = this.config.sseInitialReconnectDelayMs!;
        const maxDelay = this.config.sseMaxReconnectDelayMs!;
        const backoff = Math.min(maxDelay, baseDelay * Math.pow(2, this._sseReconnectAttempts - 1));
        const jitter = backoff * 0.1 * Math.random(); // Add +/- 10% jitter
        const delay = Math.round(backoff + jitter);

        console.log(`A2AClient._reconnectSse: Scheduling reconnect in ${delay}ms.`);
        this._currentState = 'reconnecting-sse';

        this._reconnectTimerId = setTimeout(async () => {
             if (this._currentState !== 'reconnecting-sse') {
                 console.log(`A2AClient._reconnectSse: Reconnect timer fired, but state is now ${this._currentState}. Aborting reconnect attempt.`);
                 this._reconnectTimerId = null;
                 return;
             }
            this._reconnectTimerId = null; // Clear timer ID before starting
            try {
                await this._startSse('tasks/resubscribe', { id: this.taskId });
            } catch (error) {
                 // _startSse should handle its own errors and potentially call _reconnectSse again
                 console.error("A2AClient._reconnectSse: Error during reconnect attempt initiation:", error);
            }
        }, delay);
    }

    // --- Polling Handling ---
    private async _startPolling(params: A2ATypes.TaskSendParams): Promise<void> {
        console.log('A2AClient._startPolling: Sending initial tasks/send');
        try {
            const initialTask = await this._request<TaskSendParams, Task>('tasks/send', params);
            console.log('A2AClient._startPolling: Received initial task response');

            // Process initial response (diff logic not needed for first response)
            this._updateTaskState(initialTask);

             // Emit initial events based *only* on the first response
             this._emitter.emit('status-update', { id: this.taskId, status: initialTask.status, final: false } satisfies A2ATypes.TaskStatusUpdateEvent);
             initialTask.artifacts?.forEach(artifact => {
                 this._emitter.emit('artifact-update', { id: this.taskId, artifact } satisfies A2ATypes.TaskArtifactUpdateEvent);
             });
             this._emitter.emit('task-update', { task: this.getCurrentTask()! } satisfies TaskUpdatePayload);

            // Check initial state for completion or input required
            if (this._isFinalState(initialTask.status.state)) {
                const reason = this._getCloseReasonFromState(initialTask.status.state);
                console.log(`A2AClient._startPolling: Task finished on initial response (${initialTask.status.state}). Closing.`);
                this._stopCommunication(reason);
            } else if (initialTask.status.state === 'input-required') {
                console.log('A2AClient._startPolling: Task requires input on initial response.');
                this._currentState = 'input-required'; // Set state explicitly
                // Do NOT start polling loop if input is required
            } else {
                // Task is active, start polling
                console.log('A2AClient._startPolling: Task active, starting poll loop.');
                this._currentState = 'polling';
                this._pollTaskLoop();
            }

        } catch (error: any) {
            console.error('A2AClient._startPolling: Error during initial tasks/send:', error);
            this._handleFatalError(error, 'initial-send');
        }
    }

    private _pollTaskLoop(): void {
        if (this._currentState !== 'polling' && this._currentState !== 'retrying-poll') {
             console.log(`A2AClient._pollTaskLoop: Not scheduling poll, state is ${this._currentState}`);
            return;
        }

        // Clear existing timer before setting a new one
        if (this._pollTimerId) {
            clearTimeout(this._pollTimerId);
        }

        console.log(`A2AClient._pollTaskLoop: Scheduling next poll in ${this.config.pollIntervalMs}ms`);
        this._pollTimerId = setTimeout(async () => {
            if (this._currentState !== 'polling' && this._currentState !== 'retrying-poll') {
                 console.log('A2AClient._pollTaskLoop: Poll timer fired, but state changed. Aborting poll.');
                 return;
            }
            await this._pollTask();
        }, this.config.pollIntervalMs);
    }

    private async _pollTask(): Promise<void> {
         if (this._currentState !== 'polling' && this._currentState !== 'retrying-poll') {
             console.log(`A2AClient._pollTask: Aborting poll, state is ${this._currentState}`);
             return; // Prevent race conditions if state changed while timer was pending
         }

        console.log('A2AClient._pollTask: Performing tasks/get');
        this._currentState = 'polling'; // Ensure we are in polling state

        try {
            const getParams: TaskGetParams = { id: this.taskId, historyLength: 0 }; // History length 0 for now
            const newTask = await this._request<TaskGetParams, Task>('tasks/get', getParams);
            console.log('A2AClient._pollTask: Received tasks/get response');

            this._pollErrorAttempts = 0; // Reset error count on successful poll

            // Diff and emit updates
            this._diffAndEmitUpdates(newTask);

            // Check new state for completion or input required
            if (this._isFinalState(newTask.status.state)) {
                const reason = this._getCloseReasonFromState(newTask.status.state);
                console.log(`A2AClient._pollTask: Task finished (${newTask.status.state}). Stopping poll.`);
                this._stopCommunication(reason);
            } else if (newTask.status.state === 'input-required') {
                 console.log('A2AClient._pollTask: Task requires input. Stopping poll.');
                // State already updated by _diffAndEmitUpdates if needed
                // Event already emitted by _diffAndEmitUpdates
                // Do NOT schedule next poll
            } else {
                // Task still active, schedule next poll
                this._pollTaskLoop();
            }

        } catch (error: any) {
            this._pollErrorAttempts++;
            console.error(`A2AClient._pollTask: Error during tasks/get (attempt ${this._pollErrorAttempts}/${this.config.pollMaxErrorAttempts}):`, error);
            this._emitter.emit('error', { error, context: 'poll-get' } satisfies ErrorPayload);

            if (this._pollErrorAttempts >= this.config.pollMaxErrorAttempts!) {
                console.error('A2AClient._pollTask: Max poll retries exceeded.');
                this._handleFatalError(new Error(`Polling failed after ${this.config.pollMaxErrorAttempts} attempts.`), 'poll-retry-failed');
            } else {
                // Schedule retry
                this._currentState = 'retrying-poll';
                console.log(`A2AClient._pollTask: Scheduling poll retry.`);
                this._pollTaskLoop();
            }
        }
    }

    // Updates internal state and emits synthetic events based on diff
    private _diffAndEmitUpdates(newTask: Task): void {
        const oldTask = this._lastKnownTask; // Keep reference to old task for comparison

        if (!oldTask) {
            console.warn('A2AClient._diffAndEmitUpdates: No previous task state found. Emitting initial events.');
            this._updateTaskState(newTask); // Update internal state first
            this._emitSyntheticEvents(newTask);
            // Check for input required on initial load
            if (newTask.status.state === 'input-required') {
                 this._currentState = 'input-required';
                 // Polling loop is prevented in _pollTask if state becomes input-required
            }
            return;
        }

        let statusChanged = false;
        // Diff Status: Use deep compare for safety
        if (!deepEqual(newTask.status, oldTask.status)) {
            console.log(`A2AClient._diffAndEmitUpdates: Status changed from ${oldTask.status.state} (${oldTask.status.timestamp}) to ${newTask.status.state} (${newTask.status.timestamp})`);
            statusChanged = true;
            this._emitter.emit('status-update', {
                id: this.taskId,
                status: newTask.status,
                final: false // Polling never knows if status update is final
            } satisfies A2ATypes.TaskStatusUpdateEvent);
        }

        // Diff Artifacts: Check for *new* artifacts by index or length
        const oldArtifacts = oldTask.artifacts ?? [];
        const newArtifacts = newTask.artifacts ?? [];
        let artifactsChanged = false;
        if (newArtifacts.length > oldArtifacts.length) {
            console.log(`A2AClient._diffAndEmitUpdates: Detected ${newArtifacts.length - oldArtifacts.length} new artifacts.`);
            artifactsChanged = true;
            for (let i = oldArtifacts.length; i < newArtifacts.length; i++) {
                const newArtifact = newArtifacts[i]; // Fixed: Removed unnecessary non-null assertion
                this._emitter.emit('artifact-update', {
                    id: this.taskId,
                    artifact: newArtifact
                } satisfies A2ATypes.TaskArtifactUpdateEvent);
            }
        }
        // TODO: Add diffing for appends/updates within existing artifact indices if needed?

        // Update internal state *after* diffing but *before* emitting task-update/input-required
        this._updateTaskState(newTask);

        // Emit task-update if status or artifacts changed
        if (statusChanged || artifactsChanged) {
            console.log(`A2AClient._diffAndEmitUpdates: Emitting task-update.`);
            // Use the *newly updated* task state via getCurrentTask()
            this._emitter.emit('task-update', { task: this.getCurrentTask()! } satisfies TaskUpdatePayload);
        } else {
            console.log(`A2AClient._diffAndEmitUpdates: No significant changes detected in status or artifacts.`);
        }

        // Check for transition *into* input-required state
        if (newTask.status.state === 'input-required' && oldTask.status.state !== 'input-required') {
            console.log('A2AClient._diffAndEmitUpdates: Transitioned to input-required state.');
            this._currentState = 'input-required'; // Ensure state is set
            // Polling loop is prevented in _pollTask if state becomes input-required
        } else if (newTask.status.state !== 'input-required' && this._currentState === 'input-required') {
            // Handle transition *out* of input-required (e.g., if agent somehow recovers)
            console.log('A2AClient._diffAndEmitUpdates: Transitioned out of input-required state.');
            // If polling, restart the loop
            if (this._strategy === 'poll' && !this._isFinalState(newTask.status.state)) {
                this._currentState = 'polling';
                this._pollTaskLoop();
            }
            // If SSE, the stream should handle it.
        }
    }

    // Helper to emit initial/polled events
    private _emitSyntheticEvents(task: Task): void {
        this._emitter.emit('status-update', { id: this.taskId, status: task.status, final: false } satisfies A2ATypes.TaskStatusUpdateEvent);
        task.artifacts?.forEach(artifact => {
            this._emitter.emit('artifact-update', { id: this.taskId, artifact } satisfies A2ATypes.TaskArtifactUpdateEvent);
        });
        // Ensure getCurrentTask() reflects the task passed in or the updated internal state
        // It might be safer to pass the task directly if _updateTaskState hasn't been called yet in some flows
        const currentTaskSnapshot = this.getCurrentTask(); // Get the latest snapshot
        if (currentTaskSnapshot) {
            this._emitter.emit('task-update', { task: currentTaskSnapshot } satisfies TaskUpdatePayload);
        } else {
            // Fallback if getCurrentTask somehow returns null immediately after update
            console.warn("_emitSyntheticEvents: getCurrentTask returned null unexpectedly, using provided task object for update event.")
             this._emitter.emit('task-update', { task: JSON.parse(JSON.stringify(task)) } satisfies TaskUpdatePayload);
        }
    }

    // Helper to update the internal task state (uses structuredClone)
    private _updateTaskState(newTask: Task): void {
        // Use structuredClone for a proper deep copy if available, else fallback
        if (typeof structuredClone === 'function') {
            this._lastKnownTask = structuredClone(newTask);
        } else {
            this._lastKnownTask = JSON.parse(JSON.stringify(newTask)); // Fallback, less robust
        }
         // Update internal state based on task status *if* not already handled by specific flows
         if (this._currentState !== 'input-required' && this._currentState !== 'canceling' && this._currentState !== 'sending' && !this._isFinalState(this._currentState as TaskState) && !this._isFinalState(newTask.status.state) ) {
              if (newTask.status.state === 'working' || newTask.status.state === 'submitted') {
                 // If polling was successful, ensure we are in 'polling' state for next loop
                 if (this._strategy === 'poll') this._currentState = 'polling';
                 // If SSE, state should be 'connected-sse' (handled by SSE logic)
             }
         }
    }

    // --- Core Communication ---
    private async _request<TParams, TResult>(method: string, params: TParams): Promise<TResult> {
        console.log(`A2AClient._request: Sending method '${method}'`);
        const requestId = crypto.randomUUID(); // Use UUID for request IDs
        const requestBody: A2ATypes.JsonRpcRequest<TParams> = {
            jsonrpc: "2.0",
            id: requestId,
            method: method,
            params: params
        };

        let headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        try {
            const authHeaders = await this.config.getAuthHeaders();
            headers = { ...headers, ...authHeaders };
        } catch (error: any) {
            console.error('A2AClient._request: Failed to get auth headers:', error);
            // Decide if this is fatal or if we proceed without auth
            // For now, let's make it fatal as per the design (enterprise ready)
            throw new Error(`Failed to get authentication headers: ${error.message}`);
        }

        let response: Response;
        try {
             // Use the current abort controller if available
             const signal = this._abortController?.signal;
            response = await fetch(this.config.agentEndpointUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody),
                signal: signal
            });
        } catch (error: any) {
            // Network errors or aborts
            console.error(`A2AClient._request: Fetch error for method '${method}':`, error);
            if (error.name === 'AbortError') {
                throw new Error(`Request aborted: ${method}`);
            }
            throw new Error(`Network error during request: ${error.message}`);
        }

        if (!response.ok) {
             // Log more detail for HTTP errors
             const responseText = await response.text().catch(() => '{Could not read response body}');
             console.error(`A2AClient._request: HTTP error for method '${method}': ${response.status} ${response.statusText}. Body: ${responseText}`);
            throw new Error(`HTTP error ${response.status} for method ${method}`);
        }

        let responseData: A2ATypes.JsonRpcResponse<TResult>;
        try {
            responseData = await response.json();
        } catch (error: any) {
            console.error(`A2AClient._request: JSON parse error for method '${method}':`, error);
            throw new Error(`Failed to parse JSON response: ${error.message}`);
        }

        // Check for JSON-RPC level errors
        if ('error' in responseData && responseData.error) {
            console.warn(`A2AClient._request: Received JSON-RPC error for method '${method}':`, responseData.error);
            // Throw the structured error object
            throw responseData.error; // Throw the JsonRpcError directly
        }

        // Check for success response structure
        if ('result' in responseData) {
             console.log(`A2AClient._request: Successfully received result for method '${method}'`);
            return responseData.result;
        } else {
            // Should not happen if server conforms to JSON-RPC
            console.error(`A2AClient._request: Invalid JSON-RPC response structure for method '${method}':`, responseData);
            throw new Error('Invalid JSON-RPC response structure received.');
        }
    }

    // --- Cleanup & State Management ---
    private _stopCommunication(reason: ClientCloseReason): void {
        console.log(`A2AClient._stopCommunication: Stopping communication with reason: "${reason}" (Current state: ${this._currentState}, Strategy: ${this._strategy})`);

        if (this._currentState === 'closed' || this._currentState === 'error') {
            console.log(`A2AClient._stopCommunication: Already in final state ${this._currentState}. Doing nothing.`);
            return;
        }

        const previousState = this._currentState;
        let targetState: ClientManagedState = 'closed'; // Default target
        // Determine target state based on reason
        if (reason === 'error-fatal' || reason === 'sse-reconnect-failed' || reason === 'poll-retry-failed' || reason === 'error-on-cancel') {
            targetState = 'error';
        } else if (reason === 'sending-new-message') {
            targetState = 'sending';
        } else if (reason === 'canceling') {
            targetState = 'canceling';
        }

        // Abort any in-flight fetch *before* potentially changing state
        if (this._abortController) {
            console.log('A2AClient._stopCommunication: Aborting fetch controller.');
            this._abortController.abort();
            this._abortController = null;
        }

        // Stop specific communication method (clears timers)
        if (this._strategy === 'sse') {
            this._stopSse(); // Clears reconnect timer
        } else {
            this._stopPolling(); // Clears poll timer
        }

        // Set the final state *unless* it's an intermediate stop reason
        if (targetState === 'closed' || targetState === 'error') {
            console.log(`A2AClient._stopCommunication: Transitioning state from ${previousState} to ${targetState}`);
            this._currentState = targetState;
            // Emit close event ONLY if transitioning to a final closed/error state
            this._updateStateAndEmitClose(reason);
        } else {
            console.log(`A2AClient._stopCommunication: Intermediate stop for reason "${reason}". State will be set by caller to ${targetState}.`);
            // State transition ('sending', 'canceling') is handled by the calling public method (_send, _cancel)
        }
    }

    private _stopSse(): void {
        console.log('A2AClient._stopSse: Stopping SSE specific resources.');
        // Abort fetch (handled by _stopCommunication via abortController)

        // Clear reconnect timer if it's active
        if (this._reconnectTimerId) {
            console.log('A2AClient._stopSse: Clearing SSE reconnect timer.');
            clearTimeout(this._reconnectTimerId);
            this._reconnectTimerId = null;
        }
        this._sseReconnectAttempts = 0; // Reset counter
        // Note: Actual closing of the SSE stream reader happens in _processSseStream or via abort controller
    }

    private _stopPolling(): void {
        console.log('A2AClient._stopPolling: Stopping polling timer.');
        if (this._pollTimerId) {
            clearTimeout(this._pollTimerId);
            this._pollTimerId = null;
        }
    }

    private _updateStateAndEmitClose(reason: ClientCloseReason): void {
        // This method now only handles the event emission and listener cleanup
        // State setting is handled in _stopCommunication or _handleFatalError
        console.log(`A2AClient._updateStateAndEmitClose: Emitting close event with reason: ${reason}`);
         if (this._currentState !== 'closed' && this._currentState !== 'error') {
             console.warn(`A2AClient._updateStateAndEmitClose called but state is ${this._currentState}. Force setting state to closed.`);
             this._currentState = 'closed'; // Ensure state is final
         }
        this._emitter.emit('close', { reason } satisfies ClosePayload);
        this._emitter.removeAllListeners(); // Clean up listeners on final close
    }

    // Centralized error handler for fatal errors
    private _handleFatalError(error: Error | A2ATypes.JsonRpcError, context: ClientErrorContext): void {
        console.error(`A2AClient Fatal Error (${context}):`, error);
         if (this._currentState === 'error' || this._currentState === 'closed') {
             return;
         }
         const reason: ClientCloseReason = 'error-fatal';
         // Emit error first, before changing state and stopping comms
         this._emitter.emit('error', { error, context } satisfies ErrorPayload);

         // Stop communication and set state to error
         // Pass the specific fatal reason derived from the context if needed
         // For simplicity, using 'error-fatal' for now.
         this._stopCommunication(reason);
    }

    // --- Utility Helpers ---
    private _isFinalState(state: TaskState | ClientManagedState): boolean {
        return state === 'completed' || state === 'canceled' || state === 'failed' || state === 'closed' || state === 'error';
    }

    private _getCloseReasonFromState(state: TaskState): ClientCloseReason {
        switch (state) {
            case 'completed': return 'task-completed';
            case 'canceled': return 'task-canceled-by-agent'; // Assume agent canceled if we poll and find this
            case 'failed': return 'task-failed';
            default: return 'closed-by-caller'; // Should not happen for final task states
        }
    }
}
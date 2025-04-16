import type * as express from 'express';
import { randomUUID } from 'node:crypto';
import type { TaskStore, GetAuthContextFn, NotificationService } from '../interfaces';
import type { TaskProcessorV2, ProcessorYieldValue, ProcessorInputValue, ProcessorInputMessage, ProcessorInputInternal, ProcessorStepContext } from '../interfaces/processorV2';
import { ProcessorCancellationError } from '../interfaces/processorV2';
import * as A2ATypes from '../types';
import { A2AErrorCodes, type AgentCard, type Task, type Message, type Artifact, type TaskState, type TaskStatus, type TaskStatusUpdateEvent, type TaskArtifactUpdateEvent } from '../types';
import { SseConnectionManager } from './SseConnectionManager';

// Define CoreTaskEvent locally if SseConnectionManager expects it
type CoreTaskEvent = TaskStatusUpdateEvent | TaskArtifactUpdateEvent;

// Define a specific config type for V2
export interface A2AServerConfigV2 {
    agentCard: Partial<AgentCard>; // Accept partial card
    taskStore: TaskStore;
    taskProcessors: TaskProcessorV2[]; // Use V2 processors directly
    notificationServices?: NotificationService[];
    getAuthContext?: GetAuthContextFn;
    maxHistoryLength?: number;
    baseUrl?: string; // Add base URL for constructing card URL
    rpcPath?: string; // Add RPC path (defaults to /a2a)
}

// Structure to hold active generator state
interface ActiveGeneratorState {
    generator: AsyncGenerator<ProcessorYieldValue, void, ProcessorInputValue>;
    context: ProcessorStepContext; // Store the context object here
    isCanceling?: boolean; // Flag to indicate cancellation is in progress
}

export class A2AServerCoreV2 {
    // Store the complete card internally
    private readonly completeAgentCard: AgentCard;
    private readonly taskStore: TaskStore;
    private readonly processors: TaskProcessorV2[];
    private readonly notificationServices: NotificationService[];
    private readonly getAuthContext?: GetAuthContextFn;
    private readonly maxHistoryLength: number;
    private readonly sseManager: SseConnectionManager | null = null;

    // Map to store active running/paused generators and their cancellation state
    private readonly activeGenerators: Map<string, ActiveGeneratorState> = new Map();
    // Map to sequence processing for each task
    private readonly taskProcessingPromises: Map<string, Promise<any>> = new Map();

    constructor(config: A2AServerConfigV2) { // Use specific V2 config type
        this.taskStore = config.taskStore;
        this.processors = config.taskProcessors; // No cast needed
        this.notificationServices = config.notificationServices ?? [];
        this.getAuthContext = config.getAuthContext;
        this.maxHistoryLength = config.maxHistoryLength ?? 50;

        // --- Build Complete Agent Card --- //
        const port = process.env.PORT || '3001'; // Default port if not specified via baseUrl
        const defaultBaseUrl = `http://localhost:${port}`;
        const baseUrl = config.baseUrl ?? defaultBaseUrl;
        const rpcPath = config.rpcPath ?? '/a2a';
        this.completeAgentCard = {
            // Required fields with defaults
            name: config.agentCard.name ?? 'Unnamed Agent',
            version: config.agentCard.version ?? '0.0.0',
            description: config.agentCard.description ?? 'No description provided',
            url: `${baseUrl.replace(/\/$/, '')}${rpcPath}`, // Construct full URL
            capabilities: { streaming: false, pushNotifications: false, stateTransitionHistory: false, ...config.agentCard.capabilities },
            authentication: { schemes: [], ...config.agentCard.authentication },
            defaultInputModes: config.agentCard.defaultInputModes ?? ['text/plain'],
            defaultOutputModes: config.agentCard.defaultOutputModes ?? ['text/plain'],
            skills: config.agentCard.skills ?? [],
            // Optional fields
            provider: config.agentCard.provider,
            documentationUrl: config.agentCard.documentationUrl,
        };

        // Validate essential fields
        if (!this.completeAgentCard.name || !this.completeAgentCard.version || !this.completeAgentCard.url) {
            throw new Error("A2A Core V2: AgentCard is missing required fields (name, version, url) after construction.");
        }

        // --- Initialize SSE Manager --- //
        this.sseManager = this.notificationServices.find(
            (service): service is SseConnectionManager => service instanceof SseConnectionManager
        ) ?? null;

        if (this.processors.length === 0) {
            console.warn("[A2ACoreV2] No TaskProcessors (V2) configured.");
        }
        if (this.completeAgentCard.capabilities?.streaming && !this.sseManager) {
            console.warn("[A2ACoreV2] Streaming enabled in AgentCard but SseConnectionManager not found in notificationServices.");
        }

        console.log(`[A2ACoreV2] Initialized for agent: ${this.completeAgentCard.name} (v${this.completeAgentCard.version})`);
    }

    getAgentCard(): AgentCard {
        // Return the fully constructed card
        return this.completeAgentCard;
    }

    // --- Core Task Handling ---

    async handleTaskSend(params: A2ATypes.TaskSendParams, authContext?: any): Promise<A2ATypes.Task> {
        const existingTask = params.id ? await this.taskStore.getTask(params.id) : undefined;
        const activeState = params.id ? this.activeGenerators.get(params.id) : undefined;

        if (existingTask && activeState) {
            // Task exists and generator is active/paused - attempt to resume
            console.log(`[A2ACoreV2] Resuming generator for task ${params.id}`);
            if (activeState.isCanceling) {
                 throw this._createError(A2AErrorCodes.InvalidRequest, `Task ${params.id} is currently being canceled and cannot accept input.`);
            }
            if (this._isFinalState(existingTask.status.state) && existingTask.status.state !== 'input-required') {
                 throw this._createError(A2AErrorCodes.InvalidRequest, `Task ${params.id} is in final state ${existingTask.status.state} and cannot be resumed.`);
            }
            if (existingTask.status.state !== 'input-required') {
                 console.warn(`[A2ACoreV2] Resuming task ${params.id} which is not in 'input-required' state. Generator might not expect input.`);
            }

            await this._addTaskHistory(params.id!, params.message);
            // Fetch task WITH history to populate the context for resumption
            // const currentTaskWithHistory = await this._getTaskOrThrow(params.id!, true); // No longer needed here
            // const resumeContext: ProcessorStepContext = { task: currentTaskWithHistory }; // No longer needed here
            // Pass only input, _trigger will get context from state
            this._triggerGeneratorProcessing(params.id!, activeState.generator, { type: 'message', message: params.message });

            const taskNow = await this._getTaskOrThrow(params.id!, true); // Fetch WITH history
            delete taskNow.internalState;
            return taskNow;

        } else if (existingTask && !activeState) {
            // Task exists in store but no active generator (e.g., server restart, already completed/failed)
             if (this._isFinalState(existingTask.status.state)) {
                throw this._createError(A2AErrorCodes.InvalidRequest, `Task ${params.id} is already in final state ${existingTask.status.state}.`);
            } else {
                 // This simple core cannot resume generators across restarts.
                 // Option 1: Error out
                 // Option 2: Try to find processor and restart (losing state) - Let's error for now
                 console.warn(`[A2ACoreV2] Task ${params.id} found in store but no active generator. Cannot resume with this core version.`);
                 throw this._createError(A2AErrorCodes.InternalError, `Task ${params.id} cannot be resumed (no active generator).`);
            }
        } else {
             // No existing task or ID provided - Initiate new task
             console.log(`[A2ACoreV2] Initiating new task.`);
             const processor = await this._findProcessorOrThrow(params, undefined);
             const taskMetadata = { ...(params.metadata || {}), a2a_processorName: processor.constructor.name };
             let newTask = await this.taskStore.createOrGetTask({ ...params, metadata: taskMetadata });
             console.log(`[A2ACoreV2] Created/Got task ${newTask.id} with initial status ${newTask.status.state}.`);
             await this._addTaskHistory(newTask.id, params.message);
             newTask = await this._updateTaskStatus(newTask.id, 'working'); // Set to working

             // Create the initial context object ONCE
             const initialContext: ProcessorStepContext = { task: newTask, isCanceling: false }; 
             // Call process with the context object
             const generator = processor.process(initialContext, params, authContext);
             
             // Store generator AND context
             this.activeGenerators.set(newTask.id, { generator: generator, context: initialContext });
             // Trigger the first run - no context param needed
             this._triggerGeneratorProcessing(newTask.id, generator);

             // Prepare response (don't include history initially)
             const responseTask = { ...newTask };
             responseTask.history = []; 
             delete responseTask.internalState;
             return responseTask;
        }
    }

    async handleTaskSendSubscribe(
        requestId: string | number | null,
        params: A2ATypes.TaskSubscribeParams,
        sseResponse: express.Response,
        authContext?: any
    ): Promise<void> {
        this._ensureSseSupportedOrThrow();
        const sseManager = this.sseManager!;
        const existingTask = params.id ? await this.taskStore.getTask(params.id) : undefined;
        const activeState = params.id ? this.activeGenerators.get(params.id) : undefined;
        let taskId: string;

        if (existingTask && activeState) {
            taskId = existingTask.id;
            console.log(`[A2ACoreV2] Resuming generator via SSE for task ${taskId}`);
            if (activeState.isCanceling) {
                sseResponse.status(409).end('Task is currently being canceled.'); 
                return;
            }
            if (this._isFinalState(existingTask.status.state) && existingTask.status.state !== 'input-required') {
                  sseManager.addSubscription(taskId, requestId, sseResponse);
                  this._sendSseEvent(sseManager, taskId, requestId, { type: 'status', status: existingTask.status, final: true, metadata: existingTask.metadata });
                  sseResponse.end(); return;
            }
             if (existingTask.status.state !== 'input-required') {
                 console.warn(`[A2ACoreV2] Resuming task ${taskId} via SSE which is not in 'input-required' state.`);
            }

            sseManager.addSubscription(taskId, requestId, sseResponse);
            await this._addTaskHistory(taskId, params.message);
            // Trigger processing - context will be updated internally before next()
            // Fetch task WITH history to populate the context for resumption
            // const currentTaskWithHistory = await this._getTaskOrThrow(taskId, true); // No longer needed here
            // const resumeContext: ProcessorStepContext = { task: currentTaskWithHistory }; // No longer needed here
            // Pass only input, _trigger will get context from state
            this._triggerGeneratorProcessing(taskId, activeState.generator, { type: 'message', message: params.message });

        } else if (existingTask && !activeState) {
            taskId = existingTask.id;
             if (this._isFinalState(existingTask.status.state)) {
                 sseManager.addSubscription(taskId, requestId, sseResponse); 
                 this._sendSseEvent(sseManager, taskId, requestId, { type: 'status', status: existingTask.status, final: true, metadata: existingTask.metadata });
                 sseResponse.end();
                 return;
            } else {
                 console.warn(`[A2ACoreV2] Task ${taskId} found in store but no active generator. Cannot resume via SSE.`);
                 sseResponse.status(500).end(); 
                  return;
            }
        } else {
             // Initiate new task via SSE
             console.log(`[A2ACoreV2] Initiating new task via SSE.`);
             const processor = await this._findProcessorOrThrow(params, undefined);
             const taskMetadata = { ...(params.metadata || {}), a2a_processorName: processor.constructor.name };
             let newTask = await this.taskStore.createOrGetTask({ ...params, metadata: taskMetadata });
             taskId = newTask.id;
             console.log(`[A2ACoreV2] Created/Got task ${taskId} via SSE with initial status ${newTask.status.state}.`);
             await this._addTaskHistory(taskId, params.message);
             sseManager.addSubscription(taskId, requestId, sseResponse);
             newTask = await this._updateTaskStatus(taskId, 'working'); 

             // Create initial context object ONCE
             const initialContext: ProcessorStepContext = { task: newTask, isCanceling: false };
             const generator = processor.process(initialContext, params, authContext);
             // Store generator AND context
             this.activeGenerators.set(taskId, { generator: generator, context: initialContext }); 
             // Trigger first run - no context param needed
             this._triggerGeneratorProcessing(taskId, generator);
        }
    }

    async handleTaskResubscribe(
        requestId: string | number | null,
        params: A2ATypes.TaskResubscribeParams,
        sseResponse: express.Response,
        authContext?: any
    ): Promise<void> {
        this._ensureSseSupportedOrThrow();
        const sseManager = this.sseManager!;
        const taskId = params.id;

        // Ensure task exists but don't need the full object here unless needed
        // const task = await this._getTaskOrThrow(taskId); 
        await this.taskStore.getTask(taskId); // Check task exists without fetching full data unless needed
        // TODO: Add authorization check here if needed using authContext and task metadata/owner

        // Just add the subscription. The SseManager will handle sending future events.
        sseManager.addSubscription(taskId, requestId, sseResponse);
        console.log(`[A2ACoreV2] Client resubscribed to task ${taskId}. Waiting for new events.`);

        // Note: The connection remains open until the client disconnects,
        // or until the SseManager receives a final event for this task
        // (which will be broadcast to this connection if it happens after resubscription).
    }

    async handleTaskGet(params: A2ATypes.TaskGetParams, authContext?: any): Promise<A2ATypes.Task> {
        const task = await this._getTaskOrThrow(params.id);
        if (params.historyLength !== 0) {
             const historyLength = Math.min(params.historyLength ?? this.maxHistoryLength, this.maxHistoryLength);
             task.history = await this.taskStore.getTaskHistory(params.id, historyLength);
        } else {
             delete task.history; 
        }
        delete task.internalState; 
        return task;
    }

    async handleTaskCancel(params: A2ATypes.TaskCancelParams, authContext?: any): Promise<A2ATypes.Task> {
        const taskId = params.id;
        let task = await this._getTaskOrThrow(taskId, false); // Don't need history here
        if (this._isFinalState(task.status.state)) {
            console.log(`[A2ACoreV2] Task ${taskId} already final. No cancel action needed.`);
            delete task.internalState;
            delete task.history; // Ensure no history returned
            return task;
        }
        if (params.message) {
            await this._addTaskHistory(taskId, params.message);
        }

        const activeState = this.activeGenerators.get(taskId);

        if (activeState) {
            if (activeState.isCanceling) {
                console.log(`[A2ACoreV2] Task ${taskId} cancellation already in progress.`);
                const currentTask = await this._getTaskOrThrow(taskId, false);
                delete currentTask.internalState;
                delete currentTask.history;
                return currentTask;
            }

            console.log(`[A2ACoreV2] Canceling active generator for task ${taskId}.`);
            activeState.isCanceling = true;
            activeState.context.isCanceling = true; // Set flag on context as well
            try {
                // Trigger with error - no input or context needed for throw
                await this._triggerGeneratorProcessing(taskId, activeState.generator, undefined, new ProcessorCancellationError());
            } finally {
                 const finalActiveState = this.activeGenerators.get(taskId);
                 if (finalActiveState) { 
                     finalActiveState.isCanceling = false;
                 }
            }
        } else {
            console.log(`[A2ACoreV2] No active generator for task ${taskId}. Updating status to canceled in store.`);
            task = await this._updateTaskStatus(taskId, 'canceled', params.message);
        }
        const finalTaskState = await this.taskStore.getTask(taskId); 
        if (!finalTaskState) throw this._createError(A2AErrorCodes.InternalError, `Task ${taskId} disappeared during cancel.`);
        finalTaskState.history = []; // Return empty history on cancel success
        delete finalTaskState.internalState;
        return finalTaskState;
    }

   // --- Internal Generator Runner ---

   /** Enqueues work for a specific task's generator, ensuring serial execution. */
   private _enqueueGeneratorWork(taskId: string, workFn: () => Promise<any>): Promise<any> {
        const lastPromise = this.taskProcessingPromises.get(taskId) ?? Promise.resolve();
        const workPromise = lastPromise
            .catch((err) => { 
                 console.error(`[A2ACoreV2] Error in previous processing step for task ${taskId}:`, err); 
             })
            .then(workFn); 
        this.taskProcessingPromises.set(taskId, workPromise);

        workPromise.finally(() => {
            if (this.taskProcessingPromises.get(taskId) === workPromise) {
                this.taskProcessingPromises.delete(taskId);
            }
        }).catch(()=>{}); 

        return workPromise;
   }

    /** Processes one step of the generator (next/throw + yield handling). */
    private async _processGeneratorStep(
        taskId: string,
        generator: AsyncGenerator<ProcessorYieldValue, void, ProcessorInputValue>,
        context: ProcessorStepContext, // Accept context 
        inputValue?: ProcessorInputValue,
        errorToThrow?: Error
    ): Promise<{ done: boolean, requiresInput: boolean }> {
        const activeState = this.activeGenerators.get(taskId);
        // Check activeState *before* potentially fetching task for context update
        if (!activeState && !errorToThrow) { 
             console.warn(`[A2ACoreV2] _processGeneratorStep called for task ${taskId} but no active generator state found. Aborting step.`);
             return { done: true, requiresInput: false }; 
        }

        try {
            // --- Check for cancellation BEFORE proceeding --- //
            if (activeState?.isCanceling && !errorToThrow) { 
                console.log(`[A2ACoreV2] Cancellation flag detected for task ${taskId} before step execution. Forcing cancellation error.`);
                // Force the error to be the cancellation error
                errorToThrow = new ProcessorCancellationError();
                inputValue = undefined; // Ensure no input is passed when throwing due to cancellation flag
            }
            // --- End Cancellation Check --- //

            // --- MUTATE CONTEXT (Moved Here) --- //
            // Fetch latest task state WITH history before EVERY generator step
            // unless we are throwing a cancellation error (where context might not matter)
            if (!errorToThrow || !(errorToThrow instanceof ProcessorCancellationError)) { 
                 try {
                    const currentTask = await this._getTaskOrThrow(taskId, true); 
                    // Mutate the task property of the existing context object
                    context.task = currentTask; 
                 } catch (taskFetchError) {
                     console.error(`[A2ACoreV2] Error fetching task ${taskId} to update context before generator step:`, taskFetchError);
                     // If we can't fetch the task, we probably can't proceed safely.
                     // Throw the fetch error to be caught by the outer try/catch.
                     throw taskFetchError;
                 }
            }
            // --- END MUTATE CONTEXT --- //

            console.log(`[A2ACoreV2] Processing step for task ${taskId}. Input: ${inputValue?.type}, Error: ${errorToThrow?.name}, History Length: ${context.task.history?.length ?? 0}`);
            let result: IteratorResult<ProcessorYieldValue, void>;
            if (errorToThrow) {
                // Don't need context when throwing 
                result = await generator.throw(errorToThrow);
            } else {
                // Pass input value to next(). Context is implicitly available
                // via the mutated object in the generator's scope.
                result = await generator.next(inputValue);
            }
            console.log(`[A2ACoreV2] Generator step result for task ${taskId}. Done: ${result.done}`);

            if (result.done) {
                 console.log(`[A2ACoreV2] Generator for task ${taskId} completed successfully.`);
                 const currentActiveState = this.activeGenerators.get(taskId); 
                 if (currentActiveState?.isCanceling) {
                     console.log(`[A2ACoreV2] Generator finished, but task ${taskId} is marked for cancellation. Skipping 'completed' state.`);
                 } else {
                     const currentTask = await this._getTaskOrThrow(taskId);
                     if (currentTask && !this._isFinalState(currentTask.status.state)) {
                         await this._updateTaskStatus(taskId, 'completed');
                     } else {
                         console.log(`[A2ACoreV2] Generator finished, but task state is already final (${currentTask?.status.state}) or being canceled. Not setting to completed.`);
                     }
                 }
                this.activeGenerators.delete(taskId); 
                return { done: true, requiresInput: false };
            } else {
                const yieldValue = result.value;
                console.log(`[A2ACoreV2] Task ${taskId} yielded: ${yieldValue.type}`);
                let requiresInput = false;
                let yieldedState: A2ATypes.TaskState | null = null;
                switch (yieldValue.type) {
                    case 'statusUpdate':
                        yieldedState = yieldValue.state;
                        await this._updateTaskStatus(taskId, yieldValue.state, yieldValue.message);
                        requiresInput = (yieldValue.state === 'input-required');
                        break;
                    case 'artifact':
                        await this._addTaskArtifact(taskId, yieldValue.artifactData);
                        break;
                }
                const isProcessorYieldFinal = yieldedState !== null && this._isFinalState(yieldedState);
                if (isProcessorYieldFinal) {
                    console.log(`[A2ACoreV2] Processor yielded final state (${yieldedState}). Stopping loop for task ${taskId}.`);
                    this.activeGenerators.delete(taskId); 
                    return { done: true, requiresInput: false }; 
                }
                console.log(`[A2ACoreV2] Processed yield for task ${taskId}. Requires Input: ${requiresInput}`);
                return { done: false, requiresInput: requiresInput };
            }
        } catch (error: any) {
             console.error(`[A2ACoreV2] Error during generator processing step for task ${taskId}:`, error);
             this.activeGenerators.delete(taskId); 

             const finalState = error instanceof ProcessorCancellationError ? 'canceled' : 'failed';
             const errorMessage: A2ATypes.Message | undefined = finalState === 'failed' ? 
                 { role: 'agent', parts: [{ type: 'text', text: `Task failed: ${error.message}` }] } : 
                 undefined; 
             try {
                 const currentTask = await this._getTaskOrThrow(taskId);
                 if (currentTask && !this._isFinalState(currentTask.status.state)) {
                      console.log(`[A2ACoreV2] Setting task ${taskId} state to ${finalState} after generator error.`);
                      await this._updateTaskStatus(taskId, finalState, errorMessage);
                 } else {
                      console.log(`[A2ACoreV2] Task ${taskId} status already final (${currentTask?.status.state}), not updating after generator error.`);
                 }
            } catch (updateError) {
                 console.error(`[A2ACoreV2] CRITICAL: Failed to update task ${taskId} status after generator error:`, updateError);
            }
             return { done: true, requiresInput: false }; 
        }
    }

    /** Triggers the processing of a task's generator, looping until it pauses or completes. */
    private _triggerGeneratorProcessing(
        taskId: string,
        generator: AsyncGenerator<ProcessorYieldValue, void, ProcessorInputValue>,
        initialInputValue?: ProcessorInputValue, 
        initialErrorToThrow?: Error
        // REMOVED initialContext?: ProcessorStepContext 
    ): Promise<any> { 
         console.log(`[A2ACoreV2] Enqueuing generator processing trigger for task ${taskId}`);
        return this._enqueueGeneratorWork(taskId, async () => {
            console.log(`[A2ACoreV2] Starting generator processing chain for task ${taskId}`);
            
            const activeState = this.activeGenerators.get(taskId);
            if (!activeState) {
                 console.warn(`[A2ACoreV2] _triggerGeneratorProcessing started for task ${taskId} but no active state found. Aborting.`);
                 return; 
            }
            // Get context from the active state
            const context = activeState.context; 
            
            // Initial step uses the provided context and initial input/error
            let stepResult = await this._processGeneratorStep(taskId, generator, context, initialInputValue, initialErrorToThrow);
            
            // Subsequent steps within the loop
            while (!stepResult.done && !stepResult.requiresInput && this.activeGenerators.has(taskId)) {
                console.log(`[A2ACoreV2] Continuing generator loop for task ${taskId}...`);
                
                // Pass the *same* (but now mutated) context object to the next step
                // No input/error for subsequent steps in the loop
                stepResult = await this._processGeneratorStep(taskId, generator, context);
            }
            console.log(`[A2ACoreV2] Generator processing loop finished for task ${taskId}. Done: ${stepResult.done}, Requires Input: ${stepResult.requiresInput}, Generator Active: ${this.activeGenerators.has(taskId)}`);
        });
    }

    // --- Internal Helper Methods ---

    private async _findProcessorOrThrow(params: A2ATypes.TaskSendParams, existingTask?: A2ATypes.Task): Promise<TaskProcessorV2> {
         console.log(`[A2ACoreV2] Searching for V2 processor for skillId: ${params.metadata?.skillId}, taskId: ${params.id || 'N/A'}`);
         for (const processor of this.processors) {
            if (await processor.canHandle(params, existingTask)) {
                console.log(`[A2ACoreV2] Found matching V2 processor: ${processor.constructor.name}`);
                return processor;
            }
        }
        console.error(`[A2ACoreV2] No V2 processor found for params: ${JSON.stringify(params)}`);
        throw this._createError(A2AErrorCodes.MethodNotFound, `No V2 processor found capable of handling the request.`);
    }

     private async _getTaskOrThrow(taskId: string, includeHistory: boolean = false): Promise<A2ATypes.Task> {
        const task = await this.taskStore.getTask(taskId);
        if (!task) {
            console.warn(`[A2ACoreV2] Task with id ${taskId} not found.`);
            throw this._createError(A2AErrorCodes.TaskNotFound, `Task with id ${taskId} not found.`);
        }
        if (includeHistory) {
            if (!task.history || task.history.length === 0) { 
                task.history = await this.taskStore.getTaskHistory(taskId, this.maxHistoryLength);
            }
        } else {
            delete task.history;
        }
        return task;
    }

    private async _updateTaskStatus(taskId: string, newState: A2ATypes.TaskState, message?: A2ATypes.Message): Promise<A2ATypes.Task> {
        const taskBefore = await this._getTaskOrThrow(taskId, false); 
        const now = new Date().toISOString();
        const statusUpdate: A2ATypes.TaskStatus = { state: newState, timestamp: now, message };

        const updatedTask = await this.taskStore.updateTask(taskId, { status: statusUpdate });
         if (!updatedTask) {
             throw this._createError(A2AErrorCodes.InternalError, `Task ${taskId} disappeared during status update.`);
         }
         console.log(`[A2ACoreV2] Task ${taskId} status updated to ${newState} in store.`);

         if (message && message.role === 'agent' && newState !== 'input-required') {
             await this._addTaskHistory(taskId, message);
         }

         if (this.sseManager) {
             const isStreamEndingEvent = this._isFinalState(newState) || newState === 'input-required'; 
             this._sendSseEvent(this.sseManager, taskId, null, { 
                 type: 'status',
                 status: updatedTask.status,
                 final: isStreamEndingEvent, 
                 metadata: updatedTask.metadata
             });
         }
        return updatedTask;
    }

    private async _addTaskArtifact(taskId: string, artifactData: Omit<A2ATypes.Artifact, 'index' | 'id' | 'timestamp'>): Promise<A2ATypes.Artifact> {
         const task = await this._getTaskOrThrow(taskId, false);
         const currentArtifacts = task.artifacts ?? [];
         const newIndex = currentArtifacts.length;
         const now = new Date().toISOString();
         const newArtifact: A2ATypes.Artifact = {
             name: artifactData.name,
             description: artifactData.description,
             parts: artifactData.parts,
             metadata: artifactData.metadata,
             index: newIndex,
             id: randomUUID(),
             timestamp: now,
             append: artifactData.append ?? false,
             lastChunk: artifactData.lastChunk ?? false,
         };

         const updatedTask = await this.taskStore.updateTask(taskId, { artifacts: [...currentArtifacts, newArtifact] });
         if (!updatedTask) {
             throw this._createError(A2AErrorCodes.InternalError, `Task ${taskId} disappeared during artifact add.`);
         }
         console.log(`[A2ACoreV2] Task ${taskId} artifact added at index ${newIndex}.`);

         if (this.sseManager) {
             this._sendSseEvent(this.sseManager, taskId, null, { 
                 type: 'artifact',
                 artifact: newArtifact,
                 metadata: updatedTask.metadata
             });
         }
         return newArtifact;
    }

     private async _addTaskHistory(taskId: string, message: A2ATypes.Message): Promise<void> {
         if (!message.role) {
              console.warn(`[A2ACoreV2] History message for task ${taskId} lacks role. Skipping add.`);
             return;
         }
         await this.taskStore.addTaskHistory(taskId, message);
         console.log(`[A2ACoreV2] Added ${message.role} message to history for task ${taskId}.`);
     }


    // Wrapper for sending SSE events via SseConnectionManager
    private _sendSseEvent(
        sseManager: SseConnectionManager,
        taskId: string,
        requestId: string | number | null, // Target specific connection or null for broadcast
        eventData: { type: 'status', status: TaskStatus, final: boolean, metadata?: Record<string, any> } | { type: 'artifact', artifact: Artifact, metadata?: Record<string, any> }
    ): void {
         try {
              // Map internal event structure to A2A event types
             let a2aEvent: CoreTaskEvent; // Use the locally defined union type
             if (eventData.type === 'status') {
                 // Construct TaskStatusUpdateEvent
                 a2aEvent = { id: taskId, status: eventData.status, final: eventData.final, metadata: eventData.metadata };
             } else if (eventData.type === 'artifact') {
                 // Construct TaskArtifactUpdateEvent
                 a2aEvent = { id: taskId, artifact: eventData.artifact, metadata: eventData.metadata };
             } else {
                  console.error(`[A2ACoreV2] Unknown event type to send via SSE:`, eventData);
                  return;
             }

             // SseConnectionManager's notify handles broadcasting or targeting based on requestId presence
             // We need to adapt its interface or our call signature if it expects a different format.
             // Assuming sseManager.notify can handle CoreTaskEvent:
             // Let's refine this - SseManager expects notify(event), and internally decides target.
             // It doesn't directly use requestId in the notify signature.

              console.log(`[A2ACoreV2] Broadcasting SSE event type ${eventData.type} for task ${taskId}.`);
             // SseManager's notify method should handle broadcasting to all connections for the taskId
             // If a specific requestId is provided (e.g., for resubscribe initial send), the manager needs to handle targeting that specific connection.
             // Let's assume the SseConnectionManager has logic like: `notify(event: CoreTaskEvent, targetRequestId?: string | number | null)`
             // For now, we'll call notify and assume it broadcasts correctly. Targetting specific requests on resubscribe might need SseManager changes.
             sseManager.notify(a2aEvent);

         } catch (error) {
             console.error(`[A2ACoreV2] Failed to send SSE event for task ${taskId}:`, error);
         } finally {
             // If the event is final, ensure the SSE manager cleans up for this task eventually.
             // The manager should ideally do this when connections close or a final event is sent.
             if ('final' in eventData && eventData.final) {
                 // sseManager.removeAllSubscriptions(taskId); // Or similar cleanup in SseManager
             }
         }
    }

    private _ensureSseSupportedOrThrow(): void {
        if (!this.completeAgentCard.capabilities?.streaming || !this.sseManager) {
            throw this._createError(A2AErrorCodes.UnsupportedOperation, 'Streaming (SSE) is not supported or configured for this agent.');
        }
    }

    private _isFinalState(state: A2ATypes.TaskState): boolean {
        return ['completed', 'failed', 'canceled'].includes(state);
    }

    private _createError(code: number, message: string, data?: any): Error & { isA2AError: boolean, code: number, data?: any } {
        const error = new Error(message) as any;
        error.isA2AError = true;
        error.code = code;
        error.data = data;
        return error;
    }

     // Placeholder for push notification methods - interact directly with TaskStore
    async handleSetPushNotification(params: A2ATypes.TaskPushNotificationParams, authContext?: any): Promise<A2ATypes.TaskPushNotificationParams> {
        await this._getTaskOrThrow(params.id);
        if (!this.completeAgentCard.capabilities.pushNotifications) {
             throw this._createError(A2AErrorCodes.PushNotificationsNotSupported, `Push notifications not supported.`);
        }
        await this.taskStore.setPushConfig(params.id, params.pushNotificationConfig ?? null);
        return { id: params.id, pushNotificationConfig: params.pushNotificationConfig ?? null };
    }

    async handleGetPushNotification(params: A2ATypes.TaskPushNotificationGetParams, authContext?: any): Promise<A2ATypes.TaskPushNotificationParams> {
        await this._getTaskOrThrow(params.id);
        if (!this.completeAgentCard.capabilities.pushNotifications) {
             throw this._createError(A2AErrorCodes.PushNotificationsNotSupported, `Push notifications not supported.`);
        }
        const config = await this.taskStore.getPushConfig(params.id);
        return { id: params.id, pushNotificationConfig: config };
    }
} 
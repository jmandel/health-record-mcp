import * as A2ATypes from '../types';
import type { TaskStore, TaskProcessor, A2AServerConfig, GetAuthContextFn, TaskUpdater, NotificationService, CoreTaskEvent } from '../interfaces';
import { randomUUID } from 'node:crypto';
import type * as express from 'express'; // Import express types for SSE Response
import { SseConnectionManager } from './SseConnectionManager';

export class A2AServerCore {
  private readonly agentCard: A2ATypes.AgentCard;
  private readonly taskStore: TaskStore;
  private readonly taskProcessors: TaskProcessor[];
  private readonly getAuthContext?: GetAuthContextFn;
  private readonly maxHistoryLength: number;
  private readonly notificationServices: NotificationService[];

  constructor(config: A2AServerConfig) {
    this.agentCard = config.agentCard;
    this.taskStore = config.taskStore;
    this.taskProcessors = config.taskProcessors;
    this.getAuthContext = config.getAuthContext;
    this.maxHistoryLength = config.maxHistoryLength ?? 50; // Default history limit
    this.notificationServices = config.notificationServices || [];

    if (this.taskProcessors.length === 0) {
        console.warn("[A2ACore] No TaskProcessors configured.");
    }
    if (this.notificationServices.length === 0) {
        console.log("[A2ACore] No NotificationServices configured.");
    }
  }

  getAgentCard(): A2ATypes.AgentCard {
    return this.agentCard;
  }

  // --- Task Handling Entry Point ---
  async handleTaskSend(params: A2ATypes.TaskSendParams, authContext?: any): Promise<A2ATypes.Task> {
      const checkResult = await this._checkResumability(params);
      console.log(`[A2ACore] Check resumability result: ${JSON.stringify(checkResult)}`);
      console.log("total store", this.taskStore)

      switch (checkResult.outcome) {
          case 'initiate': {
              // Call the consolidated initiation helper directly
              const { task, initialEvent } = await this._handleTaskInitiation(params, authContext);
              // Emit the initial event to all notification services
              await this._emitTaskEvent(initialEvent);
              return task; // Return only the task object
          }
          case 'resume': {
              // Call the unified resume helper
              const { updatedTask, workingEvent } = await this._resumeTask(checkResult.task!, checkResult.processor!, params, authContext);
              // Emit the working event to all notification services
              await this._emitTaskEvent(workingEvent);
              return updatedTask; // Return the updated task object
          }
      }
  }

  // --- NEW Unified Helper for Resuming a Task (JSON or SSE) ---
  private async _resumeTask(
        taskToResume: A2ATypes.Task,
        processor: TaskProcessor,
        params: A2ATypes.TaskSendParams,
        authContext: any,
        // Returns the updated task and the 'working' event to be emitted
    ): Promise<{ updatedTask: A2ATypes.Task, workingEvent: A2ATypes.TaskStatusUpdateEvent }> {

        if (!processor.resume) { // Should be guaranteed by _checkResumability, but check again
            throw this._createError(A2ATypes.A2AErrorCodes.InternalError, `_resumeTask called for processor ${processor.constructor.name} which lacks a resume method.`);
        }
        console.log(`[A2ACore] Resuming task ${taskToResume.id} with JSON response.`);

        // 1. Add Incoming History
        if (params.message.role) {
            await this.taskStore.addTaskHistory(taskToResume.id, params.message);
        } else {
             console.warn(`[A2ACore] Resume message for task ${taskToResume.id} lacks role. Skipping history add.`);
        }

        // 2. Capture Original State (for processor)
        const originalTaskState = { ...taskToResume };

        // 3. Update Status to Working in Store
        const now = new Date().toISOString();
        const statusUpdate: A2ATypes.TaskStatus = { state: 'working', timestamp: now };
        const updatedTask = await this.taskStore.updateTask(taskToResume.id, { status: statusUpdate });
        if (!updatedTask) {
            throw this._createError(A2ATypes.A2AErrorCodes.TaskNotFound, `Task ${taskToResume.id} disappeared unexpectedly during resume.`);
        }
        console.log(`[A2ACore] Task ${updatedTask.id} status set to working for resume.`);

        // 4. Prepare Working Event (Common)
        const workingEvent: A2ATypes.TaskStatusUpdateEvent = {
            id: updatedTask.id, status: { ...updatedTask.status },
            final: false, metadata: updatedTask.metadata
        };
        delete workingEvent.status.message;

        // 5. Start Processor Asynchronously (Common)
        console.log(`[A2ACore] Executing processor resume for task ${taskToResume.id}...`);
        this._executeProcessorResume(processor, originalTaskState, params.message, authContext);

        // 7. Return updated task and event
        const responseTask = { ...updatedTask };
        delete responseTask.internalState;
        responseTask.history = await this.taskStore.getTaskHistory(updatedTask.id, params.historyLength ?? 0);
        return { updatedTask: responseTask, workingEvent };
   }

    // --- Consolidated Helper for Task Initiation (JSON or SSE) ---
   private async _handleTaskInitiation(
        params: A2ATypes.TaskSendParams,
        authContext: any
    ): Promise<{ task: A2ATypes.Task, initialEvent: A2ATypes.TaskStatusUpdateEvent }> {

        // 1. Find Processor
        const processor = await this._findProcessor(params);
        if (!processor) {
             throw this._createError(A2ATypes.A2AErrorCodes.MethodNotFound, `No processor found capable of handling the initial request based on provided parameters (skillId?).`);
        }
        console.log(`[A2ACore] Found initial processor ${processor.constructor.name} based on input params.`);

        // 2. Prepare Metadata
        const taskMetadata = {
             ...(params.metadata || {}),
            _processorSkillId: params.metadata?.skillId
         };

        // 3. Create Task in Store
        const task = await this.taskStore.createOrGetTask({ ...params, metadata: taskMetadata });
        console.log(`[A2ACore] Created/Retrieved task ${task.id} in store.`);

        // 4. Add Initial History
        if (params.message.role) {
            await this.taskStore.addTaskHistory(task.id, params.message);
            console.log(`[A2ACore] Added initial message to history for task ${task.id}.`);
        } else {
            console.warn(`[A2ACore] Initial message for task ${task.id} lacks role. Skipping history add.`);
        }

        // 5. Handle Response/SSE Setup & Emit Initial Event
        const initialStatusEvent: A2ATypes.TaskStatusUpdateEvent = {
            id: task.id, status: { ...task.status },
            final: ['completed', 'failed', 'canceled'].includes(task.status.state),
            metadata: task.metadata
        };
        delete initialStatusEvent.status.message;

        // 6. Start Processor Asynchronously
        console.log(`[A2ACore] Executing processor start for task ${task.id}...`);
        this._executeProcessorStart(processor, task, params, authContext);

        // 7. Return
        const initialResponseTask = { ...task };
        delete initialResponseTask.internalState;
        initialResponseTask.history = await this.taskStore.getTaskHistory(task.id, params.historyLength ?? 1);
        return { task: initialResponseTask, initialEvent: initialStatusEvent };
   }

   // --- NEW Helper to Check Task Status and Resumability ---
   private async _checkResumability(params: A2ATypes.TaskSendParams): Promise<{
        outcome: 'initiate' | 'resume',
        task?: A2ATypes.Task,
        processor?: TaskProcessor,
    }> {
        if (!params.id) {
             console.log("[A2ACore] No task ID provided, initiating new task.");
            return { outcome: 'initiate' };
        }

        const task = await this.taskStore.getTask(params.id);

         if (!task) {
             console.log(`[A2ACore] Task ID ${params.id} provided but task not found, initiating new task.`);
            // Allow initiation even if ID provided but task doesn't exist
            return { outcome: 'initiate' };
        }

        // Check if the task is *not* in a final state (thus potentially resumable)
        const currentState = task.status.state;
        if (!this._isFinalState(currentState)) {
            // State is potentially resumable, check processor
            const processor = await this._findProcessorForExistingTask(params.id);
            if (!processor) {
                 // _findProcessorForTask already logged the specific reason
                 throw this._createError(A2ATypes.A2AErrorCodes.InternalError, `Cannot find processor for task ${params.id}. Check server logs for details.`);
            }
            if (processor?.resume) {
                // All checks pass for resume
                console.log(`[A2ACore] Task ${params.id} is resumable with processor ${processor.constructor.name}.`);
                return { outcome: 'resume', task, processor };
            } else {
                // Processor doesn't support resume
                 console.warn(`[A2ACore] Task ${params.id} found in resumable state (${currentState}), but processor ${processor?.constructor.name || '(unknown)'} does not support resume.`);
                 throw this._createError(A2ATypes.A2AErrorCodes.InvalidRequest, `Task ${params.id} is in state ${currentState} but its processor cannot resume.`);
            }
    } else {
            // Task exists but is in a final or non-resumable state
            console.warn(`[A2ACore] Request for existing task ${params.id} which is in final state (${currentState}).`);
            // Treat this as an error for both send and sendSubscribe - suggest resubscribe if applicable
            const message = `Task ${params.id} is already in final state ${currentState}. Use tasks/resubscribe if supported.`;
            throw this._createError(A2ATypes.A2AErrorCodes.InvalidRequest, message);
    }
  }

  // --- SSE Method Handlers ---
  async handleTaskSendSubscribe(
       requestId: string | number | null, // Added requestId
       params: A2ATypes.TaskSubscribeParams,
       sseResponse: express.Response,
       authContext?: any
  ): Promise<void> {
       const sseManager = this._ensureStreamingSupportedOrThrow();

       // First, check if this ID corresponds to an existing, resumable task
       const checkResult = await this._checkResumability(params);
       console.log(`[A2ACore] handleTaskSendSubscribe: Resumability check result: ${checkResult.outcome}`);

       switch (checkResult.outcome) {
           case 'initiate': { // Task is new or non-existent, proceed with initiation
               console.log(`[A2ACore] handleTaskSendSubscribe: Initiating new task.`);
               // Use the unified initiation helper
               const { task, initialEvent } = await this._handleTaskInitiation(params, authContext);

               // Add subscription, storing the request ID
               sseManager.addSubscription(task.id, requestId, sseResponse);

               // Broadcast the initial status update via SSE ONLY
               try {
                   sseManager.broadcast(task.id, 'TaskStatusUpdate', initialEvent);
                   console.log(`[A2ACore] Broadcast initial SSE status update for task ${task.id}`);
               } catch (error) {
                   console.error(`[A2ACore] Error broadcasting initial SSE event for task ${task.id}:`, error);
                   sseManager.removeSubscription(task.id, sseResponse);
                   if (!sseResponse.closed) sseResponse.end();
               }
               // Note: Processor execution started by _handleTaskInitiation
               break;
           }
           case 'resume': { // Task exists and is in a resumable state
                console.log(`[A2ACore] handleTaskSendSubscribe: Resuming existing task ${checkResult.task!.id}.`);
               const taskToResume = checkResult.task!;
               const processor = checkResult.processor!;

               // Perform resume steps similar to _resumeTask, but manage SSE
               if (!processor.resume) { // Should be guaranteed by _checkResumability, but double-check
                   throw this._createError(A2ATypes.A2AErrorCodes.InternalError, `Processor ${processor.constructor.name} lacks a resume method.`);
               }
               // 1. Add Incoming History
               if (params.message.role) {
                    await this.taskStore.addTaskHistory(taskToResume.id, params.message);
               } else {
                   console.warn(`[A2ACore] Resume message (SSE) for task ${taskToResume.id} lacks role. Skipping history add.`);
               }
               // 2. Capture Original State
                const originalTaskState = { ...taskToResume };
               // 3. Update Status to Working
                const now = new Date().toISOString();
                const statusUpdate: A2ATypes.TaskStatus = { state: 'working', timestamp: now };
                const updatedTask = await this.taskStore.updateTask(taskToResume.id, { status: statusUpdate });
                if (!updatedTask) {
                    throw this._createError(A2ATypes.A2AErrorCodes.TaskNotFound, `Task ${taskToResume.id} disappeared during SSE resume.`);
                }
                console.log(`[A2ACore] Task ${updatedTask.id} status set to working for SSE resume.`);
                // 4. Prepare Working Event
                const workingEvent: A2ATypes.TaskStatusUpdateEvent = {
                    id: updatedTask.id, status: { ...updatedTask.status },
                    final: false, metadata: updatedTask.metadata
                };
                delete workingEvent.status.message;

               // 5. Add SSE subscription *before* broadcasting
               sseManager.addSubscription(updatedTask.id, requestId, sseResponse);

                // 6. Broadcast the 'working' event via SSE ONLY
               try {
                    sseManager.broadcast(updatedTask.id, 'TaskStatusUpdate', workingEvent);
                    console.log(`[A2ACore] Broadcast working SSE status update for task ${updatedTask.id}`);
               } catch (error) {
                   console.error(`[A2ACore] Error broadcasting working SSE event for task ${updatedTask.id}:`, error);
                   sseManager.removeSubscription(updatedTask.id, sseResponse);
                   if (!sseResponse.closed) sseResponse.end();
                   // Should we re-throw here? Let's not for now, processor might still run.
               }

               // 7. Start Processor Resume Asynchronously
                console.log(`[A2ACore] Executing processor resume for task ${taskToResume.id} (triggered by SSE)...`);
                this._executeProcessorResume(processor, originalTaskState, params.message, authContext);
               break;
           }
       }

       // Initial task event still needs to go to general notification services (if any)
       // We don't call _emitTaskEvent here again as the processor start/resume handles subsequent events.

       // Note: Processor execution was already started by _handleTaskInitiation
   }

  async handleTaskResubscribe(
       requestId: string | number | null, // Added requestId
       params: A2ATypes.TaskResubscribeParams,
       sseResponse: express.Response,
       authContext?: any
  ): Promise<void> {
       const sseManager = this._ensureStreamingSupportedOrThrow();
       const taskId = params.id;

       const task = await this._getTaskOrThrow(taskId); // Ensure task exists

       // Basic validation (can add more checks based on state if needed)
       if (this._isFinalState(task.status.state)) {
           // Optionally send a final status event and close?
           const finalEvent: A2ATypes.TaskStatusUpdateEvent = {
               id: taskId,
               status: task.status,
               final: true,
               metadata: task.metadata
           };
            try {
               // Try sending a final event formatted correctly before closing
               // Broadcast will format it using the stored requestId for this connection
               sseManager.broadcast(taskId, 'TaskStatusUpdate', finalEvent);
               console.log(`[A2ACore] Broadcast final state (${task.status.state}) on resubscribe for task ${taskId}. Closing connection.`);
            } catch (e) { console.error(`[A2ACore] Error broadcasting final event on resubscribe for task ${taskId}:`, e); }
           sseResponse.end();
           return;
       }

       // Add subscription
       sseManager.addSubscription(taskId, requestId, sseResponse); // Correct method call
       console.log(`[A2ACore] Client resubscribed to task ${taskId}.`);

       // Broadcast the current state immediately.
       const currentStatusEvent: A2ATypes.TaskStatusUpdateEvent = {
           id: taskId, status: task.status, final: false, metadata: task.metadata
       };
       try {
           sseManager.broadcast(taskId, 'TaskStatusUpdate', currentStatusEvent);
           console.log(`[A2ACore] Broadcast current status on resubscribe for task ${taskId}.`);
       } catch (error) {
           console.error(`[A2ACore] Error broadcasting current status on resubscribe for task ${taskId}:`, error);
           // Cleanup if broadcast fails?
           sseManager.removeSubscription(taskId, sseResponse); // Correct method call
            if (!sseResponse.closed) sseResponse.end();
       }
  }

  async handleTaskGet(params: A2ATypes.TaskGetParams, authContext?: any): Promise<A2ATypes.Task> {
    const task = await this._getTaskOrThrow(params.id);
    const historyLength = Math.min(params.historyLength ?? 0, this.maxHistoryLength);
    task.history = await this.taskStore.getTaskHistory(params.id, historyLength);
    delete task.internalState;
    return task;
  }

  async handleTaskCancel(params: A2ATypes.TaskCancelParams, authContext?: any): Promise<A2ATypes.Task> {
    let task = await this._getTaskOrThrow(params.id);

    // Check state *before* finding processor
    if (this._isFinalState(task.status.state)) {
        console.log(`[A2ACore] Task ${params.id} already in final state ${task.status.state}. No action taken.`);
        delete task.internalState;
        task.history = await this.taskStore.getTaskHistory(params.id, 0); // Fetch history for response
        return task;
    }

    // Find processor and potentially call its cancel method
    const processor = await this._findProcessorForExistingTask(params.id);
    if (processor?.cancel) {
        console.log(`[A2ACore] Found processor ${processor.constructor.name} for cancel.`);
        this._executeProcessorCancel(processor, task, params.message, authContext);
    } else {
        console.warn(`[A2ACore] No processor found or processor does not support cancel for task ${task.id}.`);
    }

    // Update status immediately (which also emits notification)
    const updatedTask = await this.updateTaskStatus(params.id, 'canceled', params.message);

    // Add cancellation request message to history if provided
    if (params.message) {
        if (params.message.role) {
           await this.taskStore.addTaskHistory(params.id, params.message);
        } else {
            console.warn(`[A2ACore] Cancel message for task ${params.id} lacks role. Skipping history add.`);
        }
    }

    // Prepare and return response
    delete updatedTask.internalState;
    updatedTask.history = [];
    return updatedTask;
  }

   async handleSetPushNotification(params: A2ATypes.TaskPushNotificationParams, authContext?: any): Promise<A2ATypes.TaskPushNotificationParams> {
       await this._getTaskOrThrow(params.id); // Ensures task exists
       this._ensurePushNotificationsSupportedOrThrow();
       await this.taskStore.setPushConfig(params.id, params.pushNotificationConfig ?? null);
       // TODO: Consider emitting an event here? Or is it purely config?
       return { id: params.id, pushNotificationConfig: params.pushNotificationConfig ?? null };
   }

   async handleGetPushNotification(params: A2ATypes.TaskPushNotificationGetParams, authContext?: any): Promise<A2ATypes.TaskPushNotificationParams> {
        await this._getTaskOrThrow(params.id); // Ensures task exists
        this._ensurePushNotificationsSupportedOrThrow();
        const config = await this.taskStore.getPushConfig(params.id);
        return { id: params.id, pushNotificationConfig: config };
   }

  // --- Core Methods Called by Updater/Internal Logic ---
  async updateTaskStatus(taskId: string, newState: A2ATypes.TaskState, message?: A2ATypes.Message): Promise<A2ATypes.Task> {
    await this._getTaskOrThrow(taskId); // Ensure task exists before updating
    const now = new Date().toISOString();
    const statusUpdate: A2ATypes.TaskStatus = { state: newState, timestamp: now, message };
    const updatedTask = await this.taskStore.updateTask(taskId, { status: statusUpdate });
    if (!updatedTask) {
        console.error(`[A2ACore] Failed to update status for task ${taskId} - task not found in store.`);
        // This case should theoretically be less likely now due to the check above, but keep for robustness
        throw this._createError(A2ATypes.A2AErrorCodes.InternalError, `Task ${taskId} disappeared during status update.`);
    }
    console.log(`[A2ACore] Task ${taskId} status updated to ${newState}`);

      // Emit status event for notifications
      const statusEvent: A2ATypes.TaskStatusUpdateEvent = {
            id: taskId,
            status: { ...updatedTask.status },
            final: this._isFinalState(newState) || newState === 'input-required',
            metadata: updatedTask.metadata
        };
      await this._emitTaskEvent(statusEvent);

      // Add agent message to history if provided
    if (message && message.role === 'agent') {
          await this.taskStore.addTaskHistory(taskId, message);
    }

    return updatedTask;
  }

  async addTaskArtifact(taskId: string, artifactData: Omit<A2ATypes.Artifact, 'index' | 'id' | 'timestamp'>): Promise<number> {
    const task = await this._getTaskOrThrow(taskId);
    const currentArtifacts = task.artifacts ?? [];
    const newIndex = currentArtifacts.length;
    const now = new Date().toISOString();
    const newArtifact: A2ATypes.Artifact = {
        ...artifactData,
        index: newIndex,
          id: randomUUID(),
        timestamp: now,
    };
    const updatedTask = await this.taskStore.updateTask(taskId, { artifacts: [...currentArtifacts, newArtifact] });
     if (!updatedTask) {
        console.error(`[A2ACore] Failed to update task ${taskId} after adding artifact.`);
        throw this._createError(A2ATypes.A2AErrorCodes.InternalError, `Task ${taskId} disappeared during artifact update.`);
    }
    console.log(`[A2ACore] Task ${taskId} artifact added at index ${newIndex}`);

      // Emit artifact event for notifications
      const artifactEvent: A2ATypes.TaskArtifactUpdateEvent = {
            id: taskId,
            artifact: { ...newArtifact },
            metadata: updatedTask.metadata
        };
      await this._emitTaskEvent(artifactEvent);

    return newIndex;
  }

  // Helper to get current task status
  async getTaskStatus(taskId: string): Promise<A2ATypes.TaskState> {
      try {
          const task = await this._getTaskOrThrow(taskId);
          return task.status.state;
      } catch (error: any) {
          // If the error is specifically TaskNotFound, return 'unknown', otherwise rethrow
          if (error.isA2AError && error.code === A2ATypes.A2AErrorCodes.TaskNotFound) {
              console.warn(`[A2ACore] Task ${taskId} not found when fetching status.`);
              return 'unknown';
          }
          // Rethrow other errors (like internal errors from the store)
          console.error(`[A2ACore] Task ${taskId} not found when fetching status.`);
          throw error;
      }
  }

  // --- Internal Helper Methods ---

  // Unified processor finding method
   private async _findProcessor(lookupParams: A2ATypes.TaskSendParams): Promise<TaskProcessor | null> {
        console.log(`[A2ACore] Searching for processor matching params (skillId: ${lookupParams.metadata?.skillId}, taskId: ${lookupParams.id || 'N/A'})`);
        for (const processor of this.taskProcessors) {
            if (await processor.canHandle(lookupParams)) {
                 console.log(`[A2ACore] Found matching processor: ${processor.constructor.name}`);
                return processor;
            }
        }
        console.log(`[A2ACore] No matching processor found for params.`);
        return null;
    }

    // Throws InternalError if essential metadata is missing.
    private _buildLookupParamsForTask(task: A2ATypes.Task): A2ATypes.TaskSendParams {
        const storedSkillId = task.metadata?._processorSkillId as string | undefined;
         if (!storedSkillId) {
             console.error(`[A2ACore] Task ${task.id} is missing the internal _processorSkillId metadata. Cannot look up processor.`);
             throw this._createError(A2ATypes.A2AErrorCodes.InternalError, `Task ${task.id} is missing required skillId metadata.`);
         }
         const lookupParams: A2ATypes.TaskSendParams = {
              message: { role: 'user', parts: [] },
              metadata: { skillId: storedSkillId },
              id: task.id,
              sessionId: task.sessionId
          };
         return lookupParams;
    }

  // Helper to handle common error pattern in processor execution
  private _handleProcessorExecutionError(error: any, updater: TaskUpdater, taskId: string, executionContext: string): void {
    console.error(`[A2ACore] Error during processor '${executionContext}' for task ${taskId}:`, error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    const failMsg: A2ATypes.Message = { role: 'agent', parts: [{ type: 'text', text: `Processor failed during ${executionContext}: ${errorMsg}` }] };
    updater.signalCompletion('failed', failMsg)
        .catch((err: any) => console.error(`[A2ACore] CRITICAL: Failed to mark task ${taskId} as failed after processor ${executionContext} crash:`, err));
  }

  // Execute processor methods asynchronously
  private _executeProcessorStart(processor: TaskProcessor, task: A2ATypes.Task, params: A2ATypes.TaskSendParams, authContext?: any): void {
     const updater = this._createTaskUpdater(task.id);
     Promise.resolve()
       .then(() => processor.start(params, updater, authContext))
       .then(() => {
           console.log(`[A2ACore] Processor 'start' finished for task ${task.id}`);
       })
       .catch(error => {
           this._handleProcessorExecutionError(error, updater, task.id, 'start');
       });
   }

   private _executeProcessorResume(processor: TaskProcessor, taskBeforeResume: A2ATypes.Task, resumeMessage: A2ATypes.Message, authContext?: any): void {
     if (!processor.resume) return;
     const updater = this._createTaskUpdater(taskBeforeResume.id);
     Promise.resolve()
       .then(() => processor.resume!(taskBeforeResume, resumeMessage, updater, authContext))
        .then(() => {
            console.log(`[A2ACore] Processor 'resume' finished for task ${taskBeforeResume.id}`);
        })
       .catch(error => {
            this._handleProcessorExecutionError(error, updater, taskBeforeResume.id, 'resume');
       });
   }

    private _executeProcessorCancel(processor: TaskProcessor, task: A2ATypes.Task, cancelMessage: A2ATypes.Message | undefined, authContext?: any): void {
     if (!processor || !processor.cancel) {
          console.log(`[A2ACore] Processor for task ${task.id} does not support cancel, or processor not found.`);
          return;
     }
     const updater = this._createTaskUpdater(task.id);
      Promise.resolve()
        .then(() => processor.cancel!(task, cancelMessage, updater, authContext))
         .then(() => {
             console.log(`[A2ACore] Processor 'cancel' finished for task ${task.id}`);
         })
        .catch(error => {
            console.error(`[A2ACore] Error during processor 'cancel' for task ${task.id}:`, error);
        });
   }

   // Method to handle internal triggers
   async triggerInternalUpdate(taskId: string, payload: any): Promise<void> {
       const task = await this._getTaskOrThrow(taskId);
        // Find processor using only the ID
        const processor = await this._findProcessorForExistingTask(taskId);
        if (!processor || !processor.handleInternalUpdate) {
            const skillId = task.metadata?._processorSkillId || 'unknown';
            console.error(`[A2ACore] No processor found (skillId: ${skillId}) or processor does not support handleInternalUpdate for task ${taskId}`);
            throw this._createError(A2ATypes.A2AErrorCodes.UnsupportedOperation, `Task ${taskId} (skillId: ${skillId}) cannot handle internal updates.`);
        }
        const updater = this._createTaskUpdater(taskId);
        try {
            await processor.handleInternalUpdate(taskId, payload, updater);
            console.log(`[A2ACore] Processor 'handleInternalUpdate' finished for task ${task.id}`);
        } catch (error) {
            this._handleProcessorExecutionError(error, updater, taskId, 'internal update');
            const processorError = this._createError(
                A2ATypes.A2AErrorCodes.ProcessorError, 
                `Processor failed during internal update: ${error instanceof Error ? error.message : String(error)}`,
                error instanceof Error ? error : undefined
            );
             throw processorError;
        }
   }

  // --- Event Emission Logic ---
  private async _emitTaskEvent(event: CoreTaskEvent): Promise<void> {
        // 1. Send to notification services (includes SseConnectionManager if configured)
        if (this.notificationServices.length > 0) {
             const eventType = 'status' in event ? 'TaskStatusUpdate' : 'artifact' in event ? 'TaskArtifactUpdate' : 'Unknown';
             console.log(`[A2ACore] Emitting event type ${eventType} for task ${event.id} to ${this.notificationServices.length} notification services.`);
             // Use Promise.allSettled to notify all and log errors without stopping others
             const results = await Promise.allSettled(
                 this.notificationServices.map(service => service.notify(event))
             );
             results.forEach((result, index) => {
                 if (result.status === 'rejected') {
                     const serviceName = this.notificationServices[index]?.constructor?.name || `Service ${index}`;
                    console.error(`[A2ACore] Error notifying ${serviceName} for task ${event.id}:`, result.reason);
                 }
             });
        } else {
            // console.log(`[A2ACore] No notification services configured to emit event type ${event.type} for task ${event.id}.`);
        }
   }

  // --- Utility Methods ---
  private _createError(code: number, message: string, data?: any): Error & { isA2AError: boolean, code: number, data?: any } {
    const error = new Error(message) as any;
    error.isA2AError = true;
    error.code = code;
    error.data = data;
    return error;
  }

  // Helper method to create TaskUpdater via closure
  private _createTaskUpdater(taskId: string): TaskUpdater {
    const core = this;
    const checkFinalState = async (): Promise<boolean> => {
        const state = await core.getTaskStatus(taskId);
        return core._isFinalState(state);
    };
    return {
        taskId: taskId,
        async getCurrentStatus(): Promise<A2ATypes.TaskState> {
             return core.getTaskStatus(taskId);
        },
        async updateStatus(newState: A2ATypes.TaskState, message?: A2ATypes.Message): Promise<void> {
            if (await checkFinalState()) {
                 console.warn(`[TaskUpdater] Attempted to update status of task ${taskId} which is in a final state. Ignoring.`);
                return;
            }
            await core.updateTaskStatus(taskId, newState, message);
        },
        async addArtifact(artifactData: Omit<A2ATypes.Artifact, 'index' | 'id' | 'timestamp'>): Promise<string | number> {
             if (await checkFinalState()) {
                 console.warn(`[TaskUpdater] Attempted to add artifact to task ${taskId} which is in a final state. Ignoring.`);
                return -1;
            }
            return core.addTaskArtifact(taskId, artifactData);
        },
        async addHistoryMessage(message: A2ATypes.Message): Promise<void> {
             if (!message.role) {
                 console.error(`[TaskUpdater] History message for task ${taskId} must include a role.`);
                 return;
             }
            await core.taskStore.addTaskHistory(taskId, message);
        },
        async signalCompletion(finalStatus: 'completed' | 'failed' | 'canceled', message?: A2ATypes.Message): Promise<void> {
             if (await checkFinalState()) {
                 console.warn(`[TaskUpdater] Task ${taskId} already in final state. Ignoring signalCompletion(${finalStatus}).`);
                return;
             }
            await core.updateTaskStatus(taskId, finalStatus, message);
        },
        async setInternalState(state: any): Promise<void> {
             if (await checkFinalState()) {
                console.warn(`[TaskUpdater] Attempted to set internal state for task ${taskId} which is in final state. Ignoring.`);
                return;
             }
            await core.taskStore.setInternalState(taskId, state);
        },
        async getInternalState(): Promise<any | null> {
            return core.taskStore.getInternalState(taskId);
        },
    };
  }

  // Helper to get a task or throw TaskNotFound error
  private async _getTaskOrThrow(taskId: string): Promise<A2ATypes.Task> {
      const task = await this.taskStore.getTask(taskId);
      if (!task) {
          console.warn(`[A2ACore] Task with id ${taskId} not found.`);
          throw this._createError(A2ATypes.A2AErrorCodes.TaskNotFound, `Task with id ${taskId} not found.`);
      }
      return task;
  }

  // Helper to find the processor associated with an *existing* task using its stored skillId.
  // Fetches the task internally. Throws if task not found or essential metadata is missing.
  private async _findProcessorForExistingTask(taskId: string): Promise<TaskProcessor | null> {
    const task = await this._getTaskOrThrow(taskId);
    // Note: _buildLookupParamsForTask will throw if _processorSkillId is missing
    const lookupParams = this._buildLookupParamsForTask(task);
    return this._findProcessor(lookupParams);
  }

  // --- Capability Check Helpers ---

  private _ensureStreamingSupportedOrThrow(): SseConnectionManager {
      if (!this.agentCard.capabilities?.streaming) {
            throw this._createError(A2ATypes.A2AErrorCodes.UnsupportedOperation, 'Streaming (SSE) is not supported by this agent.');
      }
      // Find the SseConnectionManager instance within the configured notification services
      const manager = this.notificationServices.find(service => service instanceof SseConnectionManager);
      if (!manager || !(manager instanceof SseConnectionManager)) { // Type guard
          console.error("[A2ACore] Streaming capability enabled, but SseConnectionManager not found in notificationServices.");
          throw this._createError(A2ATypes.A2AErrorCodes.InternalError, "Server configuration error: SSE Manager not available.");
      }
      return manager;
  }

   private _ensurePushNotificationsSupportedOrThrow(): void {
        if (!this.agentCard.capabilities.pushNotifications) {
             throw this._createError(A2ATypes.A2AErrorCodes.PushNotificationsNotSupported, `Agent capability check failed: Push notifications are not supported.`);
        }
        // Optional: Could add a check here if a specific PushNotificationService implementation is required
   }

   // --- Task State Helper ---

   private _isFinalState(state: A2ATypes.TaskState): boolean {
       return ['completed', 'failed', 'canceled'].includes(state);
   }
}

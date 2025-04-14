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

      switch (checkResult.outcome) {
          case 'initiate': {
              // Call the consolidated initiation helper directly
              const { task, initialEvent } = await this._handleTaskInitiation(params, authContext);
              // Emit the initial event to all notification services
              await this._emitTaskEvent(initialEvent);
              return task; // Return only the task object
          }
          case 'resume':
              // Call the unified resume helper
              const { updatedTask, workingEvent } = await this._resumeTask(checkResult.task!, checkResult.processor!, params, authContext);
              // Emit the working event to all notification services
              await this._emitTaskEvent(workingEvent);
              return updatedTask; // Return the updated task object
          case 'error':
              throw checkResult.error!;
          default:
               throw this._createError(A2ATypes.A2AErrorCodes.InternalError, "Internal error: Unexpected outcome from task resumability check.");
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
        outcome: 'initiate' | 'resume' | 'error',
        task?: A2ATypes.Task,
        processor?: TaskProcessor,
        error?: Error
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

        // Task exists, check its state
        const resumableStates: A2ATypes.TaskState[] = ['input-required', 'working', 'submitted'];
        if (resumableStates.includes(task.status.state)) {
            // State is potentially resumable, check processor
            const lookupParams = this._buildLookupParamsForTask(task);
            if (!lookupParams) {
                 const error = this._createError(A2ATypes.A2AErrorCodes.InternalError, `Task ${params.id} is missing required skillId metadata for resume.`);
                 return { outcome: 'error', error };
            }
            const processor = await this._findProcessor(lookupParams);
            if (processor?.resume) {
                // All checks pass for resume
                console.log(`[A2ACore] Task ${params.id} is resumable with processor ${processor.constructor.name}.`);
                return { outcome: 'resume', task, processor };
            } else {
                // Processor doesn't support resume
                 console.warn(`[A2ACore] Task ${params.id} found in resumable state, but processor ${processor?.constructor.name || '(unknown)'} does not support resume.`);
                 const error = this._createError(A2ATypes.A2AErrorCodes.InvalidRequest, `Task ${params.id} is in state ${task.status.state} but its processor cannot resume.`);
                return { outcome: 'error', error };
            }
    } else {
            // Task exists but is in a final or non-resumable state
            console.warn(`[A2ACore] Request for existing task ${params.id} which is in non-resumable state (${task.status.state}).`);
            // Treat this as an error for both send and sendSubscribe - suggest resubscribe if applicable
             const message = task.status.state === 'completed' || task.status.state === 'failed' || task.status.state === 'canceled'
                 ? `Task ${params.id} is already in final state ${task.status.state}. Use tasks/resubscribe if supported.`
                 : `Task ${params.id} exists but is in non-resumable state ${task.status.state}.`;
            const error = this._createError(A2ATypes.A2AErrorCodes.InvalidRequest, message);
            return { outcome: 'error', error };
    }
  }

  async handleTaskSendSubscribe(params: A2ATypes.TaskSubscribeParams, sseResponse: express.Response, authContext?: any): Promise<void> {
      // Initial checks specific to SSE
      if (!this.agentCard.capabilities.streaming) {
           throw this._createError(A2ATypes.A2AErrorCodes.UnsupportedOperation, `Agent does not support streaming (SSE).`);
      }
      const sseService = this.notificationServices.find(s => s instanceof SseConnectionManager);
      if (!sseService) {
          throw this._createError(A2ATypes.A2AErrorCodes.UnsupportedOperation, "Server does not support SSE subscriptions.");
      }

      // Perform the common check
      const checkResult = await this._checkResumability(params);

      // Dispatch based on outcome
      switch (checkResult.outcome) {
            case 'initiate':
                console.log(`[A2ACore] Initiating new task via SSE request (ID provided: ${params.id || 'none'}).`);
                const { task: initialTask, initialEvent } = await this._handleTaskInitiation(params, authContext);
                sseService.addSubscription(initialTask.id, sseResponse);
                await this._emitTaskEvent(initialEvent); // Will send to new subscriber
                break;
            case 'resume':
                 // Call the UNIFIED resume helper
                const { updatedTask, workingEvent } = await this._resumeTask(checkResult.task!, checkResult.processor!, params, authContext);
                sseService.addSubscription(updatedTask.id, sseResponse);
                await this._emitTaskEvent(workingEvent); // Will send to new subscriber
                break;
            case 'error':
                // If an error occurs during the check, we need to ensure the SSE connection isn't left hanging.
                // The express handler usually catches errors, but might not close SSE gracefully.
                // Try to close it here before re-throwing.
                if (!sseResponse.closed) {
                     try { sseResponse.status(400).end(); } catch {} // Best effort close
                 }
                throw checkResult.error!;
            default:
                 if (!sseResponse.closed) {
                     try { sseResponse.status(500).end(); } catch {} // Best effort close
                 }
                throw this._createError(A2ATypes.A2AErrorCodes.InternalError, "Internal error: Unexpected outcome from task resumability check.");
        }

      // Handler keeps connection open if successful
  }

  async handleTaskResubscribe(params: A2ATypes.TaskResubscribeParams, sseResponse: express.Response, authContext?: any): Promise<void> {
      // ... capability check ...
      const sseService = this.notificationServices.find(s => s instanceof SseConnectionManager) as SseConnectionManager | undefined;
      if (!sseService) {
           throw this._createError(A2ATypes.A2AErrorCodes.UnsupportedOperation, "Server does not support SSE subscriptions.");
       }

       const task = await this.taskStore.getTask(params.id);
       if (!task) {
           throw this._createError(A2ATypes.A2AErrorCodes.TaskNotFound, `Task with id ${params.id} not found.`);
       }

      sseService.addSubscription(task.id, sseResponse);

        // Send current status immediately
        const currentStatusEvent: A2ATypes.TaskStatusUpdateEvent = {
            id: task.id,
           status: { ...task.status },
            final: ['completed', 'failed', 'canceled'].includes(task.status.state),
            metadata: task.metadata
        };
      delete currentStatusEvent.status.message;
      const sent = sseService.sendEvent(sseResponse, 'TaskStatusUpdate', currentStatusEvent);
      if (!sent) {
           console.error(`[A2ACore] Failed to send initial SSE status event on resubscribe for task ${task.id}. Connection may be closed.`);
      }
        console.log(`[A2ACore] Client resubscribed to task ${task.id}`);
   }

  async handleTaskGet(params: A2ATypes.TaskGetParams, authContext?: any): Promise<A2ATypes.Task> {
    const task = await this.taskStore.getTask(params.id);
    if (!task) {
      throw this._createError(A2ATypes.A2AErrorCodes.TaskNotFound, `Task with id ${params.id} not found.`);
    }
    const historyLength = Math.min(params.historyLength ?? 0, this.maxHistoryLength);
    task.history = await this.taskStore.getTaskHistory(params.id, historyLength);
    delete task.internalState;
    return task;
  }

  async handleTaskCancel(params: A2ATypes.TaskCancelParams, authContext?: any): Promise<A2ATypes.Task> {
    let task = await this.taskStore.getTask(params.id);
    if (!task) {
      throw this._createError(A2ATypes.A2AErrorCodes.TaskNotFound, `Task with id ${params.id} not found.`);
    }

    const finalStates: A2ATypes.TaskState[] = ['completed', 'canceled', 'failed'];
    if (finalStates.includes(task.status.state)) {
        console.log(`[A2ACore] Task ${params.id} already in final state ${task.status.state}. No action taken.`);
        delete task.internalState;
        task.history = await this.taskStore.getTaskHistory(params.id, 0);
        return task;
    }

    // Find processor and potentially call its cancel method
    const lookupParams = this._buildLookupParamsForTask(task);
    let processor: TaskProcessor | null = null;
    if (lookupParams) {
        processor = await this._findProcessor(lookupParams);
    }
     if (processor?.cancel) {
        this._executeProcessorCancel(processor, task, params.message, authContext);
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
       const task = await this.taskStore.getTask(params.id);
       if (!task) {
           throw this._createError(A2ATypes.A2AErrorCodes.TaskNotFound, `Task with id ${params.id} not found.`);
       }
       if (!this.agentCard.capabilities.pushNotifications) {
            throw this._createError(A2ATypes.A2AErrorCodes.PushNotificationsNotSupported, `Agent does not support push notifications.`);
       }
       await this.taskStore.setPushConfig(params.id, params.pushNotificationConfig ?? null);
       // TODO: Consider emitting an event here? Or is it purely config?
       return { id: params.id, pushNotificationConfig: params.pushNotificationConfig ?? null };
   }

   async handleGetPushNotification(params: A2ATypes.TaskPushNotificationGetParams, authContext?: any): Promise<A2ATypes.TaskPushNotificationParams> {
        const task = await this.taskStore.getTask(params.id);
        if (!task) {
           throw this._createError(A2ATypes.A2AErrorCodes.TaskNotFound, `Task with id ${params.id} not found.`);
        }
        if (!this.agentCard.capabilities.pushNotifications) {
            throw this._createError(A2ATypes.A2AErrorCodes.PushNotificationsNotSupported, `Agent does not support push notifications.`);
       }
       const config = await this.taskStore.getPushConfig(params.id);
       return { id: params.id, pushNotificationConfig: config };
   }

  // --- Core Methods Called by Updater/Internal Logic ---
  async updateTaskStatus(taskId: string, newState: A2ATypes.TaskState, message?: A2ATypes.Message): Promise<A2ATypes.Task> {
    const now = new Date().toISOString();
    const statusUpdate: A2ATypes.TaskStatus = { state: newState, timestamp: now, message };
    const updatedTask = await this.taskStore.updateTask(taskId, { status: statusUpdate });
    if (!updatedTask) {
        console.error(`[A2ACore] Failed to update status for task ${taskId} - task not found in store.`);
        throw this._createError(A2ATypes.A2AErrorCodes.TaskNotFound, `Task ${taskId} not found during status update.`);
    }
    console.log(`[A2ACore] Task ${taskId} status updated to ${newState}`);

      // Emit status event for notifications
      const statusEvent: A2ATypes.TaskStatusUpdateEvent = {
            id: taskId,
            status: { ...updatedTask.status },
            final: ['completed', 'failed', 'canceled'].includes(newState),
            metadata: updatedTask.metadata
        };
      delete statusEvent.status.message;
      await this._emitTaskEvent(statusEvent);

      // Add agent message to history if provided
    if (message && message.role === 'agent') {
          await this.taskStore.addTaskHistory(taskId, message);
    }

    return updatedTask;
  }

  async addTaskArtifact(taskId: string, artifactData: Omit<A2ATypes.Artifact, 'index' | 'id' | 'timestamp'>): Promise<number> {
    const task = await this.taskStore.getTask(taskId);
    if (!task) {
         console.error(`[A2ACore] Failed to add artifact for task ${taskId} - task not found in store.`);
         throw this._createError(A2ATypes.A2AErrorCodes.TaskNotFound, `Task ${taskId} not found when adding artifact.`);
    }
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
      const task = await this.taskStore.getTask(taskId);
      if (!task) {
          console.error(`[A2ACore] Task ${taskId} not found when fetching status.`);
          return 'unknown';
      }
      return task.status.state;
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

    // Helper to build lookup parameters from task metadata
    private _buildLookupParamsForTask(task: A2ATypes.Task): A2ATypes.TaskSendParams | null {
       const storedSkillId = task.metadata?._processorSkillId as string | undefined;
        if (!storedSkillId) {
            console.error(`[A2ACore] Task ${task.id} is missing the internal _processorSkillId metadata. Cannot look up processor.`);
            return null;
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
       const task = await this.taskStore.getTask(taskId);
        if (!task) {
           console.error(`[A2ACore] Internal update triggered for non-existent task ${taskId}`);
           throw this._createError(A2ATypes.A2AErrorCodes.TaskNotFound, `Task ${taskId} not found for internal update.`);
       }
       const lookupParams = this._buildLookupParamsForTask(task);
       if (!lookupParams) {
            throw this._createError(A2ATypes.A2AErrorCodes.InternalError, `Task ${taskId} is missing required skillId metadata for internal update.`);
       }
       const processor = await this._findProcessor(lookupParams);
        if (!processor || !processor.handleInternalUpdate) {
            console.error(`[A2ACore] No processor found (skillId: ${lookupParams.metadata?.skillId}) or processor does not support handleInternalUpdate for task ${taskId}`);
            throw this._createError(A2ATypes.A2AErrorCodes.UnsupportedOperation, `Task ${taskId} (skillId: ${lookupParams.metadata?.skillId}) cannot handle internal updates.`);
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
      if (this.notificationServices.length === 0) return;
      console.log(`[A2ACore] Emitting event type '${'status' in event ? 'TaskStatusUpdate' : 'TaskArtifactUpdate'}' for task ${event.id} to notification services.`);
      const notificationPromises = this.notificationServices
          .map(service => service.notify(event).catch(err => {
              console.error(`[A2ACore] Notification service ${service.constructor.name} failed for task ${event.id}:`, err);
          }));
      await Promise.all(notificationPromises);
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
    const isFinalState = async (): Promise<boolean> => {
        const state = await core.getTaskStatus(taskId);
        return ['completed', 'failed', 'canceled'].includes(state);
    };
    return {
        taskId: taskId,
        async getCurrentStatus(): Promise<A2ATypes.TaskState> {
             return core.getTaskStatus(taskId);
        },
        async updateStatus(newState: A2ATypes.TaskState, message?: A2ATypes.Message): Promise<void> {
            if (await isFinalState()) {
                 console.warn(`[TaskUpdater] Attempted to update status of task ${taskId} which is in a final state. Ignoring.`);
                return;
            }
            await core.updateTaskStatus(taskId, newState, message);
        },
        async addArtifact(artifactData: Omit<A2ATypes.Artifact, 'index' | 'id' | 'timestamp'>): Promise<string | number> {
             if (await isFinalState()) {
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
             if (await isFinalState()) {
                 console.warn(`[TaskUpdater] Task ${taskId} already in final state. Ignoring signalCompletion(${finalStatus}).`);
                return;
             }
            await core.updateTaskStatus(taskId, finalStatus, message);
        },
        async setInternalState(state: any): Promise<void> {
             if (await isFinalState()) {
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
}

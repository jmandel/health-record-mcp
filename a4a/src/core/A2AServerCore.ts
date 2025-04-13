import * as A2ATypes from '../types';
import type { TaskStore, TaskProcessor, A2AServerConfig, GetAuthContextFn } from '../interfaces';
import { TaskUpdaterHandle } from './TaskUpdaterHandle';
import { randomUUID } from 'node:crypto';
import type * as express from 'express'; // Import express types for SSE Response


export class A2AServerCore {
  private readonly agentCard: A2ATypes.AgentCard;
  private readonly taskStore: TaskStore;
  private readonly taskProcessors: TaskProcessor[];
  private readonly getAuthContext?: GetAuthContextFn;
  private readonly maxHistoryLength: number;
  private readonly sseSubscriptions: Map<string, express.Response[]> = new Map(); // Store active SSE connections


  constructor(config: A2AServerConfig) {
    this.agentCard = config.agentCard;
    this.taskStore = config.taskStore;
    this.taskProcessors = config.taskProcessors;
    this.getAuthContext = config.getAuthContext;
    this.maxHistoryLength = config.maxHistoryLength ?? 50; // Default history limit

    if (this.taskProcessors.length === 0) {
        console.warn("[A2ACore] No TaskProcessors configured.");
    }
  }

  getAgentCard(): A2ATypes.AgentCard {
    return this.agentCard;
  }

  // --- Helper methods for SSE ---

  /** @internal Manages adding an SSE subscription */
  _addSseSubscription(taskId: string, res: express.Response): void {
    const subscriptions = this.sseSubscriptions.get(taskId) || [];
    if (!subscriptions.includes(res)) {
        subscriptions.push(res);
        this.sseSubscriptions.set(taskId, subscriptions);
        console.log(`[A2ACore] Added SSE subscription for task ${taskId}. Total: ${subscriptions.length}`);

        // Keep connection alive with periodic comments (optional but good practice)
        const keepAliveInterval = setInterval(() => {
            this._sendSseEvent(res, ':keep-alive', null);
        }, 30000); // Send comment every 30s

        res.on('close', () => {
            clearInterval(keepAliveInterval);
            this._removeSseSubscription(taskId, res);
        });
    }
  }

  /** @internal Manages removing an SSE subscription */
   _removeSseSubscription(taskId: string, res: express.Response): void {
    const subscriptions = this.sseSubscriptions.get(taskId);
    if (subscriptions) {
      const index = subscriptions.indexOf(res);
      if (index !== -1) {
        subscriptions.splice(index, 1);
        console.log(`[A2ACore] Removed SSE subscription for task ${taskId}. Remaining: ${subscriptions.length}`);
        if (subscriptions.length === 0) {
          this.sseSubscriptions.delete(taskId);
           console.log(`[A2ACore] No more SSE subscriptions for task ${taskId}.`);
        } else {
             this.sseSubscriptions.set(taskId, subscriptions); // Update map if needed
        }
      }
    }
  }

  /** @internal Sends a formatted SSE event */
  private _sendSseEvent(res: express.Response, event: string, data: any | null): boolean {
      if (res.closed) {
          console.warn(`[A2ACore] Attempted to send SSE event to closed connection.`);
          return false; // Indicate failure
      }
      try {
          if (event.startsWith(':')) { // Handle comments like :keep-alive
              res.write(`${event}\n\n`);
          } else {
              res.write(`event: ${event}\n`);
              res.write(`data: ${JSON.stringify(data)}\n\n`);
          }
          return true; // Indicate success
      } catch (error) {
          console.error(`[A2ACore] Failed to write SSE event:`, error);
          // Consider removing the subscription if writing fails persistently
          // this._removeSseSubscription(taskId, res); // Need taskId here if we implement this
          return false; // Indicate failure
      }
  }


  // --- Public methods corresponding to A2A RPC methods ---

  async handleTaskSend(params: A2ATypes.TaskSendParams, authContext?: any): Promise<A2ATypes.Task> {
    const processor = await this._findProcessor(params);
    if (!processor) {
      throw this._createError(A2ATypes.A2AErrorCodes.MethodNotFound, `No processor found capable of handling the request.`);
    }

    let task: A2ATypes.Task | null = null;
    let isResume = false;

    if (params.id) {
        task = await this.taskStore.getTask(params.id);
        if (task && (task.status.state === 'input-required' || task.status.state === 'working' || task.status.state === 'submitted')) {
             isResume = true;
             console.log(`[A2ACore] Resuming task ${params.id}`);
             await this.taskStore.addTaskHistory(params.id, params.message);
        } else if (task) {
            // Task exists but not in resumable state, treat as new or throw error?
            // For now, let createOrGetTask handle potential ID collision warning
            console.warn(`[A2ACore] Task ${params.id} exists but not in resumable state (${task.status.state}). Treating as new creation.`);
            task = null; // Force recreation logic below
            isResume = false;
        }
    }

    if (!isResume) {
        // Create task (handles potential ID collision check internally)
        task = await this.taskStore.createOrGetTask(params);
        // Initial response is just the created task state
        const initialResponseTask = { ...task };
        // Remove potentially sensitive internal state for response
        delete initialResponseTask.internalState;
        // Limit history in initial response if requested, server decides final length
        initialResponseTask.history = await this.taskStore.getTaskHistory(task.id, params.historyLength ?? 0);


        // --- Asynchronously start the processor ---
        this._executeProcessorStart(processor, task, params, authContext);
        // ---

        return initialResponseTask;

    } else if (task && processor.resume) { // isResume is true here
         const updater = new TaskUpdaterHandle(task.id, task.status.state, this);

        // --- Asynchronously resume the processor ---
         this._executeProcessorResume(processor, task, params.message, updater, authContext);
        // ---

        // Respond with the current task state immediately after adding history
        const currentTaskState = await this.taskStore.getTask(task.id);
        if (!currentTaskState) throw this._createError(A2ATypes.A2AErrorCodes.TaskNotFound, `Task ${task.id} disappeared unexpectedly during resume.`);

        delete currentTaskState.internalState;
        currentTaskState.history = await this.taskStore.getTaskHistory(task.id, params.historyLength ?? 0);
        return currentTaskState;

    } else if (task && !processor.resume) {
         throw this._createError(A2ATypes.A2AErrorCodes.UnsupportedOperation, `Processor for task ${task.id} does not support resume.`);
    } else {
        // Should not happen due to logic above
        throw this._createError(A2ATypes.A2AErrorCodes.InternalError, `Invalid state reached during task send/resume.`);
    }
  }

  async handleTaskSendSubscribe(params: A2ATypes.TaskSubscribeParams, sseResponse: express.Response, authContext?: any): Promise<void> {
      // Similar logic to handleTaskSend, but sets up SSE and sends initial event

      const processor = await this._findProcessor(params);
      if (!processor) {
          throw this._createError(A2ATypes.A2AErrorCodes.MethodNotFound, `No processor found capable of handling the request.`);
      }
      if (!this.agentCard.capabilities.streaming) {
           throw this._createError(A2ATypes.A2AErrorCodes.UnsupportedOperation, `Agent does not support streaming (SSE).`);
      }


      // Task creation/retrieval
      let task: A2ATypes.Task | null = null;

      if (params.id) {
          task = await this.taskStore.getTask(params.id);
          if (task) {
               console.warn(`[A2ACore] Task ${params.id} already exists. Use tasks/resubscribe to attach SSE to existing tasks.`);
               throw this._createError(A2ATypes.A2AErrorCodes.InvalidRequest, `Task ${params.id} already exists. Use tasks/resubscribe for existing tasks.`);
          }
      }

       // Create task
      task = await this.taskStore.createOrGetTask(params);

        // Add SSE subscription *before* starting processor and sending first event
       this._addSseSubscription(task.id, sseResponse);

        // Send initial status immediately via SSE
       const initialEvent: A2ATypes.TaskStatusUpdateEvent = {
            id: task.id,
            status: { ...task.status }, // Clone status
            final: ['completed', 'failed', 'canceled'].includes(task.status.state),
            metadata: task.metadata
        };
         delete initialEvent.status.message; // Don't include message in initial status event by default

        this._sendSseEvent(sseResponse, 'TaskStatusUpdate', initialEvent);


        // --- Asynchronously start the processor ---
        // Errors in the processor will trigger further SSE events (e.g., status=failed)
        this._executeProcessorStart(processor, task, params, authContext);
        // ---

       // The handler keeps the connection open; this method returns void.
  }


  async handleTaskResubscribe(params: A2ATypes.TaskResubscribeParams, sseResponse: express.Response, authContext?: any): Promise<void> {
       if (!this.agentCard.capabilities.streaming) {
           throw this._createError(A2ATypes.A2AErrorCodes.UnsupportedOperation, `Agent does not support streaming (SSE).`);
       }

       const task = await this.taskStore.getTask(params.id);
       if (!task) {
           throw this._createError(A2ATypes.A2AErrorCodes.TaskNotFound, `Task with id ${params.id} not found.`);
       }

       // TODO: Add authorization check using authContext if needed

       this._addSseSubscription(task.id, sseResponse);

        // Send current status immediately
        const currentStatusEvent: A2ATypes.TaskStatusUpdateEvent = {
            id: task.id,
            status: { ...task.status }, // Clone status
            final: ['completed', 'failed', 'canceled'].includes(task.status.state),
            metadata: task.metadata
        };
         delete currentStatusEvent.status.message; // Don't include message by default

        this._sendSseEvent(sseResponse, 'TaskStatusUpdate', currentStatusEvent);

        // Optionally, send recent history or artifacts if needed/specified?
        // The spec doesn't detail resubscribe sending history/artifacts, but might be useful.
        // For now, just send current status. Client can use tasks/get if needed.
        console.log(`[A2ACore] Client resubscribed to task ${task.id}`);

        // This method doesn't return data via the primary HTTP response path,
        // as the connection is now dedicated to SSE.
   }


  async handleTaskGet(params: A2ATypes.TaskGetParams, authContext?: any): Promise<A2ATypes.Task> {
    const task = await this.taskStore.getTask(params.id);
    if (!task) {
      throw this._createError(A2ATypes.A2AErrorCodes.TaskNotFound, `Task with id ${params.id} not found.`);
    }
    // TODO: Add authorization check using authContext if needed

    const historyLength = Math.min(params.historyLength ?? 0, this.maxHistoryLength);
    task.history = await this.taskStore.getTaskHistory(params.id, historyLength);
    delete task.internalState; // Don't expose internal state

    return task;
  }

  async handleTaskCancel(params: A2ATypes.TaskCancelParams, authContext?: any): Promise<A2ATypes.Task> {
    let task = await this.taskStore.getTask(params.id);
    if (!task) {
      throw this._createError(A2ATypes.A2AErrorCodes.TaskNotFound, `Task with id ${params.id} not found.`);
    }

    // Check if task is already in a final state
    const finalStates: A2ATypes.TaskState[] = ['completed', 'canceled', 'failed'];
    if (finalStates.includes(task.status.state)) {
        console.log(`[A2ACore] Task ${params.id} already in final state ${task.status.state}. No action taken.`);
        delete task.internalState;
        task.history = await this.taskStore.getTaskHistory(params.id, 0); // No history on cancel response by default
        return task; // Return current state
    }

    // Optionally find processor and call its cancel method
     const processor = await this._findProcessorForTask(task);
     if (processor?.cancel) {
         const updater = new TaskUpdaterHandle(task.id, task.status.state, this);
         // Execute async, but don't wait for response here - core sets status immediately
         this._executeProcessorCancel(processor, task, params.message, updater, authContext);
     }

    // Update status immediately
    const updatedTask = await this.updateTaskStatus(params.id, 'canceled', params.message);

    // Add cancellation request message to history if provided
    if (params.message) {
        await this.addTaskHistory(params.id, params.message);
    }

    delete updatedTask.internalState;
    updatedTask.history = []; // No history on cancel response by default

    return updatedTask;
  }

   async handleSetPushNotification(params: A2ATypes.TaskPushNotificationParams, authContext?: any): Promise<A2ATypes.TaskPushNotificationParams> {
       const task = await this.taskStore.getTask(params.id);
       if (!task) {
           throw this._createError(A2ATypes.A2AErrorCodes.TaskNotFound, `Task with id ${params.id} not found.`);
       }
       // TODO: Check agent capabilities - pushNotifications must be true
       if (!this.agentCard.capabilities.pushNotifications) {
            throw this._createError(A2ATypes.A2AErrorCodes.PushNotificationsNotSupported, `Agent does not support push notifications.`);
       }

       await this.taskStore.setPushConfig(params.id, params.pushNotificationConfig ?? null);
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


  // --- Internal methods for TaskUpdaterHandle ---

  async updateTaskStatus(taskId: string, newState: A2ATypes.TaskState, message?: A2ATypes.Message): Promise<A2ATypes.Task> {
    const now = new Date().toISOString();
    const statusUpdate: A2ATypes.TaskStatus = { state: newState, timestamp: now, message };

    const updatedTask = await this.taskStore.updateTask(taskId, { status: statusUpdate });
    if (!updatedTask) {
        console.error(`[A2ACore] Failed to update status for task ${taskId} - task not found in store.`);
        throw this._createError(A2ATypes.A2AErrorCodes.TaskNotFound, `Task ${taskId} not found during status update.`);
    }
    console.log(`[A2ACore] Task ${taskId} status updated to ${newState}`);

    // Add agent message to history if provided in status update
    if (message && message.role === 'agent') {
        await this.addTaskHistory(taskId, message);
    }

    this._triggerNotifications(updatedTask); // Check and send notifications
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
        id: randomUUID(), // Assign an internal ID
        timestamp: now,
    };

    const updatedTask = await this.taskStore.updateTask(taskId, { artifacts: [...currentArtifacts, newArtifact] });
     if (!updatedTask) {
        console.error(`[A2ACore] Failed to update task ${taskId} after adding artifact.`);
        // Should not happen if task existed initially
        throw this._createError(A2ATypes.A2AErrorCodes.InternalError, `Task ${taskId} disappeared during artifact update.`);
    }
    console.log(`[A2ACore] Task ${taskId} artifact added at index ${newIndex}`);
    this._triggerNotifications(updatedTask, newArtifact); // Check and send notifications
    return newIndex;
  }

  async addTaskHistory(taskId: string, message: A2ATypes.Message): Promise<void> {
      // Add role if missing? Default to 'agent'? For now, require role.
      if (!message.role) {
          console.warn(`[A2ACore] History message for task ${taskId} is missing role. Skipping.`);
          return;
      }
    await this.taskStore.addTaskHistory(taskId, message);
  }

  // --- Internal Helper Methods ---

   private async _findProcessor(params: A2ATypes.TaskSendParams): Promise<TaskProcessor | null> {
        for (const processor of this.taskProcessors) {
            if (await processor.canHandle(params)) {
                return processor;
            }
        }
        return null;
    }

    // Find processor based on existing task data (e.g., metadata) if needed
   private async _findProcessorForTask(task: A2ATypes.Task): Promise<TaskProcessor | null> {
       // This might require storing which processor handled the task initially
       // Or re-running canHandle based on some stored criteria in task.metadata
       // For now, assume the first processor handles everything if only one exists
       // Or implement a more robust matching logic if multiple processors are common.
       if (this.taskProcessors.length > 0) {
            // Placeholder: Re-evaluate based on initial message if stored, or metadata
            // This is a simplification. Real systems might need explicit processor mapping.
           const initialHistory = await this.taskStore.getTaskHistory(task.id, 1);
           if (initialHistory.length > 0 && initialHistory[0].role === 'user') {
               const pseudoParams: A2ATypes.TaskSendParams = { message: initialHistory[0], metadata: task.metadata, id: task.id, sessionId: task.sessionId };
                return this._findProcessor(pseudoParams);
           } else if (this.taskProcessors.length === 1) {
                // Fallback if history isn't useful and only one processor
               return this.taskProcessors[0];
           }
       }
       return null;
   }


  // Execute processor methods asynchronously without blocking the main request flow
  private _executeProcessorStart(processor: TaskProcessor, task: A2ATypes.Task, params: A2ATypes.TaskSendParams, authContext?: any): void {
     const updater = new TaskUpdaterHandle(task.id, task.status.state, this);
     Promise.resolve() // Ensure it runs in the next tick
       .then(() => processor.start(params, updater, authContext))
       .then(() => {
           // Optional: Check if task is still processing after start() returns, maybe warn if not completed/failed
           console.log(`[A2ACore] Processor 'start' finished for task ${task.id}`);
       })
       .catch(error => {
           console.error(`[A2ACore] Error during processor 'start' for task ${task.id}:`, error);
           // Attempt to mark task as failed if processor crashes
           const errorMsg = error instanceof Error ? error.message : String(error);
           const failMsg: A2ATypes.Message = { role: 'agent', parts: [{ type: 'text', text: `Processor failed during start: ${errorMsg}` }] };
           return this.updateTaskStatus(task.id, 'failed', failMsg)
                       .catch(err => console.error(`[A2ACore] CRITICAL: Failed to mark task ${task.id} as failed after processor crash:`, err));
       });
   }

   private _executeProcessorResume(processor: TaskProcessor, task: A2ATypes.Task, resumeMessage: A2ATypes.Message, updater: TaskUpdaterHandle, authContext?: any): void {
     if (!processor.resume) return; // Should have been checked before calling
     updater._updateLocalStatus(task.status.state); // Sync updater's view
     Promise.resolve()
       .then(() => processor.resume!(task, resumeMessage, updater, authContext))
        .then(() => {
            console.log(`[A2ACore] Processor 'resume' finished for task ${task.id}`);
        })
       .catch(error => {
           console.error(`[A2ACore] Error during processor 'resume' for task ${task.id}:`, error);
           const errorMsg = error instanceof Error ? error.message : String(error);
           const failMsg: A2ATypes.Message = { role: 'agent', parts: [{ type: 'text', text: `Processor failed during resume: ${errorMsg}` }] };
           return this.updateTaskStatus(task.id, 'failed', failMsg)
                 .catch(err => console.error(`[A2ACore] CRITICAL: Failed to mark task ${task.id} as failed after processor crash:`, err));
       });
   }

    private _executeProcessorCancel(processor: TaskProcessor, task: A2ATypes.Task, cancelMessage: A2ATypes.Message | undefined, updater: TaskUpdaterHandle, authContext?: any): void {
     if (!processor.cancel) return;
     updater._updateLocalStatus(task.status.state); // Sync updater's view
     Promise.resolve()
       .then(() => processor.cancel!(task, cancelMessage, updater, authContext))
        .then(() => {
            console.log(`[A2ACore] Processor 'cancel' finished for task ${task.id}`);
        })
       .catch(error => {
           console.error(`[A2ACore] Error during processor 'cancel' for task ${task.id}:`, error);
           // Don't auto-fail here, cancellation already happened at core level
       });
   }


   // Method to handle internal triggers (e.g., from a webhook)
   async triggerInternalUpdate(taskId: string, payload: any): Promise<void> {
       const task = await this.taskStore.getTask(taskId);
        if (!task) {
           console.error(`[A2ACore] Internal update triggered for non-existent task ${taskId}`);
           throw this._createError(A2ATypes.A2AErrorCodes.TaskNotFound, `Task ${taskId} not found for internal update.`);
       }

       const processor = await this._findProcessorForTask(task);
        if (!processor || !processor.handleInternalUpdate) {
            console.error(`[A2ACore] No processor found or processor does not support handleInternalUpdate for task ${taskId}`);
            throw this._createError(A2ATypes.A2AErrorCodes.UnsupportedOperation, `Task ${taskId} cannot handle internal updates.`);
       }

        const updater = new TaskUpdaterHandle(task.id, task.status.state, this);
        try {
            await processor.handleInternalUpdate(taskId, payload, updater);
            console.log(`[A2ACore] Processor 'handleInternalUpdate' finished for task ${task.id}`);
        } catch (error) {
             console.error(`[A2ACore] Error during processor 'handleInternalUpdate' for task ${task.id}:`, error);
             const errorMsg = error instanceof Error ? error.message : String(error);
             const failMsg: A2ATypes.Message = { role: 'agent', parts: [{ type: 'text', text: `Processor failed during internal update: ${errorMsg}` }] };
             await this.updateTaskStatus(task.id, 'failed', failMsg);
             // Re-throw or handle as needed
             throw this._createError(A2ATypes.A2AErrorCodes.ProcessorError, `Processor failed during internal update: ${errorMsg}`, error instanceof Error ? error : undefined);
        }
   }

  private _triggerNotifications(task: A2ATypes.Task, newArtifact?: A2ATypes.Artifact): void {
    // --- Trigger Push Notifications (Existing TODO) ---
    if (task.pushNotificationConfig) {
         console.log(`[A2ACore] TODO: Trigger Push Notification for task ${task.id} to ${task.pushNotificationConfig.url}. New Status: ${task.status.state}. New Artifact: ${!!newArtifact}`);
         // Example payload structure:
         // const payload: A2ATypes.TaskStatusUpdateEvent = { id: task.id, status: task.status, final: ['completed','failed','canceled'].includes(task.status.state) };
         // const artifactPayload: A2ATypes.TaskArtifactUpdateEvent = { id: task.id, artifact: newArtifact };
         // Use Bun.fetch() to send the notification respecting auth config.
    }

    // --- Trigger SSE Notifications ---
    const sseSubs = this.sseSubscriptions.get(task.id);
    if (sseSubs && sseSubs.length > 0) {
         console.log(`[A2ACore] Triggering SSE notifications for task ${task.id} to ${sseSubs.length} subscribers.`);
         const isFinalState = ['completed', 'failed', 'canceled'].includes(task.status.state);

         // Create status update event
         const statusEvent: A2ATypes.TaskStatusUpdateEvent = {
             id: task.id,
             status: { ...task.status }, // Clone status
             final: isFinalState,
             metadata: task.metadata
         };
         // Don't include potentially large agent message in status update by default
         // Client can use tasks/get if they need full history/messages
         delete statusEvent.status.message;

         let artifactEvent: A2ATypes.TaskArtifactUpdateEvent | null = null;
         if (newArtifact) {
             artifactEvent = {
                id: task.id,
                 artifact: { ...newArtifact }, // Clone artifact
                 metadata: task.metadata
            };
         }

        // Send events to all active subscribers for this task
         const activeSubs = [...sseSubs]; // Iterate over a copy in case of modifications during send
         activeSubs.forEach(sub => {
             // Always send status update
             const statusSent = this._sendSseEvent(sub, 'TaskStatusUpdate', statusEvent);

            // Send artifact update if one was generated in this trigger
            if (artifactEvent && statusSent) { // Only send artifact if status send didn't fail immediately
                this._sendSseEvent(sub, 'TaskArtifactUpdate', artifactEvent);
             }

             // If the task reached a final state, we can optionally close the connection from the server side
             // However, the spec shows 'final: true' in the event, implying the client might handle closure.
             // Let's stick to the spec and just mark final: true.
             // if (isFinalState && statusSent) {
             //     console.log(`[A2ACore] Task ${task.id} reached final state. Closing SSE connection.`);
             //     sub.end(); // This automatically triggers the 'close' event handler to remove the subscription
             // }
         });
    } else {
         console.log(`[A2ACore] No active SSE subscriptions for task ${task.id} to notify.`);
     }
  }

  private _createError(code: number, message: string, data?: any): Error & { isA2AError: boolean, code: number, data?: any } {
    const error = new Error(message) as any;
    error.isA2AError = true;
    error.code = code;
    error.data = data;
    return error;
  }
}

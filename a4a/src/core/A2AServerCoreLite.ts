// src/core/A2AServerCoreLite.ts (UPDATED SSE final‑flag semantics)
// -----------------------------------------------------------------------------
// A light‑weight, **spec‑complete** in‑memory A2A core for prototypes.
// Differentiates between "terminal task states" vs "SSE subscription final events".
// -----------------------------------------------------------------------------

import { Mutex } from "async-mutex";
import type * as express from "express";
import { randomUUID } from "node:crypto";
import pino from "pino";
import { z } from "zod";

import type { NotificationService, TaskStore } from "../interfaces";
import type {
  ProcessorInputValue,
  ProcessorStepContext,
  ProcessorYieldValue,
  TaskProcessorV2,
} from "../interfaces/processorV2";
import { ProcessorCancellationError } from "../interfaces/processorV2";
import type {
  AgentCard,
  Artifact,
  Task,
  TaskArtifactUpdateEvent,
  TaskCancelParams,
  TaskGetParams,
  TaskPushNotificationParams,
  TaskResubscribeParams,
  TaskSendParams,
  TaskState,
  TaskStatus,
  TaskStatusUpdateEvent
} from "../types";
import { SseConnectionManager } from "./SseConnectionManager";

// -----------------------------------------------------------------------------
// Error helper matching JSON‑RPC mapping
// -----------------------------------------------------------------------------
export class A2AError extends Error {
  constructor(public readonly code: number, message: string, public readonly data?: unknown) {
    super(message);
    this.name = "A2AError";
  }
}

const log = pino({ name: "A2ACoreLite" });

// one mutex per task for exclusive generator access
const taskLocks = new Map<string, Mutex>();
const getLock = (id: string) => taskLocks.get(id) ?? taskLocks.set(id, new Mutex()).get(id)!;

// -----------------------------------------------------------------------------
// Zod schemas for RPC parameter validation
// -----------------------------------------------------------------------------
const zMessage = z.object({ role: z.enum(["user", "agent"]), parts: z.array(z.any()), metadata: z.any().optional() });
const zPushNotificationConfig = z.object({ url: z.string().url(), token: z.string().optional(), authentication: z.any().optional() }).optional();

const zSend = z.object({
  id: z.string().uuid().optional(),
  sessionId: z.string().optional(),
  message: zMessage,
  historyLength: z.number().int().min(0).optional(),
  pushNotification: zPushNotificationConfig,
  metadata: z.any().optional(),
});
const zSubscribe = zSend;
const zResub = z.object({ id: z.string().uuid() });
const zGet = z.object({ id: z.string().uuid(), historyLength: z.number().int().min(0).optional() });
const zCancel = z.object({ id: z.string().uuid() });

export interface A2ACoreLiteConfig {
  agentCard: Partial<AgentCard>;
  taskStore: TaskStore;
  processors: TaskProcessorV2[];
  notificationServices?: NotificationService[];
}

export class A2AServerCoreLite {
  readonly card: AgentCard;
  private readonly store: TaskStore;
  private readonly procs: TaskProcessorV2[];
  private readonly sse: SseConnectionManager | null;

  constructor(cfg: A2ACoreLiteConfig) {
    this.store = cfg.taskStore;
    this.procs = cfg.processors;
    this.sse = cfg.notificationServices?.find((s): s is SseConnectionManager => s instanceof SseConnectionManager) ?? null;

    this.card = {
      name: cfg.agentCard.name ?? "Prototype Agent",
      version: cfg.agentCard.version ?? "0.0.0",
      description: cfg.agentCard.description ?? "",
      url: cfg.agentCard.url ?? "",
      capabilities: {
        // Start with potentially provided capabilities
        ...cfg.agentCard.capabilities,
        // THEN override/set based on detected features
        streaming: !!this.sse, // Ensure this reflects reality
        pushNotifications: false, // TODO: Detect if actual push service exists
        stateTransitionHistory: false, // TODO: Detect if store supports history
      },
      authentication: cfg.agentCard.authentication ?? { schemes: [] },
      defaultInputModes: cfg.agentCard.defaultInputModes ?? ["text/plain"],
      defaultOutputModes: cfg.agentCard.defaultOutputModes ?? ["text/plain"],
      skills: cfg.agentCard.skills ?? [],
    } as AgentCard;
    log.info({ card: this.card }, "Agent card ready");
  }

  /**
   * Returns the constructed Agent Card for this server instance.
   */
  public getAgentCard(): AgentCard {
    return this.card;
  }

  // ---------------------------------------------------------------------------
  // 1. tasks/send → JSON‑RPC
  async handleTaskSend(raw: unknown): Promise<Task> {
    const params = zSend.parse(raw) as TaskSendParams;
    const taskId = params.id ?? randomUUID();
    const processor = await this._pickProcessor(params);

    let task = await this.store.getTask(taskId);
    if (!task) {
      task = await this.store.createOrGetTask({
        id: taskId,
        sessionId: params.sessionId,
        message: params.message,
        pushNotification: params.pushNotification,
        metadata: params.metadata,
      });
    } else {
      const updates: Partial<Task> = {};
      if (params.sessionId) updates.sessionId = params.sessionId;
      if (params.pushNotification) updates.pushNotificationConfig = params.pushNotification;
      if (Object.keys(updates).length > 0) await this.store.updateTask(taskId, updates);
    }

    await this.store.addTaskHistory(taskId, params.message);
    void this._scheduleDrive(taskId, processor, params);

    const finalTask = await this.store.getTask(taskId);
    if (!finalTask) throw new A2AError(-32603, `Internal error: Task ${taskId} disappeared after creation/scheduling`);
    return finalTask;
  }

  // ---------------------------------------------------------------------------
  // 2. tasks/sendSubscribe → SSE
  async handleTaskSendSubscribe(requestId: string | number | null, raw: unknown, res: express.Response) {
    if (!this.card.capabilities.streaming || !this.sse) throw new A2AError(-32004, "Streaming not supported");
    const params = zSubscribe.parse(raw) as TaskSendParams;
    const taskId = params.id ?? randomUUID();

    this.sse.addSubscription(taskId, requestId, res);

    const task = await this.handleTaskSend({ ...params, id: taskId });

    // If the task is already paused for input, skip sending that duplicate final event
    if (task.status.state !== 'input-required') {
      const initialStatusEvent: TaskStatusUpdateEvent = {
        id: task.id,
        status: task.status,
        final: this._shouldSseBeFinal(task.status.state),
      };
      this.sse.notify(initialStatusEvent);
    }
  }

  // ---------------------------------------------------------------------------
  // 3. tasks/resubscribe → SSE
  async handleTaskResubscribe(requestId: string | number | null, raw: unknown, res: express.Response) {
    if (!this.card.capabilities.streaming || !this.sse) throw new A2AError(-32004, "Streaming not supported");
    const params = zResub.parse(raw) as TaskResubscribeParams;
    const task = await this.store.getTask(params.id);
    if (!task) throw new A2AError(-32001, "Task not found");

    this.sse.addSubscription(task.id, requestId, res);
    const currentStatusEvent: TaskStatusUpdateEvent = {
      id: task.id,
      status: task.status,
      final: this._shouldSseBeFinal(task.status.state),
    };
    this.sse.notify(currentStatusEvent);
  }

  // ---------------------------------------------------------------------------
  // 4. tasks/get
  async handleTaskGet(raw: unknown): Promise<Task> {
    const params = zGet.parse(raw) as TaskGetParams;
    const task = await this.store.getTask(params.id);
    if (!task) throw new A2AError(-32001, "Task not found");
    if (params.historyLength && params.historyLength > 0) task.history = await this.store.getTaskHistory(task.id, params.historyLength);
    return task;
  }

  // ---------------------------------------------------------------------------
  // 5. tasks/cancel
  async handleTaskCancel(raw: unknown): Promise<Task> {
    const params = zCancel.parse(raw) as TaskCancelParams;
    const taskId = params.id;
    let task = await this.store.getTask(taskId);
    if (!task) throw new A2AError(-32001, "Task not found");

    // If already in a terminal state, just return it
    if (this._isTerminalState(task.status.state)) return task;

    const lock = getLock(taskId);
    await lock.runExclusive(async () => {
       // Re-fetch task state inside lock for consistency
      task = await this.store.getTask(taskId);     ;
      if (!task || this._isTerminalState(task.status.state)) return; // Gone or already terminal

      const isRunning = (task as any).internalState?.isRunning;

      if (isRunning) {
        // Generator is potentially stuck. Force cancellation externally.
        log.warn({ taskId }, "Task is running, forcing cancellation via _handleGenError");
        // Directly call the error handler with a cancellation error.
        // This will set state, notify, clean up lock map, and mark isRunning=false.
        await this._handleGenError(taskId, new ProcessorCancellationError());
      } else {
        // Task is not running (paused, completed, failed, never started properly)
        // Just set the status directly.
        log.info({ taskId }, "Task is not running, directly setting status to canceled.");
        const canceledStatus: TaskStatus = { state: "canceled", timestamp: new Date().toISOString() };
        await this.store.updateTask(taskId, { status: canceledStatus });
        this.sse?.notify({ id: taskId, status: canceledStatus, final: true });
        // Ensure lock map is cleaned up if it exists for a non-running task
        taskLocks.delete(taskId);
      }
      // Note: We no longer call gen.throw() here to avoid the deadlock
    });

    // Return the latest state after cancellation attempt
    const finalTask = await this.store.getTask(params.id);
    // If _handleGenError ran, the task should exist and be canceled.
    // If it set status directly, it should exist and be canceled.
    if (!finalTask) throw new A2AError(-32603, `Internal error: Task ${params.id} disappeared after cancellation attempt`);
    if (finalTask.status.state !== 'canceled') {
        log.warn({taskId: finalTask.id, status: finalTask.status.state}, "Task status not canceled immediately after handleTaskCancel returned, state might be racing.");
    }
    return finalTask;
  }

  // ---------------------------------------------------------------------------
  // 6. tasks/pushNotification/set & get → unsupported
  async handleSetPushNotification(raw: unknown): Promise<TaskPushNotificationParams> {
    throw new A2AError(-32003, "Push notifications not supported in Lite core");
  }
  async handleGetPushNotification(raw: unknown): Promise<TaskPushNotificationParams> {
    throw new A2AError(-32003, "Push notifications not supported in Lite core");
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  private async _pickProcessor(params: TaskSendParams): Promise<TaskProcessorV2> {
    for (const p of this.procs) if (await p.canHandle(params)) return p;
    throw new A2AError(-32601, "No processor can handle request");
  }

  /**
   * Schedules/resumes a generator. Ensures only one active processing loop runs per task.
   */
  private async _scheduleDrive(taskId: string, p: TaskProcessorV2, params: TaskSendParams) {
    const lock = getLock(taskId);
    const release = await lock.acquire(); // Acquire lock manually
    try {
      let task = await this.store.getTask(taskId);
      if (!task) { // Should not happen if called after createOrGetTask
        log.error({ taskId }, "_scheduleDrive called for non-existent task");
        return;
      }

      // Avoid starting if already running or terminal
      if ((task as any).internalState?.isRunning || this._isTerminalState(task.status.state)) {
        log.debug({ taskId, status: task.status, isRunning: (task as any).internalState?.isRunning }, "Skipping drive: Task already running or terminal");
        return;
      }

      let gen = (task as any).internalState?.gen as AsyncGenerator<ProcessorYieldValue, void, ProcessorInputValue> | undefined;
      let isResuming = !!gen;

      if (!gen) {
        log.info({ taskId }, "Creating new generator for task");
        gen = p.process({ task } as ProcessorStepContext, params);
      }

      // Mark as running *within* the lock
      // Keep existing generator instance if resuming
      await this.store.updateTask(taskId, { internalState: { gen, isRunning: true } });

      // --- CRITICAL: Release lock BEFORE starting/resuming the generator --- 
      release();

      // Pass the input message ONLY if resuming a paused generator
      const inputValue: ProcessorInputValue | undefined = isResuming ? { type: 'message', message: params.message } : undefined;

      // Now drive the generator without holding the lock, passing input if resuming
      await this._driveGenerator(taskId, gen, inputValue);

    } catch(err) {
      log.error({ taskId, err }, "Error during _scheduleDrive setup");
      // Ensure lock is released if setup fails
      await this._handleGenError(taskId, err as Error, true); // Pass flag indicating setup error
      // Handle setup error - potentially set task state to failed
    } finally {
      // Safety net: ensure lock is always released if not already
      if (lock.isLocked()) {
         release();
      }
    }
  }

  private async _driveGenerator(
    taskId: string,
    gen: AsyncGenerator<ProcessorYieldValue, void, ProcessorInputValue>,
    initialInputValue?: ProcessorInputValue // Add optional input value for the first .next() call when resuming
  ) {
    let taskStillRunning = true;
    let errorCaught: Error | null = null;
    let stepResult: IteratorResult<ProcessorYieldValue, void> | null = null;
    // Use the initial input value only for the very first .next() call if provided
    let nextCallInputValue = initialInputValue;

    try {
      while (taskStillRunning) {
        // Reset for next iteration
        errorCaught = null;
        stepResult = null;

        // *** Run generator step WITHOUT lock ***
        try {
          // Pass input value to .next() if available (cleared after first use)
          stepResult = await gen.next(nextCallInputValue);
        } catch (err) {
          errorCaught = err as Error;
        } finally {
           // Clear input value after the first time .next() is called with it
           if (nextCallInputValue) nextCallInputValue = undefined;
        }

        // *** Acquire lock briefly to handle yield/completion/error ***
        const lock = getLock(taskId);
        await lock.runExclusive(async () => {
          // *** CRITICAL: Re-fetch task state inside lock ***
          const currentTask = await this.store.getTask(taskId);

          // *** Check if task was canceled/completed externally while generator was running ***
          if (!currentTask) {
            log.warn({ taskId }, "Task disappeared while generator was processing step. Stopping driver.");
            taskStillRunning = false;
            taskLocks.delete(taskId); // Clean up lock map entry
            return; // Exit lock handler
          }
          if (this._isTerminalState(currentTask.status.state)) {
            log.info({ taskId, status: currentTask.status.state }, "Task found in terminal state upon generator resumption. Stopping driver.");
            taskStillRunning = false;
            // Ensure isRunning is false if somehow missed
            if ((currentTask as any).internalState?.isRunning) {
                await this.store.updateTask(taskId, { internalState: { isRunning: false } });
            }
            taskLocks.delete(taskId); // Clean up lock map entry
            return; // Exit lock handler
          }

          // *** Now, handle the result (error, completion, or yield) ONLY if task is still active ***
          if (errorCaught) {
            // Handle error caught outside the lock
            await this._handleGenError(taskId, errorCaught);
            taskStillRunning = false; // Error is terminal
          } else if (stepResult?.done) {
            // Handle normal completion
            log.info({ taskId }, "Generator completed normally (inside lock)");
            taskStillRunning = false;
            const completedStatus: TaskStatus = { state: "completed", timestamp: new Date().toISOString() };
            await this.store.updateTask(taskId, { status: completedStatus, internalState: { isRunning: false } }); // Mark not running
            this.sse?.notify({ id: taskId, status: completedStatus, final: true });
            taskLocks.delete(taskId); // Clean up lock map entry on completion
          } else if (stepResult) {
            // Handle yield value
            await this._handleYield(taskId, stepResult.value);
            // Check if paused
            if (stepResult.value.type === "statusUpdate" && stepResult.value.state === "input-required") {
              log.info({ taskId }, "Generator paused for input (inside lock)");
              taskStillRunning = false; // Stop the loop
              // Keep generator instance for potential resumption
              await this.store.updateTask(taskId, { internalState: { gen, isRunning: false } });
            }
          } else {
             // Should not happen if errorCaught is null and stepResult is null
             log.error({ taskId }, "Reached unexpected state in _driveGenerator lock handler");
             taskStillRunning = false;
             await this._handleGenError(taskId, new Error("Internal generator driver error"));
          }
        }); // *** Lock released here ***

      }
    } catch (outerError) {
      // This catch block handles errors during the lock acquisition/release itself,
      // or other unexpected errors outside the main generator step try/catch.
      log.error({ taskId, error: outerError }, "Outer error in _driveGenerator loop");
      // Attempt to handle as a general failure, acquiring the lock briefly
      const lock = getLock(taskId);
      await lock.runExclusive(async () => {
          await this._handleGenError(taskId, outerError instanceof Error ? outerError : new Error(String(outerError)));
      });
    }
    log.debug({ taskId }, "_driveGenerator loop finished");
  }

  // _handleYield is now always called *within* a lock from _driveGenerator
  private async _handleYield(taskId: string, y: ProcessorYieldValue) {
    // No need to acquire lock here
    switch (y.type) {
      case "statusUpdate": {
        const status: TaskStatus = { state: y.state as TaskState, timestamp: new Date().toISOString(), message: y.message };
        await this.store.updateTask(taskId, { status });
        if (y.message?.role === "agent") await this.store.addTaskHistory(taskId, y.message);
        const event: TaskStatusUpdateEvent = {
          id: taskId,
          status,
          final: this._shouldSseBeFinal(status.state),
        };
        this.sse?.notify(event);
        break;
      }
      case "artifact": {
        const task = await this.store.getTask(taskId);
        if (!task) {
          log.error({ taskId }, "Task disappeared during artifact yield handling (inside lock)");
          throw new A2AError(-32603, `Internal error: Task ${taskId} not found during processing`);
        }
 
        let updatedArtifacts = [...(task.artifacts ?? [])];
        const artData = y.artifactData;
        const targetIndex = artData.index ?? updatedArtifacts.length;
 
        if (artData.append && targetIndex < updatedArtifacts.length) {
          // --- Appending --- 
          const existingArtifact = updatedArtifacts[targetIndex];
          // 1. Modify the stored artifact (add parts, update timestamp)
          existingArtifact.parts.push(...(artData.parts ?? []));
          existingArtifact.timestamp = new Date().toISOString();
          // *** DO NOT set append/lastChunk on existingArtifact ***
          
          // 2. Update the store with the modified artifact
          await this.store.updateTask(taskId, { artifacts: updatedArtifacts }); 
          
          // 3. Clone the updated artifact *for notification only*
          const clonedArtifactForEvent = JSON.parse(JSON.stringify(existingArtifact));
          // 4. Set flags ONLY on the clone for the event
          clonedArtifactForEvent.append = true; 
          clonedArtifactForEvent.lastChunk = artData.lastChunk ?? false;
          
          // 5. Send the modified clone in the event
          const event: TaskArtifactUpdateEvent = {
            id: taskId,
            artifact: clonedArtifactForEvent,
          };
          this.sse?.notify(event);
        } else {
          // --- Creating New --- 
          // 1. Create the new artifact *without* streaming flags
          const newArtifact: Artifact = {
            id: randomUUID(),
            timestamp: new Date().toISOString(),
            name: artData.name,
            description: artData.description,
            parts: artData.parts ?? [], 
            metadata: artData.metadata,
            index: targetIndex,
            // *** DO NOT include append/lastChunk here ***
          };
          // 2. Add to list and update store
          updatedArtifacts.splice(targetIndex, 0, newArtifact); 
          await this.store.updateTask(taskId, { artifacts: updatedArtifacts });
          
          // 3. Clone the new artifact *for notification only*
          const clonedArtifactForEvent = JSON.parse(JSON.stringify(newArtifact));
          // 4. Set flags ONLY on the clone for the event
          clonedArtifactForEvent.append = false; // Not appending for a new artifact event
          clonedArtifactForEvent.lastChunk = artData.lastChunk ?? true; // Assume last unless told otherwise

          // 5. Send the modified clone in the event
          const event: TaskArtifactUpdateEvent = {
            id: taskId,
            artifact: clonedArtifactForEvent,
          };
          this.sse?.notify(event);
        }
        break;
      }
    }
  }

  // _handleGenError is now always called *within* a lock from _driveGenerator or _scheduleDrive
  private async _handleGenError(taskId: string, err: Error, fromSetup = false) {
    const isCancellation = err instanceof ProcessorCancellationError;
    const state: TaskState = isCancellation ? "canceled" : "failed";
    log.warn({ taskId, state, error: err.message, fromSetup }, `Generator yielded error${fromSetup ? ' during setup' : ''} or was canceled`);
    const finalStatus: TaskStatus = { state, timestamp: new Date().toISOString(), message: { role: 'agent', parts: [{ type: 'text', text: `Task ${state}: ${err.message}`}] } };
    // Update status and mark as not running
    await this.store.updateTask(taskId, { status: finalStatus, internalState: { isRunning: false } });
    this.sse?.notify({ id: taskId, status: finalStatus, final: true });
    taskLocks.delete(taskId); // Clean up lock map entry on error/cancellation
  }

  /** True if the task state is one of the terminal end‑states. */
  private _isTerminalState(state: TaskState) {
    return state === "completed" || state === "failed" || state === "canceled";
  }

  /**
   * Determines whether an SSE 'final' flag should be sent for the given state:
   *  - a terminal task state ⇒ no further updates
   */
  private _shouldSseBeFinal(state: TaskState) {
    return state === "input-required" || this._isTerminalState(state);
  }
}

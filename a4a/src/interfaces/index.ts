import type * as A2ATypes from '../types';

/**
 * Interface for persisting and retrieving Task state.
 * Implementations handle the underlying storage (memory, DB, etc.).
 */
export interface TaskStore {
  /** Creates a new task or retrieves an existing one if ID is provided and exists */
  createOrGetTask(params: A2ATypes.TaskSendParams): Promise<A2ATypes.Task>;

  /** Retrieves a task by its ID */
  getTask(id: string): Promise<A2ATypes.Task | null>;

  /** Updates specific fields of a task. Should handle concurrency if needed. */
  updateTask(id: string, updates: Partial<Pick<A2ATypes.Task, 'status' | 'artifacts' | 'metadata' | 'internalState' | 'pushNotificationConfig'>> & { updatedAt?: string }): Promise<A2ATypes.Task | null>;

  /** Adds a message to the task's history (if history is enabled/stored) */
  addTaskHistory(id: string, message: A2ATypes.Message): Promise<void>;

  /** Retrieves the history for a task, limited to the N most recent messages */
  getTaskHistory(id: string, limit?: number): Promise<A2ATypes.Message[]>;

  /** Sets or clears the push notification config for a task */
  setPushConfig(id: string, config: A2ATypes.PushNotificationConfig | null): Promise<void>;

  /** Retrieves the push notification config for a task */
  getPushConfig(id: string): Promise<A2ATypes.PushNotificationConfig | null>;

  // Optional: delete task (e.g., for cleanup)
  // deleteTask?(id: string): Promise<void>;
}

/**
 * Handle provided to TaskProcessors to signal updates back to the core system.
 * The core system uses these signals to update the TaskStore and manage notifications.
 */
export interface TaskUpdater {
  readonly taskId: string;
  readonly currentStatus: A2ATypes.TaskState; // Read-only access to current state

  /** Update the task's status */
  updateStatus(newState: A2ATypes.TaskState, message?: A2ATypes.Message): Promise<void>;

  /** Add a new artifact to the task */
  addArtifact(artifactData: Omit<A2ATypes.Artifact, 'index' | 'id' | 'timestamp'>): Promise<string | number>; // Returns assigned index or ID

  /** Add a message to the task's history (e.g., for agent thoughts or progress) */
  addHistoryMessage(message: A2ATypes.Message): Promise<void>;

  /** Signal that the task processing has reached a final state (completed, failed, canceled) */
  signalCompletion(finalStatus: 'completed' | 'failed' | 'canceled', message?: A2ATypes.Message): Promise<void>;

  // --- Streaming related (Placeholders - requires SSE implementation) ---
  // appendArtifactPart(artifactIdOrIndex: string | number, part: A2ATypes.Part, lastChunk?: boolean): Promise<void>;
}

/**
 * Interface for the agent developer's core logic for handling specific tasks/skills.
 */
export interface TaskProcessor {
  /** Determines if this processor can handle the incoming request */
  canHandle(params: A2ATypes.TaskSendParams): boolean | Promise<boolean>;

  /** Starts processing a new task instance */
  start(params: A2ATypes.TaskSendParams, updater: TaskUpdater, authContext?: any): Promise<void>;

  /** Resumes processing a task that was in 'input-required' state */
  resume?(
    currentTask: A2ATypes.Task, // State *before* the new message
    resumeMessage: A2ATypes.Message,
    updater: TaskUpdater,
    authContext?: any
  ): Promise<void>;

  /** Handles updates originating from internal systems (not direct A2A calls) */
  handleInternalUpdate?(
    taskId: string,
    updatePayload: any,
    updater: TaskUpdater
  ): Promise<void>;

   /** Handles a cancellation request (optional, core handles status update by default) */
   cancel?(
     task: A2ATypes.Task,
     cancelMessage: A2ATypes.Message | undefined,
     updater: TaskUpdater,
     authContext?: any
   ): Promise<void>;
}

/** Function to extract authentication context from an Express request */
export type GetAuthContextFn = (req: import('express').Request) => any | Promise<any>;

/** Configuration for the A2A Server Core */
export interface A2AServerConfig {
  agentCard: A2ATypes.AgentCard;
  taskStore: TaskStore;
  taskProcessors: TaskProcessor[];
  getAuthContext?: GetAuthContextFn;
  // Add options for history retention, error handling verbosity, etc. later
  maxHistoryLength?: number; // Default max history length to store/return
}

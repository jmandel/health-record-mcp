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

  /**
   * Sets or updates the internal, non-client-visible state associated with a task.
   * This state is managed entirely by the server/processor.
   * @param taskId The ID of the task.
   * @param state The internal state object (can be any serializable type).
   */
  setInternalState(taskId: string, state: any): Promise<void>;

  /**
   * Retrieves the internal state associated with a task.
   * @param taskId The ID of the task.
   * @returns The internal state object, or null if not set or not found.
   */
  getInternalState(taskId: string): Promise<any | null>;

  // Optional: delete task (e.g., for cleanup)
  // deleteTask?(id: string): Promise<void>;
}

/**
 * Handle provided to TaskProcessors to signal updates back to the core system.
 * The core system uses these signals to update the TaskStore and manage notifications.
 */
export interface TaskUpdater {
  readonly taskId: string;
  /** Retrieves the current state of the task asynchronously. */
  getCurrentStatus(): Promise<A2ATypes.TaskState>;

  /** Update the task's status */
  updateStatus(newState: A2ATypes.TaskState, message?: A2ATypes.Message): Promise<void>;

  /** Add a new artifact to the task */
  addArtifact(artifactData: Omit<A2ATypes.Artifact, 'index' | 'id' | 'timestamp'>): Promise<string | number>; // Returns assigned index or ID

  /** Add a message to the task's history (e.g., for agent thoughts or progress) */
  addHistoryMessage(message: A2ATypes.Message): Promise<void>;

  /** Signal that the task processing has reached a final state (completed, failed, canceled) */
  signalCompletion(finalStatus: 'completed' | 'failed' | 'canceled', message?: A2ATypes.Message): Promise<void>;

  /**
   * Sets or updates the internal, non-client-visible state associated with this task.
   * @param state The internal state object (must be serializable).
   */
  setInternalState(state: any): Promise<void>;

  /**
   * Retrieves the internal state associated with this task asynchronously.
   * @returns The internal state object, or null if not set.
   */
  getInternalState(): Promise<any | null>;

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

// --- Core Event Types ---
// Define a common structure for events emitted by the core
// Using existing types for now, can be abstracted further if needed
export type CoreTaskEvent = A2ATypes.TaskStatusUpdateEvent | A2ATypes.TaskArtifactUpdateEvent;

// --- Notification Service Interface ---
/**
 * Interface for services that handle sending notifications about task updates.
 */
export interface NotificationService {
  /**
   * Handles a notification event emitted by the A2AServerCore.
   * @param event The event data (e.g., status update, artifact added).
   */
  notify(event: CoreTaskEvent): Promise<void>;

  /** Optional method for graceful shutdown */
  closeAll?(): Promise<void>;
}

/** Configuration for the A2A Server Core */
export interface A2AServerConfig {
  agentCard: A2ATypes.AgentCard;
  taskStore: TaskStore;
  taskProcessors: TaskProcessor[];
  notificationServices?: NotificationService[]; // <-- Use the new interface
  getAuthContext?: GetAuthContextFn;
  // Add options for history retention, error handling verbosity, etc. later
  maxHistoryLength?: number; // Default max history length to store/return
}

import type { Task, Message, TaskState, PushNotificationConfig } from '../types';


/**
 * Interface for storing and retrieving task state.
 */
export interface TaskStore {
  /**
   * Creates a new task or retrieves an existing one if the ID matches
   * and the existing task is in a non-final state (implementation specific).
   * Should store the initial message in history.
   *
   * @param params Parameters including initial message and potential ID.
   * @returns The created or retrieved Task object.
   */
  createOrGetTask(params: { id?: string; sessionId?: string; message: Message; metadata?: Record<string, any> }): Promise<Task>;

  /**
   * Retrieves a task by its ID.
   *
   * @param taskId The ID of the task.
   * @returns The Task object, or null if not found.
   */
  getTask(taskId: string): Promise<Task | null>;

  /**
   * Updates specific fields of an existing task.
   *
   * @param taskId The ID of the task to update.
   * @param updates An object containing fields to update (e.g., { status: newStatus, artifacts: newArtifacts }).
   * @returns The updated Task object, or null if not found.
   */
  updateTask(taskId: string, updates: Partial<Pick<Task, 'status' | 'artifacts' | 'metadata' | 'internalState'>>): Promise<Task | null>;

  /**
   * Adds a message to the task's history.
   *
   * @param taskId The ID of the task.
   * @param message The message to add.
   */
  addTaskHistory(taskId: string, message: Message): Promise<void>;

  /**
   * Retrieves the history for a task, potentially limited to the most recent N messages.
   *
   * @param taskId The ID of the task.
   * @param limit The maximum number of history messages to retrieve (0 for none, undefined/null for all).
   * @returns An array of Messages representing the history.
   */
  getTaskHistory(taskId: string, limit?: number): Promise<Message[]>;

   /**
    * Sets the push notification configuration for a task.
    * @param taskId The ID of the task.
    * @param config The configuration object or null to clear.
    */
   setPushConfig(taskId: string, config: PushNotificationConfig | null): Promise<void>;

   /**
    * Gets the push notification configuration for a task.
    * @param taskId The ID of the task.
    * @returns The configuration object or null if not set.
    */
   getPushConfig(taskId: string): Promise<PushNotificationConfig | null>;

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

} 
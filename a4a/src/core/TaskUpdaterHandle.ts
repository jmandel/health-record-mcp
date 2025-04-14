import type * as A2ATypes from '../types';
import type { TaskStore, TaskUpdater } from '../interfaces';
import type { A2AServerCore } from './A2AServerCore'; // Avoid circular dependency at runtime

/**
 * Implementation of TaskUpdater passed to Processors.
 * It interacts with the A2AServerCore to trigger state changes.
 */
export class TaskUpdaterHandle implements TaskUpdater {
  readonly taskId: string;
  private core: A2AServerCore; // Reference to the core logic class
  private _currentStatus: A2ATypes.TaskState;

  constructor(taskId: string, initialStatus: A2ATypes.TaskState, core: A2AServerCore) {
    this.taskId = taskId;
    this._currentStatus = initialStatus;
    this.core = core;
  }

  get currentStatus(): A2ATypes.TaskState {
      return this._currentStatus;
  }

  // Internal method for core to update status if changed elsewhere
  _updateLocalStatus(newStatus: A2ATypes.TaskState) {
      this._currentStatus = newStatus;
  }

  async updateStatus(newState: A2ATypes.TaskState, message?: A2ATypes.Message): Promise<void> {
    if (this.isFinalState(this._currentStatus)) {
        console.warn(`[TaskUpdater] Attempted to update status of task ${this.taskId} from final state ${this._currentStatus} to ${newState}. Ignoring.`);
        return; 
    }
    const updatedTask = await this.core.updateTaskStatus(this.taskId, newState, message);
    this._currentStatus = updatedTask.status.state;
  }

  async addArtifact(artifactData: Omit<A2ATypes.Artifact, 'index' | 'id' | 'timestamp'>): Promise<string | number> {
    if (this.isFinalState(this._currentStatus)) {
        console.warn(`[TaskUpdater] Attempted to add artifact to task ${this.taskId} which is in final state ${this._currentStatus}. Ignoring.`);
        return -1; // Or throw error?
    }
    const newIndex = await this.core.addTaskArtifact(this.taskId, artifactData);
    // Core handles TaskStore update and notifications
    return newIndex;
  }

  async addHistoryMessage(message: A2ATypes.Message): Promise<void> {
    if (!message.role) {
         console.error(`[TaskUpdater] History message for task ${this.taskId} must include a role.`);
         return;
    }
    // Consider adding validation or rate limiting if needed
    await this.core.addTaskHistory(this.taskId, message);
    // Core handles TaskStore update
  }

  async signalCompletion(finalState: 'completed' | 'failed' | 'canceled', message?: A2ATypes.Message): Promise<void> {
    if (this.isFinalState(this._currentStatus)) {
        console.warn(`[TaskUpdater] Task ${this.taskId} already in final state ${this._currentStatus}. Ignoring signalCompletion(${finalState}).`);
        return; 
    }
    await this.updateStatus(finalState, message); 
  }

  // --- Methods for Internal State --- 

  /**
   * Sets or updates the internal, non-client-visible state associated with this task.
   * @param state The internal state object (must be serializable).
   */
  async setInternalState(state: any): Promise<void> {
       if (this.isFinalState(this._currentStatus)) {
          console.warn(`[TaskUpdater] Attempted to set internal state for task ${this.taskId} which is in final state ${this._currentStatus}. Ignoring.`);
          return; 
       }
       await this.core.setTaskInternalState(this.taskId, state);
  }

  /**
   * Retrieves the internal state associated with this task.
   * @returns The internal state object, or null if not set.
   */
  async getInternalState(): Promise<any | null> {
      return this.core.getTaskInternalState(this.taskId);
  }

  private isFinalState(state: A2ATypes.TaskState): boolean {
      return ['completed', 'failed', 'canceled'].includes(state);
  }
}

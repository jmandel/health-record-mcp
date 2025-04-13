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
    this._currentStatus = newState; // Update local view immediately
    await this.core.updateTaskStatus(this.taskId, newState, message);
    // Core handles TaskStore update and notifications
  }

  async addArtifact(artifactData: Omit<A2ATypes.Artifact, 'index' | 'id' | 'timestamp'>): Promise<string | number> {
    const newIndex = await this.core.addTaskArtifact(this.taskId, artifactData);
    // Core handles TaskStore update and notifications
    return newIndex;
  }

  async addHistoryMessage(message: A2ATypes.Message): Promise<void> {
    // Add role: 'agent' if not provided? Or enforce it? For now, pass through.
    await this.core.addTaskHistory(this.taskId, message);
    // Core handles TaskStore update
  }

  async signalCompletion(finalStatus: 'completed' | 'failed' | 'canceled', message?: A2ATypes.Message): Promise<void> {
      if (finalStatus !== 'completed' && finalStatus !== 'failed' && finalStatus !== 'canceled') {
          throw new Error("signalCompletion requires a final status: completed, failed, or canceled.");
      }
      this._currentStatus = finalStatus; // Update local view
      await this.core.updateTaskStatus(this.taskId, finalStatus, message);
      // Core handles TaskStore update and notifications
  }
}

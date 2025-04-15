import type * as A2ATypes from '../types';
import type { TaskStore } from '../interfaces';
import { randomUUID } from 'node:crypto'; // Use Bun's native crypto

export class InMemoryTaskStore implements TaskStore {
  private tasks = new Map<string, A2ATypes.Task>();
  private history = new Map<string, A2ATypes.Message[]>();
  private pushConfigs = new Map<string, A2ATypes.PushNotificationConfig | null>();
  private internalStates = new Map<string, any>();
  // Note: Real history should likely be capped or stored more efficiently

  async createOrGetTask(params: A2ATypes.TaskSendParams): Promise<A2ATypes.Task> {
    const taskId = params.id ?? randomUUID();

    if (params.id && this.tasks.has(params.id)) {
      // If client provides an ID that exists, return it (idempotency)
      // Or you could throw an error if IDs must be unique on creation attempt
       console.warn(`Task ID ${params.id} provided by client already exists. Returning existing task.`);
       return this.tasks.get(params.id)!;
    }


    const now = new Date().toISOString();
    const initialStatus: A2ATypes.TaskStatus = {
        state: 'submitted', // Initial state
        timestamp: now,
    };

    const newTask: A2ATypes.Task = {
      id: taskId,
      sessionId: params.sessionId ?? randomUUID(),
      status: initialStatus,
      artifacts: [],
      history: [], // Initialize history array
      pushNotificationConfig: params.pushNotification ?? null,
      metadata: params.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    };

    this.tasks.set(taskId, newTask);
    this.history.set(taskId, []); // Initialize history storage
    this.internalStates.set(taskId, null); // Initialize internal state

    console.log(`[TaskStore] Created Task: ${taskId}`);
    return { ...newTask }; // Return a copy
  }

  async getTask(id: string): Promise<A2ATypes.Task | null> {
    const task = this.tasks.get(id);
    if (!task) {
      return null;
    }
    // Optionally fetch and attach history here if not stored directly on task object
    // task.history = await this.getTaskHistory(id, defaultHistoryLength);
    return { ...task }; // Return a copy
  }

  async updateTask(id: string, updates: Partial<Pick<A2ATypes.Task, 'status' | 'artifacts' | 'metadata' | 'internalState' | 'pushNotificationConfig'>> & { updatedAt?: string }): Promise<A2ATypes.Task | null> {
    const task = this.tasks.get(id);
    if (!task) {
      return null;
    }

    const now = new Date().toISOString();
    const updatedTask = {
      ...task,
      ...updates,
      updatedAt: updates.updatedAt ?? now, // Allow overriding timestamp if provided
    };

    // Ensure artifacts array exists if updating it
     if (updates.artifacts && !Array.isArray(updatedTask.artifacts)) {
        updatedTask.artifacts = [];
     }
     // If status is updated, ensure it has a timestamp
     if (updates.status && !updates.status.timestamp) {
        updates.status.timestamp = now;
     }


    this.tasks.set(id, updatedTask);
    console.log(`[TaskStore] Updated Task: ${id}, New Status: ${updatedTask.status.state}`);
    return { ...updatedTask }; // Return a copy
  }

  async addTaskHistory(id: string, message: A2ATypes.Message): Promise<void> {
    const taskHistory = this.history.get(id);
    if (taskHistory) {
      // Add timestamp if missing
      const messageWithTimestamp = {
        ...message,
        timestamp: message.timestamp ?? new Date().toISOString(),
      };
      taskHistory.push(messageWithTimestamp);
       // Optional: Trim history if it gets too long
       // const MAX_HISTORY = 100;
       // if(taskHistory.length > MAX_HISTORY) {
       //     this.history.set(id, taskHistory.slice(-MAX_HISTORY));
       // }
      console.log(`[TaskStore] Added history for Task: ${id}, Role: ${message.role}`);
    } else {
       console.warn(`[TaskStore] Attempted to add history for non-existent task: ${id}`);
    }
  }

  async getTaskHistory(id: string, limit: number = 20): Promise<A2ATypes.Message[]> {
    const taskHistory = this.history.get(id);
    if (!taskHistory) {
      return [];
    }
    if (limit <= 0) {
        return [];
    }
    return taskHistory.slice(-limit); // Return last 'limit' messages
  }

   async setPushConfig(id: string, config: A2ATypes.PushNotificationConfig | null): Promise<void> {
     const task = this.tasks.get(id);
     if (task) {
       task.pushNotificationConfig = config;
       task.updatedAt = new Date().toISOString();
       this.tasks.set(id, task); // Update the task object
       console.log(`[TaskStore] Set push config for Task: ${id}`);
     } else {
        console.warn(`[TaskStore] Attempted to set push config for non-existent task: ${id}`);
     }
   }

   async getPushConfig(id: string): Promise<A2ATypes.PushNotificationConfig | null> {
     const task = this.tasks.get(id);
     return task?.pushNotificationConfig ?? null;
   }

   async setInternalState(taskId: string, state: any): Promise<void> {
       if (!this.tasks.has(taskId)) {
            console.warn(`[TaskStore] Attempted to set internal state for non-existent task: ${taskId}`);
           throw new Error(`Task ${taskId} not found`); // Or handle gracefully
       }
       this.internalStates.set(taskId, state);
        console.log(`[TaskStore] Internal state set for task ${taskId}`);
   }

   async getInternalState(taskId: string): Promise<any | null> {
       if (!this.tasks.has(taskId)) {
           console.warn(`[TaskStore] Attempted to get internal state for non-existent task: ${taskId}`);
           return null;
       }
       // Return a copy if the state is an object/array to prevent mutation
       const state = this.internalStates.get(taskId);
       if (state && typeof state === 'object') {
           return JSON.parse(JSON.stringify(state)); 
       }
       return state ?? null;
   }
}

// a4a/src/store/InMemoryTaskStore.ts (or reuse existing)
import type { TaskStore, Task, Message, TaskSendParams, PushNotificationConfig } from '../interfaces';
import { randomUUID } from 'node:crypto';
import * as A2ATypes from '../types';

export class InMemoryTaskStore implements TaskStore {
    private tasks: Map<string, Task> = new Map();
    private history: Map<string, Message[]> = new Map();
    private internalState: Map<string, any> = new Map();
     private pushConfigs: Map<string, PushNotificationConfig | null> = new Map();

    async createOrGetTask(params: Partial<Task> & Pick<TaskSendParams, 'message'>): Promise<Task> {
        const existing = params.id ? this.tasks.get(params.id) : undefined;
        if (existing) {
             console.log(`[InMemoryStore] Returning existing task ${params.id}`);
            return structuredClone(existing); // Return a clone
        }

        const newId = params.id ?? randomUUID();
        const now = new Date().toISOString();
        const newTask: Task = {
            id: newId,
            sessionId: params.sessionId ?? randomUUID(),
             // Default status or use provided? Let's default to submitted.
             status: params.status ?? { state: 'submitted', timestamp: now },
            artifacts: params.artifacts ?? [],
            metadata: params.metadata ?? {},
             history: [], // History managed separately
             internalState: {}, // Managed separately
             pushNotificationConfig: null // Managed separately
        };
         console.log(`[InMemoryStore] Creating new task ${newId}`);
        this.tasks.set(newId, newTask);
        this.history.set(newId, []);
        this.internalState.set(newId, {});
        this.pushConfigs.set(newId, null);
        return structuredClone(newTask);
    }

    async getTask(id: string): Promise<Task | null> {
        const task = this.tasks.get(id);
        if (!task) return null;
        const taskClone = structuredClone(task);
         // Add separate state bits back for core retrieval
         taskClone.internalState = this.internalState.get(id);
         taskClone.pushNotificationConfig = this.pushConfigs.get(id);
         // History added separately by core if needed
         delete taskClone.history;
        return taskClone;
    }

    async updateTask(id: string, updates: Partial<Omit<Task, 'id' | 'sessionId' | 'history' | 'internalState' | 'pushNotificationConfig'>>): Promise<Task | null> {
        const task = this.tasks.get(id);
        if (!task) return null;

         console.log(`[InMemoryStore] Updating task ${id} with:`, Object.keys(updates));
        Object.assign(task, updates); // Update in place
        // Status timestamp should ideally be updated here if status changes
         if (updates.status && !updates.status.timestamp) {
             updates.status.timestamp = new Date().toISOString();
         }

        return structuredClone(task); // Return updated clone
    }

    async addTaskHistory(id: string, message: Message): Promise<void> {
        const h = this.history.get(id);
        if (h) {
            h.push(message);
        } else {
            console.warn(`[InMemoryStore] Attempted to add history for unknown task ${id}`);
        }
    }

    async getTaskHistory(id: string, limit: number): Promise<Message[]> {
        const h = this.history.get(id) ?? [];
        return limit > 0 ? structuredClone(h.slice(-limit)) : [];
    }

     async setInternalState(id: string, state: any): Promise<void> {
         this.internalState.set(id, state);
     }

     async getInternalState(id: string): Promise<any | null> {
         return this.internalState.get(id) ?? null;
     }

     async setPushConfig(id: string, config: PushNotificationConfig | null): Promise<void> {
         this.pushConfigs.set(id, config);
     }

     async getPushConfig(id: string): Promise<PushNotificationConfig | null> {
         return this.pushConfigs.get(id) ?? null;
     }
}

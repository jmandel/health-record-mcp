import type * as express from 'express';
import type * as A2ATypes from '../types'; // For event types
import type { NotificationService, CoreTaskEvent } from '../interfaces'; // Import interface and event type

// Define the structure for storing SSE subscription info
interface SseSubscriptionInfo {
    res: express.Response;
    intervalId: NodeJS.Timeout;
}

/**
 * Manages Server-Sent Event (SSE) connections for A2A tasks.
 * Implements NotificationService to integrate with A2AServerCore event emission.
 */
export class SseConnectionManager implements NotificationService { // <-- Implement interface
    private readonly subscriptions: Map<string, SseSubscriptionInfo[]> = new Map();

    /**
     * Adds a new SSE subscription for a given task ID.
     * Sets up keep-alive messages and handles connection closure.
     */
    addSubscription(taskId: string, res: express.Response): void {
        let taskSubscriptions = this.subscriptions.get(taskId);
        if (!taskSubscriptions) {
            taskSubscriptions = [];
            this.subscriptions.set(taskId, taskSubscriptions);
        }

        // Avoid adding the same response object multiple times
        if (taskSubscriptions.some(sub => sub.res === res)) {
            console.warn(`[SseManager] Attempted to add duplicate SSE subscription for task ${taskId}.`);
            return;
        }

        // Keep connection alive with periodic comments
        const keepAliveInterval = setInterval(() => {
            if (!res.closed) {
                this.sendEvent(res, ':keep-alive', null);
            } else {
                console.warn(`[SseManager] Keep-alive detected closed connection for task ${taskId}. Clearing interval.`);
                clearInterval(keepAliveInterval);
                this.removeSubscription(taskId, res); // Attempt cleanup
            }
        }, 30000); // Send comment every 30s

        const newSubscription: SseSubscriptionInfo = { res, intervalId: keepAliveInterval };
        taskSubscriptions.push(newSubscription);
        console.log(`[SseManager] Added SSE subscription for task ${taskId}. Total: ${taskSubscriptions.length}`);

        res.once('close', () => {
            console.log(`[SseManager] SSE connection closed by client for task ${taskId}.`);
            clearInterval(keepAliveInterval); // Clear interval on close
            this.removeSubscription(taskId, res);
        });
    }

    /**
     * Removes an SSE subscription for a given task ID and response object.
     * Clears the keep-alive interval associated with the subscription.
     */
    removeSubscription(taskId: string, resToRemove: express.Response): void {
        const taskSubscriptions = this.subscriptions.get(taskId);
        if (!taskSubscriptions) return;

        const index = taskSubscriptions.findIndex(sub => sub.res === resToRemove);
        if (index !== -1) {
            const [removedSubscription] = taskSubscriptions.splice(index, 1);
            clearInterval(removedSubscription.intervalId); // Ensure interval is cleared
            console.log(`[SseManager] Removed SSE subscription for task ${taskId}. Remaining: ${taskSubscriptions.length}`);

            if (taskSubscriptions.length === 0) {
                this.subscriptions.delete(taskId);
                console.log(`[SseManager] No more SSE subscriptions for task ${taskId}.`);
            }
        } else {
            // This might happen if closed handler triggers remove after interval handler already did
            // console.warn(`[SseManager] Attempted to remove non-existent subscription for task ${taskId}.`);
        }
    }

    /**
     * Sends an SSE event to a specific response stream.
     * Returns true if the event was written successfully, false otherwise.
     */
    sendEvent(res: express.Response, event: string, data: any | null): boolean {
        if (res.closed) {
            console.warn(`[SseManager] Attempted to send SSE event (${event}) to closed connection.`);
            return false;
        }
        try {
            if (event.startsWith(':')) { // Handle comments like :keep-alive
                res.write(`${event}\n\n`);
            } else {
                res.write(`event: ${event}\n`);
                res.write(`data: ${JSON.stringify(data)}\n\n`);
            }
            // console.log(`[SseManager] Sent event '${event}'`); // Debug logging
            return true;
        } catch (error) {
            console.error(`[SseManager] Failed to write SSE event (${event}):`, error);
            // Consider auto-removing the subscription if writing fails? Risky.
            return false;
        }
    }

    /**
     * Broadcasts an SSE event to all active subscribers for a specific task ID.
     */
    broadcast(taskId: string, eventType: string, data: any): void {
        const taskSubscriptions = this.subscriptions.get(taskId);
        if (!taskSubscriptions || taskSubscriptions.length === 0) {
            // console.log(`[SseManager] No subscriptions for task ${taskId} to broadcast event '${event}'.`);
            return;
        }

        console.log(`[SseManager] Broadcasting event '${eventType}' to ${taskSubscriptions.length} subscribers for task ${taskId}.`);
        // Iterate over a copy in case of modifications during send/error handling
        const activeSubs = [...taskSubscriptions];
        activeSubs.forEach(subInfo => {
            const success = this.sendEvent(subInfo.res, eventType, data);
            if (!success) {
                // If sending failed, maybe the connection died without triggering 'close'
                // Attempt cleanup proactively
                console.warn(`[SseManager] Failed sending event to subscriber for task ${taskId}. Removing potentially dead subscription.`);
                this.removeSubscription(taskId, subInfo.res);
            }
        });
    }

    /**
     * Checks if there are any active subscriptions for a given task ID.
     */
    hasSubscriptions(taskId: string): boolean {
        const taskSubscriptions = this.subscriptions.get(taskId);
        return !!taskSubscriptions && taskSubscriptions.length > 0;
    }

    /**
     * Handles task events emitted by the core and broadcasts them via SSE.
     */
    async notify(event: CoreTaskEvent): Promise<void> {
        let eventType: string | null = null;
        let eventData: any = null;

        // Determine SSE event type based on CoreTaskEvent structure
        if ('status' in event) { // TaskStatusUpdateEvent
            eventType = 'TaskStatusUpdate';
            eventData = event; // Pass the whole event object
        } else if ('artifact' in event) { // TaskArtifactUpdateEvent
            eventType = 'TaskArtifactUpdate';
            eventData = event; // Pass the whole event object
        }

        if (eventType && eventData) {
            if (this.hasSubscriptions(event.id)) {
                 console.log(`[SseManager] Received notify event for task ${event.id}, broadcasting '${eventType}'.`);
                // Use the existing broadcast logic
                this.broadcast(event.id, eventType, eventData);
            } else {
                // console.log(`[SseManager] Received notify event for task ${event.id}, but no active SSE subscriptions.`);
            }
        } else {
             console.warn(`[SseManager] Received unknown event type in notify:`, event);
        }
        // Return void promise as notification is fire-and-forget from core's perspective
        return Promise.resolve();
    }

    /**
     * Forcefully closes all active SSE connections managed by this manager.
     * Implements optional closeAll from NotificationService.
     */
    // Add async/Promise<void> to match interface, though implementation is synchronous
    async closeAll(): Promise<void> {
        console.log(`[SseManager] Closing all active SSE connections (${this.subscriptions.size} tasks)...`);
        let closedCount = 0;
        this.subscriptions.forEach((subscriptions, taskId) => {
            console.log(`[SseManager] Closing ${subscriptions.length} SSE connection(s) for task ${taskId}`);
            subscriptions.forEach(subInfo => {
                try {
                    clearInterval(subInfo.intervalId);
                    if (!subInfo.res.closed) {
                        subInfo.res.end();
                        closedCount++;
                    }
                } catch (err) {
                    console.error(`[SseManager] Error closing SSE connection for task ${taskId}:`, err);
                }
            });
        });
        this.subscriptions.clear();
        console.log(`[SseManager] Finished closing SSE connections. ${closedCount} streams ended.`);
        return Promise.resolve(); // Fulfill the promise
    }
} 
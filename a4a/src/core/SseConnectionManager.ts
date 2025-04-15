import type * as express from 'express';
import type * as A2ATypes from '../types'; // For event types
import type { NotificationService, CoreTaskEvent } from '../interfaces'; // Import interface and event type

// Define the structure for storing SSE subscription info
interface SseSubscriptionInfo {
    res: express.Response;
    requestId: string | number | null;
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
    addSubscription(taskId: string, requestId: string | number | null, res: express.Response): void {
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
                this.sendKeepAliveComment(res);
            } else {
                console.warn(`[SseManager] Keep-alive detected closed connection for task ${taskId}. Clearing interval.`);
                clearInterval(keepAliveInterval);
                this.removeSubscription(taskId, res); // Attempt cleanup
            }
        }, 30000); // Send comment every 30s

        const newSubscription: SseSubscriptionInfo = { res, requestId, intervalId: keepAliveInterval };
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
     * Sends a keep-alive comment to a specific response stream.
     */
    private sendKeepAliveComment(res: express.Response): void {
        if (res.closed) return; // Check again just before writing
        try {
            res.write(':keep-alive\n\n');
        } catch (error) {
             console.error(`[SseManager] Failed to write keep-alive comment:`, error);
            // Don't necessarily remove subscription for failed keep-alive, maybe transient issue
        }
    }

    /**
     * Sends an SSE data line to a specific response stream.
     * Assumes the data provided is a fully formatted string ready to be written.
     * Returns true if the event was written successfully, false otherwise.
     */
    sendSseDataString(res: express.Response, dataLine: string): boolean {
        if (res.closed) {
            console.warn(`[SseManager] Attempted to send SSE data string to closed connection.`);
            return false;
        }
        try {
            // Only write the data line
            res.write(dataLine);
            // console.log(`[SseManager] Sent SSE data string.`); // Debug logging
            return true;
        } catch (error) {
            console.error(`[SseManager] Failed to write SSE data string:`, error);
            return false;
        }
    }

    /**
     * Broadcasts an SSE event data payload to all active subscribers for a specific task ID.
     * Formats the event according to JSON-RPC 2.0 spec before sending.
     * Omits the 'event:' line, sending only the 'data:' line.
     */
    broadcast(taskId: string, _eventType: string, data: any): void { // _eventType is now unused
        const taskSubscriptions = this.subscriptions.get(taskId);
        if (!taskSubscriptions || taskSubscriptions.length === 0) {
            return;
        }

        // Determine the type for logging purposes only
        const logEventType = 'status' in data ? 'TaskStatusUpdate' : 'artifact' in data ? 'TaskArtifactUpdate' : 'Unknown';
        console.log(`[SseManager] Broadcasting ${logEventType} data to ${taskSubscriptions.length} subscribers for task ${taskId}.`);

        // Iterate over a copy in case of modifications during send/error handling
        const activeSubs = [...taskSubscriptions];
        activeSubs.forEach(subInfo => {
            // Format the data according to JSON-RPC 2.0 response structure
            const jsonRpcPayload = {
                jsonrpc: "2.0",
                id: subInfo.requestId, // Use the stored request ID
                result: data // The actual event data (TaskStatusUpdateEvent or TaskArtifactUpdateEvent)
            };

            // Only construct the data line
            const dataLine = `data: ${JSON.stringify(jsonRpcPayload)}\n\n`;

            // Send only the data line using the updated method
            const success = this.sendSseDataString(subInfo.res, dataLine);
            if (!success) {
                // If sending failed, maybe the connection died without triggering 'close'
                // Attempt cleanup proactively
                console.warn(`[SseManager] Failed sending SSE data to subscriber for task ${taskId}. Removing potentially dead subscription.`);
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
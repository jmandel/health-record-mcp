// File: test/jokeAgentClient.test.ts
import { test, expect, describe, beforeAll, afterAll } from "bun:test"; // Added beforeAll, afterAll
import type { AgentCard, Task, TaskState, JsonRpcErrorResponse, JsonRpcSuccessResponse, TextPart } from "../../../src/types"; // Corrected import path, added TaskState, TextPart
import type { NotificationService } from "../../../src/interfaces"; // Import NotificationService from interfaces.ts
import { startA2AExpressServer, InMemoryTaskStore } from "../../../src/index"; // Import server setup
import { JokeProcessor } from "../JokeProcessor"; // Import agent components
import { jokeAgentCard } from "../agentCard";
import type * as http from 'node:http'; // Import http for server type
import { promisify } from 'node:util'; // Import promisify
import { A2AServerCore } from "../../../src/core/A2AServerCore"; // Import A2AServerCore
import { SseConnectionManager } from "../../../src/core/SseConnectionManager"; // Import SseConnectionManager for test setup

// --- Configuration ---
const TEST_PORT = 3101; // Use a different port for testing
const BASE_URL = `http://localhost:${TEST_PORT}`;
const AGENT_CARD_ENDPOINT = `${BASE_URL}/.well-known/agent.json`;
const AGENT_A2A_ENDPOINT = `${BASE_URL}/a2a`;

let jsonRpcRequestId = 1; // Simple counter for unique JSON-RPC request IDs
const MAX_POLL_ATTEMPTS = 5; // Max times to poll (e.g., 5 seconds)
const POLL_INTERVAL_MS = 1000; // Poll every 1 second

// --- Helper Functions ---
function createRpcPayload(method: string, params: any): string {
    return JSON.stringify({
        jsonrpc: "2.0",
        id: jsonRpcRequestId++,
        method: method,
        params: params
    });
}

async function makeRpcCall(method: string, params: any): Promise<any> {
    const response = await fetch(AGENT_A2A_ENDPOINT, { // Use test endpoint
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }, // No auth needed for joke agent
        body: createRpcPayload(method, params)
    });
    if (!response.ok) {
        // Attempt to read error body for more context
        let errorBody = '';
        try {
            errorBody = await response.text();
        } catch {}
        throw new Error(`RPC call failed with status ${response.status}: ${errorBody}`);
    }
    const jsonResponse = await response.json() as { result?: any; error?: { code: number; message: string; data?: any } }; 
    if (jsonResponse.error) {
        console.error("[makeRpcCall] A2A RPC Error:", jsonResponse.error);
        throw new Error(`A2A RPC Error ${jsonResponse.error.code}: ${jsonResponse.error.message}`);
    }
    return jsonResponse.result;
}

async function pollTaskUntilComplete(taskId: string, expectedFinalState: TaskState = 'completed'): Promise<Task> {
    for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
        console.log(`Polling attempt ${i + 1} for task ${taskId}...`);
        try {
            const task = await makeRpcCall('tasks/get', { id: taskId }) as Task;
            if (task?.status?.state === expectedFinalState) {
                console.log(`Task ${taskId} reached expected state: ${expectedFinalState}!`);
                return task; 
            } else {
                console.log(`Task ${taskId} status: ${task?.status?.state || 'unknown'}`);
            }
        } catch (error: any) {
             // Handle cases where task might not be found immediately (e.g., -32001)
             // Or other transient errors.
             if (error.message?.includes('-32001')) { // TaskNotFound
                 console.warn(`Polling warning: Task ${taskId} not found yet.`);
             } else {
                console.error(`Polling error: ${error.message}`);
             }
        }
        await Bun.sleep(POLL_INTERVAL_MS);
    }
    throw new Error(`Task ${taskId} did not reach state ${expectedFinalState} within ${MAX_POLL_ATTEMPTS} poll attempts.`);
}

// --- SSE Stream Processing Helper ---
interface ProcessedSseResult {
    receivedEvents: any[];
    jokeText: string;
    finalStateReceived: boolean;
    finalStatus?: string; // Record the final status state reported by SSE
}

async function processSseStream(taskId: string, method: string, params: any): Promise<ProcessedSseResult> {
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    const receivedEvents: any[] = [];
    let jokeText = "";
    let finalStateReceived = false;
    let finalStatus: string | undefined;

    const sseFetchPromise = fetch(AGENT_A2A_ENDPOINT, { // Use test endpoint
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
        body: createRpcPayload(method, params)
    });

    // Promise to signal completion or timeout
    return new Promise<ProcessedSseResult>(async (resolve, reject) => { // Added async here
        const timeout = setTimeout(() => {
            reject(new Error(`SSE processing timed out after 10 seconds for task ${taskId}`));
        }, 10000); // 10 second timeout

        try {
            const sseResponse = await sseFetchPromise;

            // expect(sseResponse.status).toBe(200); // Cannot use expect inside promise like this easily
            if (sseResponse.status !== 200) {
                 throw new Error(`SSE connection failed with status ${sseResponse.status}`);
            }
            if (!sseResponse.headers.get('content-type')?.includes('text/event-stream')) {
                 throw new Error(`Invalid SSE content-type: ${sseResponse.headers.get('content-type')}`);
            }

            if (!sseResponse.body) {
                throw new Error(`SSE response body is null for task ${taskId}`);
            }

            reader = sseResponse.body.getReader() as ReadableStreamDefaultReader<Uint8Array>;
            if (!reader) {
                throw new Error(`Failed to get SSE stream reader for task ${taskId}`);
            }

            const decoder = new TextDecoder();
            let buffer = "";

            console.log(`[SSE Helper ${taskId}] Connection opened. Waiting for events...`);

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    console.log(`[SSE Helper ${taskId}] Stream finished.`);
                    break; // Exit loop when stream closes
                }

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop() || "";

                for (const eventBlock of lines) {
                    if (!eventBlock.trim()) continue;

                    let eventType = 'message';
                    let eventData = "";

                    for (const line of eventBlock.split('\n')) {
                         if (line.startsWith('event:')) {
                            eventType = line.substring(6).trim();
                        } else if (line.startsWith('data:')) {
                            eventData += line.substring(5).trim();
                        } else if (line.startsWith(':')) { /* ignore comments */ }
                    }

                    if (eventData) {
                        try {
                            const parsedData = JSON.parse(eventData);
                            receivedEvents.push({ type: eventType, data: parsedData });

                            if (eventType === 'TaskArtifactUpdate' && parsedData.artifact?.name === 'joke-result') {
                                jokeText = (parsedData.artifact.parts?.[0] as TextPart)?.text || "";
                            }

                            if (eventType === 'TaskStatusUpdate' && parsedData.final) {
                                finalStateReceived = true;
                                finalStatus = parsedData.status?.state;
                                console.log(`[SSE Helper ${taskId}] Final state ${finalStatus} received via SSE.`);
                                clearTimeout(timeout);
                                resolve({ receivedEvents, jokeText, finalStateReceived, finalStatus });
                                return; // Exit processing loop
                            }
                        } catch (parseError) {
                            console.error(`[SSE Helper ${taskId}] Failed to parse SSE data: ${eventData}`, parseError);
                        }
                    }
                }
            }
            // If loop finishes but final state wasn't received
             if (!finalStateReceived) {
                 reject(new Error(`SSE stream closed for task ${taskId} before receiving final state event.`));
             }
             // If loop finishes after final state (should not happen)
             else {
                 resolve({ receivedEvents, jokeText, finalStateReceived, finalStatus });
             }

        } catch (err) {
             console.error(`[SSE Helper ${taskId}] Error during SSE processing:`, err);
             clearTimeout(timeout);
             reject(err);
        } finally {
             if (reader) {
                 try {
                     if (!reader.closed) {
                         await reader.cancel();
                     }
                 } catch (cancelError) { console.error(`[SSE Helper ${taskId}] Error cancelling SSE reader:`, cancelError); }
             }
        }
    });
}

// --- Test Suite ---
describe("Joke Agent A2A Client Tests", () => {

    let server: http.Server;
    let taskStore: InMemoryTaskStore;
    let processor: JokeProcessor;
    let core: A2AServerCore; // Variable to hold the core instance
    let sseManager: SseConnectionManager; // Variable for SSE manager

    // Use promisify to handle server close asynchronously
    const closeServer = promisify((serverInstance: http.Server, cb: (err?: Error) => void) => serverInstance.close(cb));

    beforeAll(async () => { // Make beforeAll async if needed for setup
        taskStore = new InMemoryTaskStore();
        processor = new JokeProcessor();
        sseManager = new SseConnectionManager(); // Instantiate SSE Manager

        // Capture the core instance via configureApp
        server = startA2AExpressServer({
            agentDefinition: jokeAgentCard,
            taskStore: taskStore,
            taskProcessors: [processor],
            // notificationServices: [sseManager], // <-- Pass the SSE manager here
            port: TEST_PORT,
            baseUrl: BASE_URL,
            // No auth needed for joke agent
            configureApp: (app, coreInstance, card) => {
                console.log("[Test Setup] configureApp called, capturing core instance.");
                core = coreInstance; // Assign the core instance
            }
        });

        if (!core) {
             throw new Error("A2AServerCore instance was not captured during setup.");
         }

        // Add a small delay to ensure server is fully listening
        await Bun.sleep(50);
        console.log(`Joke Agent Test Server started on port ${TEST_PORT}`);
    });

    // Use async/await with promisified close
    afterAll(async () => {
        console.log("[afterAll] Starting shutdown sequence...");

        // 1. Trigger the application's graceful shutdown via SIGTERM
        console.log("[afterAll] Sending SIGTERM to trigger graceful shutdown...");
        try {
            process.kill(process.pid, 'SIGTERM');
            console.log("[afterAll] SIGTERM sent. Application shutdown handler should take over.");
        } catch (err) {
            console.error("[afterAll] Error sending SIGTERM:", err);
        }

        console.log("[afterAll] End of test cleanup logic. Process should exit via application handler.");
    });

    // --- Agent Card Test ---
    test("should fetch and validate the Agent Card", async () => {
        const response = await fetch(AGENT_CARD_ENDPOINT); // Use test endpoint
        expect(response.status).toBe(200);
        const card = await response.json() as AgentCard; 
        expect(card).toBeObject();
        expect(card.name).toBe(jokeAgentCard.name!); // Use joke agent name
        expect(card.url).toBe(AGENT_A2A_ENDPOINT);
        expect(card.skills).toBeArray();
        expect(card.skills.find(s => s.id === 'tell-joke')).toBeDefined();
        expect(card.skills.find(s => s.id === 'jokeAboutTopic')).toBeDefined();
    });

    // --- Polling Send/Get Task Test ---
    test("should send task, poll, and get completed joke artifact", async () => {
        const taskId = `test-poll-joke-${Date.now()}`;
        const params = {
            id: taskId, 
            message: { role: "user", parts: [{ type: "text", text: "tell me a joke via polling test" }] },
            metadata: { skillId: 'tell-joke' } 
        };
        
        // Send task using helper
        const initialTask = await makeRpcCall('tasks/send', params) as Task;
        expect(initialTask.id).toBe(taskId);
        // Don't assert initial state strictly, core handles it
        expect(initialTask.status.state).toBeOneOf(['submitted', 'working', 'completed']); 

        // Poll until completed using helper
        const finalTask = await pollTaskUntilComplete(taskId, 'completed');

        // Assert final state and artifact
        expect(finalTask.status.state).toBe('completed');
        expect(finalTask.artifacts).toBeArray();
        expect(finalTask.artifacts!.length).toBe(1);
        const jokeArtifact = finalTask.artifacts![0];
        expect(jokeArtifact.name).toBe('joke-result');
        expect(jokeArtifact.parts[0].type).toBe('text');
        const jokeText = (jokeArtifact.parts[0] as TextPart).text;
        expect(jokeText.length).toBeGreaterThan(5);
        console.log(`Received Joke (via polling): ${jokeText}`);
    });

    // --- Cancel Task Test ---
    test("should send a cancel request and get a valid response", async () => {
        const taskId = `test-cancel-${Date.now()}`;
        // Send a task first
        const sendResult = await makeRpcCall('tasks/send', {
            id: taskId,
            message: { role: "user", parts: [{ type: "text", text: "another joke to cancel" }] },
            metadata: { skillId: 'tell-joke' } 
        }) as Task;
        const actualTaskId = sendResult.id;

        // Now cancel it
        const cancelResult = await makeRpcCall('tasks/cancel', { id: actualTaskId }) as Task;
        expect(cancelResult.id).toBe(actualTaskId);
        // Because the joke agent is fast, it might already be completed or canceling is fast
        expect(cancelResult.status.state).toBeOneOf(['completed', 'canceled']); 
        console.log(`Cancel response status for task ${actualTaskId}: ${cancelResult.status.state}`);

        // Optional: Verify via tasks/get after a delay
        await Bun.sleep(100);
        const finalTask = await makeRpcCall('tasks/get', { id: actualTaskId }) as Task;
        expect(finalTask.status.state).toBe(cancelResult.status.state); // Should match the cancel response
    });

    // --- Error Handling Test (Task Not Found) ---
    test("should receive a TaskNotFound error for a non-existent task ID", async () => {
         const nonExistentTaskId = "task-does-not-exist-456";
         try {
            await makeRpcCall('tasks/get', { id: nonExistentTaskId });
            // If it doesn't throw, the test fails
            expect(true).toBe(false); 
         } catch (error: any) {
             expect(error.message).toContain('-32001'); // Check for TaskNotFound code
             expect(error.message).toContain(nonExistentTaskId);
         }
    });

    // --- SSE sendSubscribe Test ---
    test("should send task via sendSubscribe and receive updates via SSE and verify via poll", async () => {
        const taskId = `test-sse-joke-${Date.now()}`;
        const params = {
             id: taskId,
             message: { role: "user", parts: [{ type: "text", text: "tell me a joke via SSE test" }] },
             metadata: { skillId: 'tell-joke' } 
         };

        // Process the SSE stream using the helper
        const resultFromSse = await processSseStream(taskId, 'tasks/sendSubscribe', params);

        // Assertions on received SSE data
        expect(resultFromSse.finalStateReceived).toBeTrue();
        expect(resultFromSse.finalStatus).toBe('completed');
        expect(resultFromSse.jokeText.length).toBeGreaterThan(5);
        console.log(`Received Joke (via SSE): ${resultFromSse.jokeText}`);
        
        // Follow-up Poll Verification using helper
        console.log(`[SSE Test ${taskId}] SSE finished. Performing follow-up poll...`);
        await Bun.sleep(100); // Small delay
        const polledTask = await makeRpcCall('tasks/get', { id: taskId, historyLength: 0 });
        expect(polledTask.status.state).toBe('completed');
        const polledJokeText = (polledTask.artifacts?.[0]?.parts?.[0] as TextPart)?.text;
        expect(polledJokeText).toBe(resultFromSse.jokeText); // Verify consistency
        console.log(`[SSE Test ${taskId}] Jokes match between SSE and final poll.`);
    });

    // --- Input Required / Resume Test ---
    test("should handle input-required for jokeAboutTopic and resume", async () => {
       const taskId = `test-input-required-joke-${Date.now()}`;

       // Send initial request without topic 
       console.log(`[InputRequired Test ${taskId}] Sending initial request without topic...`);
       const initialParams = {
           id: taskId,
           message: { role: "user", parts: [{ type: "text", text: "tell me a joke" }] },
           metadata: { skillId: 'jokeAboutTopic' } 
       };
       await makeRpcCall('tasks/send', initialParams);

       // Poll until input-required 
       console.log(`[InputRequired Test ${taskId}] Polling for input-required state...`);
       const inputRequiredTask = await pollTaskUntilComplete(taskId, 'input-required');
       expect(inputRequiredTask?.status.state).toBe('input-required');
       const promptPart = inputRequiredTask?.status.message?.parts[0] as TextPart;
       expect(promptPart?.text).toContain('topic');

       // Send resume message with topic 
       const topic = "computers";
       console.log(`[InputRequired Test ${taskId}] Sending resume message with topic: ${topic}`);
       const resumeParams = { id: taskId, message: { role: "user", parts: [{ type: "text", text: topic }] } };
       await makeRpcCall('tasks/send', resumeParams); // Send resume

       // Poll until final completion 
       console.log(`[InputRequired Test ${taskId}] Polling for final completion after resume...`);
       const finalTask = await pollTaskUntilComplete(taskId, 'completed');

       // Assert final state and artifact
       expect(finalTask.status.state).toBe('completed'); 
       expect(finalTask.artifacts).toBeArray();
       expect(finalTask.artifacts!.length).toBe(1);
       const jokeArtifact = finalTask.artifacts![0];
       expect(jokeArtifact.name).toBe('joke-result');
       expect(jokeArtifact.metadata?.topic).toBe(topic); // Check topic
       const jokeText = (jokeArtifact.parts[0] as TextPart).text;
       expect(jokeText.toLowerCase()).toContain(topic);
       console.log(`Received Topic Joke (after resume): ${jokeText}`);
    });

});

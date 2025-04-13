// File: test/jokeAgentClient.test.ts
import { test, expect, describe, afterAll } from "bun:test"; // Added afterAll
import type { AgentCard, Task, TaskState, JsonRpcErrorResponse, JsonRpcSuccessResponse, TextPart } from "../../../src/types"; // Corrected import path, added TaskState, TextPart

// --- Configuration ---
const JOKE_AGENT_BASE_URL = "http://localhost:3001"; // Make sure this matches
const AGENT_CARD_URL = `${JOKE_AGENT_BASE_URL}/.well-known/agent.json`;
const AGENT_A2A_ENDPOINT = `${JOKE_AGENT_BASE_URL}/a2a`;

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

async function pollTaskUntilComplete(taskId: string): Promise<any> {
    for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
        console.log(`Polling attempt ${i + 1} for task ${taskId}...`);
        const getPayload = createRpcPayload('tasks/get', { id: taskId });
        const getResponse = await fetch(AGENT_A2A_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: getPayload
        });

        if (!getResponse.ok) {
            // Handle case where task might not be found immediately or other errors
            console.error(`Polling error: HTTP ${getResponse.status}`);
            await Bun.sleep(POLL_INTERVAL_MS);
            continue;
        }

        // Type assertion for the JSON response
        const getResult = await getResponse.json() as JsonRpcSuccessResponse<Task> | JsonRpcErrorResponse;

        // Type guard to check if it's an error response
        if ('error' in getResult) {
            console.error(`Polling error: JSON-RPC ${getResult.error.code} - ${getResult.error.message}`);
            await Bun.sleep(POLL_INTERVAL_MS);
            continue;
        } else {
            // Now we know it's a JsonRpcSuccessResponse<Task>
            const task = getResult.result;
            if (task?.status?.state === 'completed') {
                console.log(`Task ${taskId} completed!`);
                return task; // Return the completed task object
            } else {
                console.log(`Task ${taskId} status: ${task?.status?.state || 'unknown'}`);
            }
        }

        await Bun.sleep(POLL_INTERVAL_MS);
    }
    throw new Error(`Task ${taskId} did not complete within ${MAX_POLL_ATTEMPTS} poll attempts.`);
}

// --- SSE Stream Processing Helper ---
interface ProcessedSseResult {
    receivedEvents: any[];
    jokeText: string;
    finalStateReceived: boolean;
    finalStatus?: string; // Record the final status state reported by SSE
}

async function processSseStream(taskId: string, sseFetchPromise: Promise<Response>): Promise<ProcessedSseResult> {
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    const receivedEvents: any[] = [];
    let jokeText = "";
    let finalStateReceived = false;
    let finalStatus: string | undefined;

    // Promise to signal completion or timeout
    return new Promise<ProcessedSseResult>((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error(`SSE processing timed out after 10 seconds for task ${taskId}`));
        }, 10000); // 10 second timeout

        const process = async () => {
            try {
                const sseResponse = await sseFetchPromise;

                expect(sseResponse.status).toBe(200); // Basic check within helper
                expect(sseResponse.headers.get('content-type')).toContain('text/event-stream');

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
                                    jokeText = parsedData.artifact.parts?.[0]?.text || "";
                                }

                                if (eventType === 'TaskStatusUpdate' && parsedData.final) {
                                    finalStateReceived = true;
                                    finalStatus = parsedData.status?.state;
                                    console.log(`[SSE Helper ${taskId}] Final state ${finalStatus} received via SSE.`);
                                    // Resolve once final state is seen, regardless of joke
                                    // The caller should check if jokeText was populated
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
                // If loop finishes but final state wasn't received (e.g., premature close)
                 if (!finalStateReceived) {
                     reject(new Error(`SSE stream closed for task ${taskId} before receiving final state event.`));
                 }
                 // If loop finishes after final state (should not happen due to return above, but safety)
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
        };

        process(); // Start processing
    });
}

// --- Test Suite ---
describe("Joke Agent A2A Client Tests", () => {

    // Cleanup any potentially hanging resources if needed (though unlikely here)
    afterAll(() => {
        console.log("Finished Joke Agent tests.");
    });

    // --- Agent Card Test (Unchanged) ---
    test("should fetch and validate the Agent Card", async () => {
        const response = await fetch(AGENT_CARD_URL);
        expect(response.status).toBe(200);
        const card = await response.json() as AgentCard; // Type assertion
        expect(card).toBeObject();
        expect(card.name).toBe('Joke Agent');
        expect(card.url).toBe(AGENT_A2A_ENDPOINT);
        expect(card.skills).toBeArray();
        expect(card.skills[0].id).toBe('tell-joke');
    });

    // --- Polling Send/Get Task Test (REVISED) ---
    test("should send task, poll, and get completed joke artifact", async () => {
        const taskId = `test-poll-joke-${Date.now()}`;
        const sendPayload = createRpcPayload('tasks/send', {
            id: taskId, // Suggest an ID
            message: {
                role: "user",
                parts: [{ type: "text", text: "tell me a joke via polling test" }],
            },
            metadata: { skillId: 'tell-joke' } // Specify skill
        });

        // --- Send the task ---
        const sendResponse = await fetch(AGENT_A2A_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: sendPayload
        });

        expect(sendResponse.status).toBe(200);
        const sendResult = await sendResponse.json() as JsonRpcSuccessResponse<Task>; // Type assertion
        expect(sendResult.result).toBeObject();
        const initialTask = sendResult.result;
        expect(initialTask.id).toBe(taskId);

        // --- Assert Initial State (Flexible) ---
        // Agent might return 'submitted' or 'working' immediately.
        // If it was incredibly fast AND synchronous (which ours isn't), it *could* be 'completed'.
        expect(initialTask.status.state).toBeOneOf(['submitted', 'working', 'completed']);
        console.log(`Initial task state: ${initialTask.status.state}`);

        // --- Poll until completed ---
        const finalTask = await pollTaskUntilComplete(taskId);

        // --- Assert final state and artifact ---
        expect(finalTask).toBeObject();
        expect(finalTask.id).toBe(taskId);
        expect(finalTask.status.state).toBe('completed'); // Assert completion after polling

        expect(finalTask.artifacts).toBeArray();
        expect(finalTask.artifacts.length).toBe(1);

        const jokeArtifact = finalTask.artifacts[0];
        expect(jokeArtifact).toBeObject();
        expect(jokeArtifact.name).toBe('joke-result');
        expect(jokeArtifact.parts).toBeArray();
        expect(jokeArtifact.parts.length).toBe(1);
        expect(jokeArtifact.parts[0].type).toBe('text');
        expect(jokeArtifact.parts[0].text).toBeString();
        expect(jokeArtifact.parts[0].text.length).toBeGreaterThan(5);

        console.log(`Received Joke (via polling): ${jokeArtifact.parts[0].text}`);
    });

    // --- Cancel Task Test (Unchanged) ---
    test("should send a cancel request and get a valid response", async () => {
        const taskId = `test-cancel-${Date.now()}`;
        const sendPayload = createRpcPayload('tasks/send', {
            id: taskId,
            message: { role: "user", parts: [{ type: "text", text: "another joke to cancel" }] },
            metadata: { skillId: 'tell-joke' } // Specify skill
        });
        const sendResponse = await fetch(AGENT_A2A_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: sendPayload });
        expect(sendResponse.status).toBe(200);
        const sendResult = await sendResponse.json() as JsonRpcSuccessResponse<Task>; // Type assertion
        const actualTaskId = sendResult.result.id;

        const cancelPayload = createRpcPayload('tasks/cancel', { id: actualTaskId });
        const cancelResponse = await fetch(AGENT_A2A_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: cancelPayload });
        expect(cancelResponse.status).toBe(200);
        const cancelResult = await cancelResponse.json() as JsonRpcSuccessResponse<Task>; // Type assertion
        expect(cancelResult.result).toBeObject();
        expect(cancelResult.result.id).toBe(actualTaskId);
        expect(cancelResult.result.status.state).toBeOneOf(['completed', 'canceled']); // Agent is fast, might complete before cancel processes fully
        console.log(`Cancel response status for task ${actualTaskId}: ${cancelResult.result.status.state}`);
    });

    // --- Error Handling Test (Task Not Found - Unchanged) ---
    test("should receive a TaskNotFound error for a non-existent task ID", async () => {
         const nonExistentTaskId = "task-does-not-exist-456";
         const getPayload = createRpcPayload('tasks/get', { id: nonExistentTaskId });
         const response = await fetch(AGENT_A2A_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: getPayload });
         expect(response.status).toBe(404); // Expect HTTP 404 after core fix
         const errorResult = await response.json() as JsonRpcErrorResponse; // Type assertion
         expect(errorResult.error).toBeObject();
         expect(errorResult.error.code).toBe(-32001); // A2AErrorCodes.TaskNotFound
         expect(errorResult.error.message).toContain(nonExistentTaskId);
    });

    // --- SSE sendSubscribe Test ---
    test("should send task via sendSubscribe and receive updates via SSE and verify via poll", async () => {
        const taskId = `test-sse-joke-${Date.now()}`;

        // Prepare the SSE request promise (use tell-joke skill)
        const sseFetchPromise = fetch(AGENT_A2A_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
            body: createRpcPayload('tasks/sendSubscribe', {
                 id: taskId,
                 message: {
                     role: "user",
                     parts: [{ type: "text", text: "tell me a joke via SSE test" }],
                 },
                 metadata: { skillId: 'tell-joke' } // Specify skill
             })
        });

        // Process the SSE stream using the helper
        const resultFromSse = await processSseStream(taskId, sseFetchPromise);

        // --- Assertions on received SSE data ---
        expect(resultFromSse.finalStateReceived).toBeTrue();
        expect(resultFromSse.finalStatus).toBe('completed');
        expect(resultFromSse.receivedEvents.length).toBeGreaterThanOrEqual(2); // Initial status, artifact, final status

        // Check for status updates within SSE events
        const sseStatusUpdates = resultFromSse.receivedEvents.filter(e => e.type === 'TaskStatusUpdate').map(e => e.data);
        expect(sseStatusUpdates.some(s => s.status.state === 'working' || s.status.state === 'submitted')).toBeTrue();
        expect(sseStatusUpdates.some(s => s.status.state === 'completed' && s.final === true)).toBeTrue();

        // Check for artifact update within SSE events
        const sseArtifactUpdates = resultFromSse.receivedEvents.filter(e => e.type === 'TaskArtifactUpdate').map(e => e.data);
        expect(sseArtifactUpdates.length).toBe(1);
        expect(sseArtifactUpdates[0].artifact.name).toBe('joke-result');

        // Check joke text extracted during SSE processing
        expect(resultFromSse.jokeText).toBeString();
        expect(resultFromSse.jokeText.length).toBeGreaterThan(5);

        console.log(`Received Joke (via SSE): ${resultFromSse.jokeText}`);

        // --- Follow-up Poll Verification ---
        console.log(`[SSE Test ${taskId}] SSE finished. Performing follow-up poll...`);

        // Wait a very short moment just in case there's a tiny delay in store update vs SSE push
        await Bun.sleep(100); // 100ms delay

        const getPayload = createRpcPayload('tasks/get', { id: taskId, historyLength: 0 }); // Get task without history
        const getResponse = await fetch(AGENT_A2A_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: getPayload
        });

        expect(getResponse.status).toBe(200);
        const getResult = await getResponse.json() as JsonRpcSuccessResponse<Task> | JsonRpcErrorResponse;

        expect('error' in getResult).toBeFalse(); // Should not be an error
        const polledTask = (getResult as JsonRpcSuccessResponse<Task>).result;

        expect(polledTask).toBeObject();
        expect(polledTask.id).toBe(taskId);
        expect(polledTask.status.state).toBe('completed');
        console.log(`[SSE Test ${taskId}] Polled task status: ${polledTask.status.state}`);

        // Verify consistency between SSE final state and polled state
        expect(polledTask.status.state).toBe(resultFromSse.finalStatus as TaskState);

        // Verify joke consistency
        expect(polledTask.artifacts).toBeArray();
        expect(polledTask.artifacts?.length).toBe(1);
        const polledJokePart = polledTask.artifacts?.[0]?.parts?.[0];
        expect(polledJokePart?.type).toBe('text'); // Ensure it's a TextPart
        const polledJokeText = (polledJokePart as TextPart)?.text; // Use imported TextPart type
        expect(polledJokeText).toBeString();
        expect(polledJokeText).toBe(resultFromSse.jokeText);

        console.log(`[SSE Test ${taskId}] Jokes match between SSE and final poll.`);
        console.log(JSON.stringify(resultFromSse, null, 2))
    });

    // --- Input Required / Resume Test ---
    test("should handle input-required for jokeAboutTopic and resume", async () => {
       const taskId = `test-input-required-joke-${Date.now()}`;

       // --- Send initial request without topic ---
       console.log(`[InputRequired Test ${taskId}] Sending initial request without topic...`);
       const initialSendPayload = createRpcPayload('tasks/send', {
           id: taskId,
           message: {
               role: "user",
               parts: [{ type: "text", text: "tell me a joke" }] // No topic mentioned
           },
           metadata: { skillId: 'jokeAboutTopic' } // Specify the topic skill
       });

       const initialSendResponse = await fetch(AGENT_A2A_ENDPOINT, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: initialSendPayload
       });

       expect(initialSendResponse.status).toBe(200);
       const initialSendResult = await initialSendResponse.json() as JsonRpcSuccessResponse<Task>;
       expect(initialSendResult.result).toBeObject();

       // --- Poll until input-required --- (Agent might respond immediately or take time)
       console.log(`[InputRequired Test ${taskId}] Polling for input-required state...`);
       let inputRequiredTask: Task | null = null;
       for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
           const getPayload = createRpcPayload('tasks/get', { id: taskId });
           const getResponse = await fetch(AGENT_A2A_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: getPayload });
           const getResult = await getResponse.json() as JsonRpcSuccessResponse<Task> | JsonRpcErrorResponse;

           if ('result' in getResult && getResult.result.status.state === 'input-required') {
               inputRequiredTask = getResult.result;
               console.log(`[InputRequired Test ${taskId}] Task reached input-required state.`);
               break;
           }
           console.log(`[InputRequired Test ${taskId}] Polling... current state: ${('result' in getResult) ? getResult.result.status.state : ('error' in getResult ? 'error' : 'unknown')}`);
           await Bun.sleep(POLL_INTERVAL_MS);
       }

       expect(inputRequiredTask).not.toBeNull();
       expect(inputRequiredTask?.status.state).toBe('input-required');
       const promptPart = inputRequiredTask?.status.message?.parts[0];
       expect(promptPart?.type).toBe('text'); // Ensure prompt is text
       expect((promptPart as TextPart)?.text).toContain('topic'); // Check the agent's prompt text

       // --- Send resume message with topic ---
       const topic = "computers";
       console.log(`[InputRequired Test ${taskId}] Sending resume message with topic: ${topic}`);
       const resumePayload = createRpcPayload('tasks/send', {
           id: taskId,
           message: {
               role: "user",
               parts: [{ type: "text", text: topic }]
           },
       });

       const resumeResponse = await fetch(AGENT_A2A_ENDPOINT, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: resumePayload
       });

       expect(resumeResponse.status).toBe(200);
       const resumeResult = await resumeResponse.json() as JsonRpcSuccessResponse<Task>; // Immediate response might still be working
       expect(resumeResult.result).toBeObject();
       expect(resumeResult.result.status.state).toBeOneOf(['working', 'completed']); // Should be working or maybe completed if fast

       // --- Poll until final completion --- 
       console.log(`[InputRequired Test ${taskId}] Polling for final completion after resume...`);
       const finalTask = await pollTaskUntilComplete(taskId);

       // --- Assert final state and artifact ---
       expect(finalTask).toBeObject();
       expect(finalTask.id).toBe(taskId);
       expect(finalTask.status.state).toBe('completed'); // Assert completion

       expect(finalTask.artifacts).toBeArray();
       expect(finalTask.artifacts?.length).toBe(1);
       const jokeArtifact = finalTask.artifacts?.[0];
       expect(jokeArtifact?.name).toBe('joke-result');
       expect(jokeArtifact?.metadata?.topic).toBe(topic); // Check topic in metadata

       const jokePart = jokeArtifact?.parts?.[0];
       expect(jokePart?.type).toBe('text');
       const jokeText = (jokePart as TextPart)?.text;
       expect(jokeText).toBeString();
       expect(jokeText?.toLowerCase()).toContain(topic); // Joke should contain the topic

       console.log(`Received Topic Joke (after resume): ${jokeText}`);
    });

});

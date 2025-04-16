// a4a/test/a2a_core_v2.test.ts (New file)
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import type { Server } from 'bun';
import { EventEmitter } from 'node:events'; // Import EventEmitter
import { A2AServerCoreV2, A2AServerConfigV2 } from './core/A2AServerCoreV2'; // Adjust path
import { InMemoryTaskStore } from './store/InMemoryTaskStore'; // Adjust path
import { SseConnectionManager } from './core/SseConnectionManager'; // Adjust path
import { EchoProcessor, CounterProcessor, StreamingProcessor, CancelProcessor, InputRequiredProcessor, PauseProcessor } from '../samples/test-processors'; // Adjust path
import type * as A2ATypes from './types'; // Adjust path
import { A2AErrorCodes } from './types'; // Adjust path

// --- Test Setup ---
let server: Server;
let core: A2AServerCoreV2;
let taskStore: InMemoryTaskStore;
let sseManager: SseConnectionManager;
let serverUrl: string;
const agentCardPath = '/.well-known/agent.json';
const rpcPath = '/a2a';

// Agent Card definition (partial, core completes it)
const testAgentCardPartial: Partial<A2ATypes.AgentCard> = {
    name: "Test V2 Agent",
    version: "0.1.0",
    description: "Agent for testing A2ACoreV2",
    capabilities: {
        streaming: true,
        pushNotifications: false, // Assuming false for simplicity
         stateTransitionHistory: true // Assuming store supports it
    },
    skills: [
         { id: 'echo', name: 'Echo', description: 'Echoes input', tags: ['test'] },
         { id: 'counter', name: 'Counter', description: 'Counts input', tags: ['test', 'multi-turn'] },
         { id: 'stream', name: 'Streamer', description: 'Streams parts', tags: ['test', 'streaming'] },
         { id: 'cancelTest', name: 'Cancel Test', description: 'Waits to be cancelled', tags: ['test', 'cancel'] },
         { id: 'inputRequired', name: 'Input Required Test', description: 'Tests input-required via SSE', tags: ['test', 'sse'] },
         { id: 'pauseTest', name: 'Pause Test', description: 'Tests resubscribe during pause', tags: ['test', 'sse', 'resubscribe'] },
    ]
};

// --- Helper Functions --- //

/** Helper to make JSON-RPC requests */
async function makeA2ARequest(method: string, params: any, id: number | string | null = 1): Promise<Response> {
    return fetch(`${serverUrl}${rpcPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: "2.0",
            id: id,
            method: method,
            params: params
        })
    });
}

/** Helper to parse SSE data lines */
function parseSseEvent(line: string): any | null {
     if (line.startsWith('data:')) {
         try {
            // Attempt to parse the JSON data part
             const jsonData = line.substring(5).trim(); // Remove 'data:' prefix and trim whitespace
             const parsed = JSON.parse(jsonData);
             if (parsed.jsonrpc === "2.0" && parsed.result) {
                 return parsed.result; // Extract A2A event from JSON-RPC wrapper
             }
             return parsed; // Assume data is the event itself
         } catch (e) {
             console.error("Failed to parse SSE data line:", line, e);
             return null;
         }
     }
     return null;
}

/** 
 * Helper to read events from an SSE stream.
 * Reads until the stream closes or the optional `stopCondition` returns true.
 */
async function readSseEvents(
    response: Response, 
    stopCondition?: (event: any) => boolean
): Promise<any[]> { 
    if (!response.body) {
        throw new Error("Response body is null");
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const events: any[] = [];
    let stopReading = false;
    let streamFinished = false;

    try {
        while (!stopReading) {
            const { done, value } = await reader.read();
            if (done) {
                console.log("[readSseEvents] Stream finished (done=true).");
                streamFinished = true;
                break;
            }
            buffer += decoder.decode(value, { stream: true });

            let eventBoundary = buffer.indexOf('\n\n');
            while (eventBoundary !== -1) {
                const eventText = buffer.substring(0, eventBoundary);
                buffer = buffer.substring(eventBoundary + 2);

                const lines = eventText.split('\n');
                for (const line of lines) {
                    if (line.trim() === '') continue;
                    const event = parseSseEvent(line);
                    if (event) {
                        events.push(event);
                        if (stopCondition && stopCondition(event)) {
                            console.log("[readSseEvents] Stop condition met.");
                            stopReading = true;
                            break; 
                        }
                    }
                }
                if (stopReading) break; 
                eventBoundary = buffer.indexOf('\n\n');
            }
        }
    } catch (e) {
        console.error("[readSseEvents] Error during reading:", e);
        // Propagate error? Or just log and continue cleanup?
        streamFinished = true; // Treat error as end of stream for cleanup
    } finally {
        try {
            console.log("[readSseEvents] Releasing reader lock.");
            reader.releaseLock();
            // If the stream didn't finish naturally (e.g., stop condition met, or maybe even if it did done=true),
            // explicitly cancel it from the client side to signal we are done with the response body.
            if (!streamFinished || stopReading) { 
                console.log("[readSseEvents] Explicitly cancelling response body stream...");
                await response.body.cancel("Client finished reading events");
            }
        } catch (cancelError) {
            console.warn("[readSseEvents] Error during stream cancel/releaseLock:", cancelError);
        }
    }
    return events;
}

beforeAll(() => {
    taskStore = new InMemoryTaskStore();
    sseManager = new SseConnectionManager();
    const processors = [
        new EchoProcessor(), 
        new CounterProcessor(), 
        new StreamingProcessor(), 
        new CancelProcessor(), 
        new InputRequiredProcessor(),
        new PauseProcessor(500)
    ];

    // --- Start Server First to get URL --- //
    server = Bun.serve({
        port: 0, // Use random available port
        // Fetch handler now simplified, relies on core.getAgentCard()
        fetch: async (req, serverInstance) => { // Renamed server to serverInstance
            const url = new URL(req.url);
            if (req.method === 'GET' && url.pathname === agentCardPath) {
                // Core now holds the complete card
                return Response.json(core.getAgentCard()); 
            }
            if (req.method === 'POST' && url.pathname === rpcPath) {
                 if (req.headers.get('content-type') !== 'application/json') {
                     return new Response("Unsupported Media Type", { status: 415 });
                 }
                 const body = await req.json() as A2ATypes.JsonRpcRequest;
                 let requestId: string | number | null = body.id ?? null;

                 try {
                     if (body.jsonrpc !== "2.0" || typeof body.method !== 'string') {
                         throw { code: A2AErrorCodes.InvalidRequest, message: "Invalid JSON-RPC", isA2AError: true };
                     }

                     let result: any;

                     // --- SSE Handling (Mocked Response) --- //
                     if (body.method === 'tasks/sendSubscribe' || body.method === 'tasks/resubscribe') {
                          // Use core.getAgentCard() for capability check
                         if (!core.getAgentCard().capabilities.streaming || !sseManager) {
                              throw { code: A2AErrorCodes.UnsupportedOperation, message: "Streaming not supported", isA2AError: true };
                         }
                         
                         const sseEmitter = new EventEmitter();
                         let connectionClosed = false;

                         const responseStream = new ReadableStream({ 
                             start(controller) { // Controller is defined here

                                 // --- Define fakeRes INSIDE start to capture controller --- //
                                 const fakeRes = {
                                      headersSent: false, 
                                      _headers: {} as Record<string, string>,
                                      setHeader: (name: string, value: string) => { fakeRes._headers[name.toLowerCase()] = value; },
                                      flushHeaders: () => { fakeRes.headersSent = true; },
                                      write: (chunk: string) => { 
                                          if (connectionClosed) return;
                                          const formattedChunk = chunk.endsWith('\n') ? chunk : chunk + '\n';
                                          // Now controller is in scope
                                          try { controller.enqueue(formattedChunk); } catch (e) { console.error("SSE enqueue error", e); }
                                      },
                                      end: () => { 
                                           if (connectionClosed) return;
                                           connectionClosed = true;
                                           // Now controller is in scope
                                           try { controller.close(); } catch (e) { /* Ignore */ }
                                           sseEmitter.emit('close'); 
                                      },
                                      on: (event: string, listener: (...args: any[]) => void) => sseEmitter.on(event, listener),
                                      once: (event: string, listener: (...args: any[]) => void) => sseEmitter.once(event, listener),
                                      emit: (event: string, ...args: any[]) => sseEmitter.emit(event, ...args),
                                      removeListener: (event: string, listener: (...args: any[]) => void) => sseEmitter.removeListener(event, listener),
                                      get closed() { return connectionClosed; }
                                  } as any; 

                                 // Call core's SSE handler with the mock response
                                 if (body.method === 'tasks/sendSubscribe') {
                                     core.handleTaskSendSubscribe(requestId, body.params, fakeRes)
                                         .catch(err => { console.error("SSE sendSub Handler Error:", err); controller.error(err); });
                                 } else { // tasks/resubscribe
                                     core.handleTaskResubscribe(requestId, body.params, fakeRes)
                                          .catch(err => { console.error("SSE resub Handler Error:", err); controller.error(err); });
                                 }
                             },
                             cancel(reason) { 
                                 console.log("SSE Stream Cancelled by client:", reason);
                                 connectionClosed = true;
                                 sseEmitter.emit('close'); 
                             }
                         });

                         return new Response(responseStream, {
                             status: 200,
                             headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' }
                         });
                     }

                     // --- Regular RPC Handling --- //
                     switch (body.method) {
                        case 'tasks/send':
                            result = await core.handleTaskSend(body.params);
                            break;
                        case 'tasks/get':
                            result = await core.handleTaskGet(body.params);
                            break;
                        case 'tasks/cancel':
                            result = await core.handleTaskCancel(body.params);
                            break;
                        // Add push notification handlers if testing them
                        default:
                            throw { code: A2AErrorCodes.MethodNotFound, message: `Method not found: ${body.method}`, isA2AError: true };
                    }

                     const response: A2ATypes.JsonRpcSuccessResponse = { jsonrpc: "2.0", id: requestId, result: result };
                     return Response.json(response);

                 } catch (error: any) {
                      console.error("[Test Server] Error processing A2A request:", error);
                      let jsonRpcError: A2ATypes.JsonRpcError;
                      if (error.isA2AError) {
                          jsonRpcError = { code: error.code, message: error.message, data: error.data };
                      } else {
                          jsonRpcError = { code: A2AErrorCodes.InternalError, message: "Internal server error", data: error.message };
                      }
                      const errorResponse: A2ATypes.JsonRpcErrorResponse = { jsonrpc: "2.0", id: requestId, error: jsonRpcError };
                      let statusCode = 500;
                      if (jsonRpcError.code === A2AErrorCodes.InvalidRequest) statusCode = 400;
                      else if (jsonRpcError.code === A2AErrorCodes.MethodNotFound) statusCode = 404;
                      else if (jsonRpcError.code === A2AErrorCodes.TaskNotFound) statusCode = 404;
                      return Response.json(errorResponse, { status: statusCode });
                 }
            }
            return new Response("Not Found", { status: 404 });
        },
        error(error: Error) {
            console.error("Server Error:", error);
            return new Response("Internal Server Error", { status: 500 });
        },
    });

    serverUrl = `http://${server.hostname}:${server.port}`;
    console.log(`Test server running at ${serverUrl}`);

    // --- Initialize Core AFTER getting server URL --- //
    const config: A2AServerConfigV2 = {
        agentCard: testAgentCardPartial, // Pass the partial card
        taskStore: taskStore,
        taskProcessors: processors,
        notificationServices: [sseManager],
        baseUrl: serverUrl, // Provide base URL to the core
        rpcPath: rpcPath
    };
    core = new A2AServerCoreV2(config);
});

afterAll(async () => {
    console.log("Stopping test server...");
    await server.stop();
    console.log("Test server stopped.");
});

// --- Test Cases ---

describe("A2A Server Core V2 - Basic Tests", () => {
    it("should serve the agent card", async () => {
        const res = await fetch(`${serverUrl}${agentCardPath}`);
        expect(res.status).toEqual(200);
        const card = await res.json() as A2ATypes.AgentCard;
        expect(card.name).toEqual(testAgentCardPartial.name!);
        expect(card.url).toEqual(`${serverUrl}${rpcPath}`); // Check dynamic URL built by core
         expect(card.capabilities?.streaming).toBe(true);
         expect(card.skills?.length).toBeGreaterThan(0);
    });

    it("should handle tasks/send for EchoProcessor", async () => {
        const textToSend = "Hello V2!";
        const res = await makeA2ARequest('tasks/send', {
            message: { role: 'user', parts: [{ type: 'text', text: textToSend }] },
            metadata: { skillId: 'echo' }
        });
        expect(res.status).toEqual(200);
        // Add type cast
        const jsonRes = await res.json() as A2ATypes.JsonRpcSuccessResponse<{ id: string }>; 
        expect(jsonRes.result.id).toBeString();
        const taskId = jsonRes.result.id;

        // Wait briefly for processing
        await Bun.sleep(50);

        // Get final state
        const getRes = await makeA2ARequest('tasks/get', { id: taskId });
        expect(getRes.status).toEqual(200);
        // Add type cast
        const getJson = await getRes.json() as A2ATypes.JsonRpcSuccessResponse<A2ATypes.Task>; 
        expect(getJson.result.status.state).toEqual('completed');
        expect(getJson.result.artifacts).toBeArray();
        expect(getJson.result.artifacts?.length).toBe(1);
        expect(getJson.result.artifacts?.[0].name).toEqual('echo-response'); // Corrected expectation
        // Type guard before accessing .text
        const firstPart = getJson.result.artifacts?.[0]?.parts?.[0];
        expect(firstPart?.type).toEqual('text');
        if (firstPart?.type === 'text') {
             expect(firstPart.text).toEqual(textToSend);
        }
    });

     it("should handle multi-turn with CounterProcessor", async () => {
        // 1. Initial send
        const res1 = await makeA2ARequest('tasks/send', {
            message: { role: 'user', parts: [{ type: 'text', text: "Start counting" }] },
            metadata: { skillId: 'counter' }
        }, "count-task-1");
        expect(res1.status).toEqual(200);
        // Add type cast
        const jsonRes1 = await res1.json() as A2ATypes.JsonRpcSuccessResponse<{ id: string, status: A2ATypes.TaskStatus }>; 
        expect(jsonRes1.result.id).toBeString();
        const taskId = jsonRes1.result.id;
        expect(jsonRes1.result.status.state).toEqual('working'); // Initial state set by core

        // Wait for processor to yield input-required
        await Bun.sleep(50);

        // Check store state is input-required
        const getRes1 = await makeA2ARequest('tasks/get', { id: taskId });
        expect(getRes1.status).toEqual(200);
        // Add type cast
        const getJson1 = await getRes1.json() as A2ATypes.JsonRpcSuccessResponse<A2ATypes.Task>; 
        expect(getJson1.result.status.state).toEqual('input-required');
         // Type guard before accessing .text
         const statusPart1 = getJson1.result.status.message?.parts?.[0];
         expect(statusPart1?.type).toEqual('text');
         if (statusPart1?.type === 'text') {
             expect(statusPart1.text).toContain("Please send a number");
         }

        // 2. Send input
         const numToAdd = 5;
         const res2 = await makeA2ARequest('tasks/send', {
             id: taskId, // Resume the same task
             message: { role: 'user', parts: [{ type: 'text', text: String(numToAdd) }] },
             metadata: { skillId: 'counter' } // Metadata might be ignored on resume by core, but good practice
         }, "count-task-2");
         expect(res2.status).toEqual(200);
         // Add type cast
         const jsonRes2 = await res2.json() as A2ATypes.JsonRpcSuccessResponse<{ id: string }>; 
          expect(jsonRes2.result.id).toEqual(taskId);

         // Wait for processing to complete
          await Bun.sleep(50);

         // 3. Get final state
         const getRes2 = await makeA2ARequest('tasks/get', { id: taskId });
         expect(getRes2.status).toEqual(200);
         // Add type cast
         const getJson2 = await getRes2.json() as A2ATypes.JsonRpcSuccessResponse<A2ATypes.Task>; 
         expect(getJson2.result.status.state).toEqual('completed');
         expect(getJson2.result.artifacts).toBeArray();
         expect(getJson2.result.artifacts?.length).toBe(1);
         // Type guard before accessing .text
         const artifactPart2 = getJson2.result.artifacts?.[0]?.parts?.[0];
         expect(artifactPart2?.type).toEqual('text');
         if (artifactPart2?.type === 'text') {
             expect(artifactPart2.text).toEqual(`Final Count: ${numToAdd}`);
         }
     });

      it("should handle tasks/cancel", async () => {
         // 1. Start the cancellable task
         const res1 = await makeA2ARequest('tasks/send', {
             message: { role: 'user', parts: [{ type: 'text', text: "Start waiting" }] },
             metadata: { skillId: 'cancelTest' }
         }, "cancel-task-1");
          expect(res1.status).toEqual(200);
          // Add type cast
          const jsonRes1 = await res1.json() as A2ATypes.JsonRpcSuccessResponse<{ id: string, status: A2ATypes.TaskStatus }>; 
          const taskId = jsonRes1.result.id;
          expect(jsonRes1.result.status.state).toEqual('working');

         // Wait briefly to ensure processor is running
          await Bun.sleep(20);

         // 2. Cancel the task
         const res2 = await makeA2ARequest('tasks/cancel', { id: taskId }, "cancel-task-2");
         expect(res2.status).toEqual(200);
         // Add type cast
         const jsonRes2 = await res2.json() as A2ATypes.JsonRpcSuccessResponse<{ id: string }>; 
         expect(jsonRes2.result.id).toEqual(taskId);

         // Wait for potential async cancellation processing
          await Bun.sleep(50);

         // 3. Get final state
         const getRes = await makeA2ARequest('tasks/get', { id: taskId });
         expect(getRes.status).toEqual(200);
         // Add type cast
         const getJson = await getRes.json() as A2ATypes.JsonRpcSuccessResponse<A2ATypes.Task>; 
         expect(getJson.result.status.state).toEqual('canceled');
     });
});

describe("A2A Server Core V2 - Streaming Tests", () => {
    it("should handle tasks/sendSubscribe for StreamingProcessor", async () => {
         const res = await makeA2ARequest('tasks/sendSubscribe', {
             message: { role: 'user', parts: [{ type: 'text', text: "Stream data" }] },
             metadata: { skillId: 'stream' }
         }, "stream-task-1");

         expect(res.status).toEqual(200);
         expect(res.headers.get('Content-Type')).toEqual('text/event-stream');

         // Read all events until the stream closes (no stop condition)
         const events = await readSseEvents(res);

         // Assert the sequence of events
         expect(events.length).toBeGreaterThanOrEqual(5); 

         const statusUpdates = events.filter(e => e.status);
         const artifactUpdates = events.filter(e => e.artifact);

         expect(statusUpdates[0]?.status?.state).toEqual('working');
         expect(artifactUpdates.length).toEqual(3);
         expect(artifactUpdates.some(e => e.artifact?.parts?.[0]?.type === 'text' && e.artifact.parts[0].text === 'Part 1')).toBe(true);
         expect(artifactUpdates.some(e => e.artifact?.parts?.[0]?.type === 'text' && e.artifact.parts[0].text === 'Part 2')).toBe(true);
         expect(artifactUpdates.some(e => e.artifact?.parts?.[0]?.type === 'text' && e.artifact.parts[0].text === 'Part 3')).toBe(true);

          const lastEvent = events[events.length - 1];
          expect(lastEvent?.status?.state).toEqual('completed');
          expect(lastEvent?.final).toBe(true);

         const taskId = events[0]?.id;
         expect(taskId).toBeString(); 
         if (taskId) {
             const getRes = await makeA2ARequest('tasks/get', { id: taskId });
             const getJson = await getRes.json() as A2ATypes.JsonRpcSuccessResponse<A2ATypes.Task>; 
             expect(getJson.result.status.state).toEqual('completed');
         }
     });

    it("should handle input-required via SSE", async () => {
        const initialText = "Start task requiring input";
        const inputText = "Here is the required input";
        let taskId: string | null = null;

        // 1. Start task
        const res1 = await makeA2ARequest('tasks/sendSubscribe', {
            message: { role: 'user', parts: [{ type: 'text', text: initialText }] },
            metadata: { skillId: 'inputRequired' }
        }, "input-req-1");
        expect(res1.status).toEqual(200);

        // 2. Read events until input-required is received
        const stopCondition = (event: any) => event.status?.state === 'input-required';
        const initialEventsReceived = await readSseEvents(res1, stopCondition);
        
        // Assert input-required was received
        const inputRequiredEvent = initialEventsReceived.find(stopCondition);
        expect(inputRequiredEvent).toBeDefined();
        expect(inputRequiredEvent.final).toBe(true); // Check it was marked final
        taskId = inputRequiredEvent.id; // Get taskId
        expect(taskId).toBeString();
        const promptPart = inputRequiredEvent.status?.message?.parts?.[0];
        expect(promptPart?.type).toEqual('text');
        if (promptPart?.type === 'text') {
            expect(promptPart.text).toContain('Please provide the required input');
        }

        // 3. Send input
        console.log(`Sending input '${inputText}' for task ${taskId}...`);
        const res2 = await makeA2ARequest('tasks/send', {
            id: taskId,
            message: { role: 'user', parts: [{ type: 'text', text: inputText }] }
        }, "input-req-2");
        expect(res2.status).toEqual(200); 

        // 4. Poll for final state
        console.log("Waiting for background processing after input...");
        let finalTaskState: A2ATypes.Task | null = null;
        for (let i = 0; i < 10; i++) { // Poll for up to ~500ms
            await Bun.sleep(50);
            const getRes = await makeA2ARequest('tasks/get', { id: taskId! });
            const getJson = await getRes.json() as A2ATypes.JsonRpcSuccessResponse<A2ATypes.Task>;
            if (getJson.result.status.state === 'completed' || getJson.result.status.state === 'failed') {
                finalTaskState = getJson.result;
                break;
            }
        }

        // 5. Assert final state
        expect(finalTaskState).toBeDefined();
        expect(finalTaskState?.status.state).toEqual('completed');
        expect(finalTaskState?.artifacts).toBeArray();
        expect(finalTaskState?.artifacts?.length).toBe(1); 
        const finalArtifact = finalTaskState?.artifacts?.[0];
        expect(finalArtifact?.name).toEqual('received-input');
        const artifactPart = finalArtifact?.parts?.[0];
        expect(artifactPart?.type).toEqual('text');
        if (artifactPart?.type === 'text') {
            expect(artifactPart.text).toEqual(inputText);
        }
    });

    // --- Resubscribe Test (Strict Spec: No initial state on resubscribe) --- //
    it("should handle resubscribe during pause", async () => {
        const pauseDurationMs = 500;
        let taskId: string | null = null;
        const abortController = new AbortController(); // To close the first connection

        // 1. Start task with sendSubscribe
        const res1Promise = fetch(`${serverUrl}${rpcPath}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: "2.0", id: "pause-1", method: 'tasks/sendSubscribe', 
                params: {
                    message: { role: 'user', parts: [{ type: 'text', text: "Start pause test" }] },
                    metadata: { skillId: 'pauseTest' }
                }
            }),
            signal: abortController.signal 
        });
        const res1 = await res1Promise;
        expect(res1.status).toEqual(200);

        // 2. Read only the first event(s) (e.g., the initial 'working' status)
        // We still need the taskId from the first event(s)
        const initialEvents = await readSseEvents(res1, (event) => { 
            if (!taskId) taskId = event.id; 
            return !!taskId; // Stop as soon as we have the taskId
        });
        expect(initialEvents.length).toBeGreaterThanOrEqual(1);
        expect(initialEvents[0]?.status?.state).toEqual('working');
        expect(taskId).toBeString();
        console.log(`Resubscribe/Pause Test: Task ${taskId} started.`);

        // 3. Abort the first connection *before* pause finishes
        console.log(`Resubscribe/Pause Test: Aborting first connection...`);
        abortController.abort("Simulating client disconnect");

        // 4. Wait briefly for abort processing
        await Bun.sleep(50); 

        // 5. Resubscribe to the task
        console.log(`Resubscribe/Pause Test: Resubscribing to task ${taskId}...`);
        const res2 = await makeA2ARequest('tasks/resubscribe', { id: taskId! }, "pause-resub-2");
        expect(res2.status).toEqual(200);
        expect(res2.headers.get('Content-Type')).toEqual('text/event-stream');

        // 6. Read all events from the *second* stream until it closes.
        // We should ONLY receive events generated AFTER the pause.
        const secondStreamEvents = await readSseEvents(res2);

        // 7. Assert events received on the second stream
        console.log("Resubscribe/Pause Test: Events received on second stream:", JSON.stringify(secondStreamEvents));
        // Expect: working (resume), artifact, completed
        expect(secondStreamEvents.length).toBeGreaterThanOrEqual(3); 

        // Check *NO* initial status event was sent immediately on resubscribe
        // The first event should be the one generated *after* the pause
        expect(secondStreamEvents[0]?.status?.message?.parts?.[0]?.text).toEqual('Resuming after pause.');
        expect(secondStreamEvents[0]?.status?.state).toEqual('working');
        expect(secondStreamEvents[0]?.final).toBe(false); 

        // Check artifact was received
        const artifactEvent = secondStreamEvents.find(e => e.artifact?.name === 'pause-result');
        expect(artifactEvent).toBeDefined();
        expect(artifactEvent?.artifact?.parts?.[0]?.text).toEqual('Pause complete');

        // Check final event
        const lastEvent = secondStreamEvents[secondStreamEvents.length - 1];
        expect(lastEvent?.status?.state).toEqual('completed');
        expect(lastEvent?.final).toBe(true);

        // Optional: Verify final state in store via tasks/get if needed
        // const getRes = await makeA2ARequest('tasks/get', { id: taskId! });
        // const getJson = await getRes.json() as A2ATypes.JsonRpcSuccessResponse<A2ATypes.Task>;
        // expect(getJson.result.status.state).toEqual('completed');
    });
});


// a4a/test/a2a_core_v2.test.ts (New file)
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import type { Server } from 'bun';
import { EventEmitter } from 'node:events'; // Import EventEmitter
import { A2AServerCoreV2, A2AServerConfigV2 } from './core/A2AServerCoreV2'; // Adjust path
import { InMemoryTaskStore } from './store/InMemoryTaskStore'; // Adjust path
import { SseConnectionManager } from './core/SseConnectionManager'; // Adjust path
import { EchoProcessor, CounterProcessor, StreamingProcessor, CancelProcessor, InputRequiredProcessor } from '../samples/test-processors'; // Adjust path
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
    ]
};

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
             // Handle potential wrapping if core sends full JSON-RPC structure in data
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

/** Helper to read all events from an SSE stream */
async function readAllSseEvents(response: Response): Promise<any[]> {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const events: any[] = [];

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
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
                    }
                }
                eventBoundary = buffer.indexOf('\n\n');
            }
        }
    } finally {
        reader.releaseLock();
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
        new InputRequiredProcessor()
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

         const reader = res.body!.getReader();
         const decoder = new TextDecoder();
         let buffer = "";
         const events: any[] = [];

         try {
             while (true) {
                 const { done, value } = await reader.read();
                 if (done) break;
                 buffer += decoder.decode(value, { stream: true });

                 // Process buffer line by line (Handle potential multiple events per chunk)
                 let eventBoundary = buffer.indexOf('\n\n');
                 while (eventBoundary !== -1) {
                    const eventText = buffer.substring(0, eventBoundary);
                    buffer = buffer.substring(eventBoundary + 2);

                    const lines = eventText.split('\n');
                    for (const line of lines) {
                        if (line.trim() === '') continue;
                        const event = parseSseEvent(line);
                        if (event) {
                             // console.log("Received SSE Event:", JSON.stringify(event));
                             events.push(event);
                        }
                    }
                    eventBoundary = buffer.indexOf('\n\n');
                }
             }
             // Process any remaining buffer after stream closes (should be empty for valid SSE)
             // ... (optional handling for remaining buffer)

         } finally {
             reader.releaseLock();
         }

         // Assert the sequence of events
         expect(events.length).toBeGreaterThanOrEqual(5); 

         const statusUpdates = events.filter(e => e.status);
         const artifactUpdates = events.filter(e => e.artifact);

         // Check initial working state (might be the first or second event)
         expect(statusUpdates[0]?.status?.state).toEqual('working');

         // Check artifacts (allow for interleaved status updates)
         expect(artifactUpdates.length).toEqual(3);
         // Type guard before accessing .text
         expect(artifactUpdates.some(e => e.artifact?.parts?.[0]?.type === 'text' && e.artifact.parts[0].text === 'Part 1')).toBe(true);
         expect(artifactUpdates.some(e => e.artifact?.parts?.[0]?.type === 'text' && e.artifact.parts[0].text === 'Part 2')).toBe(true);
         expect(artifactUpdates.some(e => e.artifact?.parts?.[0]?.type === 'text' && e.artifact.parts[0].text === 'Part 3')).toBe(true);

         // Check final completed state
          const lastEvent = events[events.length - 1];
          expect(lastEvent?.status?.state).toEqual('completed');
          expect(lastEvent?.final).toBe(true);

         // Verify task is completed in store
         const taskId = events[0]?.id;
         expect(taskId).toBeString(); // Ensure we got an ID
         if (taskId) {
             const getRes = await makeA2ARequest('tasks/get', { id: taskId });
             // Add type cast
             const getJson = await getRes.json() as A2ATypes.JsonRpcSuccessResponse<A2ATypes.Task>; 
             expect(getJson.result.status.state).toEqual('completed');
         }
     });

    // --- Test Case for Input Required (Corrected for stream closing) --- //
    it("should handle input-required via SSE", async () => {
        const initialText = "Start task requiring input";
        const inputText = "Here is the required input";
        let taskId: string | null = null;

        // 1. Start the task with sendSubscribe
        const res1 = await makeA2ARequest('tasks/sendSubscribe', {
            message: { role: 'user', parts: [{ type: 'text', text: initialText }] },
            metadata: { skillId: 'inputRequired' }
        }, "input-req-1");

        expect(res1.status).toEqual(200);
        expect(res1.headers.get('Content-Type')).toEqual('text/event-stream');

        const reader = res1.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        const initialEventsReceived: any[] = [];
        let receivedInputRequired = false;

        // 2. Read initial events until input-required (which is final) or stream closes
        try {
            while (!receivedInputRequired) {
                const { done, value } = await reader.read();
                if (done) {
                    console.log("SSE stream closed during initial read."); // Should close AFTER input-required
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
                            initialEventsReceived.push(event);
                            if (!taskId) taskId = event.id; // Capture taskId
                            if (event.status?.state === 'input-required') {
                                console.log("Received input-required event via SSE.");
                                expect(event.final).toBe(true); // Verify it's marked as final
                                receivedInputRequired = true;
                                // Break inner loop, outer loop condition will handle exit
                                break; 
                            }
                            // Optional: Check if somehow another final event came first
                            if (event.final === true) {
                                 console.warn("SSE stream sent a different final event before input-required.");
                                 receivedInputRequired = true; // Treat as finished for loop exit
                                 break;
                            }
                        }
                    }
                     if (receivedInputRequired) break; // Exit outer loop if inner loop found it
                    eventBoundary = buffer.indexOf('\n\n');
                }
            }
        } finally {
            // Release the lock regardless of how the loop exited
            reader.releaseLock(); 
            console.log("Released reader lock for initial SSE stream.");
        }
        
        // Assert that input-required was indeed received
        expect(receivedInputRequired).toBe(true);
        expect(taskId).toBeString();

        // Verify input-required state details from the received events
        const inputRequiredEvent = initialEventsReceived.find(e => e.status?.state === 'input-required');
        expect(inputRequiredEvent).toBeDefined();
        const promptPart = inputRequiredEvent.status?.message?.parts?.[0];
        expect(promptPart?.type).toEqual('text');
        if (promptPart?.type === 'text') {
            expect(promptPart.text).toContain('Please provide the required input');
        }

        // 3. Send the required input using tasks/send
        console.log(`Sending input '${inputText}' for task ${taskId}...`);
        const res2 = await makeA2ARequest('tasks/send', {
            id: taskId,
            message: { role: 'user', parts: [{ type: 'text', text: inputText }] }
        }, "input-req-2");
        expect(res2.status).toEqual(200); 

        // 4. Wait for processing triggered by tasks/send to complete
        // Since the SSE stream is closed, we poll the state via tasks/get
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

        // 5. Assert the final state fetched via tasks/get
        expect(finalTaskState).toBeDefined();
        expect(finalTaskState?.status.state).toEqual('completed');
        
        // Check the artifact created *after* input was processed
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

    // TODO: Add tests for tasks/resubscribe if needed (more complex setup)
});


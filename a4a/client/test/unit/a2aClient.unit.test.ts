// File: a4a/client/test/unit/a2aClient.unit.test.ts
import { describe, test, expect, jest, beforeEach, afterEach } from 'bun:test'; // Use bun:test imports
import { install, InstalledClock } from '@sinonjs/fake-timers'; // Import SinonJS fake timers
import {
    A2AClient,
    A2AClientConfig,
    ClientEventType,
    ClientManagedState,
    StatusUpdatePayload,
    ArtifactUpdatePayload,
    TaskUpdatePayload,
    ErrorPayload,
    ClosePayload,
    ClientCloseReason,
} from '../../src/A2AClient'; // Adjust path if needed
import * as A2ATypes from '../../src/types';
import { Task, TaskSendParams, Message, TaskState, TextPart } from '../../src/types';

// --- Test Utilities ---

// Store original fetch
const originalFetch = globalThis.fetch;
let mockFetchImplementation: ((input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) | null = null;

// Helper to mock fetch for a test
const mockFetch = (implementation: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) => {
    mockFetchImplementation = implementation;
    // Use jest.fn() provided by bun test, cast to bypass strict type check for properties like 'preconnect'
    globalThis.fetch = jest.fn(async (input, init) => {
        if (mockFetchImplementation) {
            return mockFetchImplementation(input, init);
        }
        throw new Error(`fetch mock not provided for ${input.toString()}`);
    }) as any as typeof fetch; // Cast to satisfy the type requirement
};

// Restore fetch after each test
const restoreFetch = () => {
    globalThis.fetch = originalFetch;
    mockFetchImplementation = null;
};

// Helper to create ReadableStream from strings (for SSE)
function createReadableStream(...chunks: string[]): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();
    let chunkIndex = 0;
    return new ReadableStream({
        pull(controller) {
            if (chunkIndex < chunks.length) {
                controller.enqueue(encoder.encode(chunks[chunkIndex]));
                chunkIndex++;
            } else {
                controller.close();
            }
        },
    });
}

// Helper to wait for a specific event with a timeout
function waitForEvent<T = unknown>(client: A2AClient, eventName: ClientEventType, timeout = 1000): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            client.off(eventName, listener);
            console.log(`[waitForEvent TIMEOUT] Event: ${eventName}, Timeout: ${timeout}ms, Final State: ${client.getCurrentState()}`);
            reject(new Error(`Timeout waiting for event "${eventName}" after ${timeout}ms. Client state: ${client.getCurrentState()}`));
        }, timeout);

        const listener = (payload: T) => {
            clearTimeout(timer);
            client.off(eventName, listener);
            console.log(`[waitForEvent RESOLVED] Event: ${eventName}, Payload:`, payload);
            resolve(payload);
        };

        client.on(eventName, listener as (...args: any[]) => void);
    });
}

// Helper to wait for client state
async function waitForClientState(
    client: A2AClient,
    conditionFn: (state: ClientManagedState) => boolean,
    errorMessage = 'Client state condition not met',
    timeout = 1000
): Promise<ClientManagedState> {
    return new Promise((resolve, reject) => {
        let checkInterval: any;
        const checkTimeout = setTimeout(() => {
            clearInterval(checkInterval);
            console.log(`[waitForClientState TIMEOUT] Condition: ${conditionFn.toString()}, Timeout: ${timeout}ms, Final State: ${client?.getCurrentState()}`);
            reject(new Error(`${errorMessage} within ${timeout}ms. Final state: ${client?.getCurrentState()}`));
        }, timeout);

        const checkState = () => {
            const currentState = client?.getCurrentState();
            console.log(`[waitForClientState CHECKING] Current State: ${currentState}, Condition: ${conditionFn.toString()}`); // Log state checks
            if (client && conditionFn(currentState)) {
                clearTimeout(checkTimeout);
                clearInterval(checkInterval);
                console.log(`[waitForClientState RESOLVED] Condition Met. Final State: ${currentState}`);
                resolve(currentState);
            } else if (currentState === 'error' || currentState === 'closed') {
                clearTimeout(checkTimeout);
                clearInterval(checkInterval);
                 // If terminal state doesn't meet condition, reject
                 if (!conditionFn(currentState)) {
                     console.log(`[waitForClientState REJECTED] Terminal state ${currentState} did not meet condition.`);
                     reject(new Error(`Client entered terminal state ${currentState} while waiting for condition. ${errorMessage}`));
                 } else {
                     console.log(`[waitForClientState RESOLVED] Terminal state ${currentState} met condition.`);
                     resolve(currentState); // Terminal state met the condition
                 }
            }
        };

        checkState(); // Check immediately
        checkInterval = setInterval(checkState, 50); // Check frequently
    });
}


// --- Test Suite Setup ---
const TEST_AGENT_URL = 'http://test-agent.com/a2a';
const TEST_CARD_URL = 'http://test-agent.com/.well-known/agent.json';
const BASE_CONFIG: Partial<A2AClientConfig> = {
    getAuthHeaders: async () => ({ Authorization: 'Bearer test-token' }),
    pollIntervalMs: 100, // Fast polling for tests
    sseInitialReconnectDelayMs: 50,
    sseMaxReconnectDelayMs: 200,
};

// Global clock variable for SinonJS timers
let clock: InstalledClock;

describe('A2AClient (Unit Tests with Mock Fetch)', () => {

    beforeEach(() => {
        // Reset mocks before each test
        // Use SinonJS fake timers
        clock = install();
    });

    afterEach(() => {
        restoreFetch();
        // Use SinonJS fake timers
        clock.uninstall();
    });

    // --- Fixtures ---

    const createAgentCardFixture = (supportsSse = true): A2ATypes.AgentCard => ({
        name: 'Test Agent',
        description: 'Agent for testing',
        url: TEST_AGENT_URL,
        version: '1.0',
        authentication: { schemes: ['Bearer'] },
        capabilities: { streaming: supportsSse, pushNotifications: false, stateTransitionHistory: false },
        defaultInputModes: ['text/plain'],
        defaultOutputModes: ['text/plain'],
        skills: [{ id: 'test-skill', name: 'Test Skill', description: 'Does testing', tags: ['test'] }]
    });

    const createJsonRpcResponse = <TResult>(id: string | number, result: TResult): object => ({
        jsonrpc: '2.0',
        id,
        result,
    });
     const createJsonRpcErrorResponse = (id: string | number, code: number, message: string): object => ({
        jsonrpc: '2.0',
        id,
        error: { code, message },
    });

    const createTaskFixture = (id: string, state: TaskState = 'working', artifacts: A2ATypes.Artifact[] = [], message?: A2ATypes.Message): Task => ({
        id,
        sessionId: `session-${id}`,
        status: { state, timestamp: new Date().toISOString(), message },
        history: [], // History not usually returned unless requested
        artifacts,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });

     const createSseEvent = (eventType: string, result: any): string => {
         const data = JSON.stringify({ jsonrpc: '2.0', id: 'sse-event', result }); // Using a fixed ID for SSE events for simplicity
         return `event: ${eventType}\ndata: ${data}\n\n`;
     };

    // --- Basic Creation Tests ---

    test('should create client, fetch agent card, and determine strategy (SSE)', async () => {
        const agentCard = createAgentCardFixture(true);
        mockFetch(async (input) => {
            if (input.toString() === TEST_CARD_URL) {
                return new Response(JSON.stringify(agentCard), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }
            // Initial SSE connect will happen - let it timeout or fail for this test
            return new Response(null, { status: 404 });
        });

        const initialParams: TaskSendParams = { message: { role: 'user', parts: [] } };
        const client = await A2AClient.create(TEST_AGENT_URL, initialParams, BASE_CONFIG);

        expect(client).toBeDefined();
        expect(client.taskId).toBeDefined();
        expect(globalThis.fetch).toHaveBeenCalledWith(TEST_CARD_URL, expect.anything());

        // Allow time for async initialization (card fetch + first connect attempt)
        // Use SinonJS timer control
        await clock.nextAsync(); // Advance past any initial delays

        // It should attempt SSE connection
        expect((client as any)._strategy).toBe('sse');
        // State depends on how the initial connect fails, likely connecting-sse or reconnecting-sse
        expect(['connecting-sse', 'reconnecting-sse', 'error']).toContain(client.getCurrentState());

        client.close();
    });

     test('should create client, fetch agent card, and determine strategy (Poll)', async () => {
        const agentCard = createAgentCardFixture(false); // No SSE support
        mockFetch(async (input, init) => {
            console.log(`[Mock Fetch Poll Test] URL: ${input.toString()}, Method: ${init?.method}`); // DEBUG
            const url = input.toString();
            if (url === TEST_CARD_URL) {
                return new Response(JSON.stringify(agentCard), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }
             // Initial poll 'send' will happen OR subsequent 'get'
             if (url === TEST_AGENT_URL && init?.method === 'POST') {
                 const body = JSON.parse(init.body as string);
                 if (body.method === 'tasks/send') {
                     console.log(`[Mock Fetch Poll Test] Handling tasks/send`); // DEBUG
                      const task = createTaskFixture(body.params.id, 'working');
                      return new Response(JSON.stringify(createJsonRpcResponse(body.id, task)), { status: 200, headers: { 'Content-Type': 'application/json' } });
                 }
                 // ADDED: Handle tasks/get for subsequent polls in this test
                 if (body.method === 'tasks/get') {
                     console.log(`[Mock Fetch Poll Test] Handling tasks/get`); // DEBUG
                     const task = createTaskFixture(body.params.id, 'working'); // Keep it working
                     return new Response(JSON.stringify(createJsonRpcResponse(body.id, task)), { status: 200, headers: { 'Content-Type': 'application/json' } });
                 }
             }
            console.log(`[Mock Fetch Poll Test] No match, returning 404`); // DEBUG
            return new Response(null, { status: 404 });
        });

        const initialParams: TaskSendParams = { message: { role: 'user', parts: [] } };
        const client = await A2AClient.create(TEST_AGENT_URL, initialParams, { ...BASE_CONFIG, forcePoll: false });

        expect(client).toBeDefined();
        expect(client.taskId).toBeDefined();
        expect(globalThis.fetch).toHaveBeenCalledWith(TEST_CARD_URL, expect.anything());

        // Allow time for async initialization (card fetch + first send)
        await clock.nextAsync(); // Allow create/send to complete

        expect((client as any)._strategy).toBe('poll');
         // Should have moved to polling state after initial send
        expect(client.getCurrentState()).toBe('polling'); // Assert state after allowing init

        client.close();
    });

     test('should handle agent card fetch failure', async () => {
         mockFetch(async (input) => {
             if (input.toString() === TEST_CARD_URL) {
                 return new Response('Not Found', { status: 404 });
             }
             return new Response(null, { status: 404 });
         });

         const initialParams: TaskSendParams = { message: { role: 'user', parts: [] } };
         const client = await A2AClient.create(TEST_AGENT_URL, initialParams, BASE_CONFIG);

         // Attach listeners BEFORE the async operation completes
         const errorPromise = waitForEvent<ErrorPayload>(client, 'error');
         const closePromise = waitForEvent<ClosePayload>(client, 'close');

         // Now wait for the events
         const errorPayload = await errorPromise;
         expect(errorPayload.context).toBe('agent-card-fetch');
         expect(errorPayload.error.message).toContain('404');

         const closePayload = await closePromise;
         expect(closePayload.reason).toBe('error-fatal');
         expect(client.getCurrentState()).toBe('error');
     });

    // --- Polling Tests ---
    describe('Polling Strategy Tests', () => {

        const pollAgentCard = createAgentCardFixture(false);

         test('should complete task via polling', async () => {
             const taskId = 'poll-complete-task';
             let pollCount = 0;
             const finalTask = createTaskFixture(taskId, 'completed', [{ index: 0, name: 'result', parts: [{ type: 'text', text: 'Poll Done' }] }]);
             const workingTask1 = createTaskFixture(taskId, 'working', [{ index: 0, name: 'result', parts: [{ type: 'text', text: 'Step 1...' }] }]);
             const workingTask2 = createTaskFixture(taskId, 'working', [{ index: 0, name: 'result', parts: [{ type: 'text', text: 'Step 1... Step 2...' }] }]); // Append text

             mockFetch(async (input, init) => {
                 const url = input.toString();
                 const body = init?.body ? JSON.parse(init.body as string) : null;
                 console.log(`[Mock Fetch Poll Test] URL: ${url}, Body: ${JSON.stringify(body)}`);

                 if (url === TEST_CARD_URL) return new Response(JSON.stringify(pollAgentCard));
                 if (url === TEST_AGENT_URL) {
                     if (body?.method === 'tasks/send') {
                         return new Response(JSON.stringify(createJsonRpcResponse(body.id, createTaskFixture(taskId, 'working'))));
                     }
                     if (body?.method === 'tasks/get') {
                         pollCount++;
                         let taskToReturn: Task;
                         if (pollCount === 1) {
                             taskToReturn = workingTask1;
                         } else if (pollCount === 2) {
                             taskToReturn = workingTask2;
                         } else {
                             taskToReturn = finalTask;
                         }
                         console.log(`[Mock Fetch Poll Test] Poll count: ${pollCount}, Returning state: ${taskToReturn.status.state}`);
                         return new Response(JSON.stringify(createJsonRpcResponse(body.id, taskToReturn)));
                     }
                 }
                 return new Response(null, { status: 404 });
             });

             const initialParams: TaskSendParams = { id: taskId, message: { role: 'user', parts: [{ type: 'text', text: 'poll test' }] } };
             const client = await A2AClient.create(TEST_AGENT_URL, initialParams, BASE_CONFIG);

             // Collect events - Attach listeners EARLY
             const updates: any[] = [];
             client.on('status-update', (p) => updates.push({ type: 'status', ...p }));
             client.on('artifact-update', (p) => updates.push({ type: 'artifact', ...p }));
             client.on('task-update', (p) => updates.push({ type: 'task', ...p }));

             console.log("[TEST] Letting client run its polling cycle...");

             // Let all timers run until completion
             await clock.runAllAsync();
             console.log("[TEST] Client run complete.");

             // Now check the final state directly
             // Since we've advanced the clock enough times and processed microtasks,
             // the client should have transitioned to the closed state.
             expect(client.getCurrentState()).toBe('closed');
             
             const finalPolledTask = client.getCurrentTask();
             expect(finalPolledTask?.status.state).toBe('completed');
             const finalPolledArtifactPart = finalPolledTask?.artifacts?.[0]?.parts?.[0];
             expect(finalPolledArtifactPart?.type === 'text' ? finalPolledArtifactPart.text : undefined).toBe('Poll Done');

             // Verify events emitted
             expect(updates.some(u => u.type === 'status' && u.status.state === 'working')).toBe(true);
             expect(updates.some(u => u.type === 'status' && u.status.state === 'completed')).toBe(true);
             // Check specific artifact updates based on diffs
             const artifactUpdates = updates.filter(u => u.type === 'artifact');
             expect(artifactUpdates.length).toBe(3); // workingTask1, workingTask2, finalTask
             expect(artifactUpdates[0].artifact.parts[0].text).toBe('Step 1...');
             expect(artifactUpdates[1].artifact.parts[0].text).toBe('Step 1... Step 2...');
             expect(artifactUpdates[2].artifact.parts[0].text).toBe('Poll Done');

             // Check task updates
             const taskUpdates = updates.filter(u => u.type === 'task');
             expect(taskUpdates.length).toBeGreaterThanOrEqual(3); // Initial send + poll1 + poll2 + final poll
             expect(updates[updates.length - 1].type).toBe('task'); // Last event should be task update
             expect(updates[updates.length - 1].task.status.state).toBe('completed');
             expect((updates[updates.length - 1].task.artifacts?.[0]?.parts?.[0] as A2ATypes.TextPart)?.text).toBe('Poll Done');
         });

         test('should handle input-required and resume via polling', async () => {
            const taskId = 'poll-input-task';
            let state: TaskState = 'working';
            let pollGetCount = 0;
            const promptMessage: Message = { role: 'agent', parts: [{ type: 'text', text: 'Need topic' }] };
            const finalArtifact: A2ATypes.Artifact = { index: 0, name: 'result', parts: [{ type: 'text', text: 'Joke about input' }]};

            mockFetch(async (input, init) => {
                 const url = input.toString();
                 const body = init?.body ? JSON.parse(init.body as string) : null;

                 if (url === TEST_CARD_URL) return new Response(JSON.stringify(pollAgentCard));
                 if (url === TEST_AGENT_URL) {
                     if (body?.method === 'tasks/send') {
                         // Initial send OR send after input
                         if (state === 'working') { // Initial create
                             state = 'input-required'; // Move to input required after first send
                             return new Response(JSON.stringify(createJsonRpcResponse(body.id, createTaskFixture(taskId, state, [], promptMessage))));
                         } else if (state === 'input-required') { // Sending the input
                             state = 'completed'; // Assume it completes after input
                             return new Response(JSON.stringify(createJsonRpcResponse(body.id, createTaskFixture(taskId, state, [finalArtifact]))));
                         }
                     }
                     if (body?.method === 'tasks/get') {
                         pollGetCount++;
                         // Return current state during polling before input is provided
                         return new Response(JSON.stringify(createJsonRpcResponse(body.id, createTaskFixture(taskId, state, [], state === 'input-required' ? promptMessage : undefined))));
                     }
                 }
                 return new Response(null, { status: 404 });
             });

            const initialParams: TaskSendParams = { id: taskId, message: { role: 'user', parts: [{ type: 'text', text: 'input poll test' }] } };
            const client = await A2AClient.create(TEST_AGENT_URL, initialParams, BASE_CONFIG);

            // Allow initialization to complete
            await clock.nextAsync();
            expect(client.getCurrentState()).toBe('input-required');
            // Type guard before accessing .text
            const promptPart = client.getCurrentTask()?.status.message?.parts[0];
            expect(promptPart?.type === 'text' ? promptPart.text : undefined).toBe('Need topic');

            // Send input
            const inputMessage: Message = { role: 'user', parts: [{ type: 'text', text: 'the topic' }] };

            // Start listening for close BEFORE sending
            const closePromiseInput = waitForEvent<ClosePayload>(client, 'close', 5000);

            await client.send(inputMessage); // This restarts polling internally

            // Allow the promise chain within send() and the subsequent event emission to run
            await clock.nextAsync();

            // Add extra tick for event listener
            await clock.nextAsync(); // Second tick needed for event listener

            const closePayload = await closePromiseInput; // Now wait

            expect(closePayload.reason).toBe('task-completed');
            expect(client.getCurrentState()).toBe('closed');
            expect(client.getCurrentTask()?.status.state).toBe('completed');
            // Type guard before accessing .text
            const finalArtifactPartInput = client.getCurrentTask()?.artifacts?.[0]?.parts?.[0];
            expect(finalArtifactPartInput?.type === 'text' ? finalArtifactPartInput.text : undefined).toBe('Joke about input');
        });

         test('should handle poll errors and retry', async () => {
             const taskId = 'poll-retry-task';
             let pollCount = 0;

             mockFetch(async (input, init) => {
                 const url = input.toString();
                 const body = init?.body ? JSON.parse(init.body as string) : null;

                 if (url === TEST_CARD_URL) return new Response(JSON.stringify(pollAgentCard));
                 if (url === TEST_AGENT_URL) {
                     if (body?.method === 'tasks/send') {
                         return new Response(JSON.stringify(createJsonRpcResponse(body.id, createTaskFixture(taskId, 'working'))));
                     }
                     if (body?.method === 'tasks/get') {
                         pollCount++;
                         if (pollCount === 1) { // Fail first poll
                             return new Response('Server Error', { status: 500 });
                         } else { // Succeed second poll
                             return new Response(JSON.stringify(createJsonRpcResponse(body.id, createTaskFixture(taskId, 'completed', [{index: 0, parts: [{type: 'text', text: 'Retry ok'}]}]))));
                         }
                     }
                 }
                 return new Response(null, { status: 404 });
             });

             const initialParams: TaskSendParams = { id: taskId, message: { role: 'user', parts: [] } };
             const client = await A2AClient.create(TEST_AGENT_URL, initialParams, BASE_CONFIG);

             // Attach listeners early
             const errors: ErrorPayload[] = [];
             client.on('error', (p) => errors.push(p));
             const closePromiseRetry = waitForEvent<ClosePayload>(client, 'close', 2000);

             console.log("[TEST] Running all timers for poll retry test...");
             await clock.runAllAsync();
             console.log("[TEST] All timers run for poll retry test.");

             // Assert that an error occurred
             expect(errors.length).toBe(1);
             const errorPayload = errors[0];
             expect(errorPayload.context).toBe('poll-get');

             // Assert final state is closed (task completed on retry)
             expect(client.getCurrentState()).toBe('closed');

             // Wait for completion close after retry
             const closePayload = await closePromiseRetry; // Wait for the close
             console.log("Received close event");

             expect(closePayload.reason).toBe('task-completed');
         });

         test('should fail polling after max retries', async () => {
             const taskId = 'poll-fail-task';
             let pollCount = 0;

             mockFetch(async (input, init) => {
                 const url = input.toString();
                 const body = init?.body ? JSON.parse(init.body as string) : null;

                 if (url === TEST_CARD_URL) return new Response(JSON.stringify(pollAgentCard));
                 if (url === TEST_AGENT_URL) {
                     if (body?.method === 'tasks/send') {
                         return new Response(JSON.stringify(createJsonRpcResponse(body.id, createTaskFixture(taskId, 'working'))));
                     }
                     if (body?.method === 'tasks/get') {
                         pollCount++;
                         console.log(`Mock Fetch: tasks/get attempt ${pollCount}`);
                         return new Response('Server Error Always', { status: 500 }); // Always fail
                     }
                 }
                 return new Response(null, { status: 404 });
             });

             const initialParams: TaskSendParams = { id: taskId, message: { role: 'user', parts: [] } };
             const client = await A2AClient.create(TEST_AGENT_URL, initialParams, { ...BASE_CONFIG, pollMaxErrorAttempts: 2 }); // Lower retry limit

             // Attach listeners early
             const errors: ErrorPayload[] = [];
             client.on('error', (p) => errors.push(p));
             const closePromiseFail = waitForEvent<ClosePayload>(client, 'close', 1500);

             console.log("[TEST] Running all timers for poll fail test...");
             await clock.runAllAsync();
             console.log("[TEST] All timers run for poll fail test.");

             // Allow final error/close events to process
             const closePayload = await closePromiseFail;
             
             // Assert errors occurred
             expect(errors.length).toBe(3); // poll-get, poll-get, poll-retry-failed
             expect(errors[0].context).toBe('poll-get');
             expect(errors[1].context).toBe('poll-get');
             expect(errors[2].context).toBe('poll-retry-failed');
             
             expect(closePayload.reason).toBe('poll-retry-failed');
             expect(client.getCurrentState()).toBe('error'); // Final state is error
         });

         // Add tests for resume (polling), cancel (polling) similarly...

    });

    // --- SSE Tests ---
    describe('SSE Strategy Tests', () => {
         const sseAgentCard = createAgentCardFixture(true);

         test('should complete task via SSE', async () => {
            const taskId = 'sse-complete-task';
            const finalTask = createTaskFixture(taskId, 'completed', [{ index: 0, name: 'result', parts: [{ type: 'text', text: 'SSE Done' }] }]);

            const artifactChunk1: Partial<A2ATypes.Artifact> = { index: 0, name: 'result', parts: [{ type: 'text', text: 'SSE part 1...' }], append: false, lastChunk: false };
            const artifactChunk2: Partial<A2ATypes.Artifact> = { index: 0, parts: [{ type: 'text', text: 'part 2... ' }], append: true, lastChunk: false }; // Append
            const artifactChunk3: Partial<A2ATypes.Artifact> = { index: 0, parts: [{ type: 'text', text: 'part 3 FINAL.' }], append: true, lastChunk: true }; // Append + final

            const sseStream = createReadableStream(
                createSseEvent('TaskStatusUpdate', { status: { state: 'working' }, final: false }),
                createSseEvent('TaskArtifactUpdate', { artifact: artifactChunk1 }),
                createSseEvent('TaskArtifactUpdate', { artifact: artifactChunk2 }),
                createSseEvent('TaskArtifactUpdate', { artifact: artifactChunk3 }),
                createSseEvent('TaskStatusUpdate', { status: { state: 'completed' }, final: true })
            );

            mockFetch(async (input, init) => {
                 const url = input.toString();
                 const body = init?.body ? JSON.parse(init.body as string) : null;

                 if (url === TEST_CARD_URL) return new Response(JSON.stringify(sseAgentCard));
                 if (url === TEST_AGENT_URL && body?.method === 'tasks/sendSubscribe') {
                     return new Response(sseStream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
                 }
                 return new Response(null, { status: 404 });
             });

            const initialParams: TaskSendParams = { id: taskId, message: { role: 'user', parts: [{ type: 'text', text: 'sse test' }] } };
            const client = await A2AClient.create(TEST_AGENT_URL, initialParams, BASE_CONFIG);

            // Collect events
            const updates: any[] = [];
            client.on('status-update', (p) => updates.push({ type: 'status', ...p }));
            client.on('artifact-update', (p) => updates.push({ type: 'artifact', ...p }));
            client.on('task-update', (p) => updates.push({ type: 'task', ...p }));
            const closePromiseSSE = waitForEvent<ClosePayload>(client, 'close', 2000);

            // Give time for async init AND try flushing timer queue
            await clock.nextAsync(); // Allow create()/stream processing to start
            const closePayload = await closePromiseSSE;
            console.log(`[TEST] Received close event: ${closePayload.reason}`, closePayload);

            expect(closePayload.reason).toBe('task-completed');
            expect(client.getCurrentState()).toBe('closed');
            const currentTask = client.getCurrentTask();
            expect(currentTask?.status.state).toBe('completed');
            expect(currentTask?.artifacts?.length).toBe(1);
            expect(currentTask?.artifacts?.[0]?.name).toBe('result');
            expect(currentTask?.artifacts?.[0]?.index).toBe(0);
            expect(currentTask?.artifacts?.[0]?.parts?.length).toBe(3); // All parts accumulated
            // Type guard before accessing .text
            const ssePart1 = currentTask?.artifacts?.[0]?.parts?.[0];
            const ssePart2 = currentTask?.artifacts?.[0]?.parts?.[1];
            const ssePart3 = currentTask?.artifacts?.[0]?.parts?.[2];
            expect(ssePart1?.type === 'text' ? ssePart1.text : undefined).toBe('SSE part 1...');
            expect(ssePart2?.type === 'text' ? ssePart2.text : undefined).toBe('part 2... ');
            expect(ssePart3?.type === 'text' ? ssePart3.text : undefined).toBe('part 3 FINAL.');

            // Verify events emitted match synthesized state
            expect(updates.some(u => u.type === 'status' && u.status.state === 'working')).toBe(true);
            expect(updates.some(u => u.type === 'status' && u.status.state === 'completed')).toBe(true);
            expect(updates.some(u => u.type === 'artifact' && u.artifact.name === 'result')).toBe(true);
            expect(updates.filter(u => u.type === 'task').length).toBeGreaterThanOrEqual(2); // working + completed
             // Last task update should reflect the final state
             const lastTaskUpdate = updates.filter(u => u.type === 'task').pop();
             expect(lastTaskUpdate.task.status.state).toBe('completed');
             // Type guard before accessing .text
             const lastUpdatePart1 = lastTaskUpdate?.task?.artifacts?.[0]?.parts?.[0];
             const lastUpdatePart2 = lastTaskUpdate?.task?.artifacts?.[0]?.parts?.[1];
             const lastUpdatePart3 = lastTaskUpdate?.task?.artifacts?.[0]?.parts?.[2];
             expect(lastUpdatePart1?.type === 'text' ? lastUpdatePart1.text : undefined).toBe('SSE part 1...');
             expect(lastUpdatePart2?.type === 'text' ? lastUpdatePart2.text : undefined).toBe('part 2... ');
             expect(lastUpdatePart3?.type === 'text' ? lastUpdatePart3.text : undefined).toBe('part 3 FINAL.');
         });

          test('should handle SSE connection error and reconnect', async () => {
            const taskId = 'sse-reconnect-task';
            let connectAttempt = 0;

             const finalStream = createReadableStream(
                 createSseEvent('TaskStatusUpdate', { status: { state: 'completed' }, final: true })
             );

            mockFetch(async (input, init) => {
                 const url = input.toString();
                 const body = init?.body ? JSON.parse(init.body as string) : null;

                 if (url === TEST_CARD_URL) return new Response(JSON.stringify(sseAgentCard));
                 if (url === TEST_AGENT_URL && (body?.method === 'tasks/sendSubscribe' || body?.method === 'tasks/resubscribe')) {
                     connectAttempt++;
                     console.log(`Mock Fetch: SSE connect attempt ${connectAttempt}`);
                     if (connectAttempt === 1) {
                         // Fail first attempt
                         return new Response('Gateway Timeout', { status: 504 });
                     } else {
                         // Succeed second attempt (resubscribe)
                         expect(body.method).toBe('tasks/resubscribe'); // Ensure it's using resubscribe
                         return new Response(finalStream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
                     }
                 }
                 return new Response(null, { status: 404 });
             });

            const initialParams: TaskSendParams = { id: taskId, message: { role: 'user', parts: [] } };
            const client = await A2AClient.create(TEST_AGENT_URL, initialParams, BASE_CONFIG);

             // Attach listeners early
             const errorPromiseSSEConnect = waitForEvent<ErrorPayload>(client, 'error', 500);
             const closePromiseSSEReconnect = waitForEvent<ClosePayload>(client, 'close', 2000);

             // Let create() fail and emit the first error
             // await clock.nextAsync(); // Might not be needed if create promise resolves after error

             let errorPayload = await errorPromiseSSEConnect;
             expect(errorPayload.context).toBe('sse-connect');
             expect(client.getCurrentState()).toBe('reconnecting-sse'); // Should be trying to reconnect

             // Advance clock to trigger the reconnect timer
             await clock.tickAsync(BASE_CONFIG.sseInitialReconnectDelayMs! + 10);

             // Wait for successful close after reconnect
             const closePayload = await closePromiseSSEReconnect;

             expect(closePayload.reason).toBe('task-completed');
             expect(client.getCurrentState()).toBe('closed');
             expect(connectAttempt).toBe(2); // Ensure reconnect happened
        });

         test('should fail SSE after max reconnect attempts', async () => {
             const taskId = 'sse-fail-reconnect-task';
             let connectAttempt = 0;

             mockFetch(async (input, init) => {
                 const url = input.toString();
                 const body = init?.body ? JSON.parse(init.body as string) : null;

                 if (url === TEST_CARD_URL) return new Response(JSON.stringify(sseAgentCard));
                 if (url === TEST_AGENT_URL && (body?.method === 'tasks/sendSubscribe' || body?.method === 'tasks/resubscribe')) {
                     connectAttempt++;
                     console.log(`Mock Fetch: SSE connect attempt ${connectAttempt} (failing)`);
                     return new Response('Gateway Timeout Always', { status: 504 }); // Always fail
                 }
                 return new Response(null, { status: 404 });
             });

             const initialParams: TaskSendParams = { id: taskId, message: { role: 'user', parts: [] } };
             // Lower reconnect attempts for test
             const client = await A2AClient.create(TEST_AGENT_URL, initialParams, { ...BASE_CONFIG, sseMaxReconnectAttempts: 1 });

             // 1. Listen for the first error
             const firstErrorPromise = waitForEvent<ErrorPayload>(client, 'error', 500); // Short timeout

             // 2. Await the first error (allow initialization and first connect failure)
             const firstErrorPayload = await firstErrorPromise;

             // 3. Assert intermediate state
             expect(firstErrorPayload.context).toBe('sse-connect');
             expect(client.getCurrentState()).toBe('reconnecting-sse');

             // 4. Listen for final events AFTER the first error
             const closePromiseSSEFail = waitForEvent<ClosePayload>(client, 'close', 1500);

             // 5. Advance time (trigger reconnect attempt + failure)
             await clock.tickAsync(BASE_CONFIG.pollIntervalMs! + 10);

             // 6. Await final events
             const closePayload = await closePromiseSSEFail;

             // 7. Assert final state
             expect(closePayload.reason).toBe('sse-reconnect-failed');
             expect(client.getCurrentState()).toBe('error');
             expect(connectAttempt).toBe(2); // Initial attempt + 1 reconnect attempt
         });

         // Add tests for resume (SSE), cancel (SSE), input-required (SSE) similarly...
    });


    // --- General Tests (Cancel, Send Errors) ---

     test('should cancel task successfully while polling', async () => {
        const taskId = 'cancel-poll-task';
        const agentCard = createAgentCardFixture(false); // Use polling

        mockFetch(async (input, init) => {
            const url = input.toString();
            const body = init?.body ? JSON.parse(init.body as string) : null;
            if (url === TEST_CARD_URL) return new Response(JSON.stringify(agentCard));
            if (url === TEST_AGENT_URL) {
                 if (body?.method === 'tasks/send') { // Initial create
                     return new Response(JSON.stringify(createJsonRpcResponse(body.id, createTaskFixture(taskId, 'working'))));
                 }
                 if (body?.method === 'tasks/get') { // Polling - keep working
                     return new Response(JSON.stringify(createJsonRpcResponse(body.id, createTaskFixture(taskId, 'working'))));
                 }
                 if (body?.method === 'tasks/cancel') { // Cancel request
                     return new Response(JSON.stringify(createJsonRpcResponse(body.id, createTaskFixture(taskId, 'canceled'))));
                 }
            }
            return new Response(null, { status: 404 });
        });

        const initialParams: TaskSendParams = { id: taskId, message: { role: 'user', parts: [] } };
        const client = await A2AClient.create(TEST_AGENT_URL, initialParams, BASE_CONFIG);

        await clock.nextAsync();

        // Listen for close event before canceling
        const closePromise = waitForEvent<ClosePayload>(client, 'close');

        await client.cancel();

        const closePayload = await closePromise;
        expect(closePayload.reason).toBe('task-canceled-by-client');
        expect(client.getCurrentState()).toBe('closed');
        expect(client.getCurrentTask()?.status.state).toBe('canceled');
    });

     test('should throw error when sending message in terminal state', async () => {
         const taskId = 'send-terminal-task';
         const agentCard = createAgentCardFixture(false);
         mockFetch(async (input, init) => {
             const url = input.toString();
             const body = init?.body ? JSON.parse(init.body as string) : null;
             if (url === TEST_CARD_URL) return new Response(JSON.stringify(agentCard));
              if (url === TEST_AGENT_URL && body?.method === 'tasks/send') {
                  // Complete immediately
                  return new Response(JSON.stringify(createJsonRpcResponse(body.id, createTaskFixture(taskId, 'completed'))));
              }
             return new Response(null, { status: 404 });
         });

         const initialParams: TaskSendParams = { id: taskId, message: { role: 'user', parts: [] } };
         const client = await A2AClient.create(TEST_AGENT_URL, initialParams, BASE_CONFIG);

         // Wait for client to close
         console.log("[TEST] Running all timers for send terminal test...");
         await clock.runAllAsync();
         console.log("[TEST] All timers run for send terminal test.");

         // Ensure client is closed as expected by the mock
         expect(client.getCurrentState()).toBe('closed');

         const inputMessage: Message = { role: 'user', parts: [{ type: 'text', text: 'too late' }] };
         await expect(client.send(inputMessage)).rejects.toThrow(`Cannot send message in state: closed`);
     });

     // --- Resume Tests --- 

     test('should resume an input-required task via polling and complete', async () => {
        const taskId = 'resume-input-task';
        const agentCard = createAgentCardFixture(false); // Use polling
        const promptMessage: Message = { role: 'agent', parts: [{ type: 'text', text: 'Need resume topic' }] };
        const finalArtifact: A2ATypes.Artifact = { index: 0, name: 'result', parts: [{ type: 'text', text: 'Joke about resumed topic' }]};
        let currentState: TaskState = 'working';
        let fetchCount = 0;

        mockFetch(async (input, init) => {
            fetchCount++;
            const url = input.toString();
            const body = init?.body ? JSON.parse(init.body as string) : null;
            console.log(`[Mock Fetch Resume Test #${fetchCount}] URL: ${url}, Method: ${init?.method}, State: ${currentState}, Body: ${JSON.stringify(body)}`);

            if (url === TEST_CARD_URL) return new Response(JSON.stringify(agentCard));
            if (url === TEST_AGENT_URL) {
                // Phase 1: Initial create/poll to input-required
                if (body?.method === 'tasks/send' && currentState === 'working') { // Initial create
                    currentState = 'input-required';
                    console.log(` -> State change: ${currentState}`);
                    return new Response(JSON.stringify(createJsonRpcResponse(body.id, createTaskFixture(taskId, currentState, [], promptMessage))));
                }
                // Phase 2: Resume (uses tasks/get)
                if (body?.method === 'tasks/get' && currentState === 'input-required') {
                    // Return the input-required state for the resume poll
                    return new Response(JSON.stringify(createJsonRpcResponse(body.id, createTaskFixture(taskId, currentState, [], promptMessage))));
                }
                // Phase 3: Send input via resumed client
                if (body?.method === 'tasks/send' && currentState === 'input-required') {
                    currentState = 'completed'; // Completes after input
                     console.log(` -> State change: ${currentState}`);
                    return new Response(JSON.stringify(createJsonRpcResponse(body.id, createTaskFixture(taskId, currentState, [finalArtifact]))));
                }
                // Phase 3: Final polls after sending input
                if (body?.method === 'tasks/get' && currentState === 'completed') {
                     return new Response(JSON.stringify(createJsonRpcResponse(body.id, createTaskFixture(taskId, currentState, [finalArtifact]))));
                }
            }
            console.error(`[Mock Fetch Resume Test #${fetchCount}] Unhandled request!`);
            return new Response('Unhandled Mock Request', { status: 500 });
        });

        // --- Phase 1: Create and run to input-required --- 
        console.log("[Resume Test Phase 1] Creating initial client...");
        const initialParams: TaskSendParams = { id: taskId, message: { role: 'user', parts: [{ type: 'text', text: 'resume test initial' }] } };
        const client1 = await A2AClient.create(TEST_AGENT_URL, initialParams, BASE_CONFIG);

        // Let it run to input-required (should only involve the initial send)
        await clock.runAllAsync(); 
        expect(client1.getCurrentState()).toBe('input-required');
        const taskAfterPhase1 = client1.getCurrentTask();
        expect(taskAfterPhase1?.status.state).toBe('input-required');
        expect((taskAfterPhase1?.status.message?.parts?.[0] as TextPart)?.text).toBe('Need resume topic');

        console.log("[Resume Test Phase 1] Closing initial client...");
        client1.close();
        expect(client1.getCurrentState()).toBe('closed');

        // --- Phase 2: Resume the task --- 
        console.log("[Resume Test Phase 2] Resuming client...");
        const client2 = await A2AClient.resume(TEST_AGENT_URL, taskId, BASE_CONFIG);
        const resumeUpdates: any[] = [];
        client2.on('task-update', (p) => resumeUpdates.push({type:'task',...p}));

        // Let resume run its initial poll
        await clock.runAllAsync(); 
        expect(client2.getCurrentState()).toBe('input-required'); // Should be back to input-required
        const taskAfterResume = client2.getCurrentTask();
        expect(taskAfterResume?.status.state).toBe('input-required');
        expect((taskAfterResume?.status.message?.parts?.[0] as TextPart)?.text).toBe('Need resume topic');
        expect(resumeUpdates.length).toBeGreaterThanOrEqual(1); // Should get at least one update from resume poll

        // --- Phase 3: Provide input and complete --- 
        console.log("[Resume Test Phase 3] Sending input via resumed client...");
        const inputMessage: Message = { role: 'user', parts: [{ type: 'text', text: 'the resumed topic' }] };
        await client2.send(inputMessage);

        // Let the send and subsequent polling complete
        await clock.runAllAsync(); 

        console.log("[Resume Test Phase 3] Checking final state...");
        expect(client2.getCurrentState()).toBe('closed');
        const finalTask = client2.getCurrentTask();
        expect(finalTask?.status.state).toBe('completed');
        const finalArtifactPart = finalTask?.artifacts?.[0]?.parts?.[0];
        expect(finalArtifactPart?.type === 'text' ? finalArtifactPart.text : undefined).toBe('Joke about resumed topic');
        
        // Check updates from the resumed client
        const finalTaskUpdate = resumeUpdates.pop(); // Get the last task update
        expect(finalTaskUpdate.task.status.state).toBe('completed');
    });

    test('should resume an input-required task via SSE and complete', async () => {
        const taskId = 'resume-sse-task';
        const agentCard = createAgentCardFixture(true); // Use SSE
        const promptMessage: Message = { role: 'agent', parts: [{ type: 'text', text: 'Need SSE resume topic' }] };
        const finalArtifact: A2ATypes.Artifact = { index: 0, name: 'result', parts: [{ type: 'text', text: 'Joke about SSE resumed topic' }] };
        let currentState: TaskState = 'working';
        let fetchCount = 0;

        // SSE streams for different phases
        const initialSseStream = createReadableStream(
            createSseEvent('TaskStatusUpdate', { status: { state: 'working' }, final: false }),
            createSseEvent('TaskStatusUpdate', { status: { state: 'input-required', message: promptMessage }, final: true })
        );
        const resumeSseStream = createReadableStream(
            // Resubscribe might just confirm current state or be empty before closing
            createSseEvent('TaskStatusUpdate', { status: { state: 'input-required', message: promptMessage }, final: true })
        );

        mockFetch(async (input, init) => {
            fetchCount++;
            const url = input.toString();
            const body = init?.body ? JSON.parse(init.body as string) : null;
            console.log(`[Mock Fetch SSE Resume Test #${fetchCount}] URL: ${url}, Method: ${init?.method}, State: ${currentState}, Body: ${JSON.stringify(body)}`);

            if (url === TEST_CARD_URL) return new Response(JSON.stringify(agentCard));
            if (url === TEST_AGENT_URL) {
                // Phase 1: Initial create with SSE
                if (body?.method === 'tasks/sendSubscribe' && currentState === 'working') {
                    currentState = 'input-required'; // State changes after stream ends
                    console.log(` -> Providing initial SSE stream (will end as ${currentState})`);
                    return new Response(initialSseStream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
                }
                // Phase 2: Resume with SSE
                if (body?.method === 'tasks/resubscribe' && currentState === 'input-required') {
                    console.log(` -> Providing resume SSE stream`);
                    return new Response(resumeSseStream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
                }
                // Phase 3: Send input (forces polling)
                if (body?.method === 'tasks/send' && currentState === 'input-required') {
                    currentState = 'completed'; // Completes after input
                    console.log(` -> State change: ${currentState}`);
                    return new Response(JSON.stringify(createJsonRpcResponse(body.id, createTaskFixture(taskId, currentState, [finalArtifact]))));
                }
                // Phase 3: Polls after sending input
                if (body?.method === 'tasks/get' && currentState === 'completed') {
                    return new Response(JSON.stringify(createJsonRpcResponse(body.id, createTaskFixture(taskId, currentState, [finalArtifact]))));
                }
            }
            console.error(`[Mock Fetch SSE Resume Test #${fetchCount}] Unhandled request!`);
            return new Response('Unhandled Mock Request', { status: 500 });
        });

        // --- Phase 1: Create and run SSE to input-required --- 
        console.log("[SSE Resume Test Phase 1] Creating initial client...");
        const initialParams: TaskSendParams = { id: taskId, message: { role: 'user', parts: [{ type: 'text', text: 'sse resume test initial' }] } };
        const client1 = await A2AClient.create(TEST_AGENT_URL, initialParams, BASE_CONFIG);

        // Let the initial SSE stream run to completion
        await clock.runAllAsync();
        // The stream ended with final:true, but the task is input-required,
        // so the client should remain input-required
        expect(client1.getCurrentState()).toBe('input-required');
        const taskAfterPhase1 = client1.getCurrentTask();
        expect(taskAfterPhase1?.status.state).toBe('input-required');
        expect((taskAfterPhase1?.status.message?.parts?.[0] as TextPart)?.text).toBe('Need SSE resume topic');

        // No need to explicitly close client1 here, as we are simulating abandoning it

        // --- Phase 2: Resume the task --- 
        console.log("[SSE Resume Test Phase 2] Resuming client...");
        const client2 = await A2AClient.resume(TEST_AGENT_URL, taskId, BASE_CONFIG);
        const resumeUpdates: any[] = [];
        client2.on('task-update', (p) => resumeUpdates.push({ type: 'task', ...p }));

        // Let the resume SSE stream run (it might close immediately)
        await clock.runAllAsync();
        // Even if the resubscribe stream closed, the *task* state dictates the client state
        expect(client2.getCurrentState()).toBe('input-required');
        const taskAfterResume = client2.getCurrentTask();
        expect(taskAfterResume?.status.state).toBe('input-required');
        expect((taskAfterResume?.status.message?.parts?.[0] as TextPart)?.text).toBe('Need SSE resume topic');

        // --- Phase 3: Provide input and complete --- 
        console.log("[SSE Resume Test Phase 3] Sending input via resumed client (will force polling)...");
        const inputMessage: Message = { role: 'user', parts: [{ type: 'text', text: 'the sse resumed topic' }] };
        await client2.send(inputMessage);

        // Let the send (which starts polling) and subsequent polling complete
        await clock.runAllAsync();

        console.log("[SSE Resume Test Phase 3] Checking final state...");
        expect(client2.getCurrentState()).toBe('closed');
        const finalTask = client2.getCurrentTask();
        expect(finalTask?.status.state).toBe('completed');
        const finalArtifactPart = finalTask?.artifacts?.[0]?.parts?.[0];
        expect(finalArtifactPart?.type === 'text' ? finalArtifactPart.text : undefined).toBe('Joke about SSE resumed topic');

        // Check updates from the resumed client (post-resume)
        const finalTaskUpdate = resumeUpdates.find(u => u.task.status.state === 'completed'); 
        expect(finalTaskUpdate).toBeDefined(); // Should have received the completed state update
    });

});


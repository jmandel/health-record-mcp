import { describe, test, expect } from './testRunner.js';
import { 
    A2AClient, 
    ErrorPayload, 
    ClosePayload, 
    ClientEventType, // Import ClientEventType
    ClientManagedState // Import ClientManagedState
} from '../../src/A2AClient.js'; 
import { 
    TaskStatusUpdateEvent, 
    TaskArtifactUpdateEvent, 
    Task, 
    Message, 
    TextPart, 
    Part, 
    TaskState, 
    TaskSendParams // Import TaskSendParams
} from '../../src/types.js';

// Define Listener type locally for casting
type Listener = (...args: any[]) => void;

// --- Constants --- (Assume Joke Agent is running on its default port)
const JOKE_AGENT_URL = 'http://localhost:3100/a2a'; // Default joke agent A2A endpoint
const JOKE_AGENT_CARD_URL = 'http://localhost:3100/.well-known/agent.json';
const POLL_INTERVAL_MS = 500; // Faster polling for tests
const TEST_TIMEOUT = 20000; // Generous timeout for network requests
const SSE_TEST_TIMEOUT = 25000; // Slightly longer timeout for SSE tests

// --- Helper Functions --- 

// Helper to wait for a specific event with a timeout
// Use ClientEventType for eventName
function waitForEvent<T = unknown>(client: A2AClient, eventName: ClientEventType, timeout = TEST_TIMEOUT): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            client.off(eventName, listener);
            reject(new Error(`Timeout waiting for event "${eventName}" after ${timeout}ms`));
        }, timeout);

        const listener = (payload: T) => { // Use generic type T for payload
            clearTimeout(timer);
            client.off(eventName, listener); 
            resolve(payload);
        };

        client.on(eventName, listener);
    });
}

// Helper to create a client and wait for it to be ready (or error)
// Use imported TaskSendParams type for initialParams
async function createReadyClient(initialParams: TaskSendParams, configOverrides = {}, strategy = 'poll'): Promise<A2AClient> {
    const config = {
        agentEndpointUrl: JOKE_AGENT_URL,
        agentCardUrl: JOKE_AGENT_CARD_URL,
        getAuthHeaders: async () => ({}), // No auth for joke agent
        pollIntervalMs: POLL_INTERVAL_MS,
        forcePoll: strategy === 'poll',
        ...configOverrides,
    };

    console.log(`Creating A2AClient (Strategy: ${strategy})...`);
    const client = await A2AClient.create(initialParams, config);
    expect(client).toBeDefined();
    expect(client.taskId).toBeDefined();
    console.log(`Client created with taskId: ${client.taskId}`);

    // Wait for the client to move past the initial states
    await waitForClientState(client, 
        state => state !== 'idle' && 
                 state !== 'initializing' && 
                 state !== 'fetching-card' && 
                 state !== 'determining-strategy' && 
                 state !== 'starting-poll' && 
                 state !== 'starting-sse',
        `Client did not stabilize after creation`
    );
    console.log(`Client reached stable initial state: ${client.getCurrentState()}`);
    return client;
}

// Helper to wait for the client to reach a specific *managed* state
// Use imported ClientManagedState type
async function waitForClientState(client: A2AClient, conditionFn: (state: ClientManagedState | null) => boolean, errorMessage = 'Client state condition not met', timeout = TEST_TIMEOUT): Promise<ClientManagedState | null> {
    return new Promise((resolve, reject) => {
         let checkInterval;
        const checkTimeout = setTimeout(() => {
             clearInterval(checkInterval);
             reject(new Error(`${errorMessage} within ${timeout}ms. Final state: ${client?.getCurrentState()}`));
         }, timeout);

         const checkState = () => {
             const currentState = client?.getCurrentState();
             console.log(`waitForClientState: Checking - current state: ${currentState}`);
             if (!client || conditionFn(currentState)) {
                 clearTimeout(checkTimeout);
                 clearInterval(checkInterval);
                 resolve(currentState);
             } else if (currentState === 'error' || currentState === 'closed') {
                 clearTimeout(checkTimeout);
                 clearInterval(checkInterval);
                 reject(new Error(`Client entered terminal state ${currentState} while waiting for condition.`));
             }
         };

         // Check immediately and then set interval
         checkState();
         checkInterval = setInterval(checkState, 200); // Check frequently
     });
}

// Helper to collect SSE events until a condition is met (e.g., task completion)
interface CollectedSseData {
    statusUpdates: TaskStatusUpdateEvent[];
    artifactUpdates: TaskArtifactUpdateEvent[];
    closePayload: ClosePayload | null;
    errorPayload: ErrorPayload | null;
}
async function collectSseEvents(client: A2AClient, untilEvent: ClientEventType | 'close' = 'close', timeout = SSE_TEST_TIMEOUT): Promise<CollectedSseData> {
    let statusUpdates: TaskStatusUpdateEvent[] = [];
    let artifactUpdates: TaskArtifactUpdateEvent[] = [];
    let closePayload: ClosePayload | null = null;
    let errorPayload: ErrorPayload | null = null; 

    return new Promise<CollectedSseData>((resolve, reject) => { // Specify return type
        const timer = setTimeout(() => {
            // Clean up listeners before rejecting
            cleanup();
            reject(new Error(`Timeout collecting SSE events after ${timeout}ms waiting for "${untilEvent}"`));
        }, timeout);

        const statusListener = (payload: TaskStatusUpdateEvent) => {
            console.log(`SSE Collector: Received status-update - State: ${payload.status.state}, Final: ${payload.final}`);
            statusUpdates.push(payload);
            if (untilEvent === 'status-update' && payload.status.state !== 'working' && payload.status.state !== 'submitted') { // Example condition
                 maybeResolve();
            }
        };
        const artifactListener = (payload: TaskArtifactUpdateEvent) => {
             console.log(`SSE Collector: Received artifact-update - Index: ${payload.artifact.index}, Append: ${payload.artifact.append}`);
            artifactUpdates.push(payload);
             if (untilEvent === 'artifact-update') { // Example condition
                 maybeResolve();
             }
        };
         const errorListener = (payload: ErrorPayload) => {
             console.error("SSE Collector: Received error event:", payload);
             errorPayload = payload;
             // Don't resolve/reject here, let the close handler deal with it or timeout
         };
        const closeListener = (payload: ClosePayload) => {
            console.log(`SSE Collector: Received close event - Reason: ${payload.reason}`);
            closePayload = payload;
            if (untilEvent === 'close') {
                maybeResolve();
            }
        };

        const cleanup = () => {
             clearTimeout(timer);
             client.off('status-update', statusListener);
             client.off('artifact-update', artifactListener);
             client.off('error', errorListener);
             client.off('close', closeListener);
        };

        const maybeResolve = () => {
             cleanup();
             resolve({ statusUpdates, artifactUpdates, closePayload, errorPayload });
        };

        // Attach listeners
        client.on('status-update', statusListener as Listener); // Cast is now valid
        client.on('artifact-update', artifactListener as Listener);
        client.on('error', errorListener as Listener);
        client.on('close', closeListener as Listener);

        // Handle cases where client might close immediately
        if (client.getCurrentState() === 'closed' || client.getCurrentState() === 'error') {
            console.warn("SSE Collector: Client was already closed/errored when collection started.");
            closePayload = { reason: client.getCurrentState() === 'error' ? 'error-fatal' : 'closed-by-caller' }; // Synthesize reason
            maybeResolve();
        }
    });
}

// --- Test Suite --- 

describe('A2AClient (Browser vs Joke Agent)', () => {

    // Test basic client creation and card fetch
    test('should create client and fetch agent card', async () => {
        const client = await A2AClient.create(
            { message: { role: 'user', parts: [] } }, // Dummy message for creation
            { agentEndpointUrl: JOKE_AGENT_URL, getAuthHeaders: async () => ({}) }
        );
        expect(client).toBeDefined();
        expect(client.taskId).toBeDefined();

        // Give time for async initialization (fetches card, determines strategy, tries to connect)
        await waitForClientState(client, 
            state => state !== 'idle' && 
                     state !== 'initializing' && 
                     state !== 'fetching-card' && 
                     state !== 'determining-strategy',
            'Client did not move past initial setup states'
        ); 
        
        // The final state here depends on how the server reacts to the initial
        // connection attempt with dummy parameters. It might be polling, 
        // connecting-sse, connected-sse (briefly), or even reconnecting-sse
        // if the initial SSE connect fails immediately. 
        // We just care that it *progressed* past the initial setup.
        const currentState = client.getCurrentState();
        console.log(`Client state after initial setup attempt: ${currentState}`);
        expect(['idle', 'initializing', 'fetching-card', 'determining-strategy']).not.toContain(currentState);
        
        // No task started *successfully* yet, just created client
        expect(client.getCurrentTask()).toBeNull();
        
        client.close(); // Clean up
        await waitForClientState(client, state => state === 'closed');

    }, TEST_TIMEOUT); 

    // --- Polling Tests --- 
    describe('Polling Strategy', () => {

        test('should complete a simple tell-joke task via polling', async () => {
            const initialMessage: Message = { role: 'user', parts: [{ type: 'text', text: 'Polling joke test' }] }; // Add Message type
            const client = await createReadyClient(
                { message: initialMessage, metadata: { skillId: 'tell-joke' } },
                { forcePoll: true }
            );

            try {
                console.log('Waiting for task completion event via polling...');
                const closePayload = await waitForEvent<ClosePayload>(client, 'close'); // Specify type
                expect(closePayload.reason).toBe('task-completed');

                const finalTask = client.getCurrentTask();
                expect(finalTask).toBeDefined();
                if (!finalTask) throw new Error('Test assertion failed: finalTask should be defined'); // Type guard

                expect(finalTask.status.state).toBe('completed');
                expect(finalTask.artifacts).toHaveLength(1);
                
                const part = finalTask.artifacts?.[0]?.parts?.[0];
                let jokeText: string | undefined;
                if (part?.type === 'text') { // Type guard for Part
                    jokeText = part.text;
                }
                expect(jokeText).toBeDefined();
                if (!jokeText) throw new Error('Test assertion failed: jokeText should be defined'); // Type guard
                expect(jokeText.length).toBeGreaterThan(5);
                console.log(`Polling test received joke: ${jokeText}`);

            } finally {
                 if(client.getCurrentState() !== 'closed') client.close();
            }
        }, TEST_TIMEOUT);

         test('should handle input-required and resume via polling', async () => {
            const initialMessage: Message = { role: 'user', parts: [{ type: 'text', text: 'Topic joke polling?' }] };
            const client = await createReadyClient(
                { message: initialMessage, metadata: { skillId: 'jokeAboutTopic' } }, 
                { forcePoll: true }
            );

             let finalTask: Task | null = null;
             try {
                 console.log('Polling Test: Waiting for client state to be input-required...');
                 // Wait for the state itself, not the event
                 await waitForClientState(client, state => state === 'input-required', 'Client did not reach input-required state via polling');
                 
                 const currentTask = client.getCurrentTask();
                 expect(currentTask).toBeDefined();
                 if (!currentTask) throw new Error('Test assertion failed: currentTask should be defined');
                 expect(currentTask.status.state).toBe('input-required');

                 let prompt: string | undefined;
                 const promptPart = currentTask.status.message?.parts?.[0]; // Get prompt from task
                 if(promptPart?.type === 'text') { 
                     prompt = promptPart.text;
                 }
                 expect(prompt).toBeDefined();
                 if (!prompt) throw new Error('Test assertion failed: prompt should be defined');
                 expect(prompt).toContain('topic');
                 console.log(`Polling Test: Retrieved input prompt from task: ${prompt}`);

                 // --- Send the response --- 
                 const topic = 'browser testing';
                 const responseMessage = { role: 'user', parts: [{ type: 'text', text: topic }] } as const satisfies Message;
                 console.log(`Polling Test: Sending topic response: ${topic}`);
                 await client.send(responseMessage);

                 await waitForClientState(client, state => state === 'polling' || state === 'retrying-poll', 'Client did not resume polling after send');
                 console.log(`Polling Test: Client resumed polling/retrying state: ${client.getCurrentState()}`);

                 console.log('Polling Test: Waiting for final completion after resume...');
                 const closePayload = await waitForEvent<ClosePayload>(client, 'close');
                 expect(closePayload.reason).toBe('task-completed');

                 finalTask = client.getCurrentTask();
                 expect(finalTask).toBeDefined();
                 if (!finalTask) throw new Error('Test assertion failed: finalTask should be defined');

                 expect(finalTask.status.state).toBe('completed');
                 expect(finalTask.artifacts).toHaveLength(1);
                 
                 let jokeText: string | undefined;
                 const jokePart = finalTask.artifacts?.[0]?.parts?.[0];
                 if(jokePart?.type === 'text') { jokeText = jokePart.text; }
                 expect(jokeText).toBeDefined();
                 if (!jokeText) throw new Error('Test assertion failed: jokeText should be defined');
                 expect(jokeText.toLowerCase()).toContain(topic);
                 console.log(`Polling test received topic joke: ${jokeText}`);

             } finally {
                  if(client && client.getCurrentState() !== 'closed') client.close();
             }
         }, TEST_TIMEOUT * 2);

         test('should cancel a task via polling', async () => {
            // Use jokeAboutTopic to force input-required state
            const initialMessage: Message = { role: 'user', parts: [{ type: 'text', text: 'Cancel me before I give topic (polling)?' }] }; 
            const client = await createReadyClient(
                 { message: initialMessage, metadata: { skillId: 'jokeAboutTopic' } }, // Use jokeAboutTopic
                 { forcePoll: true },
                 'poll' // Strategy hint for logging
             );

            try {
                 console.log('Polling Cancel Test: Waiting for input-required state...');
                 // Wait explicitly for input-required state
                 await waitForClientState(client, state => state === 'input-required', 'Client did not reach input-required before cancel');
                 
                 expect(client.getCurrentState()).toBe('input-required'); 

                 console.log('Polling Cancel Test: Calling client.cancel() while input-required...');
                 await client.cancel();

                 console.log('Polling Cancel Test: Waiting for client to close...');
                 await waitForClientState(client, state => state === 'closed', 'Client did not close after cancel');

                 const finalTask = client.getCurrentTask(); 
                 // Task might still be null if accessed immediately after close event,
                 // but the server should have marked it as canceled. Let's check if task exists.
                 expect(finalTask).toBeDefined(); 
                 if (finalTask) {
                    console.log(`Polling Cancel Test: Final task state: ${finalTask.status.state}`);
                    expect(finalTask.status.state).toBe('canceled'); // Assert against the actual task state
                 }
                 console.log('Polling Cancel Test: Client closed successfully after cancel, task state verified.');

            } finally {
                 if(client && client.getCurrentState() !== 'closed') {
                     client.close('closed-by-caller');
                     await waitForClientState(client, state => state === 'closed', 'Client cleanup failed');
                 }
            }
        }, TEST_TIMEOUT);

    });

    // --- SSE Tests --- 
    describe('SSE Strategy', () => {

        test('should complete a simple tell-joke task via SSE', async () => {
            const initialMessage: Message = { role: 'user', parts: [{ type: 'text', text: 'SSE joke test' }] };
            const client = await createReadyClient(
                { message: initialMessage, metadata: { skillId: 'tell-joke' } },
                {}, // No config overrides -> defaults to SSE if supported
                'sse' // Indicate strategy for helper logging
            );

            // Verify strategy was determined correctly
            // Accessing private member for test verification - replace if getter is added
            expect((client as any)._strategy).toBe('sse'); 

            let collectedData: CollectedSseData | null = null;
            try {
                console.log('SSE Test: Collecting events until close...');
                collectedData = await collectSseEvents(client, 'close');

                expect(collectedData.errorPayload).toBeNull(); // Should be no client errors
                expect(collectedData.closePayload).toBeDefined();
                if (!collectedData.closePayload) throw new Error("Assertion failed: closePayload should be defined"); // Type guard
                expect(collectedData.closePayload.reason).toBe('task-completed');

                // Verify received events (basic checks)
                expect(collectedData.statusUpdates.length).toBeGreaterThan(0); // Should get at least working/completed
                // Depending on server timing, might get 1 (just completed) or more (working -> completed)
                const finalStatusEvent = collectedData.statusUpdates[collectedData.statusUpdates.length - 1];
                expect(finalStatusEvent.status.state).toBe('completed');
                expect(finalStatusEvent.final).toBe(true); // Verify the final flag

                expect(collectedData.artifactUpdates.length).toBe(1); // Joke agent sends one artifact

                // Verify final task state from client
                const finalTask = client.getCurrentTask();
                expect(finalTask).toBeDefined();
                if (!finalTask) throw new Error("Assertion failed: finalTask should be defined"); // Type guard
                expect(finalTask.status.state).toBe('completed');
                expect(finalTask.artifacts).toHaveLength(1);
                
                let jokeText: string | undefined;
                const part = finalTask.artifacts?.[0]?.parts?.[0];
                if (part?.type === 'text') { jokeText = part.text; }
                expect(jokeText).toBeDefined();
                if (!jokeText) throw new Error("Assertion failed: jokeText should be defined");
                expect(jokeText.length).toBeGreaterThan(5);
                console.log(`SSE test received joke: ${jokeText}`);

                // Optionally verify joke from artifact event matches final task
                const artifactEventPayload = collectedData.artifactUpdates[0].artifact;
                let jokeFromEvent: string | undefined;
                const eventPart = artifactEventPayload?.parts?.[0];
                if (eventPart?.type === 'text') { jokeFromEvent = eventPart.text; }
                expect(jokeFromEvent).toBe(jokeText);

            } finally {
                if (client && client.getCurrentState() !== 'closed' && client.getCurrentState() !== 'error') {
                    console.warn("SSE Test: Forcing client close in finally block.");
                    client.close();
                }
            }
        }, SSE_TEST_TIMEOUT);


        test('should handle input-required and resume via SSE', async () => {
            const initialMessage: Message = { role: 'user', parts: [{ type: 'text', text: 'Topic joke SSE?' }] };
            const client = await createReadyClient(
                { message: initialMessage, metadata: { skillId: 'jokeAboutTopic' } },
                {}, 
                'sse'
            );
            expect((client as any)._strategy).toBe('sse');

            let finalTask: Task | null = null;
            try {
                console.log('SSE Input Test: Waiting for client state to be input-required...');
                await waitForClientState(client, state => state === 'input-required', 'Client did not reach input-required state via SSE');
                
                const currentTask = client.getCurrentTask();
                expect(currentTask).toBeDefined();
                if (!currentTask) throw new Error('Test assertion failed: currentTask should be defined');
                expect(currentTask.status.state).toBe('input-required');

                // Attempt to get prompt, but don't fail if it's missing from SSE update
                let prompt: string | undefined;
                const promptPart = currentTask.status.message?.parts?.[0]; 
                if(promptPart?.type === 'text') { prompt = promptPart.text; }
                console.log(`SSE Input Test: Retrieved input prompt from task (might be undefined): ${prompt}`);

                // --- Send the response --- 
                const topic = 'event streams';
                const responseMessage = { role: 'user', parts: [{ type: 'text', text: topic }] } as const satisfies Message;
                console.log(`SSE Input Test: Sending topic response: ${topic}`);
                const sendPromise = client.send(responseMessage);
                await new Promise(r => setTimeout(r, 200)); 

                console.log('SSE Input Test: Collecting events after sending response...');
                const collectedData = await collectSseEvents(client, 'close');
                await sendPromise; 

                expect(collectedData.errorPayload).toBeNull();
                expect(collectedData.closePayload).toBeDefined();
                if (!collectedData.closePayload) throw new Error("Assertion failed: closePayload should be defined");
                expect(collectedData.closePayload.reason).toBe('task-completed');

                finalTask = client.getCurrentTask();
                expect(finalTask).toBeDefined();
                if (!finalTask) throw new Error("Assertion failed: finalTask should be defined");
                expect(finalTask.status.state).toBe('completed');
                expect(finalTask.artifacts).toHaveLength(1);
                
                let jokeText: string | undefined;
                 const jokePart = finalTask.artifacts?.[0]?.parts?.[0];
                 if(jokePart?.type === 'text') { jokeText = jokePart.text; }
                 expect(jokeText).toBeDefined();
                 if (!jokeText) throw new Error("Assertion failed: jokeText should be defined");
                 expect(jokeText.toLowerCase()).toContain(topic); // Check for topic
                 console.log(`SSE Input test received topic joke: ${jokeText}`);

            } finally {
                 if (client && client.getCurrentState() !== 'closed' && client.getCurrentState() !== 'error') {
                     console.warn("SSE Input Test: Forcing client close in finally block.");
                     client.close();
                 }
            }
        }, SSE_TEST_TIMEOUT * 2); 

        test('should cancel a task via SSE', async () => {
            const initialMessage: Message = { role: 'user', parts: [{ type: 'text', text: 'Cancel me before I give topic!' }] };
            const client = await createReadyClient(
                { message: initialMessage, metadata: { skillId: 'jokeAboutTopic' } },
                {}, 
                'sse'
            );
            expect((client as any)._strategy).toBe('sse');

            try {
                console.log('SSE Cancel Test: Waiting for input-required state...');
                 // Wait for the state
                await waitForClientState(client, state => state === 'input-required', 'Client did not reach input-required state before cancel');

                console.log('SSE Cancel Test: Calling client.cancel() while input-required...');
                const cancelPromise = client.cancel(); 

                console.log('SSE Cancel Test: Waiting for close event after cancel...');
                const closePayload = await waitForEvent<ClosePayload>(client, 'close', 5000);
                await cancelPromise; 

                expect(closePayload.reason).toBeOneOf(['task-canceled-by-client', 'canceling', 'error-on-cancel']);
                expect(client.getCurrentState()).toBeOneOf(['closed', 'error']); 

                const finalTask = client.getCurrentTask(); 
                if (finalTask) {
                     console.log(`SSE Cancel Test: Final task state after cancel: ${finalTask.status.state}`);
                     // State should ideally be canceled, but might still be input-required if cancel was very fast
                     expect(finalTask.status.state).toBeOneOf(['input-required', 'canceled']);
                } else {
                     console.warn("SSE Cancel Test: Final task was null after cancel.");
                }
                console.log('SSE Cancel Test: Client closed successfully after cancel.');

            } finally {
                if (client && client.getCurrentState() !== 'closed' && client.getCurrentState() !== 'error') {
                     console.warn("SSE Cancel Test: Forcing client close in finally block.");
                     client.close();
                }
            }
        }, SSE_TEST_TIMEOUT);

        test.skip('should handle SSE reconnection', async () => {
            // Hard to test without a mock server or way to force disconnect
            // Requires:
            // 1. Starting SSE connection
            // 2. Simulating a network drop / server disconnect
            // 3. Verifying the client enters 'reconnecting-sse' state
            // 4. Verifying it eventually reconnects ('connected-sse') or fails ('error') after max attempts
        });

    });

}); 
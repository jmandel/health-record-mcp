// File: a4a/client/test/browser/TaskLiaison.integration.test.ts
import { describe, test, expect } from './testRunner.js';
import { TaskLiaison, createDefaultSummaryView } from '../../src/TaskLiaison.js';
import type { 
    TaskLiaisonSnapshot, 
    TaskLiaisonConfig, 
    UserFacingSummaryView 
    // Strategy types not needed here if using defaults
} from '../../src/TaskLiaison.js'; 
import type { ClosePayload, ErrorPayload, ClientCloseReason, A2AClientConfig } from '../../src/A2AClient.js'; // Import A2AClientConfig
import { 
    Task, 
    Message, 
    TextPart, 
    TaskState, 
    TaskSendParams,
    Artifact
} from '../../src/types.js';

// --- Test View Types ---
interface TestSummaryView extends UserFacingSummaryView {
    testLabel?: string;
}
// Define a type for the default prompt view structure
interface DefaultPromptView {
    promptMessage: Message | null;
}

// --- Test Strategies (REMOVED - Using defaults for now) ---

// --- Constants --- 
const JOKE_AGENT_URL = 'http://localhost:3100/a2a'; 
const JOKE_AGENT_CARD_URL = 'http://localhost:3100/.well-known/agent.json';
const POLL_INTERVAL_MS = 500; 
const TEST_TIMEOUT = 20000; 
const LONG_TEST_TIMEOUT = 30000; 
const VERY_LONG_TEST_TIMEOUT = 40000; 

// --- Helper Functions --- 

// Helper to wait for the TaskLiaison's snapshot to meet a condition
async function waitForLiaisonSnapshot<TSummary extends UserFacingSummaryView, TPrompt>(
    liaison: TaskLiaison<TSummary, TPrompt> | null, 
    conditionFn: (snapshot: TaskLiaisonSnapshot<TSummary, TPrompt> | null) => boolean, 
    errorMessage = 'TaskLiaison snapshot condition not met',
    timeout = TEST_TIMEOUT
): Promise<TaskLiaisonSnapshot<TSummary, TPrompt> | null> { 
    type CurrentSnapshotType = TaskLiaisonSnapshot<TSummary, TPrompt> | null;
    return new Promise((resolve, reject) => {
        if (!liaison) { 
             if (conditionFn(null)) { resolve(null); }
             else { reject(new Error(`Liaison was already null. ${errorMessage}`)); }
             return;
        }
        let lastSnapshot: CurrentSnapshotType = liaison.getCurrentSnapshot();
        let listener: ((snapshot: TaskLiaisonSnapshot<TSummary, TPrompt>) => void) | null = null;
        const timer = setTimeout(() => {
            if (listener && liaison) liaison.off('change', listener);
            const currentSnap = liaison?.getCurrentSnapshot(); 
            const finalStateDesc = currentSnap ? `State: ${currentSnap.liaisonState}, TaskId: ${currentSnap.task?.id}` : 'Liaison destroyed';
            reject(new Error(`${errorMessage} within ${timeout}ms. Last snapshot: ${finalStateDesc}`));
        }, timeout);
        listener = (snapshot: TaskLiaisonSnapshot<TSummary, TPrompt>) => {
            lastSnapshot = snapshot;
            console.log(`waitForLiaisonSnapshot: Checking - State: ${snapshot.liaisonState}, TaskId: ${snapshot.task?.id}`); 
            if (conditionFn(snapshot)) {
                console.log("waitForLiaisonSnapshot: conditionFn(snapshot) true");
                clearTimeout(timer);
                if (listener && liaison) liaison.off('change', listener);
                resolve(snapshot);
            }
        };
        const initialSnapshot = liaison.getCurrentSnapshot();
        if (conditionFn(initialSnapshot)) {
            console.log("waitForLiaisonSnapshot: conditionFn(initialSnapshot) true");
             clearTimeout(timer);
             resolve(initialSnapshot);
             return; 
        }
        liaison.on('change', listener);
    });
}


// --- Test Suite --- 

describe('TaskLiaison (Integration with Joke Agent)', () => {

    // Define types for this test suite
    type CurrentSummaryView = TestSummaryView;
    type CurrentPromptView = DefaultPromptView;

    test('should instantiate TaskLiaison with defaults', () => {
        // Use the config object - strategies are optional
        const config: TaskLiaisonConfig<CurrentSummaryView, CurrentPromptView> = {};
        const liaison = new TaskLiaison(config); 
        expect(liaison).toBeDefined();
        const initialSnap = liaison.getCurrentSnapshot();
        expect(initialSnap.liaisonState).toBe('idle'); 
        expect(initialSnap.summaryView.label).toBe("Task"); 
        expect(initialSnap.summaryView.detail).toBe("Initializing..."); 
        expect(initialSnap.task).toBeNull();
        expect(initialSnap.promptView).toBeNull();
        liaison.closeTask();
    });

    test('should instantiate TaskLiaison with custom initial view', () => {
        const myInitialView: TestSummaryView = { label: "Custom", detail: "Starting Up", testLabel: "hello" };
        const config: TaskLiaisonConfig<CurrentSummaryView, CurrentPromptView> = {
            initialSummaryView: myInitialView
        };
        const liaison = new TaskLiaison(config);
        const initialSnap = liaison.getCurrentSnapshot();
        // Use JSON.stringify for deep comparison workaround
        expect(JSON.stringify(initialSnap.summaryView)).toBe(JSON.stringify(myInitialView));
        liaison.closeTask();
    });

    // --- startTask Tests ---
    test('should start a simple tell-joke task and complete successfully', async () => {
        const config: TaskLiaisonConfig<CurrentSummaryView, CurrentPromptView> = {
             initialSummaryView: createDefaultSummaryView("Tell Joke Test") as CurrentSummaryView
        };
        const liaison = new TaskLiaison(config);

        liaison.on('change', (snapshot) => {
             console.log(`[Tell Joke Test Listener] State: ${snapshot.liaisonState}, TaskId: ${snapshot.task?.id}`);
        });

        try {
            const initialMessage: Message = { role: 'user', parts: [{ type: 'text', text: 'Liaison integration joke test' }] };
            const startParams: TaskSendParams = { message: initialMessage, metadata: { skillId: 'tell-joke' } };
            const clientConfig: A2AClientConfig = { // Use explicit type 
                agentEndpointUrl: JOKE_AGENT_URL,
                agentCardUrl: JOKE_AGENT_CARD_URL,
                getAuthHeaders: async () => ({}),
                pollIntervalMs: POLL_INTERVAL_MS 
            };
            
            console.log('[Tell Joke Test] Calling liaison.startTask...');
            const startPromise = liaison.startTask(startParams, clientConfig);
            
            await waitForLiaisonSnapshot(liaison, snap => snap?.liaisonState !== 'idle', 'Liaison did not move past idle state');
            console.log(`[Tell Joke Test] Liaison state after start initiated: ${liaison.getCurrentSnapshot().liaisonState}`); 

            await startPromise; // Wait for client connection/polling to start
            console.log(`[Tell Joke Test] liaison.startTask promise resolved. State: ${liaison.getCurrentSnapshot().liaisonState}`); 

            console.log('[Tell Joke Test] Waiting for liaison completion snapshot...');
            const finalSnapshot = await waitForLiaisonSnapshot(
                liaison, 
                snap => snap?.liaisonState === 'closed',
                'Liaison did not reach the closed state',
                LONG_TEST_TIMEOUT
            );

            expect(finalSnapshot?.liaisonState).toBe('closed');
            expect(finalSnapshot?.task).toBeDefined();
            const finalTask = finalSnapshot?.task;
            if (!finalTask) throw new Error("Test assertion failed: finalTask is undefined in snapshot"); 

            expect(finalTask.status.state).toBe('completed'); 
            expect(finalTask.artifacts).toHaveLength(1);
            const jokeArtifact = finalTask.artifacts?.[0];
            expect(jokeArtifact?.name).toBe('joke-result');
            
            let jokeText: string | undefined;
            const part = jokeArtifact?.parts?.[0];
            if (part?.type === 'text') jokeText = part.text;
            expect(jokeText).toBeDefined();
            expect((jokeText ?? '').length).toBeGreaterThan(5);
            console.log(`[Tell Joke Test] Received joke: ${jokeText}`);

        } finally {
             const currentSnapBeforeFinally = liaison?.getCurrentSnapshot();
             if (liaison && currentSnapBeforeFinally && currentSnapBeforeFinally.liaisonState !== 'closed') { 
                 await liaison.closeTask(); 
                 await waitForLiaisonSnapshot(liaison, snap => snap?.liaisonState === 'closed', 'Liaison state did not become closed after close'); 
             }
        }
    }, LONG_TEST_TIMEOUT);

    // --- Input Required Test --- 
    test('should handle input-required using provideInput', async () => {
        const topicToSend = "robots";
        const config: TaskLiaisonConfig<CurrentSummaryView, CurrentPromptView> = {
             // Relying on default strategies
             initialSummaryView: { label: 'Input Test' }
        };
        const liaison = new TaskLiaison(config);

        liaison.on('change', (snapshot) => {
            console.log(`[Input Test Listener] State: ${snapshot.liaisonState}, PromptView: ${JSON.stringify(snapshot.promptView)}, TaskState: ${snapshot.task?.status?.state}`);
        });

        try {
            const initialMessage: Message = { role: 'user', parts: [{ type: 'text', text: 'Tell me a joke about...' }] };
            const startParams: TaskSendParams = { message: initialMessage, metadata: { skillId: 'jokeAboutTopic' } };
            const clientConfig: A2AClientConfig = { 
                 agentEndpointUrl: JOKE_AGENT_URL,
                 agentCardUrl: JOKE_AGENT_CARD_URL,
                 getAuthHeaders: async () => ({}),
                 pollIntervalMs: POLL_INTERVAL_MS 
             };
            
            console.log('[Input Test] Calling liaison.startTask...');
            liaison.startTask(startParams, clientConfig); // Don't await fully here
            
            console.log('[Input Test] Waiting for awaiting-input state...');
            const inputSnapshot = await waitForLiaisonSnapshot(
                liaison,
                snap => snap?.liaisonState === 'awaiting-input',
                'Liaison did not reach awaiting-input state',
                LONG_TEST_TIMEOUT
            );
            console.log("Input Test: Awaiting-input state reached:" + JSON.stringify(inputSnapshot));
            expect(inputSnapshot?.liaisonState).toBe('awaiting-input');
            expect(inputSnapshot?.task?.status?.state).toBe('input-required');
            // Check that the default prompt strategy populated the view
            expect(inputSnapshot?.promptView).toBeDefined();
            expect(inputSnapshot?.promptView?.promptMessage).toBeDefined();
            const promptPart = inputSnapshot?.promptView?.promptMessage?.parts?.[0];
            let promptText: string | undefined;
            if (promptPart?.type === 'text') promptText = promptPart.text;
            expect(promptText).toContain('topic');
            console.log(`[Input Test] Prompt view verified: ${promptText}`);

            // --- Simulate providing input --- 
            console.log(`[Input Test] Calling provideInput with topic: ${topicToSend}`);
            const responseMessage: Message = { role: 'user', parts: [{ type: 'text', text: topicToSend }] };
            await liaison.provideInput(responseMessage);
            console.log('[Input Test] provideInput finished.');
            
             // --- Wait for final completion --- 
             console.log('[Input Test] Waiting for final closed state...');
             const finalSnapshot = await waitForLiaisonSnapshot(
                 liaison, 
                 snap => snap?.liaisonState === 'closed',
                 'Liaison did not reach the closed state after input',
                 LONG_TEST_TIMEOUT
             );

             expect(finalSnapshot?.liaisonState).toBe('closed');
             const finalTask = finalSnapshot?.task;
             if (!finalTask) throw new Error("Test assertion failed: finalTask is undefined");
             expect(finalTask.status.state).toBe('completed');
             
             let jokeText: string | undefined;
             const jokePart = finalTask.artifacts?.[0]?.parts?.[0];
             if (jokePart?.type === 'text') { jokeText = jokePart.text; }
             expect(jokeText).toBeDefined();
             expect((jokeText ?? '').toLowerCase()).toContain(topicToSend);
             console.log(`[Input Test] Received topic joke: ${jokeText}`);

        } finally {
             const currentSnapBeforeFinally = liaison?.getCurrentSnapshot();
             if (liaison && currentSnapBeforeFinally && currentSnapBeforeFinally.liaisonState !== 'closed') { 
                 await liaison.closeTask();
                 await waitForLiaisonSnapshot(liaison, snap => snap?.liaisonState === 'closed', 'Liaison state did not become closed');
             }
        }
    }, VERY_LONG_TEST_TIMEOUT);

    // TODO: Add tests for cancellation during awaiting-input, errors etc.

}); 
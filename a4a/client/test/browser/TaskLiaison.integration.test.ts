// File: a4a/client/test/browser/TaskLiaison.integration.test.ts
import { describe, test, expect } from './testRunner.js';
import { TaskLiaison } from '../../src/TaskLiaison.js';
import type {
    TaskLiaisonSnapshot,
    // Removed TaskLiaisonConfig, UserFacingSummaryView
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
// REMOVED TestSummaryView interface
// REMOVED DefaultPromptView interface

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
// Removed generics <TSummary extends UserFacingSummaryView, TPrompt>
async function waitForLiaisonSnapshot(
    liaison: TaskLiaison | null,
    conditionFn: (snapshot: TaskLiaisonSnapshot | null) => boolean,
    errorMessage = 'TaskLiaison snapshot condition not met',
    timeout = TEST_TIMEOUT
): Promise<TaskLiaisonSnapshot | null> { 
    // Use non-generic TaskLiaisonSnapshot
    type CurrentSnapshotType = TaskLiaisonSnapshot | null;
    return new Promise((resolve, reject) => {
        if (!liaison) {
             if (conditionFn(null)) { resolve(null); }
             else { reject(new Error(`Liaison was already null. ${errorMessage}`)); }
             return;
        }
        let lastSnapshot: CurrentSnapshotType = liaison.getCurrentSnapshot();
        // Listener takes (prev, current) but conditionFn usually just needs current
        let listener: ((prev: TaskLiaisonSnapshot | null, current: TaskLiaisonSnapshot) => void) | null = null;
        const timer = setTimeout(() => {
            // Use offTransition
            if (listener && liaison) liaison.offTransition(listener);
            const currentSnap = liaison?.getCurrentSnapshot(); 
            const finalStateDesc = currentSnap ? `State: ${currentSnap.liaisonState}, TaskId: ${currentSnap.task?.id}` : 'Liaison destroyed';
            reject(new Error(`${errorMessage} within ${timeout}ms. Last snapshot: ${finalStateDesc}`));
        }, timeout);
        // Listener takes prevSnapshot and currentSnapshot
        listener = (prevSnapshot: TaskLiaisonSnapshot | null, currentSnapshot: TaskLiaisonSnapshot) => {
            lastSnapshot = currentSnapshot; // Store current as last for logging/debugging if needed
            console.log(`waitForLiaisonSnapshot: Checking - State: ${currentSnapshot.liaisonState}, TaskId: ${currentSnapshot.task?.id}`);
            // Pass currentSnapshot to the condition function
            if (conditionFn(currentSnapshot)) {
                console.log("waitForLiaisonSnapshot: conditionFn(currentSnapshot) true");
                clearTimeout(timer);
                // Use offTransition
                if (listener && liaison) liaison.offTransition(listener);
                resolve(currentSnapshot);
            }
        };
        const initialSnapshot = liaison.getCurrentSnapshot();
        // Check initial state against conditionFn
        if (conditionFn(initialSnapshot)) {
            console.log("waitForLiaisonSnapshot: conditionFn(initialSnapshot) true");
             clearTimeout(timer);
             resolve(initialSnapshot);
             return;
        }
        // Use onTransition
        liaison.onTransition(listener);
    });
}


// --- Test Suite --- 

describe('TaskLiaison (Integration with Joke Agent)', () => {

    // Define types for this test suite - REMOVED view types
    // type CurrentSummaryView = TestSummaryView;
    // type CurrentPromptView = DefaultPromptView;

    test('should instantiate TaskLiaison with defaults', () => {
        // Liaison takes no config or empty config
        // const config: TaskLiaisonConfig<CurrentSummaryView, CurrentPromptView> = {};
        const liaison = new TaskLiaison({ agentEndpointUrl: JOKE_AGENT_URL });
        expect(liaison).toBeDefined();
        const initialSnap = liaison.getCurrentSnapshot();
        expect(initialSnap.liaisonState).toBe('idle');
        // REMOVED summaryView and promptView checks
        // expect(initialSnap.summaryView.label).toBe("Task");
        // expect(initialSnap.summaryView.detail).toBe("Initializing...");
        expect(initialSnap.task).toBeNull();
        // expect(initialSnap.promptView).toBeNull();
        liaison.closeTask();
    });

    // REMOVED test: 'should instantiate TaskLiaison with custom initial view'
    // test('should instantiate TaskLiaison with custom initial view', () => { ... });

    // --- startTask Tests ---
    test('should start a simple tell-joke task and complete successfully', async () => {
        // No config needed
        // const config: TaskLiaisonConfig<CurrentSummaryView, CurrentPromptView> = {
        //      initialSummaryView: createDefaultSummaryView("Tell Joke Test") as CurrentSummaryView
        // };
        const liaison = new TaskLiaison({ agentEndpointUrl: JOKE_AGENT_URL });

        // Use onTransition
        liaison.onTransition((prevSnapshot, currentSnapshot) => {
             console.log(`[Tell Joke Test Listener] State: ${currentSnapshot.liaisonState}, TaskId: ${currentSnapshot.task?.id}`);
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
            
            // Call waitForLiaisonSnapshot without generics
            await waitForLiaisonSnapshot(liaison, snap => snap?.liaisonState !== 'idle', 'Liaison did not move past idle state');
            console.log(`[Tell Joke Test] Liaison state after start initiated: ${liaison.getCurrentSnapshot().liaisonState}`);

            await startPromise; // Wait for client connection/polling to start
            console.log(`[Tell Joke Test] liaison.startTask promise resolved. State: ${liaison.getCurrentSnapshot().liaisonState}`);

            console.log('[Tell Joke Test] Waiting for liaison completion snapshot...');
            // Call waitForLiaisonSnapshot without generics
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
                  // Call waitForLiaisonSnapshot without generics
                  await waitForLiaisonSnapshot(liaison, snap => snap?.liaisonState === 'closed', 'Liaison state did not become closed after close'); 
              }
        }
    }, LONG_TEST_TIMEOUT);

    // --- Input Required Test --- 
    test('should handle input-required using provideInput', async () => {
        const topicToSend = "robots";
        // No config needed
        // const config: TaskLiaisonConfig<CurrentSummaryView, CurrentPromptView> = {
        //      // Relying on default strategies
        //      initialSummaryView: { label: 'Input Test' }
        // };
        const liaison = new TaskLiaison({ agentEndpointUrl: JOKE_AGENT_URL });
        let finalSnapshotFromEvent: TaskLiaisonSnapshot | null = null; // Variable to store the snapshot from the event

        // Use onTransition
        liaison.onTransition((prevSnapshot, currentSnapshot) => {
            // Removed promptView from log
            console.log(`[Input Test Listener] State: ${currentSnapshot.liaisonState}, TaskState: ${currentSnapshot.task?.status?.state}`);
            // Capture the snapshot when the desired final state is reached
            if (currentSnapshot.liaisonState === 'closed') {
                 console.log("[Input Test Listener] Capturing final closed snapshot from event.");
                 finalSnapshotFromEvent = currentSnapshot;
            }
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
            // Call waitForLiaisonSnapshot without generics
            const inputSnapshot = await waitForLiaisonSnapshot(
                liaison,
                snap => snap?.liaisonState === 'awaiting-input',
                'Liaison did not reach awaiting-input state',
                LONG_TEST_TIMEOUT
            );
            console.log("Input Test: Awaiting-input state reached:" + JSON.stringify(inputSnapshot));
            expect(inputSnapshot?.liaisonState).toBe('awaiting-input');
            expect(inputSnapshot?.task?.status?.state).toBe('input-required');
            // Check prompt text from task.status.message instead of promptView
            const promptMessage = inputSnapshot?.task?.status?.message;
            expect(promptMessage).toBeDefined();
            const promptPart = promptMessage?.parts?.find(p => p.type === 'text') as TextPart | undefined;
            expect(promptPart).toBeDefined();
            const promptText: string | undefined = promptPart?.text;
            // expect(inputSnapshot?.promptView).toBeDefined();
            // expect(inputSnapshot?.promptView?.promptMessage).toBeDefined();
            // const promptPart = inputSnapshot?.promptView?.promptMessage?.parts?.[0];
            // let promptText: string | undefined;
            // if (promptPart?.type === 'text') promptText = promptPart.text;
            expect(promptText).toBeDefined();
            expect(promptText).toContain('topic');
            console.log(`[Input Test] Prompt text verified: ${promptText}`);

            // --- Simulate providing input --- 
            console.log(`[Input Test] Calling provideInput with topic: ${topicToSend}`);
            const responseMessage: Message = { role: 'user', parts: [{ type: 'text', text: topicToSend }] };
            await liaison.provideInput(responseMessage);
            console.log('[Input Test] provideInput finished.');
            
              // --- Wait for final completion --- 
              console.log('[Input Test] Waiting for final closed state (using waitForLiaisonSnapshot just for state)...');
              // Use waitForLiaisonSnapshot just to ensure the state *becomes* closed
              await waitForLiaisonSnapshot(
                  liaison, 
                  snap => snap?.liaisonState === 'closed',
                  'Liaison did not reach the closed state after input',
                  LONG_TEST_TIMEOUT
              );

              // Now, use the snapshot captured by the listener
              console.log('[Input Test] Asserting using snapshot captured from the onTransition event.');
              // Use expect().not.toBeNull() and then non-null assertion
              expect(finalSnapshotFromEvent).not.toBeNull();
              expect(finalSnapshotFromEvent!.liaisonState).toBe('closed');
              const finalTask = finalSnapshotFromEvent!.task;
              if (!finalTask) throw new Error("Test assertion failed: finalTask is undefined in captured snapshot");
              expect(finalTask.status.state).toBe('completed');
              
              let jokeText: string | undefined;
              const jokePart = finalTask.artifacts?.[0]?.parts?.[0];
              if (jokePart?.type === 'text') { jokeText = jokePart.text; }
              expect(jokeText).toBeDefined();
              expect((jokeText ?? '').toLowerCase()).toContain(topicToSend);
              console.log(`[Input Test] Received topic joke: ${jokeText}`);

        } finally {
        }
    }, VERY_LONG_TEST_TIMEOUT);

}); 
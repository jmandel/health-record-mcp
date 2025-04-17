// src/core/A2AServerCoreLite.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { A2AServerCoreLite, A2AError } from "./A2AServerCoreLite";
import { InMemoryTaskStore } from "..";
import type {
  TaskProcessorV2,
  ProcessorStepContext,
  ProcessorYieldValue,
  ProcessorInputValue,
} from "../interfaces/processorV2";
import { ProcessorCancellationError } from "../interfaces/processorV2";
import type { TaskSendParams } from "../types";
import { SseConnectionManager } from "./SseConnectionManager";
import pino from "pino";
import type { NotificationService, TaskStore } from "../interfaces";
import type { TaskStatusUpdateEvent, TaskArtifactUpdateEvent } from "../types";

const log = pino({ name: "A2ATest" }); // Add a logger for debug output

// Dummy processor: working → artifact chunk 1 → artifact chunk 2 → completed
const streamingDummyProcessor: TaskProcessorV2 = {
  canHandle: async () => true,
  process: async function* () {
    yield { type: 'statusUpdate', state: 'working', message: { role: 'agent', parts: [{ type: 'text', text: 'Starting work...' }] } };
    // Yield artifact in chunks
    yield { type: 'artifact', artifactData: { name: 'streamed_art', parts: [{ type: 'text', text: 'Chunk 1. ' }], index: 0, append: false, lastChunk: false } };
    await new Promise(r => setTimeout(r, 10)); // Simulate work
    yield { type: 'artifact', artifactData: { name: 'streamed_art', parts: [{ type: 'text', text: 'Chunk 2.' }], index: 0, append: true, lastChunk: true } };
    yield { type: 'statusUpdate', state: 'completed' };
  }
};

// Processor that hangs until externally resumed
let resumeHangingProcessor: (() => void) | null = null;
const hangingProcessor: TaskProcessorV2 = {
  canHandle: async () => true,
  process: async function* (context: ProcessorStepContext, initialParams: TaskSendParams) {
    // Yield a specific message before hanging
    yield { type: 'statusUpdate', state: 'working', message: { role: 'agent', parts: [{ type: 'text', text: 'Hanging now' }] } };
    try {
        await new Promise<void>((resolve) => { resumeHangingProcessor = resolve; });
    } finally {
        resumeHangingProcessor = null; // Clean up resolver
    }
    // This part should not be reached if cancelled correctly, but make it type-correct
    yield {
      type: 'artifact',
      artifactData: {
        name:'post_hang_artifact',
        parts: [{type: 'text', text:'Woke up!'}],
        index: 0,
        append: false,
        lastChunk: true,
      }
    };
    yield { type: 'statusUpdate', state: 'completed' };
  }
};

// Processor simulating input-required state
const inputRequiredProcessor: TaskProcessorV2 = {
  canHandle: async () => true,
  process: async function* (context: ProcessorStepContext, initialParams: TaskSendParams) {
    yield { type: 'statusUpdate', state: 'working', message: { role: 'agent', parts: [{ type: 'text', text: 'Starting input required flow...' }] } };

    // Request input
    // Yield the status update and capture the result of this yield expression
    const nextInput: ProcessorInputValue = yield {
       type: 'statusUpdate',
       state: 'input-required',
       message: { role: 'agent', parts: [{ type: 'text', text: 'Please provide input: confirm' }] }
    };

    // Now check the value passed into .next()
    let confirmed = false;
    log.debug({ nextInput }, "Processor received input after pause"); // Add logging
    if (nextInput?.type === 'message' && nextInput.message.parts[0]?.type === 'text') {
        if (nextInput.message.parts[0].text.toLowerCase() === 'confirm') {
            confirmed = true;
        }
    }

    if (confirmed) {
        yield { type: 'statusUpdate', state: 'working', message: { role: 'agent', parts: [{ type: 'text', text: 'Confirmation received.' }] } };
        yield { type: 'artifact', artifactData: { name: 'final_artifact', parts: [{ type: 'text', text: 'Task completed after input.' }], index: 0, append: false, lastChunk: true } };
        yield { type: 'statusUpdate', state: 'completed' };
    } else {
        yield { type: 'statusUpdate', state: 'failed', message: { role: 'agent', parts: [{ type: 'text', text: 'Incorrect input received.' }] } };
    }
  }
};

// Processor simulating two input-required stages
const twoStageInputProcessor: TaskProcessorV2 = {
  canHandle: async () => true,
  process: async function* (context: ProcessorStepContext, initialParams: TaskSendParams) {
    yield { type: 'statusUpdate', state: 'working', message: { role: 'agent', parts: [{ type: 'text', text: 'Starting two-stage input task...' }] } };

    // --- Stage 1 Input --- 
    log.debug("Processor asking for stage 1 input");
    const input1: ProcessorInputValue = yield {
       type: 'statusUpdate',
       state: 'input-required',
       message: { role: 'agent', parts: [{ type: 'text', text: 'Please provide stage 1 input: input1' }] }
    };
    log.debug({ input1 }, "Processor received stage 1 input");

    let confirmed1 = false;
    if (input1?.type === 'message' && input1.message.parts[0]?.type === 'text') {
        if (input1.message.parts[0].text.toLowerCase() === 'input1') {
            confirmed1 = true;
        }
    }

    if (!confirmed1) {
      yield { type: 'statusUpdate', state: 'failed', message: { role: 'agent', parts: [{ type: 'text', text: 'Incorrect stage 1 input.' }] } };
      return; // Stop processing
    }

    yield { type: 'statusUpdate', state: 'working', message: { role: 'agent', parts: [{ type: 'text', text: 'Stage 1 confirmed.' }] } };

    // --- Stage 2 Input ---
    log.debug("Processor asking for stage 2 input");
    const input2: ProcessorInputValue = yield {
       type: 'statusUpdate',
       state: 'input-required',
       message: { role: 'agent', parts: [{ type: 'text', text: 'Please provide stage 2 input: input2' }] }
    };
    log.debug({ input2 }, "Processor received stage 2 input");

    let confirmed2 = false;
    if (input2?.type === 'message' && input2.message.parts[0]?.type === 'text') {
        if (input2.message.parts[0].text.toLowerCase() === 'input2') {
            confirmed2 = true;
        }
    }

    if (!confirmed2) {
      yield { type: 'statusUpdate', state: 'failed', message: { role: 'agent', parts: [{ type: 'text', text: 'Incorrect stage 2 input.' }] } };
      return; // Stop processing
    }

    // --- Completion ---
    yield { type: 'statusUpdate', state: 'working', message: { role: 'agent', parts: [{ type: 'text', text: 'Stage 2 confirmed. Completing.' }] } };
    yield { type: 'artifact', artifactData: { name: 'two_stage_artifact', parts: [{ type: 'text', text: 'Task completed after two inputs.' }], index: 0, append: false, lastChunk: true } };
    yield { type: 'statusUpdate', state: 'completed' };
  }
};

// Processor to generate a predictable message history
const multiStepHistoryProcessor: TaskProcessorV2 = {
  canHandle: async () => true,
  process: async function* (context: ProcessorStepContext, initialParams: TaskSendParams) {
    yield { type: 'statusUpdate', state: 'working', message: { role: 'agent', parts: [{ type: 'text', text: 'Working Step 1' }] } };
    yield { type: 'statusUpdate', state: 'working', message: { role: 'agent', parts: [{ type: 'text', text: 'Working Step 2' }] } };

    // Request input
    const input: ProcessorInputValue = yield {
       type: 'statusUpdate',
       state: 'input-required',
       message: { role: 'agent', parts: [{ type: 'text', text: 'Input Required: Proceed?' }] }
    };

    let proceed = false;
    if (input?.type === 'message' && input.message.parts[0]?.type === 'text') {
        if (input.message.parts[0].text.toLowerCase() === 'proceed') {
            proceed = true;
        }
    }

    if (proceed) {
        yield { type: 'statusUpdate', state: 'working', message: { role: 'agent', parts: [{ type: 'text', text: 'Processing...' }] } };
        // No final artifact, just complete
        yield { type: 'statusUpdate', state: 'completed', message: { role: 'agent', parts: [{ type: 'text', text: 'Task Completed Successfully.'}] } }; // Add message on completion
    } else {
        yield { type: 'statusUpdate', state: 'failed', message: { role: 'agent', parts: [{ type: 'text', text: 'Did not proceed.' }] } };
    }
  }
};

// Mock SSE Manager - EXTEND the real one to pass instanceof check
class MockSseConnectionManager extends SseConnectionManager implements NotificationService {
  public notifications: (TaskStatusUpdateEvent | TaskArtifactUpdateEvent)[] = [];

  constructor() {
    super(); // Call base constructor
  }

  // Override methods needed for mocking
  override addSubscription(taskId: string, requestId: string | number | null, res: any): void {
    log.debug({ taskId, requestId }, "MockSSE: addSubscription");
    // Call super.addSubscription or manage internal state IF the mock needs to track subscriptions
    // For now, just logging is enough for the mock override.
    // super.addSubscription(taskId, requestId, res); // Optional
    // Store locally if needed for test verification, separate from base property
    // this.mockSubscriptions.set(...) 
  }

  override removeSubscription(taskId: string): void {
    log.debug({ taskId }, "MockSSE: removeSubscription");
    // super.removeSubscription(taskId); // Optional
  }

  override async notify(event: TaskStatusUpdateEvent | TaskArtifactUpdateEvent): Promise<void> {
    log.debug({ event }, "MockSSE: notify");
    this.notifications.push(event);
    return Promise.resolve();
  }

  // Test helpers
  getNotifications() {
    return this.notifications;
  }
  clearNotifications() {
    this.notifications = [];
  }
  getLastNotification() {
    return this.notifications[this.notifications.length - 1];
  }
}

describe("A2AServerCoreLite Lite Core", () => {
  let core: A2AServerCoreLite;
  let store: InMemoryTaskStore;
  let currentProcessor: TaskProcessorV2 = streamingDummyProcessor;
  let mockSseManager: MockSseConnectionManager; // Add mock manager instance

  beforeEach(() => {
    store = new InMemoryTaskStore();
    mockSseManager = new MockSseConnectionManager(); // Create new mock for each test
    core = new A2AServerCoreLite({
      agentCard: { name: 'TestAgent', url: 'http://x', capabilities: { streaming: true } },
      taskStore: store,
      processors: [currentProcessor],
      // Use the mock SSE manager
      notificationServices: [mockSseManager],
    });
    resumeHangingProcessor = null;
  });

  afterEach(() => {
     // Ensure hanging processor is resumed if test failed mid-way, preventing leaks
     if (resumeHangingProcessor) {
        resumeHangingProcessor();
        resumeHangingProcessor = null;
     }
     // Reset to default processor for next test
     currentProcessor = streamingDummyProcessor;
  });

  it("processes a send/get with streamed artifact chunks", async () => {
    const sendRes = await core.handleTaskSend({ message: { role: 'user', parts: [{ type: 'text', text: 'start streaming task' }] } });
    expect(sendRes.id).toBeDefined();

    // Poll until completed
    let final;
    for (let i = 0; i < 20; i++) {
      final = await core.handleTaskGet({ id: sendRes.id });
      if (final!.status.state === 'completed') break;
      await new Promise(r => setTimeout(r, 50)); // Longer wait needed for multi-yield processor
    }
    expect(final).toBeDefined();
    expect(final!.status.state).toBe('completed');
    expect(final!.artifacts).toHaveLength(1);
    const finalArtifact = final!.artifacts![0];
    expect(finalArtifact.name).toBe('streamed_art');
    expect(finalArtifact.parts).toHaveLength(2); // Two parts from two chunks
    expect(finalArtifact.parts[0].type).toBe('text');
    expect((finalArtifact.parts[0] as any).text).toBe('Chunk 1. ');
    expect(finalArtifact.parts[1].type).toBe('text');
    expect((finalArtifact.parts[1] as any).text).toBe('Chunk 2.');
    // Stored artifact should NOT have the streaming flags
    expect(finalArtifact.append).toBeUndefined();
    expect(finalArtifact.lastChunk).toBeUndefined();
  });

  it("stores and retrieves sessionId", async () => {
    const sessionId = `session-${Math.random()}`;
    const sendRes = await core.handleTaskSend({ sessionId: sessionId, message: { role: 'user', parts: [{ type: 'text', text: 'task with session' }] } });
    expect(sendRes.id).toBeDefined();
    expect(sendRes.sessionId).toBe(sessionId);

    const getRes = await core.handleTaskGet({ id: sendRes.id });
    expect(getRes.sessionId).toBe(sessionId);
  });

  it("retrieves task history via handleTaskGet", async () => {
    const sendRes = await core.handleTaskSend({ message: { role: 'user', parts: [{ type: 'text', text: 'task for history test' }] } });
    expect(sendRes.id).toBeDefined();

    // Poll until completed to ensure agent messages are potentially added
    let final;
    for (let i = 0; i < 20; i++) {
      final = await core.handleTaskGet({ id: sendRes.id });
      if (final!.status.state === 'completed') break;
      await new Promise(r => setTimeout(r, 50));
    }
    expect(final!.status.state).toBe('completed');

    // Get task with history
    const historyRes = await core.handleTaskGet({ id: sendRes.id, historyLength: 10 });
    expect(historyRes.history).toBeDefined();
    expect(historyRes.history!.length).toBeGreaterThanOrEqual(2); // User message + agent status message
    expect(historyRes.history![0].role).toBe('user');
    expect(historyRes.history![1].role).toBe('agent'); // The 'working' status message

    // Get task with limited history
    const limitedHistoryRes = await core.handleTaskGet({ id: sendRes.id, historyLength: 1 });
    expect(limitedHistoryRes.history).toBeDefined();
    expect(limitedHistoryRes.history!).toHaveLength(1); // Should get the most recent message (likely agent status)
  });

  it("handleTaskCancel on a hanging processor", async () => {
    currentProcessor = hangingProcessor; // Set processor for this test
    // Re-initialize core with the hanging processor for this specific test
    core = new A2AServerCoreLite({
      agentCard: { name: 'X', url: 'u', capabilities: { streaming: true } },
      taskStore: store,
      processors: [currentProcessor],
      notificationServices: [mockSseManager],
    });

    const res = await core.handleTaskSend({ message: { role: 'user', parts: [{ type: 'text', text: 'go hang' }] } });

    // Poll until the processor signals it's hanging
    let task = await core.handleTaskGet({ id: res.id });
    let messagePart: any;
    for (let i = 0; i < 20; i++) {
      messagePart = task.status.message?.parts[0];
      if (messagePart?.type === 'text' && messagePart.text === 'Hanging now') break;
      await new Promise(r => setTimeout(r, 50));
      task = await core.handleTaskGet({ id: res.id });
    }
    // Check the final part found
    expect(messagePart?.type).toBe('text');
    expect(messagePart?.text).toBe('Hanging now');
    expect(task.status.state).toBe('working');

    // Cancel the task
    const canceled = await core.handleTaskCancel({ id: res.id });
    expect(canceled.status.state).toBe('canceled');

    // Verify task is indeed canceled in store
    const final = await core.handleTaskGet({ id: res.id });
    expect(final.status.state).toBe('canceled');

    // Allow the original processor promise to resolve if needed (after cancellation)
    if (resumeHangingProcessor) {
       resumeHangingProcessor();
       await new Promise(r => setTimeout(r, 10)); // Give event loop time
    }

    // Re-check state, ensure it didn't revert or add artifacts
    const stateAfterResume = await core.handleTaskGet({ id: res.id });
    expect(stateAfterResume.status.state).toBe('canceled');
    expect(stateAfterResume.artifacts ?? []).toHaveLength(0);
  });

  it("stops processing if task is canceled while generator is suspended", async () => {
    currentProcessor = hangingProcessor; // Use the controllable processor
    core = new A2AServerCoreLite({
      agentCard: { name: 'TestAgent', url: 'http://x', capabilities: { streaming: true } },
      taskStore: store,
      processors: [currentProcessor],
      notificationServices: [mockSseManager],
    });

    const sendRes = await core.handleTaskSend({ message: { role: 'user', parts: [{ type: 'text', text: 'start controllable task' }] } });
    const taskId = sendRes.id;

    // Yield to the event loop, allowing the processor to run to its await point
    await new Promise(resolve => setImmediate(resolve));

    // Check the state after yielding
    let taskState = await core.handleTaskGet({ id: taskId });
    let messagePartState = taskState.status.message?.parts[0];
    // Check the final part found - should have yielded 'Hanging now'
    expect(messagePartState?.type).toBe('text');
    // Access text safely after checking type
    const textContent = (messagePartState?.type === 'text') ? messagePartState.text : undefined;
    expect(textContent).toBe('Hanging now');
    expect(taskState.status.state).toBe('working');

    // Now cancel
    const cancelRes = await core.handleTaskCancel({ id: taskId });
    expect(cancelRes.status.state).toBe('canceled');

    // Trigger the suspended processor to resume *after* cancellation
    const resolver = resumeHangingProcessor;
    expect(resolver).toBeInstanceOf(Function); // Ensure the resolver was captured
    if (resolver) resolver();

    // Yield again to allow drive loop to potentially run after resume
    await new Promise(resolve => setImmediate(resolve));

    // Verify state remains canceled and no post-cancel artifact was added
    const finalState = await core.handleTaskGet({ id: taskId });
    expect(finalState.status.state).toBe('canceled');
    expect(finalState.artifacts?.find(a => a.name === 'post_hang_artifact')).toBeUndefined();
  });

  it("handles multi-step task with input-required", async () => {
    currentProcessor = inputRequiredProcessor; // Use the new processor
    core = new A2AServerCoreLite({
      agentCard: { name: 'InputAgent', url: 'http://input', capabilities: { streaming: true } },
      taskStore: store,
      processors: [currentProcessor],
      notificationServices: [mockSseManager],
    });

    // 1. Start the task
    const sendRes1 = await core.handleTaskSend({ message: { role: 'user', parts: [{ type: 'text', text: 'start input task' }] } });
    const taskId = sendRes1.id;

    // 2. Wait for input-required state
    await new Promise(resolve => setImmediate(resolve)); // Yield for processor to run
    let taskState1 = await core.handleTaskGet({ id: taskId });
    // It might take more than one tick if processor yields multiple times before input-required
    for (let i=0; i < 5 && taskState1.status.state !== 'input-required'; ++i) {
      await new Promise(resolve => setImmediate(resolve));
      taskState1 = await core.handleTaskGet({ id: taskId });
    }

    expect(taskState1.status.state).toBe('input-required');
    const agentMessage = taskState1.status.message?.parts[0];
    expect(agentMessage?.type).toBe('text');
    expect((agentMessage as any)?.text).toBe('Please provide input: confirm');

    // 3. Send the required input
    const sendRes2 = await core.handleTaskSend({
      id: taskId, // Use the same task ID
      message: { role: 'user', parts: [{ type: 'text', text: 'confirm' }] }
    });
    // Check immediate response status (might still be input-required or working)
    expect(['input-required', 'working']).toContain(sendRes2.status.state);

    // 4. Wait for completion
    await new Promise(resolve => setImmediate(resolve));
    let taskState2 = await core.handleTaskGet({ id: taskId });

    expect(taskState2.status.state).toBe('completed');
    expect(taskState2.artifacts).toHaveLength(1);
    expect(taskState2.artifacts?.[0].name).toBe('final_artifact');
    const artifactPart = taskState2.artifacts?.[0].parts[0];
    expect(artifactPart?.type).toBe('text');
    expect((artifactPart as any)?.text).toContain('completed after input');
  });

  it("handles two-stage input-required task", async () => {
    currentProcessor = twoStageInputProcessor; // Use the two-stage processor
    core = new A2AServerCoreLite({
      agentCard: { name: 'TwoStageAgent', url: 'http://twostage', capabilities: { streaming: true } },
      taskStore: store,
      processors: [currentProcessor],
      notificationServices: [mockSseManager],
    });

    // 1. Start the task
    const sendRes1 = await core.handleTaskSend({ message: { role: 'user', parts: [{ type: 'text', text: 'start two-stage task' }] } });
    const taskId = sendRes1.id;

    // 2. Wait for stage 1 input-required
    await new Promise(resolve => setImmediate(resolve)); // Yield for processor to run
    let taskState1 = await core.handleTaskGet({ id: taskId });
    expect(taskState1.status.state).toBe('input-required');
    let agentMessage1 = taskState1.status.message?.parts[0];
    expect(agentMessage1?.type).toBe('text');
    expect((agentMessage1 as any)?.text).toBe('Please provide stage 1 input: input1');

    // 3. Send stage 1 input
    await core.handleTaskSend({
      id: taskId, // Use the same task ID
      message: { role: 'user', parts: [{ type: 'text', text: 'input1' }] }
    });

    // 4. Wait for stage 2 input-required
    await new Promise(resolve => setImmediate(resolve)); // Yield for processor resume
    let taskState2 = await core.handleTaskGet({ id: taskId });
    // Add extra tick check in case multiple yields happen
    if (taskState2.status.state !== 'input-required') {
       await new Promise(resolve => setImmediate(resolve));
       taskState2 = await core.handleTaskGet({ id: taskId });
    }
    expect(taskState2.status.state).toBe('input-required');
    let agentMessage2 = taskState2.status.message?.parts[0];
    expect(agentMessage2?.type).toBe('text');
    expect((agentMessage2 as any)?.text).toBe('Please provide stage 2 input: input2');

    // 5. Send stage 2 input
    await core.handleTaskSend({
      id: taskId, // Use the same task ID
      message: { role: 'user', parts: [{ type: 'text', text: 'input2' }] }
    });

    // 6. Wait for completion
    await new Promise(resolve => setImmediate(resolve)); // Yield for processor resume
    let taskState3 = await core.handleTaskGet({ id: taskId });
    // Add extra tick check in case multiple yields happen
    if (taskState3.status.state !== 'completed') {
        await new Promise(resolve => setImmediate(resolve));
        taskState3 = await core.handleTaskGet({ id: taskId });
    }
    expect(taskState3.status.state).toBe('completed');
    expect(taskState3.artifacts).toHaveLength(1);
    expect(taskState3.artifacts?.[0].name).toBe('two_stage_artifact');
    const artifactPart = taskState3.artifacts?.[0].parts[0];
    expect(artifactPart?.type).toBe('text');
    expect((artifactPart as any)?.text).toContain('completed after two inputs');
  });

  it("throws on unsupported pushNotification endpoints", async () => {
    await expect(core.handleSetPushNotification({ id: '00000000-0000-0000-0000-000000000000', pushNotificationConfig: { url: 'http://foo.bar'}})).rejects.toBeInstanceOf(A2AError);
    await expect(core.handleGetPushNotification({ id: '00000000-0000-0000-0000-000000000000' })).rejects.toBeInstanceOf(A2AError);
  });

  it("handles tasks/sendSubscribe and sends SSE events", async () => {
    currentProcessor = streamingDummyProcessor; // Ensure correct processor
    // Re-init core explicitly for clarity, though beforeEach does it
    core = new A2AServerCoreLite({
      agentCard: { name: 'TestAgent', url: 'http://x', capabilities: { streaming: true } },
      taskStore: store, processors: [currentProcessor], notificationServices: [mockSseManager]
    });

    const message = { role: 'user', parts: [{ type: 'text', text: 'start sse task' }] };
    const requestId = 'req-sse-1';
    // Call sendSubscribe - pass null for response object as mock doesn't use it
    await core.handleTaskSendSubscribe(requestId, { message }, null as any);
    expect(mockSseManager.notifications.length).toBeGreaterThanOrEqual(1); // Ensure at least one notification
    const taskId = mockSseManager.notifications[0]?.id;
    expect(taskId).toBeDefined();
    const taskIdStr = taskId!;

    // Wait for task completion by polling (more robustly)
    let finalTaskStateGet;
    for (let i=0; i < 20; ++i) {
        finalTaskStateGet = await core.handleTaskGet({ id: taskIdStr });
        if (finalTaskStateGet.status.state === 'completed') break;
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    expect(finalTaskStateGet?.status.state).toBe('completed');

    // --- Check SSE Notifications --- 
    const notifications = mockSseManager.getNotifications();
    expect(notifications.length).toBeGreaterThanOrEqual(4);

    // Find initial submitted status
    const n1 = notifications.find(n => (n as TaskStatusUpdateEvent).status?.state === 'submitted') as TaskStatusUpdateEvent | undefined;
    expect(n1).toBeDefined();
    expect(n1?.id).toBe(taskIdStr);
    expect(n1?.final).toBe(false);

    // Find working status
    const workingNotification = notifications.find(n => (n as TaskStatusUpdateEvent).status?.state === 'working') as TaskStatusUpdateEvent | undefined;
    expect(workingNotification).toBeDefined();
    expect(workingNotification?.id).toBe(taskIdStr);
    expect(workingNotification?.final).toBe(false);

    // Find artifact chunk 1 notification
    const artifact1Event = notifications.find(n => {
        const artifact = (n as TaskArtifactUpdateEvent).artifact;
        const part = artifact?.parts[0];
        return artifact?.name === 'streamed_art' && 
               part?.type === 'text' && 
               part.text === 'Chunk 1. ';
    }) as TaskArtifactUpdateEvent | undefined;
    expect(artifact1Event).toBeDefined();
    expect(artifact1Event?.id).toBe(taskIdStr);
    // Verify flags for the FIRST chunk event
    expect(artifact1Event?.artifact.append).toBe(false); 
    expect(artifact1Event?.artifact.lastChunk).toBe(false);

    // Find artifact chunk 2 notification
    const artifact2Event = notifications.find(n => {
        const artifact = (n as TaskArtifactUpdateEvent).artifact;
        const part = artifact?.parts[1]; // Second part added
        return artifact?.name === 'streamed_art' && 
               part?.type === 'text' && 
               part.text === 'Chunk 2.';
    }) as TaskArtifactUpdateEvent | undefined;
    expect(artifact2Event).toBeDefined();
    expect(artifact2Event?.id).toBe(taskIdStr);
     // Verify flags for the SECOND (appending, last) chunk event
    expect(artifact2Event?.artifact.append).toBe(true);
    expect(artifact2Event?.artifact.lastChunk).toBe(true);

    // Find final completed status
    const n_final = notifications.find(n => (n as TaskStatusUpdateEvent).status?.state === 'completed') as TaskStatusUpdateEvent | undefined;
    expect(n_final).toBeDefined();
    expect(n_final?.id).toBe(taskIdStr);
    expect(n_final?.final).toBe(true);

    // --- Check Final Stored Task State via tasks/get ---
    expect(finalTaskStateGet).toBeDefined();
    expect(finalTaskStateGet!.artifacts).toHaveLength(1);
    const finalStoredArtifact = finalTaskStateGet!.artifacts![0];
    expect(finalStoredArtifact.name).toBe('streamed_art');
    expect(finalStoredArtifact.parts).toHaveLength(2);
    // Check parts content safely
    const part0 = finalStoredArtifact.parts[0];
    const part1 = finalStoredArtifact.parts[1];
    expect(part0?.type).toBe('text');
    if (part0?.type === 'text') {
        expect(part0.text).toBe('Chunk 1. ');
    }
    expect(part1?.type).toBe('text');
    if (part1?.type === 'text') {
        expect(part1.text).toBe('Chunk 2.');
    }
    // Check that streaming flags are NOT stored on the final artifact
    expect(finalStoredArtifact.append).toBeUndefined();
    expect(finalStoredArtifact.lastChunk).toBeUndefined();
  });

  it("handles tasks/resubscribe and sends current state then updates", async () => {
    // Use the hanging processor to ensure task is paused during resubscribe
    currentProcessor = hangingProcessor;
    core = new A2AServerCoreLite({
      agentCard: { name: 'TestAgent', url: 'http://x', capabilities: { streaming: true } },
      taskStore: store, processors: [currentProcessor], notificationServices: [mockSseManager]
    });

    // 1. Start task normally
    const sendRes = await core.handleTaskSend({ message: { role: 'user', parts: [{ type: 'text', text: 'start then resubscribe' }] } });
    const taskId = sendRes.id;
    expect(taskId).toBeDefined();
    const taskIdStr = taskId!;

    // 2. Wait until the processor signals it's hanging
    let task = await core.handleTaskGet({ id: taskIdStr });
    let messagePart: any;
    for (let i = 0; i < 20; i++) {
      messagePart = task.status.message?.parts[0];
      if (messagePart?.type === 'text' && messagePart.text === 'Hanging now') break;
      await new Promise(r => setTimeout(r, 10)); // Short poll
      task = await core.handleTaskGet({ id: taskIdStr });
    }
    expect(task.status.state).toBe('working');
    // Safely check the message text
    expect(messagePart?.type).toBe('text');
    // Check text only if it's a text part
    if (messagePart?.type === 'text') {
        expect(messagePart.text).toBe('Hanging now');
    }

    // Clear notifications received *before* resubscribe
    mockSseManager.clearNotifications();

    // 3. Resubscribe while task is hanging
    const requestId = 'req-resub-1';
    await core.handleTaskResubscribe(requestId, { id: taskIdStr }, null as any);

    // 4. Check immediate notification contains current hanging state
    const initialNotifications = mockSseManager.getNotifications();
    expect(initialNotifications.length).toBe(1);
    const n1 = initialNotifications[0] as TaskStatusUpdateEvent;
    expect(n1.id).toBe(taskIdStr);
    expect(n1.status.state).toBe('working');
    // Safely check the message text in the notification
    const n1MessagePart = n1.status.message?.parts[0];
    expect(n1MessagePart?.type).toBe('text');
    // Check text only if it's a text part
    if (n1MessagePart?.type === 'text') {
        expect(n1MessagePart.text).toBe('Hanging now');
    }
    expect(n1.final).toBe(false);

    mockSseManager.clearNotifications(); // Clear for subsequent checks

    // 5. Resume the processor
    const resolver = resumeHangingProcessor;
    expect(resolver).toBeInstanceOf(Function);
    if (resolver) resolver();

    // 6. Wait for task completion
    let finalTaskState;
    for (let i=0; i < 20; ++i) {
        finalTaskState = await core.handleTaskGet({ id: taskIdStr });
        if (finalTaskState.status.state === 'completed') break;
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    expect(finalTaskState?.status.state).toBe('completed');

    // 7. Check subsequent notifications were received after resume
    const subsequentNotifications = mockSseManager.getNotifications();
    // Should get post-hang artifact and completed status
    expect(subsequentNotifications.length).toBeGreaterThanOrEqual(2);

    const sn1 = subsequentNotifications.find(n => 
        (n as TaskArtifactUpdateEvent).artifact?.name === 'post_hang_artifact'
    ) as TaskArtifactUpdateEvent | undefined;
    expect(sn1).toBeDefined();

    const sn_final = subsequentNotifications.find(n => 
        (n as TaskStatusUpdateEvent).status?.state === 'completed'
    ) as TaskStatusUpdateEvent | undefined;
    expect(sn_final).toBeDefined();
    expect(sn_final?.final).toBe(true);
  });

  it("retrieves correct task history slice via tasks/get", async () => {
    currentProcessor = multiStepHistoryProcessor; // Use the history processor
    core = new A2AServerCoreLite({
      agentCard: { name: 'HistoryAgent', url: 'http://history', capabilities: { streaming: true } },
      taskStore: store,
      processors: [currentProcessor],
      notificationServices: [mockSseManager],
    });

    const initialMessageContent = { role: 'user', parts: [{ type: 'text', text: 'Start History Task' }] };
    const proceedMessageContent = { role: 'user', parts: [{ type: 'text', text: 'Proceed' }] };

    // 1. Start task - Wrap message in params object
    const sendRes1 = await core.handleTaskSend({ message: initialMessageContent });
    const taskId = sendRes1.id;
    expect(taskId).toBeDefined();
    const taskIdStr = taskId!;

    // 2. Wait for input-required
    let taskState1;
    for (let i=0; i < 10; ++i) {
        taskState1 = await core.handleTaskGet({ id: taskIdStr });
        if (taskState1.status.state === 'input-required') break;
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    expect(taskState1?.status.state).toBe('input-required');

    // 3. Send proceed message - Wrap message in params object
    await core.handleTaskSend({ id: taskIdStr, message: proceedMessageContent });

    // 4. Wait for completion
    let finalTaskState;
    for (let i=0; i < 20; ++i) {
        finalTaskState = await core.handleTaskGet({ id: taskIdStr });
        if (finalTaskState.status.state === 'completed') break;
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    expect(finalTaskState?.status.state).toBe('completed');

    // --- Verify History --- 

    // 5. Get with historyLength = 0 (or undefined)
    const noHistoryTask = await core.handleTaskGet({ id: taskIdStr });
    // Expect undefined OR an empty array for the default case
    expect(!noHistoryTask.history || noHistoryTask.history.length === 0).toBe(true);

    const zeroHistoryTask = await core.handleTaskGet({ id: taskIdStr, historyLength: 0 });
    // Expect undefined OR an empty array when explicitly asking for 0
    expect(!zeroHistoryTask.history || zeroHistoryTask.history.length === 0).toBe(true);

    // 6. Get with historyLength = 3
    const partialHistoryTask = await core.handleTaskGet({ id: taskIdStr, historyLength: 3 });
    expect(partialHistoryTask.history).toBeDefined();
    expect(partialHistoryTask.history).toHaveLength(3);
    const hist3 = partialHistoryTask.history!;
    // Check last 3 messages
    expect(hist3[0].role).toBe('user');
    expect(hist3[0].parts[0]?.type).toBe('text');
    if (hist3[0].parts[0]?.type === 'text') expect(hist3[0].parts[0]?.text).toBe('Proceed');
    expect(hist3[1].role).toBe('agent');
    expect(hist3[1].parts[0]?.type).toBe('text');
    if (hist3[1].parts[0]?.type === 'text') expect(hist3[1].parts[0]?.text).toBe('Processing...');
    expect(hist3[2].role).toBe('agent');
    expect(hist3[2].parts[0]?.type).toBe('text');
    if (hist3[2].parts[0]?.type === 'text') expect(hist3[2].parts[0]?.text).toBe('Task Completed Successfully.');

    // 7. Get with historyLength = 20 (more than total)
    const fullHistoryTask = await core.handleTaskGet({ id: taskIdStr, historyLength: 20 });
    expect(fullHistoryTask.history).toBeDefined();
    const fullHistory = fullHistoryTask.history!;
    expect(fullHistory).toHaveLength(7);
    
    // Helper function for safe checking
    const checkTextPart = (part: any, expectedText: string) => {
      expect(part?.type).toBe('text');
      if (part?.type === 'text') expect(part.text).toBe(expectedText);
    };

    expect(fullHistory[0].role).toBe('user');
    checkTextPart(fullHistory[0].parts[0], 'Start History Task');
    expect(fullHistory[1].role).toBe('agent');
    checkTextPart(fullHistory[1].parts[0], 'Working Step 1');
    expect(fullHistory[2].role).toBe('agent');
    checkTextPart(fullHistory[2].parts[0], 'Working Step 2');
    expect(fullHistory[3].role).toBe('agent');
    checkTextPart(fullHistory[3].parts[0], 'Input Required: Proceed?');
    expect(fullHistory[4].role).toBe('user');
    checkTextPart(fullHistory[4].parts[0], 'Proceed');
    expect(fullHistory[5].role).toBe('agent');
    checkTextPart(fullHistory[5].parts[0], 'Processing...');
    expect(fullHistory[6].role).toBe('agent');
    checkTextPart(fullHistory[6].parts[0], 'Task Completed Successfully.');

  });

});


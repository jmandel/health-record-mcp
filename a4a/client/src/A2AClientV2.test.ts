import { it, expect, describe } from "bun:test";
import sinon from "sinon";
import fastDeepEqual from "fast-deep-equal/es6";
import { TextEncoder } from "node:util";
import { A2AClient, type ClientManagedState } from "./A2AClientV2";
import type { Task, TaskStatus, Artifact, TextPart } from "./types";

/*──────────────── helpers ────────────────*/

function mkArtifact(idx: number, text: string): Artifact {
  return { index: idx, parts: [{ type: "text", text }] } as Artifact;
}
function mkTask(patch: Partial<Task> = {}): Task {
  return {
    id: "t1",
    status: { state: "working", timestamp: new Date().toISOString() } as TaskStatus,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...patch,
  } as Task;
}

/* build a minimal text/event‑stream */
function mkSSE(events: any[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const ev of events) controller.enqueue(enc.encode(`data: ${JSON.stringify(ev)}\n\n`));
      controller.close();
    },
  });
}

/**
 * Install a single global fetch stub for the current test.
 *  • Agent card GETs are auto‑matched.
 *  • Other calls must appear in the queue in order.
 */
function withFetchQueue(
  queue: { method: string; res: Response }[],
  fn: () => Promise<void>,
) {
  const cardResp = new Response(
    JSON.stringify({
      name: "dummy",
      description: "",
      url: "http://dummy",
      version: "1.0",
      authentication: { schemes: [] },
      capabilities: { streaming: true },
      defaultInputModes: ["text/plain"],
      defaultOutputModes: ["text/plain"],
      skills: [],
    }),
    { headers: { "content-type": "application/json" } },
  );

  const stub = sinon.stub(globalThis, "fetch").callsFake(async (input: any, init?: RequestInit) => {
    // agent card: simple GET
    if (typeof input === "string" && input.endsWith("/.well-known/agent.json")) {
      return cardResp.clone();
    }

    if (queue.length === 0) throw new Error("Unexpected fetch – queue empty");

    const next = queue.shift()!;
    const body = init?.body ? JSON.parse(init!.body as string) : {};
    if (body.method !== next.method) {
      throw new Error(`Expected JSON‑RPC method ${next.method}, got ${body.method}`);
    }
    return next.res;
  });

  return fn().finally(() => {
    stub.restore();
    if (queue.length) throw new Error("Unused mock responses remain");
  });
}

/*──────────────── TESTS ────────────────*/

describe("fast-deep-equal sanity", () => {
  it("matches equal objects and rejects different ones", () => {
    expect(fastDeepEqual({ a: 1 }, { a: 1 })).toBe(true);
    expect(fastDeepEqual({ a: 1 }, { a: 2 })).toBe(false);
  });
});

/* Optional internal diff unit if hook present */
const internal = (A2AClient as any).__test__;
if (internal?.TaskStore) {
  describe("TaskStore diffing unit", () => {
    it("emits add / change / delete", () => {
      const store = new internal.TaskStore();
      const added: number[] = [];
      const removed: number[] = [];

      store.on("artifact-update", (p: any) => {
        (p.removed ? removed : added).push(p.artifact.index);
      });

      store.apply(mkTask({ artifacts: [mkArtifact(0, "a")] }));
      store.apply(mkTask({ artifacts: [mkArtifact(0, "b")] }));
      store.apply(mkTask({ artifacts: [] }));

      expect(added).toEqual([0, 0]);
      expect(removed).toEqual([0]);
    });
  });
}

/* Polling life‑cycle */
describe("Polling lifecycle", () => {
  it("closes when task becomes completed", async () => {
    const working = mkTask();
    const done = mkTask({
      status: { state: "completed", timestamp: new Date().toISOString() },
    });

    await withFetchQueue(
      [
        {
          method: "tasks/send",
          res: new Response(
            JSON.stringify({ jsonrpc: "2.0", id: 1, result: working }),
            { headers: { "content-type": "application/json" } },
          ),
        },
        {
          method: "tasks/get",
          res: new Response(
            JSON.stringify({ jsonrpc: "2.0", id: 2, result: done }),
            { headers: { "content-type": "application/json" } },
          ),
        },
      ],
      async () => {
        const events: string[] = [];
        const client = await A2AClient.start(
          "http://dummy",
          { id: "t1", message: { role: "user", parts: [{ type: "text", text: "hi" }] } },
          { forcePoll: true, getAuthHeaders: () => ({}) },
        );
        client.on("status-update", () => events.push("status"));
        client.on("close", () => events.push("close"));

        await Bun.sleep(20);
        expect(events).toEqual(["status", "status", "close"]);
        client.close();
      },
    );
  });

  it("Polling - transitions to input-required and stops polling", async () => {
    const workingTask = mkTask({ status: { state: 'working', timestamp: 'ts1' } });
    const inputReqTask = mkTask({
        status: { state: 'input-required', message: { role: 'agent', parts: [{type: 'text', text:'Need input'}]}, timestamp: 'ts2' }
    });

    await withFetchQueue(
      [
        // 1. tasks/send response
        { method: "tasks/send", res: new Response(JSON.stringify({ result: workingTask })) },
        // 2. tasks/get response (immediate after send)
        { method: "tasks/get", res: new Response(JSON.stringify({ result: workingTask })) },
        // 3. tasks/get response (first actual poll)
        { method: "tasks/get", res: new Response(JSON.stringify({ result: inputReqTask })) },
        // Queue should be empty after this, proving polling stopped
      ],
      async () => {
        const statusEvents: TaskStatus[] = [];
        let closeEmitted = false;

        const client = A2AClient.start(
          "http://dummy/poll",
          { id: "t_poll_input", message: { role: "user", parts: [] } },
          { forcePoll: true, pollInterval: 10, getAuthHeaders: () => ({}) }
        );

        client.on("status-update", (p) => statusEvents.push(p.status));
        client.on("close", () => closeEmitted = true);

        // Allow time for send -> get -> first poll -> get
        await Bun.sleep(50);

        // Verify events
        expect(statusEvents.length).toBe(2);
        expect(statusEvents[0]!.state).toBe('working');
        expect(statusEvents[1]!.state).toBe('input-required');
        expect((statusEvents[1]!.message?.parts[0] as TextPart | undefined)?.text).toBe('Need input');

        // Verify client state (indirectly - polling should stop)
        expect(client.getCurrentState()).toBe('input-required');
        expect(closeEmitted).toBe(false); // Should not close

        // Queue being empty verified by withFetchQueue finally block

        client.close(); // Clean up
      },
    );
  });

  // --- NEW TEST: Polling Resume --- 
  it("Polling - Resuming an active task", async () => {
    const initialWorking = mkTask({ id: "t_poll_resume", status: { state: 'working', timestamp: 'ts_initial' } });
    const updatedWorkingWithArt = mkTask({ 
      id: "t_poll_resume", 
      status: { state: 'working', timestamp: 'ts_art' }, 
      artifacts: [mkArtifact(0, "art_resumed")] 
    });
    const finalCompleted = mkTask({ 
      id: "t_poll_resume", 
      status: { state: 'completed', timestamp: 'ts_final' }, 
      artifacts: [mkArtifact(0, "art_resumed")] 
    });

    await withFetchQueue(
      [
        // 1. Initial tasks/get (from resume)
        { method: "tasks/get", res: new Response(JSON.stringify({ result: initialWorking })) },
        // 2. First poll tasks/get
        { method: "tasks/get", res: new Response(JSON.stringify({ result: updatedWorkingWithArt })) },
        // 3. Second poll tasks/get
        { method: "tasks/get", res: new Response(JSON.stringify({ result: finalCompleted })) },
      ],
      async () => {
        const statusSpy = sinon.spy();
        const artifactSpy = sinon.spy();
        const closeSpy = sinon.spy();

        const client = A2AClient.resume(
          "http://dummy/poll_resume",
          "t_poll_resume",
          { forcePoll: true, pollInterval: 10, getAuthHeaders: () => ({}) }
        );

        client.on("status-update", statusSpy);
        client.on("artifact-update", artifactSpy);
        client.on("close", closeSpy);

        // Allow time for initial get + two polls
        await Bun.sleep(50); 

        // Verify events
        expect(statusSpy.callCount).toBe(3); // init working, updated working, completed
        expect(statusSpy.getCall(0).args[0].status.timestamp).toBe('ts_initial');
        expect(statusSpy.getCall(1).args[0].status.timestamp).toBe('ts_art');
        expect(statusSpy.getCall(2).args[0].status.state).toBe('completed');
        
        expect(artifactSpy.callCount).toBe(1); // Only when T2 applied
        expect(artifactSpy.getCall(0).args[0].artifact.parts[0].text).toBe("art_resumed");

        expect(closeSpy.callCount).toBe(1);
        expect(client.getCurrentState()).toBe('closed');

        client.close(); 
      },
    );
  });

  // --- NEW TEST: Polling Send --- 
  it("Polling - Send after input-required", async () => {
    const inputReqTask = mkTask({ 
      id: "t_poll_send", 
      status: { state: 'input-required', message: { role: 'agent', parts: [{type: 'text', text:'Need input'}]}, timestamp: 'ts_input' } 
    });
    const workingAfterSend = mkTask({ 
      id: "t_poll_send", 
      status: { state: 'working', timestamp: 'ts_working' } 
    });
    const finalCompleted = mkTask({ 
      id: "t_poll_send", 
      status: { state: 'completed', timestamp: 'ts_final' } 
    });

    await withFetchQueue(
      [
        // --- Phase 1: Start -> Input Required --- 
        { method: "tasks/send", res: new Response(JSON.stringify({ result: inputReqTask })) }, // Initial send responds with input-required directly
        { method: "tasks/get", res: new Response(JSON.stringify({ result: inputReqTask })) }, // Immediate GET confirms input-required
        
        // --- Phase 2: Send -> Working -> Completed --- 
        { method: "tasks/send", res: new Response(JSON.stringify({ result: workingAfterSend })) }, // Response to client.send
        { method: "tasks/get", res: new Response(JSON.stringify({ result: workingAfterSend })) }, // Immediate GET after send
        { method: "tasks/get", res: new Response(JSON.stringify({ result: finalCompleted })) },   // Next poll GET
      ],
      async () => {
        const statusSpy = sinon.spy();
        const closeSpy = sinon.spy();
        
        const client = A2AClient.start(
          "http://dummy/poll_send",
          { id: "t_poll_send", message: { role: "user", parts: [] } },
          { forcePoll: true, pollInterval: 10, getAuthHeaders: () => ({}) }
        );

        client.on("status-update", statusSpy);
        client.on("close", closeSpy);

        // Allow time for Phase 1 (start -> input-required)
        await Bun.sleep(30); 
        expect(client.getCurrentState()).toBe('input-required');
        expect(statusSpy.callCount).toBe(1); 
        expect(statusSpy.getCall(0).args[0].status.state).toBe('input-required');

        // --- Trigger Phase 2 --- 
        await client.send({ role: 'user', parts: [{ type: 'text', text: 'some input' }] });

        // Allow time for Phase 2 (send -> get -> poll -> get -> close)
        await Bun.sleep(50); 

        // Verify final state and events
        expect(client.getCurrentState()).toBe('closed');
        expect(statusSpy.callCount).toBe(3); // input-req, working, completed
        expect(statusSpy.getCall(1).args[0].status.state).toBe('working');
        expect(statusSpy.getCall(2).args[0].status.state).toBe('completed');
        expect(closeSpy.callCount).toBe(1);

        client.close(); 
      },
    );
  });

  // --- NEW TEST: Polling Cancellation --- 
  it("Polling - Cancellation during active polling", async () => {
    const workingTask = mkTask({ id: "t_poll_cancel", status: { state: 'working', timestamp: 'ts_working' } });
    const canceledTask = mkTask({ id: "t_poll_cancel", status: { state: 'canceled', timestamp: 'ts_canceled' } });

    await withFetchQueue(
      [
        // 1. Initial tasks/send 
        { method: "tasks/send", res: new Response(JSON.stringify({ result: workingTask })) },
        // 2. Immediate tasks/get after send
        { method: "tasks/get", res: new Response(JSON.stringify({ result: workingTask })) },
        // 3. First poll tasks/get 
        { method: "tasks/get", res: new Response(JSON.stringify({ result: workingTask })) },
        
        // --- Cancellation Phase --- 
        // 4. tasks/cancel (from client.cancel)
        { method: "tasks/cancel", res: new Response(JSON.stringify({ result: { id: "t_poll_cancel" } })) },
        // 5. tasks/get (from client.cancel)
        { method: "tasks/get", res: new Response(JSON.stringify({ result: canceledTask })) },
        // Queue should be empty after this
      ],
      async () => {
        const statusSpy = sinon.spy();
        const closeSpy = sinon.spy();
        
        const client = A2AClient.start(
          "http://dummy/poll_cancel",
          { id: "t_poll_cancel", message: { role: "user", parts: [] } },
          { forcePoll: true, pollInterval: 10, getAuthHeaders: () => ({}) }
        );

        client.on("status-update", statusSpy);
        client.on("close", closeSpy);

        // Allow time for initial send/get and first poll
        await Bun.sleep(30); 
        expect(client.getCurrentState()).toBe('polling'); 
        expect(statusSpy.callCount).toBe(1); // Only one 'working' status due to diffing
        expect(statusSpy.getCall(0).args[0].status.state).toBe('working');

        // --- Trigger Cancel --- 
        await client.cancel();

        // Allow time for cancel -> get -> close
        await Bun.sleep(50); // Increased sleep duration

        // Verify final state and events
        expect(client.getCurrentState()).toBe('closed');
        expect(statusSpy.callCount).toBe(2); // working, then canceled
        expect(statusSpy.getCall(1).args[0].status.state).toBe('canceled');
        expect(closeSpy.callCount).toBe(1);

        client.close(); 
      },
    );
  });

  // --- NEW TEST: Polling Errors --- 
  it("Polling - Retries on error and eventually fails", async () => {
    const workingTask = mkTask({ id: "t_poll_error", status: { state: 'working', timestamp: 'ts_working' } });
    const errorResponse = new Response("Internal Server Error", { status: 500 });

    await withFetchQueue(
      [
        // 1. Initial tasks/send 
        { method: "tasks/send", res: new Response(JSON.stringify({ result: workingTask })) },
        // 2. Immediate tasks/get after send
        { method: "tasks/get", res: new Response(JSON.stringify({ result: workingTask })) },
        // 3. First poll tasks/get -> Error
        { method: "tasks/get", res: errorResponse.clone() },
        // 4. Second poll tasks/get (Retry 1) -> Error
        { method: "tasks/get", res: errorResponse.clone() },
        // 5. Third poll tasks/get (Retry 2) -> Error
        { method: "tasks/get", res: errorResponse.clone() },
        // Queue should be empty after this (max errors reached)
      ],
      async () => {
        const statusSpy = sinon.spy();
        const errorSpy = sinon.spy();
        const closeSpy = sinon.spy();
        
        // Default pollMaxErrors is 3
        const client = A2AClient.start(
          "http://dummy/poll_error",
          { id: "t_poll_error", message: { role: "user", parts: [] } },
          { forcePoll: true, pollInterval: 5, getAuthHeaders: () => ({}) }
        );

        client.on("status-update", statusSpy);
        client.on("error", errorSpy);
        client.on("close", closeSpy);

        // Allow time for initial send/get and 3 failed polls
        await Bun.sleep(50); 

        // Verify events
        expect(statusSpy.callCount).toBe(1); // Only initial working status
        expect(statusSpy.getCall(0).args[0].status.state).toBe('working');

        expect(errorSpy.callCount).toBe(1); // Error emitted after max retries
        expect(errorSpy.getCall(0).args[0]).toBeInstanceOf(Error); // Check it's an Error
        expect((errorSpy.getCall(0).args[0] as Error).message).toContain("Polling failed");

        expect(closeSpy.callCount).toBe(1);
        expect(client.getCurrentState()).toBe('error');

        client.close(); 
      },
    );
  });
  // --- END NEW TEST --- 

});

/* SSE life‑cycle */
describe("SSE lifecycle", () => {
  it("streams artifact trigger, gets final state, and closes on final=true", async () => {
    // Task state returned by the FINAL tasks/get
    const completedTaskWithArtifact = mkTask({
      status: { state: "completed", timestamp: new Date().toISOString() },
      artifacts: [mkArtifact(0, "p1")], // Artifact included in final state
    });

    // SSE stream sends an artifact trigger, then a final status trigger
    const sseStream = mkSSE([
      // 1. Artifact event (only triggers a GET)
      { result: { id: "t1", artifact: mkArtifact(0, "p1") } }, 
      // 2. Final status event (triggers final GET and close)
      { result: { id: "t1", status: completedTaskWithArtifact.status, final: true } },
    ]);

    await withFetchQueue(
      [
        // 1. Initial tasks/sendSubscribe request
        {
          method: "tasks/sendSubscribe",
          res: new Response(sseStream as any, { 
            status: 200, 
            headers: { "content-type": "text/event-stream" },
          }),
        },
        // 2. tasks/get triggered by the artifact SSE event
        //    (Return a basic working task, maybe without the artifact yet)
        { 
          method: "tasks/get", 
          res: new Response(JSON.stringify({ result: mkTask({ id: 't1', status: {state: 'working', timestamp: 'ts_working'} }) })) 
        },
        // 3. tasks/get triggered by the final=true SSE event
        {
          method: "tasks/get",
          res: new Response(
            JSON.stringify({ jsonrpc: "2.0", id: 3, result: completedTaskWithArtifact }),
            { headers: { "content-type": "application/json" } },
          ),
        },
      ],
      async () => {
        const statusSpy = sinon.spy();
        const artifactSpy = sinon.spy();
        const closeSpy = sinon.spy();

        const client = A2AClient.start(
          "http://dummy/sse",
          { id: "t1", message: { role: "user", parts: [{ type: "text", text: "hi" }] } },
          { getAuthHeaders: () => ({}) }
        );

        client.on("status-update", statusSpy);
        client.on("artifact-update", artifactSpy);
        client.on("close", closeSpy);

        // Allow time for SSE stream processing and GETs
        await Bun.sleep(50); 

        // Verify: 
        // - Artifact event emitted ONLY when final state applied
        // - Status updates for initial working (from GET#2) and final completed (from GET#3)
        // - Close event emitted
        expect(artifactSpy.callCount).toBe(1); // Only one, from the final GET
        expect(artifactSpy.getCall(0).args[0].artifact.parts[0].text).toBe("p1");
        
        expect(statusSpy.callCount).toBe(2); // working (from GET#2), completed (from GET#3)
        expect(statusSpy.getCall(0).args[0].status.state).toBe('working');
        expect(statusSpy.getCall(1).args[0].status.state).toBe('completed');

        expect(closeSpy.callCount).toBe(1);
        expect(client.getCurrentState()).toBe('closed');

        client.close(); // Ensure cleanup if test fails before close
      },
    );
  });

  // --- NEW TEST: SSE Resume --- 
  it("SSE - Resuming an existing task", async () => {
    const initialWorkingTask = mkTask({ id: "t_resume", status: { state: "working", timestamp: "ts_initial" } });
    const workingTaskWithArtifact = mkTask({
        id: "t_resume",
        status: { state: "working", timestamp: "ts_artifact" },
        artifacts: [mkArtifact(0, "artifact1")]
    });
    const finalCompletedTask = mkTask({
        id: "t_resume",
        status: { state: "completed", timestamp: "ts_final" },
        artifacts: [mkArtifact(0, "artifact1")]
    });

    // SSE stream just sends triggers after resubscribe
    const sseStream = mkSSE([
        // 1. Artifact event (triggers GET)
        { result: { id: "t_resume", artifact: mkArtifact(0, "artifact1") } }, 
        // 2. Final status event (triggers final GET and close)
        { result: { id: "t_resume", status: finalCompletedTask.status, final: true } },
    ]);

    await withFetchQueue(
      [
        // 1. Initial tasks/get for resume
        {
            method: "tasks/get",
            res: new Response(JSON.stringify({ result: initialWorkingTask }))
        },
        // 2. tasks/resubscribe request
        {
            method: "tasks/resubscribe",
            res: new Response(sseStream as any, { 
                status: 200, 
                headers: { "content-type": "text/event-stream" },
            }),
        },
        // 3. tasks/get triggered by the artifact SSE event
        {
            method: "tasks/get",
            res: new Response(JSON.stringify({ result: workingTaskWithArtifact }))
        },
        // 4. tasks/get triggered by the final=true SSE event
        {
            method: "tasks/get",
            res: new Response(JSON.stringify({ result: finalCompletedTask }))
        },
      ],
      async () => {
        const statusSpy = sinon.spy();
        const artifactSpy = sinon.spy();
        const closeSpy = sinon.spy();

        const client = A2AClient.resume(
          "http://dummy/sse_resume",
          "t_resume",
          { getAuthHeaders: () => ({}) } 
        );

        client.on("status-update", statusSpy);
        client.on("artifact-update", artifactSpy);
        client.on("close", closeSpy);

        // Allow time for initial get, resubscribe, SSE stream, and subsequent GETs
        await Bun.sleep(50); 

        // Verify: 
        // - Initial status from resume GET (working)
        // - Artifact update when state with artifact is applied (from GET#3)
        // - Final status update (completed) from final GET (from GET#4)
        // - Close event
        expect(statusSpy.callCount).toBe(3); // initial working, artifact working, final completed
        expect(statusSpy.getCall(0).args[0].status.state).toBe('working');
        expect(statusSpy.getCall(0).args[0].status.timestamp).toBe('ts_initial');
        expect(statusSpy.getCall(1).args[0].status.state).toBe('working'); 
        expect(statusSpy.getCall(1).args[0].status.timestamp).toBe('ts_artifact');
        expect(statusSpy.getCall(2).args[0].status.state).toBe('completed');
        expect(statusSpy.getCall(2).args[0].status.timestamp).toBe('ts_final');
        
        expect(artifactSpy.callCount).toBe(1); // Only when GET#3 applies state
        expect(artifactSpy.getCall(0).args[0].artifact.parts[0].text).toBe("artifact1");

        expect(closeSpy.callCount).toBe(1);
        expect(client.getCurrentState()).toBe('closed');

        client.close(); 
      },
    );
  });

  // --- NEW TEST: SSE Input Required -> Send --- 
  it("SSE - transitions to input-required, then handles send", async () => {
    const inputReqTask = mkTask({ 
      id: "t_sse_input", 
      status: { state: 'input-required', message: { role: 'agent', parts: [{type: 'text', text:'Need topic'}]}, timestamp: 'ts_input' } 
    });
    const finalCompletedTask = mkTask({ 
      id: "t_sse_input", 
      status: { state: "completed", timestamp: "ts_final" }
    });

    // First SSE stream: sends a trigger for input-required
    const sseStream1 = mkSSE([
      { result: { id: "t_sse_input", status: inputReqTask.status } }, // Trigger GET
    ]);

    // Second SSE stream: responds to send, sends final trigger
    const sseStream2 = mkSSE([
        { result: { id: "t_sse_input", status: finalCompletedTask.status, final: true } },
    ]);

    await withFetchQueue(
      [
        // --- Phase 1: Start -> Input Required --- 
        // 1. Initial tasks/sendSubscribe 
        {
            method: "tasks/sendSubscribe",
            res: new Response(sseStream1 as any, { 
                status: 200, headers: { "content-type": "text/event-stream" }
            }),
        },
        // 2. tasks/get triggered by SSE status update
        {
            method: "tasks/get",
            res: new Response(JSON.stringify({ result: inputReqTask }))
        },
        // --- Phase 2: Send -> Completed --- 
        // 3. tasks/sendSubscribe (from client.send)
        {
            method: "tasks/sendSubscribe",
            res: new Response(sseStream2 as any, { 
                status: 200, headers: { "content-type": "text/event-stream" }
            }),
        },
        // 4. tasks/get triggered by final=true
        {
            method: "tasks/get",
            res: new Response(JSON.stringify({ result: finalCompletedTask }))
        },
      ],
      async () => {
        const statusSpy = sinon.spy();
        const closeSpy = sinon.spy();
        const stateHistory: ClientManagedState[] = [];

        const client = A2AClient.start(
          "http://dummy/sse_input",
          { id: "t_sse_input", message: { role: "user", parts: [] } },
          { getAuthHeaders: () => ({}) } 
        );

        // Helper to track state (since client doesn't emit state events)
        const originalSetState = (client as any)._setState;
        (client as any)._setState = (s: ClientManagedState) => { stateHistory.push(s); originalSetState.call(client, s); };
        client.on("status-update", statusSpy);
        client.on("close", closeSpy);

        // Allow time for Phase 1 (start -> input-required)
        await Bun.sleep(30); 
        expect(client.getCurrentState()).toBe('input-required');
        expect(statusSpy.callCount).toBe(1);
        expect(statusSpy.getCall(0).args[0].status.state).toBe('input-required');

        // --- Trigger Phase 2 --- 
        await client.send({ role: 'user', parts: [{ type: 'text', text: 'cats' }] });
        
        // Allow time for Phase 2 (send -> completed -> close)
        await Bun.sleep(50); 

        // Verify final state and events
        expect(client.getCurrentState()).toBe('closed');
        expect(statusSpy.callCount).toBe(2); // input-required, then completed
        expect(statusSpy.getCall(1).args[0].status.state).toBe('completed');
        expect(closeSpy.callCount).toBe(1);
        
        // Optional: Verify state transitions if needed
        // console.log("State history:", stateHistory);

        client.close(); // Cleanup
      },
    );
  });
  // --- END NEW TEST --- 

  // --- NEW TEST: SSE Cancellation --- 
  it("SSE - Cancellation during active stream", async () => {
    const workingTask = mkTask({ id: "t_sse_cancel", status: { state: 'working', timestamp: 'ts_working' } });
    const canceledTask = mkTask({ id: "t_sse_cancel", status: { state: 'canceled', timestamp: 'ts_canceled' } });

    // SSE stream sends one trigger, then stays open until cancel
    const sseStream = mkSSE([
      { result: { id: "t_sse_cancel", artifact: mkArtifact(0, "art1") } }, // Trigger GET
      // No final event here
    ]);

    await withFetchQueue(
      [
        // 1. Initial tasks/sendSubscribe 
        {
            method: "tasks/sendSubscribe",
            res: new Response(sseStream as any, { 
                status: 200, headers: { "content-type": "text/event-stream" }
            }),
        },
        // 2. tasks/get triggered by SSE artifact update
        {
            method: "tasks/get",
            res: new Response(JSON.stringify({ result: workingTask }))
        },
        // --- Cancellation Phase --- 
        // 3. tasks/cancel (from client.cancel)
        {
            method: "tasks/cancel",
            // Cancel returns minimal info usually, state updated via subsequent GET
            res: new Response(JSON.stringify({ result: { id: "t_sse_cancel" } })) 
        },
        // 4. tasks/get (from client.cancel)
        {
            method: "tasks/get",
            res: new Response(JSON.stringify({ result: canceledTask }))
        },
      ],
      async () => {
        const statusSpy = sinon.spy();
        const closeSpy = sinon.spy();
        let closeReason = '';

        const client = A2AClient.start(
          "http://dummy/sse_cancel",
          { id: "t_sse_cancel", message: { role: "user", parts: [] } },
          { getAuthHeaders: () => ({}) } 
        );

        client.on("status-update", statusSpy);
        // Modify close handler slightly if needed to capture reason, though state check is primary
        client.on("close", () => closeSpy()); 

        // Allow time for initial connection and first GET
        await Bun.sleep(30); 
        expect(client.getCurrentState()).toBe('connected-sse'); // Should be connected
        expect(statusSpy.callCount).toBe(1); // Initial working state
        expect(statusSpy.getCall(0).args[0].status.state).toBe('working');

        // --- Trigger Cancel --- 
        await client.cancel();
        
        // Allow time for cancel -> get -> close
        await Bun.sleep(50); // Increased sleep duration

        // Verify final state and events
        expect(client.getCurrentState()).toBe('closed'); // Should close after cancel
        expect(statusSpy.callCount).toBe(2); // working, then canceled
        expect(statusSpy.getCall(1).args[0].status.state).toBe('canceled');
        expect(closeSpy.callCount).toBe(1);
        
        client.close(); // Cleanup
      },
    );
  });
  // --- END NEW TEST --- 

});
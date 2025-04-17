// src/A2AClientV2.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import sinon from "sinon";
import { TextEncoder } from "node:util";
import { A2AClient, TaskStore, deepEqual } from "./A2AClientV2";
import type { Task, TaskStatus, Artifact } from "./types";

// ─── Helpers ────────────────────────────────────────────────────────────────
const mkArtifact = (i: number, txt: string): Artifact =>
  ({ index: i, parts: [{ type: "text", text: txt }] } as Artifact);

const mkTask = (patch: Partial<Task> = {}): Task => ({
  id: "t1",
  status: { state: "working", timestamp: new Date().toISOString() } as TaskStatus,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  artifacts: [],
  ...patch,
} as Task);

const mkMessage = (t: string) => ({ role: "user", parts: [{ type: "text", text: t }] });

const mkSSE = (ev: any[]): ReadableStream<Uint8Array> => {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(c) { ev.forEach(e => c.enqueue(enc.encode(`data: ${JSON.stringify(e)}\n\n`))); c.close(); },
  });
};

/** Stub fetch for agent‑card + ordered JSON‑RPC queue */
function withFetchQueue(queue: { method: string; res: Response }[], fn: () => Promise<void>) {
  const card = new Response(
    JSON.stringify({
      name: "dummy",
      url: "http://dummy",
      version: "1.0",
      authentication: { schemes: [] },
      capabilities: { streaming: true },
      defaultInputModes: ["text/plain"],
      defaultOutputModes: ["text/plain"],
      skills: [],
    }),
    { headers: { "content-type": "application/json" } }
  );

  const stub = sinon.stub(globalThis, "fetch").callsFake(async (input: any, init?: RequestInit) => {
    if (typeof input === "string" && input.endsWith("/.well-known/agent.json")) {
      return card.clone();
    }
    if (!queue.length) throw new Error("Unexpected fetch – queue empty");
    const { method, res } = queue.shift()!;
    const body = init?.body ? JSON.parse(init!.body as string) : {};
    if (body.method !== method) throw new Error(`Wanted ${method}, got ${body.method}`);
    return res.clone();
  });

  return fn().finally(() => {
    stub.restore();
    if (queue.length) throw new Error("Unused mock responses remain");
  });
}

beforeEach(() => sinon.restore());
afterEach(() => sinon.restore());

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("deep‑equal & TaskStore", () => {
  it("deepEqual sanity", () => {
    expect(deepEqual({ a: 1 }, { a: 1 })).toBe(true);
    expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
  });

  it("TaskStore diff", () => {
    const s = new TaskStore();
    const add: number[] = [], del: number[] = [];
    s.on("artifact-update", p => (p.removed ? del : add).push(p.artifact.index));
    s.apply(mkTask({ artifacts: [mkArtifact(0, "a")] }));
    s.apply(mkTask({ artifacts: [mkArtifact(0, "b")] }));
    s.apply(mkTask({ artifacts: [] }));
    expect(add).toEqual([0, 0]);
    expect(del).toEqual([0]);
  });
});

describe("Polling lifecycle", () => {
  it("closes on completed", async () => {
    const working = mkTask();
    const done = mkTask({ status: { state: "completed", timestamp: new Date().toISOString() } });

    await withFetchQueue([
      { method: "tasks/send", res: new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: working }),
        { headers: { "content-type": "application/json" } }) },
      { method: "tasks/get",  res: new Response(JSON.stringify({ jsonrpc: "2.0", id: 2, result: done }),
        { headers: { "content-type": "application/json" } }) },
    ], async () => {
      const ev: string[] = [];
      const c = A2AClient.start("http://dummy", { id: "t1", message: mkMessage("hi") },
        { forcePoll: true, getAuthHeaders: () => ({}) });
      c.on("status-update", () => ev.push("status"));
      c.on("close", () => ev.push("close"));
      await Bun.sleep(20);
      expect(ev).toEqual(["status", "status", "close"]);
    });
  });
});

describe("SSE lifecycle", () => {
  it("artifact then final", async () => {
    const completed = mkTask({
      status: { state: "completed", timestamp: new Date().toISOString() },
      artifacts: [mkArtifact(0, "p1"), mkArtifact(1, "p2")],
    });
    const sse = mkSSE([
      { result: { id: "t1", artifact: mkArtifact(0, "p1") } },
      { result: { id: "t1", status: completed.status, final: true } },
    ]);

    await withFetchQueue([
      { method: "tasks/sendSubscribe", res: new Response(sse as any,
        { status: 200, headers: { "content-type": "text/event-stream" } }) },
      { method: "tasks/get", res: new Response(JSON.stringify({ jsonrpc: "2.0", id: 3, result: completed }),
        { headers: { "content-type": "application/json" } }) },
    ], async () => {
      const art = sinon.spy(), close = sinon.spy();
      const c = A2AClient.start("http://dummy", { id: "t1", message: mkMessage("hi") },
        { getAuthHeaders: () => ({}) });
      c.on("artifact-update", art);
      c.on("close", close);
      await Bun.sleep(30);
      expect(art.callCount).toBe(1);
      expect(close.callCount).toBe(1);
    });
  });
});

describe("send() after input-required", () => {
  it("does send + GET(done) then closes", async () => {
    const ireq = mkTask({ status:{ state:"input-required", timestamp:new Date().toISOString() }});
    const work = mkTask();                                          // sent message accepted
    const done = mkTask({ status:{ state:"completed", timestamp:new Date().toISOString() }});

    // Actual call sequence:
    //  1) tasks/send  → ireq
    //  2) tasks/get   → ireq
    //  3) tasks/send  → work
    //  4) tasks/get   → done (final)  → close
    await withFetchQueue([
      { method:"tasks/send", res:new Response(
          JSON.stringify({ jsonrpc:"2.0", id:1, result: ireq }),
          { headers:{ "content-type":"application/json"} })},
      { method:"tasks/get",  res:new Response(
          JSON.stringify({ jsonrpc:"2.0", id:2, result: ireq }),
          { headers:{ "content-type":"application/json"} })},
      { method:"tasks/send", res:new Response(
          JSON.stringify({ jsonrpc:"2.0", id:3, result: work }),
          { headers:{ "content-type":"application/json"} })},
      { method:"tasks/get",  res:new Response(
          JSON.stringify({ jsonrpc:"2.0", id:4, result: done }),
          { headers:{ "content-type":"application/json"} })},
    ], async () => {
      const evs: string[] = [];
      const client = A2AClient.start(
        "http://dummy",
        { id:"t1", message: mkMessage("hi") },
        { forcePoll:true, getAuthHeaders:()=>({}) }
      );
      client.on("status-update", ()=>evs.push("status"));
      client.on("close",         ()=>evs.push("close"));

      // initial create → 2 status events
      await Bun.sleep(20);
      expect(evs).toEqual(["status","status"]);
      evs.length = 0;

      await client.send(mkMessage("resume"));        // triggers resend flow
      await Bun.sleep(30);
      expect(evs).toEqual(["status","status","close"]);
    });
  });
});

describe("Resume flows", () => {
  it("getters reflect initial GET", async () => {
    const w = mkTask();
    await withFetchQueue([
      { method: "tasks/get", res: new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: w }),
        { headers: { "content-type": "application/json" } }) },
      // poll loop first tick (5000 ms) is beyond our 20 ms wait, so no 2nd GET
    ], async () => {
      const c = A2AClient.resume("http://dummy", "t1",
        { forcePoll: true, getAuthHeaders: () => ({}) });
      await Bun.sleep(20);
      expect(c.getCurrentTask()).toEqual(w);
      expect(c.getCurrentState()).toBe("starting-poll");
    });
  });

  it("active task emits one status-update", async () => {
    const w = mkTask();
    await withFetchQueue([
      { method: "tasks/get", res: new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: w }),
        { headers: { "content-type": "application/json" } }) },
    ], async () => {
      let s = 0;
      const c = A2AClient.resume("http://dummy", "t1",
        { forcePoll: true, getAuthHeaders: () => ({}) });
      c.on("status-update", () => s++);
      await Bun.sleep(20);
      expect(s).toBe(1);
    });
  });
});


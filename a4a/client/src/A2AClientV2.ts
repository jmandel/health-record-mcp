// src/A2AClientV2.ts
// -----------------------------------------------------------------------------
// A2AClientV2 – full create/resume, send, cancel, SSE vs Poll strategy with
// reconnect/backoff, immediate‐GET polling, pause/resume, and proper
// close semantics.
// -----------------------------------------------------------------------------

import type {
  Task,
  TaskStatus,
  Artifact,
  AgentCard,
  TaskSendParams,
  TaskGetParams,
  TaskCancelParams,
  TaskSubscribeParams,
  TaskResubscribeParams
} from './types';
import equal from 'fast-deep-equal';
import Emitter from 'eventemitter3';
import { v4 as uuid } from 'uuid';

// For tests and diffing
export const deepEqual = equal as (a: unknown, b: unknown) => boolean;

// ——— JSON‑RPC transport ————————————————————————————————————————————————
interface RpcTransportOptions {
  endpoint: string;
  getAuthHeaders: () => Promise<Record<string,string>> | Record<string,string>;
}
class RpcTransport {
  constructor(
    private readonly endpoint: string,
    private readonly getAuthHeaders: RpcTransportOptions['getAuthHeaders']
  ) {}
  async request<TResult>(
    method: string,
    params: any,
    signal: AbortSignal
  ): Promise<TResult> {
    const id = uuid();
    const body = JSON.stringify({ jsonrpc: '2.0', id, method, params });
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(await this.getAuthHeaders())
    };
    const res = await fetch(this.endpoint, { method: 'POST', headers, body, signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if ('error' in data) throw data.error;
    return data.result as TResult;
  }
}

// ——— TaskStore (deep diff + deletions) ————————————————————————————————————
type StatusPayload = { status: TaskStatus; task: Task };
type ArtifactPayload = { artifact: Artifact; removed?: boolean; task: Task };
type TaskStoreEvents = {
  'status-update': (p: StatusPayload) => void;
  'artifact-update': (p: ArtifactPayload) => void;
  'task-update': (task: Task) => void;
};
export class TaskStore extends Emitter<TaskStoreEvents> {
  private _task: Task | null = null;
  get snapshot() { return this._task ? structuredClone(this._task) : null; }
  apply(newTask: Task) {
    const old = this._task;
    this._task = newTask;
    if (!old) {
      this.emit('status-update', { status: newTask.status, task: newTask });
      newTask.artifacts?.forEach(a => this.emit('artifact-update', { artifact: a, task: newTask }));
      this.emit('task-update', newTask);
      return;
    }
    if (!deepEqual(old.status, newTask.status)) {
      this.emit('status-update', { status: newTask.status, task: newTask });
    }
    const oldMap = new Map(old.artifacts?.map(a => [a.index, a]) ?? []);
    const newMap = new Map(newTask.artifacts?.map(a => [a.index, a]) ?? []);
    for (const [idx, art] of newMap) {
      const prev = oldMap.get(idx);
      if (!prev || !deepEqual(prev, art)) {
        this.emit('artifact-update', { artifact: art, task: newTask });
      }
    }
    for (const [idx, art] of oldMap) {
      if (!newMap.has(idx)) {
        this.emit('artifact-update', { artifact: art, removed: true, task: newTask });
      }
    }
    if (!deepEqual(old, newTask)) {
      this.emit('task-update', newTask);
    }
  }
}

// ——— Channel abstraction —————————————————————————————————————————————
interface CommsChannel {
  start(): void;
  stop(): void;
  pause(): void;
}

// ——— SSE stream reader ———————————————————————————————————————————————
export class StreamReader implements CommsChannel {
  private controller = new AbortController();
  private closed = false;
  constructor(
    private readonly url: string,
    private readonly body: any,
    private readonly headers: Record<string,string>,
    private readonly onJson: (data: any) => void,
    private readonly onError: (e: unknown) => void
  ) {}
  start(): void {
    this.fetchLoop().catch(e => this.onError(e));
  }
  async fetchLoop(): Promise<void> {
    const res = await fetch(this.url, {
      method: 'POST',
      headers: { ...this.headers, 'Accept': 'text/event-stream', 'Content-Type': 'application/json' },
      body: JSON.stringify(this.body),
      signal: this.controller.signal
    });
    if (!res.ok) throw new Error(`SSE HTTP ${res.status}`);
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('text/event-stream')) throw new Error('Not an SSE stream');
    if (!res.body) return;
    const reader = res.body.getReader();
    const td = new TextDecoder();
    let buf = '';
    while (!this.controller.signal.aborted) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += td.decode(value, { stream: true });
      let idx: number;
      while ((idx = buf.indexOf('\n\n')) >= 0) {
        const chunk = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        if (!chunk.trim()) continue;
        const lines = chunk
          .split('\n')
          .filter(l => l.startsWith('data:'))
          .map(l => l.slice(5).trim());
        try {
          this.onJson(JSON.parse(lines.join('\n')));
        } catch {
          // ignore bad JSON
        }
      }
    }
  }
  stop(): void {
    if (this.closed) return;
    this.closed = true;
    this.controller.abort();
  }
  pause(): void {
    this.stop();
  }
}

// ——— Polling loop with backoff & pause —————————————————————————————————————
interface PollingOptions { interval: number; maxErrors: number; }
class PollingLoop implements CommsChannel {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private errors = 0;
  private stopped = false;
  constructor(
    private readonly fn: () => Promise<void>,
    private readonly opts: PollingOptions,
    private readonly onError: (e: unknown) => void
  ) {}
  start(): void {
    if (this.stopped) return;
    this.schedule(this.opts.interval);
  }
  private schedule(ms: number): void {
    this.timer = setTimeout(async () => {
      if (this.stopped) return;
      try {
        await this.fn();
        this.errors = 0;
      } catch (e) {
        this.errors++;
        this.onError(e);
        if (this.errors >= this.opts.maxErrors) {
          this.onError(new Error(`Polling failed after ${this.opts.maxErrors} attempts`));
          this.stop();
          return;
        }
      }
      const nextDelay = this.opts.interval * (1 << Math.min(5, this.errors));
      this.schedule(nextDelay);
    }, ms);
  }
  stop(): void {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
  }
  pause(): void {
    this.stop();
  }
}

// ——— Client State & Config ————————————————————————————————————————————
export type ClientManagedState =
  | 'idle' | 'initializing' | 'determining-strategy'
  | 'sending' | 'starting-sse' | 'connected-sse' | 'reconnecting-sse'
  | 'starting-poll' | 'polling'
  | 'input-required' | 'canceling' | 'closed' | 'error';

type ClientCloseReason =
  | 'closed-by-caller' | 'task-completed' | 'task-canceled-by-agent'
  | 'task-canceled-by-client' | 'task-failed' | 'error-fatal'
  | 'sse-reconnect-failed' | 'poll-retry-failed' | 'error-on-cancel';

interface ClientConfig {
  endpoint: string;
  getAuthHeaders: RpcTransportOptions['getAuthHeaders'];
  forcePoll?: boolean;
  pollInterval?: number;
  pollMaxErrors?: number;
  sseMaxReconnectAttempts?: number;
}
export interface ClientConfigParams extends Omit<Partial<ClientConfig>, 'getAuthHeaders'> {
  getAuthHeaders: RpcTransportOptions['getAuthHeaders'];
}

type ClientEvents = TaskStoreEvents & { error: (e: unknown) => void; close: () => void; };

export class A2AClient extends Emitter<ClientEvents> {
  private lifecycleAbort = new AbortController();
  private commsChannel: CommsChannel | null = null;
  private transport: RpcTransport;
  private store = new TaskStore();
  private agentCard: AgentCard | null = null;
  private strategy: 'sse' | 'poll' = 'poll';
  private sseAttempts = 0;
  private state: ClientManagedState = 'idle';

  constructor(
    private readonly taskId: string,
    private readonly cfg: ClientConfig
  ) {
    super();
    this.transport = new RpcTransport(cfg.endpoint, cfg.getAuthHeaders);
    this.store.on('status-update', p => this.emit('status-update', p));
    this.store.on('artifact-update', p => this.emit('artifact-update', p));
    this.store.on('task-update', t => this.emit('task-update', t));
  }

  /** Start a new task */
  public static start(
    endpoint: string,
    initialParams: TaskSendParams,
    cfg: ClientConfigParams
  ): A2AClient {
    const id = initialParams.id ?? uuid();
    const processedInitialParams = { ...initialParams, id };
    const client = new A2AClient(id, { endpoint, ...cfg });
    client.init(processedInitialParams).catch(e => client.emit('error', e));
    return client;
  }

  /** Resume existing task */
  public static resume(
    endpoint: string,
    taskId: string,
    cfg: ClientConfigParams
  ): A2AClient {
    const client = new A2AClient(taskId, { endpoint, ...cfg });
    client.init(null).catch(e => client.emit('error', e));
    return client;
  }

  /** Pause any active communication but keep client alive */
  public pause(): void {
    this.commsChannel?.pause();
  }

  /** Resume communication using previous strategy */
  public resumeComms(): void {
    if (['closed','error','input-required'].includes(this.state)) return;
    if (this.strategy === 'sse') {
      this.startSse('tasks/resubscribe', { id: this.taskId });
    } else {
      this.startPolling();
    }
  }

  /** Send a follow-up message */
  public async send(message: TaskSendParams['message']): Promise<void> {
    if (['closed','error','canceling'].includes(this.state)) {
      throw new Error(`Cannot send in state: ${this.state}`);
    }
    this.state = 'sending';
    this.commsChannel?.stop();
    this.sseAttempts = 0;
    if (this.strategy === 'sse') {
      await this.startSse('tasks/sendSubscribe', { id: this.taskId, message });
    } else {
      await this.startPolling({ id: this.taskId, message });
    }
  }

  /** Cancel the task */
  public async cancel(): Promise<void> {
    if (['closed','error','canceling'].includes(this.state)) return;
    this.state = 'canceling';
    this.commsChannel?.stop();
    const ctrl = new AbortController();
    try {
      await this.transport.request<Task>('tasks/cancel', { id: this.taskId } as TaskCancelParams, ctrl.signal);
      const final = await this.transport.request<Task>('tasks/get', { id: this.taskId } as TaskGetParams, ctrl.signal);
      if (!ctrl.signal.aborted) this.store.apply(final);
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) this.emit('error', e);
    } finally {
      this.stopComms(true, 'task-canceled-by-client');
    }
  }

  /** Close without cancel */
  public close(): void {
    this.stopComms(true, 'closed-by-caller');
  }

  public getCurrentTask(): Task | null { return this.store.snapshot; }
  public getCurrentState(): ClientManagedState { return this.state; }
  public getAgentCard(): AgentCard | null { return this.agentCard; }

  /** Internal init logic for create vs resume */
  private async init(initialParams: TaskSendParams | null): Promise<void> {
    this.state = 'initializing';
    try {
      const resp = await fetch(new URL('/.well-known/agent.json', this.cfg.endpoint).href, { signal: this.lifecycleAbort.signal });
      if (!resp.ok) throw new Error(`Agent card fetch ${resp.status}`);
      this.agentCard = await resp.json();
    } catch (e) {
      this.emit('error', e);
      this.stopComms(true, 'error-fatal');
      return;
    }
    this.strategy = this.agentCard.capabilities?.streaming && !this.cfg.forcePoll ? 'sse' : 'poll';
    if (initialParams) {
      if (this.strategy === 'sse') {
        await this.startSse('tasks/sendSubscribe', initialParams as TaskSubscribeParams);
      } else {
        await this.startPolling(initialParams);
      }
    } else {
      // Resume existing task
      const t = await this.transport.request<Task>('tasks/get', { id: this.taskId, historyLength: 500 } as TaskGetParams, this.lifecycleAbort.signal);
      this.store.apply(t);
      if (['completed','canceled','failed'].includes(t.status.state)) {
        this.stopComms(true, this.closeReasonFromState(t.status.state));
        return;
      }
      if (t.status.state === 'input-required') {
        this.state = 'input-required';
        return;
      }
      // Continue streaming or polling
      if (this.strategy === 'sse') {
        await this.startSse('tasks/resubscribe', { id: this.taskId } as TaskResubscribeParams);
      } else {
        await this.startPolling();
      }
    }
  }

  /** Kick off an SSE channel */
  private async startSse(
    method: 'tasks/sendSubscribe' | 'tasks/resubscribe',
    params?: TaskSubscribeParams | TaskResubscribeParams
  ): Promise<void> {
    this.sseAttempts++;
    this.state = this.sseAttempts > 1 ? 'reconnecting-sse' : 'starting-sse';
    const body = { jsonrpc: '2.0', id: uuid(), method, params };
    const headers = await this.cfg.getAuthHeaders();
    const reader = new StreamReader(
      this.cfg.endpoint,
      body,
      headers,
      msg => this.handleSseEvent(msg),
      e => this.emit('error', e)
    );
    this.commsChannel = reader;
    reader.start();
  }

  /** Kick off a polling channel */
  private async startPolling(initialParams?: TaskSendParams): Promise<void> {
    this.state = 'starting-poll';
    // 1) send if needed
    let taskAfter: Task;
    if (initialParams) {
      taskAfter = await this.transport.request<Task>('tasks/send', initialParams, this.lifecycleAbort.signal);
      this.store.apply(taskAfter);
      taskAfter = await this.transport.request<Task>('tasks/get', { id: this.taskId } as TaskGetParams, this.lifecycleAbort.signal);
      this.store.apply(taskAfter);
    } else {
      taskAfter = await this.transport.request<Task>('tasks/get', { id: this.taskId } as TaskGetParams, this.lifecycleAbort.signal);
      this.store.apply(taskAfter);
    }
    if (['completed','canceled','failed'].includes(taskAfter.status.state)) {
      this.stopComms(true, this.closeReasonFromState(taskAfter.status.state));
      return;
    }
    if (taskAfter.status.state === 'input-required') {
      this.state = 'input-required';
      return;
    }
    // 2) start loop
    this.state = 'polling';
    const loop = new PollingLoop(
      async () => {
        const t = await this.transport.request<Task>('tasks/get', { id: this.taskId } as TaskGetParams, this.lifecycleAbort.signal);
        this.store.apply(t);
        if (['completed','canceled','failed'].includes(t.status.state)) {
          this.stopComms(true, this.closeReasonFromState(t.status.state));
        }
        if (t.status.state === 'input-required') {
          this.state = 'input-required';
          loop.stop();
        }
      },
      { interval: this.cfg.pollInterval ?? 5000, maxErrors: this.cfg.pollMaxErrors ?? 3 },
      e => this.emit('error', e)
    );
    this.commsChannel = loop;
    loop.start();
  }

  /** Handle incoming SSE event */
  private handleSseEvent(msg: any): void {
    const data = msg.result;
    if (!data) return;
    if (data.final) {
      this.commsChannel?.stop();
      this.fetchFinal();
      return;
    }
    if (data.artifact || data.status) {
      this.debouncedGet();
    }
  }

  /** Fetch final task state after SSE end */
  private async fetchFinal(): Promise<void> {
    // Use a temporary controller for the final GET to avoid interference with lifecycleAbort
    const finalCtrl = new AbortController();
    try {
      const final = await this.transport.request<Task>(
        'tasks/get',
        { id: this.taskId, historyLength: 500 } as TaskGetParams,
        finalCtrl.signal
      );
      this.store.apply(final);
      const s = final.status.state;
      if (['completed','canceled','failed'].includes(s)) {
        this.stopComms(true, this.closeReasonFromState(s));
      } else if (s === 'input-required') {
        this.state = 'input-required';
      } else {
        // Unexpected: restart comms on same task
        if (this.strategy === 'sse') {
          // reconnect via SSE
          await this.startSse('tasks/resubscribe', { id: this.taskId } as TaskResubscribeParams);
        } else {
          // resume polling loop
          await this.startPolling();
        }
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        // ignore aborted final fetch
      } else {
        this.emit('error', e);
        this.stopComms(true, 'error-fatal');
      }
    }
  }

  private debouncedGet = debounce(async (): Promise<void> => {
    // Use a temporary controller so lifecycleAbort isn't required
    const getCtrl = new AbortController();
    try {
      const t = await this.transport.request<Task>(
        'tasks/get',
        { id: this.taskId, historyLength: 100 } as TaskGetParams,
        getCtrl.signal
      );
      this.store.apply(t);
      if (t.status.state === 'input-required') {
        this.state = 'input-required';
        this.commsChannel?.pause();
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) this.emit('error', e);
    }
  }, 200);

  /** Stop communications and optionally close client */
  private stopComms(emitClose: boolean, reason: ClientCloseReason): void {
    this.commsChannel?.stop();
    if (emitClose) this.lifecycleAbort.abort();
    this.state = emitClose
      ? (['error-fatal'].includes(reason) ? 'error' : 'closed')
      : this.state;
    if (emitClose) this.emit('close');
  }

  private closeReasonFromState(s: TaskStatus['state']): ClientCloseReason {
    switch (s) {
      case 'completed': return 'task-completed';
      case 'canceled': return 'task-canceled-by-agent';
      case 'failed': return 'task-failed';
      default: return 'closed-by-caller';
    }
  }
}

// Simple debounce utility
function debounce<F extends (...args: any[]) => void>(fn: F, ms: number): F {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as F;
}

export const __test__ = { deepEqual, TaskStore };

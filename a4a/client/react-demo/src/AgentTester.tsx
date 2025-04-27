import React, { useState, useEffect, useCallback } from 'react';
import {
  A2AClient,
  deepEqual
} from '@jmandel/a2a-client/src/A2AClientV2';
import type {
  Task,
  Message,
  Part,
  Artifact,
  TaskSendParams
} from '@jmandel/a2a-client/src/types';
import './App.css';

const DEFAULT_AGENT_ENDPOINT = 'http://localhost:3001/a2a';

type ClientState =
  | { phase: 'idle' }
  | { phase: 'connecting' }
  | { phase: 'running'; task: Task }
  | { phase: 'awaiting-input'; task: Task }
  | { phase: 'completed'; task: Task }
  | { phase: 'error'; error: any };

function AgentTester() {
  // ——————————————————— configuration inputs
  const [agentUrl, setAgentUrl] = useState(DEFAULT_AGENT_ENDPOINT);
  const [validatedUrl, setValidatedUrl] = useState<string | null>(null);
  const [agentCard, setAgentCard] = useState<any | null>(null);

  // ——————————————————— dialog inputs
  const [kickoffText, setKickoffText] = useState('Start prior auth for MRI Lumbar Spine for low back pain');
  const [messageInput, setMessageInput] = useState('');

  // ——————————————————— A2A client
  const [client, setClient] = useState<A2AClient | null>(null);
  const [state, setState] = useState<ClientState>({ phase: 'idle' });
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);

  // ---------------------- step 1: validate agent (fetch card)
  const buildCardUrl = (endpoint: string): string => {
    // Resolve the relative path ".well-known/agent.json"
    // against the provided endpoint URL as the base.
    return new URL('.well-known/agent.json', endpoint).toString();
  };

  const handleValidate = async () => {
    setAgentCard(null);
    setValidatedUrl(null);
    try {
      const cardUrl = buildCardUrl(agentUrl);
      const res = await fetch(cardUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const card = await res.json();
      setAgentCard(card);
      setValidatedUrl(agentUrl);
    } catch (e) {
      alert('Could not fetch agent card: ' + (e as any).message);
    }
  };

  // ---------------------- step 2: kickoff task
  const handleKickoff = () => {
    if (!validatedUrl) return;
    const params: TaskSendParams = {
      message: { role: 'user', parts: [{ type: 'text', text: kickoffText }] }
    };
    const c = A2AClient.start(validatedUrl, params, {
      getAuthHeaders: () => ({})
    });

    c.on('task-update', (t) => {
      if (t.status.state === 'input-required') setState({ phase: 'awaiting-input', task: t });
      else if (t.status.state === 'completed' || t.status.state === 'failed' || t.status.state === 'canceled')
        setState({ phase: 'completed', task: t });
      else setState({ phase: 'running', task: t });
    });
    c.on('artifact-update', ({ artifact }) => {
      setArtifacts((prev) => {
        const idx = prev.findIndex((a) => a.index === artifact.index);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = artifact;
          return next;
        }
        return [...prev, artifact];
      });
    });
    c.on('error', (e) => setState({ phase: 'error', error: e }));
    c.on('close', () => setClient(null));

    setClient(c);
    setArtifacts([]);
    setState({ phase: 'connecting' });
  };

  // ---------------------- send follow-up message
  const handleSend = () => {
    if (!client || state.phase !== 'awaiting-input') return;
    const msg: Message = { role: 'user', parts: [{ type: 'text', text: messageInput }] };
    client.send(msg);
    setMessageInput('');
  };

  const handleCancel = () => {
    client?.cancel();
  };

  const currentTask = state.phase === 'running' || state.phase === 'awaiting-input' || state.phase === 'completed' ? state.task : null;

  // helper render artifact parts
  const renderPart = (part: Part, idx: number) => {
    if (part.type === 'text') return <p key={idx}>{part.text}</p>;
    if (part.type === 'data') return <pre key={idx}>{JSON.stringify(part.data, null, 2)}</pre>;
    if (part.type === 'file') return <p key={idx}>📎 File part ({part.file?.mimeType})</p>;
    return <span key={idx}>Unknown part</span>;
  };

  return (
    <div className="App">
      <h1>A2A Agent Tester (Raw Client)</h1>

      {/* Agent selection */}
      <div className="card">
        <h2>1. Select Agent</h2>
        <input style={{ width: '400px' }} value={agentUrl} onChange={(e) => setAgentUrl(e.target.value)} />
        <button onClick={handleValidate}>Fetch Agent Card</button>
        {agentCard && (
          <p style={{ marginTop: '8px' }}>
            ✅ {agentCard.name} (v{agentCard.version}) – streaming:{' '}
            {agentCard.capabilities?.streaming ? 'yes' : 'no'}
          </p>
        )}
      </div>

      {/* Kickoff */}
      {agentCard && (
        <div className="card">
          <h2>2. Kick-off Task</h2>
          <input style={{ width: '600px' }} value={kickoffText} onChange={(e) => setKickoffText(e.target.value)} />
          <button onClick={handleKickoff} disabled={!!client}>Start</button>
        </div>
      )}

      {/* Conversation */}
      {currentTask && (
        <div className="card">
          <h2>Conversation</h2>
          <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #ddd', padding: 8 }}>
            {currentTask.history?.map((m, i) => (
              <div key={i} style={{ marginBottom: 6 }}>
                <strong>{m.role === 'user' ? '🧑‍💻' : '🤖'} </strong>
                {m.parts.map((p, idx) => (
                  <span key={idx}>{renderPart(p, idx)}</span>
                ))}
              </div>
            ))}
          </div>

          {state.phase === 'awaiting-input' && (
            <div style={{ marginTop: 10 }}>
              <input
                style={{ width: 400 }}
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
              <button onClick={handleSend}>Send</button>
            </div>
          )}

          <button style={{ marginTop: 10 }} onClick={handleCancel} disabled={!client}>
            Cancel Task
          </button>
        </div>
      )}

      {/* Artifacts */}
      {artifacts.length > 0 && (
        <div className="card">
          <h2>Artifacts</h2>
          {artifacts.map((a) => (
            <div key={a.index} style={{ borderBottom: '1px solid #eee', marginBottom: 6 }}>
              <h4>
                #{a.index} {a.name}
              </h4>
              {a.parts.map((p, idx) => renderPart(p, idx))}
            </div>
          ))}
        </div>
      )}

      {state.phase === 'error' && <pre style={{ color: 'red' }}>{JSON.stringify(state.error)}</pre>}
    </div>
  );
}

export default AgentTester; 
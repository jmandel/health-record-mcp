import React, { useState, useCallback, useMemo } from 'react';
import { useTaskLiaison } from './hooks/useTaskLiaison';
import { Message, Task, TextPart, Part } from '@a2a/client/src/types'; // A2A types
import './App.css'; // Reuse existing styles for now

// Default to the prior auth agent, assuming it's running on 3001
const DEFAULT_AGENT_URL = 'http://localhost:3001/a2a';

function AgentTester() {
    const [agentUrl, setAgentUrl] = useState(DEFAULT_AGENT_URL);
    const [messageInput, setMessageInput] = useState('');
    const [startMessage, setStartMessage] = useState('Start prior auth for MRI Lumbar Spine for low back pain'); // Example start message
    const [currentAgentUrlForHook, setCurrentAgentUrlForHook] = useState(agentUrl);

    // Remove summary generator - it's not part of the new hook
    // const testerSummaryGenerator = useCallback((task: Task | null) => { ... });

    const {
        state, // Contains: status, task, question, error, taskId, agentUrl, summary
        actions // Contains: startTask, sendInput, cancelTask, resumeTask
    } = useTaskLiaison({
        // Key prop removed - hook already re-initializes on agentUrl change
        agentUrl: currentAgentUrlForHook,
        // summaryGenerator removed
        // No initial task ID or params, start manually
        // Add autoInputHandler if needed:
        // autoInputHandler: async (task: Task): Promise<Message | null> => { ... }
    });

    // Destructure state for easier access in the component
    const { status, task, question, error, taskId, summary } = state;

    // Determine status label based on hook state
    // const getStatusLabel = () => { ... };

    const isRunning = status !== 'idle' && status !== 'completed' && status !== 'error';

    // Handler to update the agent URL used by the hook, triggering re-init
    const handleApplyAgentUrl = useCallback(() => {
        setCurrentAgentUrlForHook(agentUrl);
    }, [agentUrl]);

    // Start a new task with the initial message
    const handleStartTask = useCallback(() => {
        if (!startMessage || status !== 'idle') return;
        console.log(`Starting task with message: ${startMessage}`);
        // Use actions.startTask
        actions.startTask({ role: 'user', parts: [{ type: 'text', text: startMessage }] });
        // Error handling is now internal to the hook/middleware
    }, [actions, startMessage, status]);

    // Send the message currently in the input box
    const handleSendMessage = useCallback(() => {
        if (!messageInput || status !== 'awaiting-input') return;
        console.log(`Sending message: ${messageInput}`);
        const message: Message = {
            role: 'user',
            parts: [{ type: 'text', text: messageInput }]
        };
        // Use actions.sendInput
        actions.sendInput(message);
        setMessageInput(''); // Clear input optimistically
        // Error handling is now internal to the hook/middleware
    }, [actions, messageInput, status]);

    // Cancel the current task
    const handleCancelTask = useCallback(() => {
        if (!isRunning) return;
        // Use actions.cancelTask
        actions.cancelTask();
        // Error handling is now internal to the hook/middleware
    }, [actions, isRunning]);

    // Extract text from the agent's question message (now from state.question)
    const agentQuestionText = useMemo(() => {
        if (status !== 'awaiting-input' || !question) return null;
        // Add type Part to param p
        return question.parts.find((p: Part) => p.type === 'text')?.text || '(Agent requires input, but sent no text)';
    }, [status, question]);

    return (
        <div className="App">
            <h1>A2A Agent Tester</h1>

            <div className="card config-card">
                <h2>Configuration</h2>
                 <label htmlFor="agentUrlInput">Agent URL:</label>
                 <input
                    id="agentUrlInput"
                    type="text"
                    value={agentUrl}
                    onChange={(e) => setAgentUrl(e.target.value)}
                    style={{ minWidth: '300px' }}
                 />
                 <button onClick={handleApplyAgentUrl} disabled={agentUrl === currentAgentUrlForHook}>
                    Apply URL (Resets Hook)
                 </button>
                 <p><small>Current Hook URL: <code>{currentAgentUrlForHook}</code></small></p>
            </div>

            <div className="card">
                <h2>Task Control & Status</h2>
                <div className="status-display">
                    <p>
                        Client Status: <strong>{status}</strong> <br/>
                        Task Status: <strong>{summary.friendlyLabel}</strong> {summary.emoji} <br/>
                        {taskId && <small>Task ID: {taskId}</small>}
                    </p>
                     {error && <p className="error-message">Error: {error.message}</p>}
                </div>

                <div className="controls-area start-controls">
                     <label htmlFor="startMessageInput">Start Message:</label>
                     <input
                        id="startMessageInput"
                        type="text"
                        value={startMessage}
                        onChange={(e) => setStartMessage(e.target.value)}
                        style={{ flexGrow: 1, marginRight: '10px' }}
                        disabled={status !== 'idle'}
                     />
                    <button onClick={handleStartTask} disabled={status !== 'idle' || !startMessage}>
                        Start Task
                    </button>
                </div>
                 <div className="controls-area cancel-controls">
                     <button onClick={handleCancelTask} disabled={!isRunning} className="cancel-button">
                        Cancel Task
                    </button>
                </div>
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                <h2>Conversation</h2>
                {/* --- History Display --- */}
                <div className="conversation-history" style={{ marginBottom: '15px', maxHeight: '300px', overflowY: 'auto', border: '1px solid #eee', padding: '10px', background: '#fdfdfd' }}>
                    {task?.history && task.history.length > 0 ? (
                        task.history.map((message: Message, index: number) => { // Add Message and number types
                            // Concatenate text from all parts
                            const messageText = message.parts
                                .filter((part: Part) => part.type === 'text') // Add Part type
                                .map((part: Part) => (part as TextPart).text) // Add Part type
                                .join('\n'); // Join multiple text parts with newline

                            // Basic styling based on role
                            const isUser = message.role === 'user';
                            const style: React.CSSProperties = {
                                marginBottom: '5px',
                                padding: '5px 8px',
                                borderRadius: '4px',
                                backgroundColor: isUser ? '#e1f5fe' : '#f0f0f0',
                                textAlign: 'left',
                                whiteSpace: 'pre-wrap', // Preserve newlines within message
                                wordBreak: 'break-word',
                            };

                            return (
                                <div key={`hist-${index}`} style={style}>
                                    <strong>{isUser ? 'User:' : 'Agent:'}</strong> {messageText || '(No text content)'}
                                </div>
                            );
                        })
                    ) : (
                        <p style={{ color: '#888' }}>No conversation history yet.</p>
                    )}
                </div>
                {/* --- End History Display --- */}

                {/* --- Input Area (Modified condition using state.status) --- */}
                <div className={`input-section ${status === 'awaiting-input' ? 'active' : ''}`}>
                     <label htmlFor="messageInput">Your Message:</label>
                     <input
                        id="messageInput"
                        type="text"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        placeholder={status === 'awaiting-input' ? "Enter your response..." : "Waiting for agent response..."} // Updated placeholder
                        disabled={status !== 'awaiting-input'} // Use state.status for disabled
                        style={{ flexGrow: 1, marginRight: '10px' }}
                        onKeyDown={(e) => { if (e.key === 'Enter' && status === 'awaiting-input') handleSendMessage(); }} // Also check state.status here
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={status !== 'awaiting-input' || !messageInput} // Use state.status for disabled
                    >
                        Send
                    </button>
                </div>
            </div>

            <div className="card">
                <h2>Raw Task State</h2>
                <pre style={{ textAlign: 'left', background: '#f8f8f8', padding: '10px', borderRadius: '5px', maxHeight: '400px', overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    {task ? JSON.stringify(task, null, 2) : 'No task active.'}
                </pre>
            </div>
        </div>
    );
}

export default AgentTester; 
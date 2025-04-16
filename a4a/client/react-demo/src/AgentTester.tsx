import React, { useState, useCallback, useMemo } from 'react';
import { useTaskLiaison } from './hooks/useTaskLiaison';
import { Message, Task, TextPart } from '@a2a/client/src/types'; // A2A types
import './App.css'; // Reuse existing styles for now

// Default to the prior auth agent, assuming it's running on 3001
const DEFAULT_AGENT_URL = 'http://localhost:3001/a2a'; 

function AgentTester() {
    const [agentUrl, setAgentUrl] = useState(DEFAULT_AGENT_URL);
    const [messageInput, setMessageInput] = useState('');
    const [startMessage, setStartMessage] = useState('Start prior auth for MRI Lumbar Spine for low back pain'); // Example start message
    const [currentAgentUrlForHook, setCurrentAgentUrlForHook] = useState(agentUrl);

    // Simple summary (can be enhanced)
    const testerSummaryGenerator = useCallback((task: Task | null) => {
        if (!task) return { label: 'Idle', icon: '😴' };
        return { label: `State: ${task.status.state}`, icon: 'ℹ️' };
    }, []);

    const {
        task,
        summary,
        questionForUser, // The agent's message when input is required
        clientStatus,
        error,
        startTask,
        sendInput,
        cancelTask,
        taskId
    } = useTaskLiaison({
        // Key prop removed - hook already re-initializes on agentUrl change
        // key: currentAgentUrlForHook, 
        agentUrl: currentAgentUrlForHook,
        summaryGenerator: testerSummaryGenerator,
        // No initial task ID or params, start manually
    });

    const isRunning = clientStatus !== 'idle' && clientStatus !== 'completed' && clientStatus !== 'error';

    // Handler to update the agent URL used by the hook, triggering re-init
    const handleApplyAgentUrl = useCallback(() => {
        setCurrentAgentUrlForHook(agentUrl);
    }, [agentUrl]);

    // Start a new task with the initial message
    const handleStartTask = useCallback(() => {
        if (!startMessage || clientStatus !== 'idle') return;
        console.log(`Starting task with message: ${startMessage}`);
        startTask({ message: { role: 'user', parts: [{ type: 'text', text: startMessage }] } })
            .catch(console.error);
    }, [startTask, startMessage, clientStatus]);

    // Send the message currently in the input box
    const handleSendMessage = useCallback(() => {
        if (!messageInput || task?.status?.state !== 'input-required') return;
        console.log(`Sending message: ${messageInput}`);
        const message: Message = {
            role: 'user',
            parts: [{ type: 'text', text: messageInput }]
        };
        sendInput(message)
            .then(() => setMessageInput('')) // Clear input on successful send
            .catch(console.error);
    }, [sendInput, messageInput, task]);

    // Cancel the current task
    const handleCancelTask = useCallback(() => {
        if (!isRunning) return;
        cancelTask().catch(console.error);
    }, [cancelTask, isRunning]);

    // Extract text from the agent's question message
    const agentQuestionText = useMemo(() => {
        if (clientStatus !== 'awaiting-input' || !questionForUser) return null;
        return questionForUser.parts.find(p => p.type === 'text')?.text || '(Agent requires input, but sent no text)';
    }, [clientStatus, questionForUser]);

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
                        Client Status: <strong>{clientStatus}</strong> <br/>
                        Task Status: <strong>{summary.label}</strong> {summary.icon} <br/>
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
                        disabled={clientStatus !== 'idle'}
                     />
                    <button onClick={handleStartTask} disabled={clientStatus !== 'idle' || !startMessage}>
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
                        task.history.map((message, index) => {
                            // Concatenate text from all parts
                            const messageText = message.parts
                                .filter(part => part.type === 'text')
                                .map(part => (part as TextPart).text)
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

                    {/* Render the CURRENT task status message if it exists */}
                    {task?.status?.message && (
                        (() => {
                            const currentMessage = task.status.message;
                            const messageText = currentMessage.parts
                                .filter(part => part.type === 'text')
                                .map(part => (part as TextPart).text)
                                .join('\n');
                            const isUser = currentMessage.role === 'user'; // Should usually be agent
                            const style: React.CSSProperties = {
                                marginTop: '10px', // Add some space after history
                                padding: '5px 8px',
                                borderRadius: '4px',
                                backgroundColor: isUser ? '#e1f5fe' : '#f0f0f0',
                                textAlign: 'left',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                // Optional: Add subtle indicator it's the current message
                                border: task.status.state === 'input-required' ? '1px dashed #aaa' : '1px solid transparent',
                            };
                             return (
                                 <div key="current-msg" style={style}>
                                     <strong>{isUser ? 'User:' : 'Agent:'}</strong> {messageText || '(No text content)'}
                                 </div>
                            );
                        })()
                    )}
                </div>
                {/* --- End History Display --- */}

                {/* --- Input Area (Modified condition) --- */}
                <div className={`input-section ${task?.status?.state === 'input-required' ? 'active' : ''}`}>
                     <label htmlFor="messageInput">Your Message:</label>
                     <input
                        id="messageInput"
                        type="text"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        placeholder={task?.status?.state === 'input-required' ? "Enter your response..." : "Waiting for agent response..."} // Updated placeholder
                        disabled={task?.status?.state !== 'input-required'} // Use task state for disabled
                        style={{ flexGrow: 1, marginRight: '10px' }}
                        onKeyDown={(e) => { if (e.key === 'Enter' && task?.status?.state === 'input-required') handleSendMessage(); }} // Also check task state here
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={task?.status?.state !== 'input-required' || !messageInput} // Use task state for disabled
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
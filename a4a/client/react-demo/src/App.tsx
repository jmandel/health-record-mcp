import React, { useState, useCallback } from 'react';
import { useTaskLiaison, LiaisonQuestion } from './hooks/useTaskLiaison';
import { Message, TextPart, Task, TaskSendParams } from '@a2a/client/src/types'; // A2A types
import './App.css'; // Keep default styling for now

const JOKE_AGENT_URL = 'http://localhost:3100/a2a'; // Make sure your sample agent runs here

function App() {
    const [jokeTopic, setJokeTopic] = useState('');

    // Custom summary logic for the Joke agent
    const jokeSummaryGenerator = useCallback((task: Task | null) => {
        if (!task) return { label: 'Idle', icon: '😴' };
        switch (task.status.state) {
            case 'submitted':
            case 'working': return { label: 'Thinking of a joke...', icon: '⏳' };
            case 'input-required': return { label: 'What kind of joke?', icon: '❓' };
            case 'completed':
                const jokeText = (task.artifacts?.[0]?.parts?.[0] as TextPart)?.text || '(Joke received!)';
                return { label: 'Joke:', detail: jokeText, icon: '😂' };
            case 'canceled': return { label: 'Joke canceled', icon: '❌' };
            case 'failed': return { label: 'Failed to get joke', icon: '🔥' };
            default: return { label: `Status: ${task.status.state}` };
        }
    }, []);

    const {
        task,
        summary,
        questionForUser,
        clientStatus,
        error,
        startTask,
        sendInput,
        cancelTask,
        taskId
    } = useTaskLiaison({
        agentUrl: JOKE_AGENT_URL,
        // taskId: null, // Start with no specific task ID
        summaryGenerator: jokeSummaryGenerator,
    });

    const handleStart = useCallback(() => {
        console.log("Starting joke task...");
        const params: Omit<TaskSendParams, 'id'> = { // Let hook/client generate ID
            message: { role: 'user', parts: [{ type: 'text', text: 'Tell me a joke about...' }] },
            metadata: { skillId: 'jokeAboutTopic' } // Assuming the sample agent uses this skillId
        };
        // Reset local state if needed
        setJokeTopic('');
        // Call the hook's start function
        startTask(params).then(newTaskId => {
             console.log("New task started with ID:", newTaskId);
             // Persist newTaskId if necessary (e.g., localStorage, URL) - hook handles internal management
        }).catch(console.error);
    }, [startTask]);

    const handleSendTopic = useCallback(() => {
        if (!questionForUser || !jokeTopic) return;
        console.log(`Sending topic: ${jokeTopic}`);
        const message: Message = { role: 'user', parts: [{ type: 'text', text: jokeTopic }] };
        sendInput(message)
            .then(() => setJokeTopic('')) // Clear input on success
            .catch(console.error);
    }, [sendInput, questionForUser, jokeTopic]);

    const handleCancel = useCallback(() => {
        cancelTask().catch(console.error);
    }, [cancelTask]);

    // Determine if the task interaction is ongoing
    const isRunning = clientStatus !== 'idle' && clientStatus !== 'completed' && clientStatus !== 'error';

    return (
        <div className="App">
            <h1>A4A React Hook Demo</h1>
            <p>Agent URL: <code>{JOKE_AGENT_URL}</code></p>

            <div className="card">
                <h2>Task Liaison</h2>
                <p>
                    Status: <strong>{summary.label}</strong> {summary.icon} <br/>
                    <small>(Client: {clientStatus} {taskId ? `| Task: ${taskId}` : ''})</small>
                </p>
                {summary.detail && (
                    <p style={{ fontStyle: 'italic', background: '#eee', padding: '10px', borderRadius: '5px' }}>
                        {summary.detail}
                    </p>
                )}

                {error && <p style={{ color: 'red' }}>Error: {error.message}</p>}

                {/* Show Start button only when idle */}
                {clientStatus === 'idle' && (
                    <button onClick={handleStart}>Tell me a joke</button>
                )}

                {/* Show input section when awaiting input */}
                {clientStatus === 'awaiting-input' && questionForUser && (
                    <div style={{ marginTop: '15px', borderTop: '1px solid #ccc', paddingTop: '15px' }}>
                        <label htmlFor="jokeTopicInput">{questionForUser.prompt}</label><br />
                        <input
                            id="jokeTopicInput"
                            type="text"
                            value={jokeTopic}
                            onChange={(e) => setJokeTopic(e.target.value)}
                            placeholder="Enter joke topic"
                            disabled={!isRunning} // Should be true if awaiting-input
                            style={{ marginRight: '5px' }}
                        />
                        <button onClick={handleSendTopic} disabled={!isRunning || !jokeTopic}>
                            Send Topic
                        </button>
                    </div>
                )}

                {/* Show Cancel button when running and not awaiting input */}
                {isRunning && clientStatus !== 'awaiting-input' && (
                    <button onClick={handleCancel} style={{ marginLeft: '10px', background: '#ffdddd' }}>
                        Cancel Task
                    </button>
                )}
            </div>

            {/* Optional: Display raw task state for debugging */}
            {/* <div className="card">
                <h2>Raw Task State</h2>
                <pre style={{ textAlign: 'left', background: '#f8f8f8', padding: '10px', borderRadius: '5px', maxHeight: '300px', overflowY: 'auto' }}>
                    {JSON.stringify(task, null, 2) || 'No task data'}
                </pre>
            </div> */}
        </div>
    );
}

export default App;

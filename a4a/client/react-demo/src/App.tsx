import React, { useState, useCallback, useMemo } from 'react';
import { useTaskLiaison } from './hooks/useTaskLiaison';
import { Message, TextPart, Task, DataPart } from '@a2a/client/src/types'; // A2A types
import './App.css'; // Keep default styling for now

const JOKE_AGENT_URL = 'http://localhost:3100/a2a'; // Make sure your sample agent runs here

function App() {
    const [inputValue, setInputValue] = useState('');

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
        task: _task,
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
        summaryGenerator: jokeSummaryGenerator,
    });

    // Define isRunning *before* the callbacks that use it
    const isRunning = clientStatus !== 'idle' && clientStatus !== 'completed' && clientStatus !== 'error';

    // --- App-specific logic to interpret the questionForUser Message --- 
    const promptText = useMemo(() => {
        if (!questionForUser) return '\u00A0'; // Return non-breaking space if no question
        // Find the first text part in the message
        const textPart = questionForUser.parts.find(p => p.type === 'text') as TextPart | undefined;
        return textPart?.text || 'Input required'; // Fallback text
    }, [questionForUser]);

    const currentOptions = useMemo(() => {
        if (!questionForUser) return null;
        // Find the first data part
        const dataPart = questionForUser.parts.find(p => p.type === 'data') as DataPart | undefined;
        // Check if it has an 'options' array
        if (dataPart?.data && Array.isArray(dataPart.data.options)) {
            return dataPart.data.options as string[];
        }
        return null;
    }, [questionForUser]);
    // --- End App-specific logic --- 

    // Generic submission handler - now constructs the Message
    const handleSubmit = useCallback((valueToSubmit?: string) => {
        const finalValue = valueToSubmit ?? inputValue;
        if (!finalValue || clientStatus !== 'awaiting-input') return;

        console.log(`Constructing message for value: ${finalValue}`);
        // Construct the standard message structure here
        const message: Message = { 
            role: 'user', 
            parts: [{ type: 'text', text: finalValue }] 
            // If App needed to send other parts, logic would go here
        };

        sendInput(message) // Call the hook's sendInput
            .then(() => setInputValue('')) // Clear input on success
            .catch(console.error);
    }, [sendInput, inputValue, clientStatus]); // Use sendInput dependency

    // Handler for input changes - includes auto-submit logic specific to this App
    const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = event.target.value;
        setInputValue(newValue);
        if (currentOptions && currentOptions.includes(newValue)) {
            console.log(`Auto-submitting selected option: ${newValue}`);
            handleSubmit(newValue); // Pass the string value to handleSubmit
        }
    }, [currentOptions, handleSubmit]);

    // Handler for Enter key press
    const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter' && clientStatus === 'awaiting-input' && isRunning && inputValue) {
            event.preventDefault();
            console.log("Enter key pressed, submitting value...");
            handleSubmit(); // Calls handleSubmit with current inputValue
        }
    }, [clientStatus, isRunning, inputValue, handleSubmit]);

    const handleStart = useCallback(() => {
        setInputValue(''); 
        console.log("Starting joke task...");
        // Start with a generic message, agent determines if input is needed
        startTask({ message: { role: 'user', parts: [{ type: 'text', text: 'Tell me a joke' }] } })
             .catch(console.error);
    }, [startTask]);

    const handleCancel = useCallback(() => {
        cancelTask().catch(console.error);
    }, [cancelTask]);

    return (
        <div className="App">
            <h1>A4A React Hook Demo</h1>
            <p>Agent URL: <code>{JOKE_AGENT_URL}</code></p>

            <div className="card">
                <div>
                    <h2>Task Liaison</h2>
                    <div className="status-display">
                        <p>
                            Status: <strong>{summary.label}</strong> {summary.icon} <br/>
                            <small>(Client: {clientStatus} {taskId ? `| Task: ${taskId}` : ''})</small>
                        </p>
                        {summary.detail && (
                            <p className="summary-detail">
                                {summary.detail}
                            </p>
                        )}
                    </div>

                    {error && <p className="error-message">Error: {error.message}</p>}
                </div>

                <div className="controls-wrapper">
                    <div className="controls-area">
                        {clientStatus === 'idle' && (
                            <button onClick={handleStart}>Tell me a joke</button>
                        )}

                        {isRunning && clientStatus !== 'awaiting-input' && (
                            <button onClick={handleCancel} className="cancel-button">
                                Cancel Task
                            </button>
                        )}
                    </div>
                </div>

                <div className={`input-section ${clientStatus === 'awaiting-input' && questionForUser ? 'active' : ''}`}>
                    <label htmlFor="genericInput">
                        {promptText}
                    </label>
                    <input
                        id="genericInput"
                        type="text"
                        value={inputValue}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder={promptText.trim() || "Enter input"}
                        disabled={clientStatus !== 'awaiting-input' || !isRunning}
                        list={currentOptions ? "inputOptions" : undefined}
                    />
                    {currentOptions && (
                        <datalist id="inputOptions">
                            {currentOptions.map((option) => (
                                <option key={option} value={option} />
                            ))}
                        </datalist>
                    )}
                    <button
                        onClick={() => handleSubmit()}
                        disabled={clientStatus !== 'awaiting-input' || !isRunning || !inputValue}
                    >
                        Send
                    </button>
                </div>
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

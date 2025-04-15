import { 
    TaskLiaison, 
} from '../src/TaskLiaison.js'; // Adjust path as needed
import type { 
    TaskLiaisonSnapshot, 
} from '../src/TaskLiaison.js'; 
import type { A2AClientConfig } from '../src/A2AClient.js'; 
import type { Task, Message, TextPart, TaskSendParams, JsonRpcError } from '../src/types.js';

// --- Constants ---
const JOKE_AGENT_URL = 'http://localhost:3100/a2a'; 
const JOKE_AGENT_CARD_URL = 'http://localhost:3100/.well-known/agent.json';

// --- DOM Elements ---
const startButton = document.getElementById('start-joke-button') as HTMLButtonElement;
const statusArea = document.getElementById('status-area') as HTMLDivElement;
const summaryViewArea = document.getElementById('summary-view-area') as HTMLDivElement;
const taskDetailsArea = document.getElementById('task-details-area') as HTMLDivElement;
const errorArea = document.getElementById('error-area') as HTMLDivElement;

// --- Type Definitions for this Demo ---

// --- Strategies ---

// --- TaskLiaison Configuration ---
const clientConfig: A2AClientConfig = {
    agentEndpointUrl: JOKE_AGENT_URL,
    agentCardUrl: JOKE_AGENT_CARD_URL,
    getAuthHeaders: async () => ({}), // No auth needed for joke agent
    pollIntervalMs: 1000, // Use polling or SSE based on agent card
};

// --- Instantiate Liaison ---
const jokeLiaison = new TaskLiaison();

// --- Liaison Event Listener (for UI Updates) ---
jokeLiaison.onTransition((prevSnapshot, currentSnapshot) => {
    console.log("Liaison transition:", prevSnapshot?.liaisonState, "->", currentSnapshot.liaisonState, currentSnapshot);

    // --- Update Status Area ---
    statusArea.textContent = `Liaison State: ${currentSnapshot.liaisonState}`;

    // --- Update Summary View Area ---
    // Calculate summary text directly based on currentSnapshot.liaisonState
    let summaryText = "Status Unknown";
    let busyOverride: boolean | null = null; // Allow prompt logic to override busy state

    const taskState = currentSnapshot.task?.status?.state;

    switch (currentSnapshot.liaisonState) {
        case 'idle':
            summaryText = "Ready to start.";
            break;
        case 'starting':
            summaryText = "Starting task...";
            break;
        case 'running':
            summaryText = `Task running (Agent state: ${taskState || 'unknown'})...`;
            if (taskState === 'working') summaryText = "Thinking of a joke...";
            break;
        case 'awaiting-input':
            summaryText = "Waiting for user input...";
            // Allow user interaction while awaiting input
            busyOverride = false;
            break;
        case 'sending-input':
             summaryText = "Sending your input...";
             break;
        case 'canceling':
            summaryText = "Canceling task...";
            break;
        case 'closed':
            summaryText = `Task closed (Reason: ${currentSnapshot.closeReason || 'unknown'}).`;
            if (taskState === 'completed') summaryText = "Joke Delivered!";
            else if (taskState === 'canceled') summaryText = "Task Canceled";
            else if (taskState === 'failed') summaryText = "Task Failed";
            else summaryText = "Task Closed";
            break;
        case 'error':
            summaryText = `Error occurred: ${currentSnapshot.lastError?.message ?? 'Unknown error'}`;
            break;
    }
    summaryViewArea.textContent = summaryText;

    // --- Update Task Details Area ---
    if (currentSnapshot.task) {
        let taskText = `Task ID: ${currentSnapshot.task.id}\n`;
        taskText += `Agent State: ${currentSnapshot.task.status.state}\n`;
        if (currentSnapshot.task.status.message) {
            taskText += `Agent Message: ${(currentSnapshot.task.status.message.parts[0] as TextPart)?.text ?? '(No text)'}\n`;
        }
        if (currentSnapshot.task.artifacts && currentSnapshot.task.artifacts.length > 0) {
            taskText += `\nArtifacts:\n`;
             currentSnapshot.task.artifacts.forEach((art, index) => {
                 taskText += ` [${index}] ${art.name || 'N/A'}:`;
                 art.parts.forEach(part => {
                     if (part.type === 'text') taskText += ` "${part.text}"`;
                     else taskText += ` [${part.type}]`;
                 });
                 taskText += '\n';
             });
        }
        taskDetailsArea.textContent = taskText;
    } else {
        taskDetailsArea.textContent = '(No active task)';
    }

    // --- Update Error Area ---
    if (currentSnapshot.lastError) {
        let errorText = `Error: ${currentSnapshot.lastError.message}\n`;
        // Type guard for potential JsonRpcError details
        if ('code' in currentSnapshot.lastError) {
             errorText += `Code: ${currentSnapshot.lastError.code}\n`;
        }
        if ('data' in currentSnapshot.lastError && currentSnapshot.lastError.data) {
            errorText += `Data: ${JSON.stringify(currentSnapshot.lastError.data)}\n`;
        }
        errorArea.textContent = errorText;
        errorArea.style.display = 'block';
    } else {
        errorArea.style.display = 'none';
    }

    // --- Update Button State ---
     // Calculate isBusy based on currentSnapshot.liaisonState directly
     const isBusy = busyOverride ?? (currentSnapshot.liaisonState !== 'idle' && currentSnapshot.liaisonState !== 'closed' && currentSnapshot.liaisonState !== 'error');
     startButton.disabled = isBusy;

    // --- Handle Prompt Logic ---
    // Check if we just transitioned *into* awaiting-input
    if (currentSnapshot.liaisonState === 'awaiting-input' && prevSnapshot?.liaisonState !== 'awaiting-input') {
        console.log("Transitioned to awaiting-input. Preparing prompt.");
        const promptMessage = currentSnapshot.task?.status?.message;

        if (!promptMessage) {
            console.warn("Awaiting input but no prompt message found in task status.");
            return; // Or provide a default prompt
        }

        const agentPromptPart = promptMessage.parts.find(p => p.type === 'text') as TextPart | undefined;
        const promptText = agentPromptPart?.text ?? "The agent needs input (provide topic):";
        console.log("Prompt text:", promptText);

        // Use setTimeout to allow UI updates before blocking with window.prompt
        setTimeout(() => {
            console.log("Prompting user for input...");
            // Re-check state *inside* timeout in case it changed while waiting
            const stateBeforePrompt = jokeLiaison.getCurrentSnapshot().liaisonState;
            if (stateBeforePrompt !== 'awaiting-input') {
                 console.warn(`Liaison state changed to ${stateBeforePrompt} before prompt could be shown. Input ignored.`);
                 return;
            }

            const userInput = window.prompt(promptText);

            // Re-check state *after* prompt in case it changed while prompt was open
            if (jokeLiaison.getCurrentSnapshot().liaisonState !== 'awaiting-input') {
                 console.warn("Liaison state changed while prompt was open. Input ignored.");
                 return;
            }

            if (userInput === null) {
                console.log("User cancelled the prompt.");
                // Optionally close or cancel the task here if the user cancels the prompt
                // jokeLiaison.cancelTask();
                // jokeLiaison.closeTask('closed-by-user-cancel-prompt');
            } else {
                console.log(`User provided topic: "${userInput}"`);
                const responseMessage: Message = { role: 'user', parts: [{ type: 'text', text: userInput }] };
                try {
                    // Send input back via liaison
                    jokeLiaison.provideInput(responseMessage);
                    // UI state will update via the next onTransition event when state changes to 'sending-input' or 'running'
                } catch (err) {
                    console.error("Error calling provideInput from prompt:", err);
                    // Update UI or error state appropriately here if provideInput fails synchronously
                    errorArea.textContent = `Error sending input: ${err instanceof Error ? err.message : String(err)}`;
                    errorArea.style.display = 'block';
                    // Potentially update status/summary area too
                }
            }
        }, 50); // Small delay
    }

});

// --- Button Event Listener ---
startButton.addEventListener('click', async () => {
    const currentState = jokeLiaison.getCurrentSnapshot().liaisonState;
    if (currentState !== 'idle' && currentState !== 'closed' && currentState !== 'error') {
        console.warn(`Task cannot be started from state: ${currentState}.`);
        return;
    }

    console.log("Starting jokeAboutTopic task...");
    const startParams: TaskSendParams = {
        message: { role: 'user', parts: [{ type: 'text', text: 'Tell me a joke about...' }] },
        metadata: { skillId: 'jokeAboutTopic' }
    };

    try {
        // Pass clientConfig directly to startTask
        jokeLiaison.startTask(startParams, clientConfig);
        // UI updates will happen via the 'onTransition' listener
    } catch (error) {
        console.error("Error starting task:", error);
        // Update UI directly ONLY on initial startTask synchronous error
        statusArea.textContent = "Liaison State: Error starting";
        summaryViewArea.textContent = `Error starting task: ${error instanceof Error ? error.message : String(error)}`;
        taskDetailsArea.textContent = "";
        errorArea.textContent = `Start Error: ${error instanceof Error ? error.message : String(error)}`;
        errorArea.style.display = 'block';
        startButton.disabled = false;
    }
});

console.log("Joke Liaison Demo V2 initialized");
// No initial UI update needed here - the 'onTransition' listener handles the initial state.


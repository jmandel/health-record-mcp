import { 
    TaskLiaison, 
} from '../src/TaskLiaison.js'; // Adjust path as needed
import type { 
    TaskLiaisonSnapshot, 
    TaskLiaisonConfig, 
    UserFacingSummaryView,
    PromptViewStrategy,     // Import strategy types explicitly
    SummaryViewStrategy 
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

// Our custom summary view structure
interface DemoSummaryView extends UserFacingSummaryView {
    title: string;
    statusText: string;
    busy: boolean;
}

// Our custom prompt view structure (even though we don't use a specific strategy to set it)
interface DemoPromptView {
    promptQuestion: string | null;
}

// --- Strategies ---

const calculateAndUpdateSummary: SummaryViewStrategy<DemoSummaryView, DemoPromptView> =
    (liaison, snapshot) => {
        console.log("calculateAndUpdateSummary called with snapshot:", snapshot);
        let newTitle = "Joke Task";
        let newStatusText = "Initializing...";
        let newBusy = true; // Default to busy unless idle/closed/error

        const taskState = snapshot.task?.status?.state;
        console.log("calculateAndUpdateSummary called with snapshot:", snapshot.liaisonState, "DEBUG");

        switch (snapshot.liaisonState) {
            case 'idle':
                newStatusText = "Ready to start.";
                newBusy = false;
                break;
            case 'starting':
                newStatusText = "Starting task...";
                break;
            case 'running':
                newStatusText = `Task running (Agent state: ${taskState || 'unknown'})...`;
                 if (taskState === 'working') newTitle = "Thinking of a joke...";
                break;
            case 'awaiting-input':
                newStatusText = "Waiting for user input...";
                 newTitle = "Needs Input";
                 newBusy = false; // Allow user interaction
                break;
            case 'sending-input':
                 newStatusText = "Sending your input...";
                 newTitle = "Sending Input";
                 break;
            case 'canceling':
                newStatusText = "Canceling task...";
                newTitle = "Canceling";
                break;
            case 'closed':
                newStatusText = `Task closed (Reason: ${snapshot.closeReason || 'unknown'}).`;
                if (taskState === 'completed') newTitle = "Joke Delivered!";
                else if (taskState === 'canceled') newTitle = "Task Canceled";
                else if (taskState === 'failed') newTitle = "Task Failed";
                else newTitle = "Task Closed";
                newBusy = false;
                break;
            case 'error':
                newStatusText = `Error occurred: ${snapshot.lastError?.message ?? 'Unknown error'}`;
                newTitle = "Error!";
                newBusy = false;
                break;
        }

        const newSummaryView: DemoSummaryView = {
            label: newTitle, // Use label for the main title
            detail: newStatusText, // Use detail for status text
            title: newTitle, // Keep our custom fields if needed elsewhere
            statusText: newStatusText,
            busy: newBusy,
        };

        // ---> The core effect: set the computed view on the liaison <---
        console.log("Setting summary view:", newSummaryView);
        liaison.setSummaryView(newSummaryView);
    };

const handleInputWithWindowPrompt: PromptViewStrategy<DemoSummaryView, DemoPromptView> =
    (liaison, prompt) => {
        // This strategy uses the raw prompt message directly

        console.log("handleInputWithWindowPrompt called with prompt:", prompt);
        const snapshot = liaison.getCurrentSnapshot(); // Get current state

        if (snapshot.liaisonState !== 'awaiting-input' || !prompt) {
            console.warn("WindowPromptStrategy called but liaison not awaiting input or prompt message missing.");
            return;
        }

        const agentPromptPart = prompt.parts.find(p => p.type === 'text') as TextPart | undefined;
        const promptText = agentPromptPart?.text ?? "The agent needs input (provide topic):";
        console.log("handleInputWithWindowPrompt called with prompt:", promptText);

        // Use timeout to allow potential UI update from summary strategy
        setTimeout(() => {
            console.log("Prompting user for input...");
            const userInput = window.prompt(promptText);

            // Re-check state in case it changed while prompt was open
            if (liaison.getCurrentSnapshot().liaisonState !== 'awaiting-input') {
                 console.warn("Liaison state changed while prompt was open. Input ignored.");
                 return;
            }

            if (userInput === null) {
                console.log("User cancelled the prompt.");
                // Optionally close the task here if desired
                // liaison.closeTask('closed-by-user-cancel-prompt');
            } else {
                console.log(`User provided topic: "${userInput}"`);
                const responseMessage: Message = { role: 'user', parts: [{ type: 'text', text: userInput }] };
                try {
                    // ---> Effect: Send input back via liaison <---
                    liaison.provideInput(responseMessage);
                } catch (err) {
                    console.error("Error calling provideInput:", err);
                    // Maybe update the liaison's error state or view here?
                }
            }
        }, 50);
    };

// --- TaskLiaison Configuration ---
const clientConfig: A2AClientConfig = {
    agentEndpointUrl: JOKE_AGENT_URL,
    agentCardUrl: JOKE_AGENT_CARD_URL,
    getAuthHeaders: async () => ({}), // No auth needed for joke agent
    pollIntervalMs: 1000, // Use polling or SSE based on agent card
};

const liaisonConfig: TaskLiaisonConfig<DemoSummaryView, DemoPromptView> = {
    // No initialSummaryView needed, strategy will set it on first change
    updateSummaryViewStrategy: calculateAndUpdateSummary,
    updatePromptViewStrategy: handleInputWithWindowPrompt,
    // No createPromptViewStrategy - we don't use the promptView structure directly
};

// --- Instantiate Liaison ---
const jokeLiaison = new TaskLiaison(liaisonConfig);

// --- Liaison Event Listener (for UI Updates) ---
jokeLiaison.on('change', (snapshot) => {
    console.log("Liaison changed:", snapshot);

    // --- Update Status Area ---
    statusArea.textContent = `Liaison State: ${snapshot.liaisonState}`;

    // --- Update Summary View Area ---
    // Display the summary view computed by our strategy
    summaryViewArea.textContent = snapshot.summaryView
        ? JSON.stringify(snapshot.summaryView, null, 2)
        : '(No summary view set)';

    // --- Update Task Details Area ---
    if (snapshot.task) {
        let taskText = `Task ID: ${snapshot.task.id}\n`;
        taskText += `Agent State: ${snapshot.task.status.state}\n`;
        if (snapshot.task.status.message) {
            taskText += `Agent Message: ${(snapshot.task.status.message.parts[0] as TextPart)?.text ?? '(No text)'}\n`;
        }
        if (snapshot.task.artifacts && snapshot.task.artifacts.length > 0) {
            taskText += `\nArtifacts:\n`;
             snapshot.task.artifacts.forEach((art, index) => {
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
    if (snapshot.lastError) {
        let errorText = `Error: ${snapshot.lastError.message}\n`;
        // Type guard for potential JsonRpcError details
        if ('code' in snapshot.lastError) {
             errorText += `Code: ${snapshot.lastError.code}\n`;
        }
        if ('data' in snapshot.lastError && snapshot.lastError.data) {
            errorText += `Data: ${JSON.stringify(snapshot.lastError.data)}\n`;
        }
        errorArea.textContent = errorText;
        errorArea.style.display = 'block';
    } else {
        errorArea.style.display = 'none';
    }

    // --- Update Button State ---
     // Use the 'busy' flag from our computed summary view, or fallback logic
     const isBusy = snapshot.summaryView?.busy ?? (snapshot.liaisonState !== 'idle' && snapshot.liaisonState !== 'closed' && snapshot.liaisonState !== 'error');
     startButton.disabled = isBusy;

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
        jokeLiaison.startTask(startParams, clientConfig);
        // UI updates will happen via the 'change' listener when state transitions
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

console.log("Joke Liaison Demo V2 initialized", jokeLiaison._emitter);
// No initial UI update needed here - the 'change' listener handles the initial state.
// No initial UI update needed here - the 'change' listener handles the initial state.


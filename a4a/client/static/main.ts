import { 
    A2AClient,
    A2AClientConfig,
    ClientManagedState,
    TaskUpdatePayload,
    StatusUpdatePayload,
    ErrorPayload,
    ClosePayload,
    ClientCloseReason
} from '../src/A2AClient'; 
import { 
    Task,
    Message,
    TextPart,
    TaskSendParams,
    JsonRpcError,
    TaskState
} from '../src/types';

// --- Constants ---
const JOKE_AGENT_URL = 'http://localhost:3100/a2a';
const LOCAL_STORAGE_TASK_ID_KEY = 'a4aDemoTaskId';
const LOCAL_STORAGE_AGENT_URL_KEY = 'a4aDemoAgentUrl';

// --- DOM Elements ---
const startButton = document.getElementById('start-joke-button') as HTMLButtonElement;
const resetButton = document.getElementById('reset-button') as HTMLButtonElement;
const statusArea = document.getElementById('status-area') as HTMLDivElement;
const taskDetailsArea = document.getElementById('task-details-area') as HTMLDivElement;
const errorArea = document.getElementById('error-area') as HTMLDivElement;

// --- Application State ---
let currentClient: A2AClient | null = null;
let currentTask: Task | null = null;
let clientState: ClientManagedState = 'idle';
let lastError: Error | JsonRpcError | null = null;
let lastCloseReason: ClientCloseReason | null = null;

// --- A2AClient Configuration ---
// We omit agentEndpointUrl here because it's passed directly to create/resume
const clientConfig: Omit<A2AClientConfig, 'agentEndpointUrl'> = {
    getAuthHeaders: async () => ({}), // No auth needed for joke agent
    pollIntervalMs: 1000, // Adjust as needed
    // Let agent card decide strategy (SSE or poll)
};

// --- UI Update Function ---
function updateUI() {
    statusArea.textContent = `Client State: ${clientState}`; 

    // Task Details
    if (currentTask) {
        let taskText = `Task ID: ${currentTask.id}\n`;
        taskText += `Agent State: ${currentTask.status.state}\n`;
        // Show agent message ONLY if not awaiting input (handled by prompt logic elsewhere)
        if (clientState !== 'input-required' && currentTask.status.message) {
            taskText += `Agent Message: ${(currentTask.status.message.parts[0] as TextPart)?.text ?? '(No text)'}\n`;
        }
        if (currentTask.artifacts && currentTask.artifacts.length > 0) {
            taskText += `\nArtifacts:\n`;
            currentTask.artifacts.forEach((art, index) => {
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

    // Error Area
    if (lastError) {
        let errorText = `Error: ${lastError.message}\n`;
        if ('code' in lastError && lastError.code) { errorText += `Code: ${lastError.code}\n`; }
        if ('data' in lastError && lastError.data) { errorText += `Data: ${JSON.stringify(lastError.data)}\n`; }
        errorArea.textContent = errorText;
        errorArea.style.display = 'block';
    } else if (clientState === 'closed' && lastCloseReason && !['task-completed', 'task-canceled-by-client', 'task-canceled-by-agent'].includes(lastCloseReason)) {
        // Show non-standard close reasons as errors
        errorArea.textContent = `Client Closed Unexpectedly: ${lastCloseReason}`;
        errorArea.style.display = 'block';
    } else {
        errorArea.style.display = 'none';
    }

    // Button State (Disabled unless idle, closed, or error)
    startButton.disabled = !['idle', 'closed', 'error'].includes(clientState);
}

// --- Event Handlers ---

async function handleInputRequired(task: Task) {
    console.log("handleInputRequired called");
    const promptMessage = task.status.message;
    if (!promptMessage) {
        console.warn("input-required state but no prompt message found.");
        lastError = new Error("Agent requires input but didn't provide a prompt.");
        updateUI();
        return;
    }

    const agentPromptPart = promptMessage.parts.find(p => p.type === 'text') as TextPart | undefined;
    const promptText = agentPromptPart?.text ?? "The agent needs input (provide topic):";

    // Use timeout to allow UI to update before blocking with prompt
    setTimeout(async () => {
        console.log("Prompting user...");
        const userInput = window.prompt(promptText);

        // Re-check state *after* prompt
        if (!currentClient || currentClient.getCurrentState() !== 'input-required') {
            console.warn("Client state changed while prompt was open. Input ignored.");
            return;
        }

        if (userInput === null) {
            console.log("User cancelled the prompt.");
            // Optional: Cancel the task if prompt is cancelled
            // await currentClient.cancel(); 
        } else {
            console.log(`User provided topic: "${userInput}"`);
            const responseMessage: Message = { role: 'user', parts: [{ type: 'text', text: userInput }] };
            try {
                await currentClient.send(responseMessage);
                clientState = currentClient.getCurrentState(); // Should be 'sending' or similar briefly
                lastError = null; // Clear previous errors
                updateUI(); 
            } catch (err) {
                console.error("Error calling client.send:", err);
                lastError = err instanceof Error ? err : new Error(String(err));
                clientState = currentClient.getCurrentState(); // Update state even on error
                updateUI();
            }
        }
    }, 50); // Small delay
}

function handleTaskUpdate(payload: TaskUpdatePayload) {
    console.log("Received task-update:", payload);
    currentTask = payload.task;
    // Update the general clientState variable for UI purposes
    // Status-specific reactions are handled in handleStatusUpdate
    clientState = currentClient?.getCurrentState() ?? clientState;
    lastError = null; // Clear error on successful update

    updateUI();
}

// Added: Handler specifically for status changes
function handleStatusUpdate(payload: StatusUpdatePayload) {
    console.log("Received status-update:", payload.status);
    // Update the clientState variable whenever status changes
    clientState = currentClient?.getCurrentState() ?? clientState;

    // React specifically to input-required state
    if (payload.status.state === 'input-required') {
        // Pass the task object from the payload, which includes the necessary message
        handleInputRequired(payload.task);
    }
    // Potentially handle other status-specific logic here if needed

    updateUI(); // Update UI based on potential clientState change
}

function handleError(payload: ErrorPayload) {
    console.error("Received client error:", payload);
    lastError = payload.error;
    clientState = currentClient?.getCurrentState() ?? 'error'; // Client might already be in error state
    updateUI();
}

function handleClose(payload: ClosePayload) {
    console.log(`Received client close: ${payload.reason}`);
    clientState = 'closed';
    lastCloseReason = payload.reason;

    // Don't clear task display, keep the last known state
    currentClient = null; // Important: Release the client instance
    updateUI();
}

// --- Task Management Functions ---

function storeTask(taskId: string, agentUrl: string) {
    try {
        localStorage.setItem(LOCAL_STORAGE_TASK_ID_KEY, taskId);
        localStorage.setItem(LOCAL_STORAGE_AGENT_URL_KEY, agentUrl);
        console.log(`Stored task ${taskId} for agent ${agentUrl}`);
    } catch (e) {
        console.error("Failed to store task in localStorage:", e);
    }
}

function clearStoredTask() {
    try {
        localStorage.removeItem(LOCAL_STORAGE_TASK_ID_KEY);
        localStorage.removeItem(LOCAL_STORAGE_AGENT_URL_KEY);
        console.log("Cleared stored task from localStorage.");
    } catch (e) {
        console.error("Failed to clear task from localStorage:", e);
    }
}

function getStoredTask(): { taskId: string; agentUrl: string } | null {
    try {
        const taskId = localStorage.getItem(LOCAL_STORAGE_TASK_ID_KEY);
        const agentUrl = localStorage.getItem(LOCAL_STORAGE_AGENT_URL_KEY);
        if (taskId && agentUrl) {
            return { taskId, agentUrl };
        }
    } catch (e) {
        console.error("Failed to read task from localStorage:", e);
    }
    return null;
}

// --- Start/Resume Task Functions ---

function registerClientListeners(client: A2AClient) {
    client.on('task-update', handleTaskUpdate);
    client.on('status-update', handleStatusUpdate);
    client.on('error', handleError);
    client.on('close', handleClose);
}

async function startJokeTask() {
    if (currentClient) {
        console.warn("Task already in progress.");
        return;
    }

    console.log("Starting new jokeAboutTopic task...");
    currentTask = null;
    lastError = null;
    lastCloseReason = null;
    clientState = 'initializing';
    updateUI();

    // 1. Prepare initial parameters and determine task ID
    let startParams: TaskSendParams = {
        message: { role: 'user', parts: [{ type: 'text', text: 'Tell me a joke about...' }] },
        metadata: { skillId: 'jokeAboutTopic' }
        // id can be pre-populated or generated below
    };
    const taskId = startParams.id ?? crypto.randomUUID();
    startParams = { ...startParams, id: taskId }; // Ensure ID is in params

    // 2. Store task details immediately
    storeTask(taskId, JOKE_AGENT_URL);

    // 3. Attempt to create the client
    try {
        currentClient = await A2AClient.create(JOKE_AGENT_URL, startParams, clientConfig);
        console.log("Client created, Task ID:", currentClient.taskId);
        // Task details already stored

        registerClientListeners(currentClient);

        clientState = currentClient.getCurrentState();
        currentTask = currentClient.getCurrentTask();

        if (clientState === 'input-required' && currentTask) {
            handleInputRequired(currentTask);
        }

        updateUI();

    } catch (error) {
        console.error("Error during A2AClient.create:", error);
        lastError = error instanceof Error ? error : new Error(String(error));
        clientState = 'error';
        currentClient = null;
        updateUI();
    }
}

async function resumeJokeTask(taskId: string, agentUrl: string) {
    if (currentClient) {
        console.warn("Task already in progress.");
        return;
    }

    console.log(`Attempting to resume task ${taskId} at ${agentUrl}...`);
    currentTask = null;
    lastError = null;
    lastCloseReason = null;
    clientState = 'initializing'; // Or 'resuming'? Let's use initializing for simplicity
    updateUI();

    try {
        currentClient = await A2AClient.resume(agentUrl, taskId, clientConfig);
        console.log("Client resumed, Task ID:", currentClient.taskId);

        // No need to store again, already stored

        registerClientListeners(currentClient);

        clientState = currentClient.getCurrentState();
        currentTask = currentClient.getCurrentTask();

        if (clientState === 'input-required' && currentTask) {
            handleInputRequired(currentTask);
        } else if (clientState === 'error') {
            // If resume immediately results in error state, capture it
            lastError = new Error("Client entered error state immediately after resume.");
        }

        updateUI();

    } catch (error) {
        console.error("Error during A2AClient.resume:", error);
        lastError = error instanceof Error ? error : new Error(String(error));
        clientState = 'error';
        currentClient = null;
        updateUI();
    }
}

// --- Reset Function ---
function handleReset() {
    console.log("Reset button clicked.");

    // 1. Clear stored task details
    clearStoredTask();

    // 2. Close any active client connection
    if (currentClient) {
        console.log("Closing active client connection...");
        // Use 'closed-by-caller' or a specific reset reason
        currentClient.close('closed-by-caller');
        // Note: The client's 'close' event will fire, setting state to 'closed'
        // We will reset state manually below anyway.
    }

    // 3. Reset application state variables
    currentClient = null;
    currentTask = null;
    lastError = null;
    lastCloseReason = null;
    clientState = 'idle'; // Set state directly to idle

    // 4. Update UI
    console.log("Reset complete. Updating UI.");
    updateUI();
}

// --- Initialization ---
function initializeApp() {
    const storedTask = getStoredTask();
    if (storedTask) {
        console.log(`Found stored task: ${storedTask.taskId}`);
        resumeJokeTask(storedTask.taskId, storedTask.agentUrl);
    } else {
        console.log("No stored task found.");
        updateUI(); // Show initial idle state
    }

    startButton.addEventListener('click', startJokeTask);
    resetButton.addEventListener('click', handleReset);
    console.log("Direct A2A Client Demo initialized.");
}

initializeApp(); // Run initialization logic 
    // Import SDK Server and your custom Transport
     import { McpServer, IntraBrowserServerTransport, z } from '@jmandel/ehr-mcp/src/tools-browser-entry.js';
     // Import Setup Protocol types from the transport definition file
     import type { 
         // No specific v2 types needed here, messages defined inline
     } from '../../../src/IntraBrowserTransport'; // Corrected relative path
     // Import Tool result types and RequestHandlerExtra from SDK

    // --- Constants ---
    const LOG_PREFIX = '[Echo Tool]';
    const COUNTER_KEY = 'mcpEchoCounter';
    const SUFFIX_KEY = 'mcpEchoSuffix'; // Changed from config done to suffix

    // --- DOM Elements (Initialized later) ---
    let logElement: HTMLElement | null = null;
    let configureSection: HTMLElement | null = null;
    let setupSection: HTMLElement | null = null;
    let counterDisplay: HTMLElement | null = null;
    let grantAccessBtn: HTMLButtonElement | null = null;
    let doneBtn: HTMLButtonElement | null = null;
    let abortBtn: HTMLButtonElement | null = null;
    let saveFinishBtn: HTMLButtonElement | null = null;
    let configStatusSpan: HTMLElement | null = null;
    let storageStatusSpan: HTMLElement | null = null;
    let setupNoteSpan: HTMLElement | null = null;
    let suffixInput: HTMLInputElement | null = null; // Input for echo suffix

    // --- Logging Setup ---
    function log(message: string, ...details: any[]) {
        console.log(LOG_PREFIX, message, ...details);
        if (logElement) {
            const time = new Date().toLocaleTimeString();
            const detailString = details.length > 0 ? ` ${JSON.stringify(details)}` : "";
            logElement.textContent += `[${time}] ${message}${detailString}\n`;
            logElement.scrollTop = logElement.scrollHeight;
        }
    }

    // Helper to get the correct Storage object (unpartitioned if handle exists, otherwise global)
    function getStorage(): Storage {
        const handle = (window as any)._saHandle;
        if (handle && handle.localStorage) {
            log("Using handle.localStorage for unpartitioned access.");
            return handle.localStorage;
        } else {
            log("Falling back to window.localStorage (might be partitioned).");
            return window.localStorage;
        }
    }

    // --- LocalStorage Counter Helpers ---
    function getCounter(): number {
        try {
            const value = getStorage().getItem(COUNTER_KEY);
            return value ? parseInt(value, 10) : 0;
        } catch (e) {
            log("Error reading counter from localStorage:", e);
            return 0; // Default value on error
        }
    }

    function incrementCounter(): number {
        let currentCount = getCounter();
        currentCount++;
        try {
            getStorage().setItem(COUNTER_KEY, currentCount.toString());
            return currentCount;
        } catch (e) {
            log("Error writing counter to localStorage:", e);
            return currentCount -1; // Return previous value on error
        }
    }

    // --- Suffix Helpers ---
    function saveSuffix(suffix: string) {
        try {
            getStorage().setItem(SUFFIX_KEY, suffix);
            log("Saved suffix:", suffix);
        } catch (e) {
            log("Error saving suffix to localStorage:", e);
        }
    }

    function getSuffix(): string {
        try {
            return getStorage().getItem(SUFFIX_KEY) || ""; // Default to empty string
        } catch (e) {
            log("Error reading suffix from localStorage:", e);
            return "";
        }
    }

    // Check if *both* suffix is set AND storage access is granted
    async function isSetupComplete(): Promise<boolean> {
        const suffixSet = getSuffix() !== "";
        const permissionState = await getStoragePermissionState();
        // Considered complete only if permission is granted *and* suffix is set
        return permissionState === 'granted' && suffixSet;
    }

    function isConfigDone(): boolean { // Config is considered done if suffix is set
         try {
             return getStorage().getItem(SUFFIX_KEY) !== null; // Check if key exists
         } catch (e) {
             log("Error reading config done flag from localStorage:", e);
             return false;
         }
    }

    // --- Permissions and Setup Helpers ---
    async function getStoragePermissionState(): Promise<PermissionState> {
        log("Querying 'storage-access' permission state...");
        if (navigator.permissions && typeof navigator.permissions.query === 'function') {
            try {
                // Note: Some browsers might require a specific { name: 'storage-access', topLevelSite: '...' } 
                // structure, but let's start with the simpler form.
                const permissionStatus = await navigator.permissions.query({ name: 'storage-access' as any }); // Use 'as any' for broader compatibility
                log("'storage-access' permission state:", permissionStatus.state);
                return permissionStatus.state;
            } catch (e) {
                log("Error querying 'storage-access' permission:", e);
                // If query fails, assume we need to prompt
                return 'prompt';
            }
        } else {
            log("Permissions API or query method not available. Assuming 'prompt'.");
            // Fallback if Permissions API isn't supported
            return 'prompt'; 
        }
    }

    // Helper to update UI elements after storage access is confirmed granted
    function updateUiAfterGrant() {
        log("Updating UI for granted storage access...");
        if (!storageStatusSpan || !configStatusSpan || !suffixInput || !grantAccessBtn || !saveFinishBtn || !setupNoteSpan) {
            log("Error: Cannot update UI after grant, essential elements missing.");
            return;
        }
        
        const freshSuffix = getSuffix(); // Read from potentially unpartitioned storage
        suffixInput.value = freshSuffix;
        configStatusSpan.textContent = freshSuffix ? 'Saved' : 'Needed';
        storageStatusSpan.textContent = 'Granted';
        setupNoteSpan.textContent = "Storage access granted! Enter suffix and click Save & Finish.";

        grantAccessBtn.disabled = true;
        suffixInput.disabled = false;
        saveFinishBtn.disabled = false;
    }

    function postToParent(message: any, targetOrigin: string) {
        if (!window.parent || window.parent === window) {
            log("Error: Cannot post message, not in an iframe or parent is self.");
            return;
        }
        log(`Posting message to parent (${targetOrigin || '*'}):`, message);
        window.parent.postMessage(message, targetOrigin || '*'); // Use specific origin if known
    }

    // Function to send final status back to client (v2.0)
    function sendSetupStatus(type: 'SERVER_SETUP_COMPLETE' | 'SERVER_SETUP_ABORT', payload: any, clientOrigin: string) {
         if (!clientOrigin) {
            log("Cannot send setup status, clientOrigin is missing.");
            return;
         }
         const message = { type, success: type === 'SERVER_SETUP_COMPLETE', ...payload };
         postToParent(message, clientOrigin); // Use postToParent for v2.0
    }

    // --- Phase Handlers ---

    // Function to attempt storage access request and set the handle if successful.
    // Returns true if access is likely activated (handle obtained or legacy succeeded), false otherwise.
    async function tryActivateStorageAccess(): Promise<boolean> {
        log("Attempting to request storage access...");
        try {
            if (typeof (document as any).requestStorageAccess !== 'function') {
                log("requestStorageAccess API not available.");
                return false;
            }

            // Try with { localStorage: true } first
            try {
                log("Attempting document.requestStorageAccess({ localStorage: true })…");
                const handle = await (document as any).requestStorageAccess({ localStorage: true });
                log("Successfully called requestStorageAccess({ localStorage: true }).");
                log("requestStorageAccess({ localStorage: true }) returned:", handle);
                (window as any)._saHandle = handle;
                return true; // Success!
            } catch (e) {
                if (e instanceof TypeError) {
                    log("Call with { localStorage: true } failed (likely older API), trying no-argument call...");
                    const result = await (document as any).requestStorageAccess();
                    log("Successfully called requestStorageAccess() with no arguments (cookies only).");
                    log("requestStorageAccess() returned:", result);
                    // Assume success for legacy, though we don't get a localStorage handle
                    return true; 
                } else {
                    log("Error invoking requestStorageAccess (initial attempt):", e);
                    throw e; // Re-throw unexpected errors
                }
            }
        } catch (err) {
            log("Error during requestStorageAccess process:", err);
            return false;
        }
    }

    async function handleSetupPhase(clientOrigin: string | null) {
        log("Running in SETUP phase.");
        if (!clientOrigin || !setupSection || !configStatusSpan || !storageStatusSpan || !grantAccessBtn || !saveFinishBtn || !abortBtn || !setupNoteSpan || !suffixInput) {
            log("Error: Setup phase requires client origin or essential DOM elements are missing.");
            if (clientOrigin) { // Try to notify client if possible
                 sendSetupStatus('SERVER_SETUP_ABORT', { code: 'FAILED', reason: 'Setup iframe internal error (missing elements)' }, clientOrigin);
            }
            return;
        }
        
        // Show the setup UI
        setupSection.style.display = 'block';

        // --- Initial State Determination using Permissions API ---
        const initialState = await getStoragePermissionState();

        // Default UI state (prompt or denied)
        suffixInput.disabled = true;
        saveFinishBtn.disabled = true;
        grantAccessBtn.disabled = true; // Start disabled, enable below if needed
        configStatusSpan.textContent = 'Needed';
        storageStatusSpan.textContent = 'Needed';

        if (initialState === 'granted') {
            log("Initial permission state is 'granted'. Attempting to activate access without user click...");
            setupNoteSpan.textContent = "Permission previously granted. Activating access...";
            const activated = await tryActivateStorageAccess();
            if (activated) {
                log("Storage access activated successfully.");
                updateUiAfterGrant();
            } else {
                log("Failed to activate storage access even though permission was granted.");
                setupNoteSpan.textContent = "Permission granted, but failed to activate storage access automatically.";
                // Keep controls disabled
            }

        } else if (initialState === 'prompt') {
            log("Initial permission state is 'prompt'. User interaction required.");
            setupNoteSpan.textContent = "Please click 'Grant Storage Access' to proceed.";
            grantAccessBtn.disabled = false; // Enable the button
            // Setup the click handler to request access
            grantAccessBtn.onclick = async () => { 
                 log("Grant Storage Access button clicked.");
                 if (!grantAccessBtn || !setupNoteSpan) return;

                 grantAccessBtn.disabled = true; // Disable button during attempt
                 setupNoteSpan.textContent = "Requesting storage access...";

                 const activated = await tryActivateStorageAccess();
                 if (activated) {
                     log("Storage access activated successfully via button click.");
                     updateUiAfterGrant();
                 } else {
                     log("Storage access activation failed after button click.");
                     setupNoteSpan.textContent = "Storage access denied or failed. You may need to adjust browser settings or try again.";
                     grantAccessBtn.disabled = false; // Re-enable button on failure
                 }
             };

        } else { // initialState === 'denied'
            log("Initial permission state is 'denied'. Access cannot be requested.");
            storageStatusSpan.textContent = 'Denied';
            setupNoteSpan.textContent = "Storage access has been denied by the browser or user. You may need to adjust browser settings.";
            // All relevant buttons remain disabled
        };

        // Save Suffix & Finish Button
        saveFinishBtn!.onclick = () => {
            log("Save Suffix & Finish button clicked.");
            const newSuffix = suffixInput!.value.trim();
            saveSuffix(newSuffix);
            configStatusSpan!.textContent = 'Saved';
            setupNoteSpan!.textContent = "Configuration saved. Setup complete! This panel will close.";
            saveFinishBtn!.disabled = true; // Disable after click
            grantAccessBtn!.disabled = true;
            abortBtn!.disabled = true;

            sendSetupStatus('SERVER_SETUP_COMPLETE', {}, clientOrigin);
        };

        // Abort Button
        abortBtn.onclick = () => {
            log("Abort button clicked.");
            sendSetupStatus('SERVER_SETUP_ABORT', { code: 'USER_CANCELED', reason: 'User aborted setup.' }, clientOrigin);
        };
    }

    async function handleTransportPhase() {
        log("Running in TRANSPORT phase (Default). Setting up MCP Server...");
        
        // --- Activate Storage Access before setting up server ---
        const permissionState = await getStoragePermissionState();
        let storageActivated = false;
        if (permissionState === 'granted') {
            log("Transport Phase: Permission is granted. Attempting to activate access...");
            storageActivated = await tryActivateStorageAccess();
            if (!storageActivated) {
                log("CRITICAL ERROR: Failed to activate storage access in Transport Phase even though permission was granted. Aborting server setup.");
                // Display an error or stop? For now, just log.
                return; // Stop server setup
            }
            log("Transport Phase: Storage access activated.");
        } else {
            log(`CRITICAL ERROR: Storage access permission is '${permissionState}' in Transport Phase. Tool requires granted access. Aborting server setup.`);
            // Display an error or stop?
            return; // Stop server setup
        }

         if (logElement) logElement.style.display = 'block'; // Show log
         if (setupSection) setupSection.style.display = 'none'; // Hide setup UI

        // --- Server Info ---
        const myServerInfo = {
            name: "iframe-echo-server-sdk",
            version: "3.0.0" // Updated version
        };

        // --- Tool Schema --- Define schema using Zod
        const echoSchema = z.object({
            text: z.string().describe("The text to echo."),
            delayMs: z.number().int().nonnegative().optional().describe("Optional delay in milliseconds.")
        });

        // --- Tool Handler Function ---
        // Use localStorage counter
        // Use 'any' for types to bypass complex SDK type checking for now
        async function handleEcho(args: z.infer<typeof echoSchema>, extra: any): Promise<any> { 
            const { text, delayMs } = args;
            log(`Handling echo for: ${text}`, { args, extra }); // Log extra for debugging if needed
            const suffix = getSuffix(); // Get stored suffix
            const count = incrementCounter(); // Read and increment counter
            log(`Current count: ${count}`);
            if (delayMs) {
                log(`Delaying for ${delayMs}ms...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
            // SDK server.tool expects { content: [...] }
            const result = {
                content: [{ type: "text", text: `[SDK V3 - Count ${count}] You sent: ${text}${suffix}` }] // Append suffix
            };
            return result;
        }

        // 1. Create the MCP Server instance
        const server = new McpServer(myServerInfo);
        log("McpServer instance created.");

        // 2. Register the tool - Use the correct signature
        // server.tool(name, paramsSchemaShape, callback)
        server.tool("echo", echoSchema.shape, handleEcho);
        log("Registered 'echo' tool.");

        // 3. Create the IntraBrowser Server Transport instance
        const transport = new IntraBrowserServerTransport({
             trustedClientOrigins: '*' // Replace '*' with specific origin(s) for production
        });
        log("IntraBrowserServerTransport instance created.");

        try {
            // 4. Connect the server and the transport
            log("Attempting server.connect(transport)...");
            await server.connect(transport);
            log("Server connected to transport successfully! Waiting for requests.");
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            log("Error connecting server to transport:", errorMsg);
            console.error("MCP Connection failed:", error);
            // Optionally post a SERVER_SETUP_ERROR if connect fails?
            // This phase shouldn't normally post setup errors, but maybe
            // const setupError: ServerSetupError = { type: 'SERVER_SETUP_ERROR', code: 'UNEXPECTED', message: `Transport connect failed: ${errorMsg}` };
            // Need a way to determine origin to post to... tricky.
        }
    }

    // --- Main Execution ---
    document.addEventListener('DOMContentLoaded', () => {
        // Get DOM elements after they exist
        logElement = document.getElementById('log');
        configureSection = document.getElementById('configure-section');
        setupSection = document.getElementById('setup-phase-content');
        counterDisplay = document.getElementById('counter-display');
        grantAccessBtn = document.getElementById('grant-access-btn') as HTMLButtonElement | null;
        doneBtn = document.getElementById('done-btn') as HTMLButtonElement | null;
        abortBtn = document.getElementById('abort-btn') as HTMLButtonElement | null;
        saveFinishBtn = document.getElementById('save-finish-btn') as HTMLButtonElement | null;
        configStatusSpan = document.getElementById('setup-config-status') as HTMLElement | null;
        storageStatusSpan = document.getElementById('setup-storage-status') as HTMLElement | null;
        setupNoteSpan = document.getElementById('setup-note') as HTMLElement | null;
        suffixInput = document.getElementById('suffix-input') as HTMLInputElement | null;

        log("DOM Loaded. Checking phase...");

        const urlParams = new URLSearchParams(window.location.search);
        const phase = urlParams.get('phase');
        const clientOrigin = urlParams.get('client'); // Origin from v2.0 spec

        if (phase === 'setup') {
            handleSetupPhase(clientOrigin);
        } else {
            handleTransportPhase();
        }
    });

    log("Echo server script loaded. Waiting for DOM...");


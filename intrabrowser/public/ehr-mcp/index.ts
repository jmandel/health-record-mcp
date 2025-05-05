        // --- Imports ---
        // Import SDK Server, custom Transport, Zod, and the tool registration helper
        import { McpServer, IntraBrowserServerTransport, z, registerEhrTools } from '@jmandel/ehr-mcp/src/tools-browser-entry.js';
        import type { ClientFullEHR } from '@jmandel/ehr-mcp/clientTypes'; // Assuming types are exported

        import {
            // Import logic functions
            grepRecordLogic,
            readResourceLogic,
            readAttachmentLogic
        } from '@jmandel/ehr-mcp/src/tools-browser-entry.js';

        // --- Constants, Config Param and Elements ---
        const urlParams = new URLSearchParams(location.search);
        const configKey = urlParams.get('config') || 'global';
        const LOG_PREFIX = '[EHR MCP Tool]';

        const dataKey = `ehrJsonData::${configKey}`;
        const originsKey = `ehrMcpAllowedOrigins::${configKey}`;

        let logElement: HTMLElement | null = document.getElementById('log');
        let statusElement: HTMLElement | null = document.getElementById('toolStatus');
        const DB_NAME = 'ehrMcpDB';
        const STORE_NAME = 'configuration';

        // Setup Phase Elements (initialized later)
        let setupSection: HTMLElement | null = null;
        let setupStorageStatusSpan: HTMLElement | null = null;
        let grantAccessBtn: HTMLButtonElement | null = null;
        let abortBtn: HTMLButtonElement | null = null;
        let setupNoteSpan: HTMLElement | null = null;
        // New setup elements for config
        let setupInstructionP: HTMLElement | null = null;
        let configInputsDiv: HTMLElement | null = null;
        let ehrFileInput: HTMLInputElement | null = null;
        let fileStatusDiv: HTMLElement | null = null;
        let allowedOriginsInput: HTMLInputElement | null = null;
        let saveConfigBtn: HTMLButtonElement | null = null;

        // Transport Phase Elements
        let transportSection: HTMLElement | null = null;
        let testUiContainer: HTMLElement | null = null; // For Test UI

        // --- State ---
        let ehrFileContent: string | null = null; // For storing uploaded EHR data string
        let fullEhr: ClientFullEHR | null = null; // Use imported type
        let allowedOrigins = '*'; // Default allowed origins
        let mcpServer: McpServer | null = null; // Use imported type
        let transport: IntraBrowserServerTransport | null = null; // Use imported type

        // --- Helper Functions ---
        function log(message: string, ...args: any[]) {
            console.log(LOG_PREFIX, message, ...args);
            if (logElement) {
                const time = new Date().toLocaleTimeString();
                logElement.textContent += `[${time}] ${message}${args.length > 0 ? ' ' + args.map(a => JSON.stringify(a)).join(' ') : ''}\n`;
                logElement.scrollTop = logElement.scrollHeight; // Scroll to bottom
            }
        }

        function setStatus(message: string, type = 'loading') {
            log(`Status: ${message}`);
            if (statusElement) {
                statusElement.textContent = message;
                statusElement.className = `status status-${type}`;
            }
        }

        // --- Permissions and IndexedDB Helpers ---

        // Helper to get the correct IDBFactory (unpartitioned if handle exists, otherwise global)
        function getIdbFactory(): IDBFactory {
            const handle = (window as any)._saHandle; // Storage Access Handle
            if (handle && handle.indexedDB) {
                log("Using handle.indexedDB for unpartitioned access.");
                return handle.indexedDB;
            } else {
                log("Falling back to window.indexedDB (might be partitioned).");
                return window.indexedDB;
            }
        }

        async function getStoragePermissionState(): Promise<PermissionState> {
            log("Querying 'storage-access' permission state...");
            if (navigator.permissions && typeof navigator.permissions.query === 'function') {
                try {
                    const permissionStatus = await navigator.permissions.query({ name: 'storage-access' as any });
                    log("'storage-access' permission state:", permissionStatus.state);
                    return permissionStatus.state;
                } catch (e) {
                    log("Error querying 'storage-access' permission:", e);
                    return 'prompt'; // Assume prompt on error
                }
            } else {
                log("Permissions API or query method not available. Assuming 'prompt'.");
                return 'prompt';
            }
        }

        // Function to attempt storage access request for IndexedDB and set the handle.
        // Returns true if access is likely activated, false otherwise.
        async function tryActivateStorageAccess(): Promise<boolean> {
            log("Attempting to request storage access for IndexedDB...");
            try {
                if (typeof (document as any).requestStorageAccess !== 'function') {
                    log("requestStorageAccess API not available.");
                    return false;
                }

                // Try with { indexedDB: true } first
                try {
                    log("Attempting document.requestStorageAccess({ indexedDB: true })…");
                    const handle = await (document as any).requestStorageAccess({ indexedDB: true });
                    log("Successfully called requestStorageAccess({ indexedDB: true }).");
                    log("requestStorageAccess({ indexedDB: true }) returned:", handle);
                    (window as any)._saHandle = handle; // Store the handle
                    return true; // Success!
                } catch (e) {
                    // NOTE: Unlike localStorage, there isn't a clear 'legacy' way
                    // to request IndexedDB access specifically. The no-arg call
                    // is primarily for cookies. If the specific {indexedDB: true}
                    // call fails, we likely cannot get unpartitioned IDB access here.
                     log("Error invoking requestStorageAccess({ indexedDB: true }):", e);
                     if (e instanceof TypeError) {
                         log("Call with { indexedDB: true } failed (API shape mismatch or browser policy).");
                     }
                     // Don't attempt fallback - return false as we didn't get the IDB handle.
                    return false;
                }
            } catch (err) {
                // Catch errors from the outer try block (e.g., API check failure)
                log("Error during requestStorageAccess process:", err);
                return false;
            }
        }

        // --- IndexedDB Helper to Load Data ---
        function openDB(): Promise<IDBDatabase> { // Return IDBDatabase directly
             return new Promise((resolve, reject) => {
                 const idbFactory = getIdbFactory(); // Use the helper
                 if (!idbFactory) {
                     reject("IndexedDB not supported by this browser or handle.");
                     return;
                 }
                 const request = idbFactory.open(DB_NAME); // Use the obtained factory

                 request.onerror = (event) => {
                     const target = event.target as IDBOpenDBRequest | null;
                     console.error("IndexedDB error:", target?.error);
                     reject(`IndexedDB error: ${target?.error?.message}`);
                 };

                 request.onsuccess = (event) => {
                     const target = event.target as IDBOpenDBRequest | null;
                     if (target?.result) {
                        resolve(target.result);
                     } else {
                         reject("IndexedDB open request succeeded but result was null.");
                     }
                 };

                 request.onupgradeneeded = (event) => {
                      const db = (event.target as IDBOpenDBRequest).result as IDBDatabase;
                      if (!db.objectStoreNames.contains(STORE_NAME)) {
                          log(`[openDB] Creating missing object store '${STORE_NAME}' during upgrade/create.`);
                          db.createObjectStore(STORE_NAME);
                      }
                 };
             });
        }

        // Function to post messages to the parent window (used in setup phase)
        function postToParent(message: any, targetOrigin: string | null) {
            if (!window.parent || window.parent === window) {
                log("Error: Cannot post message, not in an iframe or parent is self.");
                return;
            }
            if (!targetOrigin) {
                log("Error: Cannot post message, targetOrigin is required.");
                return;
            }
            log(`Posting message to parent (${targetOrigin}):`, message);
            window.parent.postMessage(message, targetOrigin);
        }

        // Function to send final status back to client (v2.0) - Shared between phases? Or setup only?
        // Assuming Setup only for now.
        function sendSetupStatus(type: 'SERVER_SETUP_COMPLETE' | 'SERVER_SETUP_ABORT', payload: any, clientOrigin: string | null) {
             if (!clientOrigin) {
                log("Cannot send setup status, clientOrigin is missing.");
                return;
             }
             const message = { type, success: type === 'SERVER_SETUP_COMPLETE', ...payload };
             postToParent(message, clientOrigin);
        }

        async function loadEhrDataFromDB(): Promise<string | null> { // Return string or null
            try {
                const db = await openDB();
                return new Promise<string | null>((resolve, reject) => {
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        db.close();
                        reject(`IndexedDB object store '${STORE_NAME}' not found. Please run configuration page first.`);
                        return;
                    }
                    const transaction = db.transaction([STORE_NAME], 'readonly');
                    const store = transaction.objectStore(STORE_NAME);
                    const request = store.get(dataKey);

                    request.onerror = (event) => {
                        const target = event.target as IDBRequest | null;
                        console.error('Error reading data from IndexedDB:', target?.error);
                        reject(`Error reading data: ${target?.error?.message}`);
                    };

                    request.onsuccess = (event) => {
                        const target = event.target as IDBRequest | null;
                        const result = target?.result;
                        if (result && result.content) {
                            resolve(result.content); // Return the stored JSON string
                        } else {
                            resolve(null); // Indicate data not found
                        }
                    };

                    transaction.oncomplete = () => {
                        db.close();
                    };
                    transaction.onerror = (event) => {
                        const target = event.target as IDBTransaction | null;
                        console.error('IndexedDB readonly transaction error:', target?.error);
                        reject(`DB Read Transaction error: ${target?.error?.message}`);
                    };
                });
            } catch (dbError: any) {
                 console.error("Failed to open/access IndexedDB:", dbError);
                 throw new Error(`Failed to access IndexedDB: ${dbError?.message || dbError}`);
            }
        }

        // --- IndexedDB Helper to Save Data (Ported from configure.html) ---
        async function saveEhrDataToDB(dataString: string, key: string): Promise<void> {
            const db = await openDB(); // Uses getIdbFactory() implicitly
            return new Promise((resolve, reject) => {
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.close();
                    reject(`IndexedDB object store '${STORE_NAME}' not found.`);
                    return;
                }
                const transaction = db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                // Store as an object to potentially add metadata later
                const dataObject = { content: dataString }; 
                const request = store.put(dataObject, key); 

                request.onsuccess = () => {
                    resolve();
                };

                request.onerror = (event) => {
                    const target = event.target as IDBRequest | null;
                    console.error('Error saving data to IndexedDB:', target?.error);
                    reject(`Error saving data: ${target?.error?.message}`);
                };

                transaction.oncomplete = () => {
                    db.close();
                    console.log("DB save transaction completed.");
                };
                 transaction.onerror = (event) => {
                    const target = event.target as IDBTransaction | null;
                    console.error('IndexedDB readwrite transaction error:', target?.error);
                    reject(`DB Save Transaction error: ${target?.error?.message}`);
                 };
            });
        }

        // --- Main Initialization Function (Renamed to handleTransportPhase) ---
        async function handleTransportPhase() { // Renamed
            log('Running in TRANSPORT phase.');
            setStatus('Initializing transport phase...');

            // --- Activate Storage Access before proceeding ---
            const permissionState = await getStoragePermissionState();
            let storageActivated = false;

            if (permissionState === 'granted') {
                log("Transport Phase: Permission is granted. Attempting to activate access...");
                storageActivated = await tryActivateStorageAccess();
                if (!storageActivated) {
                    // Proceed, but log warning about using potentially partitioned storage
                    log("WARNING: Failed to activate unpartitioned storage access in Transport Phase even though permission was granted. Proceeding with default (potentially partitioned) IndexedDB.");
                    setStatus('Warning: Using potentially partitioned storage.', 'error'); // Use error style for warning
                } else {
                    log("Transport Phase: Unpartitioned storage access activated.");
                }
            } else {
                // Proceed, but log warning about using potentially partitioned storage
                log(`WARNING: Storage access permission is '${permissionState}' in Transport Phase. Proceeding with default (potentially partitioned) IndexedDB.`);
                setStatus('Warning: Using potentially partitioned storage.', 'error'); // Use error style for warning
            }
            // --- End Storage Access Activation ---

            log('Attempting to load configuration...');
            try {
                // 1. Load Allowed Origins from LocalStorage (Still uses default localStorage)
                // Note: This might be partitioned if storage access wasn't granted/activated!
                // Consider if origins also need unpartitioned storage or separate config mechanism.
                const storedOrigins = localStorage.getItem(originsKey);
                if (storedOrigins) {
                    allowedOrigins = storedOrigins;
                    log(`Loaded allowed origins: ${allowedOrigins} (from default localStorage)`);
                } else {
                    log(`Using default allowed origins: ${allowedOrigins}`);
                }

                // 2. Load EHR Data from IndexedDB (Uses getIdbFactory())
                setStatus('Loading EHR data from IndexedDB...');
                const ehrDataString = await loadEhrDataFromDB();

                if (!ehrDataString) {
                    throw new Error('EHR data not found in IndexedDB. Please run the configuration page (ehr-mcp/configure.html) first.');
                }

                // 3. Parse EHR Data
                setStatus('Parsing EHR data...');
                try {
                    fullEhr = JSON.parse(ehrDataString);
                    // Basic validation
                    if (!fullEhr || typeof fullEhr.fhir !== 'object' || !Array.isArray(fullEhr.attachments)) {
                        throw new Error('Parsed EHR data does not have the expected structure (missing fhir object or attachments array).');
                    }
                    log(`Successfully parsed EHR data. FHIR resource types: ${Object.keys(fullEhr.fhir || {}).length}, Attachments: ${fullEhr.attachments?.length ?? 0}`);
                } catch (parseError: any) {
                     console.error("Failed to parse EHR JSON from IndexedDB:", parseError);
                     throw new Error(`Failed to parse stored EHR data: ${parseError.message}`);
                }

                // 4. Initialize MCP Server Library
                setStatus('Initializing McpServer and Transport...');

                mcpServer = new McpServer({
                    name: "in-browser-ehr-mcp-tool",
                    version: "1.0.0"
                });
                log("McpServer instance created.");

                transport = new IntraBrowserServerTransport({
                     trustedClientOrigins: allowedOrigins === '*' ? '*' : allowedOrigins.split(',').map(s => s.trim()).filter(Boolean)
                });
                log("IntraBrowserServerTransport instance created.");

                // 5. Define getContext function needed by registerEhrTools
                async function getContext(toolName: string): Promise<{ fullEhr: ClientFullEHR | undefined, db: undefined }> { // Added types
                    log(`getContext called for tool: ${toolName}`);
                    if (!fullEhr) {
                        log("Warning: getContext called but fullEhr is not loaded yet.");
                        // Consider throwing an error or attempting reload if critical
                    }
                    return { fullEhr: fullEhr ?? undefined, db: undefined };
                }

                // 6. Register EHR tools using the helper function
                setStatus('Registering tools...');
                // TODO: Pass the imported logic functions to registerEhrTools
                registerEhrTools(mcpServer, getContext);

                log('Tools registered.');

                // Connect the server and transport
                setStatus('Connecting server and transport...');
                await mcpServer.connect(transport);
                log("Server connected to transport successfully!");

                setStatus('Ready. Listening for MCP messages.', 'ready');

                // --- Enable Test UI (only in transport phase) ---
                setupTestUI();

            } catch (error: any) {
                console.error("Initialization failed:", error);
                setStatus(`Error initializing tool: ${error.message}`, 'error');
                // Optionally, notify parent if in setup phase? (Though this is transport)
            }
        }

        // --- Test UI Setup and Handlers (Largely unchanged, but called conditionally) ---
        function setupTestUI() {
            // ... existing setupTestUI code ...
            // Make sure testUiContainer is referenced correctly
            if (!testUiContainer) {
                log("Test UI container not found.");
                return;
            }
             if (!mcpServer || !fullEhr) {
                 log("MCP Server or EHR data not ready, cannot set up Test UI.");
                    return;
                }
             testUiContainer.style.display = 'block'; // Show the UI

             // Grep Button
             const grepBtn = document.getElementById('grepBtn');
             const grepResultEl = document.getElementById('grepResult');
             // ... other grep elements ...
             if (grepBtn && grepResultEl /* && other elements */) {
                 grepBtn.addEventListener('click', async () => {
                    const query = (document.getElementById('grepQuery') as HTMLInputElement)?.value;
                    const typesRaw = (document.getElementById('grepResourceTypes') as HTMLInputElement)?.value;
                    const format = (document.getElementById('grepResourceFormat') as HTMLSelectElement)?.value;
                    const page = parseInt((document.getElementById('grepPage') as HTMLInputElement)?.value, 10);
                    const pageSize = parseInt((document.getElementById('grepPageSize') as HTMLInputElement)?.value, 10);
                    // ... rest of grep handler ...
                     if (!query) { alert('Grep Query cannot be empty.'); return; }
                     grepResultEl.textContent = '[Running grep...]';
                     try {
                         const resource_types = typesRaw?.trim() ? typesRaw.split(',').map(s => s.trim()).filter(Boolean) : undefined;
                    const page_num = (!isNaN(page) && page >= 1) ? page : undefined;
                    const page_size_num = (!isNaN(pageSize) && pageSize >= 1) ? pageSize : undefined;

                         // Ensure format is of the correct literal type for the logic function
                         const format_val = (format === 'json' || format === 'plaintext') ? format : undefined;

                    const resultString = await grepRecordLogic(
                             fullEhr!, query, resource_types, format_val, page_size_num, page_num
                         );
                         grepResultEl.textContent = resultString;
                     } catch (error: any) {
                         grepResultEl.textContent = `Error running grep:\n${error.message}`;
                     }
                 });
             } else {
                 log("Could not find all Grep Test UI elements.");
             }

             // Read Resource Button
             const readResourceBtn = document.getElementById('readResourceBtn');
             const readResourceResultEl = document.getElementById('readResourceResult');
             // ... other read elements ...
             if (readResourceBtn && readResourceResultEl /* && other elements */) {
                 readResourceBtn.addEventListener('click', async () => {
                     const resourceType = (document.getElementById('readResourceType') as HTMLInputElement)?.value;
                     const resourceId = (document.getElementById('readResourceId') as HTMLInputElement)?.value;
                     // ... rest of read resource handler ...
                      if (!resourceType || !resourceId) { alert('Resource Type and Resource ID are required.'); return; }
                      readResourceResultEl.textContent = '[Reading resource...]';
                      try {
                          const resultString = await readResourceLogic(fullEhr!, resourceType, resourceId);
                          try {
                              const resultData = JSON.parse(resultString);
                              if (resultData.error) { readResourceResultEl.textContent = `Tool Returned Error:\n${JSON.stringify(resultData.error, null, 2)}`; }
                              else if (resultData.resource) { readResourceResultEl.textContent = JSON.stringify(resultData.resource, null, 2); }
                              else if (resultData.resource === null) { readResourceResultEl.textContent = `[Resource Not Found]`; }
                              else { readResourceResultEl.textContent = `Unexpected result format:\n${resultString}`; }
                          } catch (parseError) { readResourceResultEl.textContent = `Error parsing result:\n${resultString}`; }
                      } catch (error: any) {
                          readResourceResultEl.textContent = `Error reading resource:\n${error.message}`;
                      }
                 });
             } else {
                 log("Could not find all Read Resource Test UI elements.");
             }

             // Read Attachment Button
             const readAttachmentBtn = document.getElementById('readAttachmentBtn');
             const readAttachmentResultEl = document.getElementById('readAttachmentResult');
             // ... other attach elements ...
             if (readAttachmentBtn && readAttachmentResultEl /* && other elements */) {
                 readAttachmentBtn.addEventListener('click', async () => {
                    const resourceType = (document.getElementById('attachResourceType') as HTMLInputElement)?.value;
                    const resourceId = (document.getElementById('attachResourceId') as HTMLInputElement)?.value;
                    const attachmentPath = (document.getElementById('attachPath') as HTMLInputElement)?.value;
                    const includeRawBase64 = (document.getElementById('attachIncludeBase64') as HTMLInputElement)?.checked;
                     // ... rest of read attachment handler ...
                     if (!resourceType || !resourceId || !attachmentPath) { alert('Resource Type, Resource ID, and Attachment Path are required.'); return; }
                     readAttachmentResultEl.textContent = '[Reading attachment...]';
                     log("--- Test UI: Calling readAttachmentLogic directly ---", {resourceType, resourceId, attachmentPath, includeRawBase64});
                     try {
                         const resultString = await readAttachmentLogic(fullEhr!, resourceType, resourceId, attachmentPath, includeRawBase64);
                         log("--- Test UI: readAttachmentLogic result --- \n" + resultString);
                         readAttachmentResultEl.textContent = resultString;
                     } catch (error: any) {
                         log("--- Test UI: Error calling readAttachmentLogic ---", error);
                         readAttachmentResultEl.textContent = `Error reading attachment:\n${error.message}`;
                     }
                 });
             } else {
                 log("Could not find all Read Attachment Test UI elements.");
             }
        }

        // --- Setup Phase Handler ---
        async function handleSetupPhase(clientOrigin: string | null) {
            log("Running in SETUP phase.");
            // Verify all essential elements are present
            if (!clientOrigin || !setupSection || !setupStorageStatusSpan || !grantAccessBtn || !abortBtn || !setupNoteSpan || 
                !configInputsDiv || !ehrFileInput || !fileStatusDiv || !allowedOriginsInput || !saveConfigBtn || !setupInstructionP) {
                log("Error: Setup phase requires client origin or essential DOM elements are missing.");
                if (clientOrigin) {
                    sendSetupStatus('SERVER_SETUP_ABORT', { code: 'FAILED', reason: 'Setup iframe internal error (missing elements)' }, clientOrigin);
                }
                return;
            }

            // Show setup UI, hide transport UI
            setupSection.style.display = 'block';
            if (transportSection) transportSection.style.display = 'none';
            if (statusElement) statusElement.style.display = 'none'; // Hide main status

            // --- Helper to enable/disable configuration part of the UI ---
            const enableConfigUI = (enable: boolean) => {
                configInputsDiv!.style.display = enable ? 'block' : 'none';
                ehrFileInput!.disabled = !enable;
                allowedOriginsInput!.disabled = !enable;
                saveConfigBtn!.disabled = true; // Always start disabled when state changes
                fileStatusDiv!.textContent = 'No file selected.';
                fileStatusDiv!.className = 'status-info';
                fileStatusDiv!.style.display = 'block';
                ehrFileContent = null; // Reset file content
                ehrFileInput!.value = ''; // Reset file input
            };

            // --- File Input Handler ---
            ehrFileInput.addEventListener('change', (event) => {
                const target = event.target as HTMLInputElement;
                const file = target.files?.[0];
                if (!file) {
                    ehrFileContent = null;
                    fileStatusDiv!.textContent = 'No file selected.';
                    fileStatusDiv!.className = 'status-info';
                    fileStatusDiv!.style.display = 'block';
                    saveConfigBtn!.disabled = true; // Disable save if no file
                    return;
                }

                if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
                    ehrFileContent = null;
                    fileStatusDiv!.textContent = `Error: Invalid file type. Please select a JSON file.`;
                    fileStatusDiv!.className = 'status-error';
                    fileStatusDiv!.style.display = 'block';
                    ehrFileInput!.value = ''; // Clear the input
                    saveConfigBtn!.disabled = true; // Disable save if invalid file
                    return;
                }

                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const content = e.target?.result as string;
                        JSON.parse(content); // Validate JSON
                        ehrFileContent = content; 
                        fileStatusDiv!.textContent = `File selected: ${file.name} (${(file.size / 1024).toFixed(2)} KB). Ready.`;
                        fileStatusDiv!.className = 'status-success';
                        fileStatusDiv!.style.display = 'block';
                        saveConfigBtn!.disabled = false; // Enable save ONLY if file is valid
                    } catch (jsonError: any) {
                        ehrFileContent = null;
                        fileStatusDiv!.textContent = `Error: Failed to parse JSON file. ${jsonError.message}`;
                        fileStatusDiv!.className = 'status-error';
                        fileStatusDiv!.style.display = 'block';
                        ehrFileInput!.value = ''; 
                        saveConfigBtn!.disabled = true; // Disable save if parse error
                    }
                };
                reader.onerror = () => {
                    ehrFileContent = null;
                    fileStatusDiv!.textContent = 'Error reading file.';
                    fileStatusDiv!.className = 'status-error';
                    fileStatusDiv!.style.display = 'block';
                    saveConfigBtn!.disabled = true;
                };
                reader.readAsText(file);
            });

            // --- Initial State Determination ---
            const initialState = await getStoragePermissionState();

            // Default UI state
            setupInstructionP!.textContent = "Checking storage access permission...";
            grantAccessBtn.disabled = true;
            saveConfigBtn.disabled = true;
            enableConfigUI(false); // Config UI starts hidden/disabled
            setupStorageStatusSpan!.textContent = 'Checking...';

            if (initialState === 'granted') {
                log("Initial permission state is 'granted'. Attempting to activate access without user click...");
                setupInstructionP!.textContent = "Permission previously granted."
                setupNoteSpan!.textContent = "Permission previously granted. Activating access...";
                setupStorageStatusSpan!.textContent = 'Activating...';
                const activated = await tryActivateStorageAccess();
                if (activated) {
                    log("Storage access activated successfully.");
                    setupInstructionP!.textContent = "Please configure the EHR data and allowed origins below."
                    setupStorageStatusSpan!.textContent = 'Granted (Activated)';
                    setupNoteSpan!.textContent = "Storage access active. Ready for configuration.";
                    grantAccessBtn!.style.display = 'none'; // Hide grant button
                    enableConfigUI(true); // Show and enable config inputs
                    // Save button remains disabled until file is loaded
                        } else {
                    log("Failed to activate storage access even though permission was granted.");
                    setupInstructionP!.textContent = "Automatic activation failed."
                    setupStorageStatusSpan!.textContent = 'Activation Failed';
                    setupNoteSpan!.textContent = "Permission granted, but failed to activate storage access automatically. Cannot proceed.";
                    grantAccessBtn!.disabled = true; // Keep disabled
                    saveConfigBtn!.disabled = true;
                    // Optionally send abort?
                     sendSetupStatus('SERVER_SETUP_ABORT', { code: 'FAILED', reason: 'Storage access activation failed.' }, clientOrigin);
                }

            } else if (initialState === 'prompt') {
                log("Initial permission state is 'prompt'. User interaction required.");
                setupInstructionP!.textContent = "This tool needs storage access."
                setupStorageStatusSpan!.textContent = 'Needed';
                setupNoteSpan!.textContent = "Please click 'Grant Storage Access' to proceed.";
                grantAccessBtn!.disabled = false; // Enable the button
                grantAccessBtn!.style.display = 'inline-block'; // Ensure visible
                saveConfigBtn!.style.display = 'inline-block'; // Ensure visible but disabled

                grantAccessBtn.onclick = async () => {
                    log("Grant Storage Access button clicked.");
                    grantAccessBtn!.disabled = true;
                    setupNoteSpan!.textContent = "Requesting storage access...";
                    setupStorageStatusSpan!.textContent = 'Requesting...';

                    const activated = await tryActivateStorageAccess();
                    if (activated) {
                        log("Storage access activated successfully via button click. Setup complete.");
                        setupInstructionP!.textContent = "Please configure the EHR data and allowed origins below."
                        setupStorageStatusSpan!.textContent = 'Granted (Activated)';
                        setupNoteSpan!.textContent = "Storage access granted. Ready for configuration.";
                        grantAccessBtn!.style.display = 'none'; // Hide grant button
                        enableConfigUI(true); // Show and enable config inputs
                    } else {
                        log("Storage access activation failed after button click.");
                        setupInstructionP!.textContent = "Access Request Failed"
                        setupStorageStatusSpan!.textContent = 'Activation Failed';
                        setupNoteSpan!.textContent = "Storage access denied or failed. You may need to adjust browser settings.";
                        grantAccessBtn!.disabled = false; // Re-enable grant button after failed attempt
                        // Optionally send abort? Or allow retry? For now, send abort.
                        sendSetupStatus('SERVER_SETUP_ABORT', { code: 'USER_CANCELED', reason: 'Storage access denied or failed after prompt.' }, clientOrigin);
                    }
                };

            } else { // initialState === 'denied'
                log("Initial permission state is 'denied'. Access cannot be requested.");
                setupInstructionP!.textContent = "Storage access denied."
                setupStorageStatusSpan!.textContent = 'Denied';
                setupNoteSpan!.textContent = "Storage access has been denied by the browser or user. Cannot proceed.";
                grantAccessBtn!.disabled = true;
                saveConfigBtn!.disabled = true;
                // Send abort status
                sendSetupStatus('SERVER_SETUP_ABORT', { code: 'PERMISSION_DENIED', reason: 'Storage access permission denied.' }, clientOrigin);
            }

            // --- Save Config Button Handler ---
            saveConfigBtn.onclick = async () => {
                log("Save Config button clicked.");
                if (!ehrFileContent) {
                    log("Save aborted: No valid EHR file content loaded.");
                    setupNoteSpan!.textContent = "Error: Please select and load a valid EHR JSON file first.";
                    return;
                }
                const origins = allowedOriginsInput!.value.trim();
                if (!origins) {
                    log("Save aborted: Allowed origins cannot be empty.");
                    setupNoteSpan!.textContent = "Error: Allowed Origins cannot be empty. Use '*' for any origin.";
                    return;
                }
                
                setupNoteSpan!.textContent = "Saving configuration...";
                grantAccessBtn!.disabled = true;
                saveConfigBtn!.disabled = true;
                ehrFileInput!.disabled = true;
                allowedOriginsInput!.disabled = true;
                abortBtn!.disabled = true;

                try {
                    // Use the global configKey for simplicity in this example
                    const currentConfigKey = 'global'; 
                    const dataKey = `ehrJsonData::${currentConfigKey}`;
                    const originsKey = `ehrMcpAllowedOrigins::${currentConfigKey}`;

                    await saveEhrDataToDB(ehrFileContent, dataKey);
                    log('EHR Data saved successfully to IndexedDB.');

                    localStorage.setItem(originsKey, origins);
                    log('Allowed Origins saved successfully to localStorage.');
                    
                    setupNoteSpan!.textContent = "Configuration saved successfully! Setup complete.";
                    sendSetupStatus('SERVER_SETUP_COMPLETE', {}, clientOrigin);

                } catch (error: any) {
                    log("Error saving configuration:", error);
                    setupNoteSpan!.textContent = `Error saving configuration: ${error.message || error}`;
                    // Re-enable buttons/inputs on failure?
                    saveConfigBtn!.disabled = false;
                    ehrFileInput!.disabled = false;
                    allowedOriginsInput!.disabled = false;
                    abortBtn!.disabled = false;
                }
            };

            // Abort Button Handler (Common to all states except success)
            abortBtn.onclick = () => {
                log("Abort button clicked by user.");
                sendSetupStatus('SERVER_SETUP_ABORT', { code: 'USER_CANCELED', reason: 'User aborted setup.' }, clientOrigin);
            };
        }

        // --- Main Execution ---
        document.addEventListener('DOMContentLoaded', () => {
            // Get common DOM elements
            logElement = document.getElementById('log');
            statusElement = document.getElementById('toolStatus');
            transportSection = document.getElementById('transport-section');
            testUiContainer = document.getElementById('test-ui-container');

            // Get Setup phase specific elements
            setupSection = document.getElementById('setup-phase-content');
            setupStorageStatusSpan = document.getElementById('setup-storage-status');
            grantAccessBtn = document.getElementById('grant-access-btn') as HTMLButtonElement | null;
            abortBtn = document.getElementById('abort-btn') as HTMLButtonElement | null;
            setupNoteSpan = document.getElementById('setup-note');
            // New setup elements
            setupInstructionP = document.getElementById('setup-instruction');
            configInputsDiv = document.getElementById('config-inputs');
            ehrFileInput = document.getElementById('ehrFile') as HTMLInputElement | null;
            fileStatusDiv = document.getElementById('fileStatus');
            allowedOriginsInput = document.getElementById('allowedOrigins') as HTMLInputElement | null;
            saveConfigBtn = document.getElementById('save-config-btn') as HTMLButtonElement | null;

            log("DOM Loaded. Checking phase...");

            log("Current search string:", window.location.search);
            const urlParams = new URLSearchParams(window.location.search);
            const phase = urlParams.get('phase');
            log("Detected phase parameter:", phase);
            const clientOrigin = urlParams.get('client'); // Origin from v2.0 spec

            if (phase === 'setup') {
                log("Phase is 'setup', running handleSetupPhase...");
                // Hide transport section elements explicitly if needed
                if (transportSection) transportSection.style.display = 'none';
                if (statusElement) statusElement.style.display = 'none'; // Hide main status in setup
                handleSetupPhase(clientOrigin);
            } else {
                log("Phase is NOT 'setup' (or null), running handleTransportPhase...");
                // Hide setup section elements explicitly if needed
                if (setupSection) setupSection.style.display = 'none';
                handleTransportPhase(); // Default phase
            }
        });

        log("EHR MCP script loaded. Waiting for DOM...");



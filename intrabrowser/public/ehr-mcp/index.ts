        // --- Imports ---
        // Import SDK Server, custom Transport, Zod, and the tool registration helper
        import { McpServer, IntraBrowserServerTransport, z, registerEhrTools } from '@jmandel/ehr-mcp/src/tools-browser-entry.js';

        // Dynamically import the bundled browser-safe tool logic
        // This assumes the build step has run successfully
        const ToolLogicModule = await import('./dist/tools.js');
        const {
            // Import logic functions
            grepRecordLogic,
            readResourceLogic,
            readAttachmentLogic
        } = ToolLogicModule;

        // --- Constants, Config Param and Elements ---
        const urlParams = new URLSearchParams(location.search);
        const configKey = urlParams.get('config') || 'global';

        const dataKey = `ehrJsonData::${configKey}`;
        const originsKey = `ehrMcpAllowedOrigins::${configKey}`;

        const logElement = document.getElementById('log');
        const statusElement = document.getElementById('toolStatus');
        const DB_NAME = 'ehrMcpDB';
        const STORE_NAME = 'configuration';

        // --- State ---
        let fullEhr = null;    // Will hold the parsed EHR JSON
        let allowedOrigins = '*'; // Default allowed origins
        let mcpServer = null;
        let transport = null;  // Hold the transport instance

        // --- Helper Functions ---
        function log(message, ...args) {
            console.log('[EHR Tool]', message, ...args);
            if (logElement) {
                const time = new Date().toLocaleTimeString();
                logElement.textContent += `[${time}] ${message}${args.length > 0 ? ' ' + args.map(a => JSON.stringify(a)).join(' ') : ''}\n`;
                logElement.scrollTop = logElement.scrollHeight; // Scroll to bottom
            }
        }

        function setStatus(message, type = 'loading') {
            log(`Status: ${message}`);
            if (statusElement) {
                statusElement.textContent = message;
                statusElement.className = `status status-${type}`;
            }
        }

        // --- IndexedDB Helper to Load Data ---
        function openDB() {
             return new Promise((resolve, reject) => {
                 // Check if IndexedDB is supported
                 if (!window.indexedDB) {
                     reject("IndexedDB not supported by this browser.");
                     return;
                 }
                 // Open without specifying a version so we always get the latest schema
                 const request = indexedDB.open(DB_NAME); 

                 request.onerror = (event) => {
                     console.error("IndexedDB error:", event.target.error);
                     reject(`IndexedDB error: ${event.target.error?.message}`);
                 };

                 request.onsuccess = (event) => {
                     resolve(event.target.result);
                 };

                 // If the DB is being created for the first time, or upgraded,
                 // ensure the required object store exists.
                 request.onupgradeneeded = (event) => {
                      const db = (event.target as IDBOpenDBRequest).result as IDBDatabase;
                      if (!db.objectStoreNames.contains(STORE_NAME)) {
                          console.log(`[openDB] Creating missing object store '${STORE_NAME}' during upgrade/create.`);
                          db.createObjectStore(STORE_NAME);
                      }
                 };
             });
        }

        async function loadEhrDataFromDB() {
            try {
                const db = await openDB();
                return new Promise((resolve, reject) => {
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        db.close();
                        reject(`IndexedDB object store '${STORE_NAME}' not found. Please run configuration page first.`);
                        return;
                    }
                    const transaction = db.transaction([STORE_NAME], 'readonly');
                    const store = transaction.objectStore(STORE_NAME);
                    const request = store.get(dataKey);

                    request.onerror = (event) => {
                        console.error('Error reading data from IndexedDB:', event.target.error);
                        reject(`Error reading data: ${event.target.error?.message}`);
                    };

                    request.onsuccess = (event) => {
                        const result = event.target.result;
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
                        console.error('IndexedDB readonly transaction error:', event.target.error);
                        reject(`DB Read Transaction error: ${event.target.error?.message}`);
                    };
                });
            } catch (dbError) {
                // Catch errors from openDB itself
                 console.error("Failed to open IndexedDB:", dbError);
                 throw new Error(`Failed to access IndexedDB: ${dbError}`); // Re-throw to be caught by main init
            }
        }

        // --- Main Initialization Function ---
        async function initializeTool() {
            log('Attempting to load configuration...');
            try {
                // 1. Load Allowed Origins from LocalStorage
                const storedOrigins = localStorage.getItem(originsKey);
                if (storedOrigins) {
                    allowedOrigins = storedOrigins;
                    log(`Loaded allowed origins: ${allowedOrigins}`);
                } else {
                    log(`Using default allowed origins: ${allowedOrigins}`);
                }

                // 2. Load EHR Data from IndexedDB
                setStatus('Loading EHR data from IndexedDB...');
                const ehrDataString = await loadEhrDataFromDB();

                if (!ehrDataString) {
                    throw new Error('EHR data not found in IndexedDB. Please run the configuration page (ehr-mcp/configure.html) first.');
                }

                // 3. Parse EHR Data
                setStatus('Parsing EHR data...');
                try {
                    fullEhr = JSON.parse(ehrDataString);
                    // Basic validation of the parsed structure
                    if (!fullEhr || typeof fullEhr.fhir !== 'object' || !Array.isArray(fullEhr.attachments)) {
                        throw new Error('Parsed EHR data does not have the expected structure (missing fhir object or attachments array).');
                    }
                    log(`Successfully parsed EHR data. FHIR resource types: ${Object.keys(fullEhr.fhir || {}).length}, Attachments: ${fullEhr.attachments?.length ?? 0}`);
                } catch (parseError) {
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
                async function getContext(toolName) {
                    log(`getContext called for tool: ${toolName}`);
                    // In this simple example, we just return the already loaded fullEhr.
                    // A more complex setup might fetch data on demand.
                    // This environment doesn't have a database context.
                    if (!fullEhr) {
                        log("Warning: getContext called but fullEhr is not loaded yet.");
                    }
                    return { fullEhr: fullEhr, db: undefined };
                }

                // 6. Register EHR tools using the helper function
                setStatus('Registering tools...');
                registerEhrTools(mcpServer, getContext);

                log('Tools registered.');

                // Connect the server and transport
                setStatus('Connecting server and transport...');
                await mcpServer.connect(transport);
                log("Server connected to transport successfully!");

                setStatus('Ready. Listening for MCP messages.', 'ready');

                // --- Enable Test UI --- 
                setupTestUI(); // Call setup function after successful init

            } catch (error) {
                console.error("Initialization failed:", error);
                setStatus(`Error initializing tool: ${error.message}`, 'error');
            }
        }

        // --- Test UI Setup and Handlers ---
        function setupTestUI() {
            const testUiContainer = document.getElementById('test-ui-container');
            const grepResultEl = document.getElementById('grepResult');
            const readResourceResultEl = document.getElementById('readResourceResult');
            const readAttachmentResultEl = document.getElementById('readAttachmentResult'); // Get attachment result element

            if (!mcpServer || !fullEhr) { // Also check if fullEhr is loaded
                log("MCP Server or EHR data not ready, cannot set up Test UI.");
                return;
            }
            testUiContainer.style.display = 'block'; // Show the UI

            // REMOVE callCounter and request ID tracking - no longer needed for test UI
            // let callCounter = 1;
            // let lastReadResourceId = null;
            // let lastGrepRequestId = null;

            // REMOVE sendToolCall helper - no longer needed for test UI
            // function sendToolCall(...) { ... }

            // Grep Button - UPDATED
            document.getElementById('grepBtn').addEventListener('click', async () => { // Make async
                const query = document.getElementById('grepQuery').value;
                const typesRaw = document.getElementById('grepResourceTypes').value;
                const format = document.getElementById('grepResourceFormat').value;
                const page = parseInt(document.getElementById('grepPage').value, 10);
                const pageSize = parseInt(document.getElementById('grepPageSize').value, 10);

                if (!query) {
                    alert('Grep Query cannot be empty.');
                    return;
                }
                
                grepResultEl.textContent = '[Running grep...]'; // Update UI
                try {
                    const resource_types = typesRaw.trim() ? typesRaw.split(',').map(s => s.trim()).filter(Boolean) : undefined;
                    const page_num = (!isNaN(page) && page >= 1) ? page : undefined;
                    const page_size_num = (!isNaN(pageSize) && pageSize >= 1) ? pageSize : undefined;


                    // Call the logic function directly
                    const resultString = await grepRecordLogic(
                        fullEhr,
                        query,
                        resource_types,
                        format,
                        page_size_num, // Pass potentially undefined value
                        page_num       // Pass potentially undefined value
                    );
                    grepResultEl.textContent = resultString; // Display result directly

                } catch (error) {
                    grepResultEl.textContent = `Error running grep:
${error.message}`;
                }
            });

            // Read Resource Button - UPDATED
            document.getElementById('readResourceBtn').addEventListener('click', async () => { // Make async
                const resourceType = document.getElementById('readResourceType').value;
                const resourceId = document.getElementById('readResourceId').value;
                if (!resourceType || !resourceId) {
                    alert('Resource Type and Resource ID are required.');
                    return;
                }
                readResourceResultEl.textContent = '[Reading resource...]'; // Update UI
                try {
                    // Call the logic function directly
                    const resultString = await readResourceLogic(fullEhr, resourceType, resourceId);
                    // Parse and display
                    try {
                        const resultData = JSON.parse(resultString);
                        if (resultData.error) {
                            readResourceResultEl.textContent = `Tool Returned Error:
${JSON.stringify(resultData.error, null, 2)}`;
                        } else if (resultData.resource) {
                            readResourceResultEl.textContent = JSON.stringify(resultData.resource, null, 2);
                        } else if (resultData.resource === null) {
                            readResourceResultEl.textContent = `[Resource Not Found]`;
                        } else {
                            readResourceResultEl.textContent = `Unexpected result format:
${resultString}`;
                        }
                    } catch (parseError) {
                         readResourceResultEl.textContent = `Error parsing result:
${resultString}`;
                    }
                } catch (error) {
                    readResourceResultEl.textContent = `Error reading resource:
${error.message}`;
                }
            });

            // Read Attachment Button - UPDATED
            document.getElementById('readAttachmentBtn').addEventListener('click', async () => { // Make async
                const resourceType = document.getElementById('attachResourceType').value;
                const resourceId = document.getElementById('attachResourceId').value;
                const attachmentPath = document.getElementById('attachPath').value;
                const includeRawBase64 = document.getElementById('attachIncludeBase64').checked;

                if (!resourceType || !resourceId || !attachmentPath) {
                    alert('Resource Type, Resource ID, and Attachment Path are required.');
                    return;
                }
                
                readAttachmentResultEl.textContent = '[Reading attachment...]'; // Update UI
                log("--- Test UI: Calling readAttachmentLogic directly ---", {resourceType, resourceId, attachmentPath, includeRawBase64});
                 try {
                     // Call the logic function directly
                     const resultString = await readAttachmentLogic(fullEhr, resourceType, resourceId, attachmentPath, includeRawBase64);
                     log("--- Test UI: readAttachmentLogic result --- \n" + resultString); // Log the markdown result
                     readAttachmentResultEl.textContent = resultString; // Display result directly
                 } catch (error) {
                     log("--- Test UI: Error calling readAttachmentLogic ---", error);
                     readAttachmentResultEl.textContent = `Error reading attachment:
${error.message}`; // Report error in UI
                 }
            });

            // REMOVE the message listener for test responses - no longer needed
            // window.addEventListener('message', (event) => { ... });
            // ---------------------------------------------------------------------------
        }

        // --- Start Initialization ---
        initializeTool();



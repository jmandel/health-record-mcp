import React, { useState, useEffect, useCallback, useRef, ChangeEvent } from 'react';
import { McpServer, IntraBrowserServerTransport, z, registerEhrTools } from '@jmandel/ehr-mcp/src/tools-browser-entry.js';
import type { ClientFullEHR } from '@jmandel/ehr-mcp/clientTypes';
import JSZip from 'jszip'; // Import JSZip

// Import logic functions - Assuming they are accessible via the build process
// Might need adjustment based on your bundling setup
import {
    grepRecordLogic,
    readResourceLogic,
    readAttachmentLogic
} from '@jmandel/ehr-mcp/src/tools-browser-entry.js'; // Placeholder path

// --- Constants ---
const LOG_PREFIX = '[EHR-MCP-Provider]';
const DB_NAME = 'ehrMcpData';
const DB_VERSION = 1;
const DB_STORE_NAME = 'configurations'; // Changed from 'configuration' for clarity
const DEFAULT_CONFIG_LS_KEY = 'ehrMcpDefaultConfigName';
const DEFAULT_CONFIG_NAME = 'default';
const CONFIG_LIST_KEY = 'ehrMcpConfigNames'; // localStorage key

// --- Helper Functions (Can be moved to utils.ts) ---
function log(...args: any[]) {
    console.log(LOG_PREFIX, ...args);
    // Logging to UI will be handled via state
}

// Helper to get IndexedDB factory (Uses SAA handle if provided, simplifies prefixes)
function getIdbFactory(handle: any | null): IDBFactory {
    if (handle && handle.indexedDB) {
        log("Using handle.indexedDB for unpartitioned access.");
        return handle.indexedDB;
    } else {
        if (!handle) {
            log("No SAA handle provided, falling back to window.indexedDB (might be partitioned).");
        } else {
            log("SAA handle provided but lacks .indexedDB, falling back to window.indexedDB (might be partitioned).");
        }
        if (typeof window.indexedDB !== 'undefined') {
            return window.indexedDB;
        } else {
            throw new Error('IndexedDB is not supported in this browser.');
        }
    }
}

// Helper to derive per-config keys (Add validation if needed)
function getKeys(configName: string | null | undefined) {
    const key = configName || 'global';
    // Add validation if desired
    return {
        dataKey: `ehrJsonData::${key}`,
        originsKey: `ehrMcpAllowedOrigins::${key}`,
        configName: key
    };
}

// Helper to get storage permission state (Using 'storage-access' for SAA)
async function getStoragePermissionState(): Promise<PermissionState> {
    log("Querying 'storage-access' permission state...");
    if (navigator.permissions && typeof navigator.permissions.query === 'function') {
        try {
            // Use 'storage-access' for the Storage Access API permission query
            const permissionStatus = await navigator.permissions.query({ name: 'storage-access' as any });
            log("'storage-access' permission state:", permissionStatus.state);
            return permissionStatus.state;
        } catch (e) {
            log("Error querying 'storage-access' permission:", e);
            // Browsers might deny querying this. Assume prompt if query fails.
            return 'prompt';
        }
    } else {
        log("Permissions API or query method not available. Assuming 'prompt'.");
        return 'prompt';
    }
}

// Helper to try activating storage access (Returns handle or null)
async function tryActivateStorageAccess(appendLog: (msg: string, ...args: any[]) => void): Promise<any | null> {
    appendLog("Attempting to request storage access for IndexedDB...");
    try {
        if (typeof (document as any).requestStorageAccess !== 'function') {
            appendLog("document.requestStorageAccess API not available.");
            return null;
        }

        try {
            appendLog("Attempting document.requestStorageAccess({ indexedDB: true })…");
            const handle = await (document as any).requestStorageAccess({ indexedDB: true });
            appendLog("Successfully called requestStorageAccess({ indexedDB: true }).");
            appendLog("requestStorageAccess({ indexedDB: true }) returned handle:", handle);
            return handle; // Return the handle
        } catch (e) {
             appendLog("Error invoking requestStorageAccess({ indexedDB: true }):", e);
             if (e instanceof TypeError) {
                 appendLog("Call with { indexedDB: true } failed (API shape mismatch or browser policy). No fallback attempted.");
             }
            return null;
        }
    } catch (err) {
        appendLog("Error during requestStorageAccess process:", err);
        return null;
    }
}

// Helper to extract EHR data from file
async function extractEhrFromZipOrJson(file: File, appendLog: (msg: string, ...args: any[]) => void): Promise<ClientFullEHR | null> {
    appendLog(`Processing file: ${file.name} (${file.type})`);
    if (file.type === 'application/zip') {
        appendLog('Attempting to read ZIP file...');
        try {
            const zip = await JSZip.loadAsync(file);
            const jsonFile = zip.file(/\.json$/i)[0]; // Find the first .json file
            if (!jsonFile) {
                appendLog('Error: No .json file found inside the ZIP.');
                return null;
            }
            appendLog(`Found JSON file in ZIP: ${jsonFile.name}`);
            const jsonContent = await jsonFile.async('string');
            const ehrData = JSON.parse(jsonContent) as ClientFullEHR;
            appendLog('Successfully parsed EHR data from ZIP.');
            return ehrData;
        } catch (error) {
            appendLog('Error reading or parsing ZIP file:', error);
            return null;
        }
    } else if (file.type === 'application/json') {
        appendLog('Attempting to read JSON file...');
        try {
            const jsonContent = await file.text();
            const ehrData = JSON.parse(jsonContent) as ClientFullEHR;
            appendLog('Successfully parsed EHR data from JSON.');
            return ehrData;
        } catch (error) {
            appendLog('Error reading or parsing JSON file:', error);
            return null;
        }
    } else {
        appendLog(`Error: Unsupported file type: ${file.type}. Please upload a .zip or .json file.`);
        return null;
    }
}

// Helper to save config and EHR data to IndexedDB (Now needs handle passed)
async function saveConfigAndEhr(
    configName: string,
    ehrData: ClientFullEHR,
    clientOrigin: string | null,
    handle: any | null, // Pass handle
    appendLog: (msg: string, ...args: any[]) => void
): Promise<boolean> {
    appendLog(`Attempting to save configuration: ${configName}`);
    const idbFactory = getIdbFactory(handle); // Pass handle
    if (!idbFactory) {
        appendLog('Error: IndexedDB not supported.');
        return false;
    }

    return new Promise<boolean>((resolve, reject) => {
        const request = idbFactory.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            appendLog('IndexedDB upgrade needed.');
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(DB_STORE_NAME)) {
                appendLog(`Creating object store: ${DB_STORE_NAME}`);
                db.createObjectStore(DB_STORE_NAME);
            }
        };

        request.onsuccess = (event) => {
            appendLog('IndexedDB opened successfully for saving.');
            const db = (event.target as IDBOpenDBRequest).result;
            const transaction = db.transaction(DB_STORE_NAME, 'readwrite');
            const store = transaction.objectStore(DB_STORE_NAME);

            const keys = getKeys(configName); // Get the keys object
            const dataToStore = {
                ehrData: ehrData,
                allowedOrigin: clientOrigin, // Store the origin that configured it
                timestamp: new Date().toISOString(),
            };

            appendLog(`Storing data under key: ${keys.dataKey}`); // Use dataKey
            const putRequest = store.put(dataToStore, keys.dataKey); // Use dataKey

            putRequest.onsuccess = () => {
                appendLog(`Configuration '${configName}' saved successfully.`);
                resolve(true);
            };
            putRequest.onerror = (putEvent) => {
                appendLog(`Error saving configuration '${configName}':`, (putEvent.target as IDBRequest).error);
                resolve(false); // Resolve false on error, don't reject promise
            };

            transaction.oncomplete = () => {
                appendLog('Save transaction completed.');
                db.close();
            };
            transaction.onerror = (txEvent) => {
                appendLog('Save transaction error:', (txEvent.target as IDBTransaction).error);
                db.close();
                resolve(false);
            };
        };

        request.onerror = (event) => {
            appendLog('Error opening IndexedDB for saving:', (event.target as IDBOpenDBRequest).error);
            resolve(false);
        };

        request.onblocked = (event) => {
            appendLog('IndexedDB open request blocked during save attempt.', event);
            resolve(false);
        };
    });
}

// Helper to load config and EHR data from IndexedDB (Now needs handle passed)
async function loadEhrDataFromDB(
    configName: string,
    handle: any | null, // Pass handle
    appendLog: (msg: string, ...args: any[]) => void
): Promise<{ ehrData: ClientFullEHR; allowedOrigin: string | null } | null> {
    appendLog(`Attempting to load configuration: ${configName}`);
    const idbFactory = getIdbFactory(handle); // Pass handle
    if (!idbFactory) {
        appendLog('Error: IndexedDB not supported.');
        return null;
    }

    return new Promise<{ ehrData: ClientFullEHR; allowedOrigin: string | null } | null>((resolve, reject) => {
        try {
            const request = idbFactory.open(DB_NAME, DB_VERSION); // No need to specify version for read usually

            request.onsuccess = (event) => {
                appendLog('IndexedDB opened successfully for loading.');
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(DB_STORE_NAME)) {
                    appendLog(`Error: Object store '${DB_STORE_NAME}' not found.`);
                    db.close();
                    resolve(null); // Resolve null if store doesn't exist
                    return;
                }
                const transaction = db.transaction(DB_STORE_NAME, 'readonly');
                const store = transaction.objectStore(DB_STORE_NAME);
                const keys = getKeys(configName);
                const getRequest = store.get(keys.dataKey);

                getRequest.onsuccess = () => {
                    if (getRequest.result) {
                        appendLog(`Configuration '${configName}' loaded successfully.`);
                        const data = getRequest.result as { ehrData: ClientFullEHR; allowedOrigin: string | null; timestamp: string };
                        resolve({ ehrData: data.ehrData, allowedOrigin: data.allowedOrigin });
                    } else {
                        appendLog(`Error: Configuration '${configName}' not found in IndexedDB.`);
                        resolve(null);
                    }
                };
                getRequest.onerror = (getEvent) => {
                    appendLog(`Error loading configuration '${configName}' from store:`, (getEvent.target as IDBRequest).error);
                    resolve(null);
                };

                transaction.oncomplete = () => {
                    appendLog('Load transaction completed.');
                    db.close();
                };
                transaction.onerror = (txEvent) => {
                    appendLog('Load transaction error:', (txEvent.target as IDBTransaction).error);
                    db.close();
                    resolve(null);
                };
            };

            request.onerror = (event) => {
                appendLog('Error opening IndexedDB for loading:', (event.target as IDBOpenDBRequest).error);
                resolve(null);
            };

            request.onblocked = (event) => {
                appendLog('IndexedDB open request blocked during load attempt.', event);
                resolve(null); // Resolve null if blocked
            };
        } catch (error) {
            appendLog('Error initiating IndexedDB open for load:', error);
            resolve(null);
        }
    });
}

// Function to post messages to the parent window (used in setup phase)
function postSetupStatusToParent(status: 'SERVER_SETUP_COMPLETE' | 'SERVER_SETUP_ABORT', payload: any, clientOrigin: string | null) {
    if (!window.opener && window.parent === window) {
        log("Error: Cannot post setup status, not in an iframe or popup.");
        return;
    }
    if (!clientOrigin) {
        log("Error: Cannot post setup status, clientOrigin is required.");
        return;
    }
    const target = window.opener || window.parent;
    const message = {
        type: status,                // Set the top-level type to the status
        success: status === 'SERVER_SETUP_COMPLETE', // Add boolean success field
        ...payload                   // Spread the rest of the payload
    };
    log(`Posting setup status to parent/opener (${clientOrigin}):`, message);
    target.postMessage(message, clientOrigin);

    // Optionally close the window after sending status
    // if (status === 'SERVER_SETUP_ABORT' || status === 'SERVER_SETUP_COMPLETE') {
    //     setTimeout(() => window.close(), 500); // Small delay
    // }
}

// Helper to generate a unique config name from patient's first name
function generateUniqueConfigName(ehrData: ClientFullEHR | null, existingNames: string[]): string {
    const baseName = extractFirstName(ehrData);
    let configName = baseName;
    let counter = 1;
    const lowerCaseExisting = new Set(existingNames.map(n => n.toLowerCase()));

    while (lowerCaseExisting.has(configName.toLowerCase())) {
        configName = `${baseName}_${counter}`;
        counter++;
    }
    return configName;
}

// Helper to extract first name from the first Patient resource found
function extractFirstName(ehrData: ClientFullEHR | null): string {
    if (!ehrData || !ehrData.fhir || !Array.isArray(ehrData.fhir.Patient) || ehrData.fhir.Patient.length === 0) {
        return DEFAULT_CONFIG_NAME; // Fallback if no patient data
    }
    const patient = ehrData.fhir.Patient[0];
    if (patient.name && Array.isArray(patient.name) && patient.name.length > 0) {
        const name = patient.name[0];
        if (name.given && Array.isArray(name.given) && name.given.length > 0) {
            // Basic sanitization: take first given name, lowercase, replace non-alphanum with underscore
            const firstName = name.given[0].toLowerCase().replace(/[^a-z0-9]/g, '_');
            return firstName || DEFAULT_CONFIG_NAME; // Fallback if sanitized name is empty
        }
    }
    return DEFAULT_CONFIG_NAME; // Fallback if structure is unexpected
}

// --- Main Component ---
const EhrMcpTool = () => {
    const [phase, setPhase] = useState<'setup' | 'transport' | 'unknown'>('unknown');
    const [logs, setLogs] = useState<string[]>([]);
    const [statusMessage, setStatusMessage] = useState<string>('Initializing...');
    const [statusType, setStatusType] = useState<'loading' | 'error' | 'ready' | 'info' | 'success' | 'warning'>('loading');
    const [clientOrigin, setClientOrigin] = useState<string | null>(null);
    const [permissionState, setPermissionState] = useState<PermissionState | 'unknown'>('unknown');
    const [activationStatus, setActivationStatus] = useState<'idle' | 'activating' | 'activated' | 'failed'>('idle');
    const [ehrDataString, setEhrDataString] = useState<string | null>(null);
    const [isConnecting, setIsConnecting] = useState<boolean>(false);
    const [savedConfigs, setSavedConfigs] = useState<string[]>([]);
    const [defaultConfigName, setDefaultConfigNameState] = useState<string | null>(null);
    const [isConfigUIEnabled, setIsConfigUIEnabled] = useState<boolean>(false);
    const [showAbortButton, setShowAbortButton] = useState<boolean>(true);
    const [currentConfigName, setCurrentConfigName] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const saHandleRef = useRef<any | null>(null);
    const mcpServerRef = useRef<McpServer | null>(null);
    const transportRef = useRef<IntraBrowserServerTransport | null>(null);
    const fullEhrRef = useRef<ClientFullEHR | null>(null);

    // Function to append logs
    const appendLog = useCallback((message: string, ...args: any[]) => {
        log(message, ...args); // Log to console
        const time = new Date().toLocaleTimeString();
        const detailString = args.length > 0 ? ' ' + args.map(a => JSON.stringify(a)).join(' ') : '';
        const fullMessage = `[${time}] ${message}${detailString}`;
        setLogs(prevLogs => [...prevLogs, fullMessage]);
    }, []);

    // Effect to load saved configuration names and default config on mount (or after activation)
    const populateConfigsList = useCallback(async () => {
        appendLog("Populating config list...");
        try {
            const storedNames = localStorage.getItem(CONFIG_LIST_KEY);
            if (storedNames) {
                const names = JSON.parse(storedNames);
                if (Array.isArray(names)) {
                    setSavedConfigs(names);
                    appendLog('Loaded saved configuration names:', names);
                }
            }
            const storedDefault = localStorage.getItem(DEFAULT_CONFIG_LS_KEY);
            if (storedDefault) {
                setDefaultConfigNameState(storedDefault);
                appendLog('Loaded default configuration name:', storedDefault);
            }
        } catch (error) {
            appendLog('Error loading configuration names/default from localStorage:', error);
        }
    }, [appendLog]); // Dependency on appendLog only

    // Helper function for saving configuration
    const saveConfiguration = useCallback(async (configName: string, dataString: string | null) => {
        if (!dataString) {
            appendLog("Save Configuration: No data string provided.");
            setStatusMessage('Error: No data available to save.');
            setStatusType('error');
            return;
        }
        if (!isConfigUIEnabled || activationStatus !== 'activated') {
            appendLog("Save Configuration: UI not enabled or access not activated.");
            setStatusMessage('Error: Cannot save configuration without storage access.');
            setStatusType('error');
            return;
        }

        const effectiveConfigName = configName.trim() || DEFAULT_CONFIG_NAME;
        appendLog(`Attempting to save configuration: '${effectiveConfigName}'`);
        setStatusMessage(`Saving configuration '${effectiveConfigName}'...`);
        setStatusType('loading');
        setIsConnecting(false); // Ensure connection state is reset

        let ehrData: ClientFullEHR | null = null;
        try {
            ehrData = JSON.parse(dataString) as ClientFullEHR;
            // Optional: Add more validation for ClientFullEHR structure here
            if (!ehrData || typeof ehrData.fhir !== 'object' || !Array.isArray(ehrData.attachments)) {
                throw new Error('Data does not match expected ClientFullEHR structure.');
            }
        } catch (parseError: any) {
            appendLog("Save Configuration: Error parsing EHR data string:", parseError);
            setStatusMessage(`Error: Invalid data format. ${parseError.message}`);
            setStatusType('error');
            setEhrDataString(null); // Clear invalid data
            return;
        }

        const saved = await saveConfigAndEhr(effectiveConfigName, ehrData, clientOrigin, saHandleRef.current, appendLog);

        if (saved) {
            appendLog(`Configuration '${effectiveConfigName}' saved successfully.`);
            setStatusMessage(`Configuration '${effectiveConfigName}' saved.`);
            setStatusType('success');

            // Update config list in state and localStorage
            const newConfigList = [...new Set([...savedConfigs, effectiveConfigName])];
            setSavedConfigs(newConfigList);
            localStorage.setItem(CONFIG_LIST_KEY, JSON.stringify(newConfigList));

            // Reset form for next potential save
            setEhrDataString(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            await populateConfigsList(); // Refresh list view

        } else {
            appendLog(`Save Configuration: Failed to save '${effectiveConfigName}' to storage.`);
            setStatusMessage(`Error: Failed to save configuration '${effectiveConfigName}' to storage.`);
            setStatusType('error');
        }
    }, [clientOrigin, appendLog, savedConfigs, isConfigUIEnabled, activationStatus, populateConfigsList]);

    // --- Effects ---
    useEffect(() => {
        // Determine phase and client origin on mount
        appendLog("DOM equivalent ready. Checking phase...");
        const urlParams = new URLSearchParams(window.location.search);
        const detectedPhase = urlParams.get('phase');
        const detectedClientOrigin = urlParams.get('client');

        appendLog("Current search string:", window.location.search);
        appendLog("Detected phase parameter:", detectedPhase);
        appendLog("Detected client origin:", detectedClientOrigin);

        setClientOrigin(detectedClientOrigin);
        const initialPhase = detectedPhase === 'setup' ? 'setup' : 'transport';
        setPhase(initialPhase);

        if (initialPhase === 'setup') {
            // --- Setup Phase Initial Permission Logic --- 
            setStatusMessage('Checking storage access permission...');
            setStatusType('loading');
            setIsConfigUIEnabled(false); // Start disabled
            setShowAbortButton(true); // Show abort initially

            getStoragePermissionState().then(async (initialState) => { // Make async
                setPermissionState(initialState);
                if (initialState === 'granted') {
                    appendLog("Setup: Initial permission state is 'granted'. Attempting to activate...");
                    setStatusMessage("Permission previously granted. Activating access...");
                    setStatusType('loading');
                    const handle = await tryActivateStorageAccess(appendLog);
                    if (handle) {
                        saHandleRef.current = handle; // Store handle in ref
                        appendLog("Setup: Storage access activated successfully (initial state was granted).");
                        setStatusMessage("Storage access active. Ready for configuration.");
                        setStatusType('ready');
                        setActivationStatus('activated');
                        setIsConfigUIEnabled(true);
                        // Hide Grant button, show config UI
                        await populateConfigsList(); // Load configs now
                    } else {
                        appendLog("Setup: Failed to activate storage access even though permission was granted.");
                        setStatusMessage("Error: Permission granted, but failed to activate storage access automatically. Cannot proceed.");
                        setStatusType('error');
                        setActivationStatus('failed');
                        setIsConfigUIEnabled(false);
                        // Abort setup
                        postSetupStatusToParent('SERVER_SETUP_ABORT', { code: 'FAILED', reason: 'Storage access activation failed.' }, detectedClientOrigin);
                        setShowAbortButton(false); // Hide abort after sending
                    }
                } else if (initialState === 'prompt') {
                    appendLog("Setup: Initial permission state is 'prompt'. User interaction required.");
                    setStatusMessage("This tool needs storage access to save configurations.");
                    setStatusType('info');
                    setActivationStatus('idle');
                    setIsConfigUIEnabled(false);
                    // Ensure Grant button is visible and enabled (handled by render logic)
                } else { // initialState === 'denied'
                    appendLog("Setup: Initial permission state is 'denied'. Access cannot be requested.");
                    setStatusMessage("Storage access has been denied. Please enable Storage Access for this site in your browser settings.");
                    setStatusType('error');
                    setActivationStatus('failed'); // Treat as failed state
                    setIsConfigUIEnabled(false);
                    // Abort setup
                    postSetupStatusToParent('SERVER_SETUP_ABORT', { code: 'PERMISSION_DENIED', reason: 'Storage access permission denied.' }, detectedClientOrigin);
                    setShowAbortButton(false); // Hide abort after sending
                }
            });
        } else { // Transport Phase
            setStatusMessage('Initializing transport...');
            setStatusType('loading');
            setShowAbortButton(false); // No abort in transport
        }

    }, [appendLog, populateConfigsList]); // appendLog is stable

    // Effect for Setup Phase - Activation via Button Click
    useEffect(() => {
        // Only run when activationStatus is set to 'activating' by the button click
        if (phase === 'setup' && activationStatus === 'activating') {
             appendLog('Activation triggered by button click...');
             tryActivateStorageAccess(appendLog).then(async (handle) => { // make async
                 if (handle) {
                     saHandleRef.current = handle; // Store handle in ref
                     appendLog('Storage access activation successful via button click.');
                     setPermissionState('granted'); // Update permission state
                     setActivationStatus('activated');
                     setStatusMessage('Storage access granted. Ready to configure.');
                     setStatusType('ready');
                     setIsConfigUIEnabled(true);
                     await populateConfigsList(); // Load configs now
                 } else {
                     appendLog('Storage access activation failed after button click.');
                     setActivationStatus('failed');
                     setStatusMessage('Storage access denied or failed. Check browser settings or try again.');
                     setStatusType('error');
                     setIsConfigUIEnabled(false);
                     // Don't abort automatically here, allow user to retry grant or abort manually
                     // Re-enable grant button via render logic based on activationStatus === 'failed'
                 }
             });
        }
    }, [phase, activationStatus, appendLog]); // Removed clientOrigin dependency here

    // Effect for Transport Phase Initialization
    useEffect(() => {
        if (phase !== 'transport') return;

        let isActive = true; // Flag to prevent state updates if component unmounts

        const initializeTransport = async () => {
            appendLog('Starting Transport Phase Initialization...');

            // --- Transport Storage Access Check ---
            appendLog('Transport Phase: Checking storage permission state...');
            const permissionState = await getStoragePermissionState();
            if (permissionState === 'granted') {
                appendLog("Transport Phase: Permission is granted. Attempting to activate access silently...");
                const handle = await tryActivateStorageAccess(appendLog);
                if (handle) {
                    saHandleRef.current = handle; // Store handle in ref
                    appendLog("Transport Phase: Unpartitioned storage access activated.");
                } else {
                    appendLog("WARNING: Failed to activate unpartitioned storage access in Transport Phase even though permission was granted. Proceeding with default (potentially partitioned) IndexedDB.");
                    // Optionally update status, but don't block
                    // setStatusMessage('Warning: Using potentially partitioned storage.');
                    // setStatusType('warning');
                }
            } else {
                appendLog(`WARNING: Storage access permission is '${permissionState}' in Transport Phase. Activation cannot be requested silently. Proceeding with default (potentially partitioned) IndexedDB.`);
                // Optionally update status, but don't block
                // setStatusMessage('Warning: Using potentially partitioned storage.');
                // setStatusType('warning');
            }
            // --- End Transport Storage Access Check ---

            const urlParams = new URLSearchParams(window.location.search);
            let targetConfigName = urlParams.get('config');
            appendLog(`Config name from URL: ${targetConfigName}`);

            if (!targetConfigName) {
                targetConfigName = localStorage.getItem(DEFAULT_CONFIG_LS_KEY) || DEFAULT_CONFIG_NAME;
                appendLog(`Using default/fallback config name: ${targetConfigName}`);
            }

            if (!targetConfigName) { // Should not happen with default fallback, but safety check
                appendLog('Error: No configuration name specified or found.');
                 if (isActive) {
                    setStatusMessage('Error: Configuration not specified.');
                    setStatusType('error');
                 }
                return;
            }

            if (!isActive) return; // Check before async load
            setStatusMessage(`Loading configuration: ${targetConfigName}...`);
            setStatusType('loading');

            const loadedData = await loadEhrDataFromDB(targetConfigName, saHandleRef.current, appendLog);

            if (!loadedData || !loadedData.ehrData) {
                appendLog('Failed to load EHR data from IndexedDB.');
                if (isActive) {
                    setStatusMessage(`Error: Could not load data for config '${targetConfigName}'.`);
                    setStatusType('error');
                }
                return;
            }

            if (isActive) {
                appendLog('EHR data loaded. Initializing MCP Server...');
                fullEhrRef.current = loadedData.ehrData;
                // **Use the loaded allowedOrigin for the transport**
                const loadedAllowedOrigin = loadedData.allowedOrigin; // Get the origin saved with the config
                appendLog(`Configuration allows connections from origin: ${loadedAllowedOrigin || '(Not set during config - allowing any \'*\' - check setup logic)'}`);
                 // Determine trusted origins based on loaded data, similar to old code
                 let trustedOrigins: string[] | '*' = '*'; // Default to '*' if not set
                 if (loadedAllowedOrigin) {
                     trustedOrigins = loadedAllowedOrigin.split(',').map(s => s.trim()).filter(Boolean);
                 }
                 if (Array.isArray(trustedOrigins) && trustedOrigins.length === 0) {
                     trustedOrigins = '*'; // Fallback to '*' if split/filter results in empty array
                 }
                 appendLog('Derived trustedClientOrigins for transport:', trustedOrigins);

                try {
                    // Instantiate Transport using derived trusted origins
                    const transport = new IntraBrowserServerTransport({
                        trustedClientOrigins: trustedOrigins,
                        // NOTE: Assumes constructor sets up listening
                    });
                    transportRef.current = transport;
                    appendLog('IntraBrowserServerTransport initialized.');

                    // Instantiate Server
                    const server = new McpServer({
                        name: 'EHR-MCP-React-Provider',
                        version: '1.0.0'
                    });
                    mcpServerRef.current = server;
                    appendLog('McpServer initialized.');

                    // Define the getContext function expected by registerEhrTools
                    // It should return the currently loaded EHR data.
                    async function getContext(toolName: string, extra?: Record<string, any>): Promise<{ fullEhr?: ClientFullEHR | undefined; db?: undefined }> {
                        appendLog(`Server requested context for tool: ${toolName}`, extra);
                        if (!fullEhrRef.current) {
                             appendLog("Error: getContext called but fullEhr data is not available.");
                            // Depending on server behavior, might need to reject or return empty
                             throw new Error('EHR data context not available');
                        }
                        // Return the required structure
                        return { fullEhr: fullEhrRef.current, db: undefined };
                    }

                    // Register Tool Implementations - Pass the getContext function
                    registerEhrTools(server, getContext);
                    appendLog('MCP Tools registered using getContext.');

                    // **Connect the server and transport**
                    appendLog('Connecting server and transport...');
                    await server.connect(transport); // Use await if connect is async
                    appendLog('Server connected to transport successfully!');

                    setStatusMessage(`Ready. Listening for requests for config '${targetConfigName}'.`);
                    setStatusType('ready');

                    setCurrentConfigName(targetConfigName); // Use the setter here

                } catch (error) {
                    appendLog('Error initializing transport or MCP server:', error);
                    setStatusMessage('Error initializing server.');
                    setStatusType('error');
                }
            }
        };

        initializeTransport();

        return () => {
            isActive = false; // Prevent state updates on unmount
            appendLog('Transport phase cleanup: Stopping server (if applicable)...');
            // mcpServerRef.current?.stop(); // Check if McpServer has a stop/disconnect method
            mcpServerRef.current = null;
            transportRef.current = null;
            fullEhrRef.current = null;
        };

    }, [phase, appendLog]); // Removed clientOrigin dependency, useEffect should only run once for transport

    // Effect for postMessage Listener (Setup Phase - EHR Connect)
    useEffect(() => {
        if (phase !== 'setup') return;

        const handleConnectMessage = async (event: MessageEvent) => {
            if (event.origin !== 'https://mcp.fhir.me') return;
            appendLog("Received message from mcp.fhir.me:", event.data);

            if (event.data && typeof event.data === 'object' && event.data.fhir) {
                appendLog("Message appears to be valid ClientFullEHR data from connection.");
                try {
                    const receivedEhrData = event.data as ClientFullEHR;
                    const receivedDataString = JSON.stringify(receivedEhrData);
                    setEhrDataString(receivedDataString);
                    setIsConnecting(false);

                    const generatedName = generateUniqueConfigName(receivedEhrData, savedConfigs);
                    appendLog(`Generated unique config name: ${generatedName}`);
                    await saveConfiguration(generatedName, receivedDataString);

                } catch (error: any) {
                    appendLog("Error processing/saving EHR data from connection:", error);
                    setStatusMessage(`Error processing received EHR data: ${error.message}`);
                    setStatusType('error');
                    setIsConnecting(false);
                    setEhrDataString(null);
                }
            } else {
                appendLog("Received message from mcp.fhir.me, but it does not match expected format.");
                // Might receive other messages, ignore them silently?
            }
        };

        appendLog('Adding postMessage listener for EHR Connect.');
        window.addEventListener('message', handleConnectMessage);

        return () => {
            appendLog('Removing postMessage listener for EHR Connect.');
            window.removeEventListener('message', handleConnectMessage);
        };
    }, [phase, appendLog, saveConfiguration, savedConfigs]); // Removed configNameInput dep

    // Effect for postMessage Listener (Transport Phase)
    useEffect(() => {
        if (phase !== 'transport' || !transportRef.current) return; // Ensure transport exists

        const transportInstance = transportRef.current; // Capture instance

        const handleMessage = (event: MessageEvent) => {
            // Basic validation: origin, data presence, and type
            if (!event.data || typeof event.data !== 'object' || event.data.type !== 'ehr-mcp-message') {
                return; // Ignore irrelevant messages
            }

            // Origin check (optional but recommended for security)
            // if (clientOrigin && event.origin !== clientOrigin) {
            //     appendLog(`Error: Received message from unexpected origin: ${event.origin}. Expected: ${clientOrigin}. Ignoring.`);
            //     return;
            // }

            appendLog('Received message from client via listener:', event.data.payload);

            // Pass the message to the transport instance for the server to handle
            // Assuming the transport exposes a method to receive messages from the listener
            // If not, the server might directly listen via the transport after initialization.
            // Let's assume the transport constructor handles the listening and server integration.
            // transportInstance.handleIncomingMessage(event.data); // Remove this - likely handled internally

        };

        appendLog('Adding postMessage listener for transport phase (primarily for logging/debugging).');
        window.addEventListener('message', handleMessage);

        return () => {
            appendLog('Removing postMessage listener.');
            window.removeEventListener('message', handleMessage);
        };
    }, [phase, clientOrigin, appendLog]);

    // --- Event Handlers ---
    const handleGrantAccessClick = useCallback(async () => {
        if (activationStatus === 'activating' || activationStatus === 'activated') return; // Prevent clicks if activating/activated
        appendLog('Grant Access button clicked.');
        setActivationStatus('activating'); // Trigger the activation effect
        setStatusMessage('Requesting storage access...');
        setStatusType('loading');
    }, [activationStatus, appendLog]);

    const handleFileChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        setIsConnecting(false); // If user selects file, cancel connection wait
        setEhrDataString(null); // Clear any previous data

        if (!file) {
            appendLog('File selection cleared.');
            return;
        }
        appendLog(`File selected: ${file.name} (${file.type}, ${file.size} bytes)`);

        if (file.type !== 'application/zip' && file.type !== 'application/json') {
            appendLog('Invalid file type selected.');
            setStatusMessage('Error: Please select a .zip or .json file.');
            setStatusType('error');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }
        setStatusMessage('Reading and processing file...');
        setStatusType('loading');
        setEhrDataString(null);

        try {
            const extractedEhrData = await extractEhrFromZipOrJson(file, appendLog);
            if (extractedEhrData) {
                const dataString = JSON.stringify(extractedEhrData);
                setEhrDataString(dataString); // Store data string temporarily

                const generatedName = generateUniqueConfigName(extractedEhrData, savedConfigs);
                appendLog(`Generated unique config name: ${generatedName}`);
                setStatusMessage(`File processed. Saving config '${generatedName}'...`);
                await saveConfiguration(generatedName, dataString);
            } else {
                setStatusMessage('Error: Could not extract valid data from file.');
                setStatusType('error');
                if (fileInputRef.current) fileInputRef.current.value = ''; // Clear invalid file
            }
        } catch (error) { // Catch errors from extract or stringify or save
             appendLog("Error processing file:", error);
             setStatusMessage('Error processing file.');
             setStatusType('error');
             setEhrDataString(null);
             if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }, [appendLog, saveConfiguration, savedConfigs]); // Removed configNameInput dep

    const handleConnectEhrClick = useCallback(() => {
        if (!isConfigUIEnabled) return;

        const connectUrl = `https://mcp.fhir.me/ehr-connect#deliver-to-opener:${window.location.origin}`;
        appendLog(`Opening EHR connection window: ${connectUrl}`);

        try {
            const popup = window.open(connectUrl, "ehrConnectWindow", "width=1000,height=800,scrollbars=yes,resizable=yes");
            if (!popup) {
                setStatusMessage("Failed to open EHR connection window. Please disable popup blockers for this site.");
                setStatusType('error');
                return;
            }
            setIsConnecting(true);
            setStatusMessage("Waiting for data from EHR connection window...");
            setStatusType('loading');
            setEhrDataString(null); // Clear any previous data/file
            if (fileInputRef.current) fileInputRef.current.value = ''; // Clear file input

        } catch (error) {
            appendLog("Error opening popup:", error);
            setStatusMessage("Error opening EHR connection window.");
            setStatusType('error');
            setIsConnecting(false);
        }
    }, [isConfigUIEnabled, appendLog]);

    const handleDeleteConfig = useCallback(async (configNameToDelete: string) => {
        appendLog(`Attempting to delete configuration: ${configNameToDelete}`);

        const newConfigList = savedConfigs.filter(name => name !== configNameToDelete);
        setSavedConfigs(newConfigList);
        localStorage.setItem(CONFIG_LIST_KEY, JSON.stringify(newConfigList));

        if (defaultConfigName === configNameToDelete) {
            localStorage.removeItem(DEFAULT_CONFIG_LS_KEY);
            setDefaultConfigNameState(null);
            appendLog(`Removed default config setting as '${configNameToDelete}' was deleted.`);
        }
        const idbFactory = getIdbFactory(saHandleRef.current);
        if (!idbFactory) {
            appendLog('Cannot delete from IDB: Factory not available.');
            return;
        }
        try {
            const db = await new Promise<IDBDatabase>((resolve, reject) => {
                const request = idbFactory.open(DB_NAME, DB_VERSION);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
                request.onblocked = () => reject(new Error('IDB open blocked'));
            });
            const transaction = db.transaction(DB_STORE_NAME, 'readwrite');
            const store = transaction.objectStore(DB_STORE_NAME);
            const keys = getKeys(configNameToDelete);
            store.delete(keys.dataKey);

            await new Promise<void>((resolve, reject) => {
                transaction.oncomplete = () => {
                    appendLog(`Successfully deleted '${configNameToDelete}' data from IndexedDB.`);
                    db.close();
                    resolve();
                };
                transaction.onerror = () => {
                    appendLog(`Error in IndexedDB delete transaction for '${configNameToDelete}'.`);
                    db.close();
                    reject(transaction.error);
                };
            });
        } catch (error) {
             appendLog(`Error deleting '${configNameToDelete}' from IndexedDB:`, error);
        }
    }, [savedConfigs, defaultConfigName, appendLog]);

    const handleSetDefaultConfig = useCallback((configNameToSet: string) => {
        if (configNameToSet === defaultConfigName) return; // No change
        appendLog(`Setting '${configNameToSet}' as the default configuration.`);
        try {
            localStorage.setItem(DEFAULT_CONFIG_LS_KEY, configNameToSet);
            setDefaultConfigNameState(configNameToSet);
        } catch (e) {
            appendLog("Error setting default config name in localStorage:", e);
        }
    }, [defaultConfigName, appendLog]);

    const handleAbortClick = useCallback(() => {
        appendLog("Abort button clicked by user.");
        postSetupStatusToParent('SERVER_SETUP_ABORT', { code: 'USER_CANCELED', reason: 'User aborted setup.' }, clientOrigin);
        setShowAbortButton(false); // Correctly use setter
        // Maybe close window?
        // setTimeout(() => window.close(), 300);
    }, [clientOrigin, appendLog]);

    const handleDoneClick = useCallback(() => {
        appendLog("Done button clicked.");
        postSetupStatusToParent('SERVER_SETUP_COMPLETE', {}, clientOrigin); // Send simple completion
        setShowAbortButton(false); // Correctly use setter
        // Maybe close window?
        // setTimeout(() => window.close(), 300);
    }, [clientOrigin, appendLog]);

    // --- Rendering Logic ---
    return (
        <div>
            <h1>EHR MCP Tool (React Version)</h1>

            {/* Config List Section */} 
            {phase === 'setup' && isConfigUIEnabled && (
                <div className="config-section">
                    <h2>Existing Configurations</h2>
                    {savedConfigs.length === 0 ? (
                        <p>No configurations saved yet.</p>
                    ) : (
                        <ul>
                            {savedConfigs.map(name => (
                                <li key={name}>
                                    <span className="config-name">{name}</span>
                                     {name === defaultConfigName && <strong>(Default)</strong>}
                                    <div className="config-actions">
                                        {name !== defaultConfigName && (
                                            <button onClick={() => handleSetDefaultConfig(name)} className="icon icon-default" title="Set Default">
                                                Set Default
                                            </button>
                                        )}
                                        <button onClick={() => handleDeleteConfig(name)} className="icon icon-delete" title="Delete">
                                            Delete
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {/* Initial Loading Indicator */} 
            {statusType === 'loading' && phase === 'unknown' && (
                <div className="status status-loading">{statusMessage}</div>
            )}

            {/* Setup Phase Content */} 
            {phase === 'setup' && (
                <div id="setup-phase-content">
                    <h4>EHR Tool Provider Setup</h4>
                    <div className={`status status-${statusType}`} style={{ margin: '1em 0' }}>{statusMessage}</div>

                    {/* Permission Grant Section */} 
                    {(activationStatus === 'idle' || activationStatus === 'failed') && permissionState === 'prompt' && (
                        <button 
                            onClick={handleGrantAccessClick} 
                            className="icon icon-grant"
                        >
                            Grant Storage Access
                        </button>
                    )}
                     {activationStatus === 'activating' && (
                        <span>Requesting access... Please follow browser prompts.</span>
                    )}
                     {/* No specific message needed for activated state here, config UI shows */} 
                     {/* Message for denied/unrecoverable failed state is handled by the main status div */} 

                    {/* Configuration Input Section */} 
                    {isConfigUIEnabled && (
                         <div className="load-options">
                            <h5>Load Data and Auto-Save Configuration</h5>
                             {/* Config Name Input REMOVED */}
                             {/* Note about auto-name REMOVED */}

                             {/* File Input */} 
                             <div>
                                 <label htmlFor="ehr-file">1. Upload EHR Data File (.zip or .json): </label>
                                 <input
                                     type="file"
                                     id="ehr-file"
                                     ref={fileInputRef}
                                     accept=".zip,application/zip,.json,application/json"
                                     onChange={handleFileChange}
                                     disabled={isConnecting || statusType === 'loading'}
                                 />
                             </div>

                             {/* OR Separator */} 
                            <div className="separator">- OR -</div>

                             {/* Connect to Live EHR Button */} 
                             <div>
                                 <label htmlFor="connect-ehr-btn">2. Connect to Live EHR: </label>
                                 <button
                                    id="connect-ehr-btn"
                                    onClick={handleConnectEhrClick}
                                    disabled={isConnecting || statusType === 'loading'}
                                    className="icon icon-connect"
                                 >
                                     {isConnecting ? 'Waiting...' : 'Connect to EHR Provider'}
                                 </button>
                            </div>
                         </div>
                     )}

                    {/* Setup Actions Area */} 
                    <div className="setup-actions">
                        {showAbortButton && (
                            <button onClick={handleAbortClick} className="icon icon-abort">
                                Abort Setup
                            </button>
                        )}
                        {isConfigUIEnabled && (
                             <button 
                                onClick={handleDoneClick} 
                                disabled={statusType === 'loading'} // Disable while saving
                                className="icon icon-done"
                                title="Finish Setup"
                             >
                                Done (Close Setup)
                             </button> 
                        )}
                    </div>
                 </div>
            )}

            {/* Transport Phase Content */} 
            {phase === 'transport' && (
                 <div id="transport-section">
                     <div className={`status status-${statusType}`} style={{ marginBottom: '1em' }}>{statusMessage}</div>
                     <p>Current Configuration: <strong>{currentConfigName || 'Loading...'}</strong></p>
                 </div>
            )}

        </div>
    );
};

export default EhrMcpTool; 
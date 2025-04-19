import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
// Adjust import if FullEHR is a default export
// import { FullEHR } from '../EhrApp'; 
import type {FullEHR} from '../EhrApp'; // Assuming it's a default export
import { mockEhrData, getPatientName } from '../mockEhrData';

// --- Constants for Local Storage ---
const LS_PATIENT_NAMES_KEY = 'ehrPatientNames';
const LS_ACTIVE_PATIENT_KEY = 'ehrActivePatientName';
const LS_PATIENT_DATA_PREFIX = 'ehrData_';
const MOCK_PATIENT_NAME = "Mock Patient"; // Consistent name for the mock data

// --- Helper Functions ---
// Function to safely parse JSON from Local Storage
const safeJsonParse = <T,>(jsonString: string | null): T | null => {
    if (!jsonString) return null;
    try {
        return JSON.parse(jsonString) as T;
    } catch (e) {
        console.error("Error parsing JSON from Local Storage:", e);
        return null;
    }
};

// --- Context Definition ---
export interface EhrContextValue {
    ehrData: FullEHR | null;
    activePatientName: string | null;
    availablePatientNames: string[];
    isLoading: boolean;
    error: string | null;
    loadAndStoreEhr: (identifier: string, ehrData: FullEHR) => Promise<void>;
    setActivePatient: (patientName: string) => Promise<void>;
    deletePatient: (patientName: string) => Promise<void>;
    saveOrUpdateResource: (resource: any) => Promise<void>;
    isFileLoadRequested: boolean;
    requestFileLoad: () => void;
    clearFileLoadRequest: () => void;
}

const EhrContext = createContext<EhrContextValue | null>(null);

// --- Provider Implementation ---
export const EhrProvider: React.FC<{ children?: ReactNode }> = ({ children }) => {
    const [ehrData, setEhrData] = useState<FullEHR | null>(null);
    const [activePatientName, setActivePatientName] = useState<string | null>(null);
    const [availablePatientNames, setAvailablePatientNames] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isFileLoadRequested, setIsFileLoadRequested] = useState<boolean>(false);

    // --- Initialization Effect (runs once on mount) ---
    useEffect(() => {
        setIsLoading(true);
        setError(null);
        try {
            // 1. Load available patient names (excluding Mock initially)
            const storedNamesJson = localStorage.getItem(LS_PATIENT_NAMES_KEY);
            const storedNames = safeJsonParse<string[]>(storedNamesJson) || [];
            // Always include Mock Patient at the start
            const names = [MOCK_PATIENT_NAME, ...storedNames.filter(name => name !== MOCK_PATIENT_NAME)];
            setAvailablePatientNames(names);

            // 2. Load last active patient or default to Mock
            const lastActiveName = localStorage.getItem(LS_ACTIVE_PATIENT_KEY);
            let nameToLoad = (lastActiveName && names.includes(lastActiveName)) ? lastActiveName : MOCK_PATIENT_NAME;

            // 3. Load EHR data
            if (nameToLoad === MOCK_PATIENT_NAME) {
                 console.log("[EhrContext Init] Loading Mock Patient data directly.");
                setEhrData(mockEhrData); // Load directly from import
                setActivePatientName(MOCK_PATIENT_NAME);
                localStorage.setItem(LS_ACTIVE_PATIENT_KEY, MOCK_PATIENT_NAME); // Ensure active key is set
            } else {
                // Load from local storage for non-mock patients
                console.log(`[EhrContext Init] Loading patient "${nameToLoad}" from local storage.`);
                const dataKey = `${LS_PATIENT_DATA_PREFIX}${nameToLoad}`;
                const storedEhrJson = localStorage.getItem(dataKey);
                const loadedEhr = safeJsonParse<FullEHR>(storedEhrJson);

                if (loadedEhr) {
                    setEhrData(loadedEhr);
                    setActivePatientName(nameToLoad);
                    localStorage.setItem(LS_ACTIVE_PATIENT_KEY, nameToLoad);
                } else {
                    // Handle case where data for the stored name is missing
                    console.warn(`[EhrContext Init] Could not find data for patient: "${nameToLoad}". Defaulting to Mock.`);
                    setError(`Data for ${nameToLoad} not found. Loading Mock Patient.`);
                    setEhrData(mockEhrData); // Load mock data directly
                    setActivePatientName(MOCK_PATIENT_NAME);
                    localStorage.setItem(LS_ACTIVE_PATIENT_KEY, MOCK_PATIENT_NAME);
                     // Update names list to remove the missing patient
                     const updatedNames = names.filter(n => n === MOCK_PATIENT_NAME || localStorage.getItem(`${LS_PATIENT_DATA_PREFIX}${n}`));
                     setAvailablePatientNames(updatedNames);
                     localStorage.setItem(LS_PATIENT_NAMES_KEY, JSON.stringify(updatedNames.filter(n => n !== MOCK_PATIENT_NAME))); // Store only non-mock names
                }
            }
        } catch (err: any) {
            console.error("[EhrContext Init] Initialization error:", err);
            setError(`Initialization failed: ${err.message || 'Unknown error'}. Loading Mock Patient.`);
            // Fallback to Mock data on any init error
            setEhrData(mockEhrData);
            setActivePatientName(MOCK_PATIENT_NAME);
            setAvailablePatientNames([MOCK_PATIENT_NAME]); // Only show Mock if init fails badly
            localStorage.setItem(LS_ACTIVE_PATIENT_KEY, MOCK_PATIENT_NAME);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // --- Core Functions ---

    const setActivePatient = useCallback(async (patientName: string) => {
        setIsLoading(true);
        setError(null);
        console.log(`[EhrContext] Attempting to set active patient: "${patientName}"`);
        try {
            // --- Special handling for Mock Patient ---
            if (patientName === MOCK_PATIENT_NAME) {
                console.log(`[EhrContext] Loading Mock Patient data directly.`);
                setEhrData(mockEhrData); // Load from import
                setActivePatientName(MOCK_PATIENT_NAME);
                localStorage.setItem(LS_ACTIVE_PATIENT_KEY, MOCK_PATIENT_NAME);
                setIsLoading(false); // Set loading false for mock patient
                return; // Exit early
            }
            // --- End Special Handling ---

            // --- Logic for non-mock patients ---
            const dataKey = `${LS_PATIENT_DATA_PREFIX}${patientName}`;
            console.log(`[EhrContext] Using local storage key: "${dataKey}"`);
            const storedEhrJson = localStorage.getItem(dataKey);

            if (!storedEhrJson) {
                 console.warn(`[EhrContext] No data found in local storage for key: "${dataKey}"`);
                 throw new Error(`Patient data not found in local storage for: ${patientName}`);
            }

            const loadedEhr = safeJsonParse<FullEHR>(storedEhrJson);
            console.log(`[EhrContext] Parsed EHR data from local storage (null if failed):`, loadedEhr ? 'Data found' : null); // Simplified log

             // Check availability *after* trying to load
            if (!availablePatientNames.includes(patientName)) {
                 console.warn(`[EhrContext] Patient name "${patientName}" not found in availablePatientNames list.`);
                 if (!loadedEhr) { // Only error if data load ALSO failed
                     throw new Error(`Patient name "${patientName}" not in available list and data missing/corrupt.`);
                 }
                 // If data loaded OK, but name wasn't in list, add it now
                 else {
                     console.log(`[EhrContext] Adding missing patient name "${patientName}" back to list.`);
                     setAvailablePatientNames(prev => {
                         const newSet = new Set([...prev.filter(n => n !== MOCK_PATIENT_NAME), patientName]);
                         const updatedNames = [MOCK_PATIENT_NAME, ...Array.from(newSet)];
                         localStorage.setItem(LS_PATIENT_NAMES_KEY, JSON.stringify(Array.from(newSet))); // Store only non-mock
                         return updatedNames;
                     });
                 }
            }

            if (loadedEhr) {
                console.log(`[EhrContext] Successfully loaded data for "${patientName}". Updating state.`);
                setEhrData(loadedEhr);
                setActivePatientName(patientName);
                localStorage.setItem(LS_ACTIVE_PATIENT_KEY, patientName);
            } else {
                console.error(`[EhrContext] Failed to parse data from local storage for key: "${dataKey}".`);
                throw new Error(`Failed to parse stored data for patient: ${patientName}`);
            }
        } catch (err: any) {
            console.error(`[EhrContext] Error setting active patient "${patientName}":`, err);
            setError(`Failed to load patient ${patientName}: ${err.message || 'Unknown error'}`);
            // Fallback to Mock Patient on error?
             console.log('[EhrContext] Falling back to Mock Patient due to error.');
             setEhrData(mockEhrData);
             setActivePatientName(MOCK_PATIENT_NAME);
             localStorage.setItem(LS_ACTIVE_PATIENT_KEY, MOCK_PATIENT_NAME);
        } finally {
            // Only set loading false here if it wasn't the mock patient case (which sets it earlier)
             if (patientName !== MOCK_PATIENT_NAME) {
                console.log(`[EhrContext] Setting isLoading to false for non-mock patient "${patientName}".`);
                setIsLoading(false);
            } else {
                 console.log(`[EhrContext] isLoading already set to false for mock patient.`);
            }
        }
    }, [availablePatientNames]); // Add availablePatientNames back as dependency

    const loadAndStoreEhr = useCallback(async (identifier: string, newEhrData: FullEHR) => {
        setIsLoading(true);
        setError(null);
        try {
            const patientName = getPatientName(newEhrData);
            if (!patientName || patientName === "Unknown") {
                 throw new Error("Could not extract a valid patient name from the loaded data.");
            }
            if (patientName === MOCK_PATIENT_NAME) {
                 throw new Error(`Cannot overwrite "${MOCK_PATIENT_NAME}" data.`);
            }

            console.log(`Loading and storing data for: ${patientName} (Identifier: ${identifier})`);

            const dataKey = `${LS_PATIENT_DATA_PREFIX}${patientName}`;
            localStorage.setItem(dataKey, JSON.stringify(newEhrData));

            // Update names list if new (filter out Mock just in case)
            setAvailablePatientNames(prev => {
                 const otherNames = prev.filter(n => n !== MOCK_PATIENT_NAME);
                 const newSet = new Set([patientName, ...otherNames]);
                 const updatedNames = [MOCK_PATIENT_NAME, ...Array.from(newSet)];
                 localStorage.setItem(LS_PATIENT_NAMES_KEY, JSON.stringify(Array.from(newSet))); // Store only non-mock
                 return updatedNames;
            });

            // Set as active
            setEhrData(newEhrData);
            setActivePatientName(patientName);
            localStorage.setItem(LS_ACTIVE_PATIENT_KEY, patientName);

        } catch (err: any) {
            console.error(`Error loading/storing EHR for ${identifier}:`, err);
            setError(`Failed to load data for ${identifier}: ${err.message || 'Unknown error'}`);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const deletePatient = useCallback(async (patientName: string) => {
        if (patientName === MOCK_PATIENT_NAME) {
            console.warn("Cannot delete the Mock Patient.");
            setError("Cannot delete the Mock Patient.");
            return;
        }
        setIsLoading(true); // Set loading true while deleting/switching
        setError(null);
        console.log(`Attempting to delete patient: ${patientName}`);
        try {
            localStorage.removeItem(`${LS_PATIENT_DATA_PREFIX}${patientName}`);
             // Update available names state and storage
            setAvailablePatientNames(prev => {
                const updatedNames = prev.filter(name => name !== patientName);
                const storedNames = updatedNames.filter(n => n !== MOCK_PATIENT_NAME);
                 localStorage.setItem(LS_PATIENT_NAMES_KEY, JSON.stringify(storedNames));
                return updatedNames;
            });

            // If the deleted patient was active, switch to Mock
             if (activePatientName === patientName) {
                 console.log(`Deleted active patient ${patientName}, switching to ${MOCK_PATIENT_NAME}`);
                 // Directly set mock data and active name, update storage
                 setEhrData(mockEhrData);
                 setActivePatientName(MOCK_PATIENT_NAME);
                 localStorage.setItem(LS_ACTIVE_PATIENT_KEY, MOCK_PATIENT_NAME);
            }
            // No need for await setActivePatient(MOCK_PATIENT_NAME) here

        } catch (err: any) {
            console.error(`Error deleting patient ${patientName}:`, err);
            setError(`Failed to delete patient ${patientName}: ${err.message || 'Unknown error'}`);
        } finally {
            setIsLoading(false); // Set loading false after operation finishes
        }
    }, [activePatientName]);

    // --- ADD saveOrUpdateResource function ---
    const saveOrUpdateResource = useCallback(async (resource: any) => {
        // --- Special Case: Don't save changes for Mock Patient ---
         if (activePatientName === MOCK_PATIENT_NAME) {
            console.warn("Changes to Mock Patient are not saved.");
            setError("Changes to Mock Patient are temporary and not saved.");
            // Optionally show a temporary success message?
            // Or just update the state visually without persisting?
            // For now, just prevent saving and log/set error.
            return;
         }
         // --- End Special Case ---

        if (!activePatientName || !ehrData) {
             setError("No active patient selected. Cannot save resource.");
             console.error("saveOrUpdateResource error: No active patient or data");
             return;
        }
        if (!resource || !resource.resourceType || !resource.id) {
             setError("Invalid resource provided. Cannot save.");
             console.error("saveOrUpdateResource error: Invalid resource structure", resource);
             return;
        }

        setIsLoading(true);
        setError(null);
        console.log(`Saving/Updating resource ${resource.resourceType}/${resource.id} for patient ${activePatientName}`);

        try {
            // Clone deeply to avoid mutation issues if we were modifying nested objects
            const updatedEhrData = JSON.parse(JSON.stringify(ehrData));
            const resourceType = resource.resourceType;

            if (!updatedEhrData.fhir[resourceType]) {
                updatedEhrData.fhir[resourceType] = [];
            }

            const existingIndex = updatedEhrData.fhir[resourceType].findIndex((r: any) => r.id === resource.id);

            if (existingIndex >= 0) {
                updatedEhrData.fhir[resourceType][existingIndex] = resource;
            } else {
                updatedEhrData.fhir[resourceType].push(resource);
            }

            const dataKey = `${LS_PATIENT_DATA_PREFIX}${activePatientName}`;
            localStorage.setItem(dataKey, JSON.stringify(updatedEhrData));
            setEhrData(updatedEhrData);

        } catch (err: any) {
            console.error(`Error saving resource ${resource.resourceType}/${resource.id}:`, err);
            setError(`Failed to save resource: ${err.message || 'Unknown error'}`);
        } finally {
            setIsLoading(false);
        }
    }, [activePatientName, ehrData]);

    // --- NEW File Load Request Functions ---
    const requestFileLoad = useCallback(() => {
        console.log("[EhrContext] File load requested.");
        setIsFileLoadRequested(true);
    }, []);

    const clearFileLoadRequest = useCallback(() => {
        console.log("[EhrContext] Clearing file load request flag.");
        setIsFileLoadRequested(false);
    }, []);

    // --- Context Value ---
    const value: EhrContextValue = useMemo(() => ({
        ehrData,
        activePatientName,
        availablePatientNames,
        isLoading,
        error,
        loadAndStoreEhr,
        setActivePatient,
        deletePatient,
        saveOrUpdateResource,
        isFileLoadRequested,
        requestFileLoad,
        clearFileLoadRequest,
    }), [
        ehrData, activePatientName, availablePatientNames, isLoading, error,
        loadAndStoreEhr, setActivePatient, deletePatient, saveOrUpdateResource,
        isFileLoadRequested, requestFileLoad, clearFileLoadRequest
    ]);

    // --- Message Handler Effect ---
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            // IMPORTANT: Validate the origin!
            // Use a more specific origin or list of allowed origins in production
            const allowedOrigin = "https://mcp.fhir.me"; // Or dynamically configure
            if (event.origin !== allowedOrigin) {
                console.warn(`Ignoring message from unexpected origin: ${event.origin}`);
                return;
            }

            const receivedData = event.data;

            // Basic validation (improve as needed)
            if (receivedData && typeof receivedData === 'object' && receivedData.fhir && receivedData.attachments) {
                 console.log("Received patient data via postMessage:", receivedData);
                 try {
                    const patientResource = (receivedData.fhir?.Patient || [])[0];
                    // Generate a name: Use official name, or fallback if missing
                    let name = "Loaded via EHR Connect"; // Default
                    if (patientResource?.name?.[0]) {
                        const given = patientResource.name[0].given?.join(' ') || '';
                        const family = patientResource.name[0].family || '';
                        name = `${given} ${family}`.trim();
                        if (!name) { // If both are empty, fallback to identifier
                            name = `Patient/${patientResource.id || 'UnknownID'}`;
                        }
                    } else if (patientResource?.id) {
                         name = `Patient/${patientResource.id}`;
                    }

                    // *** Use loadAndStoreEhr instead of loadPatientData ***
                    loadAndStoreEhr(name, receivedData as FullEHR); // Use derived name as identifier

                 } catch (e: any) { // Catch potential errors from name extraction or loadAndStoreEhr
                      console.error("Error processing received patient data:", e);
                      setError(`Failed to process data received from EHR Connect: ${e?.message || 'Unknown error'}`); // Update context state
                 }
            } else {
                 console.warn("Received non-EHR data via postMessage:", receivedData);
            }
        };

        window.addEventListener('message', handleMessage);

        // Cleanup listener on component unmount
        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, [loadAndStoreEhr, setError]); // Ensure loadAndStoreEhr is in dependency array

    return (
        <EhrContext.Provider value={value}>
            {children}
        </EhrContext.Provider>
    );
};

// --- Hook to Use Context ---
export function useEhrContext(): EhrContextValue {
    const context = useContext(EhrContext);
    if (!context) {
        throw new Error('useEhrContext must be used within an EhrProvider');
    }
    return context;
} 
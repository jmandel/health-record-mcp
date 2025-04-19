import React, { useState, useMemo, useCallback, useRef, Fragment, useEffect } from 'react';
import { EhrProvider, useEhrContext } from './context/EhrContext';
// Remove clientTypes import here if types are defined below
// import { FullEHR, ProcessedAttachment } from './clientTypes';

// Import actual components directly
import PatientHeader from './components/ehr/PatientHeader';
import TabsComponent from './components/ehr/Tabs';
import DemographicsTab from './components/ehr/DemographicsTab';
import MedicationsTab from './components/ehr/MedicationsTab';
import LabsTab from './components/ehr/LabsTab';
import ImagingTab from './components/ehr/ImagingTab';
import NotesTab from './components/ehr/NotesTab';
import OrderEntryTab from './components/ehr/OrderEntryTab';
import BillingTab from './components/ehr/BillingTab';
import TasksTab from './components/ehr/TasksTab';
import Orders2Tab from './components/ehr/Orders2Tab';
import { PatientSwitcherDropdown } from './components/PatientSwitcherDropdown';

// Define and EXPORT types here (as planned before)
export interface ProcessedAttachment {
    resourceType: string;
    resourceId: string;
    path: string;
    contentType: string;
    json: string;
    contentPlaintext: string | null;
}

export interface FullEHR {
    fhir: Record<string, any[]>;
    attachments: ProcessedAttachment[];
}

// REMOVE Mock EHR Data - Handled by Provider

// --- Main App Component Structure ---

// Define Tab Structure
type TabName = 'Demographics' | 'Medications' | 'Lab Results' | 'Imaging' | 'Notes' | 'Order Entry' | 'Tasks' | 'Orders' | 'Billing';
interface TabConfig {
    id: TabName;
    label: string;
}
const TABS_CONFIG: TabConfig[] = [ // Use TABS_CONFIG consistently
    { id: 'Demographics', label: 'Demographics' },
    { id: 'Medications', label: 'Medications' },
    { id: 'Lab Results', label: 'Lab Results' },
    { id: 'Imaging', label: 'Imaging' },
    { id: 'Notes', label: 'Notes' },
    { id: 'Order Entry', label: 'Order Entry' }, // This likely needs context too
    { id: 'Orders', label: 'Orders (AI)' }, // Renamed ID and Label
    { id: 'Tasks', label: 'Tasks' }, // This likely needs context too
    { id: 'Billing', label: 'Billing' }, // This likely needs context too
];

// Content mapping - no longer needs lazy
const tabContent: Record<TabName, React.ReactNode> = {
    Demographics: <DemographicsTab />,
    Medications: <MedicationsTab />,
    "Lab Results": <LabsTab />,
    Imaging: <ImagingTab />,
    Notes: <NotesTab />,
    "Order Entry": <OrderEntryTab />,
    Billing: <BillingTab />,
    Tasks: <TasksTab />,
    Orders: <Orders2Tab />, // Updated key, keep component for now
};

// Main App Component that uses the context
function EhrAppContent() {
    // Get context values
    const {
        ehrData, isLoading, error, loadAndStoreEhr, activePatientName,
        isFileLoadRequested, clearFileLoadRequest // NEW context values
    } = useEhrContext();
    const [activeTab, setActiveTab] = useState<TabName>('Demographics');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fileLoadError, setFileLoadError] = useState<string | null>(null);

    // Handler for file input changes
    const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files ? event.target.files[0] : null;
        if (file) {
            setFileLoadError(null);
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const text = e.target?.result;
                    if (typeof text !== 'string') throw new Error('Failed to read file content.');
                    const jsonData: FullEHR = JSON.parse(text);
                    // Basic validation
                    if (!jsonData.fhir || typeof jsonData.fhir !== 'object' || !jsonData.attachments || !Array.isArray(jsonData.attachments)) {
                         throw new Error('Invalid FullEHR structure.');
                    }
                    // Use context function to load/store
                    await loadAndStoreEhr(file.name, jsonData);
                     setActiveTab('Demographics'); // Switch to demo tab on new patient load
                } catch (err: any) {
                    console.error("Error processing file:", err);
                    setFileLoadError(`Error processing ${file.name}: ${err.message}`);
                }
            };
            reader.onerror = (e) => {
                 console.error("File reading error:", e);
                 setFileLoadError(`Error reading file ${file.name}.`);
            };
            reader.readAsText(file);
        }
         if (fileInputRef.current) fileInputRef.current.value = ""; // Reset input
    }, [loadAndStoreEhr]);

    // Wrapper for tab change to satisfy TabsComponent prop type
    // Trigger hidden file input
    const triggerFileInput = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    // Wrapper for tab change to satisfy TabsComponent prop type
    const handleTabChange = useCallback((tabId: string) => {
        if (TABS_CONFIG.some(tab => tab.id === tabId)) {
            setActiveTab(tabId as TabName);
        }
    }, []);

    // NEW Effect to trigger file input when requested by context
    useEffect(() => {
      if (isFileLoadRequested && fileInputRef.current) {
        console.log("Effect triggered: Requesting file input click.");
        fileInputRef.current.click();
        clearFileLoadRequest(); // Reset the request state immediately after triggering
      }
    }, [isFileLoadRequested, clearFileLoadRequest]);

    // Determine patient name for header
    // ... patientNameForHeader ... // Not strictly needed with this structure restoration

    return (
        <div className="ehr-app">
            <header className="ehr-header">
                {/* Inner container constrained by max-width */}
                <div className="header-inner">
                    {/* Remove header-top-row, place PatientHeader and actions side-by-side */}
                    {/* Patient Header on the left */}
                    <div className="patient-header-container">
                        {isLoading ? (
                            <p>Loading Patient Banner...</p>
                        ) : ehrData ? (
                            <PatientHeader patient={ehrData.fhir.Patient?.[0]} />
                        ) : (
                            <p>No Patient Loaded</p>
                        )}
                    </div>
                    {/* Actions on the right */}
                    <div className="header-actions">
                        <PatientSwitcherDropdown />
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                            accept=".json"
                        />
                    </div>
                </div>
            </header>

            {/* This container wraps the content BELOW the header */}
            <div className="main-content-container">
                <nav className="tabs">
                    {isLoading ? (
                        <p>Loading Tabs...</p>
                    ) : ehrData ? (
                        <TabsComponent
                            tabs={TABS_CONFIG}
                            activeTab={activeTab}
                            onTabChange={handleTabChange}
                        />
                    ) : (
                        <p>No Patient Loaded</p>
                    )}
                </nav>

                <div className="content">
                    {fileLoadError && (
                        <div className="error-display file-error"><p>File Load Error:</p><p>{fileLoadError}</p></div>
                    )}
                    {error && !fileLoadError && (
                        <div className="error-display system-error"><p>System Error:</p><p>{error}</p></div>
                    )}

                    {isLoading ? (
                        <p className="loading-message">Loading Content...</p>
                    ) : ehrData ? (
                        tabContent[activeTab]
                    ) : !fileLoadError && !error ? (
                        <p className="no-data-message">No Patient Data Loaded</p>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

// Wrap the main content with the Provider
function EhrApp() {
    return (
         <EhrProvider>
            <EhrAppContent />
         </EhrProvider>
    );
}

export default EhrApp; 
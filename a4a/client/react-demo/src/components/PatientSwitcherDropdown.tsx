import React, { useState, useRef, useEffect } from 'react';
import { useEhrContext } from '../context/EhrContext';
import { GearIcon, TrashIcon, UploadIcon, Link2Icon } from '@radix-ui/react-icons'; // Added more icons

const MOCK_PATIENT_NAME = "Mock Patient"; // Consider getting this from context if it changes

export const PatientSwitcherDropdown: React.FC = () => {
    const {
        activePatientName,
        availablePatientNames,
        setActivePatient,
        deletePatient,
        requestFileLoad, // NEW context function
        isLoading,
        error
    } = useEhrContext();

    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown if clicked outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleSelectPatient = async (name: string) => {
        if (name !== activePatientName && !isLoading) {
            setIsOpen(false);
            await setActivePatient(name); // setActivePatient should handle loading state
        }
    };

    const handleDeletePatient = async (name: string, event: React.MouseEvent) => {
        event.stopPropagation(); // Prevent dropdown closing
        if (name === MOCK_PATIENT_NAME) {
            alert("Cannot delete the Mock Patient.");
            return;
        }
        if (!isLoading && window.confirm(`Are you sure you want to delete patient data for "${name}"? This cannot be undone.`)) {
            // No need to close dropdown here, deletePatient might trigger context update
            await deletePatient(name);
        }
    };

    const handleLoadFromJsonClick = () => {
        setIsOpen(false);
        requestFileLoad(); // NEW: Call context function to signal request
    };

    const handleLoadViaOAuth = () => {
        setIsOpen(false);
        const targetOrigin = window.location.origin;
        // Ensure origin is valid (basic check, might need more robust validation)
        if (!targetOrigin || targetOrigin === 'null') {
             console.error("Cannot determine window origin for OAuth callback.");
             alert("Error: Could not determine the application's origin for the EHR connection.");
             return;
        }
        const authUrl = `https://mcp.fhir.me/ehr-connect#deliver-to-opener:${targetOrigin}`;
        console.log("Opening EHR Connect:", authUrl);
        window.open(authUrl, '_blank', 'width=800,height=700,resizable=yes,scrollbars=yes');
        // The actual data loading will happen when the main window receives the postMessage event
    };


    // Sort names, keeping Mock Patient first if present
    const sortedNames = [...availablePatientNames].sort((a, b) => {
        if (a === MOCK_PATIENT_NAME) return -1;
        if (b === MOCK_PATIENT_NAME) return 1;
        return a.localeCompare(b);
    });

    return (
        <div className="patient-switcher-dropdown" ref={dropdownRef}>
            <div>
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    disabled={isLoading && !isOpen} // Allow opening even if loading, but maybe not other actions
                    className={`dropdown-toggle-button ${isLoading ? 'loading' : ''}`}
                    aria-haspopup="true"
                    aria-expanded={isOpen}
                >
                    <GearIcon className={`gear-icon ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
                    <span className="active-patient-name">{activePatientName || 'No Patient Selected'}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="dropdown-chevron">
                      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.23 8.29a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>

            {isOpen && (
                <div
                    className="dropdown-menu"
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="menu-button"
                >
                    <div className="dropdown-section select-patient-section" role="none">
                        <p className="dropdown-section-header">Select Patient</p>
                        {sortedNames.length > 0 ? sortedNames.map((name) => (
                            <div
                                key={name}
                                className={`menu-item patient-menu-item ${activePatientName === name ? 'active' : ''}`}
                                onClick={() => handleSelectPatient(name)}
                                role="menuitem"
                            >
                                <span className="patient-name-text">{name}</span>
                                {name !== MOCK_PATIENT_NAME && (
                                    <button
                                        onClick={(e) => handleDeletePatient(name, e)}
                                        disabled={isLoading}
                                        className="delete-patient-button"
                                        title={`Delete ${name}`}
                                        aria-label={`Delete ${name}`}
                                    >
                                        <TrashIcon className="icon" />
                                    </button>
                                )}
                            </div>
                        )) : (
                            <p className="menu-item-placeholder">No patients loaded.</p>
                         )}
                    </div>

                    <div className="dropdown-section load-patient-section" role="none">
                        <p className="dropdown-section-header">Load New Patient</p>
                        <button
                            onClick={handleLoadFromJsonClick}
                            disabled={isLoading}
                            className="menu-item action-menu-item"
                            role="menuitem"
                        >
                            <UploadIcon className="icon" aria-hidden="true" />
                            Load from JSON File...
                        </button>
                        <button
                            onClick={handleLoadViaOAuth}
                            disabled={isLoading}
                            className="menu-item action-menu-item"
                            role="menuitem"
                        >
                            <Link2Icon className="icon" aria-hidden="true" />
                            Load from EHR Connect...
                        </button>
                    </div>

                    {(isLoading || error) && (
                        <div className="dropdown-section status-section">
                            {isLoading && <p className="status-loading"><span className="spinner"></span>Loading...</p>}
                            {error && <p className="status-error">Error: {error}</p>}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}; 
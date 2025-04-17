import React from 'react';

interface PatientHeaderProps {
    patient: any; // Replace 'any' with a proper Patient FHIR type if available
}

const PatientHeader: React.FC<PatientHeaderProps> = ({ patient }) => {
    if (!patient) {
        return <div className="patient-info">Loading patient data...</div>;
    }

    const name = patient.name?.[0];
    const displayName = name ? `${name.given?.join(' ') || ''} ${name.family || ''}`.trim() : 'Unknown Patient';

    return (
        <div className="patient-info">
            <h1>{displayName}</h1>
            <p>
                MRN: {patient.id || 'N/A'} &nbsp;|&nbsp;
                DOB: {patient.birthDate || 'N/A'} &nbsp;|&nbsp;
                Gender: {patient.gender || 'N/A'}
            </p>
        </div>
    );
};

export default PatientHeader; 
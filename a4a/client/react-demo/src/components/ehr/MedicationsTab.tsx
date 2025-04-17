import React from 'react';

interface MedicationsTabProps {
    medicationRequests: any[]; // Replace 'any' with a proper MedicationRequest/Statement FHIR type
}

const MedicationsTab: React.FC<MedicationsTabProps> = ({ medicationRequests }) => {
    return (
        <div id="medications" className="tab-content active">
            <h2>Medications</h2>
            <table>
                <thead>
                    <tr><th>Medication</th><th>Dose/Instruction</th><th>Status</th></tr>
                </thead>
                <tbody>
                    {medicationRequests?.length > 0 ? (
                        medicationRequests.map((med, index) => (
                            <tr key={med.id || index}>
                                <td>{med.medicationCodeableConcept?.text || 'N/A'}</td>
                                <td>{med.dosageInstruction?.[0]?.text || 'N/A'}</td>
                                <td>{med.status || 'N/A'}</td>
                            </tr>
                        ))
                    ) : (
                        <tr><td colSpan={3}>No medication data available.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default MedicationsTab; 
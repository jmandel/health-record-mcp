import React from 'react';
import { useEhrContext } from '../../context/EhrContext'; // Import hook

// Remove props interface
// interface MedicationsTabProps {
//     medicationRequests: any[]; // Replace 'any' with a proper MedicationRequest/Statement FHIR type
// }

// Remove props from signature
const MedicationsTab: React.FC = () => {
    const { ehrData, isLoading } = useEhrContext(); // Get data from context

    if (isLoading) return <p>Loading Medication Data...</p>;

    // Extract both requests and statements from context data
    const medicationRequests = ehrData?.fhir?.MedicationRequest || [];
    const medicationStatements = ehrData?.fhir?.MedicationStatement || [];

    // Combine or process as needed - here we just concatenate for simplicity
    // Add a type field to distinguish them if needed for display logic
    const allMedications = [
        ...medicationRequests.map((req: any) => ({ ...req, type: 'Request' })),
        ...medicationStatements.map((stmt: any) => ({ ...stmt, type: 'Statement' }))
    ];

    // Simple sorting (e.g., by status, then name) - adjust as needed
    allMedications.sort((a: any, b: any) => {
        const statusOrder = { 'active': 1, 'on-hold': 2, 'stopped': 3, 'completed': 4, 'entered-in-error': 5, 'draft': 6, 'unknown': 7 };
        const statusA = (statusOrder[a.status as keyof typeof statusOrder] || 99);
        const statusB = (statusOrder[b.status as keyof typeof statusOrder] || 99);
        if (statusA !== statusB) return statusA - statusB;
        const nameA = a.medicationCodeableConcept?.text || '';
        const nameB = b.medicationCodeableConcept?.text || '';
        return nameA.localeCompare(nameB);
    });

    return (
        // Restore id and original class
        <div id="medications" className="tab-content">
            <h2>Medications (Active & Past)</h2>
            <div>
                 <table>
                    <thead>
                        <tr>
                             <th>Medication</th>
                             <th>Details/Dosage</th>
                             <th>Status</th>
                             <th>Type</th>
                             <th>Notes/Reason</th>
                        </tr>
                    </thead>
                    <tbody>
                        {allMedications.length > 0 ? (
                            allMedications.map((med: any, index) => (
                                <tr key={med.id || index}>
                                    <td>{med.medicationCodeableConcept?.text || 'N/A'}</td>
                                    {/* Display dosage differently for request vs statement */}
                                     <td>{med.dosageInstruction?.[0]?.text || med.dosage?.[0]?.text || 'N/A'}</td>
                                    <td>
                                        <span>
                                             {med.status || 'N/A'}
                                         </span>
                                    </td>
                                    <td>{med.type || 'N/A'}</td>
                                     <td>{med.note?.[0]?.text || med.reasonCode?.[0]?.text || med.reasonCode?.[0]?.coding?.[0]?.display || ''}</td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={5}>No medication data available.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default MedicationsTab; 
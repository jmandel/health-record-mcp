import React from 'react';

interface DemographicsTabProps {
    patient: any; // Replace 'any' with a proper Patient FHIR type if available
}

const DemographicsTab: React.FC<DemographicsTabProps> = ({ patient }) => {
    if (!patient) return <p>Loading...</p>;

    const name = patient.name?.[0];
    const displayName = name ? `${name.given?.join(' ') || ''} ${name.family || ''}`.trim() : 'N/A';
    const phone = patient.telecom?.find((t: any) => t.system === 'phone')?.value || 'N/A';
    const address = patient.address?.[0];
    const displayAddress = address ? `${address.line?.join(', ') || ''}, ${address.city || ''}, ${address.country || ''}` : 'N/A';

    return (
        <div id="demographics" className="tab-content active"> {/* Keep active class for initial render? Or manage outside */}
            <h2>Demographics</h2>
            <table>
                <tbody>
                    <tr><th>Field</th><th>Value</th></tr>
                    <tr><td>Name</td><td>{displayName}</td></tr>
                    <tr><td>MRN</td><td>{patient.id || 'N/A'}</td></tr>
                    <tr><td>Date of Birth</td><td>{patient.birthDate || 'N/A'}</td></tr>
                    <tr><td>Gender</td><td>{patient.gender || 'N/A'}</td></tr>
                    <tr><td>Phone</td><td>{phone}</td></tr>
                    <tr><td>Address</td><td>{displayAddress}</td></tr>
                </tbody>
            </table>
        </div>
    );
};

export default DemographicsTab; 
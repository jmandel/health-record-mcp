import React from 'react';
import { useEhrContext } from '../../context/EhrContext'; // Import the hook

// Remove props interface - data comes from context
// interface DemographicsTabProps {
//     patient: any; // Replace 'any' with a proper Patient FHIR type if available
// }

// Remove props from component signature
const DemographicsTab: React.FC = () => {
    const { ehrData, isLoading } = useEhrContext(); // Get data and loading state from context

    // Handle loading and no data state
    if (isLoading) return <p>Loading Patient Data...</p>;
    if (!ehrData || !ehrData.fhir?.Patient || ehrData.fhir.Patient.length === 0) {
         return <p>No patient data available.</p>;
    }

    // Extract patient from context data
    const patient = ehrData.fhir.Patient[0];

    // Rest of the component logic remains the same
    const name = patient.name?.[0];
    const displayName = name ? `${name.given?.join(' ') || ''} ${name.family || ''}`.trim() : 'N/A';
    // Add type annotation for telecom item
    const phone = patient.telecom?.find((t: { system?: string; value?: string }) => t.system === 'phone')?.value || 'N/A';
    const address = patient.address?.[0];
    const displayAddress = address ? `${address.line?.join(', ') || ''}, ${address.city || ''}, ${address.state || ''} ${address.postalCode || ''}, ${address.country || ''}`.trim().replace(/, $/, '') : 'N/A'; // Improved address formatting

    return (
        // Restore id and original class, remove Tailwind-like classes
        <div id="demographics" className="tab-content">
            <h2>Demographics</h2>
            {/* Remove Tailwind classes from dl and children */}
            <dl>
                <div><dt>Name</dt><dd>{displayName}</dd></div>
                <div><dt>MRN</dt><dd>{patient.id || 'N/A'}</dd></div>
                <div><dt>Date of Birth</dt><dd>{patient.birthDate || 'N/A'}</dd></div>
                <div><dt>Gender</dt><dd>{patient.gender || 'N/A'}</dd></div>
                <div><dt>Phone</dt><dd>{phone}</dd></div>
                <div><dt>Address</dt><dd>{displayAddress}</dd></div>
                 <div><dt>Marital Status</dt><dd>{patient.maritalStatus?.coding?.[0]?.display || patient.maritalStatus?.text || 'N/A'}</dd></div>
                 {patient.contact?.[0] && (
                     <div><dt>Emergency Contact</dt><dd>{`${patient.contact[0].name?.given?.join(' ') || ''} ${patient.contact[0].name?.family || ''}`.trim()} ({patient.contact[0].telecom?.[0]?.value || 'N/A'})</dd></div>
                 )}
            </dl>
        </div>
    );
};

export default DemographicsTab; 
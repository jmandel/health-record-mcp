import React from 'react';
import { useEhrContext } from '../../context/EhrContext'; // Import hook

// Remove props interface
// interface ImagingTabProps {
//     diagnosticReports: any[]; // Replace 'any' with a proper DiagnosticReport FHIR type
// }

// Remove props from signature
const ImagingTab: React.FC = () => {
    const { ehrData, isLoading } = useEhrContext(); // Get data from context

    if (isLoading) return <p>Loading Imaging Data...</p>;

    // Extract DiagnosticReports from context data
    const diagnosticReports = ehrData?.fhir?.DiagnosticReport || [];

     // Sort by date descending
     diagnosticReports.sort((a: any, b: any) => {
         const dateA = a.effectiveDateTime || a.issued || '';
         const dateB = b.effectiveDateTime || b.issued || '';
         return dateB.localeCompare(dateA);
     });

    return (
        // Restore id and original class
        <div id="imaging" className="tab-content">
            <h2>Imaging Studies</h2>
            {diagnosticReports.length > 0 ? (
                <ul>
                    {diagnosticReports.map((report: any, index: number) => (
                        <li key={report.id || index}>
                             <span>
                                {report.code?.text || report.code?.coding?.[0]?.display || 'Unknown Study'} ({report.effectiveDateTime?.substring(0, 10) || report.issued?.substring(0, 10) || 'N/A'})
                             </span>
                             <p>{report.conclusion || 'No conclusion provided.'}</p>
                        </li>
                    ))}
                </ul>
            ) : (
                <p>No imaging data available.</p>
            )}
        </div>
    );
};

export default ImagingTab; 
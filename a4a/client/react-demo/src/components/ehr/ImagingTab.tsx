import React from 'react';

interface ImagingTabProps {
    diagnosticReports: any[]; // Replace 'any' with a proper DiagnosticReport FHIR type
}

const ImagingTab: React.FC<ImagingTabProps> = ({ diagnosticReports }) => {
    return (
        <div id="imaging" className="tab-content active">
            <h2>Imaging Studies</h2>
            {diagnosticReports?.length > 0 ? (
                <ul>
                    {diagnosticReports.map((report, index) => (
                        <li key={report.id || index}>
                            {report.code?.text || 'Unknown Study'} ({report.effectiveDateTime?.substring(0, 10) || 'N/A'})
                            - {report.conclusion || 'No conclusion'}
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
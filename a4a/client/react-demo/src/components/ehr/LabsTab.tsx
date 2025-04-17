import React from 'react';

interface LabsTabProps {
    observations: any[]; // Replace 'any' with a proper Observation FHIR type
}

const LabsTab: React.FC<LabsTabProps> = ({ observations }) => {
    return (
        <div id="labs" className="tab-content active">
            <h2>Lab Results</h2>
            <table>
                <thead>
                    <tr><th>Date</th><th>Test</th><th>Result</th><th>Normal Range</th></tr>
                </thead>
                <tbody>
                    {observations && observations.length > 0 
                        ? observations.map((lab, index) => (
                            <tr key={lab.id || index}>
                                <td>{lab.effectiveDateTime?.substring(0, 10) || 'N/A'}</td>
                                <td>{lab.code?.text || 'N/A'}</td>
                                <td>{lab.valueString || 'N/A'}</td> {/* Simplified */}
                                <td>{lab.referenceRange?.[0]?.text || 'N/A'}</td>
                            </tr>
                          ))
                        : (
                            <tr>
                                <td colSpan={4}>No lab data available.</td>
                            </tr>
                          )
                    }
                </tbody>
            </table>
        </div>
    );
};

export default LabsTab; 
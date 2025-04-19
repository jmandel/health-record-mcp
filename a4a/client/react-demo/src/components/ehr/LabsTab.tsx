import React from 'react';
import { useEhrContext } from '../../context/EhrContext'; // Import hook

// Remove props interface
// interface LabsTabProps {
//     observations: any[]; // Replace 'any' with a proper Observation FHIR type
// }

// Remove props from signature
const LabsTab: React.FC = () => {
    const { ehrData, isLoading } = useEhrContext(); // Get data from context

    if (isLoading) return <p>Loading Lab Data...</p>;

    // Extract Observations from context data
    const observations = ehrData?.fhir?.Observation || [];

    // Optionally filter for only lab results if other observation types exist
    const labObservations = observations.filter(
        (obs: any) => obs.category?.some((cat: any) => cat.coding?.some((c: any) => c.code === 'laboratory'))
    );

     // Sort by date descending
     labObservations.sort((a: any, b: any) => {
         const dateA = a.effectiveDateTime || a.issued || '';
         const dateB = b.effectiveDateTime || b.issued || '';
         return dateB.localeCompare(dateA);
     });

    return (
        // Restore id and original class
        <div id="labs" className="tab-content">
            <h2>Lab Results</h2>
            <div>
                 <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Test</th>
                            <th>Result</th>
                             <th>Interpretation</th>
                            <th>Normal Range</th>
                        </tr>
                    </thead>
                    <tbody>
                        {labObservations.length > 0
                            ? labObservations.map((lab: any, index: number) => (
                                <tr key={lab.id || index}>
                                    <td>{lab.effectiveDateTime?.substring(0, 10) || lab.issued?.substring(0, 10) || 'N/A'}</td>
                                    <td>{lab.code?.text || lab.code?.coding?.[0]?.display || 'N/A'}</td>
                                    {/* Display different value types */}
                                     <td>
                                         {lab.valueQuantity ? `${lab.valueQuantity.value} ${lab.valueQuantity.unit || ''}` :
                                          lab.valueCodeableConcept ? lab.valueCodeableConcept.text || lab.valueCodeableConcept.coding?.[0]?.display :
                                          lab.valueString || lab.valueBoolean !== undefined ? String(lab.valueBoolean) :
                                          lab.valueDateTime ? lab.valueDateTime.substring(0, 10) :
                                          lab.valuePeriod ? `${lab.valuePeriod.start?.substring(0,10)} - ${lab.valuePeriod.end?.substring(0,10)}` :
                                          lab.valueInteger !== undefined ? lab.valueInteger :
                                           (lab.component && lab.component.length > 0) ? '(See components)' :
                                           'N/A'}
                                     </td>
                                     <td>{lab.interpretation?.[0]?.coding?.[0]?.display || lab.interpretation?.[0]?.text || ''}</td>
                                    <td>{lab.referenceRange?.[0]?.text || (lab.referenceRange?.[0]?.low || lab.referenceRange?.[0]?.high ? `${lab.referenceRange[0].low?.value ?? ''} - ${lab.referenceRange[0].high?.value ?? ''} ${lab.referenceRange[0].low?.unit || lab.referenceRange[0].high?.unit || ''}`.trim() : 'N/A')}</td>
                                </tr>
                              ))
                            : (
                                <tr>
                                    <td colSpan={5}>No lab data available.</td>
                                </tr>
                              )
                        }
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default LabsTab; 
import React from 'react';
import { useEhrContext } from '../../context/EhrContext'; // Import hook

// Remove props interface
// interface BillingTabProps { ... }

// Remove props from signature
const BillingTab: React.FC = () => {
    const { ehrData, isLoading } = useEhrContext(); // Get data from context

    if (isLoading) return <p>Loading Billing Data...</p>;

    // Extract relevant resources from context data
    // Assuming single Coverage/Account for simplicity
    const coverage = ehrData?.fhir?.Coverage?.[0]; 
    const accountInfo = ehrData?.fhir?.Account?.[0]; 

    return (
        // Restore id and original class, remove Tailwind-like classes
        <div id="billing" className="tab-content">
            <h2>Billing Information</h2>
            
            {/* Coverage Section - remove internal classes */}
            <div>
                 <h3>Coverage</h3>
                {coverage ? (
                    <dl>
                        <div><dt>Payer</dt><dd>{coverage.payor?.[0]?.display || 'N/A'}</dd></div>
                        <div><dt>Subscriber ID</dt><dd>{coverage.subscriberId || 'N/A'}</dd></div>
                        <div><dt>Type</dt><dd>{coverage.type?.coding?.[0]?.display || coverage.type?.text || 'N/A'}</dd></div>
                        <div><dt>Status</dt><dd>{coverage.status || 'N/A'}</dd></div>
                         <div><dt>Period</dt><dd>{`${coverage.period?.start || 'N/A'} - ${coverage.period?.end || 'Ongoing'}`}</dd></div>
                    </dl>
                ) : (
                    <p>No coverage information found.</p>
                )}
            </div>

            {/* Account/Charges Section - remove internal classes */}
            <div>
                 <h3>Account Details (Simplified)</h3>
                {accountInfo ? (
                    <dl>
                        <div><dt>Account Name</dt><dd>{accountInfo.name || 'N/A'}</dd></div>
                        <div><dt>Status</dt><dd>{accountInfo.status || 'N/A'}</dd></div>
                         <div><dt>Owner</dt><dd>{accountInfo.owner?.display || 'N/A'}</dd></div>
                        <div><dt>Description</dt><dd>{accountInfo.description || 'N/A'}</dd></div>
                    </dl>
                ) : (
                    <p>No account information found.</p>
                )}
                <p className="text-xs text-gray-400 mt-2">Note: Real billing involves Claim/Invoice resources, not shown here.</p> {/* Keep note style for now? */} 
            </div>

            {!coverage && !accountInfo && !isLoading && 
                <p>No billing information available.</p>
            }
        </div>
    );
};

export default BillingTab; 
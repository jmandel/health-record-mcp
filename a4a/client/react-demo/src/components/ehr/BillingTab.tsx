import React from 'react';

interface BillingTabProps {
    coverage: any; // Replace 'any' with Coverage FHIR type
    accountInfo: any; // Replace 'any' with Account/Invoice/Claim FHIR type
}

const BillingTab: React.FC<BillingTabProps> = ({ coverage, accountInfo }) => {
    return (
        <div id="billing" className="tab-content active">
            <h2>Billing</h2>
            {coverage && (
                <>
                    <p><strong>Primary Insurance:</strong> {coverage.payor?.[0]?.display || 'N/A'}</p>
                    <p><strong>Policy Number:</strong> {coverage.subscriberId || 'N/A'}</p>
                </>
            )}
            {/* This part is highly simplified. Real billing involves Claims/Invoices */} 
            {accountInfo && (
                <table>
                    <thead>
                        <tr><th>Date</th><th>Service</th><th>Code</th><th>Charge</th></tr>
                    </thead>
                    <tbody>
                        <tr>
                            {/* Extracting simplified data from description. Needs proper model in reality */}
                            <td>{accountInfo.description?.match(/\((\d{2}\/\d{2}\/\d{4})\)/)?.[1] || 'N/A'}</td>
                            <td>{accountInfo.description?.match(/^([^\(]+)/)?.[1].trim() || 'N/A'}</td>
                            <td>{accountInfo.description?.match(/Code: ([^,]+)/)?.[1] || 'N/A'}</td>
                            <td>{accountInfo.description?.match(/Charge: ([^\)]+)/)?.[1] || 'N/A'}</td>
                        </tr>
                    </tbody>
                </table>
            )}
            {!coverage && !accountInfo && <p>No billing information available.</p>}
        </div>
    );
};

export default BillingTab; 
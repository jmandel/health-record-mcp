export const extractPatientAdminDetails = (ehrData: { fhir?: Record<string, any[]> } | null | undefined): string => {
    if (!ehrData?.fhir) return "Patient administrative details not available in EHR data.";

    const patient = ehrData.fhir.Patient?.[0];
    if (!patient) return "Patient resource not found in EHR data.";

    // --- Extract Name ---
    let patientName = "Unknown Name";
    if (patient.name && patient.name.length > 0) {
        const officialName = patient.name.find((n: any) => n.use === 'official') || patient.name[0];
        const given = officialName.given?.join(' ') || '';
        const family = officialName.family || '';
        patientName = `${given} ${family}`.trim();
        if (!patientName) patientName = officialName.text || "Name Details Missing";
    }

    // --- Extract DOB ---
    const dob = patient.birthDate || "Unknown DOB";

    // --- Extract Insurance --- 
    const coverages = ehrData.fhir.Coverage || [];
    const patientCoverages = coverages.filter(c => c.beneficiary?.reference === `Patient/${patient.id}`);
    let insuranceDetails = "No active coverage found.";
    if (patientCoverages.length > 0) {
        insuranceDetails = patientCoverages.map((cov, index) => {
            const payerName = cov.payor?.[0]?.display || cov.payor?.[0]?.reference || "Unknown Payer";
            const subscriberId = cov.subscriberId || "Unknown ID";
            const policyHolder = cov.policyHolder?.display || cov.policyHolder?.reference; // Less common, but possible
            const relationship = cov.relationship?.coding?.[0]?.display || cov.relationship?.text; // Self, Spouse, etc.
            let detail = `  - Payer: ${payerName}, Member ID: ${subscriberId}`;
            if (relationship && relationship.toLowerCase() !== 'self') {
                 detail += ` (Relationship: ${relationship}${policyHolder ? `, Holder: ${policyHolder}` : ''})`;
            }
            return detail;
        }).join('\n');
    }

    // --- Format Output String ---
    return `Patient Details:
Name: ${patientName}
DOB: ${dob}
Insurance:
${insuranceDetails}`; 
};


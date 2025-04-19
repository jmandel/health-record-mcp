import { FullEHR } from "./EhrApp"; // Adjust path if needed

export const mockEhrData: FullEHR = {
    fhir: {
        Patient: [
            {
                resourceType: "Patient",
                id: "mock-patient-id",
                name: [
                    {
                        use: "official",
                        family: "Mock",
                        given: ["Patient"],
                    },
                ],
                gender: "unknown",
                birthDate: "1970-01-01",
            },
        ],
        Condition: [
            {
                resourceType: "Condition",
                id: "cond-1",
                subject: { reference: "Patient/mock-patient-id" },
                code: { text: "Mock Condition 1" },
                clinicalStatus: { coding: [{ code: 'active' }] },
                onsetDateTime: "2023-01-15T10:00:00Z",
            },
             {
                resourceType: "Condition",
                id: "cond-2",
                subject: { reference: "Patient/mock-patient-id" },
                code: { text: "Mock Condition 2 (Inactive)" },
                clinicalStatus: { coding: [{ code: 'inactive' }] },
                 abatementDateTime: "2024-01-01T00:00:00Z",
                onsetDateTime: "2023-05-20T14:30:00Z",
            },
        ],
        Observation: [
             {
                resourceType: "Observation",
                id: "obs-1",
                 subject: { reference: "Patient/mock-patient-id" },
                status: "final",
                code: { text: "Mock Observation" },
                effectiveDateTime: "2024-03-10T09:15:00Z",
                valueString: "Example Value"
            },
        ],
        MedicationRequest: [],
        MedicationStatement: [],
        DocumentReference: [],
        // Add other necessary empty resource types if needed by components
         AllergyIntolerance: [],
         CarePlan: [],
         CareTeam: [],
         Coverage: [],
         Device: [],
         DiagnosticReport: [],
         Encounter: [],
         Goal: [],
         Immunization: [],
         Location: [],
         Medication: [],
         MedicationDispense: [],
         Organization: [],
         Practitioner: [],
         PractitionerRole: [],
         Procedure: [],
         Provenance: [],
         QuestionnaireResponse: [],
         RelatedPerson: [],
         ServiceRequest: [],
         Specimen: [],

    },
    attachments: [
        {
            resourceType: "DocumentReference", // Example: attachment belongs to a DR
            resourceId: "docref-example-1",
            path: "content[0].attachment", // JSON path to the Attachment data type within the DR
            contentType: "text/plain",
            contentPlaintext: "This is the plaintext content of a mock attachment.\nIt might contain notes or summaries.",
            json: JSON.stringify({ // The JSON of the Attachment data type itself
                 contentType: "text/plain",
                 language: "en",
                 title: "Mock Note Attachment",
                 creation: "2024-01-20T11:00:00Z"
                 // data or url would typically be here in a real FHIR resource
            })
        }
    ],
};

// Define a simple interface for the name structure expected
interface SimpleHumanName {
    use?: string;
    family?: string;
    given?: string[];
}

export const getPatientName = (ehrData: FullEHR | null | undefined): string => {
    if (!ehrData || !ehrData.fhir || !ehrData.fhir.Patient || ehrData.fhir.Patient.length === 0) {
        return "Unknown";
    }
    const patient = ehrData.fhir.Patient[0];
    if (!patient.name || patient.name.length === 0) {
        return `Patient/${patient.id || 'UnknownID'}`;
    }
    // Find the "official" name, or fall back to the first name entry
    // Use the SimpleHumanName interface for type annotation
    const officialName = patient.name.find((n: SimpleHumanName) => n.use === 'official') || patient.name[0];
    const given = officialName.given?.join(" ") || "";
    const family = officialName.family || "";
    const name = `${given} ${family}`.trim();
    return name || `Patient/${patient.id || 'UnknownID'}`; // Fallback if name parts are empty
}; 
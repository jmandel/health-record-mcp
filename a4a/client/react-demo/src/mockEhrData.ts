import { FullEHR } from "./EhrApp"; // Adjust path if needed

export const mockEhrData: FullEHR = {
    fhir: {
        Patient: [
            {
                resourceType: "Patient",
                id: "patient-bipolar-rtms-1",
                name: [
                    {
                        use: "official",
                        family: "Smith",
                        given: ["Jane", "Elizabeth"],
                    },
                ],
                gender: "female",
                birthDate: "1982-10-26", // Making patient 40+ years old
            },
        ],
        Condition: [
            {
                resourceType: "Condition",
                id: "cond-bipolar-1",
                subject: { reference: "Patient/patient-bipolar-rtms-1" },
                code: { 
                    coding: [{ system: "http://hl7.org/fhir/sid/icd-10-cm", code: "F31.32", display: "Bipolar disorder, current episode depressed, moderate" }],
                    text: "Bipolar I Disorder, Current Episode Depressed, Moderate Severity" 
                },
                clinicalStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: 'active' }] },
                verificationStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-ver-status", code: 'confirmed' }] },
                onsetDateTime: "2021-05-01T10:00:00Z", // Initial diagnosis
                recordedDate: "2021-05-15T11:00:00Z",
                note: [{ text: "Patient meets DSM-5 criteria for Bipolar I disorder. Current episode characterized by persistent low mood, anhedonia, fatigue, difficulty concentrating. No evidence of current mania, hypomania, or psychotic features." }]
            },
             {
                resourceType: "Condition",
                id: "cond-hypertension",
                subject: { reference: "Patient/patient-bipolar-rtms-1" },
                code: { 
                    coding: [{ system: "http://hl7.org/fhir/sid/icd-10-cm", code: "I10", display: "Essential (primary) hypertension" }],
                    text: "Hypertension" 
                },
                clinicalStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: 'active' }] },
                verificationStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-ver-status", code: 'confirmed' }] },
                onsetDateTime: "2018-03-10T09:00:00Z",
            },
        ],
        Observation: [
             {
                resourceType: "Observation",
                id: "obs-phq9-1",
                 subject: { reference: "Patient/patient-bipolar-rtms-1" },
                status: "final",
                category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "survey" }] }],
                code: { 
                    coding: [{ system: "http://loinc.org", code: "44261-6", display: "Patient Health Questionnaire 9 item (PHQ-9) total score [Reported]" }],
                    text: "PHQ-9 Total Score" 
                },
                effectiveDateTime: "2024-04-15T09:30:00Z", // Recent score
                valueQuantity: { value: 16, system: "http://unitsofmeasure.org", code: "{score}" } 
            },
            {
                resourceType: "Observation",
                id: "obs-bp-1",
                 subject: { reference: "Patient/patient-bipolar-rtms-1" },
                status: "final",
                 category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs" }] }],
                code: { coding: [{ system: "http://loinc.org", code: "85354-9", display: "Blood pressure panel with all children optional" }], text: "Blood pressure" },
                effectiveDateTime: "2024-04-15T09:30:00Z",
                 component: [
                     { code: { coding: [{ system: "http://loinc.org", code: "8480-6" }] }, valueQuantity: { value: 135, unit: "mmHg", system: "http://unitsofmeasure.org", code: "mm[Hg]" } },
                     { code: { coding: [{ system: "http://loinc.org", code: "8462-4" }] }, valueQuantity: { value: 85, unit: "mmHg", system: "http://unitsofmeasure.org", code: "mm[Hg]" } }
                 ]
            },
        ],
        MedicationStatement: [ // Using MedicationStatement to reflect history of use and discontinuation
             {
                 resourceType: "MedicationStatement",
                 id: "medstat-lamotrigine",
                 subject: { reference: "Patient/patient-bipolar-rtms-1" },
                 status: "stopped",
                 medicationCodeableConcept: {
                     coding: [{ system: "http://www.nlm.nih.gov/research/umls/rxnorm", code: "37098", display: "Lamotrigine" }],
                     text: "Lamotrigine (Lamictal)"
                 },
                 effectivePeriod: { start: "2022-01-10", end: "2022-09-15" },
                 dateAsserted: "2022-09-20",
                 reasonCode: [{ coding: [{ system: "http://snomed.info/sct", code: "404684003", display: "Ineffective drug therapy (finding)" }], text: "Lack of efficacy for depressive symptoms after adequate trial at 200mg/day." }]
             },
            {
                 resourceType: "MedicationStatement",
                 id: "medstat-lithium",
                 subject: { reference: "Patient/patient-bipolar-rtms-1" },
                 status: "stopped",
                 medicationCodeableConcept: {
                     coding: [{ system: "http://www.nlm.nih.gov/research/umls/rxnorm", code: "6482", display: "Lithium Carbonate" }],
                     text: "Lithium Carbonate"
                 },
                 effectivePeriod: { start: "2022-10-01", end: "2023-05-20" },
                 dateAsserted: "2023-05-25",
                 reasonCode: [{ coding: [{ system: "http://snomed.info/sct", code: "404684003", display: "Ineffective drug therapy (finding)" }], text: "Partial response but persistent moderate depression despite therapeutic levels (0.8 mEq/L)." }]
            },
            {
                 resourceType: "MedicationStatement",
                 id: "medstat-quetiapine",
                 subject: { reference: "Patient/patient-bipolar-rtms-1" },
                 status: "stopped",
                 medicationCodeableConcept: {
                     coding: [{ system: "http://www.nlm.nih.gov/research/umls/rxnorm", code: "51272", display: "Quetiapine" }],
                     text: "Quetiapine (Seroquel)"
                 },
                 effectivePeriod: { start: "2023-06-01", end: "2024-01-10" },
                 dateAsserted: "2024-01-15",
                 reasonCode: [{ coding: [{ system: "http://snomed.info/sct", code: "281647001", display: "Drug adverse reaction" }], text: "Discontinued due to intolerable side effects (excessive sedation, weight gain) at 300mg/day, limited efficacy." }]
            }
        ],
        DocumentReference: [
             {
                resourceType: "DocumentReference",
                id: "docref-intake-note",
                status: "current",
                subject: { reference: "Patient/patient-bipolar-rtms-1" },
                type: { coding: [{ system: "http://loinc.org", code: "11488-4", display: "Consult note" }], text: "Psychiatric Intake Note" },
                date: "2021-05-15T11:30:00Z",
                description: "Initial psychiatric evaluation establishing diagnosis.",
                content: [
                    {
                        attachment: {
                             contentType: "text/plain",
                             language: "en",
                             title: "Psychiatric Intake Note - Jane Smith - 2021-05-15",
                             // Ideally this would be base64 data, but we simulate with plaintext path
                             // data: "..." 
                        }
                    }
                ]
             },
            {
                resourceType: "DocumentReference",
                id: "docref-progress-note-rtms-eval",
                status: "current",
                subject: { reference: "Patient/patient-bipolar-rtms-1" },
                type: { coding: [{ system: "http://loinc.org", code: "11506-3", display: "Progress note" }], text: "Psychiatric Progress Note - rTMS Evaluation" },
                date: "2024-04-15T10:00:00Z",
                description: "Evaluation for rTMS suitability following medication failures.",
                 content: [
                    {
                        attachment: {
                             contentType: "text/plain",
                             language: "en",
                             title: "Progress Note - Jane Smith - 2024-04-15",
                             // data: "..."
                        }
                    }
                ]
            }
        ],
        // Add other necessary empty resource types if needed by components
         AllergyIntolerance: [],
         CarePlan: [],
         CareTeam: [],
         Coverage: [],
         Device: [],
         DiagnosticReport: [ // Added example MRI Brain Report
              {
                  resourceType: "DiagnosticReport",
                  id: "diag-mri-brain",
                  status: "final",
                  subject: { reference: "Patient/patient-bipolar-rtms-1" },
                  code: { coding: [{ system: "http://loinc.org", code: "24600-6", display: "MRI Brain W and W/O contrast" }], text: "MRI Brain W/WO Contrast" },
                  effectiveDateTime: "2020-07-29T14:00:00Z",
                  issued: "2020-07-29T16:30:00Z",
                  conclusion: "Normal MRI of the brain. No mass, hemorrhage, or acute infarct.",
                  conclusionCode: [{ coding: [{ system: "http://snomed.info/sct", code: "169494004", display: "Magnetic resonance imaging of brain normal (finding)" }]}]
              }
         ],
         Encounter: [],
         Goal: [],
         Immunization: [],
         Location: [],
         Medication: [],
         MedicationRequest: [], // Added to be explicit
         MedicationDispense: [],
         Organization: [],
         Practitioner: [],
         PractitionerRole: [],
         Procedure: [],
         Provenance: [],
         QuestionnaireResponse: [],
         RelatedPerson: [],
         ServiceRequest: [], // Add potentially related TMS request if needed later
         Specimen: [],
    },
    attachments: [ // Link these to the DocumentReference content attachments
        {
            resourceType: "DocumentReference",
            resourceId: "docref-intake-note",
            path: "content[0].attachment",
            contentType: "text/plain",
            contentPlaintext: `Patient: Jane Elizabeth Smith (DOB: 1982-10-26)\nDate: 2021-05-15\nReason for Visit: Evaluation for mood symptoms.\n\nHPI: Patient is a 38 y/o female presenting with several months of worsening depressive symptoms including pervasive low mood, anhedonia, hypersomnia, low energy, feelings of worthlessness, and difficulty concentrating. Reports history of distinct periods of elevated mood, increased energy, decreased need for sleep, and impulsivity lasting ~1 week in her late 20s, consistent with manic episodes. No prior formal diagnosis. Denies current suicidal ideation, mania, hypomania, or psychotic symptoms. \n\nAssessment: Bipolar I Disorder, Current Episode Depressed, Moderate.\nPlan: Initiate Lamotrigine titration, therapy referral.`,
            json: JSON.stringify({ contentType: "text/plain", language: "en", title: "Psychiatric Intake Note - Jane Smith - 2021-05-15", creation: "2021-05-15T11:30:00Z"})
        },
        {
            resourceType: "DocumentReference",
            resourceId: "docref-progress-note-rtms-eval",
            path: "content[0].attachment",
            contentType: "text/plain",
            contentPlaintext: `Patient: Jane Elizabeth Smith (DOB: 1982-10-26)\nDate: 2024-04-15\nSubject: Follow-up & rTMS Evaluation\n\nCurrent Symptoms: Patient reports ongoing moderate depressive symptoms despite multiple medication trials. PHQ-9 today is 16. Continues to experience significant functional impairment.\n\nMedication History Review: \n- Lamotrigine (200mg): Trialed Jan-Sep 2022. Discontinued due to lack of efficacy.\n- Lithium Carbonate (900mg, level 0.8): Trialed Oct 2022 - May 2023. Partial response, persistent moderate depression.\n- Quetiapine (300mg): Trialed Jun 2023 - Jan 2024. Discontinued due to sedation and weight gain, limited benefit.\n\nAssessment: Bipolar I Disorder, Current Episode Depressed, Moderate, Treatment-Resistant (failed 3 adequate trials of distinct medication classes appropriate for bipolar depression).\n\nPlan: Given inadequate response to multiple medications, patient is a candidate for rTMS. Discussed risks/benefits/alternatives. Patient agrees to proceed. Ordered rTMS consultation. Reviewed contraindications - no known metal implants, seizure history reviewed (none). Previous MRI Brain W/WO contrast (2020-07-29) was normal. Consider prior auth requirements.`,
            json: JSON.stringify({ contentType: "text/plain", language: "en", title: "Progress Note - Jane Smith - 2024-04-15", creation: "2024-04-15T10:00:00Z"})
        },
        { // Adding the MRI report details as an attachment as well for easy grep
             resourceType: "DiagnosticReport",
             resourceId: "diag-mri-brain",
             path: "result", // Path might vary, this is hypothetical
             contentType: "text/plain", // Simulating the report text
             contentPlaintext: `MRI BRAIN W AND W/O CONTRAST\nDATE: 2020-07-29\nPATIENT: Smith, Jane E\n\nFINDINGS:\nBrain parenchyma demonstrates normal signal intensity without evidence of acute infarction, hemorrhage, mass, or abnormal enhancement.\nVentricles and sulci are normal in size and configuration for age.\nDiffusion-weighted imaging is negative for acute stroke.\nPost-contrast images show no abnormal enhancement.\n\nIMPRESSION:\nNormal MRI of the brain.`,
             json: JSON.stringify({ contentType: "text/plain", language: "en", title: "MRI Brain Report Text", creation: "2020-07-29T16:30:00Z" })
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
    const officialName: SimpleHumanName = patient.name.find((n: SimpleHumanName) => n.use === 'official') || patient.name[0];
    const given = officialName.given?.join(" ") || "";
    const family = officialName.family || "";
    const name = `${given} ${family}`.trim();
    return name || `Patient/${patient.id || 'UnknownID'}`; // Fallback if name parts are empty
}; 
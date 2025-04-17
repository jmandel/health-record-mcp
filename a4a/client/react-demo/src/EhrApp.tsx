import React, { useState, useMemo } from 'react';
import { EhrProvider } from './context/EhrContext';

// Import actual components
import PatientHeader from './components/ehr/PatientHeader';
import Tabs from './components/ehr/Tabs';
import DemographicsTab from './components/ehr/DemographicsTab';
import MedicationsTab from './components/ehr/MedicationsTab';
import LabsTab from './components/ehr/LabsTab';
import ImagingTab from './components/ehr/ImagingTab';
import NotesTab from './components/ehr/NotesTab';
import OrderEntryTab from './components/ehr/OrderEntryTab';
import BillingTab from './components/ehr/BillingTab';

// Define types (adjust as needed, maybe move to a types file later)
interface ProcessedAttachment {
    resourceType: string;
    resourceId: string;
    path: string;
    contentType: string;
    json: string; // JSON string of the original attachment node
    // contentRaw: Buffer | null; // Buffer might not be available/needed in frontend mock
    contentPlaintext: string | null;
}

export interface FullEHR {
    fhir: Record<string, any[]>;
    attachments: ProcessedAttachment[];
}

// Mock EHR Data (Detailed Concussion/Migraine Scenario)
const mockEhrData: FullEHR = {
    fhir: {
        "Patient": [
            {
                resourceType: "Patient",
                id: "123456",
                name: [{ given: ["John", "Robert"], family: "Doe" }],
                gender: "male",
                birthDate: "1985-01-15",
                telecom: [
                    { system: "phone", value: "(555) 123-4567", use: "home" },
                    { system: "email", value: "john.doe@example.com" }
                ],
                address: [{ line: ["123 Main St"], city: "Anytown", state: "CA", postalCode: "90210", country: "USA" }],
                maritalStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus", code: "M", display: "Married" }] },
                contact: [{ relationship: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/v2-0131", code: "N", display: "Next of Kin" }] }], name: { given: ["Jane"], family: "Doe" }, telecom: [{ system: "phone", value: "(555) 987-6543", use: "home" }] }],
                // communication: [{ language: { coding: [{ system: "urn:ietf:bcp:47", code: "en", display: "English" }] } }],
                // generalPractitioner: [{ reference: "Practitioner/dr-smith", display: "Dr. Emily Smith" }]
            }
        ],
        "Condition": [
            {
                resourceType: "Condition",
                id: "cond-pcs",
                clinicalStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: "active" }] },
                verificationStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-ver-status", code: "confirmed" }] },
                category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-category", code: "encounter-diagnosis", display: "Encounter Diagnosis" }] }],
                code: { coding: [{ system: "http://snomed.info/sct", code: "284378001", display: "Postconcussion syndrome" }], text: "Post-Concussion Syndrome" },
                subject: { reference: "Patient/123456" },
                onsetDateTime: "2024-10-15", // Approx. 6 months prior to Botox order date
                recordedDate: "2024-10-20"
            },
            {
                resourceType: "Condition",
                id: "cond-migraine",
                clinicalStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: "active" }] },
                verificationStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-ver-status", code: "confirmed" }] },
                category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-category", code: "problem-list-item", display: "Problem List Item" }] }],
                severity: { coding: [{ system: "http://snomed.info/sct", code: "24484000", display: "Severe" }] },
                code: { coding: [{ system: "http://snomed.info/sct", code: "37796009", display: "Migraine" }], text: "Chronic Migraine with Aura" },
                subject: { reference: "Patient/123456" },
                onsetDateTime: "2024-11-01", // Developed after PCS
                recordedDate: "2024-11-10",
                evidence: [
                    {
                        detail: [{ reference: "Observation/headache-freq", display: "Headache Frequency Observation" }]
                    }
                ],
                note: [{ text: "Patient reports >15 headache days per month, many with aura. Meets criteria for chronic migraine."} ]
            }
        ],
        "MedicationStatement": [ // Use statement for history, Request for current/ordered
            {
                resourceType: "MedicationStatement",
                id: "medstmt-ibuprofen",
                status: "completed",
                medicationCodeableConcept: { coding: [{ system: "http://www.nlm.nih.gov/research/umls/rxnorm", code: "5640", display: "Ibuprofen" }], text: "Ibuprofen 800mg" },
                subject: { reference: "Patient/123456" },
                effectivePeriod: { start: "2024-10-20", end: "2024-11-15" },
                dateAsserted: "2024-11-15",
                dosage: [{ text: "800mg PO TID PRN headache" }],
                note: [{ text: "Trialed for post-concussion headaches. Provided minimal relief." }]
            },
            {
                resourceType: "MedicationStatement",
                id: "medstmt-sumatriptan",
                status: "stopped",
                medicationCodeableConcept: { coding: [{ system: "http://www.nlm.nih.gov/research/umls/rxnorm", code: "36314", display: "Sumatriptan" }], text: "Sumatriptan 100mg" },
                subject: { reference: "Patient/123456" },
                effectivePeriod: { start: "2024-11-20", end: "2025-01-10" },
                dateAsserted: "2025-01-10",
                reasonCode: [{ coding: [{ system: "http://snomed.info/sct", code: "182849001", display: "Drug ineffective" }] }],
                dosage: [{ text: "100mg PO at onset of migraine, may repeat x1 after 2 hrs" }],
                note: [{ text: "Prescribed after migraine diagnosis. Ineffective for severe headaches." }]
            },
            {
                resourceType: "MedicationStatement",
                id: "medstmt-topiramate",
                status: "stopped",
                medicationCodeableConcept: { coding: [{ system: "http://www.nlm.nih.gov/research/umls/rxnorm", code: "38486", display: "Topiramate" }], text: "Topiramate 50mg" },
                subject: { reference: "Patient/123456" },
                effectivePeriod: { start: "2025-01-15", end: "2025-03-01" },
                dateAsserted: "2025-03-01",
                reasonCode: [{ coding: [{ system: "http://snomed.info/sct", code: "266707007", display: "Side effect of drug" }] }], // Example: Cognitive side effects
                dosage: [{ text: "Started 25mg daily, titrated to 50mg BID" }],
                note: [{ text: "Trialed for migraine prevention. Discontinued due to cognitive fog ('word finding difficulty')." }]
            }
            // Note: Current active non-headache meds (e.g., Sertraline) could be here too as MedicationRequest
        ],
        "MedicationRequest": [
            {
                resourceType: "MedicationRequest",
                id: "medreq-sertraline",
                status: "active",
                intent: "order",
                medicationCodeableConcept: { coding: [{ system: "http://www.nlm.nih.gov/research/umls/rxnorm", code: "2551", display: "Sertraline" }], text: "Sertraline 50mg" },
                subject: { reference: "Patient/123456" },
                authoredOn: "2024-11-10",
                requester: { display: "Dr. Neurologist" }, // Placeholder
                dosageInstruction: [{ text: "50 mg PO Daily" }],
                reasonCode: [{ text: "Mood stabilization associated with chronic pain/PCS" }] // Plausible reason
            }
            // Botox will be the ServiceRequest
        ],
        "Observation": [ // Labs
            {
                resourceType: "Observation",
                id: "lab-cbc",
                status: "final",
                category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "laboratory" }] }],
                code: { coding: [{ system: "http://loinc.org", code: "57021-8", display: "CBC W Auto Differential panel" }], text: "Complete Blood Count" },
                subject: { reference: "Patient/123456" },
                effectiveDateTime: "2025-04-10",
                issued: "2025-04-10T11:30:00Z",
                valueString: "Normal panel", // Simplification for mock
                interpretation: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation", code: "N", display: "Normal" }] }]
            },
            {
                resourceType: "Observation",
                id: "lab-cmp",
                status: "final",
                category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "laboratory" }] }],
                code: { coding: [{ system: "http://loinc.org", code: "24323-8", display: "Comprehensive metabolic panel" }], text: "Comprehensive Metabolic Panel" },
                subject: { reference: "Patient/123456" },
                effectiveDateTime: "2025-04-10",
                issued: "2025-04-10T11:35:00Z",
                valueString: "Within normal limits", // Simplification for mock
                interpretation: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation", code: "N", display: "Normal" }] }]
            },
            {
                resourceType: "Observation",
                id: "headache-freq",
                status: "final",
                category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "survey" }] }],
                code: { coding: [{ system: "http://loinc.org", code: "86947-4", display: "Headache days [Number] Per month" }], text: "Headache Frequency" },
                subject: { reference: "Patient/123456" },
                effectiveDateTime: "2025-04-12", // Date assessed
                valueQuantity: { value: 18, unit: "days/month", system: "http://unitsofmeasure.org", code: "d/mo" }
            }
        ],
        "DiagnosticReport": [ // Imaging
            {
                resourceType: "DiagnosticReport",
                id: "ct-head",
                status: "final",
                category: [{ coding: [{ system: "http://loinc.org", code: "30631-8", display: "CT Head" }] }],
                code: { coding: [{ system: "http://snomed.info/sct", code: "429858000" }], text: "CT Head without contrast" },
                subject: { reference: "Patient/123456" },
                effectiveDateTime: "2024-10-16", // Shortly after concussion
                issued: "2024-10-16T15:00:00Z",
                conclusion: "No evidence of acute intracranial hemorrhage, mass effect, or hydrocephalus. Mild mucosal thickening in the maxillary sinuses.",
                conclusionCode: [{ coding: [{ system: "http://snomed.info/sct", code: "188340000", display: "Normal" }] }]
            },
            {
                resourceType: "DiagnosticReport",
                id: "mri-brain",
                status: "final",
                category: [{ coding: [{ system: "http://loinc.org", code: "24675-1", display: "MRI Brain W and WO contrast" }] }],
                code: { coding: [{ system: "http://snomed.info/sct", code: "430046005" }], text: "MRI Brain W and WO contrast" },
                subject: { reference: "Patient/123456" },
                effectiveDateTime: "2024-12-05", // Ordered due to persistent symptoms
                issued: "2024-12-05T17:30:00Z",
                conclusion: "Scattered T2/FLAIR hyperintensities in the subcortical white matter, nonspecific, potentially post-traumatic or related to migraine. No enhancing lesions, mass, or restricted diffusion. Ventricles and sulci are normal for age.",
                conclusionCode: [{ coding: [{ system: "http://snomed.info/sct", code: "188345005", display: "Findings present" }] }]
            }
        ],
        "Procedure": [
            {
                resourceType: "Procedure",
                id: "proc-pt",
                status: "completed",
                category: { coding: [{ system: "http://snomed.info/sct", code: "386617003", display: "Physical therapy procedure" }] },
                code: { coding: [{ system: "http://snomed.info/sct", code: "416611000" }], text: "Vestibular rehabilitation therapy" },
                subject: { reference: "Patient/123456" },
                performedPeriod: { start: "2024-11-01", end: "2024-12-20" },
                reasonReference: [{ reference: "Condition/cond-pcs", display: "Post-Concussion Syndrome" }],
                note: [{ text: "Course of PT for balance and dizziness post-concussion. Symptoms improved moderately." }]
            }
        ],
        "DocumentReference": [ // Notes
             {
                resourceType: "DocumentReference",
                id: "note-neuro-fu-apr",
                status: "current",
                docStatus: "final",
                type: { coding: [{ system: "http://loinc.org", code: "11506-3", display: "Progress note" }] },
                category: [{ coding: [{ system: "http://loinc.org", code: "34117-2", display: "History and physical note" }] }],
                subject: { reference: "Patient/123456" },
                date: "2025-04-12T09:30:00Z",
                author: [{ display: "Dr. Neurologist" }],
                description: "Neurology Follow-up: Chronic Migraine & PCS",
                content: [
                    {
                        attachment: {
                            contentType: "text/plain",
                            data: "Uzs6IDM5eW8gTSB3aXRoIGh4IG9mIGNvbmN1c3Npb24gYXJvdW5kIDYgbW9udGhzIGFnbyAoZmFsbCwgaGl0IGhlYWQpLCBub3cgcHJlc2VudGluZyBmb3IgZm9sbG93LXVwIG9mIHBlcnNpc3RlbnQgY2hyb25pYyBoZWFkYWNoZXMsIGRpYWdub3NlZCBhcyBDaHJvbmljIE1pZ3JhaW5lIHdpdGggYXVyYSBhcHByb3guIDUgMS8yIG1vbnRocyBhZ28uDQpIQkQ6IFJlcG9ydHMgMTgtMjAgaGVhZGFjaGEgZGF5cy9tb250aCwgb2Z0ZW4gc2V2ZXJlIChQYWluIDgtOS8xMCksIHRocm9iYmluZywgcGhvdG8vbm9pc2Utc2Vuc2l0aXZlLCBuYXVzZWEuIEFzc29jaWF0ZWQgYXVyYSBvbiA1PkMgZGF5cyAodmlzdWFsLCBzZW5zb3J5KS4gSGVhZGFjaGVzIGFyZSBkaXNhYmxpbmcsIGltcGFjdGluZyB3b3JrIGFuZCBkYWlseSBsaWZlLiANCk1lZCB0cmlhbHM6IElidXByb2ZlbiA4MDBtZyBQTyBUUkQgUFJOIC0gbWluaW1hbCByZWxpZWYsIHVzZWQgb25seSBmb3IgYWJvdXQgYSBtb250aC4gU3VtYXRyaXB0YW4gMTAwbWcgUE8gcHJuIG1pZ3JhaW5lIC0gaW5lZmZlY3RpdmUgZm9yIG1vc3QgaGVhZGFjaGVzLiBUb3BpcmFtYXRlIHRpdHJhdGVkIHVwIHRvIDUwbWcgQklEIC0gZGlzY29udGludWVkIGFmdGVyIDYgd2Vla3MgZHVlIHRvIGNvZ25pdGl2ZSBmb2csIHNpZ25pZmljYW50IHdvcmQtZmluZGluZyBkaWZmaWN1bHR5Lg0KUENDIFN5bXB0b21zOiBSZXNvbHZlZCBkaXp6aW5lc3MgYW5kIGJhbGFuY2UgaXNzdWVzIGFmdGVyIFBUICh2ZXN0aWJ1bGFyIHJlaGFiKS4gQ29udGludWVzIHdpdGggbWlsZCBlbmR1cmluZyBkaWZmaWN1bHR5IHdpdGggY29uY2VudHJhdGlvbiBhbmQgbWVtb3J5LCBhbmQgZmF0aWd1ZS4gU2VydHJhbGluZSA1MG1nIGZvciBtb29kIHN0YWJpbGl6YXRpb24uDQpPQkY6IE5vbi1mb2NhbC4gQ04gSUktWFklIGludGFjdC4gU3RyZW5ndGggNS81IGdsb2JhbGx5LiBTZW5zb3J5IGludGFjdC4gQ2VyZWJlbGxhciBleGFtIHdpdGhpbiBub3JtYWwgbGltaXRzLg0KQVNTWVQ6IENocm9uaWMgTWlncmFpbmUgd2l0aCBhdXJhLCByZWZyYWN0b3J5IHRvIG11bHRpcGxlIG1lZGljYWwgdHJpYWxzLiBQb3N0LWNvbmN1c3Npb24gc3luZHJvbWUgd2l0aCBlbmR1cmluZyBjb2duaXRpXZkgc3ltcHRvbXMuDQpQTEFOOiBEaXNjdXNzZWQgQm90b3ggKExuYWJvdHVsaW51bXRveGluQSkgZm9yIGNocm9uaWMgbWlncmFpbmUgcHJldmVudGlvbi4gUGF0aWVudCB1bmRlcnN0YW5kcyBwb3RlbnRpYWwgYmVuZWZpdHMgYW5kIHJpc2tzLiBGREEgYXBwcm92ZWQsIGFwcHJvcHJpYXRlIGdpdmVuIG1lZCBmYWlsdXJlcyBhbmQgY2hyb25pY2l0eSAoPjE1IGhkIGRheXMvbW8pLiBQUkVDVCBwcm90b2NvbDogMTU1IHUgSU0gZGl2aWRlZCBhY3Jvc3MgMzEgc2l0ZXMgZXZlcnkgMTIgd2tzLiBTdWJtaXR0aW5nIG9yZGVyIGFuZCBwcmlvciBhdXRob3JpemF0aW9uLiBSZWZlcnJlZCBmb3IgbmV1cm9wc3ljaG9sb2dpY2FsIHRlc3RpbmcgZm9yIGNvZ25pdGl2ZSBjb25jZXJucy4gRm9sbG93LXVwIGluIDMgbW9udGhzLg==" // Base64 of detailed note content
                        }
                    }
                ]
             },
             {
                resourceType: "DocumentReference",
                id: "note-pcs-initial",
                status: "current",
                docStatus: "final",
                type: { coding: [{ system: "http://loinc.org", code: "34117-2", display: "History and physical note" }] },
                category: [{ coding: [{ system: "http://loinc.org", code: "34117-2", display: "History and physical note" }] }],
                subject: { reference: "Patient/123456" },
                date: "2024-10-20T14:30:00Z",
                author: [{ display: "Dr. Primary Care" }],
                description: "Initial Evaluation Post-Concussion",
                content: [
                    {
                        attachment: {
                            contentType: "text/plain",
                            data: "Uzs6IDM5eW8gTSBwcmVzZW50cyBmb3IgZXZhbHVhdGlvbiBhZnRlciBhIGZhbGwgNSBkYXlzIGFnbywgcmVwb3J0ZWRseSBoaXR0aW5nIGhlYWQgKHdpdG5lc3NlZCkgd2hpbGUgd29ya2luZyBpbiB0aGUgZ2FyYWdlLiBObyBMT0MuIFJlcG9ydHMgYSBoZWFkYWNoZSAocHJlc2VudCBzaW5jZSBmYWxsLCBtb2RlcmF0ZSBzZXZlcml0eSksIGRpY2N1bHR5IGNvbmNlbnRyYXRpbmcsIGFuZCBkaXp6aW5lc3MsIGVzcGVjaWFsbHkgd2l0aCBoZWFkIG1vdmVtZW50LiBCZWluZyBzZWVuIGZvciBjb25jdXNzaW9uIG1hbmFnZW1lbnQuIENUSSBoZWFkIGluIEVEIHdhcyBuZWdhdGl2ZS4gQXNzZXNzbWVudDogQWN1dGUgY29uY3Vzc2lvbi4gUGxhbjogQ29nbml0aXZlIGFuZCBwaHlzaWNhbCByZXN0LiBSZWZlcnJhbCB0byBuZXVyb2xvZ3kgYW5kIFBULyBWZXN0aWJ1bGFyIFJlaGFiIGlmIHN5bXB0b21zIHBlcnNpc3QuIFBSSCBJYnVwcm9mZW4uIEVkdWNhdGVkIG9uIHdhcm5pbmcgc2lnbnMu" // Base64
                        }
                    }
                ]
             }
        ],
        "ServiceRequest": [ // For Order Entry (Botox)
            {
                resourceType: "ServiceRequest",
                id: "order-botox",
                status: "draft",
                intent: "order",
                category: [{ coding: [{ system: "http://snomed.info/sct", code: "387713003", display: "Procedure" }] }],
                subject: { reference: "Patient/123456" },
                code: { coding: [{ system: "http://www.ama-assn.org/go/cpt", code: "64615" }], text: "Chemodenervation of muscle(s); muscle(s) innervated by facial nerve, trigeminal nerve, cervical spinal nerves, accessory nerve, chronic migraine (15 or more headache days per month)" },
                orderDetail: [{ text: "OnabotulinumtoxinA (Botox) 155 units, administered as per PREEMPT protocol for chronic migraine." }],
                quantityQuantity: { value: 155, unit: "units", system: "http://unitsofmeasure.org", code: "{U}" }, // UCUM code for 'unit'
                occurrenceTiming: { repeat: { frequency: 1, period: 12, periodUnit: "wk" } }, // Every 12 weeks
                requester: { display: "Dr. Neurologist" },
                reasonCode: [{ coding: [{ system: "http://snomed.info/sct", code: "37796009" }], text: "Chronic Migraine with Aura" }],
                reasonReference: [{ reference: "Condition/cond-migraine" }],
                supportingInfo: [
                    { reference: "Condition/cond-pcs" },
                    { reference: "MedicationStatement/medstmt-sumatriptan" },
                    { reference: "MedicationStatement/medstmt-topiramate" }
                ],
                note: [{ text: "Patient meets criteria for chronic migraine (>15 headache days/month) and has failed trials of at least 2 preventive medications (Sumatriptan - ineffective, Topiramate - intolerable side effects). Requesting prior authorization for Botox injections per PREEMPT protocol." }]
            }
        ],
        "Coverage": [
            {
                resourceType: "Coverage",
                id: "cov1",
                status: "active",
                type: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", code: "PPO", display: "Preferred Provider Organization" }] },
                beneficiary: { reference: "Patient/123456" },
                relationship: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/subscriber-relationship", code: "self" }] },
                period: { start: "2025-01-01" },
                payor: [{ identifier: { value: "PAYORID123" }, display: "HealthPlan Co. PPO" }],
                subscriberId: "HP-987654",
                order: 1
            }
        ],
        "Account": [ // Billing - Simplified but tied to the order
            {
                resourceType: "Account",
                id: "bill-botox-auth",
                status: "active",
                type: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", code: "PBILLACCT", display: "patient billing account" }] },
                name: "Patient Account for Botox Treatment",
                subject: [{ reference: "Patient/123456" }],
                servicePeriod: { start: "2025-04-12" }, // Date of service request
                owner: { display: "Anytown Neurology Clinic" },
                description: "Account tracking charges related to Botox prior authorization and potential treatment."
                // Specific charges would appear in Invoice or Claim resources later
            }
        ]
    },
    attachments: [
        {
            resourceType: "DocumentReference",
            resourceId: "note-neuro-fu-apr",
            path: "content[0].attachment",
            contentType: "text/plain",
            json: "{\"contentType\": \"text/plain\", \"data\": \"Uzs6IDM5eW8gTSB3aXRoIGh4IG9mIGNvbmN1c3Npb24gYXJvdW5kIDYgbW9udGhzIGFnbyAoZmFsbCwgaGl0IGhlYWQpLCBub3cgcHJlc2VudGluZyBmb3IgZm9sbG93LXVwIG9mIHBlcnNpc3RlbnQgY2hyb25pYyBoZWFkYWNoZXMsIGRpYWdub3NlZCBhcyBDaHJvbmljIE1pZ3JhaW5lIHdpdGggYXVyYSBhcHByb3guIDUgMS8yIG1vbnRocyBhZ28uDQpIQkQ6IFJlcG9ydHMgMTgtMjAgaGVhZGFjaGEgZGF5cy9tb250aCwgb2Z0ZW4gc2V2ZXJlIChQYWluIDgtOS8xMCksIHRocm9iYmluZywgcGhvdG8vbm9pc2Utc2Vuc2l0aXZlLCBuYXVzZWEuIEFzc29jaWF0ZWQgYXVyYSBvbiA1PkMgZGF5cyAodmlzdWFsLCBzZW5zb3J5KS4gSGVhZGFjaGVzIGFyZSBkaXNhYmxpbmcsIGltcGFjdGluZyB3b3JrIGFuZCBkYWlseSBsaWZlLiANCk1lZCB0cmlhbHM6IElidXByb2ZlbiA4MDBtZyBQTyBUUkQgUFJOIC0gbWluaW1hbCByZWxpZWYsIHVzZWQgb25seSBmb3IgYWJvdXQgYSBtb250aC4gU3VtYXRyaXB0YW4gMTAwbWcgUE8gcHJuIG1pZ3JhaW5lIC0gaW5lZmZlY3RpdmUgZm9yIG1vc3QgaGVhZGFjaGVzLiBUb3BpcmFtYXRlIHRpdHJhdGVkIHVwIHRvIDUwbWcgQklEIC0gZGlzY29udGludWVkIGFmdGVyIDYgd2Vla3MgZHVlIHRvIGNvZ25pdGl2ZSBmb2csIHNpZ25pZmljYW50IHdvcmQtZmluZGluZyBkaWZmaWN1bHR5Lg0KUENDIFN5bXB0b21zOiBSZXNvbHZlZCBkaXp6aW5lc3MgYW5kIGJhbGFuY2UgaXNzdWVzIGFmdGVyIFBUICh2ZXN0aWJ1bGFyIHJlaGFiKS4gQ29udGludWVzIHdpdGggbWlsZCBlbmR1cmluZyBkaWZmaWN1bHR5IHdpdGggY29uY2VudHJhdGlvbiBhbmQgbWVtb3J5LCBhbmQgZmF0aWd1ZS4gU2VydHJhbGluZSA1MG1nIGZvciBtb29kIHN0YWJpbGl6YXRpb24uDQpPQkY6IE5vbi1mb2NhbC4gQ04gSUktWFklIGludGFjdC4gU3RyZW5ndGggNS81IGdsb2JhbGx5LiBTZW5zb3J5IGludGFjdC4gQ2VyZWJlbGxhciBleGFtIHdpdGhpbiBub3JtYWwgbGltaXRzLg0KQVNTWVQ6IENocm9uaWMgTWlncmFpbmUgd2l0aCBhdXJhLCByZWZyYWN0b3J5IHRvIG11bHRpcGxlIG1lZGljYWwgdHJpYWxzLiBQb3N0LWNvbmN1c3Npb24gc3luZHJvbWUgd2l0aCBlbmR1cmluZyBjb2duaXRpXZkgc3ltcHRvbXMuDQpQTEFOOiBEaXNjdXNzZWQgQm90b3ggKExuYWJvdHVsaW51bXRveGluQSkgZm9yIGNocm9uaWMgbWlncmFpbmUgcHJldmVudGlvbi4gUGF0aWVudCB1bmRlcnN0YW5kcyBwb3RlbnRpYWwgYmVuZWZpdHMgYW5kIHJpc2tzLiBGREEgYXBwcm92ZWQsIGFwcHJvcHJpYXRlIGdpdmVuIG1lZCBmYWlsdXJlcyBhbmQgY2hyb25pY2l0eSAoPjE1IGhkIGRheXMvbW8pLiBQUkVDVCBwcm90b2NvbDogMTU1IHUgSU0gZGl2aWRlZCBhY3Jvc3MgMzEgc2l0ZXMgZXZlcnkgMTIgd2tzLiBTdWJtaXR0aW5nIG9yZGVyIGFuZCBwcmlvciBhdXRob3JpemF0aW9uLiBSZWZlcnJlZCBmb3IgbmV1cm9wc3ljaG9sb2dpY2FsIHRlc3RpbmcgZm9yIGNvZ25pdGl2ZSBjb25jZXJucy4gRm9sbG93LXVwIGluIDMgbW9udGhzLg==\"}", // Mock JSON of attachment node
            contentPlaintext: "S: 39yo M with hx of concussion around 6 months ago (fall, hit head), now presenting for follow-up of persistent chronic headaches, diagnosed as Chronic Migraine with aura approx. 5 1/2 months ago.\nHPI: Reports 18-20 headache days/month, often severe (Pain 8-9/10), throbbing, photo/noise-sensitive, nausea. Associated aura on >50% days (visual, sensory). Headaches are disabling, impacting work and daily life. \nMed trials: Ibuprofen 800mg PO TRD PRN - minimal relief, used only for about a month. Sumatriptan 100mg PO prn migraine - ineffective for most headaches. Topiramate titrated up to 50mg BID - discontinued after 6 weeks due to cognitive fog, significant word-finding difficulty.\nPCS Symptoms: Resolved dizziness and balance issues after PT (vestibular rehab). Continues with mild enduring difficulty with concentration and memory, and fatigue. Sertraline 50mg for mood stabilization.\nO/E: Non-focal. CN II-XII intact. Strength 5/5 globally. Sensory intact. Cerebellar exam within normal limits.\nASSMT: Chronic Migraine with aura, refractory to multiple medical trials. Post-concussion syndrome with enduring cognitive symptoms.\nPLAN: Discussed Botox (OnabotulinumtoxinA) for chronic migraine prevention. Patient understands potential benefits and risks. FDA approved, appropriate given med failures and chronicity (>15 hd days/mo). PREEMPT protocol: 155 u IM divided across 31 sites every 12 wks. Submitting order and prior authorization. Referred for neuropsychological testing for cognitive concerns. Follow-up in 3 months."
        },
        {
            resourceType: "DocumentReference",
            resourceId: "note-pcs-initial",
            path: "content[0].attachment",
            contentType: "text/plain",
            json: "{\"contentType\": \"text/plain\", \"data\": \"Uzs6IDM5eW8gTSBwcmVzZW50cyBmb3IgZXZhbHVhdGlvbiBhZnRlciBhIGZhbGwgNSBkYXlzIGFnbywgcmVwb3J0ZWRseSBoaXR0aW5nIGhlYWQgKHdpdG5lc3NlZCkgd2hpbGUgd29ya2luZyBpbiB0aGUgZ2FyYWdlLiBObyBMT0MuIFJlcG9ydHMgYSBoZWFkYWNoZSAocHJlc2VudCBzaW5jZSBmYWxsLCBtb2RlcmF0ZSBzZXZlcml0eSksIGRpY2N1bHR5IGNvbmNlbnRyYXRpbmcsIGFuZCBkaXp6aW5lc3MsIGVzcGVjaWFsbHkgd2l0aCBoZWFkIG1vdmVtZW50LiBCZWluZyBzZWVuIGZvciBjb25jdXNzaW9uIG1hbmFnZW1lbnQuIENUSSBoZWFkIGluIEVEIHdhcyBuZWdhdGl2ZS4gQXNzZXNzbWVudDogQWN1dGUgY29uY3Vzc2lvbi4gUGxhbjogQ29nbml0aXZlIGFuZCBwaHlzaWNhbCByZXN0LiBSZWZlcnJhbCB0byBuZXVyb2xvZ3kgYW5kIFBULyBWZXN0aWJ1bGFyIFJlaGFiIGlmIHN5bXB0b21zIHBlcnNpc3QuIFBSSCBJYnVwcm9mZW4uIEVkdWNhdGVkIG9uIHdhcm5pbmcgc2lnbnMu\"}", // Mock JSON
            contentPlaintext: "S: 39yo M presents for evaluation after a fall 5 days ago, reportedly hitting head (witnessed) while working in the garage. No LOC. Reports a headache (present since fall, moderate severity), difficulty concentrating, and dizziness, especially with head movement. Being seen for concussion management. CT Head in ED was negative. Assessment: Acute concussion. Plan: Cognitive and physical rest. Referral to neurology and PT/ Vestibular Rehab if symptoms persist. PRN Ibuprofen. Educated on warning signs."
        },
        {
            resourceType: "DiagnosticReport",
            resourceId: "mri-brain",
            path: "presentedForm[0]", // Example path
            contentType: "application/pdf",
            json: "{\"contentType\": \"application/pdf\", \"url\": \"/binary/pdf-mri-123\"}", // Mock JSON
            contentPlaintext: null // PDFs usually don't have simple plaintext extracted this way
        }
        // Add other relevant attachments if needed (e.g., PT notes summary)
    ]
};

// Remove Placeholder Components
// const PlaceholderComponent: React.FC<{ name: string }> = ({ name }) => (
//     <div style={{ padding: '20px', border: '1px dashed #ccc', margin: '10px 0' }}>
//         Placeholder for {name} Component
//     </div>
// );
// const PatientHeader = PlaceholderComponent; // Removed
// const Tabs = PlaceholderComponent; // Removed
// const DemographicsTab = PlaceholderComponent; // Removed
// const MedicationsTab = PlaceholderComponent; // Removed
// const LabsTab = PlaceholderComponent; // Removed
// const ImagingTab = PlaceholderComponent; // Removed
// const NotesTab = PlaceholderComponent; // Removed
// const OrderEntryTab = PlaceholderComponent; // Removed
// const BillingTab = PlaceholderComponent; // Removed

function EhrApp() {
    const [ehrData, _setEhrData] = useState<FullEHR>(mockEhrData);
    const [activeTab, setActiveTab] = useState<string>('order-entry'); // Default to Order Entry

    // Extract data for components
    const patient = useMemo(() => ehrData.fhir['Patient']?.[0], [ehrData]);
    const medicationRequests = useMemo(() => ehrData.fhir['MedicationRequest'] || [], [ehrData]);
    const observations = useMemo(() => ehrData.fhir['Observation'] || [], [ehrData]);
    const diagnosticReports = useMemo(() => ehrData.fhir['DiagnosticReport'] || [], [ehrData]);
    const notes = useMemo(() => ehrData.fhir['DocumentReference'] || [], [ehrData]);
    const serviceRequest = useMemo(() => ehrData.fhir['ServiceRequest']?.[0], [ehrData]); // Assuming one order for now
    const coverage = useMemo(() => ehrData.fhir['Coverage']?.[0], [ehrData]);
    const accountInfo = useMemo(() => ehrData.fhir['Account']?.[0], [ehrData]);
    const attachments = useMemo(() => ehrData.attachments || [], [ehrData]); // Extract attachments

    const tabsConfig = [
        { id: 'demographics', label: 'Demographics' },
        { id: 'medications', label: 'Medications' },
        { id: 'labs', label: 'Lab Results' },
        { id: 'imaging', label: 'Imaging' },
        { id: 'notes', label: 'Notes' },
        { id: 'order-entry', label: 'Order Entry' },
        { id: 'billing', label: 'Billing' },
    ];

    // Wrap the entire app in EhrProvider to supply EHR context
    return (
        <EhrProvider ehrData={ehrData}>
            <div className="ehr-app">
                <header className="ehr-header">
                    {/* Use actual PatientHeader component */}
                    <PatientHeader patient={patient} />
                </header>

                <nav className="tabs">
                    {/* Use actual Tabs component */}
                    <Tabs tabs={tabsConfig} activeTab={activeTab} onTabChange={setActiveTab} />
                </nav>

                <div className="content">
                    {/* Render actual tab components, passing relevant data */}
                    {activeTab === 'demographics' && <DemographicsTab patient={patient} />} 
                    {activeTab === 'medications' && <MedicationsTab medicationRequests={medicationRequests} />} 
                    {activeTab === 'labs' && <LabsTab observations={observations} />} 
                    {activeTab === 'imaging' && <ImagingTab diagnosticReports={diagnosticReports} />} 
                    {activeTab === 'notes' && <NotesTab attachments={attachments} />} 
                    {activeTab === 'order-entry' && <OrderEntryTab serviceRequest={serviceRequest} />} 
                    {activeTab === 'billing' && <BillingTab coverage={coverage} accountInfo={accountInfo} />} 
                </div>
            </div>
        </EhrProvider>
    );
}

export default EhrApp; 
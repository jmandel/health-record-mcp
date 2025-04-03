/**
 * Shared configuration for initial FHIR resource search queries.
 */

export interface FhirSearchQuery {
    resourceType: string;
    /** 
     * Search parameters for the query. 
     * The `patient` parameter will be added automatically by the function.
     */
    params?: Record<string, string>;
}

// Base configuration without patient ID
const BASE_SEARCH_QUERIES: Readonly<Omit<FhirSearchQuery, 'params'> & { params?: Omit<FhirSearchQuery['params'], 'patient'> }>[] = [
    { resourceType: 'Observation', params: { category: 'laboratory' } },
    { resourceType: 'Observation', params: { category: 'vital-signs' } },
    { resourceType: 'Observation', params: { category: 'social-history' } },
    { resourceType: 'Observation', params: { category: 'sdoh' } },
    { resourceType: 'Observation', params: { category: 'functional-status' } },
    { resourceType: 'Observation', params: { category: 'disability-status' } },
    { resourceType: 'Observation', params: { category: 'mental-health' } },
    { resourceType: 'Condition', params: {} },
    { resourceType: 'MedicationRequest', params: {} },
    { resourceType: 'AllergyIntolerance', params: {} },
    { resourceType: 'Immunization', params: {} },
    { resourceType: 'Procedure', params: {} },
    { resourceType: 'DiagnosticReport', params: {} },
    { resourceType: 'DocumentReference', params: {} },
    { resourceType: 'CarePlan', params: {} },
    { resourceType: 'CareTeam', params: {} },
    { resourceType: 'Coverage', params: {} },
    { resourceType: 'Device', params: {} },
    { resourceType: 'Encounter', params: {} },
    { resourceType: 'Goal', params: {} },
    { resourceType: 'MedicationDispense', params: {} },
    { resourceType: 'MedicationStatement', params: {} },
    { resourceType: 'QuestionnaireResponse', params: {} },
    { resourceType: 'RelatedPerson', params: {} },
    { resourceType: 'Specimen', params: {} },
    { resourceType: 'ServiceRequest', params: {} },
    { resourceType: 'Patient', params: {} },
    { resourceType: 'Practitioner', params: {} },
    { resourceType: 'Organization', params: {} },
];

/**
 * Generates the set of initial bulk search queries for a specific patient.
 * Ensures the `patient` parameter is included in all queries.
 * Parameters like `_count` should be added during the fetch execution.
 *
 * @param patientId The ID of the patient to search for.
 * @returns A read-only array of search query configurations.
 */
export function getInitialFhirSearchQueries(patientId: string): Readonly<FhirSearchQuery[]> {
    return BASE_SEARCH_QUERIES.map(baseQuery => ({
        ...baseQuery,
        params: {
            ...(baseQuery.params || {}),
            patient: patientId, // Ensure patient ID is always included
        },
    }));
} 
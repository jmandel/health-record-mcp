// Export all utility functions and types for easy import

// FHIR types and constants
export * from './types';

// FHIR processing utilities
export {
    fetchInitialFhirResources,
    resolveFhirReferences,
    processFhirAttachments,
    fetchAllEhrData
} from './fhirUtils';

// Database utilities
export {
    ehrToSqlite,
    sqliteToEhr
} from './dbUtils';

// Other utility functions as needed
export {
    resolveFhirUrl,
    fetchFhirResource,
    fetchAllPages,
    fetchAttachmentContent,
    getValueAtPath
} from './utils'; 
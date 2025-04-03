/**
 * Client-side type definitions for the EHR Retriever app.
 */

/**
 * Represents a processed attachment, suitable for client-side handling.
 * Binary content is stored as a base64 encoded string.
 */
export interface ClientProcessedAttachment {
    resourceType: string;
    resourceId: string;
    path: string;
    contentType: string;
    json: string; // JSON string of the original attachment node
    contentBase64: string | null; // Raw content encoded as base64
    contentPlaintext: string | null;
}

/**
 * Represents the complete EHR data structure fetched and processed
 * on the client-side.
 */
export interface ClientFullEHR {
    /**
     * A record where keys are FHIR resource types (e.g., "Patient", "Observation")
     * and values are arrays of the corresponding FHIR resource JSON objects.
     */
    fhir: Record<string, any[]>;
    /**
     * An array of processed attachments associated with the FHIR resources.
     */
    attachments: ClientProcessedAttachment[];
} 
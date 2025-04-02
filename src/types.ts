export interface ProcessedAttachment {
    resourceType: string;
    resourceId: string;
    path: string;
    contentType: string;
    json: string; // JSON string of the original attachment node
    contentRaw: Buffer | null;
    contentPlaintext: string | null;
}

export interface AttachmentLike {
    contentType?: string;
    data?: string;
    url?: string;
}

export interface FullEHR {
    fhir: Record<string, any[]>; 
    attachments: ProcessedAttachment[];
}

export const KNOWN_ATTACHMENT_PATHS = new Map<string, string[]>([
    ['DocumentReference', ['content.attachment']],
    ['Binary', ['']],
    ['Media', ['content']],
    ['DiagnosticReport', ['presentedForm']],
    ['Observation', ['valueAttachment']],
    ['Patient', ['photo']],
    ['Practitioner', ['photo']],
    ['Organization', ['photo']],
    ['Communication', ['payload.content.attachment']],
    ['CommunicationRequest', ['payload.content.attachment']],
    ['Contract', ['legal.contentAttachment', 'rule.contentAttachment']]
]);


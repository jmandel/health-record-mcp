import type { ConditionNode } from "../types/priorAuthTypes";
import type { FullEHR, ProcessedAttachment } from '../EhrApp';

// --- Interface for Agent Supporting Attachments (Moved from Orders2Tab) ---
export interface AgentSupportingAttachment {
    kind: 'ehr' | 'clinician'; // Distinguish origin
    title: string;
    content?: string | null; // Usually plaintext for EHR, always string for clinician
    contentType?: string; // From original EHR attachment
    originalSource?: { // Details if it came from EHR
        resourceType: string;
        resourceId: string;
        path: string; // JSON path within the source FHIR resource
    };
}

// --- Input Structure for the main function ---
export interface BuildEvidenceInput {
    criteriaTree: ConditionNode;
    endorsedSnippets: Record<string, { title: string; content: string; endorsed: boolean }>;
    fullEhrData: FullEHR | null;
    treatment: string;
    indication: string;
}

// --- Output Structure for the main function ---
export interface BuildEvidenceOutput {
    criteriaMetTree: ConditionNode; // The final tree
    filteredEhr: FullEHR;
}

// --- Main Function Definition ---
export const buildEvidence = (input: BuildEvidenceInput): BuildEvidenceOutput => {
    console.log("[buildEvidence] Building evidence payload...");
    const { criteriaTree, endorsedSnippets, fullEhrData, treatment, indication } = input;

    // 1. Extract FHIR sources cited in the final criteria tree
    const fhirSources = extractFhirSources(criteriaTree);
    console.log("[buildEvidence] Extracted FHIR sources:", fhirSources);

    // 2. Filter the full FHIR data based on extracted sources
    const supportingFhirData = filterFhirDataBySources(fullEhrData?.fhir, fhirSources);
    console.log("[buildEvidence] Filtered FHIR data based on sources.");

    // 3. Filter original EHR attachments based on cited FHIR sources
    const citedEhrAttachments = filterAndMapEhrAttachments(fullEhrData?.attachments, fhirSources);
    console.log("[buildEvidence] Filtered and mapped EHR attachments.");

    // 4. Format the locally signed clinician snippets into ProcessedAttachment format
    const clinicianAttachments = mapClinicianSnippetsToAttachments(endorsedSnippets);
    console.log("[buildEvidence] Mapped clinician snippets.");

    // 5. Combine attachments
    const combinedAttachments = [...citedEhrAttachments, ...clinicianAttachments];

    // 6. Construct the final filteredEhr object
    const filteredEhr: FullEHR = {
        fhir: supportingFhirData,
        attachments: combinedAttachments
    };

    // 7. Construct the final output object
    const output: BuildEvidenceOutput = {
        criteriaMetTree: criteriaTree,
        filteredEhr: filteredEhr,
    };

    console.log("[buildEvidence] Evidence payload built:", output);
    return output;
};

// --- Helper Function Implementations (Moved from Orders2Tab) ---

// Helper function to extract FHIR sources from criteria tree
export const extractFhirSources = (node: ConditionNode): Set<string> => {
  const sources = new Set<string>();
  if (node.evidence) {
    node.evidence.forEach(e => {
      if (e.fhirSource) {
        sources.add(e.fhirSource);
      }
    });
  }
  if (node.conditions) {
    node.conditions.forEach(child => {
      extractFhirSources(child).forEach(source => sources.add(source));
    });
  }
  return sources;
};

// Helper function to filter EHR FHIR data based on extracted sources
export const filterFhirDataBySources = (
    fullFhirData: Record<string, any[]> | undefined,
    fhirSources: Set<string>
): Record<string, any[]> => {
    const filteredData: Record<string, any[]> = {};
    if (!fullFhirData) return filteredData;

    fhirSources.forEach(sourceString => {
        // --- Skip non-FHIR sources --- 
        if (sourceString.startsWith('QuestionnaireResponse/')) {
            console.log(`[buildEvidence] Skipping QuestionnaireResponse source: ${sourceString}`);
            return; // Ignore these pseudo-sources for FHIR filtering
        }
        // -------------------------

        const [resourceType, resourceId] = sourceString.split('/');
        if (!resourceType || !resourceId) {
            console.warn(`[buildEvidence] Invalid fhirSource format encountered: ${sourceString}`);
            return; // Skip invalid formats
        }

        const resourcesOfType = fullFhirData[resourceType];
        if (resourcesOfType) {
            const matchingResource = resourcesOfType.find(res => res.id === resourceId);
            if (matchingResource) {
                if (!filteredData[resourceType]) {
                    filteredData[resourceType] = [];
                }
                // Avoid adding duplicates if cited multiple times
                if (!filteredData[resourceType].some(existing => existing.id === resourceId)) {
                    filteredData[resourceType].push(matchingResource);
                }
            } else {
                 console.warn(`[buildEvidence] FHIR resource not found in ehrData: ${sourceString}`);
            }
        } else {
             console.warn(`[buildEvidence] Resource type not found in ehrData for source: ${sourceString}`);
        }
    });

    return filteredData;
};

// --- NEW: Renamed/Refined helper to filter AND map EHR attachments ---
const filterAndMapEhrAttachments = (
    originalAttachments: any[] | undefined, // Should be ProcessedAttachment[]
    fhirSources: Set<string>
): ProcessedAttachment[] => {
    const matchingAttachments: ProcessedAttachment[] = [];
    if (!originalAttachments) return matchingAttachments;

    originalAttachments.forEach(att => {
        // Basic check for ProcessedAttachment structure
        if (!att.resourceType || !att.resourceId || !att.path || !att.contentType || typeof att.contentPlaintext === 'undefined' || !att.json) {
             // console.warn("Skipping original attachment missing required fields:", att);
             return;
        }

        const sourceString = `${att.resourceType}/${att.resourceId}`;
        if (fhirSources.has(sourceString)) {
            // Attachment already matches ProcessedAttachment, just push it
            matchingAttachments.push(att as ProcessedAttachment); 
        }
    });
    return matchingAttachments;
};

// --- NEW: Helper function to map clinician snippets to ProcessedAttachment format ---
const mapClinicianSnippetsToAttachments = (
    localSnippets: Record<string, { title: string; content: string; endorsed: boolean }>
): ProcessedAttachment[] => {
    return Object.entries(localSnippets)
        // Ensure we only include endorsed snippets with actual content
        .filter(([key, snippet]) => snippet.endorsed && snippet.content && snippet.content.trim() !== '')
        .map(([key, snippet]) => { // Key is the questionId
             // Create a ProcessedAttachment-like object using QuestionnaireResponse convention
             const attachment: ProcessedAttachment = {
                 resourceType: "QuestionnaireResponse", 
                 resourceId: key,                      
                 path: "text.div", 
                 contentType: "text/plain",
                 contentPlaintext: snippet.content,
                 json: JSON.stringify({ 
                     title: snippet.title, 
                     endorsed: snippet.endorsed, 
                     originalKey: key 
                 })
             };
             return attachment;
        });
};

// --- REMOVED OLD HELPERS ---
// filterEhrAttachmentsBySources (replaced by filterAndMapEhrAttachments)
// formatClinicianSnippetsForAgent (replaced by mapClinicianSnippetsToAttachments) 
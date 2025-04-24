// Create file: src/tools.ts
import { z } from 'zod';
import _ from 'lodash';
import { createFhirRenderer } from './fhirToPlaintext.js'; // Import the renderer

import { FullEHR } from './EhrApp'; // Assuming clientTypes is in the parent directory

// --- Configuration ---
const GREP_CONTEXT_LENGTH = 200; // Characters before/after match - Increased from 50
const DEFAULT_PAGE_SIZE = 50; // Default number of hits per page
const DEFAULT_PAGE = 1; // Default page number
const PLAINTEXT_RENDER_LIMIT = 5 * 1024; // 5 KB limit for rendered resource plaintext
const JSON_RENDER_LIMIT = 10 * 1024;     // 10 KB limit for resource JSON string

// Map from ResourceType to ordered list of potential date fields (FHIRPath-like)
const RESOURCE_DATE_PATHS: Record<string, string[]> = {
    "AllergyIntolerance": [], // No obvious primary date
    "CarePlan": [], // Complex, relies on activity dates usually
    "CareTeam": [], // Period might exist, but not primary focus
    "Condition": [
        "onsetDateTime",
        "onsetPeriod.start",
        "recordedDate",
        "abatementDateTime", // Less preferred than onset/recorded
        "abatementPeriod.start",
        "extension(url='http://hl7.org/fhir/StructureDefinition/condition-assertedDate').valueDateTime",
        "meta.lastUpdated"
    ],
    "Coverage": [
        "period.start",
        "period.end" // Less preferred
    ],
    "Device": [
        "manufactureDate",
        "expirationDate"
    ],
    "DiagnosticReport": [
        "effectiveDateTime",
        "effectivePeriod.start",
        "issued",
        "meta.lastUpdated"
    ],
    "DocumentReference": [
        "date",
        "context.period.start",
        "extension(url='http://hl7.org/fhir/us/core/StructureDefinition/us-core-authentication-time').valueDateTime"
    ],
    "Encounter": [
        "period.start",
        "period.end", // Less preferred
        "meta.lastUpdated"
    ],
    "Goal": [
        "startDate",
        "target.dueDate"
    ],
    "Immunization": [
        "occurrenceDateTime"
    ],
    "Location": [],
    "Medication": [], // No date on resource itself
    "MedicationDispense": [
        "whenHandedOver"
    ],
    "MedicationRequest": [
        "authoredOn",
        // Nested extension example - needs specific handling
        "extension(url='http://hl7.org/fhir/us/core/StructureDefinition/us-core-medication-adherence').extension(url='dateAsserted').valueDateTime"
    ],
    "Observation": [
        "effectiveDateTime",
        "effectivePeriod.start",
        "effectiveInstant",
        "issued",
        "meta.lastUpdated"
    ],
    "Organization": [],
    "Patient": [
        "birthDate"
    ],
    "Practitioner": [],
    "PractitionerRole": [],
    "Procedure": [
        "performedDateTime",
        "performedPeriod.start"
    ],
    "Provenance": [
        "recorded"
    ],
    "QuestionnaireResponse": [
        "authored"
    ],
    "RelatedPerson": [],
    "ServiceRequest": [
        "occurrenceDateTime",
        "occurrencePeriod.start",
        "authoredOn"
    ],
    "Specimen": [] // Collection has period, but maybe not primary
};

// --- Tool Schemas ---

export const GrepRecordInputSchema = z.object({
    query: z.string().min(1).describe("The text string or JavaScript-style regular expression to search for (case-insensitive). Example: 'heart attack|myocardial infarction|mi'. Best for finding specific text/keywords or variations across *all* record parts (FHIR+notes). Use regex with `|` for related terms (e.g., `'diabetes|diabetic'`)."),
    resource_types: z.array(z.string()).optional().describe(
        `Optional list to filter the search scope. Supports FHIR resource type names (e.g., "Patient", "Observation") and the special keyword "Attachment".
        Behavior based on the list:
        - **If omitted or an empty list is provided:** Searches EVERYTHING - all FHIR resources and all attachment plaintext.
        - **List contains only FHIR types (e.g., ["Condition", "Procedure"]):** Searches ONLY the specified FHIR resource types AND the plaintext of attachments belonging *only* to those specified resource types.
        - **List contains only ["Attachment"]:** Searches ONLY the plaintext content of ALL attachments, regardless of which resource they belong to.
        - **List contains FHIR types AND "Attachment" (e.g., ["DocumentReference", "Attachment"]):** Searches the specified FHIR resource types (e.g., DocumentReference) AND the plaintext of ALL attachments (including those not belonging to the specified FHIR types).`
    ),
    resource_format: z.enum(['plaintext', 'json']).optional().default('plaintext').describe(
        "Determines the output format for matching FHIR *resources*. " +
        "'plaintext' (default): Shows the rendered plaintext representation of the resource. " +
        "'json': Shows the full FHIR JSON of the resource. " +
        "Matching *attachments* always show plaintext snippets."
    ),
    page_size: z.number().int().min(1).max(50).optional().describe("Number of hits to display per page (1-50). Defaults to 50."),
    page: z.number().int().min(1).optional().describe("Page number to display. Defaults to 1.")
});

/**
 * Extracts and formats the most relevant date from a FHIR resource based on predefined paths.
 * @param resource The FHIR resource object.
 * @returns Formatted date string (YYYY-MM-DD) or null.
 */
function extractResourceDate(resource: any): string | null {
    if (!resource || !resource.resourceType) {
        return null;
    }
    const paths = RESOURCE_DATE_PATHS[resource.resourceType] || [];
    if (paths.length === 0) {
        return null;
    }

    for (const path of paths) {
        let value: any = null;

        // Handle specific extension cases first
        if (path.startsWith('extension(url=')) {
            const urlMatch = path.match(/extension\(url='([^']+)'\)/);
            if (urlMatch && resource.extension) {
                const url = urlMatch[1];
                const extension = _.find(resource.extension, { url: url });
                if (extension) {
                    const remainingPath = path.substring(urlMatch[0].length + 1); // +1 for the dot
                    if (!remainingPath) { // e.g., extension(url='...').valueDateTime
                       // This case shouldn't happen with current map, expects .valueXXX
                    } else if (remainingPath.startsWith('value')) {
                         value = _.get(extension, remainingPath);
                    } else if (remainingPath.startsWith('extension(url=')) {
                        // Handle nested extension e.g., extension(url='...').extension(url='...').valueDateTime
                         const nestedUrlMatch = remainingPath.match(/extension\(url='([^']+)'\)/);
                         if (nestedUrlMatch && extension.extension) {
                            const nestedUrl = nestedUrlMatch[1];
                             const nestedExtension = _.find(extension.extension, { url: nestedUrl });
                             if (nestedExtension) {
                                const finalPathPart = remainingPath.substring(nestedUrlMatch[0].length + 1);
                                 value = _.get(nestedExtension, finalPathPart);
                             }
                         }
                    }
                }
            }
        } else {
            // Handle simple paths and period starts
            value = _.get(resource, path);
        }

        if (value && typeof value === 'string') {
            // Extract YYYY-MM-DD part from FHIR date/dateTime/instant
            const dateMatch = value.match(/^(\d{4}(-\d{2}(-\d{2})?)?)/);
            if (dateMatch && dateMatch[1]) {
                return dateMatch[1]; // Return YYYY or YYYY-MM or YYYY-MM-DD
            }
        }
    }

    return null; // No suitable date found
}

/**
 * Finds all occurrences of a regex in text and returns context snippets.
 * @param text The text to search within.
 * @param regex The regular expression (should have 'g' flag).
 * @param contextLen Number of characters before/after the match to include.
 * @returns Array of strings, each containing a context snippet.
 */
function findContextualMatches(text: string, regex: RegExp, contextLen: number): string[] {
    const snippets: string[] = [];
    let match;

    // Ensure regex has global flag for exec loop
    const globalRegex = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');

    while ((match = globalRegex.exec(text)) !== null) {
        const matchStart = match.index;
        const matchEnd = matchStart + match[0].length;

        const contextStart = Math.max(0, matchStart - contextLen);
        const contextEnd = Math.min(text.length, matchEnd + contextLen);

        const prefix = text.substring(contextStart, matchStart);
        const suffix = text.substring(matchEnd, contextEnd);

        // Construct snippet without highlighting and remove newlines
        let snippet = `...${prefix}${match[0]}${suffix}...`;
        snippet = snippet.replace(/\r?\n|\r/g, ' '); // More robust replacement for \n, \r\n, \r
        snippets.push(snippet);

         // Prevent infinite loops for zero-length matches
         if (match[0].length === 0) {
            globalRegex.lastIndex++;
        }
    }
    return snippets;
}

// --- REFACTORED grepRecordLogic ---
interface GrepResourceHit {
    resource_ref: string;
    resource_type: string;
    resource_id: string;
    rendered_content: string | object; // Plaintext string or JSON object
    date: string | null;
    format: 'plaintext' | 'json'; // The format used for this hit
    match_found_in_json: boolean; // True if the regex matched the resource JSON itself
    content_truncated: boolean; // True if rendered_content was truncated
}

interface GrepAttachmentHit {
    resource_ref: string; // Reference to the resource owning the attachment
    resource_type: string;
    resource_id: string;
    path: string; // Path within the owning resource
    contentType?: string;
    content_plaintext?: string;
    context_snippets: string[];
    date: string | null; // Date extracted from the owning resource
}

// --- Define the NEW richer return type ---
export interface GrepResult {
    markdown: string;
    filteredEhr: FullEHR;
}

export async function grepRecordLogic(
    fullEhr: FullEHR,
    query: string,
    inputResourceTypes?: string[],
    resourceFormat: 'plaintext' | 'json' = 'plaintext', // New parameter
    pageSize: number = DEFAULT_PAGE_SIZE,
    page: number = DEFAULT_PAGE
): Promise<GrepResult> { // Changed return type

    // --- Instantiate Renderer ---
    let renderResource: (resource: any) => string;
    try {
        renderResource = createFhirRenderer(fullEhr);
    } catch (rendererError: any) {
        console.error(`[GREP Logic] Failed to create FHIR renderer:`, rendererError);
        // Return error within the new structure
        return {
            markdown: `**Error:** Failed to initialize resource renderer. Cannot proceed. ${rendererError.message}`,
            filteredEhr: { fhir: {}, attachments: [] }
        };
    }
    // --- End Renderer Instantiation ---


    let regex: RegExp;
    let originalQuery = query; // Keep original for reporting
    try {
        // Ensure regex is case-insensitive and global for snippet extraction
        if (query.startsWith('/') && query.endsWith('/')) query = query.slice(1, -1);
        regex = new RegExp(query, 'gi'); // Add 'g' flag
        console.error(`[GREP Logic] Using regex: ${regex}`);
    } catch (e: any) {
        console.error(`[GREP Logic] Invalid regex: "${originalQuery}"`, e);
        // Return error within the new structure
        return {
            markdown: `**Error:** Invalid regular expression provided: \`${originalQuery}\`. ${e.message}`,
            filteredEhr: { fhir: {}, attachments: [] }
        };
    }

    // Store hits before pagination
    const allResourceHits: GrepResourceHit[] = [];
    const allAttachmentHits: GrepAttachmentHit[] = [];

    // --- NEW: Store matched EHR data ---
    const matchedFhirResources: { [type: string]: { [id: string]: any } } = {};
    const matchedAttachments = new Map<string, FullEHR['attachments'][0]>(); // Use Map for uniqueness based on ref#path

    let resourcesSearched = 0;
    let attachmentsSearched = 0;
    // const matchedResourceRefs = new Set<string>(); // Still useful? Maybe not if we collect objects directly
    // const matchedAttachmentRefs = new Set<string>(); // Still useful? Maybe not if we collect objects directly

    const searchOnlyAttachments = inputResourceTypes?.length === 1 && inputResourceTypes[0] === "Attachment";
    let typesForResourceSearch: string[] = [];
    let typesForAttachmentFilter: string[] | null = null;

    // Determine search scope based on inputResourceTypes
    if (searchOnlyAttachments) {
        typesForResourceSearch = [];
        typesForAttachmentFilter = null;
        console.error("[GREP Logic] Scope: Attachments Only");
    } else if (!inputResourceTypes || inputResourceTypes.length === 0) {
        typesForResourceSearch = Object.keys(fullEhr.fhir);
        typesForAttachmentFilter = null;
        console.error("[GREP Logic] Scope: All Resources and All Attachments (Default)");
    } else {
        typesForResourceSearch = inputResourceTypes.filter(t => t !== "Attachment");
        if (inputResourceTypes.includes("Attachment")) {
            typesForAttachmentFilter = null;
            console.error(`[GREP Logic] Scope: Resources [${typesForResourceSearch.join(', ')}] and ALL Attachments`);
        } else {
            typesForAttachmentFilter = typesForResourceSearch;
            console.error(`[GREP Logic] Scope: Resources [${typesForAttachmentFilter.join(', ')}] and their specific Attachments`);
        }
    }

    // 1. Search FHIR Resources
    if (typesForResourceSearch.length > 0) {
        console.error(`[GREP Logic] Searching ${typesForResourceSearch.length} resource types for format '${resourceFormat}'...`);
        for (const resourceType of typesForResourceSearch) {
            const resources = fullEhr.fhir[resourceType] || [];
            for (const resource of resources) {
                 if (!resource || typeof resource !== 'object' || !resource.resourceType || !resource.id) {
                     console.warn(`[GREP Logic] Skipping invalid resource structure in type '${resourceType}'.`); continue;
                 }
                resourcesSearched++;
                const resourceRef = `${resource.resourceType}/${resource.id}`;
                // Don't search again if already found
                // if (matchedResourceRefs.has(resourceRef)) continue; // Check collection instead?

                let matchFound = false;
                let renderedContent: string | object = {};
                let contentTruncated = false;

                try {
                    const resourceString = JSON.stringify(resource);
                    if (regex.test(resourceString)) {
                        matchFound = true;
                        regex.lastIndex = 0; // Reset regex index after test
                    }
                } catch (stringifyError) {
                     console.warn(`[GREP Logic] Error stringifying resource ${resourceRef}:`, stringifyError);
                     // Store error as rendered content? For now, skip adding the hit.
                     continue; 
                }

                if (matchFound) {
                    // --- Collect matching resource ---
                    if (!matchedFhirResources[resourceType]) {
                        matchedFhirResources[resourceType] = {};
                    }
                    // Store unique resource by ID within its type
                    matchedFhirResources[resourceType][resource.id] = resource;
                    // --- End collection ---

                    const date = extractResourceDate(resource);

                    // Render or get JSON based on format
                    if (resourceFormat === 'plaintext') {
                        try {
                            let plaintext = renderResource(resource); // Use the instantiated renderer
                            if (plaintext.length > PLAINTEXT_RENDER_LIMIT) {
                                renderedContent = plaintext.substring(0, PLAINTEXT_RENDER_LIMIT) + "\n\n[... Plaintext rendering truncated due to size limit ...]";
                                contentTruncated = true;
                                console.warn(`[GREP Logic] Truncated plaintext for ${resourceRef}`);
                            } else {
                                renderedContent = plaintext;
                            }
                        } catch (renderError: any) {
                            console.error(`[GREP Logic] Error rendering resource ${resourceRef} to plaintext:`, renderError);
                            renderedContent = `[Error rendering resource to plaintext: ${renderError.message}]`;
                            contentTruncated = true; // Mark as truncated due to error
                        }
                    } else { // resourceFormat === 'json'
                        try {
                            const jsonString = JSON.stringify(resource, null, 2);
                            if (jsonString.length > JSON_RENDER_LIMIT) {
                                // Just store a message, not the truncated JSON object
                                renderedContent = `"[FHIR JSON truncated due to size limit (${(jsonString.length/1024).toFixed(0)} KB > ${(JSON_RENDER_LIMIT/1024).toFixed(0)} KB)]"`;
                                contentTruncated = true;
                                console.warn(`[GREP Logic] Truncated JSON for ${resourceRef}`);
                            } else {
                                renderedContent = resource; // Store the actual JSON object
                            }
                        } catch (jsonError: any) {
                             console.error(`[GREP Logic] Error stringifying resource ${resourceRef} for JSON output:`, jsonError);
                            renderedContent = `"[Error preparing resource JSON: ${jsonError.message}]"`;
                            contentTruncated = true; // Mark as truncated due to error
                        }
                    }

                    allResourceHits.push({
                        resource_ref: resourceRef,
                        resource_type: resource.resourceType,
                        resource_id: resource.id,
                        rendered_content: renderedContent,
                        date: date,
                        format: resourceFormat,
                        match_found_in_json: true, // Match was in the resource itself
                        content_truncated: contentTruncated
                    });
                }
            }
        }
        console.error(`[GREP Logic] Found matches in ${Object.values(matchedFhirResources).reduce((sum, typeMap) => sum + Object.keys(typeMap).length, 0)} unique resources after searching ${resourcesSearched}.`);
    } else {
        console.error("[GREP Logic] Skipping resource search based on scope.");
    }


    // 2. Select and Search Attachments (Prioritize one per source resource, ALWAYS return snippets)
    console.error(`[GREP Logic] Grouping and selecting best attachment from ${fullEhr.attachments.length} total attachments...`);

     const contentTypePriority: { [key: string]: number } = {
        'text/plain': 1,
        'text/html': 2,
        'text/rtf': 3,
        'text/xml': 4
        // Other types have lower priority (Infinity)
    };

    // Store the *anchor* resource with the best attachment for date extraction later
    const bestAttachmentPerSource: { [sourceRef: string]: { attachment: FullEHR['attachments'][0], anchorResource: any | null } } = {};

    for (const attachment of fullEhr.attachments) {
        if (!attachment || !attachment.resourceType || !attachment.resourceId || !attachment.path) {
            console.warn(`[GREP Logic] Skipping invalid attachment structure during selection.`); continue;
        }
        attachmentsSearched++; // Count every attachment encountered
        const sourceRef = `${attachment.resourceType}/${attachment.resourceId}`;
        
        // --- Attachment Filtering Logic ---
        // Skip if we are filtering by resource type and this attachment's type doesn't match
        if (typesForAttachmentFilter && !typesForAttachmentFilter.includes(attachment.resourceType)) {
            continue; 
        }
        // --- End Filtering ---

        const currentBestData = bestAttachmentPerSource[sourceRef];
        const currentPriority = attachment.contentType ? (contentTypePriority[attachment.contentType.split(';')[0].trim()] ?? Infinity) : Infinity; // Handle content-type parameters like charset
        const bestPriority = currentBestData?.attachment.contentType ? (contentTypePriority[currentBestData.attachment.contentType.split(';')[0].trim()] ?? Infinity) : Infinity;

        if (!currentBestData || currentPriority < bestPriority) {
            // Find the anchor resource to store alongside the attachment for date extraction
            const anchorResource = (fullEhr.fhir[attachment.resourceType] || []).find(r => r.id === attachment.resourceId) || null;
            bestAttachmentPerSource[sourceRef] = { attachment: attachment, anchorResource: anchorResource };
        }
    }

    const selectedAttachmentsData = Object.values(bestAttachmentPerSource);
    console.error(`[GREP Logic] Selected ${selectedAttachmentsData.length} unique source attachments for searching (Filter: ${typesForAttachmentFilter ? `Only types [${typesForAttachmentFilter.join(', ')}]` : 'All'})...`);


    // Now search *oney* the selected attachments for snippets
    let totalSnippetsFound = 0; // Reset snippet count for attachments only
    for (const { attachment, anchorResource } of selectedAttachmentsData) {
        const attachmentRefKey = `${attachment.resourceType}/${attachment.resourceId}#${attachment.path}`; // Key for uniqueness

        // --- Skip if already processed (check the map) ---
        if (matchedAttachments.has(attachmentRefKey)) continue;

        if (attachment.contentPlaintext && typeof attachment.contentPlaintext === 'string' && attachment.contentPlaintext.length > 0) {
            const snippets = findContextualMatches(attachment.contentPlaintext, regex, GREP_CONTEXT_LENGTH);
            if (snippets.length > 0) {
                // --- Collect matching attachment ---
                matchedAttachments.set(attachmentRefKey, attachment);
                // Also ensure the *owning* resource is collected if not already
                if (anchorResource && !matchedFhirResources[anchorResource.resourceType]?.[anchorResource.id]) {
                    if (!matchedFhirResources[anchorResource.resourceType]) matchedFhirResources[anchorResource.resourceType] = {};
                    matchedFhirResources[anchorResource.resourceType][anchorResource.id] = anchorResource;
                    console.log(`[GREP Logic] Added owning resource ${anchorResource.resourceType}/${anchorResource.id} due to attachment match.`);
                }
                // --- End collection ---

                totalSnippetsFound += snippets.length;
                const date = extractResourceDate(anchorResource); // Extract date from anchor
                allAttachmentHits.push({
                    resource_ref: `${attachment.resourceType}/${attachment.resourceId}`, // Reference to the owner
                    resource_type: attachment.resourceType,
                    resource_id: attachment.resourceId,
                    path: attachment.path,
                    contentType: attachment.contentType,
                    content_plaintext: attachment.contentPlaintext,
                    context_snippets: snippets,
                    date: date
                });
            }
        }
    }
    console.error(`[GREP Logic] Found matches in ${matchedAttachments.size} unique attachments (total ${totalSnippetsFound} snippets).`);

    // --- Pagination and Formatting ---
    const totalResources = allResourceHits.length;
    const totalAttachments = allAttachmentHits.length;
    const totalResults = totalResources + totalAttachments;
    const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
    const normalizedPage = Math.min(Math.max(1, page), totalPages);
    const startIndex = (normalizedPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalResults);

    // Sort all hits by date (most recent first) if date is available
    const sortHits = <T extends { date: string | null }>(hits: T[]): T[] => {
        return [...hits].sort((a, b) => {
            if (!a.date && !b.date) return 0;
            if (!a.date) return 1;
            if (!b.date) return -1;
            return b.date.localeCompare(a.date); // Most recent first
        });
    };

    const sortedResourceHits = sortHits(allResourceHits);
    const sortedAttachmentHits = sortHits(allAttachmentHits);

    // Combine and paginate the sorted hits
    const allCombinedHits: (GrepResourceHit | GrepAttachmentHit)[] = [...sortedResourceHits, ...sortedAttachmentHits];
    const paginatedHits = allCombinedHits.slice(startIndex, endIndex);

    console.error(`[GREP Logic] Pagination: Page ${normalizedPage}/${totalPages}, showing markdown for ${paginatedHits.length} of ${totalResults} total matching resources/attachments`);

    // 3. Format results as Markdown
    let markdownOutput = `## Grep Results for \`${originalQuery.replace(/`/g, '\\`')}\`\n\n`;
    markdownOutput += `Searched ${resourcesSearched} resources and ${attachmentsSearched} attachments. Found ${totalResources} matching resources and ${totalAttachments} matching attachments.\n\n`;
    markdownOutput += `**Page ${normalizedPage} of ${totalPages}** (${pageSize} matching resources/attachments per page)\n\n`;

    if (totalResults === 0) {
        markdownOutput += "**No matches found.**\n";
    } else {
        // Iterate through paginated combined hits
        for (const hit of paginatedHits) {
            const dateString = hit.date ? ` (${hit.date})` : '';

            // Check if it's a Resource Hit
            if ('rendered_content' in hit) {
                // --- REMOVED PLAINTEXT HEADER LOGIC ---
                // Default header only used for JSON now
                const header = `### Resource: ${hit.resource_ref}${dateString}`;

                if (hit.format === 'plaintext') {
                    let renderedString = (typeof hit.rendered_content === 'string' ? hit.rendered_content : '[Error: Expected plaintext string, got object]');

                    // Prepend truncation warning if necessary
                    if (hit.content_truncated) {
                        markdownOutput += `_(Content truncated due to size limits or error)_\n`;
                    }
                    // Split into lines, modify the first line, rejoin
                    const lines = renderedString.split('\n');
                    if (lines.length > 0) {
                        lines[0] = `${lines[0]} (Ref: ${hit.resource_ref})`; // Append ref to first line
                    }
                    const finalRenderedString = lines.join('\n');

                    markdownOutput += finalRenderedString; // Print the modified content
                    markdownOutput += "\n\n";

                } else { // format === 'json'
                    // Use the default header for JSON
                    markdownOutput += header + '\n';
                    if (hit.content_truncated) {
                        markdownOutput += `_(Content truncated due to size limits or error)_\n`;
                    }
                    markdownOutput += "```json\n";
                    if (typeof hit.rendered_content === 'object') {
                        markdownOutput += JSON.stringify(hit.rendered_content, null, 2);
                    } else {
                        // If truncated, rendered_content is already a string message
                        markdownOutput += hit.rendered_content;
                    }
                    markdownOutput += "\n```\n\n";
                }
            }
            // Check if it's an Attachment Hit
            else if ('context_snippets' in hit) {
                markdownOutput += `### Attachment Snippets for ${hit.resource_ref}${dateString}\n`;
                markdownOutput += `Path: \`${hit.path.replace(/`/g, '\\`')}\`\n`;
                if (hit.contentType) {
                    markdownOutput += `Content-Type: \`${hit.contentType.replace(/`/g, '\\`')}\`\n`;
                }
                markdownOutput += "Matching Snippets:\n";
                // Show all snippets
                for (const snippet of hit.context_snippets) {
                    // Simple Markdown escaping for snippets
                    let escapedSnippet = snippet.replace(/([*_[\]()``\\\\])/g, '\\$1');

                    // Simplified formatting: Always use list item since newlines are removed
                    markdownOutput += `* ${escapedSnippet}\n`;
                }
                if (hit.content_plaintext) {
                    markdownOutput += `\n\n**Full Content:**\n\n${hit.content_plaintext}\n\n`;
                }
                markdownOutput += "\n";
            }
        }

    }

    markdownOutput += "---";

    // --- Construct the filteredEhr object ---
    const finalFilteredFhir: FullEHR['fhir'] = {};
    for (const type in matchedFhirResources) {
        finalFilteredFhir[type] = Object.values(matchedFhirResources[type]);
    }

    const finalFilteredAttachments = Array.from(matchedAttachments.values());

    const filteredEhrResult: FullEHR = {
        fhir: finalFilteredFhir,
        attachments: finalFilteredAttachments
    };

    console.log(`[GREP Logic] Constructed filteredEhr with ${Object.keys(finalFilteredFhir).length} resource types and ${finalFilteredAttachments.length} attachments.`);

    // --- Return the final result object ---
    return {
        markdown: markdownOutput,
        filteredEhr: filteredEhrResult
    };
}


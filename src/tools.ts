// Create file: src/tools.ts
import { z } from 'zod';
import _ from 'lodash';
import { Database } from 'bun:sqlite';
import vm from 'vm';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { createFhirRenderer } from './fhirToPlaintext.js'; // Import the renderer

import { ClientFullEHR } from '../clientTypes.js'; // Import using relative path

// --- Configuration ---
const MAX_GREP_JSON_LENGTH = 2 * 1024 * 1024; // 2 MB limit - Applies to overall output? Revisit.
const MAX_QUERY_JSON_LENGTH = 500 * 1024;      // 500 KB limit
const MAX_EVAL_JSON_LENGTH = 1 * 1024 * 1024;  // 1 MB limit
const MAX_QUERY_ROWS = 500; // Limit rows for query results before stringification check
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

// --- Grep Output Schemas ---

export const QueryRecordInputSchema = z.object({
    sql: z.string().min(1).describe("The read-only SQL SELECT statement to execute against the in-memory FHIR data. FHIR resources are stored in the 'fhir_resources' table with columns 'resource_type', 'resource_id', and 'json'. For example, 'SELECT json FROM fhir_resources WHERE resource_type = \"Patient\"' or 'SELECT json FROM fhir_resources WHERE resource_type = \"Observation\" AND json LIKE \"%diabetes%\"'. Best for precisely selecting specific FHIR resources or fields using known structure (e.g., Observations by LOINC). Limited to structured FHIR data.")
});
export const QueryRecordOutputSchema = z.union([
    z.array(z.record(z.unknown())).describe("An array of rows returned by the SQL query. Each row is an object where keys are column names."),
    z.object({
        warning: z.string().optional(),
        error: z.string().optional(),
        truncated_results: z.array(z.record(z.unknown())).optional()
    }).describe("Object indicating truncated results or an error during processing/truncation.")
]);

// TODO: Define AskQuestion schemas if this tool is re-enabled
// export const AskQuestionInputSchema = z.object({
//     question: z.string().min(1).describe("The natural language question to ask about the patient's record.")
// });
// export const AskQuestionOutputSchema = z.object({ answer: z.string() }).describe("The natural language answer generated by the LLM based on the record context."); // Simple wrapper for now

// TODO: Define ResyncRecord schemas if this tool is re-enabled
// export const ResyncRecordInputSchema = z.object({}).describe("No arguments needed.");
// export const ResyncRecordOutputSchema = z.object({ message: z.string() }).describe("A confirmation message indicating the outcome of the resync attempt.");


export const EvalRecordInputSchema = z.object({
    code: z.string().min(1).describe(
        `A string containing the body of an async JavaScript function.
        This function receives the following arguments:
        1. 'fullEhr': An object containing the patient's EHR data (ClientFullEHR format):
           - 'fullEhr.fhir': An object where keys are FHIR resource type strings (e.g., "Patient", "Observation") and values are arrays of the corresponding FHIR resource JSON objects.
           - 'fullEhr.attachments': An array of processed attachment objects (ClientProcessedAttachment format from 'clientTypes.ts'). Each object includes:
             - 'resourceType', 'resourceId', 'path', 'contentType'
             - 'contentPlaintext': The extracted plaintext content (string or null).
             - 'contentBase64': Raw content encoded as a base64 string (string or null).
             - 'json': The original JSON string of the attachment node.
        2. 'console': A limited console object with 'log', 'warn', and 'error' methods that capture output.
        3. '_': The Lodash library (v4). Useful for data manipulation (e.g., _.find, _.map, _.filter).
        4. 'Buffer': The Node.js Buffer class. Useful for operations like base64 decoding (e.g., Buffer.from(base64String, 'base64').toString('utf8')).

        The function MUST conclude with a 'return' statement specifying the JSON-serializable value to send back.
        Do NOT define the function signature ('async function(...) { ... }') within the code string, only provide the body.
        Console output will be captured separately and returned alongside the function's result or any execution errors.

        Example Input (Note: Access .contentBase64 for binary, .contentPlaintext for text):
        {
          "code": "const conditions = fullEhr.fhir['Condition'] || [];\\nconst activeProblems = conditions.filter(c => c.clinicalStatus?.coding?.[0]?.code === 'active');\\nconst diabeteConditions = activeProblems.filter(c => JSON.stringify(c.code).toLowerCase().includes('diabete'));\\n\\n// Get patient name (handle potential missing data)\\nconst patient = (fullEhr.fhir['Patient'] || [])[0];\\nlet patientName = 'Unknown';\\nif (patient && patient.name && patient.name[0]) {\\n  patientName = \`\${patient.name[0].given?.join(' ') || ''} \${patient.name[0].family || ''}\`.trim();\\n}\\n\\nconsole.log(\`Found \${diabeteConditions.length} active diabetes condition(s) for patient \${patientName}.\`);\\n\\n// Find PDF attachments\\nconst pdfAttachments = fullEhr.attachments.filter(a => a.contentType === 'application/pdf');\\nconsole.warn(\`Found \${pdfAttachments.length} PDF attachments.\`);\\n\\n// Example of decoding base64 (if needed, check contentPlaintext first!)\\nconst firstAttachment = fullEhr.attachments[0];\\nif (firstAttachment && firstAttachment.contentBase64) {\\n try {\\n   // Only decode if contentPlaintext wasn't useful\\n   // const decodedText = Buffer.from(firstAttachment.contentBase4, 'base64').toString('utf8');\\n   // console.log('Decoded snippet:', decodedText.substring(0, 50));\\n } catch (e) { console.error('Error decoding base64 for first attachment'); }\\n}\\n\\nreturn { \\n  patient: patientName,\\n  activeDiabetesCount: diabeteConditions.length,\\n  diabetesDetails: diabeteConditions.map(c => ({ id: c.id, code: c.code?.text || JSON.stringify(c.code), onset: c.onsetDateTime || c.onsetAge?.value }))\\n};"
        }
        Most flexible tool. Best for complex analysis, calculations, combining data from multiple resource types/attachments, or custom output formatting. Use when \`grep\` or \`query\` alone are insufficient.`
    )
});


export const EvalRecordOutputSchema = z.object({
    result: z.any().optional().describe("The JSON-serializable result returned by the executed code (if successful). Will be 'undefined' if the code threw an error or did not return a value. Can be '[Result omitted due to excessive size]' if truncated."),
    logs: z.array(z.string()).describe("An array of messages logged via console.log or console.warn during execution. Can contain truncation messages."),
    errors: z.array(z.string()).describe("An array of messages logged via console.error during execution, or internal execution errors (like timeouts or syntax errors). Can contain truncation messages.")
}).describe("The result of executing the provided JavaScript code against the patient record, including the returned value and captured console output/errors.");

// --- Read Resource Schemas ---
export const ReadResourceInputSchema = z.object({
    resourceType: z.string().describe("The FHIR resource type (e.g., 'Patient', 'Observation')."),
    resourceId: z.string().describe("The ID of the FHIR resource.")
});
export const ReadResourceOutputSchema = z.object({
    resource: z.record(z.unknown()).nullable().describe("The full FHIR resource JSON object, or null if not found."),
    error: z.string().optional().describe("Error message if the resource could not be retrieved.")
}).describe("The requested FHIR resource.");
// --- End Read Resource Schemas ---

// --- Read Attachment Schema (Input Only) ---
export const ReadAttachmentInputSchema = z.object({
    resourceType: z.string().describe("The FHIR resource type the attachment belongs to."),
    resourceId: z.string().describe("The ID of the FHIR resource the attachment belongs to."),
    attachmentPath: z.string().describe("The JSON path within the source resource where the attachment is located (e.g., 'content.attachment', 'photo[0]'). Provided by the grep tool."),
    includeRawBase64: z.boolean().optional().default(false).describe("Set to true to include the raw base64 content in the response. Defaults to false.")
});
// --- End Read Attachment Schema ---


// --- Logic Functions ---

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
 * Truncates SQL query results if they exceed limits (row count or stringified size).
 *
 * @param results The array of result rows from the SQL query.
 * @param limit The maximum allowed length of the JSON string.
 * @returns The original results array, or a truncation object { warning, truncated_results, error }.
 */
function truncateQueryResults(results: Record<string, unknown>[], limit: number): any {
    try {
        // 1. Check row limit first
        const originalRowCount = results.length;
        let potentiallyTruncatedResults = results;
        let rowLimitWarning: string | null = null;

        if (originalRowCount > MAX_QUERY_ROWS) {
            potentiallyTruncatedResults = results.slice(0, MAX_QUERY_ROWS);
            rowLimitWarning = `Result limited to first ${potentiallyTruncatedResults.length} of ${originalRowCount} rows.`;
            console.warn(`[TRUNCATE QUERY] Row limit exceeded (${originalRowCount} > ${MAX_QUERY_ROWS}).`);
        }

        // 2. Check JSON size limit on (potentially row-limited) results
        let jsonString = JSON.stringify(potentiallyTruncatedResults);

        if (jsonString.length <= limit) {
            // If only row limit was applied, return the truncation object structure
            if (rowLimitWarning) {
                return { warning: rowLimitWarning, truncated_results: potentiallyTruncatedResults };
            }
            return potentiallyTruncatedResults; // Return original array if no limits hit
        }

        // 3. Apply size limit truncation (which means returning only the warning object)
        console.warn(`[TRUNCATE QUERY] Size limit exceeded (${(jsonString.length / 1024).toFixed(0)} KB > ${(limit / 1024).toFixed(0)} KB).`);

        const sizeLimitWarning = `Result truncated due to size limit (${(limit / 1024).toFixed(0)} KB).` +
                                (rowLimitWarning ? ` (Already limited to ${potentiallyTruncatedResults.length} rows)` : ` Original query returned ${originalRowCount} rows.`);

        // For size limit, we cannot return any results, just the warning.
        // We prioritize the size warning message.
        const truncatedData = {
            warning: sizeLimitWarning,
            // truncated_results: [] // Or potentially a very small subset if needed, but let's omit for now
        };

        // Final check: Stringify the *warning object itself* and see if it's too large (highly unlikely)
        let finalJsonString = JSON.stringify(truncatedData);
        if (finalJsonString.length > limit) {
            console.error(`[TRUNCATE QUERY] Result STILL too large after size truncation (warning object too big).`);
            return { error: "Result too large to return, even after truncation." };
        }

        return truncatedData;

    } catch (stringifyError: any) {
        console.error(`[TRUNCATE QUERY] Error during stringification/truncation:`, stringifyError);
        return { error: `Internal error during result processing/truncation: ${stringifyError.message}` };
    }
}

/**
 * Truncates Eval tool output if its stringified representation exceeds a limit.
 *
 * @param output The EvalRecordOutputSchema object (result, logs, errors).
 * @param limit The maximum allowed length of the JSON string.
 * @returns The potentially modified output object.
 */
function truncateEvalResult(output: z.infer<typeof EvalRecordOutputSchema>, limit: number): any {
    try {
        let jsonString = JSON.stringify(output);
        if (jsonString.length <= limit) {
            return output; // No truncation needed
        }

        console.warn(`[TRUNCATE EVAL] Result exceeds limit (${(jsonString.length / 1024).toFixed(0)} KB > ${(limit / 1024).toFixed(0)} KB), applying truncation.`);

        let truncatedData: any;
        let warningMessage = `Result truncated due to size limit (${(limit / 1024).toFixed(0)} KB).`;

        // Prioritize errors > logs > result
        const originalLogs = output.logs || [];
        const originalErrors = output.errors || [];
        truncatedData = {
            result: "[Result omitted due to excessive size]",
            logs: originalLogs.slice(0, 20),
            errors: [...originalErrors] // Copy original errors
        };
        warningMessage += " Result omitted, logs potentially truncated.";
        if (truncatedData.logs.length < originalLogs.length) {
            truncatedData.logs.push("... [Logs truncated due to size limit]");
        }
        // Add the primary warning to the errors array as well
        truncatedData.errors.push(`Execution result (or combined output) was too large to return fully. ${warningMessage}`);

         // Add the warning to the truncated data structure
         truncatedData.warning = warningMessage;


        // Final check: Stringify the *truncated* data and see if it's STILL too large
        let finalJsonString = JSON.stringify(truncatedData);
        if (finalJsonString.length > limit) {
            console.error(`[TRUNCATE EVAL] Result STILL too large after truncation.`);
            return { error: "Result too large to return, even after truncation.", logs: [], result: undefined, errors: ["Output exceeded size limit even after truncation."] };
        }

        return truncatedData; // Return the successfully truncated data object

    } catch (stringifyError: any) {
        console.error(`[TRUNCATE EVAL] Error during stringification/truncation:`, stringifyError);
        return { error: `Internal error during result processing/truncation: ${stringifyError.message}` };
    }
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
    context_snippets: string[];
    date: string | null; // Date extracted from the owning resource
}


export async function grepRecordLogic(
    fullEhr: ClientFullEHR,
    query: string,
    inputResourceTypes?: string[],
    resourceFormat: 'plaintext' | 'json' = 'plaintext', // New parameter
    pageSize: number = DEFAULT_PAGE_SIZE,
    page: number = DEFAULT_PAGE
): Promise<string> { // Returns Markdown string

    // --- Instantiate Renderer ---
    let renderResource: (resource: any) => string;
    try {
        renderResource = createFhirRenderer(fullEhr);
    } catch (rendererError: any) {
        console.error(`[GREP Logic] Failed to create FHIR renderer:`, rendererError);
        return `**Error:** Failed to initialize resource renderer. Cannot proceed. ${rendererError.message}`;
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
        return `**Error:** Invalid regular expression provided: \`${originalQuery}\`. ${e.message}`; // Return Markdown error
    }

    // Store hits before pagination
    const allResourceHits: GrepResourceHit[] = [];
    const allAttachmentHits: GrepAttachmentHit[] = [];

    let resourcesSearched = 0;
    let attachmentsSearched = 0;
    const matchedResourceRefs = new Set<string>(); // Track ResourceRefs with hits
    const matchedAttachmentRefs = new Set<string>(); // Track AttachmentRefs with hits

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
                if (matchedResourceRefs.has(resourceRef)) continue;

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
                    matchedResourceRefs.add(resourceRef);
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
        console.error(`[GREP Logic] Found matches in ${allResourceHits.length} resources after searching ${resourcesSearched}.`);
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
    const bestAttachmentPerSource: { [sourceRef: string]: { attachment: ClientFullEHR['attachments'][0], anchorResource: any | null } } = {};

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


    // Now search *only* the selected attachments for snippets
    let totalSnippetsFound = 0; // Reset snippet count for attachments only
    for (const { attachment, anchorResource } of selectedAttachmentsData) {
        const attachmentRef = `${attachment.resourceType}/${attachment.resourceId}#${attachment.path}`;

        // Don't search again if already found
        if (matchedAttachmentRefs.has(attachmentRef)) continue;

        if (attachment.contentPlaintext && typeof attachment.contentPlaintext === 'string' && attachment.contentPlaintext.length > 0) {
            const snippets = findContextualMatches(attachment.contentPlaintext, regex, GREP_CONTEXT_LENGTH);
            if (snippets.length > 0) {
                matchedAttachmentRefs.add(attachmentRef);
                totalSnippetsFound += snippets.length;
                const date = extractResourceDate(anchorResource); // Extract date from anchor
                allAttachmentHits.push({
                    resource_ref: `${attachment.resourceType}/${attachment.resourceId}`, // Reference to the owner
                    resource_type: attachment.resourceType,
                    resource_id: attachment.resourceId,
                    path: attachment.path,
                    contentType: attachment.contentType,
                    context_snippets: snippets,
                    date: date
                });
            }
        }
    }
    console.error(`[GREP Logic] Found matches in ${allAttachmentHits.length} attachments (total ${totalSnippetsFound} snippets).`);

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

    console.error(`[GREP Logic] Pagination: Page ${normalizedPage}/${totalPages}, showing ${paginatedHits.length} of ${totalResults} total matching resources/attachments`);

    // 3. Format results as Markdown
    let markdownOutput = `## Grep Results for \`${originalQuery.replace(/`/g, '\\`')}\`\n\n`;
    markdownOutput += `_(Hint: Use \`read_resource\` or \`read_attachment\` for full details on interesting hits. Format used for resources: \`${resourceFormat}\`)_\n\n`;
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
                let finalRenderedContent = '';
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
                markdownOutput += "\n";
            }
        }

        // Add pagination navigation links (same as before)
        if (totalPages > 1) {
            markdownOutput += "### Navigation\n\n";
            if (normalizedPage > 1) markdownOutput += `* Previous Page (${normalizedPage - 1}/${totalPages}): Use \`page=${normalizedPage - 1}\`\n`;
            if (normalizedPage < totalPages) markdownOutput += `* Next Page (${normalizedPage + 1}/${totalPages}): Use \`page=${normalizedPage + 1}\`\n`;
            if (totalPages > 5) markdownOutput += `* Jump to specific page (1-${totalPages}): Use \`page=X\`\n`;
            markdownOutput += "\n";
        }
    }

    markdownOutput += "---";
    return markdownOutput;
}

export async function queryRecordLogic(db: Database, sql: string): Promise<string> { // Returns JSON string
    console.error(`[SQL Logic] Executing query: ${sql.substring(0, 100)}${sql.length > 100 ? '...' : ''}`);

    // Basic validation to prevent modifications
    const sqlLower = sql.trim().toLowerCase();
    if (!sqlLower.startsWith('select')) {
        console.error("[SQL Logic] Validation failed: Query does not start with SELECT.");
        const errorResult = { error: "Only SELECT queries are allowed." };
        return JSON.stringify(errorResult, null, 2);
    }
    const writeKeywords = ['insert ', 'update ', 'delete ', 'drop ', 'create ', 'alter ', 'attach ', 'detach ', 'replace ', 'pragma '];
     if (writeKeywords.some(keyword => sqlLower.includes(keyword))) {
         if (!sqlLower.startsWith('pragma table_info') && !sqlLower.startsWith('pragma user_version')) {
            console.error(`[SQL Logic] Validation failed: Potentially harmful SQL keyword detected.`);
            const errorResult = { error: "Potentially harmful SQL operation detected. Only SELECT statements and specific PRAGMAs are permitted." };
            return JSON.stringify(errorResult, null, 2);
        }
     }

    try {
        // The .all() method returns unknown[], cast appropriately
        const results = await db.query(sql).all() as Record<string, unknown>[];
        console.error(`[SQL Logic] Query returned ${results.length} rows.`);

        // Truncate if needed
        const finalData = truncateQueryResults(results, MAX_QUERY_JSON_LENGTH);
        return JSON.stringify(finalData, null, 2);

    } catch (err: any) {
        console.error("[SQL Logic] Query execution error:", err);
        const errorResult = { error: `SQL execution failed: ${err.message}` };
        return JSON.stringify(errorResult, null, 2);
    }
}

export async function evalRecordLogic(
    fullEhr: ClientFullEHR,
    userCode: string
): Promise<string> { // Returns JSON string
    const logs: string[] = [];
    const errors: string[] = [];
    const MAX_LOG_MESSAGES = 100;

    console.error(`[EVAL Logic] Preparing to execute sandboxed code...`);

    const sandboxConsole = {
        log: (...args: any[]) => { if (logs.length < MAX_LOG_MESSAGES) logs.push(args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ')); else if (logs.length === MAX_LOG_MESSAGES) logs.push("... [Max log messages reached]"); },
        warn: (...args: any[]) => { if (logs.length < MAX_LOG_MESSAGES) logs.push(`WARN: ${args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ')}`); else if (logs.length === MAX_LOG_MESSAGES) logs.push("... [Max log messages reached]"); },
        error: (...args: any[]) => errors.push(`CONSOLE.ERROR: ${args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ')}`),
    };

    const sandbox = { fullEhr, console: sandboxConsole, _: _, Buffer: Buffer, __resultPromise__: undefined as Promise<any> | undefined };
    const scriptCode = `async function userFunction(fullEhr, console, _, Buffer) { "use strict"; ${userCode} }\n__resultPromise__ = userFunction(fullEhr, console, _, Buffer);`;
    const context = vm.createContext(sandbox);
    const script = new vm.Script(scriptCode, { filename: 'userCode.vm' });
    const timeoutMs = 5000;
    let executionResult: any = undefined;
    let executionError: Error | null = null;

    try {
        console.error(`[EVAL Logic] Executing sandboxed code (Timeout: ${timeoutMs}ms)...`);
        script.runInContext(context, { timeout: timeoutMs / 2, displayErrors: true });
        executionResult = await Promise.race([
            sandbox.__resultPromise__,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Async operation timed out')), timeoutMs))
        ]);
        console.error(`[EVAL Logic] Sandboxed code finished successfully.`);
    } catch (error: any) {
        console.error("[EVAL Logic] Error executing sandboxed code:", error);
        executionError = error; // Store error to include in final output
    }

    // Compile final output structure including result/logs/errors
    const finalOutput: z.infer<typeof EvalRecordOutputSchema> = {
        result: executionResult, // Might be undefined if error occurred
        logs: logs,
        errors: errors
    };

    // Add execution error message if one occurred
    if (executionError) {
        let errorMessage: string;
        if (executionError.message.includes('timed out')) errorMessage = `Code execution timed out after ${timeoutMs / 1000} seconds.`;
        else if (executionError instanceof SyntaxError) errorMessage = `Syntax error in provided code: ${executionError.message}`;
        else errorMessage = `Error during code execution: ${executionError.message}`;
        finalOutput.errors.push(`Execution Error: ${errorMessage}`);
         finalOutput.result = undefined; // Ensure result is undefined on execution error
    }

     // Check JSON serializability before final truncation check
     try {
         JSON.stringify(finalOutput.result);
     } catch (stringifyError: any) {
         console.error("[EVAL Logic] Result is not JSON serializable:", stringifyError);
         finalOutput.errors.push(`Execution Error: Result is not JSON-serializable: ${stringifyError.message}.`);
         finalOutput.result = undefined; // Set result to undefined as it cannot be sent
     }

    // Truncate the final compiled output object if needed
    const finalData = truncateEvalResult(finalOutput, MAX_EVAL_JSON_LENGTH);
    return JSON.stringify(finalData, null, 2);
}

export async function readResourceLogic(
    fullEhr: ClientFullEHR,
    resourceType: string,
    resourceId: string
): Promise<string> { // Returns JSON string
    console.error(`[READ Resource Logic] Attempting to read ${resourceType}/${resourceId}`);
    const resources = fullEhr.fhir[resourceType] || [];
    const resource = resources.find(r => r && r.id === resourceId);

    let result: z.infer<typeof ReadResourceOutputSchema>;
    if (resource) {
        console.error(`[READ Resource Logic] Found ${resourceType}/${resourceId}`);
        result = { resource: resource };
    } else {
        console.error(`[READ Resource Logic] Resource ${resourceType}/${resourceId} not found.`);
        result = { resource: null, error: `Resource ${resourceType}/${resourceId} not found.` };
    }

    try {
        // No size limit for reading a single resource, assume it's manageable
        return JSON.stringify(result, null, 2);
    } catch (stringifyError: any) {
        console.error(`[READ Resource Logic] Error stringifying result for ${resourceType}/${resourceId}:`, stringifyError);
        return JSON.stringify({ resource: null, error: `Internal error stringifying resource: ${stringifyError.message}` }, null, 2);
    }
}

export async function readAttachmentLogic(
    fullEhr: ClientFullEHR,
    resourceType: string,
    resourceId: string,
    attachmentPath: string,
    includeRawBase64: boolean
): Promise<string> { // Returns Markdown string
    console.error(`[READ Attachment Logic] Attempting to read attachment at ${resourceType}/${resourceId}#${attachmentPath} (Include Base64: ${includeRawBase64})`);
    const attachment = fullEhr.attachments.find(a =>
        a.resourceType === resourceType &&
        a.resourceId === resourceId &&
        a.path === attachmentPath
    );

    if (attachment) {
        console.error(`[READ Attachment Logic] Found attachment at ${resourceType}/${resourceId}#${attachmentPath}`);

        // Construct Markdown output
        let markdown = `## Attachment Content\n\n`;
        markdown += `**Source:** \`${attachment.resourceType}/${attachment.resourceId}\`\n`;
        markdown += `**Path:** \`${attachment.path.replace(/`/g, '\\`')}\`\n`;
        if (attachment.contentType) {
            markdown += `**Content-Type:** \`${attachment.contentType.replace(/`/g, '\\`')}\`\n`;
        }
        markdown += `\n---\n\n`; // Separator

        if (attachment.contentPlaintext) {
            // Process plaintext: trim whitespace-only lines, limit consecutive blank lines
            const lines = attachment.contentPlaintext.replace(/\r\n/g, '\n').split('\n');
            const processedLines: string[] = [];
            let consecutiveBlankLines = 0;
            for (const line of lines) {
                const trimmedLine = line.trim();
                if (trimmedLine === '') {
                    consecutiveBlankLines++;
                    if (consecutiveBlankLines <= 2) {
                        processedLines.push(''); // Add max 2 blank lines
                    }
                } else {
                    consecutiveBlankLines = 0;
                    processedLines.push(line); // Add original line with whitespace if it wasn't blank
                }
            }

            // Trim leading and trailing blank lines from the processed lines array
            let firstNonBlank = -1;
            let lastNonBlank = -1;
            for (let i = 0; i < processedLines.length; i++) {
                if (processedLines[i] !== '') {
                    if (firstNonBlank === -1) {
                        firstNonBlank = i;
                    }
                    lastNonBlank = i;
                }
            }

            let finalLines: string[];
            if (firstNonBlank === -1) {
                // All lines were blank
                finalLines = [];
            } else {
                finalLines = processedLines.slice(firstNonBlank, lastNonBlank + 1);
            }

            const processedPlaintext = finalLines.join('\n');

            // Wrap the processed plaintext in <plaintext> tags without escaping
            markdown += `\n<plaintext>\n${processedPlaintext}\n</plaintext>\n\n`;
        } else {
            markdown += `_(No plaintext content available or extracted)_\n\n`;
        }

        if (includeRawBase64) {
            markdown += `\n---\n\n**Raw Base64 Content:**\n`;
            if (attachment.contentBase64) {
                markdown += "```\n" + attachment.contentBase64 + "\n```\n";
            } else {
                markdown += `_(No base64 content available)_\n`;
            }
        }

        return markdown;

    } else {
        console.error(`[READ Attachment Logic] Attachment at ${resourceType}/${resourceId}#${attachmentPath} not found.`);
        // Return Markdown error message
        return `**Error:** Attachment at \`${resourceType}/${resourceId}#${attachmentPath.replace(/`/g, '\\`')}\` not found.`;
    }
}

/**
 * Registers the standard EHR interaction tools (grep, query, eval, read_resource, read_attachment) with an McpServer instance.
 * This function abstracts the context retrieval (finding EHR data and DB connection)
 * to allow reuse in different server environments (e.g., SSE, CLI).
 *
 * @param mcpServer The McpServer instance to register tools with.
 * @param getContext A function that resolves the necessary context (fullEhr, db) based on the tool name and optional extra data (like session ID).
 */
export function registerEhrTools(
    mcpServer: McpServer,
    getContext: (
        toolName: 'grep_record' | 'query_record' | 'eval_record' | 'read_resource' | 'read_attachment',
        extra?: Record<string, any>
    ) => Promise<{ fullEhr?: ClientFullEHR, db?: Database }>
): void {

    mcpServer.tool(
        "grep_record",
        GrepRecordInputSchema.shape, // Use the updated schema
        async (args, extra) => {
            try {
                const { fullEhr } = await getContext("grep_record", extra);
                if (!fullEhr) {
                    throw new McpError(ErrorCode.InternalError, "EHR data context not found for this session/request.");
                }
                // --- Pass the new resource_format argument ---
                console.error(`[TOOL grep_record] Context retrieved. Query: "${args.query}", Types: ${args.resource_types?.join(',') || 'All'}, Format: ${args.resource_format || 'plaintext'}, Page: ${args.page || DEFAULT_PAGE}, PageSize: ${args.page_size || DEFAULT_PAGE_SIZE}`);
                const resultString = await grepRecordLogic(
                    fullEhr,
                    args.query,
                    args.resource_types,
                    args.resource_format || 'plaintext', // Pass format
                    args.page_size || DEFAULT_PAGE_SIZE,
                    args.page || DEFAULT_PAGE
                );
                // Check if the result starts with the error marker we defined
                const isError = resultString.startsWith("**Error:**");
                return { content: [{ type: "text", text: resultString }], isError: isError }; // Return Markdown directly
            } catch (error: any) {
                console.error(`[TOOL grep_record] Error during context retrieval or execution:`, error);
                const errorMessage = error instanceof McpError ? error.message : `Internal server error: ${error.message}`;
                const errorMarkdown = `**Error:** ${errorMessage}`;
                return { content: [{ type: "text", text: errorMarkdown }], isError: true }; // Return Markdown error
            }
        }
    );

    mcpServer.tool(
        "query_record",
        QueryRecordInputSchema.shape,
        async (args, extra) => {
            try {
                const { db } = await getContext("query_record", extra);
                if (!db) {
                    throw new McpError(ErrorCode.InternalError, "Database context not found for this session/request.");
                }
                console.error(`[TOOL query_record] Context retrieved. SQL: ${args.sql.substring(0, 100)}...`);
                const resultString = await queryRecordLogic(db, args.sql);
                const isError = resultString.includes('"error":');
                return { content: [{ type: "text", text: resultString }], isError: isError };
            } catch (error: any) {
                console.error(`[TOOL query_record] Error during context retrieval or execution:`, error);
                 const errorMessage = error instanceof McpError ? error.message : `Internal server error: ${error.message}`;
                const errorResult = JSON.stringify({ error: errorMessage });
                return { content: [{ type: "text", text: errorResult }], isError: true };
            }
        }
    );

    mcpServer.tool(
        "eval_record",
        EvalRecordInputSchema.shape,
        async (args, extra) => {
            try {
                const { fullEhr } = await getContext("eval_record", extra);
                 if (!fullEhr) {
                     throw new McpError(ErrorCode.InternalError, "EHR data context not found for this session/request.");
                 }
                console.error(`[TOOL eval_record] Context retrieved. Code length: ${args.code.length}`);
                const resultString = await evalRecordLogic(fullEhr, args.code);
                const isError = resultString.includes('"error":') || resultString.includes('Execution Error:');
                return { content: [{ type: "text", text: resultString }], isError: isError };
            } catch (error: any) {
                console.error(`[TOOL eval_record] Error during context retrieval or execution:`, error);
                 const errorMessage = error instanceof McpError ? error.message : `Internal server error: ${error.message}`;
                const errorResult = JSON.stringify({ error: errorMessage });
                return { content: [{ type: "text", text: errorResult }], isError: true };
            }
        }
    );

    mcpServer.tool(
        "read_resource",
        ReadResourceInputSchema.shape,
        async (args, extra) => {
            try {
                const { fullEhr } = await getContext("read_resource", extra);
                if (!fullEhr) {
                    throw new McpError(ErrorCode.InternalError, "EHR data context not found for this session/request.");
                }
                console.error(`[TOOL read_resource] Context retrieved. Reading ${args.resourceType}/${args.resourceId}`);
                const resultString = await readResourceLogic(fullEhr, args.resourceType, args.resourceId);
                const isError = resultString.includes('"error":'); // Check if logic function returned an error message
                return { content: [{ type: "text", text: resultString }], isError: isError };
            } catch (error: any) {
                console.error(`[TOOL read_resource] Error during context retrieval or execution:`, error);
                const errorMessage = error instanceof McpError ? error.message : `Internal server error: ${error.message}`;
                const errorResult = JSON.stringify({ resource: null, error: errorMessage });
                return { content: [{ type: "text", text: errorResult }], isError: true };
            }
        }
    );

    mcpServer.tool(
        "read_attachment",
        ReadAttachmentInputSchema.shape,
        async (args, extra) => {
            try {
                const { fullEhr } = await getContext("read_attachment", extra);
                if (!fullEhr) {
                    throw new McpError(ErrorCode.InternalError, "EHR data context not found for this session/request.");
                }
                console.error(`[TOOL read_attachment] Context retrieved. Reading ${args.resourceType}/${args.resourceId}#${args.attachmentPath}`);
                const resultString = await readAttachmentLogic(fullEhr, args.resourceType, args.resourceId, args.attachmentPath, args.includeRawBase64);
                // Check if the result starts with the Markdown error marker
                const isError = resultString.startsWith('**Error:**');
                return { content: [{ type: "text", text: resultString }], isError: isError }; // Return Markdown directly
            } catch (error: any) {
                console.error(`[TOOL read_attachment] Error during context retrieval or execution:`, error);
                const errorMessage = error instanceof McpError ? error.message : `Internal server error: ${error.message}`;
                const errorMarkdown = `**Error:** ${errorMessage}`;
                return { content: [{ type: "text", text: errorMarkdown }], isError: true }; // Return Markdown error
            }
        }
    );
}
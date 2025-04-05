import { XMLParser } from 'fast-xml-parser';
import { htmlToText } from 'html-to-text';

import { deEncapsulateSync } from 'rtf-stream-parser';
import * as iconvLite from 'iconv-lite';


import _ from 'lodash';

// Import shared types
import {
    ProcessedAttachment,
    AttachmentLike,
    KNOWN_ATTACHMENT_PATHS,
    FullEHR
} from './types';

// Import helper functions
import {
    resolveFhirUrl,
    fetchFhirResource,
    fetchAllPages,
    fetchAttachmentContent,
    getValueAtPath
} from './utils';

/**
 * Fetches the primary Patient resource and performs initial bulk searches based on predefined queries.
 * @param ehrAccessToken - Access token for the EHR.
 * @param fhirBaseUrl - Base URL of the FHIR server.
 * @param patientId - The patient's ID.
 * @returns An object containing the initial FHIR record and the count of resources fetched.
 */
export async function fetchInitialFhirResources(
    ehrAccessToken: string,
    fhirBaseUrl: string,
    patientId: string
): Promise<{ initialFhirRecord: Record<string, any[]>, initialTotalFetched: number }> {
    console.log(`[DATA:INITIAL FETCH] Fetching initial FHIR resources for Patient: ${patientId}`);
    const fhirRecord: Record<string, any[]> = {};
    let totalFetched = 0;

    const patientReadUrl = resolveFhirUrl(`Patient/${patientId}`, fhirBaseUrl).toString();
    // Define search queries locally within this function or pass them in
    const searchQueries: { resourceType: string; params?: Record<string, string> }[] = [
        { resourceType: 'Observation', params: { 'category': 'laboratory', patient: patientId, '_count': '1000' } },
        { resourceType: 'Observation', params: { 'category': 'vital-signs', patient: patientId, '_count': '1000' } },
        { resourceType: 'Observation', params: { 'category': 'social-history', patient: patientId, '_count': '1000' } },
        { resourceType: 'Observation', params: { 'category': 'care-experience-preference', patient: patientId, '_count': '1000' } },
        { resourceType: 'Observation', params: { 'category': 'observation-adi-documentation', patient: patientId, '_count': '1000' } },
        { resourceType: 'Observation', params: { 'category': 'survey', patient: patientId, '_count': '1000' } },
        { resourceType: 'Observation', params: { 'category': 'treatment-intervention-preference', patient: patientId, '_count': '1000' } },
        { resourceType: 'CarePlan', params: { patient: patientId, '_count': '1000' } },
        { resourceType: 'CareTeam', params: { patient: patientId, '_count': '1000' } },
        { resourceType: 'Coverage', params: { patient: patientId, '_count': '1000' } },
        { resourceType: 'Device', params: { patient: patientId, '_count': '1000' } },
        { resourceType: 'DiagnosticReport', params: { patient: patientId, '_count': '1000' } },
        { resourceType: 'Condition', params: { patient: patientId, '_count': '1000' } },
        { resourceType: 'Encounter', params: { patient: patientId, '_count': '1000' } },
        { resourceType: 'Goal', params: { patient: patientId, '_count': '1000' } },
        { resourceType: 'MedicationRequest', params: { patient: patientId, '_count': '1000' } },
        { resourceType: 'MedicationDispense', params: { patient: patientId, '_count': '1000' } },
        { resourceType: 'MedicationStatement', params: { patient: patientId, '_count': '1000' } },
        { resourceType: 'AllergyIntolerance', params: { patient: patientId, '_count': '1000' } },
        { resourceType: 'Procedure', params: { patient: patientId, '_count': '1000' } },
        { resourceType: 'Immunization', params: { patient: patientId, '_count': '1000' } },
        { resourceType: 'DocumentReference', params: { patient: patientId, '_count': '1000' } },
        { resourceType: 'QuestionnaireResponse', params: { patient: patientId, '_count': '1000' } },
        { resourceType: 'RelatedPerson', params: { patient: patientId, '_count': '1000' } },
        { resourceType: 'Specimen', params: { patient: patientId, '_count': '1000' } },
    ];

    try {
        const patientResource = await fetchFhirResource(patientReadUrl, ehrAccessToken);
        fhirRecord['Patient'] = [patientResource];
        totalFetched++;
    } catch (error) {
        console.error(`[DATA:INITIAL FETCH] Failed to fetch Patient resource: ${error}`);
        throw new Error(`Could not fetch core Patient resource: ${error instanceof Error ? error.message : String(error)}`);
    }

    await Promise.allSettled(searchQueries.map(async (query) => {
        try {
            const url = resolveFhirUrl(query.resourceType, fhirBaseUrl);
            if (query.params) {
                Object.entries(query.params).forEach(([key, value]) => url.searchParams.set(key, value));
            }
            const resources = await fetchAllPages(url.toString(), ehrAccessToken);
            fhirRecord[query.resourceType] = (fhirRecord[query.resourceType] || []).concat(resources); // Append if type already exists (e.g., multiple Observation categories)
            totalFetched += resources.length;
        } catch (error) {
            console.warn(`[DATA:INITIAL FETCH] Failed to fetch ${query.resourceType} resources (continuing): ${error}`);
            if (!fhirRecord[query.resourceType]) {
                fhirRecord[query.resourceType] = []; // Ensure array exists even if fetch fails
            }
        }
    }));

    console.log(`[DATA:INITIAL FETCH] Completed initial fetching. Total resources: ${totalFetched} across ${Object.keys(fhirRecord).length} types.`);
    return { initialFhirRecord: fhirRecord, initialTotalFetched: totalFetched };
}

/**
 * Recursively finds relative references (like "Practitioner/123") within a FHIR object.
 * @param obj - The object/array to scan.
 * @param referencesFound - A Set to add found reference strings to.
 */
function findReferencesRecursive(obj: any, referencesFound: Set<string>): void {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) {
        obj.forEach(item => findReferencesRecursive(item, referencesFound));
        return;
    }
    for (const key in obj) {
        if (key === 'reference' && typeof obj[key] === 'string') {
            const refString = obj[key] as string;
            // Basic check for relative URL (Type/Id) - could be more robust
            if (refString.includes('/') && !refString.startsWith('http')) {
                referencesFound.add(refString);
            }
            // Could add absolute URL check here if needed later
        } else {
            findReferencesRecursive(obj[key], referencesFound);
        }
    }
}

/**
 * Iteratively resolves references found within the FHIR record, fetching missing resources.
 * @param initialFhirRecord - The FHIR record after initial fetching.
 * @param ehrAccessToken - Access token for the EHR.
 * @param fhirBaseUrl - Base URL of the FHIR server.
 * @param maxIterations - Maximum number of resolution iterations.
 * @returns An object containing the updated FHIR record and the count of newly added resources.
 */
export async function resolveFhirReferences(
    initialFhirRecord: Record<string, any[]>,
    ehrAccessToken: string,
    fhirBaseUrl: string,
    maxIterations: number
): Promise<{ resolvedFhirRecord: Record<string, any[]>, referencesAddedCount: number }> {
    console.log("[DATA:REF RESOLVE] Starting reference resolution...");
    let currentFhirRecord = _.cloneDeep(initialFhirRecord); // Work on a copy
    let totalAddedCount = 0;
    let referencesToFetch = new Set<string>();
    let currentIteration = 0;

    do {
        currentIteration++;
        const referencesFound = new Set<string>();
        referencesToFetch.clear();
        let resourcesToAddThisIteration: Record<string, any[]> = {};

        // 1. Find all references in currently known resources
        Object.values(currentFhirRecord).flat().forEach(resource => findReferencesRecursive(resource, referencesFound));
        console.log(`[DATA:REF RESOLVE Iter ${currentIteration}] Found ${referencesFound.size} potential relative references.`);

        // 2. Identify which references point to resources we *don't* have
        for (const ref of referencesFound) {
            const [resourceType, id] = ref.split('/');
            if (!resourceType || !id) continue; // Skip invalid formats
            const alreadyFetched = currentFhirRecord[resourceType]?.some(r => r.id === id);
            if (!alreadyFetched) {
                referencesToFetch.add(ref);
            }
        }
        console.log(`[DATA:REF RESOLVE Iter ${currentIteration}] Identified ${referencesToFetch.size} unique missing resources to fetch.`);

        if (referencesToFetch.size === 0) {
            console.log(`[DATA:REF RESOLVE Iter ${currentIteration}] No new references to fetch.`);
            break; // Exit loop if nothing new to fetch
        }

        // 3. Fetch the missing resources
        const fetchResults = await Promise.allSettled(
            Array.from(referencesToFetch).map(async (ref) => {
                try {
                    const url = resolveFhirUrl(ref, fhirBaseUrl).toString();
                    const resource = await fetchFhirResource(url, ehrAccessToken);
                    if (resource?.resourceType && resource.id) {
                        return resource; // Return the fetched resource
                    } else {
                        console.warn(`[DATA:REF RESOLVE Iter ${currentIteration}] Fetched reference ${ref}, but it lacked resourceType or id.`);
                        return null; // Indicate fetch succeeded but resource invalid
                    }
                } catch (error) {
                    if (error instanceof Error && error.message.includes('status 404')) {
                        console.log(`[DATA:REF RESOLVE Iter ${currentIteration}] Referenced resource ${ref} not found (404).`);
                    } else {
                        console.warn(`[DATA:REF RESOLVE Iter ${currentIteration}] Failed to fetch referenced resource ${ref}: ${error}`);
                    }
                    return null; // Indicate fetch failure
                }
            })
        );

        // Process results, grouping successfully fetched resources by type
        fetchResults.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
                const resource = result.value;
                if (!resourcesToAddThisIteration[resource.resourceType]) {
                    resourcesToAddThisIteration[resource.resourceType] = [];
                }
                // Avoid adding duplicates within this batch
                if (!resourcesToAddThisIteration[resource.resourceType].some(r => r.id === resource.id)) {
                    resourcesToAddThisIteration[resource.resourceType].push(resource);
                }
            }
        });

        // 4. Add newly fetched resources to the main record
        let addedThisIteration = 0;
        for (const [resourceType, newResources] of Object.entries(resourcesToAddThisIteration)) {
            if (!currentFhirRecord[resourceType]) {
                currentFhirRecord[resourceType] = [];
            }
            for (const newResource of newResources) {
                // Double-check against main record before adding
                if (!currentFhirRecord[resourceType].some(r => r.id === newResource.id)) {
                    currentFhirRecord[resourceType].push(newResource);
                    addedThisIteration++;
                }
            }
        }
        totalAddedCount += addedThisIteration;
        console.log(`[DATA:REF RESOLVE Iter ${currentIteration}] Added ${addedThisIteration} newly fetched resources.`);

        if (addedThisIteration === 0) {
            console.log(`[DATA:REF RESOLVE Iter ${currentIteration}] No new resources were successfully added. Stopping resolution.`);
            break; // Stop if fetches failed or yielded only duplicates
        }

    } while (currentIteration < maxIterations);

    if (currentIteration >= maxIterations && referencesToFetch.size > 0) {
        console.warn(`[DATA:REF RESOLVE] Reached max iterations (${maxIterations}) but still had ${referencesToFetch.size} references to fetch. Data might be incomplete.`);
    }
    console.log(`[DATA:REF RESOLVE] Reference resolution finished. Added ${totalAddedCount} resources.`);
    return { resolvedFhirRecord: currentFhirRecord, referencesAddedCount: totalAddedCount };
}

/**
 * Processes attachments found within the FHIR record, fetching content and extracting text.
 * @param fhirRecord - The complete FHIR record (after reference resolution).
 * @param ehrAccessToken - Access token for the EHR.
 * @param fhirBaseUrl - Base URL of the FHIR server.
 * @returns An array of processed attachment objects.
 */
export async function processFhirAttachments(
    fhirRecord: Record<string, any[]>,
    ehrAccessToken: string,
    fhirBaseUrl: string
): Promise<ProcessedAttachment[]> {
    console.log("[DATA:ATTACHMENT] Starting attachment processing...");
    const processedAttachments: ProcessedAttachment[] = [];
    const xmlParser = new XMLParser({ ignoreAttributes: true, textNodeName: "_text", parseTagValue: false, trimValues: true, stopNodes: ["*.html"] });
    let processedCount = 0;
    let processingErrorCount = 0;
    let fetchErrorCount = 0;

    // --- Helper: processSingleAttachmentNode ---
    async function processSingleAttachmentNode(node: AttachmentLike, resourceType: string, resourceId: string, path: string): Promise<void> {
        let contentRaw: Buffer | null = null;
        let contentPlaintext: string | null = null;
        let finalContentType = (node.contentType || 'application/octet-stream').toLowerCase();

        try {
            if (node.url) {
                console.log(`[DATA:ATTACHMENT Process] Found URL: ${node.url} in ${resourceType}/${resourceId} at ${path}`);
                try {
                    const fetched = await fetchAttachmentContent(node.url, fhirBaseUrl, ehrAccessToken);
                    contentRaw = fetched.contentRaw;
                    if (fetched.contentType) {
                        finalContentType = fetched.contentType.split(';')[0].trim().toLowerCase();
                        console.log(`[DATA:ATTACHMENT Process] Using fetched content type: ${finalContentType}`);
                    } else {
                        console.log(`[DATA:ATTACHMENT Process] Fetched content type missing, using type from resource: ${finalContentType}`);
                    }
                } catch (fetchErr) {
                    console.error(`[DATA:ATTACHMENT Process] Failed to fetch content from ${node.url}:`, fetchErr);
                    contentPlaintext = `[Error fetching external content at ${node.url}: ${fetchErr instanceof Error ? fetchErr.message : String(fetchErr)}]`;
                    fetchErrorCount++;
                    // Store error state but don't throw, push error marker attachment
                    processedAttachments.push({
                        resourceType, resourceId, path,
                        contentType: finalContentType,
                        json: JSON.stringify(node), // Store original node even on fetch error
                        contentRaw: null,
                        contentPlaintext
                    });
                    processedCount++; // Count it as 'processed' (with error)
                    return; // Exit this node processing
                }
            } else if (node.data) {
                console.log(`[DATA:ATTACHMENT Process] Found inline data in ${resourceType}/${resourceId} at ${path}`);
                contentRaw = Buffer.from(node.data, 'base64');
                finalContentType = (node.contentType || 'application/octet-stream').toLowerCase();
            } else {
                console.warn(`[DATA:ATTACHMENT Process] Attachment node in ${resourceType}/${resourceId} at ${path} has neither URL nor data.`);
                contentPlaintext = '[Attachment has no data or URL]';
                // Push placeholder and return
                processedAttachments.push({
                    resourceType, resourceId, path,
                    contentType: finalContentType,
                    json: JSON.stringify(node),
                    contentRaw: null,
                    contentPlaintext
                });
                processedCount++;
                return;
            }

            // --- Content Processing Logic (if contentRaw exists) ---
            if (contentRaw !== null) {
                if (finalContentType.startsWith('text/plain')) {
                    contentPlaintext = contentRaw.toString('utf8');
                } else if (finalContentType === 'application/rtf') {
                    try {
                        console.log(`[DATA:ATTACHMENT Process] Attempting RTF de-encapsulation for ${resourceType}/${resourceId} at ${path}`);
                        const result = deEncapsulateSync(contentRaw, { decode: iconvLite.decode });
                        if (result.mode === 'html') {
                            console.log(`[DATA:ATTACHMENT Process] RTF contained HTML, converting to text.`);
                            try {
                                contentPlaintext = htmlToText(result.text.toString(), { 
                                    wordwrap: false,
                                    selectors: [{ selector: 'img', format: 'skip' }] 
                                });
                            } catch (htmlErr) {
                                console.error(`[DATA:ATTACHMENT Process] HTML parsing error after RTF extraction in ${resourceType}/${resourceId} at ${path}:`, htmlErr);
                                contentPlaintext = '[Error parsing HTML from RTF]';
                                processingErrorCount++;
                            }
                        } else {
                            console.log(`[DATA:ATTACHMENT Process] RTF contained text.`);
                            contentPlaintext = result.text.toString();
                        }
                        if (!contentPlaintext) contentPlaintext = '[Empty RTF content after processing]';
                    } catch (rtfErr) {
                        console.error(`[DATA:ATTACHMENT Process] RTF de-encapsulation error in ${resourceType}/${resourceId} at ${path}:`, rtfErr);
                        contentPlaintext = '[Error processing RTF]';
                        processingErrorCount++;
                    }
                } else if (finalContentType.startsWith('text/html')) {
                    try {
                        contentPlaintext = htmlToText(contentRaw.toString('utf8'), { 
                            wordwrap: false,
                            selectors: [{ selector: 'img', format: 'skip' }] 
                        });
                    } catch (htmlErr) {
                        console.error(`[DATA:ATTACHMENT Process] HTML parsing error in ${resourceType}/${resourceId} at ${path}:`, htmlErr);
                        contentPlaintext = '[Error parsing HTML]';
                        processingErrorCount++;
                    }
                } else if (finalContentType.includes('xml')) {
                    try {
                        const parsed = xmlParser.parse(contentRaw.toString('utf8'));
                        const extractText = (n: any): string => {
                            if (typeof n === 'string') return n + "\n";
                            if (typeof n !== 'object' || n === null) return "";
                            return Object.values(n).map(extractText).join("");
                        };
                        contentPlaintext = extractText(parsed).replace(/ +/g, ' ').replace(/\n+/g, '\n').trim();
                        if (!contentPlaintext) contentPlaintext = '[Empty XML content]';
                    } catch (xmlErr) {
                        console.error(`[DATA:ATTACHMENT Process] XML parsing error in ${resourceType}/${resourceId} at ${path}:`, xmlErr);
                        contentPlaintext = '[Error parsing XML]';
                        processingErrorCount++;
                    }
                } else {
                    contentPlaintext = `[Binary content type: ${finalContentType}]`;
                }
            }
            // --- End Content Processing Logic ---

            processedAttachments.push({
                resourceType,
                resourceId,
                path,
                contentType: finalContentType,
                json: JSON.stringify(node),
                contentRaw,
                contentPlaintext
            });
            processedCount++;

        } catch (processError) {
            console.error(`[DATA:ATTACHMENT Process] Error processing node in ${resourceType}/${resourceId} at ${path}:`, processError);
            processingErrorCount++;
            processedAttachments.push({ // Push error marker
                resourceType, resourceId, path,
                contentType: finalContentType,
                json: JSON.stringify({ error: `Processing failed: ${processError}` }),
                contentRaw: null,
                contentPlaintext: `[Error during attachment processing: ${processError}]`
            });
            processedCount++; // Still count as 'processed'
        }
    }
    // --- End Helper: processSingleAttachmentNode ---

    // --- Helper: findAndProcessAttachments (Recursive Finder) ---
    async function findAndProcessAttachmentsRecursive(obj: any, resourceType: string, resourceId: string, currentPath: string = '', processedPaths: Set<string>): Promise<void> {
        if (!obj || typeof obj !== 'object') return;

        // Check explicit known paths first
        const knownPathsForType = KNOWN_ATTACHMENT_PATHS.get(resourceType);
        if (knownPathsForType) {
            for (const knownPath of knownPathsForType) {
                // Check if the exact path or a parent path has been processed
                if (processedPaths.has(knownPath) || Array.from(processedPaths).some(p => knownPath.startsWith(p + '.'))) continue;

                const attachments = getValueAtPath(obj, knownPath);
                if (Array.isArray(attachments)) {
                    for (const [index, attachment] of attachments.entries()) {
                        if (attachment && typeof attachment === 'object') {
                            const fullPath = `${knownPath}[${index}]`; // Track specific index
                            if (!processedPaths.has(fullPath)) {
                                await processSingleAttachmentNode(attachment, resourceType, resourceId, fullPath);
                                processedPaths.add(fullPath); // Mark the indexed path as processed
                            }
                        }
                    }
                    // Mark the base known path as processed to avoid redundant checks later? Maybe not needed if we check indexed paths.
                    // processedPaths.add(knownPath);
                } else if (attachments && typeof attachments === 'object') { // Handle single object case
                    if (!processedPaths.has(knownPath)) {
                        await processSingleAttachmentNode(attachments, resourceType, resourceId, knownPath);
                        processedPaths.add(knownPath);
                    }
                }
            }
        }

        // Heuristic check for attachment-like structure
        const isAttachmentLike = (node: any): node is AttachmentLike =>
            node && typeof node === 'object' && node.contentType && (node.data || node.url);

        if (isAttachmentLike(obj) && currentPath && !processedPaths.has(currentPath) && !KNOWN_ATTACHMENT_PATHS.get(resourceType)?.some(p => currentPath.startsWith(p))) {
            // Found via heuristic, not already processed via known paths
            console.log(`[DATA:ATTACHMENT Heuristic] Found potential attachment at path: ${currentPath}`);
            await processSingleAttachmentNode(obj, resourceType, resourceId, currentPath);
            processedPaths.add(currentPath);
            // Don't return here, keep traversing children in case of nested attachments
            // return;
        }

        // Recurse into children (arrays or objects)
        if (Array.isArray(obj)) {
            await Promise.all(obj.map((item, index) => {
                const newPath = `${currentPath}[${index}]`;
                // Avoid re-processing if this exact indexed path was done
                if (processedPaths.has(newPath)) return Promise.resolve();
                return findAndProcessAttachmentsRecursive(item, resourceType, resourceId, newPath, processedPaths);
            }));
        } else if (typeof obj === 'object' && !isAttachmentLike(obj)) { // Don't recurse into already identified attachments
            await Promise.all(Object.entries(obj).map(([key, value]) => {
                const newPath = currentPath ? `${currentPath}.${key}` : key;
                // Avoid re-processing if this exact path or a parent was done
                if (processedPaths.has(newPath) || Array.from(processedPaths).some(p => newPath.startsWith(p + '.'))) return Promise.resolve();
                return findAndProcessAttachmentsRecursive(value, resourceType, resourceId, newPath, processedPaths);
            }));
        }
    }
    // --- End Helper: findAndProcessAttachments ---

    try {
        // Iterate through all resources and kick off attachment finding
        await Promise.allSettled(Object.entries(fhirRecord).map(async ([resourceType, resources]) => {
            for (const resource of resources) {
                if (resource?.id) {
                    const processedPaths = new Set<string>(); // Track paths processed *within this resource*
                    try {
                        await findAndProcessAttachmentsRecursive(resource, resourceType, resource.id, '', processedPaths);
                    } catch (resourceErr) {
                        console.error(`[DATA:ATTACHMENT] Error processing attachments for ${resourceType}/${resource.id}:`, resourceErr);
                        processingErrorCount++; // Increment general processing error count
                    }
                }
            }
        }));
        console.log(`[DATA:ATTACHMENT] Processing complete. Found/Attempted: ${processedCount}, URL Fetch Errors: ${fetchErrorCount}, Other Processing Errors: ${processingErrorCount}`);
    } catch (err) {
        console.error("[DATA:ATTACHMENT] Fatal error during attachment processing loop:", err);
        // This error likely shouldn't happen with Promise.allSettled, but safety first
        throw new Error("Fatal error during attachment processing orchestration.");
    }

    return processedAttachments;
}

/**
 * Comprehensive function to fetch all EHR data for a patient.
 * This orchestrates the entire data fetching pipeline including initial resource fetching,
 * reference resolution, and attachment processing.
 * 
 * @param fhirBaseUrl - The base URL of the FHIR server
 * @param patientId - The ID of the patient whose data is being fetched
 * @param ehrAccessToken - Access token for the EHR
 * @param options - Optional parameters for controlling the fetch process
 * @returns A Promise resolving to a complete FullEHR object
 */
export async function fetchAllEhrData(
    fhirBaseUrl: string,
    patientId: string,
    ehrAccessToken: string,
    options: {
        maxReferenceResolutionIterations?: number,
        logProgress?: boolean
    } = {}
): Promise<FullEHR> {
    const maxIterations = options.maxReferenceResolutionIterations || 3;
    const shouldLog = options.logProgress !== false;
    
    if (shouldLog) console.log(`[DATA:FETCH_ALL] Starting comprehensive data fetch for patient ${patientId}`);
    
    // Step 1: Fetch initial resources
    if (shouldLog) console.log(`[DATA:FETCH_ALL] Step 1/3: Fetching initial resources`);
    const { initialFhirRecord } = await fetchInitialFhirResources(
        ehrAccessToken,
        fhirBaseUrl,
        patientId
    );
    
    // Step 2: Resolve references
    if (shouldLog) console.log(`[DATA:FETCH_ALL] Step 2/3: Resolving references`);
    const { resolvedFhirRecord } = await resolveFhirReferences(
        initialFhirRecord,
        ehrAccessToken,
        fhirBaseUrl,
        maxIterations
    );
    
    // Step 3: Process attachments
    if (shouldLog) console.log(`[DATA:FETCH_ALL] Step 3/3: Processing attachments`);
    const processedAttachments = await processFhirAttachments(
        resolvedFhirRecord,
        ehrAccessToken,
        fhirBaseUrl
    );
    
    const fullEhr: FullEHR = {
        fhir: resolvedFhirRecord,
        attachments: processedAttachments
    };
    
    if (shouldLog) {
        const resourceCount = Object.values(fullEhr.fhir).reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0);
        console.log(`[DATA:FETCH_ALL] Complete. Total resources: ${resourceCount}, Attachments: ${fullEhr.attachments.length}`);
    }
    
    return fullEhr;
} 
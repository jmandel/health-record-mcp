import { ClientFullEHR, ClientProcessedAttachment } from './clientTypes';
import { KNOWN_ATTACHMENT_PATHS, AttachmentLike } from './src/types'; // Reuse server types where applicable
import { getInitialFhirSearchQueries } from './src/fhirSearchQueries'; // Import shared query function

// --- Helper: Fetch with Authorization Header ---
async function fetchWithToken(url: string, accessToken: string, options: RequestInit = {}): Promise<Response> {
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${accessToken}`);
    headers.set('Accept', 'application/fhir+json, application/json'); // Prefer FHIR JSON

    return fetch(url, {
        ...options,
        headers: headers,
    });
}

// --- Helper: Fetch a single FHIR resource ---
async function fetchResource(url: string, accessToken: string): Promise<any | null> {
    try {
        const response = await fetchWithToken(url, accessToken);
        if (!response.ok) {
            console.warn(`Failed to fetch resource ${url}: ${response.status} ${response.statusText}`);
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching resource ${url}:`, error);
        return null;
    }
}

// --- Helper: Convert Blob to Base64 String ---
function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            // Result includes the data URL prefix (e.g., "data:contentType;base64,"), remove it.
            const base64String = reader.result as string;
            resolve(base64String.split(',', 2)[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// --- Function to fetch initial set of resources ---
async function fetchInitialFhirResourcesClient(accessToken: string, fhirBaseUrl: string, patientId: string): Promise<{ initialFhirRecord: Record<string, any[]>; initialTotalFetched: number }> {
    console.log(`[CLIENT FETCH] Fetching initial resources for Patient: ${patientId}`);
    const initialFhirRecord: Record<string, any[]> = {};
    let initialTotalFetched = 0;

    // 1. Fetch Patient resource
    const patientUrl = `${fhirBaseUrl}/Patient/${patientId}`;
    const patientResource = await fetchResource(patientUrl, accessToken);
    if (!patientResource) {
        throw new Error(`Failed to fetch core Patient resource at ${patientUrl}`);
    }
    initialFhirRecord['Patient'] = [patientResource];
    initialTotalFetched++;

    // 2. Get shared search queries for this patient
    const searchQueries = getInitialFhirSearchQueries(patientId);
    const MAX_BUNDLE_PAGES = 100; // Limit pagination to prevent excessive requests
    const searchPromises = searchQueries.map(async (query) => {
        const { resourceType, params } = query;
        // Construct params, ensuring _count is added but patient is already present from getInitialFhirSearchQueries
        const searchParams = new URLSearchParams({
            _count: '1000', // Add count here for consistency
            ...(params || {}), // Spread parameters from config (includes patientId)
        });

        let url: string | undefined = `${fhirBaseUrl}/${resourceType}?${searchParams.toString()}`;
        let pageCount = 0;
        initialFhirRecord[resourceType] = initialFhirRecord[resourceType] || []; // Ensure array exists

        console.log(`[CLIENT FETCH] Starting fetch for ${resourceType} with params: ${JSON.stringify(params || {})}`);
        while (url && pageCount < MAX_BUNDLE_PAGES) {
            pageCount++;
            console.log(`[CLIENT FETCH] Fetching ${resourceType} page ${pageCount}: ${url.replace(fhirBaseUrl, '')}`);
            try {
                const response = await fetchWithToken(url, accessToken);
                if (!response.ok) {
                    console.warn(`[CLIENT FETCH] Failed page fetch for ${resourceType} (${response.status}): ${url}`);
                    break; // Stop pagination on error for this type
                }
                const bundle = await response.json();
                if (bundle.entry && Array.isArray(bundle.entry)) {
                    // Process each entry individually and place in the correct bucket
                    for (const entry of bundle.entry) {
                        const resource = entry.resource;
                        if (resource && resource.resourceType) {
                            const actualResourceType = resource.resourceType;
                            // Ensure the array for the actual type exists
                            if (!initialFhirRecord[actualResourceType]) {
                                initialFhirRecord[actualResourceType] = [];
                            }
                            // Add the resource to the correct bucket
                            initialFhirRecord[actualResourceType].push(resource);
                            initialTotalFetched++; // Increment total fetched count
                        } else if (entry.response && entry.response.outcome) {
                            // Handle OperationOutcome entries if needed (e.g., log warnings)
                            console.warn(`[CLIENT FETCH] Bundle for ${resourceType} included an OperationOutcome: ${JSON.stringify(entry.response.outcome)}`);
                        } else {
                             console.warn(`[CLIENT FETCH] Bundle entry for ${resourceType} missing resource or resourceType:`, entry);
                         }
                    }
                }
                // Find the 'next' link for pagination
                const nextLink = bundle.link?.find((link: any) => link.relation === 'next');
                url = nextLink?.url;
            } catch (error) {
                console.error(`[CLIENT FETCH] Error processing page for ${resourceType}:`, error);
                url = undefined; // Stop pagination on error
            }
        }
        if (pageCount === MAX_BUNDLE_PAGES && url) {
            console.warn(`[CLIENT FETCH] Reached max page limit (${MAX_BUNDLE_PAGES}) for ${resourceType}. Data may be incomplete.`);
        }
        console.log(`[CLIENT FETCH] Finished fetch for ${resourceType}. Found ${initialFhirRecord[resourceType].length} resources.`);
    });

    await Promise.all(searchPromises);

    console.log(`[CLIENT FETCH] Initial fetch complete. Total resources: ${initialTotalFetched}`);
    return { initialFhirRecord, initialTotalFetched };
}

// --- Function to resolve references ---
async function resolveFhirReferencesClient(
    currentRecord: Record<string, any[]>,
    accessToken: string,
    fhirBaseUrl: string,
    maxIterations: number = 3
): Promise<{ resolvedFhirRecord: Record<string, any[]>; referencesAddedCount: number }> {
    console.log(`[CLIENT RESOLVE] Starting reference resolution (Max Iterations: ${maxIterations})...`);
    let referencesAddedCount = 0;
    let unresolvedReferences = new Set<string>();
    const fetchedReferenceUrls = new Set<string>(); // Track URLs already fetched/being fetched

    // Function to add a resource to the record
    const addResource = (resource: any) => {
        if (!resource || !resource.resourceType || !resource.id) return false;
        const type = resource.resourceType;
        if (!currentRecord[type]) {
            currentRecord[type] = [];
        }
        // Avoid adding duplicates
        if (!currentRecord[type].some(existing => existing.id === resource.id)) {
            currentRecord[type].push(resource);
            return true;
        }
        return false;
    };

    // Helper to extract references from an object/array
    const extractReferences = (obj: any) => {
        if (!obj) return;
        if (Array.isArray(obj)) {
            obj.forEach(extractReferences);
        } else if (typeof obj === 'object') {
            if (obj.reference && typeof obj.reference === 'string' && !obj.reference.startsWith('#')) {
                const refUrl = new URL(obj.reference, fhirBaseUrl).toString();
                // Basic check to avoid fetching things that look like external URLs or URNs immediately
                if (refUrl.startsWith(fhirBaseUrl) && !refUrl.includes('urn:')) {
                    unresolvedReferences.add(refUrl);
                }
            }
            Object.values(obj).forEach(extractReferences);
        }
    };

    for (let i = 0; i < maxIterations; i++) {
        console.log(`[CLIENT RESOLVE] Iteration ${i + 1}`);
        unresolvedReferences.clear();

        // Find all references in the current record
        Object.values(currentRecord).flat().forEach(extractReferences);

        const referencesToFetch = [...unresolvedReferences].filter(url => !fetchedReferenceUrls.has(url));

        if (referencesToFetch.length === 0) {
            console.log(`[CLIENT RESOLVE] No new unresolved references found in iteration ${i + 1}.`);
            break; // No new references to resolve
        }

        console.log(`[CLIENT RESOLVE] Found ${referencesToFetch.length} unique, new references to fetch in iteration ${i + 1}.`);
        referencesToFetch.forEach(url => fetchedReferenceUrls.add(url)); // Mark as being fetched

        const fetchPromises = referencesToFetch.map(url => fetchResource(url, accessToken));
        const resolvedResources = (await Promise.all(fetchPromises)).filter(Boolean);

        let iterationAddedCount = 0;
        resolvedResources.forEach(resource => {
            if (addResource(resource)) {
                iterationAddedCount++;
            }
        });

        console.log(`[CLIENT RESOLVE] Added ${iterationAddedCount} new resources in iteration ${i + 1}.`);
        referencesAddedCount += iterationAddedCount;

        if (iterationAddedCount === 0 && i > 0) {
             console.log(`[CLIENT RESOLVE] No new resources added in iteration ${i + 1}, stopping early.`);
             break; // Optimization: stop if an iteration adds no new resources
         }
    }

    if (unresolvedReferences.size > 0) {
        console.warn(`[CLIENT RESOLVE] ${unresolvedReferences.size} references might still be unresolved after ${maxIterations} iterations.`);
    }

    console.log(`[CLIENT RESOLVE] Reference resolution finished. Total resources added: ${referencesAddedCount}`);
    return { resolvedFhirRecord: currentRecord, referencesAddedCount };
}

// --- Function to process attachments ---
async function processFhirAttachmentsClient(
    fhirRecord: Record<string, any[]>,
    accessToken: string,
    fhirBaseUrl: string
): Promise<ClientProcessedAttachment[]> {
    console.log('[CLIENT ATTACH] Processing attachments...');
    const processedAttachments: ClientProcessedAttachment[] = [];
    const attachmentPromises: Promise<void>[] = [];

    // Helper to find attachments within a resource
    const findAttachments = (resource: any, pathPrefix: string = '') => {
        if (!resource) return;

        const currentPaths = KNOWN_ATTACHMENT_PATHS.get(resource.resourceType);
        if (currentPaths) {
            for (const attachmentPath of currentPaths) {
                // Simple path traversal for now (e.g., 'content.attachment')
                // Might need a more robust solution like lodash.get if paths get complex
                let obj = resource;
                const parts = attachmentPath.split('.');
                try {
                    for (const part of parts) {
                        if (!part) break; // Handle empty parts like for Binary
                        obj = obj[part];
                        if (!obj) break;
                    }
                    if (obj) {
                        // Handle cases where the path leads to an array of attachments
                        const attachments = Array.isArray(obj) ? obj : [obj];
                        for (const attachment of attachments) {
                            if (typeof attachment === 'object' && (attachment.url || attachment.data)) {
                                attachmentPromises.push(processSingleAttachment(resource, attachmentPath, attachment, accessToken, fhirBaseUrl, processedAttachments));
                            }
                        }
                    }
                } catch (e) { /* Ignore errors traversing paths that don't exist */ }
            }
        }
    };

    // Iterate through all resources and find attachments
    Object.values(fhirRecord).flat().forEach(resource => findAttachments(resource));

    await Promise.all(attachmentPromises);
    console.log(`[CLIENT ATTACH] Finished processing. Found ${processedAttachments.length} attachments.`);
    return processedAttachments;
}

// Helper to process a single attachment object
async function processSingleAttachment(
    resource: any,
    path: string,
    attachment: AttachmentLike,
    accessToken: string,
    fhirBaseUrl: string,
    outputList: ClientProcessedAttachment[]
): Promise<void> {
    const contentType = attachment.contentType || 'application/octet-stream';
    let contentBase64: string | null = null;
    let contentPlaintext: string | null = null;

    try {
        if (attachment.data) {
            // Assume data is base64 already
            contentBase64 = attachment.data;
            // Attempt decoding if it looks like text
            if (contentType.startsWith('text/')) {
                try {
                    contentPlaintext = atob(contentBase64); // Simple base64 to text
                } catch (e) {
                    console.warn(`[CLIENT ATTACH] Failed to decode base64 text for ${resource.resourceType}/${resource.id} at ${path}:`, e);
                }
            }
        } else if (attachment.url) {
            const attachmentUrl = new URL(attachment.url, fhirBaseUrl).toString();
            console.log(`[CLIENT ATTACH] Fetching attachment URL: ${attachmentUrl}`);
            const response = await fetchWithToken(attachmentUrl, accessToken);
            if (response.ok) {
                const blob = await response.blob();
                contentBase64 = await blobToBase64(blob);

                // Attempt text decoding for known text types
                if (contentType.startsWith('text/') || contentType.includes('json') || contentType.includes('xml')) {
                    try {
                        // Use TextDecoder for better charset handling if possible
                        // Extract charset from contentType if present, e.g., text/plain; charset=utf-8
                        const charsetMatch = contentType.match(/charset=([^;]+)/);
                        const encoding = charsetMatch ? charsetMatch[1].trim() : 'utf-8'; // Default to utf-8
                        contentPlaintext = await new TextDecoder(encoding, { fatal: false }).decode(await blob.arrayBuffer());
                        console.log(`[CLIENT ATTACH] Decoded text content for ${contentType}`);
                    } catch (e) {
                        console.warn(`[CLIENT ATTACH] Failed to decode text content for ${resource.resourceType}/${resource.id} at ${path} (type: ${contentType}):`, e);
                        // Fallback: try reading blob as text directly (might get encoding wrong)
                        try {
                            contentPlaintext = await blob.text();
                        } catch { /* Ignore fallback error */ }
                    }
                }
            } else {
                console.warn(`[CLIENT ATTACH] Failed to fetch attachment URL ${attachmentUrl}: ${response.status}`);
            }
        }

        outputList.push({
            resourceType: resource.resourceType,
            resourceId: resource.id,
            path: path,
            contentType: contentType,
            json: JSON.stringify(attachment), // Store original attachment JSON
            contentBase64: contentBase64,
            contentPlaintext: contentPlaintext
        });

    } catch (error) {
        console.error(`[CLIENT ATTACH] Error processing attachment for ${resource.resourceType}/${resource.id} at ${path}:`, error);
        // Still add entry, but with null content
        outputList.push({
            resourceType: resource.resourceType,
            resourceId: resource.id,
            path: path,
            contentType: contentType,
            json: JSON.stringify(attachment),
            contentBase64: null,
            contentPlaintext: null
        });
    }
}


// --- Main Orchestration Function (Client-Side) ---
export async function fetchAllEhrDataClientSide(accessToken: string, fhirBaseUrl: string, patientId: string): Promise<ClientFullEHR> {
    console.log(`[CLIENT ORCHESTRATE] Starting data fetch for Patient: ${patientId}`);

    try {
        // Step 1: Fetch initial resources
        const { initialFhirRecord, initialTotalFetched } = await fetchInitialFhirResourcesClient(accessToken, fhirBaseUrl, patientId);
        let currentFhirRecord = initialFhirRecord;
        let totalFetched = initialTotalFetched;
        console.log(`[CLIENT ORCHESTRATE] Initial fetch complete: ${totalFetched} resources.`);

        // Step 2: Resolve references
        const MAX_RESOLVE_ITERATIONS = 3;
        const { resolvedFhirRecord, referencesAddedCount } = await resolveFhirReferencesClient(
            currentFhirRecord,
            accessToken,
            fhirBaseUrl,
            MAX_RESOLVE_ITERATIONS
        );
        currentFhirRecord = resolvedFhirRecord;
        totalFetched += referencesAddedCount;
        console.log(`[CLIENT ORCHESTRATE] Reference resolution complete: ${totalFetched} resources total.`);

        // Step 3: Process attachments
        const processedAttachments = await processFhirAttachmentsClient(
            currentFhirRecord,
            accessToken,
            fhirBaseUrl
        );
        console.log(`[CLIENT ORCHESTRATE] Attachment processing complete: ${processedAttachments.length} attachments.`);

        const clientFullEHR: ClientFullEHR = {
            fhir: currentFhirRecord,
            attachments: processedAttachments
        };

        console.log(`[CLIENT ORCHESTRATE] Data retrieval finished successfully.`);
        return clientFullEHR;

    } catch (error) {
        console.error(`[CLIENT ORCHESTRATE] Critical error during data fetch/processing:`, error);
        throw new Error(`Client-side data retrieval failed: ${error instanceof Error ? error.message : String(error)}`);
    }
} 
import { ClientFullEHR, ClientProcessedAttachment } from './clientTypes';
import { KNOWN_ATTACHMENT_PATHS, AttachmentLike } from './src/types'; // Reuse server types where applicable
import { getInitialFhirSearchQueries } from './src/fhirSearchQueries'; // Import shared query function
import _ from 'lodash'; // Make sure lodash is installed (bun add lodash @types/lodash)

// --- Configuration --- 
const MAX_CONCURRENCY = 5;
const MAX_FOLLOW_REFERENCES_DEPTH = 2; // How many levels deep to follow references like subject, encounter
const MAX_ATTACHMENT_SIZE_MB = 10;
const REQUEST_TIMEOUT_MS = 30000; // 30 seconds timeout per request

// --- Interfaces & Types ---
interface FetchTask {
    url: string;
    description: string; // For progress reporting
    isAttachment?: boolean;
    resourceType?: string; // For attachment context
    resourceId?: string;   // For attachment context
    attachmentPath?: string; // For attachment context
    originalResourceJson?: any; // For attachments, the resource it belongs to
    depth: number; // For reference following
}

interface FetchResult {
    url: string;
    data?: any;
    error?: Error;
    isAttachment?: boolean;
    isBundle?: boolean;
}

export type ProgressCallback = (completed: number, total: number, message?: string) => void;

// --- Concurrency Manager ---
class ConcurrencyManager {
    private limit: number;
    private activeCount: number = 0;
    private waitingQueue: (() => void)[] = [];

    constructor(limit: number) {
        this.limit = limit;
    }

    async acquire(): Promise<void> {
        if (this.activeCount < this.limit) {
            this.activeCount++;
            return Promise.resolve();
        } else {
            // Wait for a slot
            return new Promise(resolve => {
                this.waitingQueue.push(() => {
                    // This function is called by release() when a slot is free
                    this.activeCount++;
                    resolve();
                });
            });
        }
    }

    release(): void {
        this.activeCount--;
        if (this.waitingQueue.length > 0) {
            const nextResolve = this.waitingQueue.shift();
            if (nextResolve) {
                // Run in next microtask to avoid potential stack overflows
                Promise.resolve().then(nextResolve); 
            }
        }
    }
}

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

// --- Core Fetching Function with Timeout --- 
async function fetchWithTimeout(url: string, options: RequestInit, timeout = REQUEST_TIMEOUT_MS): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        if (error instanceof DOMException && error.name === 'AbortError') {
            throw new Error(`Request timed out after ${timeout / 1000}s: ${url}`);
        }
        throw error;
    }
}

// --- Task Extraction Helpers --- 

// Finds FHIR references (like { reference: "Patient/123" }) within a resource
function findReferences(obj: any): { reference: string }[] {
    let refs: { reference: string }[] = [];
    if (!obj || typeof obj !== 'object') return refs;

    for (const key in obj) {
        if (key === 'reference' && typeof obj[key] === 'string' && obj[key].split('/').length === 2) { // Basic validation
            refs.push({ reference: obj[key] });
        } else if (typeof obj[key] === 'object') {
            refs = refs.concat(findReferences(obj[key]));
        }
    }
    return _.uniqWith(refs, _.isEqual); // Avoid duplicate references within the same resource
}

// Finds FHIR Attachment structures within a resource
function findAttachments(obj: any, currentPath: string = ''): { attachment: any, path: string }[] {
    let attachments: { attachment: any, path: string }[] = [];
    if (!obj || typeof obj !== 'object') return attachments;

    for (const key in obj) {
        if (!obj.hasOwnProperty(key)) continue;
        const value = obj[key];
        const newPath = currentPath ? `${currentPath}.${key}` : key;

        // Heuristic: Check if the object looks like an Attachment type
        if (typeof value === 'object' && value !== null && value.contentType && (value.url || value.data)) {
            attachments.push({ attachment: value, path: newPath });
        } else if (typeof value === 'object') {
            attachments = attachments.concat(findAttachments(value, newPath));
        }
    }
    return attachments;
}

// Resolves relative FHIR references (e.g., "Patient/123") to absolute URLs
function resolveReferenceUrl(reference: string, baseUrl: string): string | null {
    try {
        if (reference.startsWith('http://') || reference.startsWith('https://')) {
            return reference; // Already absolute
        }
        const parts = reference.split('/');
        if (parts.length === 2 && parts[0] && parts[1]) {
            const base = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
            return `${base}${reference}`;
        }
        if (reference.startsWith('#')) {
             console.log(`Skipping internal contained resource reference: ${reference}`);
             return null;
        }
        console.warn(`Cannot resolve non-standard reference: ${reference}`);
        return null;
    } catch (e) {
        console.error(`Error resolving reference URL (${reference}, ${baseUrl}):`, e);
        return null;
    }
}

// --- Resource and Attachment Processing --- 

// Extracts new fetch tasks (references, attachments) from a single FHIR resource
function extractTasksFromResource(resource: any, fhirBaseUrl: string, currentDepth: number): FetchTask[] {
    const newTasks: FetchTask[] = [];
    if (!resource || typeof resource !== 'object' || !resource.resourceType || !resource.id) return newTasks;

    // 1. Follow References (if depth allows)
    if (currentDepth < MAX_FOLLOW_REFERENCES_DEPTH) {
        const references = findReferences(resource);
        for (const ref of references) {
            const url = resolveReferenceUrl(ref.reference, fhirBaseUrl);
            if (url) {
                newTasks.push({ 
                    url: url, 
                    description: `Reference: ${ref.reference}`, 
                    depth: currentDepth + 1 
                });
            }
        }
    }

    // 2. Find Attachments to fetch
    const attachments = findAttachments(resource);
    for (const { attachment, path } of attachments) {
        if (attachment.url && typeof attachment.url === 'string') {
            // Only fetch if URL is present and size is reasonable
            if (!attachment.size || attachment.size <= MAX_ATTACHMENT_SIZE_MB * 1024 * 1024) {
                const attachmentUrl = resolveReferenceUrl(attachment.url, fhirBaseUrl);
                if (attachmentUrl) {
                    newTasks.push({ 
                        url: attachmentUrl, 
                        description: `Attachment for ${resource.resourceType}/${resource.id}`, 
                        isAttachment: true,
                        resourceType: resource.resourceType,
                        resourceId: resource.id,
                        attachmentPath: path,
                        originalResourceJson: resource, // Pass context
                        depth: currentDepth // Attachments don't increase depth level
                    });
                }
            } else {
                 console.warn(`Skipping large attachment (${(attachment.size / 1024 / 1024).toFixed(1)} MB) for ${resource.resourceType}/${resource.id} at path ${path}`);
            }
        } 
        // Note: Inline attachments (attachment.data) are handled separately after all fetches
    }

    return newTasks;
}

// Processes the Blob data from a fetched attachment
async function processAttachmentData(fetchResultData: Blob, task: FetchTask, clientAttachments: ClientProcessedAttachment[]): Promise<void> {
     if (!task.isAttachment || !task.resourceType || !task.resourceId || !task.attachmentPath || !task.originalResourceJson) {
         console.warn('Skipping attachment processing due to missing task context', { task });
         return;
     }
    
     const originalAttachmentNode = _.get(task.originalResourceJson, task.attachmentPath);
     if (!originalAttachmentNode) {
         console.warn(`Could not find original attachment node at path ${task.attachmentPath} for ${task.resourceType}/${task.resourceId}`);
         return;
     }

     let contentBase64: string | null = null;
     let contentPlaintext: string | null = null;
     const contentType = originalAttachmentNode.contentType || 'application/octet-stream';
     const blob = fetchResultData;

     try {
         // Convert Blob to Base64
         contentBase64 = await new Promise((resolve, reject) => {
             const reader = new FileReader();
             reader.onloadend = () => resolve((reader.result as string).split(',', 2)[1]);
             reader.onerror = reject;
             reader.readAsDataURL(blob);
         });

         // Attempt plaintext extraction for common types
         if (contentType.startsWith('text/') || contentType === 'application/json' || contentType === 'application/fhir+json') {
                             contentPlaintext = await blob.text();
         } 

         const newAttachment: ClientProcessedAttachment = {
             resourceType: task.resourceType,
             resourceId: task.resourceId,
             path: task.attachmentPath,
             contentType: contentType,
             contentPlaintext: contentPlaintext,
             contentBase64: contentBase64,
             json: JSON.stringify(originalAttachmentNode) 
         };

         // Avoid duplicates
          const attachmentKey = `${newAttachment.resourceType}/${newAttachment.resourceId}#${newAttachment.path}`;
          if (!clientAttachments.some(a => `${a.resourceType}/${a.resourceId}#${a.path}` === attachmentKey)){
               clientAttachments.push(newAttachment);
          }

     } catch (error) {
         console.error(`Error processing attachment data for ${task.resourceType}/${task.resourceId} at ${task.attachmentPath}:`, error);
     }
}

// Processes inline base64 encoded attachments found in already fetched resources
function processInlineAttachments(clientFullEhr: ClientFullEHR): void {
    console.log("Processing inline attachments...");
    let processedCount = 0;
    for (const resourceType in clientFullEhr.fhir) {
        for (const resource of clientFullEhr.fhir[resourceType]) {
            const attachments = findAttachments(resource);
            for (const { attachment, path } of attachments) {
                 if (attachment.data && !attachment.url && resource.id && resource.resourceType) { // Inline data only
                     const alreadyProcessed = clientFullEhr.attachments.some(att => 
                         att.resourceType === resource.resourceType && 
                         att.resourceId === resource.id && 
                         att.path === path
                     );
                     if (!alreadyProcessed) {
                         let contentBase64: string | null = attachment.data;
                         let contentPlaintext: string | null = null;
                         const contentType = attachment.contentType || 'application/octet-stream';
                         try {
                             if (contentBase64 && (contentType.startsWith('text/') || contentType === 'application/json' || contentType === 'application/fhir+json')) {
                                try { contentPlaintext = atob(contentBase64); } catch (decodeError) {
                                     console.warn(`Failed to decode base64 for inline text attachment ${resource.resourceType}/${resource.id} at ${path}:`, decodeError);
                                }
                             }
                              clientFullEhr.attachments.push({
                                 resourceType: resource.resourceType,
                                 resourceId: resource.id,
                                 path: path,
                                 contentType: contentType,
                                 contentPlaintext: contentPlaintext,
                                 contentBase64: contentBase64,
                                 json: JSON.stringify(attachment)
                             });
                             processedCount++;
                         } catch (inlineError) {
                             console.error(`Error processing inline attachment for ${resource.resourceType}/${resource.id} at ${path}:`, inlineError);
                         }
                     }
                 }
            }
        }
    }
    console.log(`Finished processing ${processedCount} inline attachments.`);
}


// --- Simplified Parallel Fetch Orchestrator --- 
export async function fetchAllEhrDataClientSideParallel(
    accessToken: string,
    fhirBaseUrl: string,
    patientId: string,
    progressCallback: ProgressCallback
): Promise<ClientFullEHR> {

    const clientFullEhr: ClientFullEHR = { fhir: {}, attachments: [] };
    const fetchedUrls = new Set<string>(); // Tracks URLs already added to a batch
    const pool = new ConcurrencyManager(MAX_CONCURRENCY);
    let completedFetches = 0;
    let totalTasks = 0; 

    const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/fhir+json, application/json, */*' 
    };

    // --- Fetch and Process Single Task Function (Uses pool, updates clientFullEhr directly) ---
    async function fetchAndProcessTask(task: FetchTask): Promise<FetchTask[]> { 
        await pool.acquire(); // Wait for a slot
        
        let discoveredTasks: FetchTask[] = [];
        let taskCompletedSuccessfully = false;

        try {
            progressCallback(completedFetches, totalTasks, `Fetching: ${task.description}...`);
            const response = await fetchWithTimeout(task.url, { headers }, REQUEST_TIMEOUT_MS);
            
            let resultData: any = null;
            let isJson = false;
            let isAttachmentBlob = false;
            const contentType = response.headers.get('content-type') || '';

            if (contentType.includes('json')) {
                resultData = await response.json(); isJson = true;
            } else if (task.isAttachment) {
                resultData = await response.blob(); isAttachmentBlob = true;
            } else { // Fallback for unexpected types
                console.warn(`Unexpected content type (${contentType}) for ${task.url}, attempting text.`);
                resultData = await response.text();
            }

            if (!response.ok) { // Handle HTTP errors
                let errorMsg = `HTTP ${response.status} for ${task.url}`;
                if (isJson && resultData?.issue?.[0]?.diagnostics) { errorMsg += `: ${resultData.issue[0].diagnostics}`; }
                else if (typeof resultData === 'string') { errorMsg += `: ${resultData.substring(0, 100)}`; }
                throw new Error(errorMsg);
            }

            // --- Process Success Result ---
            if (isJson && resultData?.resourceType === 'Bundle' && resultData.entry) { // Process Bundle
                const entries = resultData.entry;
                for (const entry of entries) {
                    if (entry.resource) {
                        const res = entry.resource;
                        if (res.resourceType && res.id) { 
                            if (!clientFullEhr.fhir[res.resourceType]) clientFullEhr.fhir[res.resourceType] = [];
                            // Add resource if new
                            if (!clientFullEhr.fhir[res.resourceType].some(r => r.id === res.id)) {
                                clientFullEhr.fhir[res.resourceType].push(res);
                                discoveredTasks = discoveredTasks.concat(extractTasksFromResource(res, fhirBaseUrl, task.depth));
                            }
                        }
                    }
                }
            } else if (task.isAttachment && isAttachmentBlob && resultData instanceof Blob) { // Process Attachment Blob
                await processAttachmentData(resultData, task, clientFullEhr.attachments);
            } else if (isJson && resultData?.resourceType && resultData.id) { // Process Single Resource
                const res = resultData;
                if (!clientFullEhr.fhir[res.resourceType]) clientFullEhr.fhir[res.resourceType] = [];
                // Add resource if new
                 if (!clientFullEhr.fhir[res.resourceType].some(r => r.id === res.id)) {
                    clientFullEhr.fhir[res.resourceType].push(res);
                    discoveredTasks = discoveredTasks.concat(extractTasksFromResource(res, fhirBaseUrl, task.depth));
                }
            } else { // Log other successful fetches
                 console.log(`Successfully fetched non-FHIR, non-attachment URL: ${task.url}`);
            }
            taskCompletedSuccessfully = true; // Mark as success for progress message

        } catch (error) {
            // Log fetch/processing error (already includes URL from error message usually)
            console.error(`Error processing task "${task.description}":`, error);
        } finally {
            // This task is complete (either success or failure)
            completedFetches++;
            const statusMsg = taskCompletedSuccessfully ? `Completed: ${task.description}` : `Failed: ${task.description}`;
            progressCallback(completedFetches, totalTasks, statusMsg); // Update progress
            pool.release(); // IMPORTANT: Release the pool slot
        }
        return discoveredTasks; // Return tasks discovered from this resource
    }
    // --- End of fetchAndProcessTask ---

    // --- Initialize Task List ---
    let currentTasks: FetchTask[] = [];
    const initialResourceTypes = [ // Define types for initial fetch
        'Observation', 'Condition', 'MedicationRequest', 'Procedure', 
        'AllergyIntolerance', 'Immunization', 'DiagnosticReport', 'DocumentReference', 
        'Encounter' 
    ];
    
    // Add initial search tasks
    initialResourceTypes.forEach(type => {
        const url = `${fhirBaseUrl}/${type}?patient=${patientId}`; // Add _count=500 if needed/supported
        const normalizedUrl = url.replace(/\/$/, ''); 
        if (!fetchedUrls.has(normalizedUrl)) {
            fetchedUrls.add(normalizedUrl);
            currentTasks.push({ url: url, description: `Initial ${type}`, depth: 0 });
        }
    });
    // Add direct patient fetch task
    const patientUrl = `${fhirBaseUrl}/Patient/${patientId}`;
    const normalizedPatientUrl = patientUrl.replace(/\/$/, '');
    if (!fetchedUrls.has(normalizedPatientUrl)) {
        fetchedUrls.add(normalizedPatientUrl);
        currentTasks.push({ url: patientUrl, description: "Patient Record", depth: 0 });
    }
    
    totalTasks = currentTasks.length;
    progressCallback(0, totalTasks, 'Starting initial fetch batch...');
    if (totalTasks === 0) {
         console.warn("No initial tasks generated.");
         return clientFullEhr; 
    }

    // --- Main Processing Loop (Batching) ---
    while (currentTasks.length > 0) {
        const batchDescription = `Batch of ${currentTasks.length} tasks`;
        console.log(`Starting ${batchDescription}...`); // Log batch start
        
        // Start all fetch-and-process operations for the current batch.
        // The ConcurrencyManager limits how many actually run simultaneously.
        const promises = currentTasks.map(task => fetchAndProcessTask(task));
        
        // Wait for all promises in the current batch to settle (complete or fail)
        const results = await Promise.allSettled(promises);

        // Prepare the list of tasks for the *next* batch
        const nextBatchTasks: FetchTask[] = [];
        results.forEach(settledResult => {
            // Check if the promise was fulfilled and returned new tasks
            if (settledResult.status === 'fulfilled' && Array.isArray(settledResult.value)) {
                const newTasksFromResult: FetchTask[] = settledResult.value; 
                for (const newTask of newTasksFromResult) {
                    // Only add the task if the URL hasn't been fetched before
                    const normalizedUrl = newTask.url.replace(/\/$/, ''); 
                    if (!fetchedUrls.has(normalizedUrl)) {
                         fetchedUrls.add(normalizedUrl); // Mark as added
                         nextBatchTasks.push(newTask);
                         totalTasks++; // Increment total count for progress UI
                    }
                }
            } 
            // No special handling needed for 'rejected' status here, error logged within fetchAndProcessTask
        });
        
        console.log(`${batchDescription} finished. Found ${nextBatchTasks.length} new unique tasks.`);
        
        // Update progress after batch completes (totalTasks might have increased)
        progressCallback(completedFetches, totalTasks, `${batchDescription} finished. Starting next...`);

        currentTasks = nextBatchTasks; // Set up tasks for the next iteration
    }
    // --- End of Main Loop ---

    console.log(`All fetch batches completed. Final progress: ${completedFetches}/${totalTasks}`);
    
    // --- Final Processing ---
    progressCallback(completedFetches, totalTasks, "Processing inline data..."); // Update status before final step
    processInlineAttachments(clientFullEhr);

    progressCallback(completedFetches, totalTasks, "All fetching complete."); // Final progress update
    console.log(`Finished fetching. Resources: ${Object.keys(clientFullEhr.fhir).length} types, Attachments: ${clientFullEhr.attachments.length}`);
    
    console.log("Returning ClientFullEHR object from fetchAllEhrDataClientSideParallel.");
    return clientFullEhr; // Return the populated object
} 
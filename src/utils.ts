/**
 * Resolves a FHIR URL from a relative or absolute path and base URL.
 */
export function resolveFhirUrl(relativeOrAbsolutePath: string, fhirBaseUrl: string): URL {
    if (relativeOrAbsolutePath.startsWith('http')) {
        return new URL(relativeOrAbsolutePath);
    }
    
    // Handle paths with or without leading slash
    const cleanPath = relativeOrAbsolutePath.startsWith('/')
        ? relativeOrAbsolutePath.substring(1)
        : relativeOrAbsolutePath;
        
    // Create URL, ensuring the base ends with a slash
    const baseWithSlash = fhirBaseUrl.endsWith('/') 
        ? fhirBaseUrl 
        : `${fhirBaseUrl}/`;
        
    return new URL(cleanPath, baseWithSlash);
}

/**
 * Fetches a FHIR resource from the specified URL using the provided access token.
 */
export async function fetchFhirResource(url: string, accessToken: string): Promise<any> {
    console.log(`[FHIR Fetch] GET ${url}`);
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/fhir+json'
        }
    });
    
    if (!response.ok) {
        throw new Error(`Failed to fetch resource from ${url}: status ${response.status}`);
    }
    
    return response.json();
}

/**
 * Fetches all pages of a FHIR search result, following next links.
 */
export async function fetchAllPages(initialUrl: string, accessToken: string): Promise<any[]> {
    let resources: any[] = [];
    let nextUrl: string | undefined = initialUrl;
    let pageCount = 0;
    const maxPages = 200;

    console.log(`[FHIR Fetch] Starting pagination for ${initialUrl}`);
    while (nextUrl && pageCount < maxPages) {
        pageCount++;
        console.log(`[FHIR Fetch] Fetching page ${pageCount}: ${nextUrl}`);
        const bundle = await fetchFhirResource(nextUrl, accessToken);
        if (bundle.entry) {
            const pageResources = bundle.entry.map((e: any) => e.resource).filter((r: any) => r);
            resources = resources.concat(pageResources);
            console.log(`[FHIR Fetch] Added ${pageResources.length} resources from page ${pageCount}. Total: ${resources.length}`);
        }
        const nextLink = bundle.link?.find((link: any) => link.relation === 'next');
        nextUrl = nextLink?.url;
    }
    if (pageCount >= maxPages && nextUrl) {
        console.warn(`[FHIR Fetch] Reached maximum pagination limit (${maxPages}) for ${initialUrl}. Data may be incomplete.`);
    }
    console.log(`[FHIR Fetch] Pagination complete for ${initialUrl}. Total resources fetched: ${resources.length}`);
    return resources;
}

/**
 * Fetches content from an attachment URL.
 */
export async function fetchAttachmentContent(attachmentUrl: string, fhirBaseUrl: string, accessToken: string): Promise<{ contentRaw: Buffer, contentType: string | null }> {
    const url = resolveFhirUrl(attachmentUrl, fhirBaseUrl);
    console.log(`[Attachment Fetch] GET ${url}`);
    
    const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': '*/*'
        }
    });
    
    if (!response.ok) {
        throw new Error(`Failed to fetch attachment from ${url}: status ${response.status}`);
    }
    
    const contentType = response.headers.get('content-type');
    const arrayBuffer = await response.arrayBuffer();
    const contentRaw = Buffer.from(arrayBuffer);
    
    return { contentRaw, contentType };
}

/**
 * Gets a value at a specified path within an object, supporting nested access.
 */
export function getValueAtPath(obj: any, path: string): any | any[] | undefined {
    if (!path) return undefined;
    const parts = path.split('.');
    let current: any = obj;
    
    for (const part of parts) {
        if (current === undefined || current === null) return undefined;
        current = current[part];
    }
    
    return current;
} 
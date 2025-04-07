#!/usr/bin/env node

import * as fs from 'fs';
import * as process from 'process';
import * as path from 'path'; // For potential future use or resolving paths

// --- Interfaces for FHIR Resources (Simplified) ---

interface Identifier {
    system?: string;
    value?: string;
}

interface Coding {
    system?: string;
    code?: string;
    display?: string;
}

interface CodeableConcept {
    coding?: Coding[];
    text?: string;
}

interface Address {
    type?: 'postal' | 'physical' | 'both';
    text?: string;
    line?: string[];
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
}

interface Reference {
    reference?: string;
    type?: string;
    identifier?: Identifier;
    display?: string;
}

interface BaseResource {
    resourceType: string;
    id?: string;
}

interface Endpoint extends BaseResource {
    resourceType: 'Endpoint';
    status?: string;
    connectionType: Coding; // Required pattern: hl7-fhir-rest
    name?: string;
    managingOrganization?: Reference;
    contact?: { system?: string; value?: string }[];
    address: string; // The FHIR base URL (required)
    extension?: any[]; // To capture fhir-version etc. if needed later
}

interface Organization extends BaseResource {
    resourceType: 'Organization';
    identifier?: Identifier[];
    active?: boolean;
    type?: CodeableConcept[];
    name?: string;
    alias?: string[];
    telecom?: { system?: string; value?: string }[];
    address?: Address[];
    partOf?: Reference;
    endpoint?: Reference[];
    extension?: any[]; // To capture brand extensions etc. if needed later
}

interface BundleEntry {
    fullUrl?: string;
    resource?: Endpoint | Organization; // Add other types if necessary
}

interface Bundle {
    resourceType: 'Bundle';
    id?: string;
    type: 'collection' | string; // Expect 'collection'
    timestamp?: string;
    entry?: BundleEntry[];
}


// --- Interfaces for Processed Output ---

interface ProcessedEndpoint {
    url: string;
    name?: string; // Optional: Endpoint name for context
}

interface SearchableItem {
    // Information about the item itself (Brand or Facility)
    searchName: string;     // Name used primarily for searching (lower case?) - could be same as displayName
    displayName: string;    // Name for display (Brand or Facility name)
    itemType: 'brand' | 'facility';
    city?: string | null;      // Facility city
    state?: string | null;     // Facility state
    postalCode?: string | null;// Facility postal code
    // Note: We could add more searchable fields like address line if desired

    // Direct access to the associated primary brand details
    brandName: string;        // Name of the associated primary brand
    brandId?: string;         // Optional: ID of the brand for potential client-side grouping
    // brandLogoUrl?: string; // Optional: If we extract from extensions
    // brandWebsiteUrl?: string; // Optional: If we extract from telecom
    endpoints: ProcessedEndpoint[]; // Endpoints associated with the primary brand
}

interface ProcessedData {
    items: SearchableItem[];
    // We could add metadata here, like processing date
    processedTimestamp: string;
}

// --- Helper Functions ---

function parseArgs(): string {
    const args = process.argv.slice(2);
    let brandsFile: string | null = null;
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--brands' && i + 1 < args.length) {
            brandsFile = args[i + 1];
            break;
        }
    }
    if (!brandsFile) {
        console.error('Usage: ts-node process-brands.ts --brands <path-to-brands-bundle.json>');
        process.exit(1);
    }
    return brandsFile;
}

function extractIdFromReference(reference?: string): string | null {
    if (!reference) return null;
    // Handles relative URLs (e.g., "Endpoint/id", "Organization/id") or urn:uuid:id
    const parts = reference.split(/[\/:]/);
    return parts.pop() || null;
}

// --- Main Processing Logic ---

function processBrandsBundle(bundle: Bundle): ProcessedData {
    if (!bundle || !Array.isArray(bundle.entry)) {
        throw new Error("Invalid bundle structure: 'entry' array not found.");
    }

    // Intermediate storage
    const endpointsMap = new Map<string, ProcessedEndpoint>(); // Endpoint ID -> { url, name }
    const primaryBrandsMap = new Map<string, { // Brand ID -> Intermediate data
        resource: Organization;
        resolvedEndpoints: ProcessedEndpoint[]; // Pre-resolve endpoints here
    }>();
    const facilityEntries: BundleEntry[] = []; // Store entries containing facility Orgs

    // --- First Pass: Categorize and Extract Endpoints/Brands ---
    for (const entry of bundle.entry) {
        if (!entry?.resource?.id) continue; // Need ID for mapping
        const resource = entry.resource;
        const id = resource.id;

        try {
            if (resource.resourceType === 'Endpoint') {
                // Basic validation: check for required fields for our use case
                if (resource.address && resource.connectionType?.code === 'hl7-fhir-rest') {
                    endpointsMap.set(id, {
                        url: resource.address,
                        name: resource.name
                    });
                } else {
                     // console.warn(`Skipping endpoint ${id}: missing address or not hl7-fhir-rest.`);
                }
            } else if (resource.resourceType === 'Organization') {
                if (!resource.partOf) { // Primary Brand
                    primaryBrandsMap.set(id, { resource: resource, resolvedEndpoints: [] });
                } else { // Care Facility
                    facilityEntries.push(entry);
                }
            }
        } catch (error) {
            console.warn(`Error processing resource ID ${id}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    // --- Second Pass: Resolve Endpoints for Brands ---
    for (const [brandId, brandData] of primaryBrandsMap.entries()) {
        const endpointRefs = brandData.resource.endpoint || [];
        for (const epRef of endpointRefs) {
            const endpointId = extractIdFromReference(epRef.reference);
            if (endpointId && endpointsMap.has(endpointId)) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                brandData.resolvedEndpoints.push(endpointsMap.get(endpointId)!);
            } else {
                // console.warn(`Endpoint reference "${epRef.reference}" for brand "${brandData.resource.name || brandId}" (ID: ${brandId}) not found or invalid.`);
            }
        }
        // Sort endpoints by name or URL for consistent output? Optional.
        brandData.resolvedEndpoints.sort((a, b) => a.url.localeCompare(b.url));
    }


    // --- Third Pass: Create Searchable Items ---
    const searchableItems: SearchableItem[] = [];

    // Create items for Primary Brands
    for (const [brandId, brandData] of primaryBrandsMap.entries()) {
        const brandResource = brandData.resource;
        const brandName = brandResource.name || 'Unknown Brand';

        searchableItems.push({
            searchName: brandName.toLowerCase(), // Use lowercase for easier search matching
            displayName: brandName,
            itemType: 'brand',
            city: null, // Brands themselves don't have a single city in this model
            state: brandResource.address?.[0]?.state || null, // Maybe take first state? Or aggregate later? Null seems safest.
            postalCode: null,
            brandName: brandName, // It is its own brand
            brandId: brandId,
            endpoints: brandData.resolvedEndpoints,
        });
    }

    // Create items for Facilities
    for (const entry of facilityEntries) {
        const facilityResource = entry.resource as Organization; // We know these are Orgs
        const facilityName = facilityResource.name || 'Unknown Facility';

        const parentBrandId = extractIdFromReference(facilityResource.partOf?.reference);
        if (!parentBrandId || !primaryBrandsMap.has(parentBrandId)) {
             // console.warn(`Facility "${facilityName}" (ID: ${facilityResource.id}) references unknown parent brand "${facilityResource.partOf?.reference}". Skipping.`);
            continue;
        }

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const parentBrandData = primaryBrandsMap.get(parentBrandId)!;
        const parentBrandName = parentBrandData.resource.name || 'Unknown Parent Brand';

        let city: string | null = null;
        let state: string | null = null;
        let postalCode: string | null = null;

        if (Array.isArray(facilityResource.address) && facilityResource.address.length > 0) {
            // Take the first address as representative for the facility location
            const addr = facilityResource.address[0];
            city = addr.city || null;
            state = addr.state || null;
            postalCode = addr.postalCode || null;
        }

        searchableItems.push({
            searchName: facilityName.toLowerCase(),
            displayName: facilityName,
            itemType: 'facility',
            city: city,
            state: state,
            postalCode: postalCode,
            brandName: parentBrandName,
            brandId: parentBrandId, // Include parent brand ID
            endpoints: parentBrandData.resolvedEndpoints, // Use the pre-resolved endpoints
        });
    }

    // Optional: Sort all items for consistent output? By displayName?
    searchableItems.sort((a, b) => a.displayName.localeCompare(b.displayName));


    return {
        items: searchableItems,
        processedTimestamp: new Date().toISOString(),
     };
}


// --- Main Execution ---
try {
    const brandsFilePath = parseArgs();
    if (!fs.existsSync(brandsFilePath)) {
        throw new Error(`Brands file not found: ${brandsFilePath}`);
    }
    const fileContent = fs.readFileSync(brandsFilePath, 'utf-8');
    const bundle: Bundle = JSON.parse(fileContent);

    const processedData = processBrandsBundle(bundle);

    // Output processed JSON to stdout - use standard indentation for readability
    // Gzip will handle the compression effectively.
    process.stdout.write(JSON.stringify(processedData, null, 2));

} catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
}

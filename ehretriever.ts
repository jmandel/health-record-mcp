import pkceChallenge from 'pkce-challenge'; // Import the library
import { fetchAllEhrDataClientSideParallel } from './clientFhirUtils'; // UPDATED: Import the parallel data fetching function

// --- Declare potential global constants injected by build ---
declare const __CONFIG_FHIR_BASE_URL__: string | undefined;
declare const __CONFIG_CLIENT_ID__: string | undefined;
declare const __CONFIG_SCOPES__: string | undefined;
declare const __DELIVERY_ENDPOINTS__: Record<string, { postUrl: string}> | undefined;
// NEW VENDOR CONFIG DECLARATION
declare const __VENDOR_CONFIG__: Record<string, { clientId: string; scopes: string; redirectUrl?: string }> | undefined;
// ----------------------------------------------------------

// Keys for sessionStorage
const AUTH_STORAGE_KEY = 'smart_auth_state';
const DELIVERY_TARGET_KEY = 'delivery_target_name';
const OPENER_TARGET_VALUE = '__opener__'; // Special value for opener target
const OPENER_TARGET_ORIGIN_KEY = 'opener_target_origin'; // NEW: Key for storing opener's origin

interface StoredAuthState {
    codeVerifier: string;
    state: string;
    tokenEndpoint: string;
    clientId: string;
    redirectUri: string;
    fhirBaseUrl: string;
}

// --- DOM Element References ---
let brandSelectorContainer: HTMLElement | null;
let brandSearchInput: HTMLInputElement | null;
let brandSearchSpinner: HTMLElement | null;
let brandResultsContainer: HTMLElement | null;
let brandModalBackdrop: HTMLElement | null;
let brandModal: HTMLElement | null;
let brandModalTitle: HTMLElement | null;
let brandModalDetails: HTMLElement | null;
let brandModalCancel: HTMLButtonElement | null;
let brandModalConnect: HTMLButtonElement | null;
let brandInitialLoadingMessage: HTMLElement | null;
// REMOVED form element variables
// let formContainer: HTMLElement | null;
// let ehrForm: HTMLFormElement | null;
// let ehrBaseUrlInput: HTMLInputElement | null;
// let ehrClientIdInput: HTMLInputElement | null;
// let ehrScopesInput: HTMLInputElement | null;
// let ehrRedirectUriInput: HTMLInputElement | null;
let statusContainer: HTMLElement | null;
let statusMessageElement: HTMLElement | null;
let progressContainer: HTMLElement | null;
let progressBar: HTMLProgressElement | null;
let progressText: HTMLElement | null;

// NEW: Inline Confirmation UI Elements
let confirmationContainer: HTMLElement | null;
let confirmationMessageElement: HTMLElement | null;
let confirmSendBtn: HTMLButtonElement | null;
let cancelSendBtn: HTMLButtonElement | null;

// NEW: Download Button Element
let downloadDataBtn: HTMLButtonElement | null;

// --- Brand Selector State ---
let allBrandItems: any[] = [];
let selectedBrandItem: any | null = null;
let currentBrandRenderAbortController: AbortController | null = null;
let brandDebounceTimer: number | null = null;
let currentFilteredItems: any[] = [];
let currentPage = 1;
const ITEMS_PER_PAGE = 50;
// NEW: Store the vendor name associated with the currently loaded brand file
let currentVendorName: string | null = null;

// NEW: Pagination DOM Elements
let brandPaginationControls: HTMLElement | null;
let brandPrevBtn: HTMLButtonElement | null;
let brandNextBtn: HTMLButtonElement | null;
let brandPageInfo: HTMLElement | null;

// --- Brand Selector Configuration ---
const RENDER_CHUNK_SIZE = 50;
const RENDER_DELAY = 0; // ms delay between rendering chunks
const DEBOUNCE_DELAY = 300; // ms delay for search input debounce

// Helper function to update status message
function updateStatus(message: string, isError: boolean = false) {
    if (statusMessageElement) {
        statusMessageElement.textContent = message;
        statusMessageElement.style.color = isError ? 'red' : 'black';
    }
    console.log(`Status: ${message}`);
    if (isError) {
        console.error(`Status Error: ${message}`);
    }
}

// Helper function to manage display
function showStatusContainer(show: boolean) {
    const formContainer = document.getElementById('form-container');
    const statusContainer = document.getElementById('status-container');
    if (formContainer) formContainer.style.display = show ? 'none' : 'block';
    if (statusContainer) statusContainer.style.display = show ? 'block' : 'none';
}

// Helper function to show/hide progress UI
function showProgressContainer(show: boolean) {
    const progressContainer = document.getElementById('progress-container');
    if (progressContainer) progressContainer.style.display = show ? 'block' : 'none';
}

// NEW: Helper function to show/hide confirmation UI
function showConfirmationContainer(show: boolean) {
    const confirmationContainer = document.getElementById('confirmation-container');
    if (confirmationContainer) confirmationContainer.style.display = show ? 'block' : 'none';
}

// Helper function to update progress UI
function updateProgress(completed: number, total: number, message?: string) {
    const progressBar = document.getElementById('fetch-progress') as HTMLProgressElement;
    const progressText = document.getElementById('progress-text');

    if (progressBar && progressText) {
        const percentage = total > 0 ? (completed / total) * 100 : 0;
        progressBar.value = percentage;
        progressText.textContent = `(${completed}/${total}) ${message || ''}`.trim();
        console.log(`Progress: ${completed}/${total} (${percentage.toFixed(1)}%) ${message || ''}`);
    }

    // Show the container if it's not already visible and we have progress
    if (total > 0) {
        const progressContainer = document.getElementById('progress-container');
        if (progressContainer && progressContainer.style.display === 'none') {
            showProgressContainer(true);
        }
    }

    // --- NEW: Get Confirmation UI References ---
    confirmationContainer = document.getElementById('confirmation-container');
    confirmationMessageElement = document.getElementById('confirmation-message');
    confirmSendBtn = document.getElementById('confirm-send-btn') as HTMLButtonElement | null;
    cancelSendBtn = document.getElementById('cancel-send-btn') as HTMLButtonElement | null;
    // -----------------------------------------
}

// Helper function to resolve potentially relative URLs to absolute ones
function makeAbsoluteUrl(urlStr: string): string {
    try {
        // Use the URL constructor with the current page's origin as the base
        // This correctly handles absolute URLs, root-relative URLs (/path), and other relative paths.
        const absoluteUrl = new URL(urlStr, window.location.origin);
        return absoluteUrl.toString();
    } catch (e) {
        console.error(`Error creating absolute URL from "${urlStr}":`, e);
        return urlStr; // Return original string on error
    }
}

// Function to generate a random string for state
function generateRandomString(length = 40) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

// --- Brand Selector Helper Functions ---

// Helper to safely get lowercase string or empty string
const safeLower = (str: any): string => (str ? String(str).toLowerCase() : '');

// Creates a DOM element for a single brand item tile
function createBrandTileElement(item: any): HTMLDivElement {
    const tile = document.createElement('div');
    tile.className = 'brand-tile';
    let detailsHTML = `<h3>${item.displayName}</h3>`;
    detailsHTML += `<p class="provider-info">Data Provider: ${item.brandName}</p>`;
    if (item.itemType === 'facility') {
        const locationParts = [item.city, item.state, item.postalCode].filter(Boolean);
        if (locationParts.length > 0) {
             detailsHTML += `<p class="location-info">Location: ${locationParts.join(', ')}</p>`;
        }
    }
    tile.innerHTML = detailsHTML;
    tile.addEventListener('click', () => showBrandModal(item));
    return tile;
}

// Renders a list of items into the results container in manageable chunks
function renderBrandItemsInChunks(itemsToRender: any[]) {
    if (!brandResultsContainer || !brandSearchSpinner) return;

    if (currentBrandRenderAbortController) { currentBrandRenderAbortController.abort(); }
    currentBrandRenderAbortController = new AbortController();
    const signal = currentBrandRenderAbortController.signal;
    if (brandResultsContainer) brandResultsContainer.innerHTML = ''; // Clear previous results

    if (itemsToRender.length === 0) {
        if (brandResultsContainer) brandResultsContainer.innerHTML = '<p class="brand-status-message">No matching organizations found.</p>';
        if (brandSearchSpinner) brandSearchSpinner.style.display = 'none';
        return;
    }

    let currentIndex = 0;
    const fragment = document.createDocumentFragment();

    function renderNextChunk() {
        if (signal.aborted) {
            if (brandSearchSpinner) brandSearchSpinner.style.display = 'none';
            return; // Stop if aborted
        }
        if (brandSearchSpinner) brandSearchSpinner.style.display = 'block'; // Show spinner during render
        const endTime = performance.now() + 16; // Target ~60fps budget
        let chunkCount = 0;

        while (performance.now() < endTime && currentIndex < itemsToRender.length) {
             fragment.appendChild(createBrandTileElement(itemsToRender[currentIndex]));
             currentIndex++;
             chunkCount++;
             if(chunkCount >= RENDER_CHUNK_SIZE) break; // Optional batch size limit per frame
        }
        if (brandResultsContainer) brandResultsContainer.appendChild(fragment); // Append the chunk

        if (currentIndex < itemsToRender.length) {
            setTimeout(renderNextChunk, RENDER_DELAY); // Schedule next chunk
        } else {
            if (brandSearchSpinner) brandSearchSpinner.style.display = 'none'; // Hide spinner when done
            currentBrandRenderAbortController = null; // Clear controller
        }
    }
    renderNextChunk(); // Start the rendering process
}

// *** NEW: Renders the items for the current page and updates controls ***
function renderCurrentPage() {
    if (!brandResultsContainer || !brandPaginationControls || !brandPrevBtn || !brandNextBtn || !brandPageInfo) {
        console.error("Cannot render page, pagination elements missing.");
        return;
    }

    const totalItems = currentFilteredItems.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    currentPage = Math.max(1, Math.min(currentPage, totalPages)); // Ensure currentPage is valid

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE; // slice excludes end index
    const itemsToDisplay = currentFilteredItems.slice(startIndex, endIndex);

    console.log(`Rendering page ${currentPage} of ${totalPages}. Items ${startIndex + 1}-${Math.min(endIndex, totalItems)} of ${totalItems}.`);

    renderBrandItemsInChunks(itemsToDisplay); // Render only this page's items

    // Update page info text
    brandPageInfo.textContent = `Page ${currentPage} of ${totalPages || 1}`;

    // Update button states
    brandPrevBtn.disabled = currentPage <= 1;
    brandNextBtn.disabled = currentPage >= totalPages;

    // Show/hide pagination controls
    brandPaginationControls.style.display = totalPages > 1 ? 'block' : 'none';
}

// Filters items based on search input and triggers rendering
function handleBrandSearch() {
    if (!brandSearchInput || !brandSearchSpinner) return;

    const searchTerm = brandSearchInput.value.toLowerCase().trim();
    const searchTokens = searchTerm.split(/[^\w\d]+/).filter(token => token.length > 0);

    brandSearchSpinner.style.display = 'block';

    // Filter all items based on the tokens
    currentFilteredItems = searchTokens.length === 0 // Store result in currentFilteredItems
        ? allBrandItems
        : allBrandItems.filter(item => {
            return searchTokens.every(token => {
                const fieldsToSearch = [
                    safeLower(item.displayName),
                    safeLower(item.brandName),
                    safeLower(item.city),
                    safeLower(item.state),
                    safeLower(item.postalCode)
                ];
                return fieldsToSearch.some(fieldValue => fieldValue.includes(token));
            });
        });

    // Reset to page 1 and render
    currentPage = 1;
    renderCurrentPage();
}

// Debounce function
function debounce(func: (...args: any[]) => void, delay: number) {
    return function(...args: any[]) {
        if (brandSearchSpinner) brandSearchSpinner.style.display = 'block'; // Show spinner immediately on input
        clearTimeout(brandDebounceTimer as number | undefined);
        brandDebounceTimer = window.setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

const debouncedBrandSearchHandler = debounce(handleBrandSearch, DEBOUNCE_DELAY);

// Shows the modal with details of the selected item
function showBrandModal(item: any) {
    if (!brandModalBackdrop || !brandModalTitle || !brandModalDetails) return;
    if (currentBrandRenderAbortController) { return; } // Don't show modal during render

    selectedBrandItem = item;
    brandModalTitle.textContent = `Connect to ${item.displayName}?`;
    let detailsHTML = `<p><strong>Display Name:</strong> ${item.displayName}</p>`;
    detailsHTML += `<p><strong>Data Provider:</strong> ${item.brandName}</p>`;
    if (item.itemType === 'facility') {
         const locationParts = [item.city, item.state, item.postalCode].filter(Boolean);
         if (locationParts.length > 0) { detailsHTML += `<p><strong>Location:</strong> ${locationParts.join(', ')}</p>`; }
    }
     // Display endpoints - **Crucially, we need a FHIR endpoint here**
     if (item.endpoints && Array.isArray(item.endpoints) && item.endpoints.length > 0) {
         detailsHTML += `<p><strong>Endpoints:</strong></p><ul>`;
         item.endpoints.forEach((ep: { url: string, name?: string, type?: string }) => {
             // Highlight potential FHIR endpoints
             const isFhir = ep.type === 'FHIR_BASE_URL' || safeLower(ep.url).includes('fhir');
             detailsHTML += `<li style="${isFhir ? 'font-weight: bold;' : ''}">${ep.url}${ep.name ? ` (${ep.name})` : ''}${ep.type ? ` [${ep.type}]` : ''}</li>`;
         });
         detailsHTML += `</ul>`;
     } else {
         detailsHTML += `<p><strong>Endpoints:</strong> None found</p>`;
     }
    brandModalDetails.innerHTML = detailsHTML;
    brandModalBackdrop.classList.add('visible');
}

// Hides the modal
function hideBrandModal() {
    if (!brandModalBackdrop) return;
    brandModalBackdrop.classList.remove('visible');
    selectedBrandItem = null;
}

// *** UPDATED FUNCTION: Initiates the SMART Auth Flow ***
async function initiateSmartAuth(fhirBaseUrl: string, vendorName: string) {
    // Define the default redirect URI (this page) - Defined here as it's only needed here
    const defaultRedirectUri = window.location.origin + window.location.pathname;

    console.log(`[initiateSmartAuth] Starting for FHIR Base URL: ${fhirBaseUrl}, Vendor: ${vendorName}`);
    showStatusContainer(true);
    showProgressContainer(false);
    updateStatus('Preparing authorization request...');

    // Get vendor-specific configuration
    const vendorConfig = (typeof __VENDOR_CONFIG__ !== 'undefined' ? __VENDOR_CONFIG__?.[vendorName] : undefined);

    if (!vendorConfig || !vendorConfig.clientId || !vendorConfig.scopes) {
        updateStatus(`Error: Configuration missing or incomplete for vendor '${vendorName}'. Cannot proceed.`, true);
        console.error(`Configuration missing or incomplete for vendor '${vendorName}' in __VENDOR_CONFIG__.`, __VENDOR_CONFIG__);
        showStatusContainer(false); // Hide status
        if (brandSelectorContainer) brandSelectorContainer.style.display = 'block'; // Show brand selector again
        return;
    }

    const clientId = vendorConfig.clientId;
    const scopes = vendorConfig.scopes;
    // Use vendor-specific redirectUrl if provided, otherwise default to current page
    const redirectUri = vendorConfig.redirectUrl ? makeAbsoluteUrl(vendorConfig.redirectUrl) : defaultRedirectUri;

    console.log(`[initiateSmartAuth] Using Vendor Config for '${vendorName}':`);
    console.log(`  Client ID: ${clientId}`);
    console.log(`  Scopes: ${scopes}`);
    console.log(`  Redirect URI: ${redirectUri}`);

    try {
        updateStatus('Performing SMART discovery...');
        // 1. SMART Discovery
        const fhirBaseUrlWithSlash = fhirBaseUrl.endsWith('/') ? fhirBaseUrl : fhirBaseUrl + '/';
        const wellKnownUrlString = fhirBaseUrlWithSlash + '.well-known/smart-configuration';
        console.log(`[initiateSmartAuth] Attempting SMART discovery at: ${wellKnownUrlString}`);
        const discoveryResponse = await fetch(wellKnownUrlString, {
            headers: { 'Accept': 'application/json' }
        });

        if (!discoveryResponse.ok) {
            throw new Error(`SMART discovery failed: ${discoveryResponse.status} ${discoveryResponse.statusText}`);
        }

        const smartConfig = await discoveryResponse.json();
        const authorizationEndpoint = smartConfig.authorization_endpoint;
        const tokenEndpoint = smartConfig.token_endpoint;

        if (!authorizationEndpoint || !tokenEndpoint) {
            throw new Error('SMART configuration missing required authorization or token endpoint.');
        }
        updateStatus('SMART discovery successful.');

        // 2. Generate PKCE & State
        updateStatus('Generating security parameters...');
        const { code_verifier: codeVerifier, code_challenge: codeChallenge } = pkceChallenge();
        const state = generateRandomString();

        // 3. Store necessary state for redirect
        const authState: StoredAuthState = {
            codeVerifier: codeVerifier,
            state: state,
            tokenEndpoint: tokenEndpoint,
            clientId: clientId, // Use vendor-specific clientId
            redirectUri: redirectUri, // Use determined redirectUri
            fhirBaseUrl: fhirBaseUrl
        };
        sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState));
        console.log('[initiateSmartAuth] Stored auth state in sessionStorage');

        // 4. Construct Authorization URL
        const authUrl = new URL(authorizationEndpoint);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('client_id', clientId); // Use vendor-specific clientId
        authUrl.searchParams.set('scope', scopes); // Use vendor-specific scopes
        authUrl.searchParams.set('redirect_uri', redirectUri); // Use determined redirectUri
        authUrl.searchParams.set('state', state);
        authUrl.searchParams.set('aud', fhirBaseUrl); // AUD is typically the FHIR base URL itself
        authUrl.searchParams.set('code_challenge', codeChallenge);
        authUrl.searchParams.set('code_challenge_method', 'S256');

        // 5. Redirect user
        updateStatus('Redirecting to EHR for authorization...');
        console.log(`[initiateSmartAuth] Redirecting to: ${authUrl.toString()}`);
        window.location.href = authUrl.toString();

    } catch (err: any) {
        updateStatus(`Error during authorization initiation: ${err.message}`, true);
        // Show brand selector again on error?
        if (brandSelectorContainer) brandSelectorContainer.style.display = 'block';
        sessionStorage.removeItem(AUTH_STORAGE_KEY);
        sessionStorage.removeItem(DELIVERY_TARGET_KEY);
    }
}

// *** UPDATED FUNCTION: Handles the click on the modal's "Connect" button ***
function handleBrandConnect() {
    // Use the globally stored currentVendorName
    if (!selectedBrandItem || !brandSelectorContainer || !currentVendorName) {
        console.error("Connect clicked but required elements, selection, or current vendor name missing.");
        hideBrandModal();
        updateStatus("Error: Cannot proceed with connection. Missing information.", true);
         // Show brand selector again if something is missing
        if (brandSelectorContainer) brandSelectorContainer.style.display = 'block';
        return;
    }

    console.log("--- Brand Connect Button Clicked ---");
    console.log("Selected Item:", selectedBrandItem);
    console.log(`Using Vendor Name (from source file): ${currentVendorName}`); // Log the vendor name being used


    // Find a suitable FHIR endpoint URL (logic remains the same)
    let fhirEndpointUrl: string | null = null;
    if (selectedBrandItem.endpoints && Array.isArray(selectedBrandItem.endpoints)) {
        const explicitFhirEndpoint = selectedBrandItem.endpoints[0];
        fhirEndpointUrl = explicitFhirEndpoint.url;
    }

    // Close the modal immediately
    hideBrandModal();

    if (fhirEndpointUrl) {
        console.log(`Found FHIR Endpoint: ${fhirEndpointUrl}`);

        // Hide brand selector
        if (brandSelectorContainer) brandSelectorContainer.style.display = 'none';

        // Initiate the auth flow using the found endpoint and the stored vendor name
        initiateSmartAuth(fhirEndpointUrl, currentVendorName); // Pass the correct vendor name

    } else {
        console.error("Could not find a suitable FHIR endpoint for the selected organization.");
        updateStatus("Error: Could not find a FHIR endpoint for the selected organization. Please try another.", true);
        // Show brand selector again if endpoint not found
        if (brandSelectorContainer) brandSelectorContainer.style.display = 'block';
    }
}

// Fetches the brand data (epic.json) and initializes the selector UI
async function fetchBrandsAndInitialize() {
    console.log("[fetchBrands] Function started.");

    if (!brandInitialLoadingMessage || !brandResultsContainer || !brandSearchInput || !brandSearchSpinner || !brandPaginationControls) {
        console.error("[fetchBrands] Error: One or more required brand selector or pagination DOM elements not found!");
        if(brandInitialLoadingMessage) {
            brandInitialLoadingMessage.textContent = 'Initialization Error: UI elements missing.';
            brandInitialLoadingMessage.style.color = 'red';
        }
        return;
    }

    brandInitialLoadingMessage.textContent = 'Loading organizations data...';
    if (brandResultsContainer) brandResultsContainer.style.display = 'none';
    if (brandPaginationControls) brandPaginationControls.style.display = 'none';
    brandSearchInput.disabled = true;
    if (brandSearchSpinner) brandSearchSpinner.style.display = 'block';
    console.log("[fetchBrands] Initial UI state set (loading).");

    try {
        // --- TODO: This needs to be dynamic if supporting multiple vendors ---
        // For now, hardcoding 'epic' based on the file path
        const fetchUrl = './brands/epic.json';
        const vendorMatch = fetchUrl.match(/brands\/(\w+)\.json$/);
        if (!vendorMatch || !vendorMatch[1]) {
             throw new Error("Could not determine vendor name from brand data URL.");
        }
        currentVendorName = vendorMatch[1].toLowerCase(); // Store the extracted vendor name globally
        console.log(`[fetchBrands] Determined vendor name: ${currentVendorName}`);
        // --- End Vendor Determination ---

        console.log(`[fetchBrands] Attempting to fetch: ${fetchUrl}`)
        const response = await fetch(fetchUrl);
        console.log(`[fetchBrands] Fetch response status: ${response.status}`);

        if (!response.ok) {
             const errorText = await response.text();
             console.error(`[fetchBrands] Fetch failed! Status: ${response.status}. Response text: ${errorText}`);
             throw new Error(`HTTP error loading brands! status: ${response.status}`);
        }

        console.log("[fetchBrands] Fetch successful. Attempting response.json()...");
        const data = await response.json();
        console.log("[fetchBrands] JSON parsed successfully.");

        if (data && Array.isArray(data.items)) {
            console.log(`[fetchBrands] Data structure valid. Found ${data.items.length} items for vendor '${currentVendorName}'.`);
            allBrandItems = data.items;
            currentFilteredItems = allBrandItems;

            brandInitialLoadingMessage.style.display = 'none';
            if (brandResultsContainer) brandResultsContainer.style.display = 'grid';
            if (brandSearchInput) brandSearchInput.disabled = false;

            currentPage = 1;
            renderCurrentPage();

            // *** Autofocus the search input ***
            if (brandSearchInput) {
                brandSearchInput.focus();
                console.log("[fetchBrands] Autofocused search input.");
            }

            // Attach listeners (remains the same)
            if (brandSearchInput) brandSearchInput.addEventListener('input', debouncedBrandSearchHandler);
            if (brandModalCancel) brandModalCancel.addEventListener('click', hideBrandModal);
            if (brandModalConnect) brandModalConnect.addEventListener('click', handleBrandConnect); // Connects to the UPDATED handler
            if (brandModalBackdrop) brandModalBackdrop.addEventListener('click', (event) => { if (event.target === brandModalBackdrop) { hideBrandModal(); } });
            if (brandPrevBtn) brandPrevBtn.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderCurrentPage(); } });
            if (brandNextBtn) brandNextBtn.addEventListener('click', () => { const totalPages = Math.ceil(currentFilteredItems.length / ITEMS_PER_PAGE); if (currentPage < totalPages) { currentPage++; renderCurrentPage(); } });
            console.log("[fetchBrands] Event listeners attached.");

        } else {
             console.error("[fetchBrands] Error: Invalid data structure received from epic.json. 'items' array not found.", data);
             throw new Error("Invalid data structure in epic.json");
        }

    } catch (error: any) {
        console.error("[fetchBrands] Error during fetch or processing:", error);
        if(brandInitialLoadingMessage) {
            brandInitialLoadingMessage.textContent = `Error loading organizations. Please try again later. (${error.message})`;
            brandInitialLoadingMessage.style.color = 'red';
        }
        if (brandResultsContainer) brandResultsContainer.style.display = 'none';
        if (brandSearchInput) brandSearchInput.disabled = true;
         // Reset vendor name on error
        currentVendorName = null;

    } finally {
         if (brandSearchSpinner) brandSearchSpinner.style.display = 'none';
         console.log("[fetchBrands] Function finished (finally block).");
    }
}

// --- Main Application Logic ---
document.addEventListener('DOMContentLoaded', () => {
    // --- Get All DOM References Once ---
    brandSelectorContainer = document.getElementById('brand-selector-container');
    brandSearchInput = document.getElementById('brand-search-input') as HTMLInputElement | null;
    brandSearchSpinner = document.getElementById('brand-search-spinner');
    brandResultsContainer = document.getElementById('brand-results-container');
    brandModalBackdrop = document.getElementById('brand-modal-backdrop');
    brandModal = document.getElementById('brand-modal');
    brandModalTitle = document.getElementById('brand-modal-title');
    brandModalDetails = document.getElementById('brand-modal-details');
    brandModalCancel = document.getElementById('brand-modal-cancel') as HTMLButtonElement | null;
    brandModalConnect = document.getElementById('brand-modal-connect') as HTMLButtonElement | null;
    brandInitialLoadingMessage = document.getElementById('brand-initial-loading-message');
    brandPaginationControls = document.getElementById('brand-pagination-controls');
    brandPrevBtn = document.getElementById('brand-prev-btn') as HTMLButtonElement | null;
    brandNextBtn = document.getElementById('brand-next-btn') as HTMLButtonElement | null;
    brandPageInfo = document.getElementById('brand-page-info');
    // REMOVED fetching references for deleted form elements
    // formContainer = document.getElementById('form-container');
    // ehrForm = document.getElementById('ehr-form') as HTMLFormElement | null;
    // ehrBaseUrlInput = document.getElementById('ehr_base_url') as HTMLInputElement | null;
    // ehrClientIdInput = document.getElementById('ehr_client_id') as HTMLInputElement | null;
    // ehrScopesInput = document.getElementById('ehr_scopes') as HTMLInputElement | null;
    // ehrRedirectUriInput = document.getElementById('redirect_uri') as HTMLInputElement | null;
    statusContainer = document.getElementById('status-container');
    statusMessageElement = document.getElementById('status-message');
    progressContainer = document.getElementById('progress-container');
    progressBar = document.getElementById('fetch-progress') as HTMLProgressElement | null;
    progressText = document.getElementById('progress-text');
    // ---------------------------------

    // --- NEW: Get Download Button Reference ---
    downloadDataBtn = document.getElementById('download-data-btn') as HTMLButtonElement | null;
    // ------------------------------------

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');
    const errorDescription = urlParams.get('error_description');

    // Define the default redirect URI (this page)
    const defaultRedirectUri = window.location.origin + window.location.pathname;

    if (error) {
        // Handle error response from EHR authorization
        showStatusContainer(true);
        updateStatus(`Authorization Error: ${error} - ${errorDescription || 'No description provided.'}`, true);
        sessionStorage.removeItem(AUTH_STORAGE_KEY); // Clean up state on error
        return;
    }

    if (code && state) {
        // --- Phase 2: Handle Redirect ---
        (async () => { // Wrap redirect handling in an async IIFE
            showStatusContainer(true);
            updateStatus('Received authorization code. Validating...');
            console.log('Detected redirect from EHR.');
            console.log(`Code: ${code.substring(0, 10)}...`, `State: ${state}`);

            // *** HIDE BRAND SELECTOR UI IMMEDIATELY ON REDIRECT ***
            if (brandSelectorContainer) brandSelectorContainer.style.display = 'none';
            showProgressContainer(false); // Ensure progress is hidden initially in this phase too
            showConfirmationContainer(false); // Ensure confirmation is hidden initially too

            const storedStateString = sessionStorage.getItem(AUTH_STORAGE_KEY);
            if (!storedStateString) {
                updateStatus('Error: Auth state missing from storage. Please start over.', true);
                return;
            }

            let storedState: StoredAuthState;
            try {
                storedState = JSON.parse(storedStateString);
            } catch (e) {
                updateStatus('Error: Could not parse stored auth state.', true);
                sessionStorage.removeItem(AUTH_STORAGE_KEY);
                return;
            }

            // Validate state
            if (state !== storedState.state) {
                updateStatus('Error: State parameter mismatch. Potential CSRF attack.', true);
                sessionStorage.removeItem(AUTH_STORAGE_KEY);
                return;
            }

            updateStatus('State validated. Exchanging code for token...');

            const { tokenEndpoint, codeVerifier, clientId, redirectUri, fhirBaseUrl } = storedState;
            console.log(`Using redirect_uri for token exchange: ${redirectUri}`);

            try {
                // 1. Exchange code for token
                const tokenParams = new URLSearchParams({
                    grant_type: 'authorization_code',
                    code: code,
                    redirect_uri: redirectUri, // Must match the URI used in the initial auth request
                    client_id: clientId,
                    code_verifier: codeVerifier,
                });

                const tokenResponse = await fetch(tokenEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json' // Explicitly accept JSON
                    },
                    body: tokenParams.toString(),
                });

                const tokenData = await tokenResponse.json(); // Attempt to parse JSON regardless of status

                if (!tokenResponse.ok) {
                    const errorDetails = tokenData.error_description || tokenData.error || JSON.stringify(tokenData);
                    throw new Error(`Token exchange failed (${tokenResponse.status}): ${errorDetails}`);
                }

                const accessToken = tokenData.access_token;
                const patientId = tokenData.patient;
                const grantedScopes = tokenData.scope;

                if (!accessToken || !patientId) {
                    throw new Error('Token response missing required access_token or patient ID.');
                }

                updateStatus('Token received successfully.');
                console.log(`Access Token: ${accessToken.substring(0, 8)}...`);
                console.log(`Patient ID: ${patientId}`);
                console.log(`Granted Scopes: ${grantedScopes || 'N/A'}`);

                // Clear sensitive state now that exchange is successful
                sessionStorage.removeItem(AUTH_STORAGE_KEY);
                console.log('Cleared auth state from sessionStorage.');

                // 2. Fetch FHIR data
                updateStatus('Fetching EHR data (this may take a while)...');
                showProgressContainer(true); // Show progress bar early
                updateProgress(0, 0, 'Initiating fetch...'); // Initial progress message

                // *** Store fetched data in a variable accessible later ***
                let fetchedClientFullEhrObject: any | null = null; // Renamed for clarity
                try {
                    fetchedClientFullEhrObject = await fetchAllEhrDataClientSideParallel(
                        accessToken,
                        fhirBaseUrl,
                        patientId,
                        updateProgress // Pass the progress update function
                    );
                } catch (fetchError: any) {
                    // Handle fetch error specifically
                    updateStatus(`Error fetching EHR data: ${fetchError.message}`, true);
                    console.error("Error during fetchAllEhrDataClientSideParallel:", fetchError);
                     // Hide progress bar on fetch error
                    showProgressContainer(false);
                    // Clear sensitive state if not already cleared
                    sessionStorage.removeItem(AUTH_STORAGE_KEY);
                    sessionStorage.removeItem(DELIVERY_TARGET_KEY);
                    sessionStorage.removeItem(OPENER_TARGET_ORIGIN_KEY);
                    return; // Stop execution here
                }

                console.log("Returned from fetchAllEhrDataClientSideParallel. EHR data:", fetchedClientFullEhrObject);

                // Hide progress bar on successful completion
                showProgressContainer(false);

                // 3. Log the result
                console.log("--- ClientFullEHR Object ---");
                console.log(fetchedClientFullEhrObject);
                console.log("----------------------------");

                // 4. Calculate Totals & Prepare Initial Final Status
                let totalResources = 0;
                let resourceTypeCount = 0;
                if (fetchedClientFullEhrObject?.fhir) {
                    resourceTypeCount = Object.keys(fetchedClientFullEhrObject.fhir).length;
                    for (const resourceType in fetchedClientFullEhrObject.fhir) {
                        if (Object.prototype.hasOwnProperty.call(fetchedClientFullEhrObject.fhir, resourceType) && Array.isArray(fetchedClientFullEhrObject.fhir[resourceType])) {
                            totalResources += fetchedClientFullEhrObject.fhir[resourceType].length;
                        }
                    }
                }
                const attachmentCount = fetchedClientFullEhrObject?.attachments?.length || 0;

                let finalStatus = `Data fetched successfully! ${resourceTypeCount} resource types, ${totalResources} total resources, and ${attachmentCount} attachments retrieved.`;
                updateStatus(finalStatus); // Update status initially

                // --- 5. Check for and perform delivery ---
                console.log("Proceeding to delivery check...");
                console.log('[Delivery Check] Checking sessionStorage for key:', DELIVERY_TARGET_KEY);
                const deliveryTargetName = sessionStorage.getItem(DELIVERY_TARGET_KEY);
                const openerTargetOrigin = sessionStorage.getItem(OPENER_TARGET_ORIGIN_KEY); // Get opener origin
                console.log('[Delivery Check] Value found in sessionStorage (Target Name):', deliveryTargetName);
                console.log('[Delivery Check] Value found in sessionStorage (Opener Origin):', openerTargetOrigin); // Log opener origin

                // Ensure confirmation/download UI is hidden initially before potential delivery
                showConfirmationContainer(false);
                if (downloadDataBtn) downloadDataBtn.style.display = 'none'; // Hide download button initially

                if (deliveryTargetName) {
                    console.log(`[Delivery Check] Delivery target found: ${deliveryTargetName}. Comparing with OPENER_TARGET_VALUE:`, OPENER_TARGET_VALUE);

                    // --- Handle postMessage to opener ---
                    if (deliveryTargetName === OPENER_TARGET_VALUE) {
                        console.log('[Delivery Check] Target is opener. Preparing inline confirmation...');

                        if (openerTargetOrigin) {
                            // *** SHOW INLINE CONFIRMATION ***
                            updateStatus('Data fetched. Waiting for confirmation to send...');
                            console.log(`Preparing confirmation UI to send data to: ${openerTargetOrigin}`);

                            // Update the confirmation message text
                            if (confirmationMessageElement) {
                                confirmationMessageElement.textContent = `You have successfully fetched your EHR data. Do you want to send this data back to the application at origin "${openerTargetOrigin}"?`;
                            }

                            // Hide status/progress, show confirmation
                            showStatusContainer(false);
                            showProgressContainer(false);
                            showConfirmationContainer(true);

                            // Define button handlers
                            if (confirmSendBtn && cancelSendBtn) {
                                confirmSendBtn.onclick = () => {
                                    console.log('User confirmed data delivery via inline button.');
                                    if (confirmSendBtn) confirmSendBtn.disabled = true;
                                    if (cancelSendBtn) cancelSendBtn.disabled = true;
                                    showConfirmationContainer(false);
                                    showStatusContainer(true);
                                    updateStatus('Confirmed. Sending data...');

                                    try {
                                        updateStatus(`${finalStatus} Delivering data via postMessage to ${openerTargetOrigin}...`);
                                        window.opener.postMessage(fetchedClientFullEhrObject, openerTargetOrigin); // Use fetched data
                                        finalStatus += ` Data successfully SENT via postMessage call to ${openerTargetOrigin}.`;
                                        updateStatus(finalStatus);
                                        console.log(`Successfully CALLED postMessage targeting ${openerTargetOrigin}.`);
                                        sessionStorage.removeItem(DELIVERY_TARGET_KEY);
                                        sessionStorage.removeItem(OPENER_TARGET_ORIGIN_KEY);
                                    } catch (postMessageError: any) {
                                        finalStatus += ` Delivery via postMessage CALL FAILED: ${postMessageError.message}`;
                                        updateStatus(finalStatus, true);
                                        console.error(`Failed to CALL postMessage to ${openerTargetOrigin}:`, postMessageError);
                                    } finally {
                                        console.log('Attempting to close retriever window after confirmed postMessage attempt.');
                                        setTimeout(() => window.close(), 500);
                                    }
                                };

                                cancelSendBtn.onclick = () => {
                                    console.log('User cancelled data delivery via inline button.');
                                    if (confirmSendBtn) confirmSendBtn.disabled = true;
                                    if (cancelSendBtn) cancelSendBtn.disabled = true;
                                    showConfirmationContainer(false);
                                    showStatusContainer(true);
                                    finalStatus = 'Delivery cancelled by user. You may now close this window.';
                                    updateStatus(finalStatus);
                                    // *** SHOW DOWNLOAD BUTTON ON CANCEL ***
                                    if (downloadDataBtn) {
                                        downloadDataBtn.style.display = 'inline-block';
                                        downloadDataBtn.onclick = () => {
                                            triggerJsonDownload(fetchedClientFullEhrObject, 'ehr-data-cancelled-delivery.json');
                                            if(downloadDataBtn) downloadDataBtn.disabled = true; // Disable after click
                                        };
                                    }
                                    sessionStorage.removeItem(DELIVERY_TARGET_KEY);
                                    sessionStorage.removeItem(OPENER_TARGET_ORIGIN_KEY);
                                    console.log('Closing retriever window after cancellation.');
                                    // Don't close automatically if download is offered
                                    // setTimeout(() => window.close(), 500);
                                };
                            } else { // Buttons not found
                                console.error("Confirmation buttons not found!");
                                updateStatus("Error: Confirmation UI elements missing. Cannot proceed.", true);
                                showConfirmationContainer(false);
                                showStatusContainer(true);
                                console.log('Attempting to close retriever window due to missing UI elements.');
                                setTimeout(() => window.close(), 500);
                            }

                        } else { // Opener origin missing
                            finalStatus += ` Delivery via postMessage FAILED: Opener's target origin not found in session storage. Cannot target postMessage. You may download your data below.`;
                            updateStatus(finalStatus, true);
                            // *** SHOW DOWNLOAD BUTTON ON MISSING ORIGIN ***
                            if (downloadDataBtn) {
                                downloadDataBtn.style.display = 'inline-block';
                                downloadDataBtn.onclick = () => {
                                    triggerJsonDownload(fetchedClientFullEhrObject, 'ehr-data-missing-origin.json');
                                     if(downloadDataBtn) downloadDataBtn.disabled = true; // Disable after click
                                };
                            }
                            console.error("Cannot postMessage to opener: Target origin missing from session storage.");
                            // Don't close automatically if download is offered
                            // console.log('Attempting to close retriever window after failed opener delivery (missing origin).');
                            // setTimeout(() => window.close(), 500);
                        }
                    }
                    // --- Handle named endpoint delivery ---
                    else {
                        let deliveryEndpoints: Record<string, { postUrl: string }> = {};
                        deliveryEndpoints = __DELIVERY_ENDPOINTS__ || {}
                        const endpointConfig = deliveryEndpoints[deliveryTargetName];

                        if (endpointConfig && endpointConfig.postUrl) {
                            const postUrl = makeAbsoluteUrl(endpointConfig.postUrl);
                            updateStatus(`${finalStatus} Delivering data to ${deliveryTargetName} at ${postUrl}...`);
                            try {
                                const deliveryResponse = await fetch(postUrl, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(fetchedClientFullEhrObject) // Use fetched data
                                });

                                if (!deliveryResponse.ok) {
                                    const errorBody = await deliveryResponse.text();
                                    throw new Error(`Delivery POST failed (${deliveryResponse.status}): ${errorBody}`);
                                }
                                console.log(`Successfully POSTed data to ${deliveryTargetName} (${postUrl})`);
                                sessionStorage.removeItem(DELIVERY_TARGET_KEY);

                                try {
                                    const jsonData = await deliveryResponse.json();
                                    console.log("JSON response from delivery endpoint:", jsonData);
                                    if (jsonData.success === true && typeof jsonData.redirectTo === 'string' && jsonData.redirectTo) {
                                        updateStatus(`${finalStatus} Data POST successful. Redirecting to complete flow...`);
                                        console.log(`Redirecting to: ${jsonData.redirectTo}`);
                                        window.location.href = jsonData.redirectTo;
                                        return; // Stop execution after redirect
                                    } else if (jsonData.success === true && !jsonData.redirectTo) {
                                        // *** SUCCESSFUL POST, NO REDIRECT -> SHOW DOWNLOAD ***
                                        finalStatus = `Data fetched and POST successful. No redirect specified. You may download your data or close this window.`;
                                        updateStatus(finalStatus);
                                        if (downloadDataBtn) {
                                            downloadDataBtn.style.display = 'inline-block';
                                            downloadDataBtn.onclick = () => {
                                                 triggerJsonDownload(fetchedClientFullEhrObject, `ehr-data-${deliveryTargetName}.json`);
                                                  if(downloadDataBtn) downloadDataBtn.disabled = true; // Disable after click
                                            };
                                        }
                                        console.log('Delivery successful, no redirect specified, download offered.');
                                    } else {
                                        const serverError = jsonData.error || 'unknown_server_error';
                                        const serverErrorDesc = jsonData.error_description || 'Server did not provide redirect URL or indicated failure.';
                                        throw new Error(`Server Error (${serverError}): ${serverErrorDesc}`);
                                    }
                                } catch (parseError) {
                                    console.error("Failed to parse JSON response from delivery endpoint:", parseError);
                                    throw new Error("Received malformed response from the delivery server.");
                                }

                            } catch (deliveryError: any) {
                                // *** DELIVERY POST FAILED -> SHOW DOWNLOAD ***
                                console.error(`Failed to POST or process response for ${deliveryTargetName}:`, deliveryError);
                                finalStatus += ` Delivery to ${deliveryTargetName} FAILED: ${deliveryError.message || 'Unknown delivery error'}. You may download your data below.`;
                                updateStatus(finalStatus, true);
                                if (downloadDataBtn) {
                                    downloadDataBtn.style.display = 'inline-block';
                                    downloadDataBtn.onclick = () => {
                                        triggerJsonDownload(fetchedClientFullEhrObject, 'ehr-data-delivery-failed.json');
                                         if(downloadDataBtn) downloadDataBtn.disabled = true; // Disable after click
                                    };
                                }
                            }

                        } else {
                            // *** INVALID DELIVERY TARGET CONFIG -> SHOW DOWNLOAD ***
                            finalStatus += ` Delivery target '${deliveryTargetName}' configuration invalid or incomplete (missing postUrl). You may download your data below.`;
                            updateStatus(finalStatus, true);
                            if (downloadDataBtn) {
                                downloadDataBtn.style.display = 'inline-block';
                                downloadDataBtn.onclick = () => {
                                    triggerJsonDownload(fetchedClientFullEhrObject, 'ehr-data-invalid-config.json');
                                     if(downloadDataBtn) downloadDataBtn.disabled = true; // Disable after click
                                };
                            }
                            console.error(`Delivery target '${deliveryTargetName}' requested but configuration is invalid in __DELIVERY_ENDPOINTS__.`);
                            sessionStorage.removeItem(DELIVERY_TARGET_KEY);
                        }
                    }
                } else {
                    // *** NO DELIVERY TARGET -> SHOW DOWNLOAD ***
                    console.log('No delivery target specified in session storage.');
                    finalStatus += `. No delivery target specified. You may download your data or close this window.`;
                    updateStatus(finalStatus);
                     if (downloadDataBtn) {
                        downloadDataBtn.style.display = 'inline-block';
                        downloadDataBtn.onclick = () => {
                            triggerJsonDownload(fetchedClientFullEhrObject, 'ehr-data.json');
                             if(downloadDataBtn) downloadDataBtn.disabled = true; // Disable after click
                        };
                    }
                }
                // --- End Delivery ---

            } catch (err: any) {
                // Catch errors during token exchange or *outer* fetch block (like JSON parsing of token)
                updateStatus(`Error during authorization or data processing: ${err.message}`, true);
                console.error("Unhandled error in redirect handler:", err);
                // Hide progress/confirmation, show status
                showProgressContainer(false);
                showConfirmationContainer(false);
                showStatusContainer(true);
                if (downloadDataBtn) downloadDataBtn.style.display = 'none'; // Ensure download not shown on these errors
                // Clear state even on error during these steps
                sessionStorage.removeItem(AUTH_STORAGE_KEY);
                sessionStorage.removeItem(DELIVERY_TARGET_KEY);
                sessionStorage.removeItem(OPENER_TARGET_ORIGIN_KEY);
            }
        })(); // Immediately invoke the async function

    } else {
        // --- Phase 1: Initial Load - Setup Brand Selector ---
        console.log('Initial page load. Setting up brand selector.');
        // Ensure correct initial visibility (includes pagination)
        if (brandSelectorContainer) brandSelectorContainer.style.display = 'block';
        if (brandPaginationControls) brandPaginationControls.style.display = 'none'; // Ensure hidden initially
        if (statusContainer) statusContainer.style.display = 'none';
        showProgressContainer(false); // Ensure progress is hidden

        // Fetch brand data and initialize the selector UI
        fetchBrandsAndInitialize().then(() => {
            // Check for delivery target in hash (keep this logic)
            const hash = window.location.hash;
            sessionStorage.removeItem(DELIVERY_TARGET_KEY); // Clear any previous target first
            sessionStorage.removeItem(OPENER_TARGET_ORIGIN_KEY); // Clear previous origin too
            if (hash) {
                const openerPrefix = '#deliver-to-opener:';
                if (hash.startsWith(openerPrefix)) {
                    const targetOrigin = hash.substring(openerPrefix.length);
                    if (targetOrigin) {
                        // Validate if it looks like an origin (basic check)
                        try {
                            new URL(targetOrigin); // Check if it parses as a URL
                            sessionStorage.setItem(DELIVERY_TARGET_KEY, OPENER_TARGET_VALUE);
                            sessionStorage.setItem(OPENER_TARGET_ORIGIN_KEY, targetOrigin);
                            console.log(`Found and stored delivery target: Opener Window`);
                            console.log(`Stored opener target origin: ${targetOrigin}`);
                            history.replaceState(null, '', ' '); // Clear hash
                        } catch (e) {
                            console.warn(`Invalid target origin provided in hash: ${targetOrigin}`);
                        }
                    } else {
                        console.warn('Found #deliver-to-opener: but target origin is empty.');
                    }
                } else if (hash.startsWith('#deliver-to:')) {
                    const targetName = hash.substring('#deliver-to:'.length);
                    if (targetName) {
                        sessionStorage.setItem(DELIVERY_TARGET_KEY, targetName);
                        console.log(`Found and stored delivery target: ${targetName}`);
                        history.replaceState(null, '', ' '); // Clear hash
                    } else {
                        console.warn('Found #deliver-to: but target name is empty.');
                    }
                }


            }
        })


        // Ensure confirmation UI is hidden on initial load
        showConfirmationContainer(false);
        // Ensure download button is hidden on initial load
        if (downloadDataBtn) downloadDataBtn.style.display = 'none';

    }
});

// --- NEW: Helper Function to Trigger JSON Download ---
function triggerJsonDownload(data: any, filename: string) {
    if (!data) {
        console.error("Download triggered but data is null.");
        alert("Error: No data available to download.");
        return;
    }
    try {
        const jsonString = JSON.stringify(data, null, 2); // Pretty print JSON
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a); // Required for Firefox
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url); // Clean up
        console.log(`Successfully triggered download of ${filename}`);
    } catch (error: any) {
        console.error(`Error creating or triggering download for ${filename}:`, error);
        alert(`Failed to initiate download: ${error.message}`);
    }
}
// --- END NEW HELPER FUNCTION --- 
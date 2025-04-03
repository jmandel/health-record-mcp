import { FullEHR } from './src/types';
import pkceChallenge from 'pkce-challenge'; // Import the library
import { ClientFullEHR } from './clientTypes'; // Import client-specific type
import { fetchAllEhrDataClientSide } from './clientFhirUtils'; // Import the data fetching function

// --- Declare potential global constants injected by build ---
declare const __CONFIG_FHIR_BASE_URL__: string | undefined;
declare const __CONFIG_CLIENT_ID__: string | undefined;
declare const __CONFIG_SCOPES__: string | undefined;
declare const __DELIVERY_ENDPOINTS__: Record<string, { postUrl: string, redirectUrl: string }> | undefined;
// ----------------------------------------------------------

// Keys for sessionStorage
const AUTH_STORAGE_KEY = 'smart_auth_state';
const DELIVERY_TARGET_KEY = 'delivery_target_name';
const OPENER_TARGET_VALUE = '__opener__'; // Special value for opener target

interface StoredAuthState {
    codeVerifier: string;
    state: string;
    tokenEndpoint: string;
    clientId: string;
    redirectUri: string;
    fhirBaseUrl: string;
}

// Helper function to update status message
function updateStatus(message: string, isError: boolean = false) {
    const statusMessageElement = document.getElementById('status-message');
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

// --- Main Application Logic ---
document.addEventListener('DOMContentLoaded', () => {
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
                const clientFullEhrObject = await fetchAllEhrDataClientSide(accessToken, fhirBaseUrl, patientId);

                // 3. Log the result
                console.log("--- ClientFullEHR Object ---");
                console.log(clientFullEhrObject);
                console.log("----------------------------");

                // 4. Update Status initially
                let finalStatus = `Data fetched successfully! ${Object.keys(clientFullEhrObject.fhir).length} resource types, ${clientFullEhrObject.attachments.length} attachments found. Check console for details.`;
                updateStatus(finalStatus);

                // --- 5. Check for and perform delivery --- 
                console.log('[Delivery Check] Checking sessionStorage for key:', DELIVERY_TARGET_KEY);
                const deliveryTargetName = sessionStorage.getItem(DELIVERY_TARGET_KEY);
                console.log('[Delivery Check] Value found in sessionStorage:', deliveryTargetName);

                if (deliveryTargetName) {
                    console.log(`[Delivery Check] Delivery target found: ${deliveryTargetName}. Comparing with OPENER_TARGET_VALUE:`, OPENER_TARGET_VALUE);

                    // --- Handle postMessage to opener --- 
                    if (deliveryTargetName === OPENER_TARGET_VALUE) {
                        console.log('[Delivery Check] Target is opener. Attempting BroadcastChannel delivery...');
                        const CHANNEL_NAME = 'ehr-retriever-results'; // Must match opener
                        let broadcastChannel: BroadcastChannel | null = null;
                        try {
                            broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
                            updateStatus(`${finalStatus} Delivering data via BroadcastChannel...`);

                            // Post the data (structured clone happens automatically)
                            broadcastChannel.postMessage(clientFullEhrObject);
                            
                            finalStatus += ` Data successfully sent via BroadcastChannel (${CHANNEL_NAME}).`;
                            updateStatus(finalStatus);
                            console.log(`Successfully sent data via BroadcastChannel (${CHANNEL_NAME}).`);
                            sessionStorage.removeItem(DELIVERY_TARGET_KEY);
                        } catch (broadcastError: any) {
                            finalStatus += ` Delivery via BroadcastChannel FAILED: ${broadcastError.message}`;
                            updateStatus(finalStatus, true);
                            console.error(`Failed to send data via BroadcastChannel (${CHANNEL_NAME}):`, broadcastError);
                        } finally {
                            // Close the channel after sending
                            if (broadcastChannel) {
                                broadcastChannel.close();
                                console.log('Retriever closed BroadcastChannel.');
                            }
                            // Close the window itself after attempting opener delivery
                            console.log('Attempting to close retriever window after opener delivery attempt.');
                            window.close(); 
                        }
                    }
                    // --- Handle named endpoint delivery --- 
                    else {
                        const deliveryEndpoints = typeof __DELIVERY_ENDPOINTS__ !== 'undefined' ? __DELIVERY_ENDPOINTS__ : {};
                        const endpointConfig = deliveryEndpoints[deliveryTargetName]; // Get the config object

                        if (endpointConfig && endpointConfig.postUrl && endpointConfig.redirectUrl) {
                            // Resolve URLs to absolute using the helper
                            const postUrl = makeAbsoluteUrl(endpointConfig.postUrl);
                            const redirectUrl = makeAbsoluteUrl(endpointConfig.redirectUrl);
                            let deliveryStatus: 'success' | 'error' = 'success';
                            let deliveryErrorMsg: string | null = null;

                            updateStatus(`${finalStatus} Delivering data to ${deliveryTargetName} at ${postUrl}...`);
                            try {
                                const deliveryResponse = await fetch(postUrl, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify(clientFullEhrObject)
                                });

                                if (!deliveryResponse.ok) {
                                    const errorBody = await deliveryResponse.text();
                                    throw new Error(`Delivery POST failed (${deliveryResponse.status}): ${errorBody}`);
                                }
                                console.log(`Successfully POSTed data to ${deliveryTargetName} (${postUrl})`);
                                sessionStorage.removeItem(DELIVERY_TARGET_KEY);
                            } catch (deliveryError: any) {
                                deliveryStatus = 'error';
                                deliveryErrorMsg = deliveryError.message || 'Unknown delivery error';
                                console.error(`Failed to POST data to ${deliveryTargetName}:`, deliveryError);
                            }

                            // --- Redirect after POST attempt --- PREVENTED for mcp-callback
                            if (deliveryTargetName !== 'mcp-callback') { // Only redirect if not the special backend target
                                const finalRedirectUrl = new URL(redirectUrl); // Use the resolved absolute URL
                                if (deliveryStatus === 'error') {
                                    updateStatus(`${finalStatus} Delivery POST to ${deliveryTargetName} FAILED: ${deliveryErrorMsg}. Redirecting...`);
                                    finalRedirectUrl.searchParams.set('deliveryError', deliveryErrorMsg || 'Unknown error');
                                    finalRedirectUrl.searchParams.set('deliveryTarget', deliveryTargetName);
                                } else {
                                    updateStatus(`${finalStatus} Data successfully POSTed to ${deliveryTargetName}. Redirecting...`);
                                    finalRedirectUrl.searchParams.set('deliverySuccess', 'true');
                                    finalRedirectUrl.searchParams.set('deliveryTarget', deliveryTargetName);
                                }
                                console.log(`Redirecting to: ${finalRedirectUrl.toString()}`);
                                window.location.href = finalRedirectUrl.toString();
                            } else {
                                // For mcp-callback, just update status and wait for server redirect
                                if (deliveryStatus === 'error') {
                                     updateStatus(`${finalStatus} Delivery POST to backend FAILED: ${deliveryErrorMsg}. Server should handle redirect or error.`, true);
                                } else {
                                     updateStatus(`${finalStatus} Data successfully POSTed to backend. Waiting for server redirect...`);
                                }
                            }
                            // --- End Redirect Logic ---

                        } else {
                            finalStatus += ` Delivery target '${deliveryTargetName}' configuration invalid or incomplete (missing postUrl/redirectUrl).`;
                            updateStatus(finalStatus, true);
                            console.error(`Delivery target '${deliveryTargetName}' requested but configuration is invalid in __DELIVERY_ENDPOINTS__.`);
                            sessionStorage.removeItem(DELIVERY_TARGET_KEY); // Remove invalid target
                        }
                    }
                } else {
                    console.log('No delivery target specified in session storage.');
                }
                // --- End Delivery --- 

            } catch (err: any) {
                updateStatus(`Error during token exchange or data fetch: ${err.message}`, true);
                // Clear state even on error during these steps
                sessionStorage.removeItem(AUTH_STORAGE_KEY);
                sessionStorage.removeItem(DELIVERY_TARGET_KEY);
            }
        })(); // Immediately invoke the async function

    } else {
        // --- Phase 1: Initial Load - Setup Form ---
        showStatusContainer(false);
        console.log('Initial page load. Setting up form.');

        // Check for delivery target in hash
        const hash = window.location.hash;
        sessionStorage.removeItem(DELIVERY_TARGET_KEY); // Clear any previous target first
        if (hash) {
            if (hash === '#deliver-to-opener') {
                sessionStorage.setItem(DELIVERY_TARGET_KEY, OPENER_TARGET_VALUE);
                console.log(`Found and stored delivery target: Opener Window`);
                history.replaceState(null, '', ' '); // Clear hash
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

        const form = document.getElementById('ehr-form') as HTMLFormElement;
        const fhirBaseUrlInput = document.getElementById('ehr_base_url') as HTMLInputElement;
        const clientIdInput = document.getElementById('ehr_client_id') as HTMLInputElement;
        const scopesInput = document.getElementById('ehr_scopes') as HTMLInputElement;
        const redirectUriInput = document.getElementById('redirect_uri') as HTMLInputElement;

        // Set default redirect URI in the form field
        if (redirectUriInput) {
            redirectUriInput.value = defaultRedirectUri;
        }

        // Pre-populate form from build-time config if available
        if (typeof __CONFIG_FHIR_BASE_URL__ !== 'undefined' && fhirBaseUrlInput) {
            fhirBaseUrlInput.value = __CONFIG_FHIR_BASE_URL__;
        }
        if (typeof __CONFIG_CLIENT_ID__ !== 'undefined' && clientIdInput) {
            clientIdInput.value = __CONFIG_CLIENT_ID__;
        }
        if (typeof __CONFIG_SCOPES__ !== 'undefined' && scopesInput) {
            scopesInput.value = __CONFIG_SCOPES__;
        }

        if (form) {
            form.addEventListener('submit', async (event) => { // Make handler async
                event.preventDefault();
                showStatusContainer(true);
                updateStatus('Processing form...');

                const fhirBaseUrl = fhirBaseUrlInput.value.trim();
                const clientId = clientIdInput.value.trim();
                const scopes = scopesInput.value.trim();
                // Read redirect URI from input, default to current page if empty
                const redirectUri = redirectUriInput.value.trim() || defaultRedirectUri;

                console.log(`Using Redirect URI: ${redirectUri}`); // Log the URI being used

                if (!fhirBaseUrl || !clientId || !scopes) {
                    updateStatus('Please fill in all required fields.', true);
                    showStatusContainer(false); // Show form again
                    return;
                }

                try {
                    updateStatus('Performing SMART discovery...');
                    // 1. SMART Discovery
                    // Ensure base URL ends with a slash before appending
                    const fhirBaseUrlWithSlash = fhirBaseUrl.endsWith('/') ? fhirBaseUrl : fhirBaseUrl + '/';
                    const wellKnownUrlString = fhirBaseUrlWithSlash + '.well-known/smart-configuration';
                    console.log(`Attempting SMART discovery at: ${wellKnownUrlString}`); // Log the constructed URL
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
                    const state = generateRandomString(); // Generate unique state

                    // 3. Store necessary state for redirect
                    const authState: StoredAuthState = {
                        codeVerifier: codeVerifier,
                        state: state,
                        tokenEndpoint: tokenEndpoint,
                        clientId: clientId,
                        redirectUri: redirectUri, // Store the potentially overridden redirect URI
                        fhirBaseUrl: fhirBaseUrl
                    };
                    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState));
                    console.log('Stored auth state in sessionStorage');

                    // 4. Construct Authorization URL
                    const authUrl = new URL(authorizationEndpoint);
                    authUrl.searchParams.set('response_type', 'code');
                    authUrl.searchParams.set('client_id', clientId);
                    authUrl.searchParams.set('scope', scopes);
                    authUrl.searchParams.set('redirect_uri', redirectUri); // Use the potentially overridden redirect URI
                    authUrl.searchParams.set('state', state);
                    authUrl.searchParams.set('aud', fhirBaseUrl); // Audience is the FHIR server itself
                    authUrl.searchParams.set('code_challenge', codeChallenge);
                    authUrl.searchParams.set('code_challenge_method', 'S256');

                    // 5. Redirect user
                    updateStatus('Redirecting to EHR for authorization...');
                    console.log(`Redirecting to: ${authUrl.toString()}`);
                    window.location.href = authUrl.toString();

                } catch (err: any) {
                    updateStatus(`Error during authorization initiation: ${err.message}`, true);
                    showStatusContainer(false); // Show form again on error
                    sessionStorage.removeItem(AUTH_STORAGE_KEY);
                    sessionStorage.removeItem(DELIVERY_TARGET_KEY);
                }
            });
        } else {
            console.error('Could not find EHR form element.');
            updateStatus('Initialization Error: Form not found.', true);
        }
    }
}); 
console.log("[DB Picker] Script loaded.");

document.addEventListener('DOMContentLoaded', async () => {
    const pickerOptionsContainer = document.getElementById('picker-options');
    const loadingMessage = document.getElementById('loading-message');
    const errorMessage = document.getElementById('error-message');

    if (!pickerOptionsContainer || !loadingMessage || !errorMessage) {
        console.error("[DB Picker] Critical Error: Missing required HTML elements.");
        return;
    }

    // Function to display errors
    function displayError(message) {
        console.error("[DB Picker] Error:", message);
        errorMessage.textContent = `Error: ${message}`;
        errorMessage.style.display = 'block';
        loadingMessage.style.display = 'none';
    }

    // 1. Extract Picker Session ID from the current URL
    const currentUrlParams = new URLSearchParams(window.location.search);
    const pickerSessionId = currentUrlParams.get('pickerSessionId');

    if (!pickerSessionId) {
        displayError("Missing pickerSessionId in URL.");
        return;
    }
    console.log("[DB Picker] Picker Session ID:", pickerSessionId);

    // Helper to build URL with parameters (Only takes pickerSessionId now for new flows)
    function buildUrl(baseUrl, params) {
        const url = new URL(baseUrl, window.location.origin);
        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.set(key, value);
        });
        return url.toString();
    }

    // Helper function to set a cookie
    function setCookie(name, value, maxAgeSeconds) {
        document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`; // Add Secure if needed (based on HTTPS)
    }

    // 2. Fetch existing stored records
    try {
        console.log("[DB Picker] Fetching /api/list-stored-records...");
        const response = await fetch('/api/list-stored-records');
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to list stored records (${response.status}): ${errorText}`);
        }
        const records = await response.json();
        console.log("[DB Picker] Received records:", records);
        loadingMessage.style.display = 'none';

        // 3. Populate tiles
        if (Array.isArray(records) && records.length > 0) {
            records.forEach(record => {
                if (!record.databaseId || !record.patientName) {
                    console.warn("[DB Picker] Skipping invalid record entry:", record);
                    return;
                }
                const tile = document.createElement('div');
                tile.className = 'session-tile';
                tile.dataset.dbid = record.databaseId; // Store DB ID
                tile.innerHTML = `
                    <h3>${record.patientName}</h3>
                    <p>ID: ${record.patientId || 'N/A'}</p>
                    <p>DOB: ${record.patientBirthDate || 'N/A'}</p>
                `;
                tile.addEventListener('click', () => {
                    console.log(`[DB Picker] Tile clicked for DB ID: ${record.databaseId}`);
                    // Redirect to initiate-session-from-db with dbId and pickerSessionId
                    const targetUrl = buildUrl('/initiate-session-from-db', {
                        databaseId: record.databaseId,
                        pickerSessionId: pickerSessionId // Pass only the picker session ID
                    });
                    console.log("[DB Picker] Redirecting to:", targetUrl);
                    window.location.href = targetUrl;
                });
                pickerOptionsContainer.appendChild(tile);
            });
        } else {
            // No existing records message?
            console.log("[DB Picker] No existing stored records found.");
            // Optionally add a message like "No previous records found." to the UI
        }

        // 4. Add "New Session" button
        const newSessionButton = document.createElement('div');
        newSessionButton.className = 'new-session-btn';
        newSessionButton.textContent = 'Connect to New EHR';
        newSessionButton.addEventListener('click', async () => {
            console.log("[DB Picker] 'New EHR' button clicked.");
            try {
                 // Redirect to the new backend endpoint to handle this flow
                 const targetUrl = buildUrl('/initiate-new-ehr-flow', {
                     pickerSessionId: pickerSessionId // Pass only the picker session ID
                 });
                 console.log("[DB Picker] Redirecting to initiate new EHR flow:", targetUrl);
                 window.location.href = targetUrl;

            } catch (error) {
                displayError(`Failed to initiate new EHR connection: ${error.message}`);
            }
        });
        pickerOptionsContainer.appendChild(newSessionButton);

    } catch (error) {
        displayError(error.message);
    }
});

console.log("[DB Picker] Script finished initial execution."); 
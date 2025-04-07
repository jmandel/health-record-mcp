import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import _ from 'lodash';
import { URL } from 'url'; // Node.js URL

// --- Configuration Schema ---

// NEW: Retriever Configuration Schemas
const DeliveryEndpointsSchema = z.record(
    z.string(),
    z.object({
        postUrl: z.string().min(1) // Assuming relative or absolute path/URL
    })
);

const VendorConfigItemSchema = z.object({
    clientId: z.string().min(1),
    scopes: z.string().min(1),
    redirectUrl: z.string().optional() // Optional: Assuming relative or absolute path/URL
});

const VendorConfigSchema = z.record(
    z.string(), // Vendor name (e.g., "epic")
    VendorConfigItemSchema
);

const RetrieverConfigSchema = z.object({
    deliveryEndpoints: DeliveryEndpointsSchema,
    vendorConfig: VendorConfigSchema
});

// REMOVED: Old EhrConfigSchema
// const EhrConfigSchema = z.object({ ... });

const ServerConfigSchema = z.object({
    port: z.number().int().positive().optional(),
    host: z.string().optional(), // Added host explicitly
    baseUrl: z.string().url().optional(),
    ehrCallbackPath: z.string().startsWith('/'),
    https: z.object({
        enabled: z.boolean(),
        certPath: z.string().optional(),
        keyPath: z.string().optional(),
    }),
});

const PersistenceConfigSchema = z.object({
    enabled: z.boolean().optional(),
    directory: z.string().optional()
});

const SecurityConfigSchema = z.object({
    disableClientChecks: z.boolean().optional()
});

const StaticSessionSchema = z.object({
    enabled: z.boolean(),
    dbPath: z.string().optional()
});

// UPDATED: Main Config Schema
const ConfigSchema = z.object({
    retrieverConfig: RetrieverConfigSchema, // Use new retriever config
    server: ServerConfigSchema,
    persistence: PersistenceConfigSchema.optional(), // Make optional for simpler defaults
    security: SecurityConfigSchema.optional(),       // Make optional for simpler defaults
    staticSession: StaticSessionSchema.optional()   // Make optional for simpler defaults
});

// --- Configuration Type ---
export type AppConfig = z.infer<typeof ConfigSchema>;
// Add specific types for retriever parts if needed elsewhere
export type RetrieverConfig = z.infer<typeof RetrieverConfigSchema>;
export type VendorConfig = z.infer<typeof VendorConfigSchema>;
export type DeliveryEndpointsConfig = z.infer<typeof DeliveryEndpointsSchema>;


// --- Configuration Loading ---
export async function loadConfig(configPath: string): Promise<AppConfig> {
    try {
        // Try to read the config file
        let loadedConfig = {};
        try {
            const configData = await fs.readFile(configPath, 'utf-8');
            loadedConfig = JSON.parse(configData);
            console.log(`[CONFIG] Successfully loaded configuration from ${configPath}`);
        } catch (error: any) {
            console.warn(`[CONFIG] Could not load configuration from ${configPath}: ${error.message}`);
            throw new Error(`Configuration file not found or invalid: ${configPath}`);
        }

        // Apply derived values/defaults to the loaded configuration
        const configWithDefaults = applyDerivedValues(loadedConfig);

        // Now validate the complete configuration against the updated schema
        const validatedConfig = ConfigSchema.parse(configWithDefaults);

        // Post-processing and validations
        if (validatedConfig.server.https.enabled) {
            if (!validatedConfig.server.https.certPath || !validatedConfig.server.https.keyPath) {
                throw new Error("HTTPS is enabled but certificate/key paths are not provided in server config");
            }
            // Check if files exist? Maybe too much for config load.
        }

        // Ensure the persistence directory exists if persistence is enabled
        if (validatedConfig.persistence?.enabled && validatedConfig.persistence.directory) {
            try {
                await fs.mkdir(validatedConfig.persistence.directory, { recursive: true });
                console.log(`[CONFIG] Ensured persistence directory exists: ${validatedConfig.persistence.directory}`);
            } catch (mkdirError: any) {
                console.error(`[CONFIG] Failed to create persistence directory '${validatedConfig.persistence.directory}': ${mkdirError.message}`);
                throw new Error(`Failed to create persistence directory: ${mkdirError.message}`);
            }
        }

        console.log("[CONFIG] Final validated configuration:", JSON.stringify(validatedConfig, null, 2)); // Log final config
        return validatedConfig;
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error(`[CONFIG] Configuration validation failed:`, error.errors);
        } else {
            console.error(`[CONFIG] Error loading configuration:`, error);
        }
        throw error; // Re-throw the error after logging
    }
}

// Apply derived values and ensure required fields have defaults
function applyDerivedValues(config: any): AppConfig {
    // Create a deep copy to avoid modifying the original config object
    const result = _.cloneDeep(config);

    // Ensure top-level structure for defaults
    if (!result.server) result.server = {};
    if (!result.server.https) result.server.https = {};
    if (!result.persistence) result.persistence = {};
    if (!result.security) result.security = {};
    if (!result.staticSession) result.staticSession = {};
    if (!result.retrieverConfig) result.retrieverConfig = {}; // Ensure retrieverConfig exists
    if (!result.retrieverConfig.deliveryEndpoints) result.retrieverConfig.deliveryEndpoints = {}; // Default
    if (!result.retrieverConfig.vendorConfig) result.retrieverConfig.vendorConfig = {}; // Default


    // --- Server Defaults ---
    result.server.host = result.server.host || 'localhost'; // Default host
    result.server.port = result.server.port || 3001; // Default port
    result.server.ehrCallbackPath = result.server.ehrCallbackPath || "/ehr-callback"; // Default callback path
    result.server.https.enabled = result.server.https.enabled ?? false; // Default HTTPS disabled

    // Derive baseUrl if not provided
    if (!result.server.baseUrl) {
        const protocol = result.server.https.enabled ? 'https' : 'http';
        // Use explicit host from config or default
        result.server.baseUrl = `${protocol}://${result.server.host}:${result.server.port}`;
        console.log(`[CONFIG] Derived server.baseUrl: ${result.server.baseUrl}`);
    }

    // --- Persistence Defaults ---
    result.persistence.enabled = result.persistence.enabled ?? false;
    if (result.persistence.enabled && !result.persistence.directory) {
        result.persistence.directory = "./data"; // Default directory only if enabled
        console.log(`[CONFIG] Defaulted persistence.directory: ${result.persistence.directory}`);
    }

    // --- Security Defaults ---
    result.security.disableClientChecks = result.security.disableClientChecks ?? false;

    // --- Static Session Defaults ---
    result.staticSession.enabled = result.staticSession.enabled ?? false;
    // No default dbPath - should be explicit if enabled


    // --- Retriever Config Defaults (already handled above ensuring objects exist) ---
    // No specific defaults needed inside deliveryEndpoints or vendorConfig


    // --- REMOVED EHR Defaults ---
    // No longer managing EHR scopes or discovery here

    return result as AppConfig; // Cast to AppConfig, Zod will perform final validation
}


// --- SMART Discovery (Keep for potential future server-side use? Or remove?) ---
// Let's keep it for now, but it's unused by the current config structure.
export async function fetchSmartConfiguration(fhirBaseUrl: string): Promise<{ authorization_endpoint?: string; token_endpoint?: string }> {
    // Use native URL for robust path handling
    const wellKnownUrl = new URL('.well-known/smart-configuration', fhirBaseUrl.endsWith('/') ? fhirBaseUrl : fhirBaseUrl + '/').href;
    console.log(`[UTIL] Fetching SMART configuration from: ${wellKnownUrl}`);
    try {
        const response = await fetch(wellKnownUrl, { headers: { "Accept": "application/json" } });
        if (!response.ok) {
            console.warn(`[UTIL] Failed to fetch SMART configuration (${response.status}): ${await response.text()}`);
            return {};
        }
        const config = await response.json();
        console.log(`[UTIL] Discovered endpoints: Auth - ${config.authorization_endpoint}, Token - ${config.token_endpoint}`);
        return {
            authorization_endpoint: config.authorization_endpoint,
            token_endpoint: config.token_endpoint
        };
    } catch (error: any) {
        console.error(`[UTIL] Error fetching SMART configuration: ${error.message}`);
        return {};
    }
} 
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import _ from 'lodash';
import { URL } from 'url'; // Node.js URL

// --- Configuration Schema ---
// Define the schema with minimal validation
const EhrConfigSchema = z.object({
    clientId: z.string().min(1),
    authUrl: z.string().url().optional(),
    tokenUrl: z.string().url().optional(),
    fhirBaseUrl: z.string().url(),
    requiredScopes: z.array(z.string()).min(1)
});

const ServerConfigSchema = z.object({
    port: z.number().int().positive().optional(),
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

const ConfigSchema = z.object({
    ehr: EhrConfigSchema.optional(),
    server: ServerConfigSchema,
    persistence: PersistenceConfigSchema,
    security: SecurityConfigSchema,
    staticSession: z.object({
        enabled: z.boolean(),
        dbPath: z.string().optional()
    }).optional()
});

// --- Configuration Type ---
export type AppConfig = z.infer<typeof ConfigSchema>;

// --- Configuration Loading ---
export async function loadConfig(configPath: string): Promise<AppConfig> {
    try {
        // Try to read the config file
        let loadedConfig = {};
        try {
            const configData = await fs.readFile(configPath, 'utf-8');
            loadedConfig = JSON.parse(configData);
            console.log(`[CONFIG] Successfully loaded configuration from ${configPath}`);
        } catch (error) {
            console.warn(`[CONFIG] Could not load configuration from ${configPath}: ${error}`);
            throw new Error(`Configuration file not found or invalid: ${configPath}`);
        }

        // Apply derived values to the loaded configuration
        const configWithDefaults = await applyDerivedValues(loadedConfig);

        // Now validate the complete configuration
        const validatedConfig = ConfigSchema.parse(configWithDefaults);

        // Post-processing and validations
        if (validatedConfig.server?.https?.enabled) {
            if (!validatedConfig.server.https.certPath || !validatedConfig.server.https.keyPath) {
                throw new Error("HTTPS is enabled but certificate paths are not provided");
            }
        }

        // Ensure the persistence directory exists if persistence is enabled
        if (validatedConfig.persistence?.enabled && validatedConfig.persistence.directory) {
            try {
                await fs.mkdir(validatedConfig.persistence.directory, { recursive: true });
                console.log(`[CONFIG] Ensured persistence directory exists: ${validatedConfig.persistence.directory}`);
            } catch (error) {
                console.error(`[CONFIG] Failed to create persistence directory: ${error}`);
                throw new Error(`Failed to create persistence directory: ${error}`);
            }
        }

        console.log(validatedConfig);
        return validatedConfig;
    } catch (error) {
        console.error(`[CONFIG] Error loading configuration: ${error}`);
        throw error;
    }
}

// Apply derived values and ensure required fields
async function applyDerivedValues(config: any): Promise<AppConfig> {
    // Create a deep copy to avoid modifying the original
    const result = _.cloneDeep(config);

    // Ensure server configuration exists
    if (!result.server) {
        result.server = {};
    }

    // Set default port if not provided
    if (!result.server.port) {
        result.server.port = 3001;
    }

    // Set default callback path if not provided
    if (!result.server.ehrCallbackPath) {
        result.server.ehrCallbackPath = "/ehr-callback";
    }

    // Set default HTTPS configuration if not provided
    if (!result.server.https) {
        result.server.https = {
            enabled: false,
        };
    }

    // Derive baseUrl if not provided
    if (!result.server.baseUrl) {
        const protocol = result.server.https?.enabled ? 'https' : 'http';
        const host = 'localhost';
        result.server.baseUrl = `${protocol}://${host}:${result.server.port}`;
    }

    // Ensure persistence configuration exists
    if (!result.persistence) {
        result.persistence = {
            enabled: false,
            directory: "./data"
        };
    }

    // Ensure security configuration exists
    if (!result.security) {
        result.security = {
            disableClientChecks: false
        };
    }

    // Ensure required scopes exist
    if (result.ehr) {
        if ( !result?.ehr?.requiredScopes || result?.ehr?.requiredScopes.length === 0) {
            result.ehr.requiredScopes = [
                "openid",
                "fhirUser",
                "launch/patient",
                "patient/*.read",
                "launch",
                "offline_access"
            ];
        }

        // Try to discover auth and token URLs if not provided
        if (!result.ehr.authUrl || !result.ehr.tokenUrl) {
            console.log(`[CONFIG] Auth or token URL not provided, attempting SMART discovery`);
            if (result.ehr.fhirBaseUrl) {
                try {
                    const smartConfig = await fetchSmartConfiguration(result.ehr.fhirBaseUrl);
                    if (smartConfig.authorization_endpoint && !result.ehr.authUrl) {
                        result.ehr.authUrl = smartConfig.authorization_endpoint;
                        console.log(`[CONFIG] Discovered auth URL: ${result.ehr.authUrl}`);
                    }
                    if (smartConfig.token_endpoint && !result.ehr.tokenUrl) {
                        result.ehr.tokenUrl = smartConfig.token_endpoint;
                        console.log(`[CONFIG] Discovered token URL: ${result.ehr.tokenUrl}`);
                    }
                } catch (error) {
                    console.error(`[CONFIG] Error during SMART discovery: ${error}`);
                    // Continue without the discovered URLs
                }
            } else {
                console.warn(`[CONFIG] Cannot perform SMART discovery: fhirBaseUrl is missing`);
            }
        }
    }

    return result as AppConfig;
}

// --- SMART Discovery ---
export async function fetchSmartConfiguration(fhirBaseUrl: string): Promise<{ authorization_endpoint?: string; token_endpoint?: string }> {
    // Use native URL for robust path handling
    const wellKnownUrl = new URL('.well-known/smart-configuration', fhirBaseUrl.endsWith('/') ? fhirBaseUrl : fhirBaseUrl + '/').href;
    console.log(`[CONFIG] Fetching SMART configuration from: ${wellKnownUrl}`);
    try {
        const response = await fetch(wellKnownUrl, { headers: { "Accept": "application/json" } });
        if (!response.ok) {
            console.warn(`[CONFIG] Failed to fetch SMART configuration (${response.status}): ${await response.text()}`);
            return {};
        }
        const config = await response.json();
        console.log(`[CONFIG] Discovered endpoints: Auth - ${config.authorization_endpoint}, Token - ${config.token_endpoint}`);
        return {
            authorization_endpoint: config.authorization_endpoint,
            token_endpoint: config.token_endpoint
        };
    } catch (error) {
        console.error(`[CONFIG] Error fetching SMART configuration: ${error}`);
        return {};
    }
} 
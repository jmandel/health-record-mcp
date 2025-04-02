import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import _ from 'lodash';
import { URL } from 'url'; // Node.js URL

// --- Default Values ---
const DEFAULT_SMART_LAUNCHER_FHIR_BASE = "https://launch.smarthealthit.org/v/r4/sim/WzMsIjgzNjRmZjc0LWQ5MDQtNDQyYi1iOTg0LWY5ZDY0MDUzMTYzOSIsIiIsIkFVVE8iLDEsMSwwLCIiLCIiLCIiLCIiLCIiLDAsMSwiIl0/fhir";
const DEFAULT_SMART_LAUNCHER_CLIENT_ID = "mcp_app";
const DEFAULT_EHR_SCOPES = [
    "openid", "fhirUser", "launch/patient",
    "patient/Patient.read", "patient/Observation.read", "patient/Condition.read",
    "patient/DocumentReference.read", "patient/MedicationRequest.read",
    "patient/MedicationStatement.read", "patient/AllergyIntolerance.read",
    "patient/Procedure.read", "patient/Immunization.read",
    "patient/CommunicationRequest", "patient/Contract"
];

// --- Zod Schema Definition ---
const EhrConfigSchema = z.object({
    fhirBaseUrl: z.string().url().default(DEFAULT_SMART_LAUNCHER_FHIR_BASE),
    clientId: z.string().min(1).optional(), // Optional, will default if using default FHIR URL
    authUrl: z.string().url().nullable().default(null),
    tokenUrl: z.string().url().nullable().default(null),
    requiredScopes: z.array(z.string()).min(1).default(DEFAULT_EHR_SCOPES),
}).describe("EHR Integration Settings");

const HttpsConfigSchema = z.object({
    enabled: z.boolean().default(false),
    keyPath: z.string().min(1).nullable().default(null),
    certPath: z.string().min(1).nullable().default(null),
}).refine(data => !data.enabled || (data.keyPath && data.certPath), {
    message: "If HTTPS is enabled, keyPath and certPath must be provided.",
    path: ["https"]
}).describe("HTTPS Configuration");

const ServerConfigSchema = z.object({
    host: z.string().min(1).default('localhost'),
    port: z.number().int().positive().optional(), // Optional, defaults based on HTTPS
    baseUrl: z.string().url().nullable().default(null), // Optional, derived if null
    https: HttpsConfigSchema,
    ehrCallbackPath: z.string().startsWith('/').default('/ehr-callback'),
}).describe("MCP Server Settings");

const PersistenceConfigSchema = z.object({
    enabled: z.boolean().default(false),
    directory: z.string().min(1).default('./data'),
}).describe("SQLite Persistence Settings");

const SecurityConfigSchema = z.object({
    disableClientChecks: z.boolean().default(false),
}).describe("Security Related Flags");

// Main schema combining all parts
const ConfigSchema = z.object({
    ehr: EhrConfigSchema,
    server: ServerConfigSchema,
    persistence: PersistenceConfigSchema,
    security: SecurityConfigSchema,
}).describe("Main Configuration Structure");

// Type inferred from the schema
export type AppConfig = z.infer<typeof ConfigSchema>;

// --- SMART Discovery ---
async function fetchSmartConfiguration(fhirBaseUrl: string): Promise<{ authorization_endpoint?: string; token_endpoint?: string }> {
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

// --- Config Loading Function ---
export async function loadConfig(configPath: string): Promise<AppConfig> {
    console.log(`[CONFIG] Attempting to load configuration from: ${configPath}`);
    let rawConfigFromFile = {};

    try {
        const absolutePath = path.resolve(configPath); // Ensure absolute path
        const fileContent = await fs.readFile(absolutePath, 'utf-8');
        rawConfigFromFile = JSON.parse(fileContent);
        console.log(`[CONFIG] Successfully read and parsed ${absolutePath}`);
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            console.warn(`[CONFIG] Configuration file not found at ${path.resolve(configPath)}. Using defaults.`);
        } else {
            console.error(`[CONFIG] Error reading or parsing ${configPath}:`, error);
            throw new Error(`Failed to load configuration: ${error.message}`);
        }
    }

    let parsedConfig: AppConfig;
    try {
        // Create a default config object by parsing an empty object {}
        // This works because the nested schemas (EhrConfigSchema, ServerConfigSchema, etc.)
        // already have .default() defined for their properties or are optional.
        const defaultConfig = ConfigSchema.parse({});

        // Deeply merge the loaded config onto the defaults generated by parse({})
        const mergedConfigInput = _.merge({}, defaultConfig, rawConfigFromFile);

        // Parse the merged structure again for final validation and type coercion
        parsedConfig = ConfigSchema.parse(mergedConfigInput);
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error("[CONFIG] Configuration validation failed:", error.errors);
            throw new Error(`Invalid configuration: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
        } else {
            console.error("[CONFIG] Unexpected error during config processing:", error);
            throw error;
        }
    }

    // --- Post-processing and Derivations ---

    // 1. Derive Port based on HTTPS if not explicitly set
    if (parsedConfig.server.port === undefined || parsedConfig.server.port === null) {
        parsedConfig.server.port = parsedConfig.server.https.enabled ? 443 : 3001;
        console.log(`[CONFIG] Server port not specified, defaulting to ${parsedConfig.server.port} based on HTTPS status.`);
    }

    // 2. Derive Base URL if not explicitly set
    if (!parsedConfig.server.baseUrl) {
        const protocol = parsedConfig.server.https.enabled ? 'https' : 'http';
        const host = parsedConfig.server.host;
        const port = parsedConfig.server.port;
        // Standard ports (80 for http, 443 for https) are usually omitted from Base URL
        const portString = (protocol === 'https' && port === 443) || (protocol === 'http' && port === 80) ? '' : `:${port}`;
        parsedConfig.server.baseUrl = `${protocol}://${host}${portString}`;
        console.log(`[CONFIG] Server baseUrl not specified, deriving: ${parsedConfig.server.baseUrl}`);
    } else {
        // Validate provided baseUrl protocol matches HTTPS setting
         const expectedProtocol = parsedConfig.server.https.enabled ? 'https:' : 'http:';
         try {
            const providedUrl = new URL(parsedConfig.server.baseUrl);
            if (providedUrl.protocol !== expectedProtocol) {
                 console.warn(`[CONFIG] WARNING: Provided server.baseUrl (${parsedConfig.server.baseUrl}) protocol (${providedUrl.protocol}) does not match server.https.enabled setting (${expectedProtocol}). Using provided value anyway.`);
            }
         } catch (urlError) {
             console.error(`[CONFIG] FATAL ERROR: Invalid server.baseUrl provided: ${parsedConfig.server.baseUrl}`, urlError);
             throw new Error(`Invalid server.baseUrl: ${parsedConfig.server.baseUrl}`);
         }
    }


    // 3. Discover EHR endpoints if needed
    if (parsedConfig.ehr.fhirBaseUrl && (!parsedConfig.ehr.authUrl || !parsedConfig.ehr.tokenUrl)) {
        console.log("[CONFIG] EHR Auth or Token URL missing, attempting SMART configuration discovery...");
        const discoveredEndpoints = await fetchSmartConfiguration(parsedConfig.ehr.fhirBaseUrl);
        if (!parsedConfig.ehr.authUrl && discoveredEndpoints.authorization_endpoint) {
            try {
                 const validUrl = z.string().url().parse(discoveredEndpoints.authorization_endpoint);
                 parsedConfig.ehr.authUrl = validUrl;
                 console.log(`[CONFIG] Discovered and using EHR Auth URL: ${parsedConfig.ehr.authUrl}`);
            } catch {
                 console.error(`[CONFIG] Discovered EHR Auth URL is invalid: ${discoveredEndpoints.authorization_endpoint}`);
            }
        }
         if (!parsedConfig.ehr.tokenUrl && discoveredEndpoints.token_endpoint) {
             try {
                  const validUrl = z.string().url().parse(discoveredEndpoints.token_endpoint);
                  parsedConfig.ehr.tokenUrl = validUrl;
                  console.log(`[CONFIG] Discovered and using EHR Token URL: ${parsedConfig.ehr.tokenUrl}`);
             } catch {
                  console.error(`[CONFIG] Discovered EHR Token URL is invalid: ${discoveredEndpoints.token_endpoint}`);
             }
        }
    }

     // 4. Default Client ID if needed (only for default SMART Launcher)
     if (!parsedConfig.ehr.clientId && parsedConfig.ehr.fhirBaseUrl === DEFAULT_SMART_LAUNCHER_FHIR_BASE) {
         console.log(`[CONFIG] No EHR client ID provided and using default SMART Launcher FHIR URL. Defaulting client ID to: ${DEFAULT_SMART_LAUNCHER_CLIENT_ID}`);
         parsedConfig.ehr.clientId = DEFAULT_SMART_LAUNCHER_CLIENT_ID;
     }


    // --- Final Validation and Setup ---
     if (!parsedConfig.ehr.authUrl || !parsedConfig.ehr.tokenUrl || !parsedConfig.ehr.fhirBaseUrl || !parsedConfig.ehr.clientId) {
         console.error("FATAL ERROR: Missing required EHR configuration after processing config file, discovery, and defaults.");
         console.error("Required in ehr section: fhirBaseUrl, clientId, authUrl, tokenUrl");
         console.error("Current Values:", JSON.stringify(parsedConfig.ehr, null, 2));
         throw new Error("Incomplete EHR configuration.");
     }
     // Zod schema refinement already checks key/cert paths if HTTPS is enabled.

     // Ensure persistence directory exists if enabled
     if (parsedConfig.persistence.enabled) {
         try {
             const absoluteDir = path.resolve(parsedConfig.persistence.directory);
             await fs.mkdir(absoluteDir, { recursive: true });
             console.log(`[CONFIG] SQLite persistence directory created/verified: ${absoluteDir}`);
             // Update the config to store the absolute path for consistency
             parsedConfig.persistence.directory = absoluteDir;
         } catch (error) {
             console.error(`[CONFIG] Error creating SQLite persistence directory: ${error}`);
             throw new Error(`Failed to create persistence directory: ${parsedConfig.persistence.directory}`);
         }
     }

    console.log("[CONFIG] Configuration loaded and validated successfully.");
    // Avoid logging sensitive details like client secrets if they were ever added
    console.log("[CONFIG] Final Configuration (Non-sensitive):", JSON.stringify(_.omit(parsedConfig, []), null, 2)); // Adjust omit path if secrets are added

    return parsedConfig;
} 
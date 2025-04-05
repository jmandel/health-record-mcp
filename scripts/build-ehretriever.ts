#!/usr/bin/env bun
import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'bun';
import { Command } from 'commander';

async function main() {
    const program = new Command();

    program
        .name('build-ehretriever')
        .description('Builds the ehretriever.ts bundle, injecting configuration.')
        .option('-c, --config <path>', 'Path to the base configuration JSON file.')
        .option('--extra-endpoints <json_string>', 'JSON string of additional delivery endpoints to merge.')
        .allowUnknownOption() // Allow other args to pass through to bun build
        .parse(process.argv);

    const options = program.opts();
    const configPath = options.config ? path.resolve(options.config) : null;
    const extraEndpointsJson = options.extraEndpoints;

    let defines: Record<string, string> = {};

    let config: any = {}; // Start with empty config

    if (configPath) {
        console.log(`Loading base config from: ${configPath}`);
        try {
            const configContent = await fs.readFile(configPath, 'utf-8');
            config = JSON.parse(configContent);
            console.log(`Successfully loaded base config.`);
        } catch (error: any) {
            console.error(`Warning: Failed to load or parse config file ${configPath}: ${error.message}. Proceeding with empty config.`);
            config = {}; // Reset to empty on error
        }
    } else {
        console.log('No base config file specified, starting with empty config.');
    }

    // Ensure deliveryEndpoints object exists in config
    if (!config.deliveryEndpoints || typeof config.deliveryEndpoints !== 'object') {
        config.deliveryEndpoints = {};
    }

    // Parse and merge extra endpoints if provided
    if (extraEndpointsJson) {
        console.log(`Parsing extra endpoints: ${extraEndpointsJson}`);
        try {
            const extraEndpoints = JSON.parse(extraEndpointsJson);
            if (typeof extraEndpoints === 'object' && extraEndpoints !== null) {
                // Merge extra endpoints into the config
                config.deliveryEndpoints = { ...config.deliveryEndpoints, ...extraEndpoints };
                console.log('Successfully merged extra endpoints.');
            } else {
                console.warn('Warning: --extra-endpoints value did not parse to a valid object. Ignoring.');
            }
        } catch (error: any) {
            console.warn(`Warning: Failed to parse --extra-endpoints JSON: ${error.message}. Ignoring.`);
        }
    }

    // --- Now extract defines from the final merged config --- 
    console.log('Extracting defines from final configuration...');

    if (config.ehr) {
        if (config.ehr.fhirBaseUrl) {
            // Ensure strings are quoted for the define value
            defines['__CONFIG_FHIR_BASE_URL__'] = config.ehr.fhirBaseUrl;
        }
        if (config.ehr.clientId) {
            defines['__CONFIG_CLIENT_ID__'] = config.ehr.clientId;
        }
        if (Array.isArray(config.ehr.requiredScopes) && config.ehr.requiredScopes.length > 0) {
            // Join scopes into a single string, then JSON.stringify to add quotes
            defines['__CONFIG_SCOPES__'] = config.ehr.requiredScopes.join(' ');
        }
    }

    // Inject the final merged delivery endpoints (if any)
    // Validate structure before stringifying
    const finalValidEndpoints: Record<string, { postUrl: string }> = {};
    if (config.deliveryEndpoints && typeof config.deliveryEndpoints === 'object') {
        for (const key in config.deliveryEndpoints) {
            const endpointConfig = config.deliveryEndpoints[key];
            if (endpointConfig && typeof endpointConfig === 'object' && typeof endpointConfig.postUrl === 'string') {
                finalValidEndpoints[key] = { postUrl: endpointConfig.postUrl };
            } else {
                console.warn(`Warning: Invalid structure or missing string property (postUrl) for final deliveryEndpoint '${key}'. Skipping.`);
            }
        }
    }
    if (Object.keys(finalValidEndpoints).length > 0) {
        // Pass the object stringified ONCE for the define value
        defines['__DELIVERY_ENDPOINTS__'] = JSON.stringify(finalValidEndpoints);
    }

    // Note: Default mcp-callback endpoint is no longer automatically added here;
    // it should be part of the base config or provided via --extra-endpoints if needed.

    console.log('Injecting defines for build:', defines);

    // --- Define source and output paths ---
    const staticDir = path.resolve(process.cwd(), 'static');
    const outputDir = path.resolve(staticDir, 'dist');
    const sourceTs = path.resolve(process.cwd(), 'ehretriever.ts'); // Assuming TS source is in static/
    const sourceHtml = path.resolve(staticDir, 'ehretriever.html'); // Assuming HTML source is in static/
    const outputJs = path.resolve(outputDir, 'ehretriever.bundle.js');
    const outputHtml = path.resolve(outputDir, 'ehretriever.html');

    // --- Ensure output directory exists ---
    console.log(`Ensuring output directory exists: ${outputDir}`);
    await fs.mkdir(outputDir, { recursive: true });

    // --- Build the TypeScript file ---
    const buildArgs = [
        'build',
        sourceTs,
        '--outfile', outputJs,
        '--target', 'browser'
    ];

    // Add defines to the build arguments
    for (const key in defines) {
        // Pass KEY=VALUE as a single argument element to spawn
        buildArgs.push('--define', `${key}='${defines[key]}'`);
    }

    // Add any remaining arguments

    console.log(`Running: bun ${buildArgs.join(' ')}`);

    const proc = spawn(['bun', ...buildArgs], {
        stdout: 'inherit',
        stderr: 'inherit'
    });

    const bunBuildExitCode = await proc.exited;
    if (bunBuildExitCode !== 0) {
        console.error('Bun build process failed.');
        process.exit(bunBuildExitCode);
    }
    console.log('Bun build completed successfully.');

    process.exit(0); // Explicit success exit
}

main(); 
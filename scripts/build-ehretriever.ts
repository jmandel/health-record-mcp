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

    // Ensure retrieverConfig and its sub-objects exist
    if (!config.retrieverConfig || typeof config.retrieverConfig !== 'object') {
        config.retrieverConfig = {};
    }
    if (!config.retrieverConfig.deliveryEndpoints || typeof config.retrieverConfig.deliveryEndpoints !== 'object') {
        config.retrieverConfig.deliveryEndpoints = {};
    }
     if (!config.retrieverConfig.vendorConfig || typeof config.retrieverConfig.vendorConfig !== 'object') {
         config.retrieverConfig.vendorConfig = {};
     }


    // Parse and merge extra endpoints if provided
    if (extraEndpointsJson) {
        console.log(`Parsing extra endpoints: ${extraEndpointsJson}`);
        try {
            const extraEndpoints = JSON.parse(extraEndpointsJson);
            if (typeof extraEndpoints === 'object' && extraEndpoints !== null) {
                // Merge extra endpoints into the config
                config.retrieverConfig.deliveryEndpoints = { ...config.retrieverConfig.deliveryEndpoints, ...extraEndpoints };
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

    // --- Inject Delivery Endpoints ---
    // Validate structure before stringifying
    const finalValidEndpoints: Record<string, { postUrl: string }> = {};
    if (config.retrieverConfig.deliveryEndpoints && typeof config.retrieverConfig.deliveryEndpoints === 'object') {
        for (const key in config.retrieverConfig.deliveryEndpoints) {
            const endpointConfig = config.retrieverConfig.deliveryEndpoints[key];
            if (endpointConfig && typeof endpointConfig === 'object' && typeof endpointConfig.postUrl === 'string') {
                finalValidEndpoints[key] = { postUrl: endpointConfig.postUrl };
            } else {
                console.warn(`Warning: Invalid structure or missing string property (postUrl) for final deliveryEndpoint '${key}'. Skipping.`);
            }
        }
    }
    if (Object.keys(finalValidEndpoints).length > 0) {
        defines['__DELIVERY_ENDPOINTS__'] = JSON.stringify(finalValidEndpoints);
    }

    // --- Inject Vendor Config ---
    // Validate structure before stringifying
    const finalValidVendorConfig: Record<string, { clientId: string, scopes: string, redirectUrl?: string }> = {};
    if (config.retrieverConfig.vendorConfig && typeof config.retrieverConfig.vendorConfig === 'object') {
         for (const key in config.retrieverConfig.vendorConfig) {
             const vendorConf = config.retrieverConfig.vendorConfig[key];
             if (vendorConf && typeof vendorConf === 'object' &&
                 typeof vendorConf.clientId === 'string' &&
                 typeof vendorConf.scopes === 'string' &&
                 (typeof vendorConf.redirectUrl === 'undefined' || typeof vendorConf.redirectUrl === 'string'))
             {
                 finalValidVendorConfig[key] = {
                     clientId: vendorConf.clientId,
                     scopes: vendorConf.scopes,
                     ...(vendorConf.redirectUrl && { redirectUrl: vendorConf.redirectUrl }) // Include redirectUrl only if it exists
                 };
             } else {
                 console.warn(`Warning: Invalid structure or missing string properties (clientId, scopes) for vendorConfig '${key}'. Skipping.`);
             }
         }
     }
     if (Object.keys(finalValidVendorConfig).length > 0) {
         defines['__VENDOR_CONFIG__'] = JSON.stringify(finalValidVendorConfig);
     } else {
        // Still define it as an empty object if nothing valid was found or provided
        defines['__VENDOR_CONFIG__'] = JSON.stringify({});
        console.warn('Warning: No valid vendor configurations found in config. Injecting empty __VENDOR_CONFIG__ = {}.');
     }


    console.log('Injecting defines for build:', defines);

    // --- Define source and output paths ---
    const staticDir = path.resolve(process.cwd(), 'static');
    const outputDir = path.resolve(staticDir, 'dist');
    const sourceTs = path.resolve(process.cwd(), 'ehretriever.ts'); // Assuming TS source is in project root
    // const sourceHtml = path.resolve(staticDir, 'ehretriever.html'); // Assuming HTML source is in static/
    const outputJs = path.resolve(outputDir, 'ehretriever.bundle.js');
    // const outputHtml = path.resolve(outputDir, 'ehretriever.html');

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
        // Pass KEY='VALUE' (note the single quotes around the JSON stringified value)
        buildArgs.push('--define', `${key}=${defines[key]}`);
    }

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
import { Command } from 'commander';
import { Database } from 'bun:sqlite';
import fs from 'fs';
import { createFhirRenderer } from '../src/fhirToPlaintext'; // Adjust path as needed
import { sqliteToEhr } from '../src/dbUtils'; // Import the DB loading function
import { ClientFullEHR } from '../clientTypes'; // Import type for fullEhr

async function main() {
    const program = new Command();
    program
        .name('test-fhirToPlaintext')
        .description('Test FHIR to Plaintext rendering against resources in a SQLite DB')
        .requiredOption('--db <path>', 'Path to the SQLite database file containing FHIR resources')
        .parse(process.argv);

    const options = program.opts();
    const dbPath = options.db;

    // Validate DB file existence
    if (!fs.existsSync(dbPath)) {
        console.error(`Error: Database file not found at "${dbPath}"`);
        process.exit(1);
    }

    let db: Database | null = null;
    try {
        console.log(`Opening database: ${dbPath}`);
        db = new Database(dbPath);

        // Load the full EHR data from the database
        console.log("Loading full EHR data from database...");
        const fullEhr: ClientFullEHR = await sqliteToEhr(db);
        console.log(`Loaded ${Object.keys(fullEhr.fhir).length} resource types and ${fullEhr.attachments.length} attachments.`);

        // Create the renderer instance with the loaded data
        console.log("Creating FHIR renderer...");
        const render = createFhirRenderer(fullEhr);
        console.log("Renderer created.\n");

        const resourceTypesToTest = Object.keys(fullEhr.fhir); // Test types present in the data
        console.log(`Testing rendering for ${resourceTypesToTest.length} resource types found in the data...\n`);

        for (const resourceType of resourceTypesToTest) {
            console.log(`===== Testing Resource Type: ${resourceType} =====`);

            const resources = fullEhr.fhir[resourceType];

            if (resources.length === 0) {
                console.log(`No ${resourceType} resources found in the database.\n`);
                continue;
            }

            console.log(`Found ${resources.length} ${resourceType} resource(s) to render...`);

            // Limit the number of resources rendered per type for brevity in testing
            const resourcesToRender = resources.slice(0, 1000); 
            console.log(`(Rendering first ${resourcesToRender.length} of them)`);

            for (const resourceObj of resourcesToRender) {
                const resourceId = resourceObj?.id || '[ID Missing]';

                console.log(`\n--- Rendering ${resourceType}/${resourceId} ---`);
                try {
                    // Use the renderer instance created from the fullEhr data
                    const plaintext = render(resourceObj);
                    console.log(plaintext || "[No plaintext generated]");
                } catch (renderError: any) {
                    console.error(`Error rendering ${resourceType}/${resourceId}: ${renderError.message}`);
                    console.error(renderError.stack); // Log stack for debugging
                }
                console.log("---\n");
            }
        }

        console.log("\n===== Testing Complete =====");

    } catch (error: any) {
        console.error(`An unexpected error occurred: ${error.message}`);
        console.error(error.stack);
    } finally {
        if (db) {
            console.log("Closing database.");
            db.close();
        }
    }
}

main(); 
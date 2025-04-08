// scripts/test-grep.ts
import { Command } from 'commander';
import { Database } from 'bun:sqlite';
import { sqliteToEhr } from '../src/dbUtils.js'; // Adjust path if needed
import { grepRecordLogic } from '../src/tools.js'; // Adjust path if needed
import { ClientFullEHR } from '../clientTypes.js'; // Adjust path if needed

async function main() {
    const program = new Command();
    program
        .name('test-grep')
        .description('Test the grepRecordLogic function against an EHR SQLite database.')
        .requiredOption('--db <path>', 'Path to the SQLite database file containing EHR data')
        .option('--grep <query>', 'Regular expression to search for', 'hypertension|systolic|pressure')
        .option('--format <format>', "Output format for resource hits ('plaintext' or 'json')", 'plaintext')
        .option('--page <number>', 'Page number for results', '1')
        .option('--page-size <number>', 'Number of results per page', '10')
        .parse(process.argv);

    const options = program.opts();

    const dbPath = options.db as string;
    const grepQuery = options.grep as string;
    const format = options.format as 'plaintext' | 'json';
    const page = parseInt(options.page, 10);
    const pageSize = parseInt(options.pageSize, 10);

    if (format !== 'plaintext' && format !== 'json') {
        console.error(`Invalid format: ${format}. Must be 'plaintext' or 'json'.`);
        process.exit(1);
    }

    if (isNaN(page) || page < 1) {
        console.error(`Invalid page number: ${options.page}. Must be a positive integer.`);
        process.exit(1);
    }

    if (isNaN(pageSize) || pageSize < 1) {
         console.error(`Invalid page size: ${options.pageSize}. Must be a positive integer.`);
        process.exit(1);
    }

    let db: Database | undefined;
    try {
        console.log(`[TEST] Opening database: ${dbPath}...`);
        db = new Database(dbPath, { readonly: true });

        console.log(`[TEST] Loading EHR data from database...`);
        // Cast the result to ClientFullEHR as sqliteToEhr returns this type
        const fullEhr: ClientFullEHR = await sqliteToEhr(db); 
        console.log(`[TEST] EHR data loaded. Found ${Object.keys(fullEhr.fhir).length} resource types and ${fullEhr.attachments.length} attachments.`);

        console.log(`[TEST] Running grep with query: "${grepQuery}", format: ${format}, page: ${page}, pageSize: ${pageSize}...`);
        const resultMarkdown = await grepRecordLogic(
            fullEhr,
            grepQuery,
            undefined, // Search all resource types by default
            format,
            pageSize,
            page
        );

        console.log("\n--- GREP RESULT --- ");
        console.log(resultMarkdown);
        console.log("--- END GREP RESULT ---\n");

    } catch (error: any) {
        console.error("[TEST] An error occurred:", error);
        process.exit(1);
    } finally {
        if (db) {
            console.log("[TEST] Closing database.");
            db.close();
        }
    }
}

main().catch(err => {
    console.error("Unhandled error in main function:", err);
    process.exit(1);
});

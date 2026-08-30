import { Database } from 'bun:sqlite';
import { ProcessedAttachment } from './types';
import { ClientFullEHR, ClientProcessedAttachment } from '../clientTypes';

/**
 * Populates a SQLite database with data from a FullEHR object.
 * Creates necessary tables and indexes for efficient querying.
 * 
 * @param fullEhr - The FullEHR object containing FHIR resources and attachments
 * @param db - An open SQLite database connection
 * @returns The same database instance after population
 */
/**
 * Creates the schema on a fresh database and migrates an older one in place.
 *
 * Two things beyond the original schema:
 *  - a `source` column on both tables, so records from different health systems
 *    stay distinguishable once they share a file;
 *  - a uniqueness constraint on attachments, so re-ingesting a provider updates
 *    rather than duplicates. Any duplicates left behind by an earlier append are
 *    collapsed (keeping the lowest rowid) before the index is built.
 *
 * Must be called inside a transaction.
 */
export function ensureSchema(db: Database): void {
    db.exec(`
        CREATE TABLE IF NOT EXISTS fhir_resources (
            resource_type TEXT NOT NULL,
            resource_id TEXT NOT NULL,
            json TEXT NOT NULL,
            PRIMARY KEY (resource_type, resource_id)
        );
        
        CREATE TABLE IF NOT EXISTS fhir_attachments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            resource_type TEXT NOT NULL,
            resource_id TEXT NOT NULL,
            path TEXT NOT NULL,
            content_type TEXT NOT NULL,
            json TEXT NOT NULL,
            content_raw BLOB,
            content_plaintext TEXT,
            FOREIGN KEY (resource_type, resource_id) REFERENCES fhir_resources(resource_type, resource_id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_fhir_resources_type ON fhir_resources(resource_type);
        CREATE INDEX IF NOT EXISTS idx_fhir_attachments_resource ON fhir_attachments(resource_type, resource_id);
    `);

    // SQLite has no "ADD COLUMN IF NOT EXISTS", so check the table info first.
    for (const table of ['fhir_resources', 'fhir_attachments']) {
        const columns = db.query<{ name: string }, []>(`PRAGMA table_info(${table})`).all();
        if (!columns.some(c => c.name === 'source')) {
            console.log(`[DB:SCHEMA] Adding 'source' column to ${table}`);
            db.exec(`ALTER TABLE ${table} ADD COLUMN source TEXT`);
        }
    }
    db.exec(`CREATE INDEX IF NOT EXISTS idx_fhir_resources_source ON fhir_resources(source);`);

    // Collapse pre-existing duplicates, otherwise the unique index cannot be built.
    const removed = db.prepare(`
        DELETE FROM fhir_attachments
        WHERE id NOT IN (
            SELECT MIN(id) FROM fhir_attachments
            GROUP BY resource_type, resource_id, path, content_type
        )
    `).run().changes;
    if (removed > 0) {
        console.log(`[DB:SCHEMA] Removed ${removed} duplicate attachment row(s) left by an earlier append`);
    }

    db.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_fhir_attachments_unique
            ON fhir_attachments(resource_type, resource_id, path, content_type);
    `);
}

export async function ehrToSqlite(fullEhr: ClientFullEHR, db: Database, source: string | null = null): Promise<Database> {
    console.log(`[DB:POPULATE] Starting database population from FullEHR${source ? ` (source: ${source})` : ''}`);
    
    try {
        // Begin a transaction for better performance
        db.exec('BEGIN TRANSACTION;');
        
        // Create the schema on a fresh file, or migrate an existing one, before
        // preparing any statements against it.
        ensureSchema(db);
        
        // Prepare statements for better performance
        const insertResourceStmt = db.prepare(
            'INSERT OR REPLACE INTO fhir_resources (resource_type, resource_id, json, source) VALUES (?, ?, ?, ?)'
        );
        
        // OR IGNORE plus the unique index makes re-ingesting a provider idempotent:
        // an attachment already on file is left alone instead of duplicated.
        const insertAttachmentStmt = db.prepare(
            'INSERT OR IGNORE INTO fhir_attachments (resource_type, resource_id, path, content_type, json, content_raw, content_plaintext, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        );
        
        // Insert FHIR resources
        let resourceCount = 0;
        for (const [resourceType, resources] of Object.entries(fullEhr.fhir)) {
            for (const resource of resources) {
                if (resource && resource.id) {
                    insertResourceStmt.run(resourceType, resource.id, JSON.stringify(resource), source);
                    resourceCount++;
                }
            }
        }
        console.log(`[DB:POPULATE] Inserted ${resourceCount} FHIR resources`);
        
        // Insert attachments
        if (fullEhr.attachments && fullEhr.attachments.length > 0) {
            let attachmentCount = 0;
            let skippedCount = 0;
            for (const attachment of fullEhr.attachments) {
                const { changes } = insertAttachmentStmt.run(
                    attachment.resourceType,
                    attachment.resourceId,
                    attachment.path,
                    attachment.contentType,
                    attachment.json,
                    attachment.contentBase64,
                    attachment.contentPlaintext,
                    source
                );
                if (changes > 0) attachmentCount++; else skippedCount++;
            }
            console.log(`[DB:POPULATE] Inserted ${attachmentCount} attachments${skippedCount > 0 ? ` (${skippedCount} already present, skipped)` : ''}`);
        } else {
            console.log('[DB:POPULATE] No attachments to insert');
        }
        
        // Commit transaction
        db.exec('COMMIT;');
        console.log("[DB:POPULATE] Database population completed successfully");
        
        return db;
    } catch (error) {
        // Rollback on error
        try {
            db.exec('ROLLBACK;');
        } catch (rollbackError) {
            console.error('[DB:POPULATE] Error during rollback:', rollbackError);
        }
        console.error('[DB:POPULATE] Error populating database:', error);
        throw error;
    }
}

interface ResourceRow {
    resource_type: string;
    json: string;
}

interface AttachmentRow {
    resource_type: string;
    resource_id: string;
    path: string;
    content_type: string;
    json: string;
    content_raw: ArrayBuffer | null;
    content_plaintext: string | null;
}

/**
 * Reconstructs a FullEHR object from a SQLite database.
 * Retrieves all FHIR resources and attachments.
 * 
 * @param db - An open SQLite database connection
 * @returns A Promise resolving to a FullEHR object
 */
export async function sqliteToEhr(db: Database): Promise<ClientFullEHR> {
    // console.log("[DB:RECONSTRUCT] Reconstructing FullEHR from database");
    
    try {
        // Initialize the FullEHR structure
        const fhir: Record<string, any[]> = {};
        
        // Fetch all resources grouped by type
        const resourcesQuery = db.query<ResourceRow, []>(`
            SELECT resource_type, json 
            FROM fhir_resources
            ORDER BY resource_type
        `);
        
        for (const row of resourcesQuery.all()) {
            const resourceType = row.resource_type;
            const content = JSON.parse(row.json);
            
            if (!fhir[resourceType]) {
                fhir[resourceType] = [];
            }
            
            fhir[resourceType].push(content);
        }
        
        // Fetch all attachments
        const attachmentsQuery = db.query<AttachmentRow, []>(`
            SELECT resource_type, resource_id, path, content_type, json, content_raw, content_plaintext
            FROM fhir_attachments
        `);
        
        const attachments: ClientProcessedAttachment[] = attachmentsQuery.all().map(row => ({
            resourceType: row.resource_type,
            resourceId: row.resource_id,
            path: row.path,
            contentType: row.content_type,
            json: row.json,
            contentBase64: row.content_raw ? Buffer.from(row.content_raw).toString('base64') : null,
            contentPlaintext: row.content_plaintext
        }));
        
        const resourceCount = Object.values(fhir).reduce((sum, arr) => sum + arr.length, 0);
        // console.log(`[DB:RECONSTRUCT] Reconstructed ${resourceCount} resources and ${attachments.length} attachments`);
        
        return { fhir, attachments };
    } catch (error) {
        console.error('[DB:RECONSTRUCT] Error reconstructing FullEHR from database:', error);
        throw error;
    }
} 
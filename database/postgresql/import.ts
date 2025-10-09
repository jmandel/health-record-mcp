#!/usr/bin/env bun
/**
 * Import EHR data from JSON or SQLite files into PostgreSQL
 * 
 * Usage:
 *   bun run database/postgresql/import.ts \
 *     [--patient "Emmanuel Bioux"] \
 *     [--provider "Epic - Scripps Health"] \
 *     [--source ./data/my_record.json]
 * 
 * Supports both JSON and SQLite source files:
 *   - .json files: Direct ClientFullEHR format (recommended)
 *   - .sqlite files: Legacy SQLite format
 * 
 * All arguments are optional if set in .env file.
 * Create .env from .env.example and configure defaults.
 */

import { Database } from "bun:sqlite";
import postgres from "postgres";
import type { ClientFullEHR } from "../../clientTypes";
import { readFile } from "fs/promises";

// Load environment variables
import "dotenv/config";

interface ImportConfig {
  patientFirstName: string;
  patientLastName: string;
  providerName: string;
  sourcePath: string;
  pgConnectionString: string;
}

interface ExtractedCode {
  system: string | null;
  code: string | null;
  display: string | null;
}

async function importEhrData(config: ImportConfig) {
  console.log(`\n🔄 Starting import for ${config.patientFirstName} ${config.patientLastName} from ${config.providerName}`);
  
  // Connect to PostgreSQL
  const sql = postgres(config.pgConnectionString);
  
  try {
    // Load data from source file (JSON or SQLite)
    const fullEhr = await loadEhrData(config.sourcePath);
    
    console.log(`📊 Loaded ${Object.keys(fullEhr.fhir).length} resource types`);
    console.log(`📎 Found ${fullEhr.attachments.length} attachments`);
    
    // Get or create patient
    const patient = await getOrCreatePatient(sql, {
      firstName: config.patientFirstName,
      lastName: config.patientLastName
    });
    console.log(`👤 Patient ID: ${patient.id}`);
    
    // Get or create provider
    const provider = await getOrCreateProvider(sql, config.providerName);
    console.log(`🏥 Provider ID: ${provider.id}`);
    
    // Create patient-provider link
    const patientFhirId = extractPatientFhirId(fullEhr);
    await createPatientProviderLink(sql, patient.id, provider.id, patientFhirId);
    
    // Import FHIR resources
    let totalResources = 0;
    const resourceUuidMap = new Map<string, string>(); // Maps "resourceType/resourceId" -> UUID
    
    for (const [resourceType, resources] of Object.entries(fullEhr.fhir)) {
      console.log(`\n📥 Importing ${resources.length} ${resourceType} resources...`);
      
      for (const resource of resources) {
        const uuid = await importFhirResource(
          sql,
          patient.id,
          provider.id,
          resourceType,
          resource
        );
        
        if (uuid && resource.id) {
          resourceUuidMap.set(`${resourceType}/${resource.id}`, uuid);
        }
        totalResources++;
      }
    }
    
    console.log(`\n✅ Imported ${totalResources} FHIR resources`);
    
    // Import attachments
    console.log(`\n📎 Importing ${fullEhr.attachments.length} attachments...`);
    let importedAttachments = 0;
    
    for (const attachment of fullEhr.attachments) {
      const resourceKey = `${attachment.resourceType}/${attachment.resourceId}`;
      const resourceUuid = resourceUuidMap.get(resourceKey);
      
      if (!resourceUuid) {
        console.warn(`⚠️  No resource found for attachment: ${resourceKey}`);
        continue;
      }
      
      await importAttachment(sql, resourceUuid, attachment);
      importedAttachments++;
    }
    
    console.log(`✅ Imported ${importedAttachments} attachments`);
    
    // Refresh materialized views (non-concurrent because views may not have unique indexes yet)
    console.log('\n🔄 Refreshing materialized views...');
    try {
      await sql`REFRESH MATERIALIZED VIEW mv_latest_vitals`;
      await sql`REFRESH MATERIALIZED VIEW mv_active_conditions`;
      console.log('✅ Materialized views refreshed');
    } catch (err) {
      console.warn('⚠️  Could not refresh materialized views:', (err as Error).message);
    }
    
    console.log('\n✨ Import complete!\n');
    
  } finally {
    await sql.end();
  }
}

/**
 * Load EHR data from either JSON or SQLite file
 */
async function loadEhrData(sourcePath: string): Promise<ClientFullEHR> {
  const ext = sourcePath.toLowerCase().split('.').pop();
  
  if (ext === 'json') {
    console.log('📖 Loading from JSON file...');
    return await loadFromJson(sourcePath);
  } else if (ext === 'sqlite') {
    console.log('📖 Loading from SQLite file...');
    const db = new Database(sourcePath, { readonly: true });
    const fullEhr = loadFromSqlite(db);
    db.close();
    return fullEhr;
  } else {
    throw new Error(`Unsupported file type: ${ext}. Use .json or .sqlite`);
  }
}

/**
 * Load EHR data from JSON file (recommended format)
 */
async function loadFromJson(path: string): Promise<ClientFullEHR> {
  const content = await readFile(path, 'utf-8');
  const data = JSON.parse(content) as ClientFullEHR;
  
  // Validate structure
  if (!data.fhir || typeof data.fhir !== 'object') {
    throw new Error('Invalid JSON: missing or invalid "fhir" field');
  }
  if (!Array.isArray(data.attachments)) {
    throw new Error('Invalid JSON: missing or invalid "attachments" field');
  }
  
  return data;
}

/**
 * Load EHR data from SQLite file (legacy format)
 */
function loadFromSqlite(db: Database): ClientFullEHR {
  const fullEhr: ClientFullEHR = {
    fhir: {},
    attachments: []
  };
  
  // Load FHIR resources
  const resourceRows = db.query("SELECT resource_type, json FROM fhir_resources").all() as any[];
  
  for (const row of resourceRows) {
    const resourceType = row.resource_type;
    const resource = JSON.parse(row.json);
    
    if (!fullEhr.fhir[resourceType]) {
      fullEhr.fhir[resourceType] = [];
    }
    fullEhr.fhir[resourceType].push(resource);
  }
  
  // Load attachments
  const attachmentRows = db.query(`
    SELECT resource_type, resource_id, path, content_type, 
           json, content_raw, content_plaintext
    FROM fhir_attachments
  `).all() as any[];
  
  for (const row of attachmentRows) {
    fullEhr.attachments.push({
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      path: row.path,
      contentType: row.content_type,
      json: row.json,
      contentBase64: row.content_raw ? Buffer.from(row.content_raw).toString('base64') : null,
      contentPlaintext: row.content_plaintext
    });
  }
  
  return fullEhr;
}

function extractPatientFhirId(fullEhr: ClientFullEHR): string {
  const patients = fullEhr.fhir['Patient'] || [];
  if (patients.length === 0) {
    throw new Error('No Patient resource found in EHR data');
  }
  return patients[0].id;
}

async function getOrCreatePatient(sql: any, data: { firstName: string; lastName: string }) {
  // First, try to find existing patient
  const [existing] = await sql`
    SELECT id FROM patients 
    WHERE first_name = ${data.firstName} AND last_name = ${data.lastName}
    LIMIT 1
  `;
  
  if (existing) {
    console.log(`  Found existing patient: ${data.firstName} ${data.lastName}`);
    return existing;
  }
  
  // Create new patient if not found
  const [patient] = await sql`
    INSERT INTO patients (first_name, last_name, family_role)
    VALUES (${data.firstName}, ${data.lastName}, 'unknown')
    RETURNING id
  `;
  
  console.log(`  Created new patient: ${data.firstName} ${data.lastName}`);
  return patient;
}

async function getOrCreateProvider(sql: any, name: string) {
  const identifier = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  
  const [provider] = await sql`
    INSERT INTO medical_providers (name, identifier)
    VALUES (${name}, ${identifier})
    ON CONFLICT (identifier) DO UPDATE SET name = ${name}
    RETURNING id
  `;
  
  if (provider) return provider;
  
  const [existing] = await sql`
    SELECT id FROM medical_providers WHERE identifier = ${identifier}
  `;
  
  return existing;
}

async function createPatientProviderLink(
  sql: any,
  patientId: string,
  providerId: string,
  patientFhirId: string
) {
  await sql`
    INSERT INTO patient_provider_links (patient_id, provider_id, patient_fhir_id, last_sync_at)
    VALUES (${patientId}, ${providerId}, ${patientFhirId}, NOW())
    ON CONFLICT (patient_id, provider_id) 
    DO UPDATE SET 
      patient_fhir_id = ${patientFhirId},
      last_sync_at = NOW()
  `;
}

function extractPrimaryCode(resource: any): ExtractedCode {
  const coding = resource?.code?.coding?.[0];
  return {
    system: coding?.system || null,
    code: coding?.code || null,
    display: coding?.display || resource?.code?.text || null
  };
}

function extractEffectiveDate(resource: any): string | null {
  // Try various date fields
  const dateStr = 
    resource.effectiveDateTime ||
    resource.effectivePeriod?.start ||
    resource.onsetDateTime ||
    resource.issued ||
    resource.date ||
    null;
  
  if (!dateStr) return null;
  
  // Extract just the date part (YYYY-MM-DD)
  return dateStr.split('T')[0];
}

function extractCategory(resource: any): string | null {
  if (!resource.category) return null;
  
  if (Array.isArray(resource.category)) {
    const firstCoding = resource.category[0]?.coding?.[0];
    return firstCoding?.code || firstCoding?.display || null;
  }
  
  return resource.category?.coding?.[0]?.code || null;
}

async function importFhirResource(
  sql: any,
  patientId: string,
  providerId: string,
  resourceType: string,
  resource: any
): Promise<string | null> {
  const code = extractPrimaryCode(resource);
  const effectiveDate = extractEffectiveDate(resource);
  const category = extractCategory(resource);
  
  try {
    const [result] = await sql`
      INSERT INTO fhir_resources (
        provider_id,
        patient_id,
        resource_type,
        resource_id,
        resource_json,
        status,
        category,
        code_system,
        code_value,
        code_display,
        effective_date,
        issued_at
      ) VALUES (
        ${providerId},
        ${patientId},
        ${resourceType},
        ${resource.id || 'unknown'},
        ${sql.json(resource)},
        ${resource.status || null},
        ${category},
        ${code.system},
        ${code.code},
        ${code.display},
        ${effectiveDate},
        ${resource.issued || null}
      )
      ON CONFLICT (provider_id, resource_type, resource_id) 
      DO UPDATE SET
        resource_json = ${sql.json(resource)},
        status = ${resource.status || null},
        category = ${category},
        code_system = ${code.system},
        code_value = ${code.code},
        code_display = ${code.display},
        effective_date = ${effectiveDate},
        issued_at = ${resource.issued || null},
        updated_at = NOW()
      RETURNING id
    `;
    
    return result.id;
  } catch (err) {
    console.error(`Error importing ${resourceType}/${resource.id}:`, err);
    return null;
  }
}

async function importAttachment(sql: any, resourceUuid: string, attachment: any) {
  try {
    // Remove null bytes from plaintext (PostgreSQL doesn't allow them in text fields)
    const cleanPlaintext = attachment.contentPlaintext 
      ? attachment.contentPlaintext.replace(/\0/g, '') 
      : null;
    
    await sql`
      INSERT INTO fhir_attachments (
        resource_uuid,
        path,
        content_type,
        content_base64,
        content_plaintext,
        attachment_json,
        file_size_bytes
      ) VALUES (
        ${resourceUuid},
        ${attachment.path},
        ${attachment.contentType},
        ${attachment.contentBase64},
        ${cleanPlaintext},
        ${attachment.json},
        ${attachment.contentBase64 ? Buffer.from(attachment.contentBase64, 'base64').length : null}
      )
      ON CONFLICT (resource_uuid, path) 
      DO UPDATE SET
        content_base64 = ${attachment.contentBase64},
        content_plaintext = ${cleanPlaintext},
        attachment_json = ${attachment.json}
    `;
  } catch (err) {
    console.error(`Error importing attachment for resource ${resourceUuid}:`, err);
  }
}

// Parse command line arguments
function parseArgs(): ImportConfig {
  const args = process.argv.slice(2);
  
  // Get defaults from environment variables
  const config: any = {
    pgConnectionString: process.env.DATABASE_URL || 
                       `postgres://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD || ''}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || 'family_ehr'}`,
    sourcePath: process.env.DEFAULT_SOURCE_DB || './data/my_record.sqlite',
    patientFirstName: process.env.DEFAULT_PATIENT_FIRST_NAME || '',
    patientLastName: process.env.DEFAULT_PATIENT_LAST_NAME || '',
    providerName: process.env.DEFAULT_PROVIDER_NAME || ''
  };
  
  // Override with command-line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--patient':
        const fullName = args[++i].split(' ');
        config.patientFirstName = fullName[0];
        config.patientLastName = fullName.slice(1).join(' ');
        break;
      case '--provider':
        config.providerName = args[++i];
        break;
      case '--source':
        config.sourcePath = args[++i];
        break;
      case '--pg':
      case '--database-url':
        config.pgConnectionString = args[++i];
        break;
    }
  }
  
  // Validate required fields
  if (!config.patientFirstName || !config.patientLastName) {
    throw new Error('--patient "First Last" is required (or set DEFAULT_PATIENT_FIRST_NAME and DEFAULT_PATIENT_LAST_NAME in .env)');
  }
  if (!config.providerName) {
    throw new Error('--provider "Provider Name" is required (or set DEFAULT_PROVIDER_NAME in .env)');
  }
  if (!config.sourcePath) {
    throw new Error('--source /path/to/data.sqlite is required (or set DEFAULT_SOURCE_DB in .env)');
  }
  
  return config as ImportConfig;
}

// Main execution
try {
  const config = parseArgs();
  await importEhrData(config);
} catch (err) {
  const error = err as Error;
  console.error('\n❌ Error:', error.message);
  if (error.stack) {
    console.error('\nStack trace:');
    console.error(error.stack);
  }
  console.error('\nUsage:');
  console.error('  bun run database/postgresql/import.ts \\');
  console.error('    [--patient "Emmanuel Bioux"] \\');
  console.error('    [--provider "Epic - Scripps Health"] \\');
  console.error('    [--source ./data/my_record.json] \\');
  console.error('    [--pg postgres://user:pass@host:5432/dbname]');
  console.error('\nSource file formats:');
  console.error('  - .json: ClientFullEHR JSON format (recommended)');
  console.error('  - .sqlite: Legacy SQLite format');
  console.error('\nAll arguments are optional if set in .env file.');
  console.error('Copy .env.example to .env and configure:');
  console.error('  DATABASE_URL - PostgreSQL connection string');
  console.error('  DEFAULT_SOURCE_DB - Default source file path');
  console.error('  DEFAULT_PATIENT_FIRST_NAME - Default patient first name');
  console.error('  DEFAULT_PATIENT_LAST_NAME - Default patient last name');
  console.error('  DEFAULT_PROVIDER_NAME - Default provider name');
  process.exit(1);
}

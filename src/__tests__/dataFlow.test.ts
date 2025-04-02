import { Database } from 'bun:sqlite';
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';

// Import utility functions
import { 
  fetchAllEhrData,
  ehrToSqlite,
  sqliteToEhr,
  FullEHR
} from '../index';

/**
 * Demonstrates the complete data flow:
 * 1. Fetch all EHR data (FHIR + attachments)
 * 2. Store in SQLite database
 * 3. Retrieve from SQLite database
 * 
 * @param ehrAccessToken - The access token for the EHR FHIR server
 * @param fhirBaseUrl - The base URL of the EHR FHIR server
 * @param patientId - The ID of the patient whose data is being fetched
 * @param options - Optional parameters (db path, log verbosity, etc.)
 * @returns The reconstructed FullEHR data from the database
 */
async function demonstrateDataFlow(
  ehrAccessToken: string, 
  fhirBaseUrl: string, 
  patientId: string,
  options: { 
      dbPath?: string,
      logVerbosity?: 'minimal' | 'normal' | 'verbose'
  } = {}
): Promise<FullEHR> {
  const dbPath = options.dbPath || `:memory:`;
  const verbose = options.logVerbosity === 'verbose';
  
  console.log(`[DEMO] Starting complete data flow demonstration for patient: ${patientId}`);
  console.log(`[DEMO] Using database: ${dbPath === ':memory:' ? 'In-memory SQLite' : dbPath}`);
  
  // Step 1: Fetch data using the utility from fhirUtils
  console.log(`[DEMO] Step 1: Fetching all EHR data...`);
  const fullEhr = await fetchAllEhrData(fhirBaseUrl, patientId, ehrAccessToken, {
      logProgress: verbose,
      maxReferenceResolutionIterations: 3
  });
  
  const resourceCount = Object.values(fullEhr.fhir).reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0);
  console.log(`[DEMO] Fetched ${resourceCount} resources and ${fullEhr.attachments.length} attachments`);
  
  // Step 2: Create and populate SQLite database
  console.log(`[DEMO] Step 2: Storing data in SQLite...`);
  const db = new Database(dbPath);
  await ehrToSqlite(fullEhr, db);
  
  // Step 3: Retrieve from database
  console.log(`[DEMO] Step 3: Retrieving data from SQLite...`);
  const reconstructedEhr = await sqliteToEhr(db);
  
  // Compare statistics to verify data integrity
  const reconstructedResourceCount = Object.values(reconstructedEhr.fhir).reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0);
  console.log(`[DEMO] Reconstructed ${reconstructedResourceCount} resources and ${reconstructedEhr.attachments.length} attachments`);
  
  // Data validation check
  if (resourceCount !== reconstructedResourceCount || 
      fullEhr.attachments.length !== reconstructedEhr.attachments.length) {
      console.warn(`[DEMO] Warning: Resource counts don't match between original and reconstructed data!`);
      console.warn(`[DEMO] Original: ${resourceCount} resources, ${fullEhr.attachments.length} attachments`);
      console.warn(`[DEMO] Reconstructed: ${reconstructedResourceCount} resources, ${reconstructedEhr.attachments.length} attachments`);
  } else {
      console.log(`[DEMO] Validation: All resource counts match between original and reconstructed data`);
  }
  
  // Clean up database if not in memory
  if (dbPath !== ':memory:') {
      console.log(`[DEMO] Note: Database file persists at ${dbPath}`);
  } else {
      db.close();
      console.log(`[DEMO] Closed in-memory database`);
  }
  
  console.log(`[DEMO] Data flow demonstration completed successfully`);
  return reconstructedEhr;
}

describe('FHIR Data Flow', () => {
  // This is a test but we'll skip it by default since it requires actual credentials
  it.skip('should demonstrate the complete data flow process', async () => {
    // These would be provided via environment variables or test config
    const ehrAccessToken = process.env.TEST_EHR_ACCESS_TOKEN || '';
    const fhirBaseUrl = process.env.TEST_FHIR_BASE_URL || '';
    const patientId = process.env.TEST_PATIENT_ID || '';
    
    if (!ehrAccessToken || !fhirBaseUrl || !patientId) {
      console.warn('Skipping test: Missing required test credentials');
      return;
    }
    
    const result = await demonstrateDataFlow(
      ehrAccessToken,
      fhirBaseUrl,
      patientId,
      { 
        dbPath: ':memory:',
        logVerbosity: 'verbose'
      }
    );
    
    // Add assertions to validate the result
    expect(result).toBeDefined();
    expect(result.fhir).toBeDefined();
    expect(result.attachments).toBeDefined();
    
    // More detailed assertions would depend on what data you expect
  });
  
  // A simpler test that doesn't require external credentials
  it('should convert between FullEHR and SQLite', async () => {
    // Create a minimal test FullEHR object
    const testEhr: FullEHR = {
      fhir: {
        Patient: [
          {
            resourceType: 'Patient',
            id: 'test-patient-1',
            name: [{ family: 'Test', given: ['Patient'] }]
          }
        ],
        Observation: [
          {
            resourceType: 'Observation',
            id: 'test-obs-1',
            status: 'final',
            code: { text: 'Test Observation' },
            subject: { reference: 'Patient/test-patient-1' }
          }
        ]
      },
      attachments: []
    };
    
    // Use in-memory database
    const db = new Database(':memory:');
    
    // Convert to SQLite
    await ehrToSqlite(testEhr, db);
    
    // Retrieve from SQLite
    const reconstructed = await sqliteToEhr(db);
    
    // Validate
    expect(reconstructed.fhir.Patient).toHaveLength(1);
    expect(reconstructed.fhir.Observation).toHaveLength(1);
    expect(reconstructed.fhir.Patient[0].id).toBe('test-patient-1');
    expect(reconstructed.fhir.Observation[0].id).toBe('test-obs-1');
    
    // Clean up
    db.close();
  });
}); 
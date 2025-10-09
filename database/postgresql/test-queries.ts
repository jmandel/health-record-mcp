#!/usr/bin/env bun
/**
 * Comprehensive test script for all PostgreSQL queries
 * Validates query structures before REST API implementation
 */

import postgres from 'postgres';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from root .env
config({ path: resolve(process.cwd(), '.env') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment');
  process.exit(1);
}

const sql = postgres(DATABASE_URL);

interface TestResult {
  name: string;
  success: boolean;
  rowCount: number;
  error?: string;
  duration: number;
  nullFields?: { field: string; nullCount: number; totalRows: number }[];
  sampleRow?: any;
}

const results: TestResult[] = [];

function analyzeNulls(rows: any[]): { field: string; nullCount: number; totalRows: number }[] {
  if (rows.length === 0) return [];
  
  const nullAnalysis: Map<string, number> = new Map();
  const firstRow = rows[0];
  const fields = Object.keys(firstRow);
  
  // Initialize counters
  fields.forEach(field => nullAnalysis.set(field, 0));
  
  // Count nulls for each field
  rows.forEach(row => {
    fields.forEach(field => {
      if (row[field] === null || row[field] === undefined) {
        nullAnalysis.set(field, (nullAnalysis.get(field) || 0) + 1);
      }
    });
  });
  
  // Return only fields that have null values
  return Array.from(nullAnalysis.entries())
    .filter(([_, nullCount]) => nullCount > 0)
    .map(([field, nullCount]) => ({
      field,
      nullCount,
      totalRows: rows.length
    }))
    .sort((a, b) => b.nullCount - a.nullCount);
}

async function runTest(name: string, queryFn: () => Promise<any[]>): Promise<void> {
  const start = Date.now();
  try {
    const rows = await queryFn();
    const duration = Date.now() - start;
    const nullFields = analyzeNulls(rows);
    
    results.push({
      name,
      success: true,
      rowCount: rows.length,
      duration,
      nullFields: nullFields.length > 0 ? nullFields : undefined,
      sampleRow: rows.length > 0 ? rows[0] : undefined
    });
    
    const nullWarning = nullFields.length > 0 ? ` ⚠️  ${nullFields.length} fields with NULLs` : '';
    console.log(`✅ ${name}: ${rows.length} rows (${duration}ms)${nullWarning}`);
    
    if (nullFields.length > 0) {
      nullFields.forEach(({ field, nullCount, totalRows }) => {
        const percentage = ((nullCount / totalRows) * 100).toFixed(1);
        console.log(`   ⚠️  ${field}: ${nullCount}/${totalRows} rows (${percentage}%) are NULL`);
      });
    }
  } catch (error) {
    const duration = Date.now() - start;
    results.push({
      name,
      success: false,
      rowCount: 0,
      error: error instanceof Error ? error.message : String(error),
      duration
    });
    console.error(`❌ ${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function main() {
  console.log('🧪 Testing all PostgreSQL query patterns\n');

  // 1. View all family members
  await runTest('1. View all family members', async () => {
    return await sql`
      SELECT 
        id,
        first_name || ' ' || last_name as full_name,
        family_role,
        date_of_birth,
        CASE 
          WHEN date_of_birth IS NOT NULL THEN EXTRACT(YEAR FROM AGE(date_of_birth))
          ELSE NULL
        END as age
      FROM patients
      ORDER BY family_role, date_of_birth NULLS LAST
    `;
  });

  // 2. View all medical providers
  await runTest('2. View all medical providers', async () => {
    return await sql`
      SELECT 
        name,
        identifier,
        fhir_endpoint,
        (SELECT COUNT(*) FROM patient_provider_links WHERE provider_id = mp.id) as patient_count,
        (SELECT COUNT(*) FROM fhir_resources WHERE provider_id = mp.id) as resource_count
      FROM medical_providers mp
      ORDER BY name
    `;
  });

  // 3. Patient-provider relationships
  await runTest('3. Patient-provider relationships', async () => {
    return await sql`
      SELECT 
        p.first_name || ' ' || p.last_name as patient,
        mp.name as provider,
        ppl.patient_fhir_id,
        ppl.last_sync_at,
        ppl.first_visit_date
      FROM patient_provider_links ppl
      JOIN patients p ON ppl.patient_id = p.id
      JOIN medical_providers mp ON ppl.provider_id = mp.id
      ORDER BY p.last_name, mp.name
    `;
  });

  // 4. Count resources by type across all patients
  await runTest('4. Count resources by type', async () => {
    return await sql`
      SELECT 
        resource_type,
        COUNT(*) as total_count,
        COUNT(DISTINCT patient_id) as patient_count,
        COUNT(DISTINCT provider_id) as provider_count
      FROM fhir_resources
      GROUP BY resource_type
      ORDER BY total_count DESC
    `;
  });

  // 5. Resources per patient
  await runTest('5. Resources per patient', async () => {
    return await sql`
      SELECT 
        p.first_name || ' ' || p.last_name as patient,
        COUNT(*) as total_resources,
        COUNT(DISTINCT fr.resource_type) as resource_types,
        MIN(fr.effective_date) as earliest_record,
        MAX(fr.effective_date) as latest_record
      FROM fhir_resources fr
      JOIN patients p ON fr.patient_id = p.id
      GROUP BY p.id, p.first_name, p.last_name
      ORDER BY total_resources DESC
    `;
  });

  // 6. All vital signs for a specific patient
  await runTest('6. Vital signs for specific patient', async () => {
    return await sql`
      SELECT 
        mp.name as provider,
        code_display as vital_sign,
        COALESCE(
          -- Simple value (e.g., heart rate, temperature)
          (resource_json->'valueQuantity'->>'value') || ' ' || (resource_json->'valueQuantity'->>'unit'),
          -- Component-based values (e.g., blood pressure)
          (SELECT string_agg(
            (comp->'code'->'coding'->0->>'display') || ': ' || 
            (comp->'valueQuantity'->>'value') || ' ' || 
            (comp->'valueQuantity'->>'unit'), 
            ', ' ORDER BY comp->'code'->'coding'->0->>'display'
          )
          FROM jsonb_array_elements(resource_json->'component') AS comp),
          'No value'
        ) as value,
        effective_date,
        status
      FROM fhir_resources fr
      JOIN medical_providers mp ON fr.provider_id = mp.id
      JOIN patients p ON fr.patient_id = p.id
      WHERE p.first_name = 'Emmanuel'
        AND fr.resource_type = 'Observation'
        AND fr.category = 'vital-signs'
        AND fr.status = 'final'
      ORDER BY effective_date DESC
    `;
  });

  // 7. Latest lab results for each test across family
  await runTest('7. Latest lab results per test', async () => {
    return await sql`
      SELECT DISTINCT ON (fr.patient_id, fr.code_value)
        p.first_name || ' ' || p.last_name as patient,
        mp.name as provider,
        fr.code_display as test_name,
        COALESCE(
          (fr.resource_json::jsonb->'valueQuantity'->>'value') || ' ' || 
          (fr.resource_json::jsonb->'valueQuantity'->>'unit'),
          'See components'
        ) as result,
        fr.effective_date
      FROM fhir_resources fr
      JOIN patients p ON fr.patient_id = p.id
      JOIN medical_providers mp ON fr.provider_id = mp.id
      WHERE fr.resource_type = 'Observation'
        AND fr.category = 'laboratory'
        AND fr.status = 'final'
      ORDER BY fr.patient_id, fr.code_value, fr.effective_date DESC
    `;
  });

  // 8. Track specific lab value over time (cholesterol example)
  await runTest('8. Track cholesterol over time', async () => {
    return await sql`
      SELECT 
        effective_date,
        mp.name as provider,
        (resource_json->'valueQuantity'->>'value')::numeric as cholesterol_value,
        resource_json->'valueQuantity'->>'unit' as unit,
        CASE 
          WHEN (resource_json->'valueQuantity'->>'value')::numeric > 200 THEN 'High'
          WHEN (resource_json->'valueQuantity'->>'value')::numeric > 130 THEN 'Borderline'
          ELSE 'Normal'
        END as assessment
      FROM fhir_resources fr
      JOIN medical_providers mp ON fr.provider_id = mp.id
      JOIN patients p ON fr.patient_id = p.id
      WHERE p.first_name = 'Emmanuel'
        AND resource_type = 'Observation'
        AND code_value = '2093-3'
      ORDER BY effective_date
    `;
  });

  // 9. All active conditions across family
  await runTest('9. All active conditions', async () => {
    return await sql`
      SELECT 
        p.first_name || ' ' || p.last_name as patient,
        mp.name as diagnosed_by,
        code_display as condition,
        resource_json->>'onsetDateTime' as onset,
        effective_date,
        resource_json->'code'->'coding'->0->>'code' as code
      FROM fhir_resources fr
      JOIN patients p ON fr.patient_id = p.id
      JOIN medical_providers mp ON fr.provider_id = mp.id
      WHERE resource_type = 'Condition'
        AND status = 'active'
      ORDER BY p.last_name, effective_date DESC
    `;
  });

  // 10. Search for specific condition (diabetes)
  await runTest('10. Search for diabetes condition', async () => {
    return await sql`
      SELECT 
        p.first_name || ' ' || p.last_name as patient,
        p.date_of_birth,
        mp.name as provider,
        code_display as condition,
        resource_json->>'onsetDateTime' as onset_date,
        status
      FROM fhir_resources fr
      JOIN patients p ON fr.patient_id = p.id
      JOIN medical_providers mp ON fr.provider_id = mp.id
      WHERE resource_type = 'Condition'
        AND (
          searchable_text ILIKE '%diabetes%'
          OR code_display ILIKE '%diabetes%'
        )
      ORDER BY p.last_name, effective_date DESC
    `;
  });

  // 11. Conditions by category
  await runTest('11. Conditions by category', async () => {
    return await sql`
      SELECT 
        p.first_name || ' ' || p.last_name as patient,
        category,
        code_display,
        COALESCE(status, 'unknown') as status,
        COALESCE(effective_date::text, resource_json->>'recordedDate', resource_json->>'onsetDateTime')::timestamptz as effective_date
      FROM fhir_resources fr
      JOIN patients p ON fr.patient_id = p.id
      WHERE resource_type = 'Condition'
      ORDER BY p.last_name, category, effective_date DESC NULLS LAST
    `;
  });

  // 12. Current medications for all family members
  await runTest('12. Current medications', async () => {
    return await sql`
      SELECT 
        p.first_name || ' ' || p.last_name as patient,
        mp.name as prescribed_by,
        resource_json->'medicationCodeableConcept'->'coding'->0->>'display' as medication,
        resource_json->>'status' as status,
        resource_json->>'authoredOn' as prescribed_date
      FROM fhir_resources fr
      JOIN patients p ON fr.patient_id = p.id
      JOIN medical_providers mp ON fr.provider_id = mp.id
      WHERE resource_type = 'MedicationRequest'
        AND resource_json->>'status' IN ('active', 'completed')
      ORDER BY p.last_name, prescribed_date DESC
    `;
  });

  // 13. Full-text search all resources for keyword
  await runTest('13. Full-text search resources (asthma)', async () => {
    return await sql`
      SELECT 
        p.first_name || ' ' || p.last_name as patient,
        mp.name as provider,
        resource_type,
        code_display,
        effective_date,
        ts_rank(to_tsvector('english', searchable_text), 
                to_tsquery('english', 'asthma')) as relevance,
        SUBSTRING(searchable_text, 1, 200) as excerpt
      FROM fhir_resources fr
      JOIN patients p ON fr.patient_id = p.id
      JOIN medical_providers mp ON fr.provider_id = mp.id
      WHERE to_tsvector('english', searchable_text) @@ to_tsquery('english', 'asthma')
      ORDER BY relevance DESC, effective_date DESC
      LIMIT 20
    `;
  });

  // 14. Search attachments (documents)
  await runTest('14. Full-text search attachments', async () => {
    return await sql`
      SELECT 
        p.first_name || ' ' || p.last_name as patient,
        fr.resource_type,
        fa.content_type,
        fr.effective_date,
        ts_rank(to_tsvector('english', fa.content_plaintext), 
                to_tsquery('english', 'discharge & summary')) as relevance,
        SUBSTRING(fa.content_plaintext, 1, 300) as excerpt
      FROM fhir_attachments fa
      JOIN fhir_resources fr ON fa.resource_uuid = fr.id
      JOIN patients p ON fr.patient_id = p.id
      WHERE to_tsvector('english', fa.content_plaintext) @@ 
            to_tsquery('english', 'discharge & summary')
      ORDER BY relevance DESC
      LIMIT 10
    `;
  });

  // 15. Compare same observation across providers (cholesterol)
  await runTest('15. Compare cholesterol across providers', async () => {
    return await sql`
      WITH cholesterol_readings AS (
        SELECT 
          p.id as patient_id,
          p.first_name || ' ' || p.last_name as patient,
          mp.name as provider,
          effective_date,
          (resource_json->'valueQuantity'->>'value')::numeric as value,
          resource_json->'valueQuantity'->>'unit' as unit
        FROM fhir_resources fr
        JOIN patients p ON fr.patient_id = p.id
        JOIN medical_providers mp ON fr.provider_id = mp.id
        WHERE resource_type = 'Observation'
          AND code_value = '2093-3'
      )
      SELECT 
        patient,
        provider,
        effective_date,
        value,
        unit,
        LAG(value) OVER (PARTITION BY patient_id ORDER BY effective_date) as previous_value,
        LAG(provider) OVER (PARTITION BY patient_id ORDER BY effective_date) as previous_provider,
        value - LAG(value) OVER (PARTITION BY patient_id ORDER BY effective_date) as change
      FROM cholesterol_readings
      ORDER BY patient, effective_date DESC
    `;
  });

  // 16. Find duplicate diagnoses across providers
  await runTest('16. Duplicate diagnoses across providers', async () => {
    return await sql`
      SELECT 
        p.first_name || ' ' || p.last_name as patient,
        code_display as condition,
        ARRAY_AGG(DISTINCT mp.name) as providers,
        COUNT(DISTINCT provider_id) as provider_count,
        MIN(effective_date) as first_diagnosed,
        MAX(effective_date) as last_updated
      FROM fhir_resources fr
      JOIN patients p ON fr.patient_id = p.id
      JOIN medical_providers mp ON fr.provider_id = mp.id
      WHERE resource_type = 'Condition'
        AND status = 'active'
      GROUP BY p.id, p.first_name, p.last_name, code_display
      HAVING COUNT(DISTINCT provider_id) > 1
      ORDER BY provider_count DESC, p.last_name
    `;
  });

  // 17. Medical timeline for a patient (all events)
  await runTest('17. Medical timeline for patient', async () => {
    return await sql`
      SELECT 
        effective_date,
        resource_type,
        COALESCE(code_display, resource_type || ' (no description)') as description,
        mp.name as provider,
        status,
        CASE resource_type
          WHEN 'Condition' THEN '🩺 Diagnosis'
          WHEN 'Observation' THEN '📊 Lab/Vital'
          WHEN 'MedicationRequest' THEN '💊 Medication'
          WHEN 'Procedure' THEN '🏥 Procedure'
          WHEN 'Encounter' THEN '👨‍⚕️ Visit'
          ELSE '📄 ' || resource_type
        END as event_type
      FROM fhir_resources fr
      JOIN medical_providers mp ON fr.provider_id = mp.id
      JOIN patients p ON fr.patient_id = p.id
      WHERE p.first_name = 'Emmanuel'
        AND effective_date IS NOT NULL
      ORDER BY effective_date DESC
      LIMIT 50
    `;
  });

  // 18. Recent activity per patient (last 30 days)
  await runTest('18. Recent activity (30 days)', async () => {
    return await sql`
      SELECT 
        p.first_name || ' ' || p.last_name as patient,
        COUNT(*) as recent_events,
        COUNT(DISTINCT resource_type) as event_types,
        COUNT(DISTINCT provider_id) as providers_visited,
        MAX(effective_date) as last_event
      FROM fhir_resources fr
      JOIN patients p ON fr.patient_id = p.id
      WHERE effective_date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY p.id, p.first_name, p.last_name
      ORDER BY recent_events DESC
    `;
  });

  // 19. Resources missing key fields
  await runTest('19. Data quality - missing fields', async () => {
    return await sql`
      SELECT 
        resource_type,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE effective_date IS NULL) as missing_date,
        COUNT(*) FILTER (WHERE code_display IS NULL) as missing_code,
        COUNT(*) FILTER (WHERE status IS NULL) as missing_status
      FROM fhir_resources
      GROUP BY resource_type
      ORDER BY total DESC
    `;
  });

  // 20. Patients with gaps in data
  await runTest('20. Data quality - patient gaps', async () => {
    return await sql`
      SELECT 
        p.first_name || ' ' || p.last_name as patient,
        MIN(fr.effective_date) as first_record,
        MAX(fr.effective_date) as last_record,
        MAX(fr.effective_date) - MIN(fr.effective_date) as timespan_days,
        COUNT(*) as total_records,
        COUNT(*) / NULLIF((MAX(fr.effective_date) - MIN(fr.effective_date)), 0) as records_per_day
      FROM fhir_resources fr
      JOIN patients p ON fr.patient_id = p.id
      WHERE fr.effective_date IS NOT NULL
      GROUP BY p.id, p.first_name, p.last_name
      ORDER BY last_record DESC
    `;
  });

  // 21. Use pre-computed latest vitals
  await runTest('21. Materialized view - latest vitals', async () => {
    return await sql`
      SELECT 
        p.first_name || ' ' || p.last_name as patient,
        code_display as vital_sign,
        value_quantity,
        effective_date
      FROM mv_latest_vitals mv
      JOIN patients p ON mv.patient_id = p.id
      ORDER BY p.last_name, code_display
    `;
  });

  // 22. Use pre-computed active conditions
  await runTest('22. Materialized view - active conditions', async () => {
    return await sql`
      SELECT 
        p.first_name || ' ' || p.last_name as patient,
        code_display as condition,
        onset_datetime,
        effective_date
      FROM mv_active_conditions mv
      JOIN patients p ON mv.patient_id = p.id
      ORDER BY p.last_name, effective_date DESC
    `;
  });

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const totalRows = results.reduce((sum, r) => sum + r.rowCount, 0);
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  const testsWithNulls = results.filter(r => r.nullFields && r.nullFields.length > 0).length;

  console.log(`Total tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Tests with NULL values: ${testsWithNulls}`);
  console.log(`📊 Total rows returned: ${totalRows}`);
  console.log(`⏱️  Total duration: ${totalDuration}ms`);
  console.log('');

  if (failed > 0) {
    console.log('❌ FAILED TESTS:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  • ${r.name}`);
      console.log(`    ${r.error}`);
    });
    console.log('');
  }

  if (testsWithNulls > 0) {
    console.log('⚠️  TESTS WITH NULL VALUES:');
    results.filter(r => r.nullFields && r.nullFields.length > 0).forEach(r => {
      console.log(`  • ${r.name}`);
      r.nullFields!.forEach(({ field, nullCount, totalRows }) => {
        const percentage = ((nullCount / totalRows) * 100).toFixed(1);
        console.log(`    - ${field}: ${nullCount}/${totalRows} rows (${percentage}%) NULL`);
      });
    });
    console.log('');
  }

  // Detailed results table
  console.log('DETAILED RESULTS:');
  console.log('-'.repeat(60));
  results.forEach((r, i) => {
    const status = r.success ? '✅' : '❌';
    const nullWarning = r.nullFields && r.nullFields.length > 0 ? ' ⚠️ ' : '';
    console.log(`${status}${nullWarning} ${(i + 1).toString().padStart(2)}. ${r.name}`);
    console.log(`   Rows: ${r.rowCount}, Duration: ${r.duration}ms`);
    if (r.error) {
      console.log(`   Error: ${r.error}`);
    }
    if (r.nullFields && r.nullFields.length > 0) {
      console.log(`   NULL fields: ${r.nullFields.map(f => f.field).join(', ')}`);
    }
    if (r.sampleRow && r.rowCount > 0) {
      console.log(`   Sample: ${JSON.stringify(r.sampleRow).substring(0, 100)}...`);
    }
  });

  await sql.end();

  // Exit with error code if any tests failed
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});

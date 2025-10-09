#!/usr/bin/env bun
/**
 * Migration: Fix materialized view to handle component-based vitals
 */

import postgres from 'postgres';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment');
  process.exit(1);
}

const sql = postgres(DATABASE_URL);

async function main() {
  console.log('🔄 Dropping old materialized view...');
  await sql`DROP MATERIALIZED VIEW IF EXISTS mv_latest_vitals`;
  
  console.log('✨ Creating new materialized view with component-based value support...');
  await sql`
    CREATE MATERIALIZED VIEW mv_latest_vitals AS
    SELECT DISTINCT ON (patient_id, code_value)
        patient_id,
        code_value,
        code_display,
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
        ) as value_quantity,
        effective_date,
        provider_id
    FROM fhir_resources
    WHERE resource_type = 'Observation'
      AND category = 'vital-signs'
      AND status = 'final'
    ORDER BY patient_id, code_value, effective_date DESC
  `;
  
  console.log('✅ Materialized view recreated successfully!');
  
  // Verify the fix
  console.log('\n🧪 Testing view with blood pressure...');
  const results = await sql`
    SELECT 
      code_display,
      value_quantity,
      effective_date
    FROM mv_latest_vitals
    WHERE code_display = 'Blood Pressure'
    LIMIT 1
  `;
  
  if (results.length > 0) {
    console.log('✅ Blood pressure value:', results[0].value_quantity);
    console.log('   (Should show component values, not NULL)');
  } else {
    console.log('ℹ️  No blood pressure records found in vitals');
  }
  
  await sql.end();
}

main().catch((error) => {
  console.error('💥 Migration failed:', error);
  process.exit(1);
});

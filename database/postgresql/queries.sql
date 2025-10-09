-- Example PostgreSQL queries for family EHR database
-- These demonstrate common use cases for multi-provider, multi-patient scenarios

-- ============================================================================
-- BASIC QUERIES
-- ============================================================================

-- View all family members
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
ORDER BY family_role, date_of_birth NULLS LAST;

-- View all medical providers
SELECT 
  name,
  identifier,
  fhir_endpoint,
  (SELECT COUNT(*) FROM patient_provider_links WHERE provider_id = mp.id) as patient_count,
  (SELECT COUNT(*) FROM fhir_resources WHERE provider_id = mp.id) as resource_count
FROM medical_providers mp
ORDER BY name;

-- Patient-provider relationships
SELECT 
  p.first_name || ' ' || p.last_name as patient,
  mp.name as provider,
  ppl.patient_fhir_id,
  ppl.last_sync_at,
  ppl.first_visit_date
FROM patient_provider_links ppl
JOIN patients p ON ppl.patient_id = p.id
JOIN medical_providers mp ON ppl.provider_id = mp.id
ORDER BY p.last_name, mp.name;

-- ============================================================================
-- RESOURCE COUNTS BY TYPE
-- ============================================================================

-- Count resources by type across all patients
SELECT 
  resource_type,
  COUNT(*) as total_count,
  COUNT(DISTINCT patient_id) as patient_count,
  COUNT(DISTINCT provider_id) as provider_count
FROM fhir_resources
GROUP BY resource_type
ORDER BY total_count DESC;

-- Resources per patient
SELECT 
  p.first_name || ' ' || p.last_name as patient,
  COUNT(*) as total_resources,
  COUNT(DISTINCT fr.resource_type) as resource_types,
  MIN(fr.effective_date) as earliest_record,
  MAX(fr.effective_date) as latest_record
FROM fhir_resources fr
JOIN patients p ON fr.patient_id = p.id
GROUP BY p.id, p.first_name, p.last_name
ORDER BY total_resources DESC;

-- ============================================================================
-- OBSERVATIONS & LAB RESULTS
-- ============================================================================

-- All vital signs for a specific patient
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
ORDER BY effective_date DESC;

-- Latest lab results for each test across family
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
ORDER BY fr.patient_id, fr.code_value, fr.effective_date DESC;

-- Track specific lab value over time (e.g., cholesterol)
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
  AND code_value = '2093-3'  -- LOINC for cholesterol
ORDER BY effective_date;

-- ============================================================================
-- CONDITIONS & DIAGNOSES
-- ============================================================================

-- All active conditions across family
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
ORDER BY p.last_name, effective_date DESC;

-- Search for specific condition (e.g., diabetes)
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
ORDER BY p.last_name, effective_date DESC;

-- Conditions by category
SELECT 
  p.first_name || ' ' || p.last_name as patient,
  category,
  code_display,
  COALESCE(status, 'unknown') as status,
  COALESCE(effective_date::text, resource_json->>'recordedDate', resource_json->>'onsetDateTime')::timestamptz as effective_date
FROM fhir_resources fr
JOIN patients p ON fr.patient_id = p.id
WHERE resource_type = 'Condition'
ORDER BY p.last_name, category, effective_date DESC NULLS LAST;

-- ============================================================================
-- MEDICATIONS
-- ============================================================================

-- Current medications for all family members
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
ORDER BY p.last_name, prescribed_date DESC;

-- ============================================================================
-- FULL-TEXT SEARCH
-- ============================================================================

-- Search all resources for keyword
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
LIMIT 20;

-- Search attachments (documents)
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
LIMIT 10;

-- ============================================================================
-- CROSS-PROVIDER ANALYSIS
-- ============================================================================

-- Compare same observation across providers
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
    AND code_value = '2093-3'  -- Cholesterol LOINC code
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
ORDER BY patient, effective_date DESC;

-- Find duplicate diagnoses across providers
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
ORDER BY provider_count DESC, p.last_name;

-- ============================================================================
-- TIMELINE QUERIES
-- ============================================================================

-- Medical timeline for a patient (all events)
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
LIMIT 50;

-- Recent activity per patient (last 30 days)
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
ORDER BY recent_events DESC;

-- ============================================================================
-- DATA QUALITY CHECKS
-- ============================================================================

-- Resources missing key fields
SELECT 
  resource_type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE effective_date IS NULL) as missing_date,
  COUNT(*) FILTER (WHERE code_display IS NULL) as missing_code,
  COUNT(*) FILTER (WHERE status IS NULL) as missing_status
FROM fhir_resources
GROUP BY resource_type
ORDER BY total DESC;

-- Patients with gaps in data
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
ORDER BY last_record DESC;

-- ============================================================================
-- MATERIALIZED VIEW USAGE
-- ============================================================================

-- Use pre-computed latest vitals
SELECT 
  p.first_name || ' ' || p.last_name as patient,
  code_display as vital_sign,
  value_quantity,
  effective_date
FROM mv_latest_vitals mv
JOIN patients p ON mv.patient_id = p.id
ORDER BY p.last_name, code_display;

-- Use pre-computed active conditions
SELECT 
  p.first_name || ' ' || p.last_name as patient,
  code_display as condition,
  onset_datetime,
  effective_date
FROM mv_active_conditions mv
JOIN patients p ON mv.patient_id = p.id
ORDER BY p.last_name, effective_date DESC;

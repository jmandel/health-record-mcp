# Normalized PostgreSQL Schema

## Overview

This schema provides a **clean, simple, maintainable** approach to storing FHIR data with normalized columns that eliminate the need for complex JSON queries.

## Key Improvements

### ✅ **Before (Complex JSON Queries)**
```sql
-- Hard to read, error-prone, slow
SELECT 
    COALESCE(
        (resource_json->'valueQuantity'->>'value') || ' ' || 
        (resource_json->'valueQuantity'->>'unit'),
        resource_json->>'valueString',
        'No value'
    ) as value
FROM fhir_resources
```

### ✅ **After (Simple Column Access)**
```sql
-- Clear, fast, maintainable
SELECT 
    COALESCE(
        value_quantity_value::text || ' ' || value_quantity_unit,
        value_string,
        'No value'
    ) as value
FROM fhir_resources
```

## Normalized Columns

### Observation Values
- `value_quantity_value` (NUMERIC) - Numeric lab/vital values
- `value_quantity_unit` (TEXT) - Units (mg/dL, mmHg, etc.)
- `value_string` (TEXT) - Text results ("Negative", "Positive", "Few")
- `value_codeable_concept` (TEXT) - Coded values ("Normal", "Abnormal")
- `interpretation` (TEXT) - High/Low/Normal indicators
- `reference_range_low` (NUMERIC) - Lower bound of normal range
- `reference_range_high` (NUMERIC) - Upper bound of normal range
- `components` (JSONB) - Multi-value observations (blood pressure, etc.)

### Condition Fields
- `onset_datetime` (TIMESTAMPTZ) - When condition started
- `recorded_date` (TIMESTAMPTZ) - When condition was recorded

### Medication Fields
- `dosage_instruction` (TEXT) - How to take the medication

### Allergy Fields
- `criticality` (TEXT) - Severity (low, high, unable-to-assess)

## Automatic Extraction

A database trigger automatically extracts FHIR values to normalized columns on INSERT/UPDATE:

```sql
CREATE TRIGGER trigger_extract_fhir_values
    BEFORE INSERT OR UPDATE ON fhir_resources
    FOR EACH ROW
    EXECUTE FUNCTION extract_fhir_values();
```

**You don't need to do anything** - just insert FHIR JSON and the values are extracted automatically!

## Usage

### Reset Database (Fresh Start)
```bash
cd database/postgresql
./reset-database.sh
```

This will:
1. Drop all existing tables, functions, triggers
2. Recreate the schema with normalized columns
3. Set up automatic value extraction

### Import Data
After resetting, run your Python importer:
```bash
cd database/postgresql
bun run import.ts \
  --source ../../data/my_record.sqlite \
  --patient-first-name Emmanuel \
  --patient-last-name Bioux \
  --provider-name "Epic Scripps"
```

The importer will insert FHIR JSON, and the trigger will automatically populate normalized columns.

## Simple Query Examples

### Get Latest Lab Results
```sql
SELECT 
    p.first_name || ' ' || p.last_name as patient_name,
    fr.code_display,
    COALESCE(
        fr.value_quantity_value::text || ' ' || fr.value_quantity_unit,
        fr.value_string,
        fr.value_codeable_concept,
        'No value'
    ) as value,
    fr.interpretation,
    fr.effective_date
FROM fhir_resources fr
JOIN patients p ON fr.patient_id = p.id
WHERE fr.resource_type = 'Observation'
  AND fr.category = 'laboratory'
  AND fr.status = 'final'
ORDER BY fr.effective_date DESC
LIMIT 50;
```

### Track Glucose Levels Over Time
```sql
SELECT 
    effective_date,
    value_quantity_value,
    value_quantity_unit,
    interpretation,
    CASE 
        WHEN value_quantity_value < reference_range_low THEN 'Below Normal'
        WHEN value_quantity_value > reference_range_high THEN 'Above Normal'
        ELSE 'Normal'
    END as range_status
FROM fhir_resources
WHERE resource_type = 'Observation'
  AND code_value = '2345-7'  -- Glucose LOINC code
  AND patient_id = 'some-uuid'
ORDER BY effective_date;
```

### Get Active Medications
```sql
SELECT 
    p.first_name || ' ' || p.last_name as patient_name,
    fr.code_display as medication,
    fr.dosage_instruction,
    fr.status,
    fr.effective_date
FROM fhir_resources fr
JOIN patients p ON fr.patient_id = p.id
WHERE fr.resource_type = 'MedicationRequest'
  AND fr.status = 'active'
ORDER BY p.last_name, fr.effective_date DESC;
```

## Benefits

1. **Simple Queries** - No more complex JSON extraction in SQL
2. **Better Performance** - Indexed numeric/text columns vs JSON operators
3. **Type Safety** - Proper NUMERIC, TEXT, TIMESTAMPTZ types
4. **Easier Debugging** - Can query columns directly to see what data exists
5. **Automatic** - Trigger handles extraction, no application code changes needed
6. **Backward Compatible** - Full FHIR JSON still stored in `resource_json` column

## C# Query Simplification

The C# API queries are now much simpler:

```csharp
// Old (complex)
(fr.resource_json->'valueQuantity'->>'value') || ' ' || (fr.resource_json->'valueQuantity'->>'unit')

// New (simple)
fr.value_quantity_value::text || ' ' || fr.value_quantity_unit
```

This makes the codebase **much easier to maintain and debug**!

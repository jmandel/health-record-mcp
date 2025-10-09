# PostgreSQL Schema for Family EHR Data

This directory contains PostgreSQL schema and import tools for storing multi-provider, multi-patient FHIR data in a normalized relational database.

## Quick Start

```bash
# 1. Configure environment
cp .env.example .env
nano .env  # Set DATABASE_URL and defaults

# 2. Setup database
./migrations/setup-postgres.sh

# 3. Import data (uses .env defaults)
bun run database/postgresql/import.ts

# Or with command-line arguments
bun run database/postgresql/import.ts \
  --patient "Emmanuel Bioux" \
  --provider "Epic - Scripps Health" \
  --source ./data/my_record.sqlite
```

See **[ENV_CONFIG_GUIDE.md](../ENV_CONFIG_GUIDE.md)** for detailed configuration options.

## Overview

The schema is designed for a **family of ~5 members** with records from **~5 different medical providers**, supporting:

- ✅ Multiple patients (family members)
- ✅ Multiple medical providers (Epic, Kaiser, Stanford, etc.)
- ✅ Many-to-many patient-provider relationships
- ✅ Full FHIR resource storage with normalization
- ✅ Binary attachment storage (PDFs, images)
- ✅ Full-text search across all content
- ✅ Optimized indexes for common queries
- ✅ Materialized views for performance

## Schema Design

### Core Tables

1. **`medical_providers`** - Healthcare organizations
   - Stores provider metadata (name, FHIR endpoint, etc.)
   - Examples: "Epic - Scripps Health", "Kaiser Permanente"

2. **`patients`** - Family members
   - Stores patient demographics
   - Tracks family role (parent, child, spouse)

3. **`patient_provider_links`** - Many-to-many relationships
   - Links patients to their providers
   - Stores provider-specific FHIR Patient IDs
   - Tracks sync timestamps

4. **`fhir_resources`** - All FHIR resources
   - Stores Observations, Conditions, Medications, etc.
   - Full JSON storage + denormalized fields for performance
   - Indexed for fast queries by patient, provider, type, date, code

5. **`fhir_attachments`** - Binary content
   - PDFs, images, documents
   - Linked to parent FHIR resources
   - Stores both base64 content and extracted plaintext

### Key Features

#### 1. **Multi-Provider Support**
Each resource tracks which provider it came from, allowing you to:
- Compare lab results across different healthcare systems
- Track which provider diagnosed a condition
- Identify gaps in care across providers

#### 2. **Normalized + JSONB Hybrid**
- Common fields (codes, dates, status) denormalized for fast queries
- Full FHIR JSON stored for complete data access
- Best of both worlds: SQL queries + NoSQL flexibility

#### 3. **Advanced Indexing**
- GIN indexes on JSONB for nested queries
- Full-text search with PostgreSQL's `tsvector`
- Trigram indexes for fuzzy text matching
- Composite indexes for common query patterns

#### 4. **Materialized Views**
Pre-computed views for expensive queries:
- `mv_latest_vitals` - Most recent vital signs per patient
- `mv_active_conditions` - Current diagnoses

## Installation

### 1. Run Migration

```bash
# Apply schema
psql -d family_ehr -f migrations/001_create_pgsql_schema.sql
```

## Usage

### Importing Data

Import EHR data from SQLite files:

```bash
# Import data for one family member from one provider
bun run database/postgresql/import.ts \
  --patient "Emmanuel Bioux" \
  --provider "Epic - Scripps Health" \
  --source ./data/my_record.sqlite

# Import for another family member
bun run database/postgresql/import.ts \
  --patient "Sarah Bioux" \
  --provider "Kaiser Permanente" \
  --source ./data/sarah_kaiser.sqlite

# Import same patient from different provider
bun run database/postgresql/import.ts \
  --patient "Emmanuel Bioux" \
  --provider "Stanford Health Care" \
  --source ./data/emmanuel_stanford.sqlite
```

**Environment Variables:**
```bash
export DATABASE_URL="postgres://user:password@localhost:5432/family_ehr"
```

### Example Queries

#### Get all patients and their providers
```sql
SELECT 
  p.first_name,
  p.last_name,
  p.family_role,
  mp.name as provider_name,
  ppl.last_sync_at
FROM patients p
JOIN patient_provider_links ppl ON p.id = ppl.patient_id
JOIN medical_providers mp ON ppl.provider_id = mp.id
ORDER BY p.last_name, p.first_name;
```

#### Find all diabetes-related conditions across family
```sql
SELECT 
  p.first_name || ' ' || p.last_name as patient_name,
  mp.name as provider,
  fr.code_display,
  fr.effective_date,
  fr.status
FROM fhir_resources fr
JOIN patients p ON fr.patient_id = p.id
JOIN medical_providers mp ON fr.provider_id = mp.id
WHERE fr.resource_type = 'Condition'
  AND fr.searchable_text ILIKE '%diabetes%'
ORDER BY fr.effective_date DESC;
```

#### Get latest vitals for each family member
```sql
SELECT 
  p.first_name || ' ' || p.last_name as patient_name,
  mv.code_display as vital_sign,
  mv.value_quantity,
  mv.effective_date,
  mp.name as provider
FROM mv_latest_vitals mv
JOIN patients p ON mv.patient_id = p.id
JOIN medical_providers mp ON mv.provider_id = mp.id
ORDER BY p.last_name, mv.code_display;
```

#### Full-text search across all resources and attachments
```sql
-- Search FHIR resources
SELECT 
  p.first_name || ' ' || p.last_name as patient,
  fr.resource_type,
  fr.code_display,
  fr.effective_date,
  ts_rank(to_tsvector('english', fr.searchable_text), 
          to_tsquery('english', 'heart & attack')) as relevance
FROM fhir_resources fr
JOIN patients p ON fr.patient_id = p.id
WHERE to_tsvector('english', fr.searchable_text) @@ 
      to_tsquery('english', 'heart & attack')
ORDER BY relevance DESC
LIMIT 20;

-- Search attachment plaintext
SELECT 
  p.first_name || ' ' || p.last_name as patient,
  fr.resource_type,
  fa.content_type,
  fa.content_plaintext
FROM fhir_attachments fa
JOIN fhir_resources fr ON fa.resource_uuid = fr.id
JOIN patients p ON fr.patient_id = p.id
WHERE to_tsvector('english', fa.content_plaintext) @@ 
      to_tsquery('english', 'discharge & summary')
LIMIT 10;
```

#### Compare lab values across providers
```sql
SELECT 
  p.first_name || ' ' || p.last_name as patient,
  fr.code_display as test_name,
  mp.name as provider,
  fr.resource_json->>'valueQuantity' as result,
  fr.effective_date
FROM fhir_resources fr
JOIN patients p ON fr.patient_id = p.id
JOIN medical_providers mp ON fr.provider_id = mp.id
WHERE fr.resource_type = 'Observation'
  AND fr.code_value = '2093-3'  -- LOINC code for cholesterol
ORDER BY p.id, fr.effective_date DESC;
```

#### Get all documents (PDFs) for a patient
```sql
SELECT 
  p.first_name || ' ' || p.last_name as patient,
  fr.resource_type,
  fa.content_type,
  LENGTH(fa.content_base64) as file_size_chars,
  fa.file_size_bytes,
  SUBSTRING(fa.content_plaintext, 1, 200) as excerpt
FROM fhir_attachments fa
JOIN fhir_resources fr ON fa.resource_uuid = fr.id
JOIN patients p ON fr.patient_id = p.id
WHERE p.first_name = 'Emmanuel'
  AND fa.content_type = 'application/pdf'
ORDER BY fr.effective_date DESC;
```

## Performance Tuning

### Refresh Materialized Views

After importing new data:
```sql
SELECT refresh_all_materialized_views();
```

Or manually:
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_latest_vitals;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_active_conditions;
```

### Analyze Tables

After bulk imports:
```sql
ANALYZE medical_providers;
ANALYZE patients;
ANALYZE fhir_resources;
ANALYZE fhir_attachments;
```

### Monitor Index Usage

```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

## Schema Comparison

### SQLite (Current)
- ✅ Simple, file-based
- ✅ Fast for single patient
- ❌ No normalization
- ❌ Limited query capabilities
- ❌ No multi-provider support

### PostgreSQL (This Migration)
- ✅ Multi-patient, multi-provider
- ✅ Advanced queries (joins, full-text search)
- ✅ Normalization + JSONB hybrid
- ✅ Materialized views for performance
- ✅ ACID compliance
- ✅ Scalable to thousands of resources

## Security Considerations

### Row-Level Security (RLS)

For production, enable RLS to restrict access:

```sql
-- Enable RLS
ALTER TABLE fhir_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE fhir_attachments ENABLE ROW LEVEL SECURITY;

-- Create policy (example: users can only see their own data)
CREATE POLICY patient_access ON fhir_resources
  FOR SELECT
  USING (patient_id = current_setting('app.current_patient_id')::uuid);
```

### Encryption

For sensitive data:
```sql
-- Install pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt attachment content
UPDATE fhir_attachments 
SET content_base64 = pgp_sym_encrypt(content_base64, 'encryption_key');
```

## Backup & Restore

```bash
# Backup
pg_dump -Fc family_ehr > family_ehr_backup.dump

# Restore
pg_restore -d family_ehr_new family_ehr_backup.dump
```

## Next Steps

1. **Import your data**: Run import script for each family member × provider combination
2. **Create custom views**: Add materialized views for your specific use cases
3. **Set up authentication**: Implement RLS for multi-user access
4. **Build API**: Connect to REST API (already created in this project!)
5. **Dashboards**: Use PostgreSQL with Grafana, Metabase, or custom UI

## License

Same as parent project (see LICENSE.txt)

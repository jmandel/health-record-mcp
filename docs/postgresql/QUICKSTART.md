# PostgreSQL Schema for Multi-Provider Family EHR

## Quick Start

For a family of ~5 members with records from ~5 medical providers, here's the fastest way to get started:

### 1. Automated Setup

```bash
# Run the setup script (creates database, applies schema, sets up env)
./database/postgresql/setup.sh
```

### 2. Import Data for Each Family Member

```bash
# Parent 1 - Epic Scripps
bun run database/postgresql/import.ts \
  --patient "Emmanuel Bioux" \
  --provider "Epic - Scripps Health" \
  --source ./data/my_record.sqlite

# Parent 2 - Kaiser
bun run database/postgresql/import.ts \
  --patient "Sarah Bioux" \
  --provider "Kaiser Permanente" \
  --source ./data/sarah_kaiser.sqlite

# Child 1 - Stanford
bun run database/postgresql/import.ts \
  --patient "Alex Bioux" \
  --provider "Stanford Health Care" \
  --source ./data/alex_stanford.sqlite

# Child 2 - UCSF
bun run database/postgresql/import.ts \
  --patient "Maya Bioux" \
  --provider "UCSF Health" \
  --source ./data/maya_ucsf.sqlite

# Child 3 - Sutter
bun run database/postgresql/import.ts \
  --patient "Lucas Bioux" \
  --provider "Sutter Health" \
  --source ./data/lucas_sutter.sqlite
```

### 3. Query the Data

```bash
# Open PostgreSQL shell
psql -d family_ehr

# Or run example queries
psql -d family_ehr -f database/postgresql/queries.sql
```

## Schema Overview

### Tables

1. **`medical_providers`** - Healthcare organizations (Epic, Kaiser, etc.)
2. **`patients`** - Family members with demographics
3. **`patient_provider_links`** - Many-to-many: who gets care where
4. **`fhir_resources`** - All FHIR data (Observations, Conditions, Medications, etc.)
5. **`fhir_attachments`** - PDFs, images, documents

### Key Features

✅ **Multi-provider tracking** - Know which provider created each record  
✅ **Cross-provider queries** - Compare lab results across Epic vs Kaiser  
✅ **Full JSONB storage** - Complete FHIR resources preserved  
✅ **Denormalized fields** - Fast queries on common fields (codes, dates)  
✅ **Full-text search** - Search all resources and attachments  
✅ **Materialized views** - Pre-computed latest vitals, active conditions  
✅ **Advanced indexes** - GIN, trigram, composite for performance  

## Example Queries

### All Family Members and Their Providers

```sql
SELECT 
  p.first_name || ' ' || p.last_name as patient,
  mp.name as provider,
  ppl.last_sync_at
FROM patients p
JOIN patient_provider_links ppl ON p.id = ppl.patient_id
JOIN medical_providers mp ON ppl.provider_id = mp.id
ORDER BY p.last_name;
```

### Search for Diabetes Across Family

```sql
SELECT 
  p.first_name || ' ' || p.last_name as patient,
  mp.name as provider,
  fr.code_display as condition,
  fr.effective_date
FROM fhir_resources fr
JOIN patients p ON fr.patient_id = p.id
JOIN medical_providers mp ON fr.provider_id = mp.id
WHERE fr.resource_type = 'Condition'
  AND fr.searchable_text ILIKE '%diabetes%'
ORDER BY fr.effective_date DESC;
```

### Latest Vitals for Each Family Member

```sql
SELECT 
  p.first_name || ' ' || p.last_name as patient,
  mv.code_display as vital_sign,
  mv.value_quantity,
  mv.effective_date
FROM mv_latest_vitals mv
JOIN patients p ON mv.patient_id = p.id
ORDER BY p.last_name, mv.code_display;
```

### Compare Cholesterol Across Providers

```sql
SELECT 
  p.first_name || ' ' || p.last_name as patient,
  mp.name as provider,
  (resource_json->'valueQuantity'->>'value')::numeric as cholesterol,
  effective_date
FROM fhir_resources fr
JOIN patients p ON fr.patient_id = p.id
JOIN medical_providers mp ON fr.provider_id = mp.id
WHERE resource_type = 'Observation'
  AND code_value = '2093-3'  -- LOINC for cholesterol
ORDER BY patient, effective_date DESC;
```

### Full-Text Search Everything

```sql
SELECT 
  p.first_name || ' ' || p.last_name as patient,
  fr.resource_type,
  fr.code_display,
  fr.effective_date,
  ts_rank(to_tsvector('english', fr.searchable_text), 
          to_tsquery('english', 'asthma')) as relevance
FROM fhir_resources fr
JOIN patients p ON fr.patient_id = p.id
WHERE to_tsvector('english', fr.searchable_text) @@ 
      to_tsquery('english', 'asthma')
ORDER BY relevance DESC
LIMIT 20;
```

## Architecture Decisions

### Why PostgreSQL over SQLite?

| Feature | SQLite | PostgreSQL |
|---------|--------|------------|
| Multi-provider | ❌ Not normalized | ✅ Proper foreign keys |
| Concurrent access | ❌ File-level locks | ✅ Row-level locks |
| Full-text search | Basic | ✅ Advanced (tsvector, trigram) |
| JSONB queries | Limited | ✅ Full GIN indexing |
| Family queries | ❌ Requires app logic | ✅ SQL joins |
| Scalability | ~100k records | ✅ Millions of records |

### Design Principles

1. **Hybrid Storage**: Store full FHIR JSON + denormalized common fields
   - Why: Fast queries on common fields, full data preservation
   
2. **Provider Tracking**: Every resource knows its source provider
   - Why: Compare care quality, identify data gaps, track provenance
   
3. **Text Search**: Full-text indexes on all searchable content
   - Why: Find "heart attack" OR "myocardial infarction" seamlessly
   
4. **Materialized Views**: Pre-compute expensive aggregations
   - Why: Instant access to "latest vitals" without scanning millions of rows

## Performance Characteristics

### Expected Scale (Family of 5)

- **Patients**: 5 rows
- **Providers**: 5 rows  
- **FHIR Resources**: 10k - 100k rows (2k-20k per person)
- **Attachments**: 100 - 1000 rows
- **Database Size**: 500MB - 2GB

### Query Performance

| Query Type | Cold Cache | Warm Cache |
|------------|------------|------------|
| Single patient timeline | 50-200ms | 5-20ms |
| Full-text search | 100-500ms | 10-50ms |
| Latest vitals (materialized) | 1-5ms | <1ms |
| Cross-provider comparison | 200-800ms | 20-100ms |

### Optimization Tips

```sql
-- After bulk imports, refresh statistics
ANALYZE fhir_resources;
ANALYZE fhir_attachments;

-- Refresh materialized views
SELECT refresh_all_materialized_views();

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

## Data Import Strategy

### For Multiple Sources

If one patient has records from multiple providers:

```bash
# Import Emmanuel from Epic
bun run database/postgresql/import.ts \
  --patient "Emmanuel Bioux" \
  --provider "Epic - Scripps Health" \
  --source ./data/emmanuel_epic.sqlite

# Import same patient from Kaiser
bun run database/postgresql/import.ts \
  --patient "Emmanuel Bioux" \
  --provider "Kaiser Permanente" \
  --source ./data/emmanuel_kaiser.sqlite
```

The script will:
1. ✅ Find existing patient record (no duplicate)
2. ✅ Create new provider link
3. ✅ Import resources tagged with correct provider
4. ✅ Handle duplicate resources (same FHIR ID from same provider = update)

### Handling Updates

If you re-sync data from a provider:

```bash
# Re-import (will UPDATE existing resources)
bun run database/postgresql/import.ts \
  --patient "Emmanuel Bioux" \
  --provider "Epic - Scripps Health" \
  --source ./data/my_record.sqlite
```

The `ON CONFLICT` clause ensures:
- New resources are inserted
- Existing resources are updated
- No duplicates created

## File Structure

```
migrations/
├── 001_create_pgsql_schema.sql   # Complete schema definition
├── import-to-postgres.ts         # Data import script
├── example-queries.sql           # 30+ example SQL queries
├── setup-postgres.sh             # Automated setup script
├── QUICKSTART.md                 # This file
└── README.md                     # Comprehensive documentation
```

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
pg_isready

# Start PostgreSQL (macOS)
brew services start postgresql@16

# Start PostgreSQL (Linux)
sudo systemctl start postgresql
```

### Import Errors

```bash
# Check source SQLite file exists
ls -lh ./data/my_record.sqlite

# Verify file structure
sqlite3 ./data/my_record.sqlite "SELECT COUNT(*) FROM fhir_resources;"

# Check PostgreSQL connection
psql -d family_ehr -c "SELECT COUNT(*) FROM patients;"
```

### Query Performance Issues

```sql
-- Find slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check missing indexes
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public';
```

## Security & Privacy

### For Production Use

1. **Enable Row-Level Security (RLS)**:
```sql
ALTER TABLE fhir_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY patient_access ON fhir_resources
  FOR SELECT USING (patient_id = current_setting('app.current_patient_id')::uuid);
```

2. **Encrypt sensitive fields**:
```sql
CREATE EXTENSION pgcrypto;
UPDATE fhir_attachments 
SET content_base64 = pgp_sym_encrypt(content_base64, 'secret_key');
```

3. **Audit logging**:
```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  action TEXT,
  table_name TEXT,
  row_id UUID,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
```

## Next Steps

1. ✅ Run `./database/postgresql/setup.sh`
2. ✅ Import your family's data
3. ✅ Try example queries
4. 📊 Build dashboards (Grafana, Metabase, custom UI)
5. 🔒 Add authentication & RLS for multi-user access
6. 🌐 Connect to REST API (see `REST_API_GUIDE.md`)

## Resources

- Full documentation: `docs/postgresql/README.md`
- Example queries: `database/postgresql/queries.sql`
- Schema definition: `database/postgresql/schema.sql`
- Import script: `database/postgresql/import.ts`

---

Built for families managing healthcare data across multiple providers and patients. Designed for clarity, performance, and extensibility.

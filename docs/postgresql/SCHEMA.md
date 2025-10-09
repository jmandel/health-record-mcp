# PostgreSQL Schema Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FAMILY EHR DATABASE SCHEMA                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────┐
│   medical_providers      │
├──────────────────────────┤
│ id (PK)           UUID   │
│ name              TEXT   │
│ identifier        TEXT   │ UNIQUE
│ fhir_endpoint     TEXT   │
│ metadata          JSONB  │
│ created_at        TSTZ   │
│ updated_at        TSTZ   │
└──────────────────────────┘
            │
            │ 1
            │
            │ N
┌──────────────────────────┐
│  patient_provider_links  │◄──────────────┐
├──────────────────────────┤               │
│ id (PK)           UUID   │               │
│ patient_id (FK)   UUID   │────────┐      │
│ provider_id (FK)  UUID   │        │      │
│ patient_fhir_id   TEXT   │        │      │
│ active            BOOL   │        │      │
│ first_visit_date  DATE   │        │      │
│ last_sync_at      TSTZ   │        │      │
│ created_at        TSTZ   │        │      │
│ updated_at        TSTZ   │        │      │
└──────────────────────────┘        │      │
            │ N                     │      │
            │                       │      │
            │ 1                     │ N    │ N
┌──────────────────────────┐        │      │
│       patients           │◄───────┘      │
├──────────────────────────┤               │
│ id (PK)           UUID   │               │
│ family_role       TEXT   │               │
│ first_name        TEXT   │               │
│ last_name         TEXT   │               │
│ date_of_birth     DATE   │               │
│ metadata          JSONB  │               │
│ created_at        TSTZ   │               │
│ updated_at        TSTZ   │               │
└──────────────────────────┘               │
            │ 1                            │
            │                              │
            │                              │
            │ N                            │
┌──────────────────────────────────────────┼──────────────────────────────────┐
│              fhir_resources              │                                  │
├──────────────────────────────────────────┼──────────────────────────────────┤
│ id (PK)              UUID                │                                  │
│ provider_id (FK)     UUID   ─────────────┘                                  │
│ patient_id (FK)      UUID                                                   │
│ resource_type        TEXT   (Observation, Condition, MedicationRequest...)  │
│ resource_id          TEXT   (FHIR resource ID from provider)                │
│ resource_json        JSONB  ◄── Full FHIR resource                          │
│ status               TEXT   (denormalized for fast queries)                 │
│ category             TEXT   (denormalized)                                  │
│ code_system          TEXT   (e.g., 'http://loinc.org')                      │
│ code_value           TEXT   (e.g., '8867-4')                                │
│ code_display         TEXT   (e.g., 'Heart rate')                            │
│ effective_date       DATE   (denormalized)                                  │
│ issued_at            TSTZ   (denormalized)                                  │
│ searchable_text      TEXT   ◄── Auto-populated for full-text search         │
│ created_at           TSTZ                                                   │
│ updated_at           TSTZ                                                   │
└──────────────────────────────────────────────────────────────────────────────┘
            │ 1
            │
            │
            │ N
┌──────────────────────────────────────────┐
│         fhir_attachments                 │
├──────────────────────────────────────────┤
│ id (PK)                UUID              │
│ resource_uuid (FK)     UUID  ────────────┘
│ path                   TEXT   (e.g., 'content.attachment')
│ content_type           TEXT   (e.g., 'application/pdf')
│ content_base64         TEXT   ◄── Binary content as base64
│ content_plaintext      TEXT   ◄── Extracted text for search
│ attachment_json        JSONB  ◄── Original FHIR attachment
│ file_size_bytes        BIGINT
│ created_at             TSTZ
└──────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                           MATERIALIZED VIEWS                                │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│         mv_latest_vitals                 │  Pre-computed for performance
├──────────────────────────────────────────┤
│ patient_id            UUID               │  Latest vital sign per patient
│ code_value            TEXT               │  (e.g., most recent blood pressure)
│ code_display          TEXT               │
│ value_quantity        JSONB              │
│ effective_date        DATE               │
│ provider_id           UUID               │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│       mv_active_conditions               │  Pre-computed for performance
├──────────────────────────────────────────┤
│ patient_id            UUID               │  All active diagnoses
│ provider_id           UUID               │
│ resource_id           TEXT               │
│ code_display          TEXT               │
│ onset_datetime        TEXT               │
│ effective_date        DATE               │
└──────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                              KEY INDEXES                                    │
└─────────────────────────────────────────────────────────────────────────────┘

On fhir_resources:
  • B-tree: (patient_id), (provider_id), (resource_type), (effective_date DESC)
  • B-tree: (resource_type, patient_id), (code_system, code_value)
  • GIN:    (resource_json) ◄── For JSONB queries
  • GIN:    to_tsvector(searchable_text) ◄── Full-text search
  • GIN:    searchable_text gin_trgm_ops ◄── Fuzzy text matching

On fhir_attachments:
  • B-tree: (resource_uuid), (content_type)
  • GIN:    to_tsvector(content_plaintext) ◄── Full-text search on docs


┌─────────────────────────────────────────────────────────────────────────────┐
│                          EXAMPLE RELATIONSHIPS                              │
└─────────────────────────────────────────────────────────────────────────────┘

Provider: "Epic - Scripps Health"
    │
    ├─► Patient: "Emmanuel Bioux" (patient_fhir_id: "egnXwCKwlm...")
    │       │
    │       ├─► Observation: Heart Rate (72 bpm, 2025-10-01)
    │       ├─► Observation: Blood Pressure (120/80, 2025-10-01)
    │       ├─► Condition: Type 2 Diabetes (active, onset 2020-03)
    │       ├─► MedicationRequest: Metformin (active)
    │       └─► DocumentReference: Lab Results PDF
    │               └─► Attachment: "results.pdf" (content_plaintext searchable)
    │
    └─► Patient: "Sarah Bioux" (patient_fhir_id: "abc123...")
            └─► ... (more resources)

Provider: "Kaiser Permanente"
    │
    └─► Patient: "Emmanuel Bioux" (patient_fhir_id: "xyz789...")
            ├─► Observation: Cholesterol (195 mg/dL, 2025-09-15)
            └─► ... (different records from different provider)


┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATA FLOW: IMPORT                                  │
└─────────────────────────────────────────────────────────────────────────────┘

SQLite File:                   PostgreSQL:
my_record.sqlite              family_ehr database
    │                             │
    ├─► fhir_resources        ──► fhir_resources (with patient_id, provider_id)
    │   (JSON strings)            (JSONB + denormalized fields)
    │                             │
    └─► fhir_attachments      ──► fhir_attachments (linked via resource_uuid)
        (base64 + plaintext)      (same, but linked to normalized resources)

Import Process:
1. Load from SQLite
2. Get/create patient record
3. Get/create provider record
4. Create patient_provider_link
5. Insert fhir_resources with extracted fields (code, date, etc.)
6. Insert fhir_attachments linked to resource UUIDs
7. Refresh materialized views


┌─────────────────────────────────────────────────────────────────────────────┐
│                    QUERY PATTERNS: FAMILY USE CASES                         │
└─────────────────────────────────────────────────────────────────────────────┘

1️⃣  "What are Mom's latest vitals?"
   └─► SELECT * FROM mv_latest_vitals WHERE patient_id = '...'

2️⃣  "Which family members have diabetes?"
   └─► SELECT * FROM fhir_resources 
       WHERE resource_type = 'Condition' 
       AND searchable_text ILIKE '%diabetes%'

3️⃣  "Compare Dad's cholesterol across Epic and Kaiser"
   └─► SELECT provider.name, effective_date, value
       FROM fhir_resources JOIN medical_providers
       WHERE patient_id = '...' AND code_value = '2093-3'

4️⃣  "Search all documents for 'discharge summary'"
   └─► SELECT * FROM fhir_attachments
       WHERE to_tsvector(content_plaintext) @@ 'discharge & summary'

5️⃣  "Show full medical timeline for Alex"
   └─► SELECT * FROM fhir_resources 
       WHERE patient_id = '...' 
       ORDER BY effective_date DESC

6️⃣  "Find duplicate diagnoses across providers"
   └─► SELECT code_display, COUNT(DISTINCT provider_id)
       FROM fhir_resources 
       WHERE resource_type = 'Condition'
       GROUP BY patient_id, code_display
       HAVING COUNT(DISTINCT provider_id) > 1
```

## Design Philosophy

### Normalization vs. Denormalization

**Normalized:**
- Patients, providers, links stored separately
- Foreign keys enforce referential integrity
- Easy to query "all providers for a patient"

**Denormalized (within fhir_resources):**
- Common FHIR fields extracted: code, date, status
- Avoids expensive JSONB queries for common filters
- `searchable_text` auto-populated from resource JSON

**Full JSON Preserved:**
- `resource_json` column stores complete FHIR resource
- No data loss from normalization
- Can always access full resource for edge cases

### Multi-Provider Strategy

Each resource knows:
1. **Which patient** it belongs to (patient_id)
2. **Which provider** created it (provider_id)
3. **The provider's FHIR ID** for the patient (via patient_provider_links)

This enables:
- Provenance tracking
- Cross-provider comparisons
- Identifying care gaps
- Data quality analysis

### Family-First Design

The schema assumes:
- Small number of patients (family members)
- Multiple providers per patient
- Frequent cross-patient queries (family health trends)
- Document-heavy (attachments are first-class citizens)

Optimized for:
- "Show me all lab results for the family this year"
- "Which kids need flu shots?" (immunization queries)
- "Compare cholesterol trends across parents"

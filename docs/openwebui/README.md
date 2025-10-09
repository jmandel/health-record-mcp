# OpenWebUI Integration Guide

Complete guide to integrating the Family EHR PostgreSQL API with OpenWebUI for LLM-powered health queries.

## Overview

This integration allows you to ask natural language health questions to LLMs (via OpenWebUI), which will automatically query your family's health data from PostgreSQL.

**Example interactions:**
- 💬 "Who in the family has diabetes?"
- 💬 "Show me Sarah's medical timeline from the last year"
- 💬 "What are the latest vital signs for everyone?"
- 💬 "Compare cholesterol levels across family members"

## Quick Answer to Your Question

**Q: Is PostgreSQL better than MinIO for LLM queries?**

**A: YES!** For your use case (OpenWebUI + periodic data refresh):

| Feature | PostgreSQL (Custom) | MinIO (FHIR JSON) |
|---------|---------------------|-------------------|
| LLM Query Speed | ⚡ Fast (ms) | 🐌 Slow (seconds) |
| OpenWebUI Integration | ✅ Perfect | ⚠️ Requires custom parsing |
| Cross-patient queries | ✅ Built-in SQL | ❌ Manual aggregation |
| Full-text search | ✅ Native PostgreSQL | ❌ DIY implementation |
| Data reload | ✅ Simple (DELETE + import) | ✅ Simple (upload new files) |
| Setup complexity | ⚠️ Moderate | ✅ Very simple |

**Verdict:** PostgreSQL custom schema is **superior** for LLM agents because:
1. LLMs can call simple REST APIs (no FHIR knowledge needed)
2. Queries return in milliseconds (not seconds)
3. OpenWebUI function calling works perfectly
4. Cross-family queries are trivial

See `migrations/ARCHITECTURE_COMPARISON.md` for detailed analysis.

## Prerequisites

1. ✅ PostgreSQL database set up (see `migrations/QUICKSTART.md`)
2. ✅ Data imported for family members
3. ✅ REST API running (`bun run src/rest-api.ts`)
4. ✅ OpenWebUI installed

## Setup Steps

### 1. Start Your REST API Server

```bash
# Start the REST API
bun run src/rest-api.ts --config config.stdio.json

# Verify it's running
curl -k https://localhost:8443/api/health
# Should return: {"status":"ok","service":"EHR Search REST API"}
```

### 2. Install OpenWebUI

```bash
# Using Docker (recommended)
docker run -d -p 3000:8080 \
  --add-host=host.docker.internal:host-gateway \
  -v open-webui:/app/backend/data \
  --name open-webui \
  --restart always \
  ghcr.io/open-webui/open-webui:main

# Access at http://localhost:3000
```

### 3. Add Health Query Functions

1. Navigate to **Admin Panel** → **Functions** in OpenWebUI
2. Click **"+ Create Function"**
3. Copy contents from `examples/openwebui-function.py`
4. Update configuration:

```python
API_BASE_URL = "https://localhost:8443/api"  # Or your server URL
API_TOKEN = ""  # Leave empty for static session mode
```

5. Click **"Save"**

### 4. Enable Functions in Chat

1. Start a new chat in OpenWebUI
2. Click the **Tools** icon
3. Enable "Family Health Search"
4. Start asking questions!

## Available Functions

### search_family_health

Search all family health records by text or medical term.

```python
search_family_health(
    query="diabetes",  # What to search for
    resource_types=["Condition"]  # Optional filter
)
```

### get_patient_timeline

Get chronological timeline of health events.

```python
get_patient_timeline(
    patient_first_name="Sarah",
    limit=20
)
```

### find_family_conditions

Find which family members have a specific condition.

```python
find_family_conditions(
    condition_keyword="asthma"
)
```

### get_latest_vitals

Get latest vital signs for patient(s).

```python
get_latest_vitals(
    patient_first_name="Emmanuel"  # Or None for all
)
```

### compare_lab_results

Compare lab test results over time or across family.

```python
compare_lab_results(
    test_name="cholesterol",
    patient_first_name=None  # All family members
)
```

## Example Conversations

### General Health Search

```
👤 User: "Search for any heart-related issues in the family"

🤖 LLM: I'll search the family health records for heart-related issues.
[Calls: search_family_health(query="heart")]

Found 12 health records matching 'heart':

1. **Observation**
   Patient: Emmanuel Bioux
   Date: 2025-09-15
   Details: Heart rate: 72 bpm

2. **Condition**
   Patient: Sarah Bioux  
   Date: 2023-05-10
   Details: Atrial fibrillation (controlled)
   
... [more results]
```

### Patient Timeline

```
👤 User: "What happened with Alex last month?"

🤖 LLM: Let me check Alex's recent medical timeline.
[Calls: get_patient_timeline(patient_first_name="Alex", limit=10)]

**Medical Timeline for Alex** (most recent 10 events):

**2025-09-28** - 💉 Immunization
  Influenza vaccine (completed)
  _Provider: Stanford Health Care_

**2025-09-15** - 📊 Observation
  Height: 165 cm (final)
  _Provider: Stanford Health Care_

**2025-09-15** - 📊 Observation
  Weight: 58 kg (final)
  _Provider: Stanford Health Care_

... [more events]
```

### Family-Wide Condition Search

```
👤 User: "Does anyone have diabetes?"

🤖 LLM: I'll check which family members have diabetes.
[Calls: find_family_conditions(condition_keyword="diabetes")]

**Family members with diabetes:**

**Emmanuel Bioux**
  • Type 2 Diabetes Mellitus (active)
    Diagnosed: 2020-03-15
    By: Epic - Scripps Health

No other family members found with diabetes.
```

### Vital Signs Check

```
👤 User: "Show me everyone's latest blood pressure"

🤖 LLM: I'll retrieve the latest vital signs for all family members.
[Calls: get_latest_vitals(patient_first_name=None)]

**Latest Vital Signs:**

**Emmanuel Bioux**
  • Blood Pressure: 128/82 mmHg
    Measured: 2025-10-01 at Epic - Scripps Health
  • Heart Rate: 72 bpm
    Measured: 2025-10-01 at Epic - Scripps Health

**Sarah Bioux**
  • Blood Pressure: 118/75 mmHg
    Measured: 2025-09-20 at Kaiser Permanente
  • Heart Rate: 68 bpm
    Measured: 2025-09-20 at Kaiser Permanente

... [more family members]
```

### Lab Result Comparison

```
👤 User: "Compare cholesterol levels for Mom and Dad"

🤖 LLM: I'll compare cholesterol results for both parents.
[Calls: compare_lab_results(test_name="cholesterol")]

**Cholesterol Lab Results:**

**Emmanuel Bioux**
  • 2025-09-01: 215 mg/dL
    _Epic - Scripps Health_
  • 2025-03-15: 220 mg/dL
    _Epic - Scripps Health_
  • 2024-09-10: 225 mg/dL
    _Epic - Scripps Health_

**Sarah Bioux**
  • 2025-08-20: 185 mg/dL
    _Kaiser Permanente_
  • 2025-02-10: 190 mg/dL
    _Kaiser Permanente_

Emmanuel's cholesterol has been trending down (good!), 
while Sarah's levels are within normal range.
```

## Advanced Usage

### Custom SQL Queries

For complex queries, you can add a custom function:

```python
async def custom_health_query(
    self,
    natural_language_query: str,
    __event_emitter__=None
) -> str:
    """
    Execute a custom health query using natural language.
    The LLM will generate SQL based on the query.
    """
    # LLM generates SQL from natural language
    # Example: "Who has high cholesterol?" → SQL query
    
    # This leverages the /api/query endpoint
    # which accepts raw SQL
```

### Combining Multiple Functions

OpenWebUI's LLM can chain multiple function calls:

```
👤 User: "Check if anyone has diabetes, and if so, show their latest glucose levels"

🤖 LLM:
1. [Calls: find_family_conditions(condition_keyword="diabetes")]
   → Found: Emmanuel Bioux

2. [Calls: compare_lab_results(test_name="glucose", patient_first_name="Emmanuel")]
   → Latest glucose: 105 mg/dL (2025-10-01)

Emmanuel has Type 2 Diabetes. His most recent glucose level 
is 105 mg/dL, which is within the target range for diabetics.
```

## Periodic Data Refresh

To refresh data every few months (your stated goal):

### 1. Re-download FHIR Data

```bash
# Use your existing OAuth flow to download fresh data
# This creates new SQLite files
```

### 2. Re-import to PostgreSQL

```bash
#!/bin/bash
# monthly_refresh.sh

for patient in "Emmanuel" "Sarah" "Alex" "Maya" "Lucas"; do
  for provider in "Epic - Scripps Health" "Kaiser Permanente"; do
    bun run migrations/import-to-postgres.ts \
      --patient "$patient Bioux" \
      --provider "$provider" \
      --source "./data/${patient,,}_${provider,,}.sqlite"
  done
done

# Refresh materialized views
psql -d family_ehr -c "SELECT refresh_all_materialized_views();"
```

### 3. Automate with Cron

```bash
# Add to crontab (run every 3 months on 1st at 2am)
0 2 1 */3 * /path/to/monthly_refresh.sh
```

No need to restart OpenWebUI or change anything - fresh data is instantly available!

## Troubleshooting

### Functions Not Appearing

1. Check if function is enabled in chat settings
2. Verify API URL is correct in function code
3. Check browser console for errors

### SSL/HTTPS Errors

If using self-signed certificates:

```python
# In openwebui-function.py
response = requests.post(
    url,
    json=payload,
    headers=self.headers,
    verify=False  # Disable SSL verification for self-signed certs
)
```

### Slow Responses

Check PostgreSQL query performance:

```sql
-- Enable query logging
ALTER SYSTEM SET log_min_duration_statement = 100;  -- Log queries > 100ms

-- Check slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### No Results Found

Verify data is imported:

```sql
-- Check data exists
SELECT COUNT(*) FROM fhir_resources;
SELECT DISTINCT p.first_name FROM patients p;
```

## Why This Approach is Superior

### vs. MinIO + FHIR JSON

| Aspect | PostgreSQL | MinIO |
|--------|-----------|-------|
| **LLM Integration** | ✅ Direct REST API calls | ⚠️ Must parse FHIR structure |
| **Query Speed** | ⚡ Indexed (ms) | 🐌 Full scan (seconds) |
| **Cross-patient** | ✅ SQL JOINs | ❌ Manual aggregation |
| **Full-text search** | ✅ Built-in | ❌ DIY |
| **Data refresh** | ✅ DELETE + import | ✅ Upload new files |

### vs. FHIR-Compliant PostgreSQL

| Aspect | Custom Schema | FHIR Schema |
|--------|---------------|-------------|
| **LLM Query** | ✅ Simple SQL | ⚠️ Complex FHIR syntax |
| **Setup** | ⚡ Moderate | 💀 Extremely complex |
| **Maintenance** | ✅ Easy | ⚠️ Requires FHIR expertise |
| **Performance** | ⚡ Fast | 🐌 100+ table JOINs |

**Bottom line:** For family health data + LLM queries + periodic refresh → **PostgreSQL custom schema wins!**

## Next Steps

1. ✅ Import your family's data to PostgreSQL
2. ✅ Start REST API server
3. ✅ Add functions to OpenWebUI
4. 💬 Start asking health questions!
5. 🔄 Set up monthly/quarterly data refresh

See also:
- `migrations/ARCHITECTURE_COMPARISON.md` - Detailed comparison
- `migrations/QUICKSTART.md` - PostgreSQL setup
- `examples/openwebui-function.py` - Full function code

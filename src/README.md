# FHIR Database Utilities

This directory contains utility functions for working with FHIR data, including fetching from FHIR servers and storing in SQLite databases.

## Database Schema

When FHIR data is stored in SQLite using the `ehrToSqlite` function, it uses the following schema:

### FHIR Resources Table

All FHIR resources are stored in a single table:

```
fhir_resources
```

With the following columns:
- `resource_type` (TEXT): The FHIR resource type (e.g., "Patient", "Observation")
- `resource_id` (TEXT): The resource ID
- `json` (TEXT): The full JSON representation of the resource

This approach allows for efficient querying by resource type and ID, while maintaining a simple database structure.

### Attachments Table

A single table stores all attachments:

```
fhir_attachments
```

The attachments table has the following columns:
- `id` (INTEGER): Auto-incrementing primary key
- `resource_type` (TEXT): Type of FHIR resource the attachment belongs to
- `resource_id` (TEXT): ID of the FHIR resource
- `path` (TEXT): Path within the resource where the attachment was found
- `content_type` (TEXT): MIME type of the attachment
- `json` (TEXT): Original JSON representation of the attachment node
- `content_raw` (BLOB): Raw binary data of the attachment (if available)
- `content_plaintext` (TEXT): Extracted text content (if available)

## Example SQL Queries

### Find Patient Information
```sql
SELECT resource_id, json FROM fhir_resources 
WHERE resource_type = 'Patient';
```

### Find Documents with "Diabetes" in Their Content
```sql
SELECT a.content_plaintext, a.resource_id 
FROM fhir_attachments a 
WHERE a.resource_type = 'DocumentReference' 
AND a.content_plaintext LIKE '%diabetes%';
```

### Find Conditions with a Specific Code
```sql
SELECT json FROM fhir_resources 
WHERE resource_type = 'Condition' 
AND json LIKE '%J45.909%';
```

### Join Patient and Observations
```sql
SELECT p.json AS patient, o.json AS observation 
FROM fhir_resources p, fhir_resources o 
WHERE p.resource_type = 'Patient'
AND o.resource_type = 'Observation'
AND json_extract(o.json, '$.subject.reference') = 'Patient/' || p.resource_id;
```

## Utility Functions

The main functions for working with the database are:

- `fetchAllEhrData(fhirBaseUrl, patientId, ehrAccessToken)`: Fetches all EHR data for a patient
- `ehrToSqlite(fullEhr, db)`: Converts a FullEHR object to SQLite database tables
- `sqliteToEhr(db)`: Reconstructs a FullEHR object from SQLite database 
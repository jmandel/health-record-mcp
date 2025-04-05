# Core Server Logic

This directory contains the core implementation of the SMART MCP server.

## Modules

-   `config.ts`: Handles loading and validation of server configuration (e.g., `config.json`).
-   `oauth.ts`: Implements the OAuth 2.0 Authorization Server logic, including endpoints for authorization, token exchange, client registration, and revocation. It defines the `MyOAuthServerProvider` which interacts with the MCP SDK.
-   `sessionUtils.js`: Manages user sessions, including creating sessions from EHR data, loading sessions from persisted storage (SQLite), and handling active session state in memory.
-   `sse.ts`: Sets up the main Express application, integrates the OAuth provider, defines API endpoints (like listing stored records), establishes the MCP Server-Sent Events (SSE) endpoint (`/mcp-sse`) for real-time communication, and registers the MCP tools.
-   `tools.js`: Defines the logic for the MCP tools (`grep_record`, `query_record`, `eval_record`) that operate on the patient's EHR data within an active session.

## Persistence Schema (SQLite)

When EHR data is persisted using the utilities in `sessionUtils.js`, it is stored in an SQLite database specific to that session.

### FHIR Resources Table

All FHIR resources are stored in a single table:

```
fhir_resources
```

With the following columns:
-   `resource_type` (TEXT): The FHIR resource type (e.g., "Patient", "Observation")
-   `resource_id` (TEXT): The resource ID
-   `json` (TEXT): The full JSON representation of the resource

This approach allows for efficient querying by resource type and ID, while maintaining a simple database structure.

### Attachments Table

A single table stores all attachments:

```
fhir_attachments
```

The attachments table has the following columns:
-   `id` (INTEGER): Auto-incrementing primary key
-   `resource_type` (TEXT): Type of FHIR resource the attachment belongs to
-   `resource_id` (TEXT): ID of the FHIR resource
-   `path` (TEXT): Path within the resource where the attachment was found
-   `content_type` (TEXT): MIME type of the attachment
-   `json` (TEXT): Original JSON representation of the attachment node
-   `content_raw` (BLOB): Raw binary data of the attachment (if available)
-   `content_plaintext` (TEXT): Extracted text content (if available)

## Example SQL Queries (for `query_record` tool)

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

## Running the Server

To start the MCP server, navigate to the project's root directory (where `package.json` is located) and run:

```bash
bun run src/sse.ts
```

Or, to specify a different configuration file:

```bash
bun run src/sse.ts --config /path/to/your/config.json
```

This will start the server using the configuration specified (by default `config.json` in the root directory). Make sure you have Bun installed and have run `bun install` to get the dependencies. 
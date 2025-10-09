# REST API Usage Guide

## Overview

The REST API server exposes the same EHR search and query tools as the MCP server, but via standard REST endpoints with OpenAPI documentation. This allows any HTTP client to interact with the EHR data.

## Quick Start

### 1. Install Optional Dependencies (for Swagger UI)

```bash
bun add swagger-ui-express swagger-jsdoc @types/swagger-ui-express @types/swagger-jsdoc
```

### 2. Start the REST API Server

```bash
# Using a database file created via CLI
bun run start:rest --config config.stdio.json

# Or directly
bun run src/rest-api.ts --config config.stdio.json
```

The server will start on `https://localhost:8443` (or your configured port).

### 3. Access the API Documentation

- **Swagger UI**: https://localhost:8443/api-docs (interactive documentation)
- **OpenAPI Spec**: https://localhost:8443/api/openapi.json (raw spec)
- **Health Check**: https://localhost:8443/api/health

## Authentication

All API endpoints require OAuth 2.0 Bearer token authentication. The token is obtained through the same OAuth flow used by the MCP server.

Include the token in the `Authorization` header:

```bash
Authorization: Bearer YOUR_ACCESS_TOKEN
```

## API Endpoints

### Search with Grep

**POST** `/api/grep`

Search across all FHIR resources and attachments using text or regex.

```bash
curl -X POST https://localhost:8443/api/grep \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "diabetes",
    "resource_types": ["Condition", "Observation"],
    "resource_format": "plaintext",
    "page_size": 10,
    "page": 1
  }'
```

**Response**: Markdown text with search results

### Execute SQL Query

**POST** `/api/query`

Execute SQL SELECT queries against FHIR data.

```bash
curl -X POST https://localhost:8443/api/query \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "SELECT json FROM fhir_resources WHERE resource_type = \"Patient\""
  }'
```

**Response**: JSON array of query results

### Execute JavaScript Code

**POST** `/api/eval`

Run custom JavaScript against the patient record.

```bash
curl -X POST https://localhost:8443/api/eval \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const conditions = fullEhr.fhir[\"Condition\"] || []; return { count: conditions.length };"
  }'
```

**Response**: JSON with result, logs, and errors

```json
{
  "result": { "count": 5 },
  "logs": [],
  "errors": []
}
```

### Get Specific Resource

**GET** `/api/resource/{resourceType}/{resourceId}`

Retrieve a specific FHIR resource by type and ID.

```bash
curl -X GET https://localhost:8443/api/resource/Patient/example-id \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response**: JSON with the resource or error

```json
{
  "resource": {
    "resourceType": "Patient",
    "id": "example-id",
    ...
  }
}
```

### Get Attachment Content

**GET** `/api/attachment/{resourceType}/{resourceId}?path={path}&includeRawBase64={boolean}`

Retrieve attachment plaintext content.

```bash
curl -X GET "https://localhost:8443/api/attachment/DocumentReference/doc-123?path=content[0].attachment&includeRawBase64=false" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response**: Markdown text with attachment content

## Example Workflow

### 1. Obtain OAuth Token

First, you need to obtain an access token via the OAuth flow. The REST API uses the same OAuth endpoints as the HTTP/SSE servers.

Visit: `https://localhost:8443/authorize` and complete the OAuth flow.

### 2. Search for Conditions

```bash
TOKEN="your_access_token_here"

curl -X POST https://localhost:8443/api/grep \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "diabetes|hypertension",
    "resource_types": ["Condition"],
    "page_size": 5
  }'
```

### 3. Get Detailed Resource

From the grep results, get the full resource:

```bash
curl -X GET https://localhost:8443/api/resource/Condition/condition-123 \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Run Custom Analysis

```bash
curl -X POST https://localhost:8443/api/eval \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const patient = (fullEhr.fhir[\"Patient\"] || [])[0]; const conditions = fullEhr.fhir[\"Condition\"] || []; return { patientName: patient?.name?.[0]?.text, conditionCount: conditions.length };"
  }'
```

## Error Responses

All endpoints return standard error responses:

```json
{
  "error": "error_code",
  "error_description": "Human readable description"
}
```

Common error codes:
- `unauthorized` (401): Missing or invalid bearer token
- `bad_request` (400): Invalid request parameters
- `internal_error` (500): Server error during processing

## Differences from MCP Protocol

| Feature | MCP over HTTP | REST API |
|---------|--------------|----------|
| Protocol | JSON-RPC 2.0 | REST (HTTP verbs) |
| Endpoint | `/mcp` (single) | `/api/grep`, `/api/query`, etc. |
| Documentation | MCP tool descriptions | OpenAPI/Swagger |
| Response Format | JSON-RPC response | Direct JSON or Markdown |
| Client Libraries | MCP SDK required | Any HTTP client |

## Testing with Postman

You can import the OpenAPI spec into Postman:

1. Download: `https://localhost:8443/api/openapi.json`
2. In Postman: Import → Upload the downloaded JSON file
3. Configure environment variable for `Authorization` header

## Development

The REST API reuses the same logic functions as the MCP server:
- `grepRecordLogic`
- `queryRecordLogic`
- `evalRecordLogic`
- `readResourceLogic`
- `readAttachmentLogic`

These are defined in `src/tools.ts` and shared across all server modes.

# Smart EHR MCP Server (Bun Implementation)

This project implements a Model Context Protocol (MCP) server using Bun and TypeScript. It acts as a bridge between an MCP client (like an AI model or agent) and a SMART on FHIR-enabled Electronic Health Record (EHR) system. The server allows authorized clients to securely access and interact with patient data through a set of predefined tools.

This implementation uses the **SMART App Launch Framework (Public Client profile)** for EHR authentication and authorization.

## Vision

The goal of this project is to demonstrate how EHR workflows can seamlessly connect to powerful external tools (like AI models) for purposes such as clinical question answering or automated prior authorization determinations. By leveraging the Model Context Protocol (MCP) on top of standard SMART on FHIR, we can achieve this integration without needing complex, pre-configured agreements about specific message flows or data formats between the EHR and the tool provider. MCP provides the dynamic discovery and interaction layer needed for flexible, context-aware tool use directly within clinical workflows.

## Key Features

*   **MCP Compliance:** Implements the core MCP specification for server discovery, tool listing, and tool execution via Server-Sent Events (SSE).
*   **SMART on FHIR Integration:** Authenticates with EHRs using the SMART App Launch public client flow (Authorization Code Grant with PKCE).
*   **EHR Data Fetching:** Retrieves patient data (demographics, observations, conditions, medications, etc.) from the FHIR server.
*   **In-Memory SQLite Cache:** Stores fetched FHIR resources in an in-memory SQLite database for efficient querying within a session.
*   **Attachment Processing:** Extracts and processes text content from common attachment types found in FHIR resources (e.g., DocumentReference, Binary).
*   **Data Querying Tools:** Provides MCP tools for:
    *   `grep_record`: Text/regex search across FHIR resources and attachment content.
    *   `query_record`: Execute read-only SQL queries against the cached FHIR data.
    *   `eval_record`: Execute sandboxed JavaScript code against the fetched FHIR data (with Lodash available).
    *   `resync_record`: Manually trigger a re-fetch of data from the EHR.
*   **OAuth 2.0 Provider:** Implements necessary OAuth endpoints (`/authorize`, `/token`, `/revoke`, `/register`, `/.well-known/oauth-authorization-server`) for MCP client authorization.
*   **SQLite Persistence (Optional):** Can persist the SQLite database for a patient session to disk to speed up subsequent connections for the same patient on the same FHIR server.
*   **Configuration via JSON:** Server behavior is controlled through a simple JSON configuration file.
*   **Built with Bun:** Leverages the Bun runtime for execution.

## Configuration

The server can be configured using a JSON configuration file. You can specify the path to the configuration file using the `--config` command-line option:

```bash
bun run index.ts --config my-config.json
```

If no configuration file is specified, the server will look for a file named `config.json` in the current directory. If the file doesn't exist, the server will throw an error.

### Sample Configuration

A sample configuration file (`config.json.example`) is provided. You can copy this file to `config.json` and modify it according to your needs:

```bash
cp config.json.example config.json
```

### Configuration Options

The configuration file has the following structure:

```json
{
  "ehr": {
    "clientId": "your-client-id",
    "fhirBaseUrl": "https://ehr.example.com/fhir",
    "authUrl": "https://ehr.example.com/oauth/authorize",
    "tokenUrl": "https://ehr.example.com/oauth/token",
    "requiredScopes": [
      "openid",
      "fhirUser",
      "launch/patient",
      "patient/*.read"
    ]
  },
  "server": {
    "port": 3000,
    "baseUrl": "http://localhost:3000",
    "ehrCallbackPath": "/ehr-callback",
    "https": {
      "enabled": false,
      "certPath": "./certs/server.crt",
      "keyPath": "./certs/server.key"
    }
  },
  "persistence": {
    "enabled": false,
    "directory": "./data"
  },
  "security": {
    "disableClientChecks": false
  }
}
```

#### Required Configuration

Only the following fields are required:

```json
{
  "ehr": {
    "clientId": "your-client-id",
    "fhirBaseUrl": "https://ehr.example.com/fhir"
  },
  "server": {
    "port": 3000
  }
}
```

All other fields will be derived or set to sensible defaults.

#### EHR Configuration

- `clientId`: The client ID for your application in the EHR system (required)
- `fhirBaseUrl`: The base URL for the EHR's FHIR API (required)
- `authUrl`: The URL for the EHR's OAuth authorization endpoint (optional, will be discovered if not provided)
- `tokenUrl`: The URL for the EHR's OAuth token endpoint (optional, will be discovered if not provided)
- `requiredScopes`: The OAuth scopes required for your application (optional, defaults to common SMART scopes)

#### Server Configuration

- `port`: The port on which the server will listen (required)
- `baseUrl`: The base URL of your server (optional, derived from port and HTTPS settings)
- `ehrCallbackPath`: The path on your server that will handle EHR OAuth callbacks (optional, defaults to "/ehr-callback")
- `https`: HTTPS configuration (optional)
  - `enabled`: Whether to enable HTTPS (optional, defaults to false)
  - `certPath`: Path to the SSL certificate file (required if HTTPS is enabled)
  - `keyPath`: Path to the SSL private key file (required if HTTPS is enabled)

#### Persistence Configuration

- `enabled`: Whether to enable SQLite persistence (optional, defaults to false)
- `directory`: The directory where SQLite database files will be stored (optional, defaults to "./data")

#### Security Configuration

- `disableClientChecks`: Whether to disable client authentication checks (optional, defaults to false, not recommended for production)

## Setup and Running

1.  **Prerequisites:**
    *   Bun runtime installed (`curl -fsSL https://bun.sh/install | bash`)
    *   Git (for cloning, if necessary)

2.  **Clone the repository (if applicable):**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

3.  **Install Dependencies:**
    ```bash
    bun install
    ```

4.  **Configure:**
    *   Create a `config.json` file in the project root.
    *   Add the necessary configuration options (see Configuration section). Minimally, you'll need to specify `ehr.clientId`, `ehr.fhirBaseUrl`, and `server.port`.

5.  **Run the Server:**
    ```bash
    bun run index.ts
    ```
    Or, if `index.ts` is executable (`chmod +x index.ts`):
    ```bash
    ./index.ts
    ```

The server will start, perform configuration checks (including SMART discovery if needed), and begin listening on the configured port.

## MCP Tools

The server exposes the following tools to authorized MCP clients:

*   **`grep_record`**:
    *   **Input:** `{ "query": string, "resource_types": string[] | undefined }`
    *   **Output:** `{ "matched_resources": [], "matched_attachments": [], ...counts }`
    *   Searches the patient's cached FHIR resources (as JSON strings) and the extracted plaintext of attachments using a case-insensitive string or JavaScript regex. Can be scoped to specific resource types or attachments.

*   **`query_record`**:
    *   **Input:** `{ "sql": string }`
    *   **Output:** `Array<Record<string, unknown>>`
    *   Executes a read-only `SELECT` SQL query against the in-memory SQLite database containing the FHIR resources. Table names are typically `fhir_<ResourceType>` (e.g., `fhir_Patient`, `fhir_Observation`) and `attachments`.

*   **`eval_record`**:
    *   **Input:** `{ "code": string }`
    *   **Output:** `{ "result": any | undefined, "logs": string[], "errors": string[] }`
    *   Executes a snippet of asynchronous JavaScript code in a sandbox. The code receives the full patient record (`record: Record<string, any[]>`), a limited `console` object, and the Lodash library (`_`). It must return a JSON-serializable value. Console output and errors are captured.

*   **`resync_record`**:
    *   **Input:** `{}`
    *   **Output:** `{ "message": string }`
    *   Discards the current cached data and re-fetches all FHIR resources from the EHR. Useful if the underlying data may have changed.

## OAuth 2.0 Endpoints

This server acts as an OAuth 2.0 Authorization Server for MCP clients wishing to access its tools.

*   **Metadata:** `GET /.well-known/oauth-authorization-server`
    *   Provides standard OAuth server metadata.
*   **Authorization:** `GET /authorize`
    *   Initiates the OAuth Authorization Code flow for an MCP client. This triggers the SMART App Launch flow with the EHR.
*   **Token:** `POST /token`
    *   Exchanges an MCP authorization code (obtained after successful EHR login and consent) for an MCP access token. Also handles client authentication and PKCE verification.
*   **Registration:** `POST /register`
    *   Allows dynamic registration of MCP clients (metadata required in the request body).
*   **Revocation:** `POST /revoke`
    *   Allows an authenticated MCP client to revoke one of its access tokens.

## MCP Communication

*   **SSE Endpoint:** `GET /mcp-sse`
    *   Authenticated MCP clients establish a Server-Sent Events connection here after obtaining an access token. MCP messages (requests and responses) are exchanged over this connection. Requires a `Bearer` token.
*   **Message Endpoint:** `POST /mcp-messages`
    *   The MCP client sends request messages (like `callTool`) to this endpoint, associated with the established SSE session via a `sessionId` query parameter. Authentication is implicitly handled by the valid `sessionId`.
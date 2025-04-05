# Smart EHR MCP Server (Bun Implementation)

This project provides a Model Context Protocol (MCP) server that acts as a bridge between AI agents or other MCP clients and Electronic Health Record (EHR) systems.

## Core Features

**Connect to any EHR with SMART on FHIR:**
Leveraging the widely adopted SMART App Launch Framework, this server can connect to virtually any EHR system that supports this standard. It uses the public client profile (Authorization Code Grant with PKCE) to securely authenticate and authorize access on behalf of the user.

**Extract Comprehensive Patient Data:**
Once connected, the server performs a thorough extraction of the patient's record. This includes:
*   **Structured Data:** Key FHIR resources like Problems (Conditions), Medications, Allergies, Procedures, Observations, Encounters, Immunizations, and Patient Demographics.
*   **Clinical Notes & Attachments:** It automatically identifies and fetches linked documents (e.g., from `DocumentReference`) and other attachments (like PDFs, RTF, HTML, XML, text found in `Binary` or other resources). It attempts to extract plaintext content from common formats, making unstructured text available alongside structured data.

The fetched data is aggregated into a `ClientFullEHR` object, containing both the raw FHIR JSON and processed attachment details.

**Powerful MCP Tools for Data Interaction:**
The server exposes the aggregated EHR data through three core MCP tools, allowing clients to analyze the full record:
*   `grep_record`: Performs text or regular expression searches across all fetched FHIR resources *and* the extracted plaintext of attachments. Ideal for finding mentions of specific terms, diagnoses, or medications anywhere in the record.
*   `query_record`: Executes read-only SQL `SELECT` queries against the structured FHIR data, which is loaded into an in-memory SQLite database for efficient querying during the session.
*   `eval_record`: Runs sandboxed JavaScript code directly against the complete `ClientFullEHR` object (including FHIR resources and attachments). This allows for complex custom logic, data transformation, or analysis using the provided Lodash library.

## How it Works: Connection and Data Flow

This project offers two primary modes of operation, catering to different integration needs:

1.  **Full Server with SSE Transport (`index.ts`):**
    *   **Transport:** Uses Server-Sent Events (SSE) for real-time MCP communication.
    *   **Data Fetch:** Integrates the SMART on FHIR authentication and data fetching process directly into the MCP client's authorization flow. When an MCP client initiates the OAuth 2.0 `/authorize` request with this server, the user is redirected to their EHR for login and consent. Upon successful authorization, the server immediately fetches the patient's data *before* issuing the final MCP access token to the client. The fetched data is then held in memory for the duration of the SSE session.
    *   **Use Case:** Ideal for web-based MCP clients or scenarios where the data fetch should happen seamlessly as part of establishing the MCP connection.

    ```mermaid
    sequenceDiagram
        participant Client [MCP Client]
        participant Server [Full Server (index.ts)]
        participant Browser [User's Browser]
        participant EHR

        Client->>Server: Request /authorize (OAuth)
        Server->>Browser: Redirect to EHR Login
        Browser->>EHR: User Logs In / Authorizes
        EHR->>Browser: Returns Auth Code
        Browser->>Server: Sends Auth Code via Redirect
        Server->>EHR: Exchanges Code for Token
        EHR->>Server: Returns Access Token + Patient ID
        Server->>EHR: Fetches Patient Data (FHIR + Attachments)
        EHR->>Server: Returns Data
        Server->>Server: Holds Data in Memory
        Server->>Client: Issues MCP Access Token
        Client->>Server: Connects to /mcp-sse with Token
        Client->>Server: callTool(grep_record, ...)
        Server->>Server: Executes tool against in-memory data
        Server->>Client: Returns tool result via SSE
    end
    ```

2.  **Command-Line Interface with Stdio Transport (`src/cli.ts`):**
    *   **Transport:** Uses standard input/output (stdio) for MCP communication.
    *   **Data Fetch:** Requires a separate, **up-front** data fetching step using the `--create-db` flag. This command runs a temporary local web server, guides the user through the SMART flow in their browser, fetches the data, and saves it persistently to a local SQLite database file.
    *   **MCP Server Launch:** Once the database file exists, the CLI is run again, pointing to the database (`--db path`). It loads the data from the SQLite file into memory and then listens for MCP messages on stdin, sending responses to stdout.
    *   **Use Case:** Suitable for local development tools (like Cursor), testing, or scenarios where data persistence is desired, and the data fetching process can occur independently before the MCP session starts.

    *(See the Mermaid diagram under 'CLI Usage' below for this flow)*

## Setup

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

## Running the Full Server (SSE Transport - `index.ts`)

1.  **Configure:**
    *   Copy `config.json.example` to `config.json`.
    *   Edit `config.json` and provide your EHR details, minimally `ehr.clientId` and `ehr.fhirBaseUrl`. The server needs a client ID registered with the target EHR.
    *   Set the desired `server.port`.

2.  **Run:**
    ```bash
    bun run index.ts
    # or bun run index.ts --config my-other-config.json
    ```

The server will start, perform SMART discovery using the details in `config.json`, and listen for incoming MCP client OAuth requests and SSE connections on the configured port.

## CLI Usage (Stdio Transport - `src/cli.ts`)

The `src/cli.ts` script provides the stdio transport mechanism.

**Workflow Overview:**

```mermaid
sequenceDiagram
    participant User
    participant CLI_CreateDB [CLI (src/cli.ts --create-db)]
    participant Browser [Web Browser]
    participant EHR
    participant SQLiteDB [SQLite Database File]
    participant CLI_Stdio [CLI (src/cli.ts --db)]
    participant MCPClient [MCP Client (e.g., Cursor)]

    User->>CLI_CreateDB: bun src/cli.ts --create-db --db ./my_ehr.sqlite
    CLI_CreateDB->>User: Provides URL (e.g., http://localhost:8088/start)
    User->>Browser: Opens provided URL
    Browser->>CLI_CreateDB: Requests /start
    CLI_CreateDB->>Browser: Redirects to ehretriever.html
    Browser->>Browser: User enters EHR details
    Browser->>EHR: Initiates SMART Auth Flow
    EHR->>Browser: User authenticates/authorizes
    Browser->>EHR: Exchanges code for token
    EHR->>Browser: Returns access token
    Browser->>EHR: Fetches FHIR data (Patient, Obs, etc.)
    EHR->>Browser: Returns FHIR data
    Browser->>Browser: Processes data & attachments
    Browser->>CLI_CreateDB: POSTs ClientFullEHR to /ehr-data
    CLI_CreateDB->>SQLiteDB: Writes data using ehrToSqlite()
    CLI_CreateDB->>User: Logs success, server shuts down

    User->>MCPClient: Configure server command
    MCPClient->>CLI_Stdio: bun src/cli.ts --db ./my_ehr.sqlite
    CLI_Stdio->>SQLiteDB: Reads data using sqliteToEhr()
    CLI_Stdio->>MCPClient: Ready (via stdio transport)
    MCPClient->>CLI_Stdio: callTool(grep_record, ...)
    CLI_Stdio->>CLI_Stdio: Executes grepRecordLogic() against in-memory EHR data
    CLI_Stdio->>MCPClient: Returns tool result via stdio
```

**Step 1: Creating the Database (`--create-db`)**

This mode starts a temporary web server to guide you through the SMART authentication process in your browser. Once authentication is complete and data is fetched, it's saved to the specified SQLite file.

```bash
# Create a new database file (requires user interaction in browser)
bun run src/cli.ts --create-db -d ./data/my_patient_data.sqlite

# Options:
# --port <port> : Specify port for the temporary web server (default 8088)
# --force-overwrite : Delete the DB file if it exists before creating
```

Follow the instructions printed in the terminal:
1.  Open the provided `http://localhost:<port>/start` URL in your browser.
2.  Fill in the EHR details (FHIR Base URL, Client ID, Scopes).
3.  Complete the EHR login and authorization steps.
4.  The browser fetches the data and sends it back to the local CLI server.
5.  The CLI saves the data to the SQLite file (`--db path`) and shuts down.

**Step 2: Running the MCP Server (stdio mode)**

Once the SQLite database file exists, run the CLI pointing to it:

```bash
# Run the MCP server, reading from the created database
bun run src/cli.ts --db ./data/my_patient_data.sqlite
```

The CLI loads data into memory and listens for MCP messages on stdin/stdout.

**Step 3: Integrating with an MCP Client (e.g., Cursor)**

Configure your stdio-compatible client (like Cursor's `.mcp/servers.json`):

```json
{
  "mcpServers": {
    "local-ehr": {
      "name": "Local EHR Search",
      "command": "bun", // Or your Bun executable path
      "args": [
          // *Absolute path* to cli.ts
          "/full/path/to/your/project/smart-mcp/src/cli.ts",
          "--db",
          // *Absolute path* to your database file
          "/full/path/to/your/project/smart-mcp/data/my_patient_data.sqlite"
      ],
      // Optional: Set working directory if needed
      // "cwd": "/full/path/to/your/project/smart-mcp"
    }
  }
}
```
*Ensure you use absolute paths for `cli.ts` and the database file.*

## MCP Tools Details

*   **`grep_record`**: Searches FHIR resources and attachment plaintext.
    *   **Input:** `{ "query": string, "resource_types": string[] | undefined }` (Query is text or JS regex, `resource_types` filters scope, omit or empty for all, `["Attachment"]` for only attachments).
    *   **Output:** `{ "results": string }` (JSON string containing matches, truncated if necessary).
*   **`query_record`**: Executes read-only SQL against cached FHIR data.
    *   **Input:** `{ "sql": string }` (SQL `SELECT` statement against `fhir_resources` table (cols: `resource_type`, `resource_id`, `json`) and `fhir_attachments` table).
    *   **Output:** `{ "results": string }` (JSON string of query results, truncated if necessary).
*   **`eval_record`**: Executes sandboxed JavaScript against the full `ClientFullEHR` object.
    *   **Input:** `{ "code": string }` (JS code snippet using `fullEhr`, `console`, `_` (lodash), `Buffer`. Must `return` a JSON-serializable value).
    *   **Output:** `{ "results": string }` (JSON string containing `{ result: any, logs: string[], error?: string }`, truncated if necessary).

*(Note: The `resync_record` tool mentioned in older versions is not implemented in the current main flows described.)*

## OAuth 2.0 Endpoints (Full Server `index.ts` only)

The full server (`index.ts`) acts as an OAuth 2.0 Authorization Server for MCP clients:
*   **Metadata:** `GET /.well-known/oauth-authorization-server`
*   **Authorization:** `GET /authorize` (Triggers SMART flow)
*   **Token:** `POST /token` (Exchanges EHR code for MCP token)
*   **Registration:** `POST /register` (Dynamic client registration)
*   **Revocation:** `POST /revoke`

## Configuration Details (`config.json` for `index.ts`)

*(This section remains largely the same as before, detailing the JSON structure for `clientId`, `fhirBaseUrl`, `port`, `baseUrl`, `persistence`, `security` etc. for the full server mode.)*

(... include the previous detailed configuration options table/explanation here ...)

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

Only the following fields are required for the full server:

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
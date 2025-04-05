# Smart EHR MCP Server (Bun Implementation)

Ever wish your AI tools could securely peek into Electronic Health Records (EHRs)? This project makes it happen! It's a Model Context Protocol (MCP) server that connects AI agents and other MCP clients to EHRs using the power of **SMART on FHIR**.

Think of it as a universal adapter and toolkit for EHR data.

## What Can It Do?

*   **Connect to (Almost) Any EHR:** If an EHR supports the standard SMART on FHIR protocol (and most modern ones do), this server can likely talk to it. It handles the secure handshake using the SMART App Launch standard.
*   **Grab the *Whole* Story:** It doesn't just get allergies and meds. It pulls down a wide range of structured FHIR data (Conditions, Observations, Procedures, etc.) *plus* it digs into linked clinical notes and attachments (like PDFs, text files, RTF, HTML found in `DocumentReference` or other resources). It even tries its best to extract plain text from these attachments so your tools can read them.
*   **Provide Powerful Tools:** Once the data is fetched, it offers three handy MCP tools to work with it:
    *   `grep_record`: Your go-to for searching *everything* - structured data and note text - for keywords or patterns (using text or regex). Find mentions of "diabetes" or "aspirin" anywhere.
    *   `query_record`: For the SQL fans. Run read-only `SELECT` queries directly against the structured FHIR data (which gets loaded into a temporary SQLite database).
    *   `eval_record`: The power user's choice. Execute custom JavaScript code snippets directly on the fetched data (FHIR resources + attachments) with the help of Lodash. Perfect for complex analysis or data crunching.

## How Does the Magic Happen? (Two Flavors)

You can run this server in two main ways, depending on how you want to connect and fetch data:

**1. The All-in-One Server (SSE Transport via `index.ts`)**

*   **Best For:** Web applications or MCP clients that handle OAuth well.
*   **How it Works:** This is the full-fledged server. When your MCP client wants to connect, it kicks off an OAuth 2.0 flow. The user gets sent to their EHR login. Once they approve access, *this server* fetches all the EHR data *before* giving the final MCP connection green light (via Server-Sent Events, or SSE). The data stays in memory, ready for tool calls over the live SSE connection.
*   **Data Fetch:** Happens automatically *during* the connection setup.

```mermaid
sequenceDiagram
    participant Client [MCP Client]
    participant Server [Full Server (index.ts)]
    participant Browser [User's Browser]
    participant EHR

    Client->>Server: Let's Connect! (OAuth /authorize)
    Server->>Browser: EHR Login Time!
    Browser->>EHR: User Authenticates & Approves
    EHR->>Browser: OK, Here's a Code
    Browser->>Server: Got the Code!
    Server->>EHR: Swap Code for Token?
    EHR->>Server: Token Granted! (+ Patient ID)
    Server->>EHR: Fetching All Patient Data...
    EHR->>Server: Here's the Data!
    Server->>Server: Storing Data in Memory
    Server->>Client: Connection Approved (MCP Token)
    Client->>Server: MCP Connection Open (SSE)
    Client->>Server: Use Tool: grep_record(...)
    Server->>Server: Running Tool on Memory Data
    Server->>Client: Here are the results! (SSE)
end
```

**2. The Command-Line Helper (Stdio Transport via `src/cli.ts`)**

*   **Best For:** Local tools (like Cursor), testing, or when you want the data saved locally first.
*   **How it Works:** This is a two-step process:
    1.  **Fetch First:** Run the script with `--create-db`. It starts a mini web server, you log into your EHR in the browser, and it saves *all* the fetched data into a local SQLite file.
    2.  **Run Server:** Run the script *again*, pointing it to the SQLite file (`--db path`). It loads the data from the file into memory and then waits for MCP tool commands over your standard terminal input/output (stdio).
*   **Data Fetch:** Done **up-front** before starting the actual MCP server part.

```mermaid
sequenceDiagram
    participant User
    participant CLI_CreateDB [CLI (--create-db)]
    participant Browser [User's Browser]
    participant EHR
    participant SQLiteDB [SQLite Database File]
    participant CLI_Stdio [CLI (--db)]
    participant MCPClient

    Note over User, CLI_CreateDB: Step 1: Get the Data
    User->>CLI_CreateDB: bun src/cli.ts --create-db --db ./my_ehr.sqlite
    CLI_CreateDB->>User: Go to http://localhost:8088/start
    User->>Browser: Opens Link
    Browser->>CLI_CreateDB: Request /start
    CLI_CreateDB->>Browser: Show EHR Login Page (ehretriever.html)
    Browser->>Browser: User Enters EHR Details
    Browser->>EHR: SMART Auth Dance
    EHR->>Browser: User Authenticates/Authorizes
    Browser->>EHR: Swap Code for Token
    EHR->>Browser: Token Granted
    Browser->>EHR: Fetch FHIR Data...
    EHR->>Browser: Here's the Data
    Browser->>Browser: Process Notes/Attachments
    Browser->>CLI_CreateDB: Sending Data (POST /ehr-data)
    CLI_CreateDB->>SQLiteDB: Saving Data to File
    CLI_CreateDB->>User: Done! Server Stopped.

    Note over User, MCPClient: Step 2: Use the Data
    User->>MCPClient: Configure Server Command (e.g., in Cursor)
    MCPClient->>CLI_Stdio: bun src/cli.ts --db ./my_ehr.sqlite
    CLI_Stdio->>SQLiteDB: Loading Data From File...
    CLI_Stdio->>MCPClient: Ready to Go! (via stdio)
    MCPClient->>CLI_Stdio: Use Tool: grep_record(...)
    CLI_Stdio->>CLI_Stdio: Running Tool on Memory Data
    CLI_Stdio->>MCPClient: Here are the results! (via stdio)
end
```

## Getting Started: Setup

It's pretty standard:

1.  **Need Bun:** Make sure you have the Bun runtime. If not: `curl -fsSL https://bun.sh/install | bash`
2.  **Get the Code:** Clone this repository if you haven't already.
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```
3.  **Install Stuff:**
    ```bash
    bun install
    ```

## Option 1: Running the Full Server (`index.ts`)

Use this for the SSE/OAuth approach.

1.  **Configure:**
    *   Copy `config.json.example` to `config.json`.
    *   Edit `config.json`: You *must* provide your `ehr.clientId` (get this from your EHR developer portal) and the `ehr.fhirBaseUrl` for the EHR you want to connect to.
    *   Check the `server.port` (default is 3000).
2.  **Run:**
    ```bash
    bun run index.ts
    ```
    It'll start up and wait for MCP clients to initiate the connection process.

## Option 2: Using the CLI (`src/cli.ts`)

Use this for the stdio approach (like with Cursor).

**Step 1: Create the Database File**

Run this command once per patient/session you want to load:

```bash
# This starts a temporary server and needs you to interact in a browser
bun run src/cli.ts --create-db -d ./data/my_patient_data.sqlite

# If ./data/my_patient_data.sqlite already exists, add --force-overwrite
# bun run src/cli.ts --create-db -d ./data/my_patient_data.sqlite --force-overwrite

# Need a different port? Use --port
# bun run src/cli.ts --create-db -d ./data/my_patient_data.sqlite --port 8089
```

Follow the instructions it prints:
1.  Open the `http://localhost:<port>/start` link in your browser.
2.  Enter the EHR's FHIR URL and your Client ID.
3.  Log in to the EHR when prompted.
4.  Wait for the browser to fetch data and send it back.
5.  The CLI will save it to `my_patient_data.sqlite` (or your chosen path) and stop.

**Step 2: Run the MCP Server via Stdio**

Now that you have the data file:

```bash
# Point the CLI to your database file
bun run src/cli.ts --db ./data/my_patient_data.sqlite
```

It loads the data and is ready to receive MCP commands over stdin/stdout.

**Step 3: Connect Your Client (e.g., Cursor)**

In your client's MCP server configuration (like Cursor's `.mcp/servers.json`), set it up to run the CLI command:

```js
{
  "mcpServers": {
    "local-ehr": {
      "name": "Local EHR Search",
      "command": "bun", // Or /path/to/bun
      "args": [
          // Use the *absolute path* to cli.ts
          "/home/user/projects/smart-mcp/src/cli.ts",
          "--db",
          // Use the *absolute path* to your database file
          "/home/user/projects/smart-mcp/data/my_patient_data.sqlite"
      ],
      // Optional: uncomment if needed
      // "cwd": "/home/user/projects/smart-mcp"
    }
  }
}
```

**Crucial:** Use **absolute paths** to both `src/cli.ts` and your `.sqlite` database file in the client configuration!

## The Tools in More Detail

*   **`grep_record`**:
    *   Input: `{ "query": "search term or /regex/", "resource_types": ["Condition", "Observation"] }` (Leave out `resource_types` or use `[]` to search everything. Use `["Attachment"]` to search *only* note/attachment text).
    *   Output: `{ "results": "..." }` (JSON string with matches).
*   **`query_record`**:
    *   Input: `{ "sql": "SELECT json FROM fhir_resources WHERE resource_type = 'Patient'" }` (Table `fhir_resources` has `resource_type`, `resource_id`, `json`. Table `fhir_attachments` has attachment details).
    *   Output: `{ "results": "..." }` (JSON string of results array).
*   **`eval_record`**:
    *   Input: `{ "code": "return _.filter(fullEhr.fhir['Condition'], { clinicalStatus: { coding: [{ code: 'active'}] } });" }` (Your JS code gets `fullEhr`, `console`, `_` (lodash), `Buffer`. MUST use `return`).
    *   Output: `{ "results": "..." }` (JSON string: `{ result: your_returned_value, logs: [], error?: "..." }`).

## Full Server Extras (`index.ts` only)

The full server (`index.ts`) also provides standard OAuth 2.0 endpoints for clients that need them:
`/authorize`, `/token`, `/register`, `/revoke`, `/.well-known/oauth-authorization-server`.

## Configuration File Details (`config.json` for `index.ts`)

*(This section explains the settings for the full server mode)*

### Sample `config.json`

Copy `config.json.example` to `config.json` and edit.

```js
{
  "ehr": {
    "clientId": "your-client-id", // REQUIRED
    "fhirBaseUrl": "https://ehr.example.com/fhir", // REQUIRED
    // Optional below - will be auto-discovered if possible
    "authUrl": "https://ehr.example.com/oauth/authorize",
    "tokenUrl": "https://ehr.example.com/oauth/token",
    "requiredScopes": [ "openid", "fhirUser", "launch/patient", "patient/*.read" ]
  },
  "server": {
    "port": 3000, // REQUIRED
    // Optional below
    "baseUrl": "http://localhost:3000", // Auto-derived if omitted
    "ehrCallbackPath": "/ehr-callback",
    "https": { "enabled": false, "certPath": "", "keyPath": "" }
  },
  "persistence": { // Optional - for caching sessions in full server
    "enabled": false,
    "directory": "./data"
  },
  "security": { // Optional
    "disableClientChecks": false // Keep false unless testing!
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
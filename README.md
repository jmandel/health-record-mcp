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
*   **Configuration via Environment Variables:** Server behavior (EHR endpoints, client IDs, persistence) is controlled through environment variables.
*   **Built with Bun:** Leverages the Bun runtime for execution.

## Configuration

The server is configured using environment variables. You can set these directly in your shell or create a `.env` file in the project root.

**Required:**

*   `EHR_FHIR_URL`: The base URL of the target FHIR server (e.g., `https://fhir.ehr.system/R4`).
*   `MCP_SERVER_EHR_CLIENT_ID`: The client ID registered with the EHR for this MCP server application.

**Optional (often discovered via SMART configuration):**

*   `EHR_AUTH_URL`: The EHR's OAuth 2.0 authorization endpoint URL. If not provided, the server attempts discovery using `/.well-known/smart-configuration` on the `EHR_FHIR_URL`.
*   `EHR_TOKEN_URL`: The EHR's OAuth 2.0 token endpoint URL. If not provided, the server attempts discovery.

**Optional (Server Behavior):**

*   `MCP_SERVER_BASE_URL`: The base URL where this MCP server is publicly accessible (defaults to `http://localhost:3001`). **Crucial for OAuth redirects.**
*   `MCP_SERVER_PORT`: The port the server listens on (defaults to `3001`).
*   `EHR_SCOPES`: Space-separated string of SMART scopes required from the EHR (defaults to a common set including `openid`, `fhirUser`, `launch/patient`, and read scopes for various resources).
*   `SQLITE_PERSISTENCE_ENABLED`: Set to `true` to enable saving/loading the SQLite database to disk (defaults to `false`).
*   `SQLITE_PERSISTENCE_DIR`: Directory to store SQLite database files if persistence is enabled (defaults to `./data`).
*   `DISABLE_CLIENT_CHECKS`: Set to `true` to disable MCP client ID lookup and redirect URI validation during OAuth flows. **Use with caution, intended for specific development/testing scenarios.** (Defaults to `false`).

**Defaults for SMART Health IT Sandbox:**

If `EHR_FHIR_URL` is not set, it defaults to the public SMART Health IT sandbox (`https://launch.smarthealthit.org/v/r4/sim/...`).
If `MCP_SERVER_EHR_CLIENT_ID` is not set *and* the default SMART sandbox URL is used, it defaults to `mcp_app`.

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

4.  **Configure Environment:**
    *   Create a `.env` file in the project root.
    *   Add the necessary environment variables (see Configuration section). Minimally, you'll likely need `EHR_FHIR_URL` and `MCP_SERVER_EHR_CLIENT_ID`. If your EHR doesn't support SMART configuration discovery, you'll also need `EHR_AUTH_URL` and `EHR_TOKEN_URL`. Ensure `MCP_SERVER_BASE_URL` is correct for your deployment.

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
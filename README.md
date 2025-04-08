# EHR Tools with MCP and FHIR

This project acts as a specialized server providing tools for Large Language Models (LLMs) and other AI agents to interact with Electronic Health Records (EHRs). It leverages the **SMART on FHIR** standard for secure data access and the **Model Context Protocol (MCP)** to expose the tools.

Think of it as a secure gateway and toolkit enabling AI to safely access and analyze patient data from diverse EHR systems.

## The Core Idea

The system works in three main stages:

1.  **SMART on FHIR Client (Implemented within this project):** Connects securely to an EHR using the standard SMART App Launch framework. It extracts a wide range of patient information, including both structured data (like conditions, medications, labs) and unstructured clinical notes or attachments.
2.  **MCP Server (This Project):** Takes the extracted EHR data and makes it available through a set of powerful tools accessible via the Model Context Protocol. These tools allow external systems (like AI models) to query and analyze the data without needing direct access to the EHR itself.
3.  **AI / LLM Interface (External Consumer):** An AI agent or Large Language Model connects to the MCP Server and uses the provided tools to "ask questions" about the patient's record, perform searches, or run custom analyses.

## Available Tools

The MCP Server offers several tools for interacting with the loaded EHR data:

*   `grep_record`: Performs text or regular expression searches across *all* parts of the fetched record (structured FHIR data + text from notes/attachments). Ideal for finding keywords or specific mentions (e.g., "diabetes", "aspirin").
*   `query_record`: Executes read-only SQL `SELECT` queries directly against the structured FHIR data. Useful for precise lookups based on known FHIR resource structures (e.g., finding specific lab results by LOINC code).
*   `eval_record`: Executes custom JavaScript code directly on the fetched data (FHIR resources + attachments). Offers maximum flexibility for complex calculations, combining data from multiple sources, or custom formatting.

This setup allows AI tools to leverage comprehensive EHR data through a standardized and secure interface.

*(Developer setup and usage details can be found within the codebase and specific module documentation.)*

---

## Components & Usage

This project offers different ways to fetch EHR data and expose it via MCP tools:

### 1. Standalone SMART on FHIR Web Client

This project includes a self-contained web application that allows users to connect to their EHR via SMART on FHIR and fetch their data.

*   **Hosted Version:** You can use a publicly hosted version at: \
    [`https://mcp.fhir.me/ehr-connect#deliver-to-opener:$origin`](https://mcp.fhir.me/ehr-connect#deliver-to-opener:$origin) \
    (Replace `$origin` with the actual origin of the window that opens this link).
*   **How it Works:** When opened, this page prompts the user to select their EHR provider. It then initiates the standard SMART App Launch flow, redirecting the user to their EHR's login page. After successful authentication and authorization, the client fetches a comprehensive set of FHIR resources (Patient, Conditions, Observations, Medications, Documents, etc.) and attempts to extract plaintext from any associated attachments (like PDFs, RTF, HTML found in `DocumentReference`).
*   **Data Output (`ClientFullEHR`):** Once fetching is complete, the client gathers all the data into a `ClientFullEHR` JSON object. This object contains:
    *   `fhir`: A dictionary where keys are FHIR resource types (e.g., "Patient") and values are arrays of the corresponding FHIR resources.
    *   `attachments`: An array of processed attachment objects, each including metadata (source resource, path, content type) and the content itself (`contentBase64` for raw data, `contentPlaintext` for extracted text).
*   **Data Delivery:** If opened with the `#deliver-to-opener:$origin` hash, the client will prompt the user for confirmation and then send the `ClientFullEHR` object back to the window that opened it using `window.opener.postMessage(data, targetOrigin)`.

### 2. Local MCP Server via Stdio (`src/cli.ts`)

This mode is ideal for running the MCP server locally, often used with tools like Cursor or other command-line AI clients.

*   **Two-Step Process:**
    1.  **Fetch Data to Database:** First, run the command-line interface with the `--create-db` and `--db` flags. This starts a temporary web server and uses the same SMART on FHIR web client logic described above to fetch data. Instead of sending the data via `postMessage`, it saves the `ClientFullEHR` data into a local SQLite database file.
        ```bash
        # Example: Fetch data and save to data/my_record.sqlite
        bun run src/cli.ts --create-db --db ./data/my_record.sqlite
        ```
        Follow the prompts (opening a link in your browser) to connect to your EHR.
    2.  **Run MCP Server:** Once the database file is created, run the CLI again, pointing only to the database file. This loads the data into memory and starts the MCP server, listening for commands on standard input/output.
        ```bash
        # Example: Start the MCP server using the saved data
        bun run src/cli.ts --db ./data/my_record.sqlite
        ```
*   **Client Configuration (e.g., Cursor):** Configure your MCP client to execute this command. **Crucially, use absolute paths** for both `src/cli.ts` and the database file.
    ```json
    {
      "mcpServers": {
        "local-ehr": {
          "name": "Local EHR Search",
          "command": "bun", // Or the absolute path to bun
          "args": [
              "/home/user/projects/smart-mcp/src/cli.ts", // Absolute path to cli.ts
              "--db",
              "/home/user/projects/smart-mcp/data/my_record.sqlite" // Absolute path to DB file
            ]
        }
      }
    }
    ```

### 3. Full MCP Server via SSE (`src/sse.ts` / `index.ts`)

This mode runs a persistent server suitable for scenarios where multiple clients might connect over the network. It uses Server-Sent Events (SSE) for the MCP communication channel.

*   **Authentication:** Client authentication relies on OAuth 2.1, as specified by the Model Context Protocol. The server provides standard endpoints (`/authorize`, `/token`, `/register`, etc.).
*   **Data Fetch:** When a client initiates an OAuth connection, the server handles the SMART on FHIR flow *itself*, fetches the `ClientFullEHR` data *during* the authorization process, and keeps it in memory (or a persisted session) for the duration of the client's connection.
*   **Status:** While functional, the MCP specification for OAuth 2.1 client interaction is still evolving. Client support for this authentication method is **extremely limited** at present, making it difficult to test this mode with standard clients outside of specialized developer or debugging tools. This SSE mode should be considered **experimental**.
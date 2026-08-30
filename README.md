# EHR Tools with MCP and FHIR
![EHR Tools Overview](static/overview.png)

https://youtu.be/K0t6MRyIqZU?si=Mz4d65DcAD3i2YbO

This project acts as a specialized server providing tools for Large Language Models (LLMs) and other AI agents to interact with Electronic Health Records (EHRs). It leverages the **SMART on FHIR** standard for secure data access and the **Model Context Protocol (MCP)** to expose the tools.

Think of it as a secure gateway and toolkit enabling AI to safely access and analyze patient data from diverse EHR systems.

## Building a Longitudinal Record

A single database can hold a patient's record across time and across more than one health system.

*   **Import a downloaded JSON record (`--import-json`).** Load a `ClientFullEHR` file straight into
    SQLite without re-running the SMART flow. This means you can authenticate once through the
    hosted web client — using *its* registered client ID, so there is no need to register an app
    with your health system — then iterate locally against the saved file. See
    *Local MCP Server via Stdio* below.

*   **Label records by health system (`--source`).** Records can be labelled with the provider they
    came from, stored in a `source` column on `fhir_resources` and `fhir_attachments` and queryable
    from `query_record`. `--backfill-source` labels a database created before the column existed.
    See *Local MCP Server via Stdio* below.

*   **Re-ingesting a provider is idempotent.** Resources upsert on `(resource_type, resource_id)`,
    and attachments are unique on `(resource_type, resource_id, path, content_type)`, so appending
    the same pull twice updates rows rather than storing every note and PDF again. The schema
    migrates in place on first use, collapsing any duplicates an earlier append left behind.

### Quick start

```bash
# One-time: build a database from a record downloaded via the hosted web client.
bun run src/cli.ts --import-json ~/health-records/ehr-data.json \
  --db ~/health-records/my_record.sqlite --source "Example Health"

# Add a second health system later.
bun run src/cli.ts --db ~/health-records/my_record.sqlite --create-db \
  --force-concat --source "Other Health System"

# Serve the combined record over MCP.
bun run src/cli.ts --db ~/health-records/my_record.sqlite
```

Back up the database before any run that writes to an existing file; `--force-concat` mutates it in
place and `--force-overwrite` deletes it outright.

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
    [`https://mcp.fhir.me/ehr-connect`](https://mcp.fhir.me/ehr-connect)
*   **Getting your data out — two options:**
    1.  **Download a JSON file (simplest).** Open the hosted URL *with no hash*. With no delivery
        target set, the client shows a **Download** button once the fetch completes, saving the
        `ClientFullEHR` object as JSON. You can then load it into a local database with
        `--import-json` (see section 2).
    2.  **Deliver to your own page.** Append `#deliver-to-opener:$origin`, where **`$origin` is the
        origin of *your* page** — the one that called `window.open()` on this link (e.g.
        `http://localhost:3000`). After you confirm, the client calls
        `window.opener.postMessage(clientFullEhr, $origin)`. Your page must be served over http(s):
        a `file://` page has origin `"null"`, which fails validation and silently disables delivery.
*   **Privacy note:** this page is a pure browser client (SMART public client + PKCE). It exchanges
    the auth code directly with your health system's token endpoint and fetches FHIR resources
    straight from the EHR. In the download flow above there is no POST anywhere — `mcp.fhir.me`
    serves the JavaScript and never receives your record.
*   **Filtering Brands (`?brandTags`):** You can filter the list of EHR providers shown on the connection page by adding the `brandTags` query parameter to the URL. Provide a comma-separated list of tags. Only brands matching *all* provided tags (from their configuration in `brandFiles`) will be displayed.
    It supports both OR (comma-separated) and AND (caret `^` separated) logic, with AND taking precedence.
    *   `?brandTags=epic,sandbox`: Shows brands tagged with `epic` OR `sandbox`.
    *   `?brandTags=epic^dev`: Shows brands tagged with both `epic` AND `dev`.
    *   `?brandTags=epic^dev,sandbox^prod`: Shows brands tagged with (`epic` AND `dev`) OR (`sandbox` AND `prod`).
    *   If the parameter is omitted, it defaults to showing brands tagged with `prod`.
    *   Example: `.../ehr-connect?brandTags=hospital^us`: Shows brands tagged with `hospital` AND `us`.
*   **How it Works:** When opened, this page prompts the user to select their EHR provider. It then initiates the standard SMART App Launch flow, redirecting the user to their EHR's login page. After successful authentication and authorization, the client fetches a comprehensive set of FHIR resources (Patient, Conditions, Observations, Medications, Documents, etc.) and attempts to extract plaintext from any associated attachments (like PDFs, RTF, HTML found in `DocumentReference`).
*   **Data Output (`ClientFullEHR`):** Once fetching is complete, the client gathers all the data into a `ClientFullEHR` JSON object. This object contains:
    *   `fhir`: A dictionary where keys are FHIR resource types (e.g., "Patient") and values are arrays of the corresponding FHIR resources.
    *   `attachments`: An array of processed attachment objects, each including metadata (source resource, path, content type) and the content itself (`contentBase64` for raw data, `contentPlaintext` for extracted text).
*   **Data Delivery:** If opened with the `#deliver-to-opener:$origin` hash, the client will prompt the user for confirmation and then send the `ClientFullEHR` object back to the window that opened it using `window.opener.postMessage(data, targetOrigin)`.

### 2. Local MCP Server via Stdio (`src/cli.ts`)

This mode is ideal for running the MCP server locally, often used with tools like Cursor or other command-line AI clients.

*   **Importing a downloaded JSON (`--import-json`):** If you already have a `ClientFullEHR` JSON
    file — e.g. downloaded from the hosted client in section 1 — you can load it straight into a
    database without re-running the SMART flow. This lets you authenticate once against the hosted
    client (using *its* registered client ID, so you don't need to register an app with your health
    system) and then iterate locally against the saved file.
    ```bash
    bun run src/cli.ts \
      --import-json ~/health-records/ehr-data.json \
      --db ~/health-records/my_record.sqlite
    ```
    If the target database already exists the command refuses by default; pass `--force-overwrite`
    to replace it or `--force-concat` to add to it. Then start the server with
    `bun run src/cli.ts --db ~/health-records/my_record.sqlite` as usual.

    **Keep records outside the repo.** These files are real medical records. Prefer a location such
    as `~/health-records/` (`chmod 700`) rather than anywhere in the working tree; `data/` and
    `*.sqlite` are gitignored as a safety net, not as the primary protection.

*   **Combining several health systems (`--source`):** One database can hold records from more than
    one provider. Both `--import-json` and `--create-db` accept `--source <name>`, which labels every
    ingested row with the health system it came from, stored in the `source` column of
    `fhir_resources` and `fhir_attachments` and queryable from the `query_record` tool.

    Refreshing a provider you already have is safe to repeat. Resources upsert on
    `(resource_type, resource_id)`, and attachments are unique on
    `(resource_type, resource_id, path, content_type)`, so re-ingesting the same pull updates rows
    rather than duplicating them.

    ```bash
    # Refresh an existing provider, labelling the records already on file (see below).
    bun run src/cli.ts --db ~/health-records/my_record.sqlite --create-db \
      --force-concat --source "Example Health" --backfill-source

    # Add a second health system to the same database.
    bun run src/cli.ts --db ~/health-records/my_record.sqlite --create-db \
      --force-concat --source "Other Health System"
    ```

    `--backfill-source` stamps the `--source` value onto every row that has **no** source yet. It is
    meant for a database built before the `source` column existed, where the existing records are
    known to come from one provider. It only touches unlabelled rows, so it will never relabel data
    from another health system — but for that reason, pass it only alongside the provider the
    unlabelled records actually came from.

    Note that this records *provenance*, not clinical de-duplication. If two health systems both
    hold the same lab result (common where records are shared between systems), they arrive as two
    resources with different IDs. The `source` column lets you filter to one system where a query
    would otherwise double-count.

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
    *   **Configuration (`config.*.json`):** This process relies on a configuration file (e.g., `config.epicsandbox.json`) which defines available EHR brands/endpoints in a `brandFiles` array. Each entry in this array specifies the brand's details, including:
        *   `url`: Path/URL to the brand definition file (like `static/brands/epic-sandbox.json`).
        *   `tags`: An array of strings (e.g., `["epic", "sandbox"]`) used for categorization or filtering.
        *   `vendorConfig`: Contains SMART on FHIR client details (`clientId`, `scopes`).
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

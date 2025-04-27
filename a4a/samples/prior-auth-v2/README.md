# Prior Authorization Agent V2 Example

This directory contains an example A2A agent that handles prior authorization requests using the V2 Task Processor interface and leverages Google Gemini for policy selection, evaluation, and response drafting.

## Features

*   Uses `A2AServerCoreV2` (implicitly via `startA2AExpressServer` or similar setup).
*   Implements `TaskProcessorV2` with `PriorAuthProcessor.ts`.
*   Loads prior authorization policies from the `./policies` directory.
*   Uses Google Gemini (`@google/genai`) for:
    *   Selecting the relevant policy based on request details.
    *   Evaluating the request against the selected policy.
    *   Drafting the final response message.
*   Expects prior auth requests via the `priorAuthRequest` skill ID, with details in a `DataPart`.

## Prerequisites

*   Bun runtime installed.
*   Node.js environment (for dependencies if not using Bun exclusively).
*   Access to the `@jmandel/a2a-bun-express-server` library (likely linked locally from the parent `a4a` directory or published).
*   A Google Gemini API Key.

## Setup

1.  **Install Dependencies:**
    ```bash
    # cd into this directory (prior-auth-v2)
    bun install 
    # or npm install / yarn install
    ```
2.  **Link Library (if necessary):** If `@jmandel/a2a-bun-express-server` is developed locally in the parent `a4a` directory, ensure it's correctly linked or accessible via relative paths (as currently configured in the source files).
3.  **Set Environment Variable:** Set the `GEMINI_API_KEY` environment variable:
    ```bash
    export GEMINI_API_KEY="YOUR_API_KEY_HERE"
    ```

## Running the Agent

*   **Development (with watch mode):**
    ```bash
    bun run dev
    ```
*   **Production:**
    ```bash
    bun run start
    ```

The server will start, typically on port 3001 unless configured otherwise. Check the console output for the exact URL.

## Sending a Request

You can send a request using `curl` or any HTTP client. The request must be a JSON-RPC call to the `/a2a` endpoint.

**Example Request Body:**

```json
{
  "jsonrpc": "2.0",
  "id": "pa-request-123",
  "method": "tasks/send",
  "params": {
    "metadata": {
      "skillId": "priorAuthRequest"
    },
    "message": {
      "role": "user",
      "parts": [
        {
          "type": "data",
          "data": {
            "procedureCode": "72148",
            "diagnosisCode": "M54.5",
            "clinicalSummary": "Patient presents with low back pain persisting for 8 weeks despite physical therapy and NSAIDs. Examination reveals positive straight leg raise on the right and mild weakness in dorsiflexion. No history of cancer or recent infection."
          }
        }
      ]
    }
  }
}
```

**Example `curl` command:**

```bash
curl -X POST http://localhost:3001/a2a \
     -H "Content-Type: application/json" \
     -d '{
       "jsonrpc": "2.0",
       "id": "pa-request-123",
       "method": "tasks/send",
       "params": {
         "metadata": {
           "skillId": "priorAuthRequest"
         },
         "message": {
           "role": "user",
           "parts": [
             {
               "type": "data",
               "data": {
                 "procedureCode": "72148",
                 "diagnosisCode": "M54.5",
                 "clinicalSummary": "Patient presents with low back pain persisting for 8 weeks despite physical therapy and NSAIDs. Examination reveals positive straight leg raise on the right and mild weakness in dorsiflexion. No history of cancer or recent infection."
               }
             }
           ]
         }
       }
     }'
```

## Important Notes

*   **Gemini API Call:** The `PriorAuthProcessor.ts` file contains the logic for calling the Gemini API. You may need to adjust the specific API call structure (`generateContent` parameters) based on the exact version of the `@google/genai` library you are using. The current code includes linter errors related to this call that need resolution.
*   **Server Setup:** The `server.ts` file uses relative paths to import from the parent `a4a/src` directory. Ensure this structure is correct for your setup.
*   **Error Handling:** The Gemini integration includes basic error handling, but robust production applications would require more comprehensive error management.
*   **Policy Evaluation Logic:** The prompts provided to Gemini for evaluation are examples. They may need refinement for accuracy and consistency depending on the complexity of the policies. 
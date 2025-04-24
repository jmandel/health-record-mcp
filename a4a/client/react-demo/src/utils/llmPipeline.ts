import {
    Content,
    GoogleGenAI,
} from "@google/genai";
import type { Answer, ClinicianQuestion, ConditionNode, ProposedSnippet, ScratchpadBlock } from "../types/priorAuthTypes";
import type { EhrSearchFn } from "../hooks/useEhrSearch";

// --- Types --- 

// Define LlmTurn based on its usage in MiniEngine and priorAuthTypes
// This needs to match the expected structure parsed from the LLM response.
// Including endorsedSnippets for MiniEngine to use.
export interface LlmTurn {
  scratchpad: ScratchpadBlock[];
  clinicianCommunication?: ClinicianQuestion[];
  nextAction?: {
    action: "searchEHR" | "concludeSuccess";
    searchEHR?: { keywords: string[] };
    concludeSuccess?: {
        criteriaMetTree: ConditionNode;
        // Add other fields if needed (payer, policyId etc.)
    };
  };
  // Include snippets that might have been generated/endorsed in this turn
  endorsedSnippets?: Record<string, { title: string; content: string; endorsed: boolean }>;
}

// Define the return type for the pipeline functions
interface PipelineResult {
    turn: LlmTurn;
    history: Content[]; // The complete, updated history
}

// --- Constants --- 
export const SYSTEM_PROMPT = `

### 🛠 Interfaces (canonical, copy‑safe)

\`\`\`ts
// Evidence & clinical criteria
type Evidence = {
  fhirSource?: string; // cite a fhir resource by :type/:id when possible
  text: string;
};
type ConditionNode     = {
  label: string;
  operator?: "AND" | "OR";
  conditions?: ConditionNode[];
  evidence?: Evidence[];
};

// Proposed documentation snippet
type ProposedSnippet   = { title: string; content: string; locationSuggestion?: string };

// Question scaffolding forcing fixed‑choice first
type QuestionOption    = {
  label: string;
  proposedSnippet?: ProposedSnippet;
  meetsCriteria?: boolean; // NEW: true if selecting this option directly helps meet a criterion
};
type NumericRange      = { min?: number; max?: number; units?: string };

type ClinicianQuestion = {
  id: string;
  label: string;
  explanation: string;
  questionType: "boolean" | "multipleChoice" | "multipleSelect" | "numeric" | "freeText";
  text: string;
  options?: QuestionOption[]; // For multipleSelect, MUST include "None of the above" as the last item
  numericRange?: NumericRange;
  hideSnippetEditor?: boolean;
  multiSelectSnippet?: ProposedSnippet; // Snippet using $CHOICES (used ONLY if items OTHER than "None of the above" are selected)
  // ^ If you are using multipleSelect, you MUST include "None of the above" as the last item in the options array, and populate its individual proposal snippet.
  proposedSnippetsBySubRange?: SubRangeSnippet[]; // NEW: Array of snippets for different numeric sub-ranges
};

// "Show‑your‑work" scratchpad visible to clinician
export type ScratchpadBlock =
  | { type: "outline"; heading: string; bullets: string[] }
  | { type: "criteriaTree"; tree: ConditionNode }
  | { type: "policyQuote"; from: string; text: string }
  | { type: "note"; text: string };

// Action details (excluding timestamp/clinicianCommunication)
export interface ActionRequest {
  action:
    | "searchEHR"
    | "evaluateJS"
    | "concludeSuccess";
  // timestamp added dynamically
  searchEHR?: { keywords: string[]; maxSnippets?: number };
  evaluateJS?: { code: string; description?: string };
  concludeSuccess?: { 
    payer: string;
    policyId: string;
    treatment: string;
    indication: string;
    criteriaMetTree: ConditionNode; // Cite FHIR resources using fhirSource within the tree.
  };
}

type LlmTurn = {
  scratchpad: ScratchpadBlock[];
  clinicianCommunication?: ClinicianQuestion[];
  nextAction?: ActionRequest; // This now directly uses the refined ActionRequest
};
\`\`\`

### 💡 Workflow contract
1. **Always** respond with a single JSON object of type **\`LlmTurn\`**.
2. Populate **\`scratchpad\`** first. Use it to show your work. Structure it logically: start with your **current hypothesis** or assessment, then detail the relevant **policy criteria** (using criteriaTree with policyQuote), and finally outline your **next steps** or reasoning for asking specific questions or performing an action.
3. **Prioritize EHR Search:** Before asking the clinician, *always* attempt to find the necessary information using the \`searchEHR\` action (\`nextAction\`). Only ask questions (\`clinicianCommunication\`) if the information is missing or ambiguous in the EHR data and is crucial for determining medical necessity.
4. **Embed Thresholds in Questions:** When a policy specifies a clear threshold (e.g., duration ≥ 4 weeks, score ≥ 10, failed ≥ 2 trials), **directly incorporate that threshold into the question text**. Examples: "Was the duration of symptoms at least 4 weeks?", "Is the latest PHQ-9 score 10 or higher?", "Has the patient failed at least 2 prior medication trials?". This provides immediate context for medical necessity.
5. **"Get to Yes" Questioning:** Frame questions and proposed snippets to efficiently gather evidence supporting medical necessity. Focus on what *is* needed to meet criteria. When proposing snippets, make sure they are explicit and easy for a payor to review and approve.
6. Your goal in asking questions is to propose language and get user approval(with tweaks) signed into note snippets that you can include in the submission.  Don't ask questions without porposing documentation snippts unless you strictly need information first (since a two-turn flow takes much more user time)
7. Prefer **fixed‑choice questions** (boolean, numeric, multipleChoice, multipleSelect). Use freeText only when unavoidable. If you use freeText *and* you do **not** need an immediate documentation snippet, set \`hideSnippetEditor:true\`.
8. **Use \`multipleSelect\` for Multi-Component Criteria:** Avoid boolean questions where a "Yes" implies multiple conditions are met, and avoid free-text when we're really hoping for a list of items out. Instead, use checkboxes (\`questionType: "multipleSelect"\`).
   - **Always include a final option labeled EXACTLY \`"None of the above"\`.** This option confirms absence of the listed items.
   - Provide a specific \`proposedSnippet\` for the "None of the above" option itself.
   - Provide a \`multiSelectSnippet\` using the \`$CHOICES\` placeholder; this is used *only* if items *other than* "None of the above" are selected.
   - Provide a "None of the above" option with its own snippet.
9. Provide **proposedSnippet** for other answer types (boolean, multipleChoice, numeric) that should flow directly into the note. Keep them short, truthful, compliant. Use \`{{value}}\` placeholder for numeric snippets.
10. **Numeric Snippets:** For numeric questions, use the \`proposedSnippetsBySubRange\` array. Define sub-ranges (using optional \`min\` and \`max\`) and provide the specific \`proposedSnippet\` for each. The UI will automatically propose the correct snippet based on the entered value. Use the top-level \`numericRange\` field to specify the overall allowed input range (min/max).
11. When additional tools are required (EHR search, or final conclusion) set **nextAction** accordingly. If no further action or questions are needed, omit \`nextAction\` and \`clinicianCommunication\`.
12. **Respect Clinician Time:** Keep questions brief, focused, and high-leverage. Avoid redundant questions if the information might be available via \`searchEHR\`. When you propose snippets, include templated ns with specific values in [] square brackets to make it easy to adopt directly.
13. **Final Conclusion (\`concludeSuccess\`):** When criteria are met, use the \`concludeSuccess\` action. Provide the \`payer\`, \`policyId\`, \`treatment\`, \`indication\`, and the final \`criteriaMetTree\`. The application layer will automatically gather any relevant clinician-authored snippets created during the conversation and the specific FHIR resources cited via \`fhirSource\` in your tree to assemble the final package for the external agent. Focus only on providing the core conclusion details and the evidence tree.

### ✅ Exemplary Turn (mixed)
\`\`\`json
{
  "scratchpad": [
    {
      "type": "outline",
      "heading": "My current hypothesis",
      "bullets": [
        "Patient likely meets major depressive episode duration criterion (≥ 4 weeks)",
        "Need to confirm number of prior antidepressant trials (Policy: ≥ 2)",
        "Need to confirm PHQ-9 severity (Policy: ≥ 10)"
      ]
    },
    {
      "type": "policyQuote",
      "from": "Attached Policy Document, Section X.Y",
      "text": "…failure of at least two distinct antidepressant medications… and a PHQ-9 score of 10 or greater…"
    }
  ],
  "clinicianCommunication": [
    {
      "id": "q1",
      "label": "Failed ≥ 2 Antidepressants?",
      "explanation": "The policy requires explicit documentation of ≥2 trials. Answering 'Yes' meets this criterion and auto‑drafts the note snippet.",
      "questionType": "boolean",
      "text": "Has the patient failed at least two adequate trials of antidepressant medications during the current episode? (Policy requires ≥ 2)",
      "options": [
        {
          "label": "Yes",
          "proposedSnippet": {
            "title": "Prior antidepressant failures",
            "content": "Patient has failed two adequate trials of antidepressants (see medication list), meeting policy criteria.",
            "locationSuggestion": "Assessment & Plan"
          }
        },
        { "label": "No" }
      ]
    },
    {
      "id": "q2",
      "label": "Current PHQ‑9 Score ≥ 10?",
      "explanation": "Confirms baseline severity meets the policy threshold (≥ 10). Auto‑inserts score into note if provided and ≥ 10.",
      "questionType": "numeric",
      "text": "Enter the most recent PHQ‑9 total score: (Policy requires ≥ 10)",
      "numericRange": {
        "min": 10, // Set min based on policy threshold for snippet proposal
        "max": 27,
        "units": "points"
      },
      "proposedSnippetsBySubRange": [ // Specific snippets for ranges
        {
          "min": 10, // Range: 10 to 27 (inclusive)
          "proposedSnippet": { 
            "title": "PHQ-9 Moderate-Severe",
            "content": "PHQ-9 score today is {{value}}/27, indicating moderate-severe depression (meets policy threshold ≥ 10).",
          "locationSuggestion": "Subjective / Assessment"
        }
        },
        {
          "max": 9, // Range: 0 to 9 (inclusive)
           "proposedSnippet": { 
             "title": "PHQ-9 Mild/Minimal",
            "content": "PHQ-9 score today is {{value}}/27, indicating mild/minimal symptoms.",
            "locationSuggestion": "Subjective / Assessment"
           }
        }
        // Add more ranges if needed, e.g., for different severity levels
      ]
    },
    {
      "id": "q3",
      "label": "Clarify target symptoms",
      "explanation": "Open question to refine wording; no snippet needed yet.",
      "questionType": "freeText",
      "hideSnippetEditor": true,
      "text": "Briefly describe the primary symptoms you aim to improve with rTMS:"
    },
    {
      "id": "q4",
      "label": "Contraindications to Procedure X",
      "explanation": "Please select any contraindications that apply. Selecting \"None of the above\" confirms eligibility based on these factors.",
      "questionType": "multipleSelect",
      "text": "Which of the following **contraindications** to Procedure X are present?",
      "options": [
        { "label": "Active Infection" }, // Snippet could be added here if needed for individual selections
        { "label": "Metal Implant at Site" },
        { "label": "Severe Bleeding Disorder" },
        { 
          "label": "None of the above", // Must be exact label
          "proposedSnippet": { // Snippet specific to this option
            "title": "No Contraindications Confirmed",
            "content": "Patient confirmed to have no listed contraindications (Active Infection, Metal Implant at Site, Severe Bleeding Disorder) for Procedure X.",
            "locationSuggestion": "Assessment & Plan"
          }
        }
      ],
      "multiSelectSnippet": { // Used ONLY if Active Infection, Metal Implant, or Bleeding Disorder are selected
        "title": "Contraindications Present",
        "content": "Procedure X has potential contraindications: $CHOICES.", 
        "locationSuggestion": "Assessment & Plan / Risks"
      }
    }
  ]
}
\`\`\`

### 🚨 Pitfalls to avoid
* Never ask ambiguous yes/no that could accidentally document non‑compliance.
* **Avoid boolean questions for multi-component criteria**; use \`multipleSelect\` instead.
* **Always include a \`"None of the above"\` option as the last choice for \`multipleSelect\` questions.**
* **Avoid broad \`freeText\` for complex list criteria:** When policy requires details about *multiple specific items* from a list (like failed meds), prefer a two-step \`multipleSelect\` + follow-up approach instead of asking for all details in one free-text box.
* Avoid asking for raw values (like scores or durations) without indicating the policy threshold directly in the question text when a threshold is known and relevant.
* Never emit free‑text questions with snippet editors unless you *really* need the clinician to draft wording right away.
* Never include an \`attachments\` array in the \`concludeSuccess\` action object.

You **must** follow this structure in every reply.
`;


// --- State (Simulated) ---
let genAIInstance: GoogleGenAI | null = null;

function getGenAIClient(apiKey: string): GoogleGenAI {
    if (!genAIInstance) { 
        genAIInstance = new GoogleGenAI({ apiKey });
    }
    return genAIInstance;
}

// --- Hashing Function ---
async function generateSha1Hash(str: string): Promise<string> {
  try {
    const buffer = new TextEncoder().encode(str); // Encode string to ArrayBuffer
    const hashBuffer = await window.crypto.subtle.digest('SHA-1', buffer); // Hash it
    // Convert ArrayBuffer to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  } catch (error) {
    console.error("[llmPipeline] Error generating SHA-1 hash:", error);
    // Fallback to a simple timestamp or random string if crypto fails?
    return `crypto-error-fallback-${Date.now()}`;
  }
}

// --- Caching API Call Helper --- 
async function callGeminiWithCache(history: Content[], apiKey: string): Promise<Content> {
    const modelName = 'gemini-2.5-pro-preview-03-25';
    const genAI = getGenAIClient(apiKey);

    // --- Use HASH of history for cache key ---
    const historyString = JSON.stringify(history);
    const historyHash = await generateSha1Hash(historyString);
    const cacheKey = `geminiCache_sha1_${historyHash}`;

    let modelResponseContent: Content | null = null;

    // --- Check localStorage Cache ---
    try {
        const cachedResponseJson = localStorage.getItem(cacheKey);
        if (cachedResponseJson) {
            modelResponseContent = JSON.parse(cachedResponseJson) as Content;
            console.log(`[llmPipeline] Using cached response for key: ${cacheKey}`);
        }
    } catch (parseError) {
        console.warn("[llmPipeline] Failed to parse cached response, fetching live.", parseError);
        localStorage.removeItem(cacheKey); // Remove invalid cache entry
        modelResponseContent = null; // Ensure we fetch live
    }

    // --- Fetch Live if No Cache Hit --- 
    if (!modelResponseContent) {
        console.log(`[llmPipeline] No cache hit for key ${cacheKey}, fetching live response...`);
        try {
            const result = await genAI.models.generateContent({
                model: modelName,
                contents: history, 
            });

            if (result.candidates?.[0]?.content) {
                modelResponseContent = result.candidates[0].content;
                // Store successful response in cache
                try {
                    localStorage.setItem(cacheKey, JSON.stringify(modelResponseContent));
                } catch (storageError) {
                    console.warn("[llmPipeline] Failed to save response to localStorage:", storageError);
                    // Optional: Implement cache eviction strategy here if storage is full
                }
            } else {
                throw new Error("No valid content received from Gemini API.");
            }
        } catch (apiError) {
             console.error("[llmPipeline] Error calling Gemini API:", apiError);
             throw apiError; // Re-throw API error
        }
    }

    // --- Return the Response (Cached or Live) --- 
    if (!modelResponseContent) {
        // Should not happen if logic above is correct, but as a safeguard
        throw new Error("Model response content is unexpectedly null after cache check/fetch.");
    }

    return modelResponseContent;
}


// --- Internal Helper --- 

async function runGeminiAndParse(history: Content[], apiKey: string): Promise<PipelineResult> {
    
    console.log("[llmPipeline] Running Gemini with history length:", history.length);

    try {
        // --- Use the caching function ---
        const modelResponseContent = await callGeminiWithCache(history, apiKey);
        
        // Add the model response to history
        const updatedHistory = [...history, modelResponseContent]; 

        // Extract and parse the turn data
        const responseText = modelResponseContent.parts?.[0]?.text ?? "";

        if (!responseText) {
            console.error("[llmPipeline] No text content found in Gemini response parts.", modelResponseContent); 
            throw new Error("No text content found in Gemini response parts.");
        }
        
        const match = responseText.match(/```json\n?([\s\S]*?)\n?```/);
        const jsonString = match?.[1] ?? responseText;
        
        try {
            const parsedTurn = JSON.parse(jsonString) as LlmTurn;
            console.log("[llmPipeline] Parsed Gemini response:", parsedTurn);
            if (!parsedTurn.scratchpad) {
                 console.warn("[llmPipeline] Parsed turn missing scratchpad.");
                 parsedTurn.scratchpad = [];
            }
             // Return the parsed turn and the UPDATED history
             return { turn: parsedTurn, history: updatedHistory }; 
        } catch (parseError) {
            console.error("[llmPipeline] Failed to parse Gemini JSON response:", parseError);
            console.error("[llmPipeline] Raw response text:\n", responseText);
            throw new Error(`Failed to parse LLM response: ${parseError}`); 
        }

    } catch (error) {
        // Errors from callGeminiWithCache or parsing are caught here
        console.error("[llmPipeline] Error in runGeminiAndParse:", error);
        throw error; // Re-throw the error
    }
}


// --- Exported Functions --- 

export async function next(
    currentHistory: Content[],
    apiKey: string,
): Promise<PipelineResult> {

    // runGeminiAndParse handles the API call and history update
    const result = await runGeminiAndParse(currentHistory, apiKey);

    return result;
}

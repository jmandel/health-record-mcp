import {
  Content,
  GenerationConfig,
  GoogleGenAI,
  SafetySetting
} from "@google/genai";
import { useCallback, useEffect, useReducer, useRef, useMemo, useState } from 'react';
import type { EhrSearchFn } from './useEhrSearch';
// Import from the new shared location
import type {
  ClinicianQuestion,
  ConditionNode,
  LlmTurn,
  ScratchpadBlock
} from '../types/priorAuthTypes'; // <-- Updated path

const SYSTEM_PROMPT = `

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


// --- Intent Types ---
// TODO: Define EvidenceBundle structure if needed for SUCCESS, or remove for now
// export interface EvidenceBundle { ... }

export type ClinicianIntent =
  | { type:'ASK';    questions: ClinicianQuestion[]; }
  | { type:'SUCCESS'; criteriaTree: ConditionNode; /* evidenceBlob: EvidenceBundle */ }
  | { type:'FAIL';   reason: string; unmetTree?: ConditionNode };

// --- Hook Options (Renamed) ---
export interface UseMedicalNecessityLlmOpts {
  apiKey: string;
  ehrSearch: EhrSearchFn;                 // injected search impl
  onIntent: (i: ClinicianIntent) => void; // mandatory callback
  // Optional config for Gemini model
  modelName?: string;
  geminiConfig?: GenerationConfig; 
  safetySettings?: SafetySetting[]; 
}

// --- NEW: Args for start function (Reverted) ---
interface StartLlmArgs {
    patientDetails: string;
    treatment: string;
    indication: string;
    policyFileBase64: string; // Raw base64 data
    policyMimeType: string;   // e.g., 'application/pdf' or 'text/markdown'
}

// --- Hook Return API (Renamed) ---
export interface UseMedicalNecessityLlmApi {
  start: (args: StartLlmArgs) => void;
  submitAnswers: (answers: Record<string, { value: string; snippet?: string }>) => void;
  resumeEvaluation: (message: string) => void;
  cancel: () => void;
  isLoading: boolean;
  error: Error | null;
  scratchpad: ScratchpadBlock[] | null;
  lastEhrSearchKeywords: string[] | null;
  lastEhrSearchResultCount: number | null;
  endorsedSnippets: Record<string, { title: string; content: string; endorsed: boolean }>;
}

// --- Simplified internal logic below ---
// Reducer: only tracks high-level phase and error
type Phase = 'idle'|'calling'|'awaiting_answers'|'done'|'error';
type Act =
  | { type: 'START' }
  | { type: 'ASK' }
  | { type: 'DONE' }
  | { type: 'ERROR'; err: Error };
interface State { phase: Phase; error?: Error; }

const reducer = (state: State, action: Act): State => {
  switch (action.type) {
    case 'START': return { phase: 'calling' };
    case 'ASK':   return { phase: 'awaiting_answers' };
    case 'DONE':  return { phase: 'done' };
    case 'ERROR': return { phase: 'error', error: action.err };
    default:      return state;
  }
};

// Debug helper
const debug = (...msgs: any[]) => {
  if (process.env.NODE_ENV !== 'production') console.log(...msgs);
};

// --- NEW: Standard Hashing Function (SHA-1 using SubtleCrypto) ---
async function generateSha1Hash(str: string): Promise<string> {
  try {
    const buffer = new TextEncoder().encode(str); // Encode string to ArrayBuffer
    const hashBuffer = await window.crypto.subtle.digest('SHA-1', buffer); // Hash it
    // Convert ArrayBuffer to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  } catch (error) {
    console.error("Error generating SHA-1 hash:", error);
    // Fallback to a simple timestamp or random string if crypto fails?
    // For now, just return a fixed string to avoid breaking cache logic entirely.
    return 'crypto-error-fallback';
  }
}

// Simplified hook implementation
export function useMedicalNecessityLlm(opts: UseMedicalNecessityLlmOpts): UseMedicalNecessityLlmApi {
  const {
    apiKey,
    ehrSearch,
    onIntent,
    modelName = 'gemini-2.5-pro-preview-03-25',
    geminiConfig,
    safetySettings
  } = opts;

  const genAIRef = useRef(new GoogleGenAI({ apiKey }));
  const historyRef = useRef<Content[]>([]);
  // Debug state: scratchpad and EHR search info
  const [scratchpad, setScratchpad] = useState<ScratchpadBlock[] | null>(null);
  // NEW: endorsed (clinician-accepted) documentation snippets
  const [endorsedSnippets, setEndorsedSnippets] = useState<Record<string, { title: string; content: string; endorsed: boolean }>>({});
  const [lastEhrSearchKeywords, setLastEhrSearchKeywords] = useState<string[] | null>(null);
  const [lastEhrSearchResultCount, setLastEhrSearchResultCount] = useState<number | null>(null);
  const [{ phase, error }, dispatch] = useReducer(reducer, { phase: 'idle' });

  // --- Stale Closure Prevention for onIntent --- 
  const onIntentRef = useRef(onIntent);
  useEffect(() => { onIntentRef.current = onIntent; }, [onIntent]);

  const safeEmitIntent = useCallback(
    (intent: ClinicianIntent) => onIntentRef.current(intent),
    [] // Stable reference
  );
  // --------------------------------------------

  const runGemini = useCallback(async () => {
    // Reset debug state on each invocation
    dispatch({ type: 'START' });
    // --- Use HASH of history for cache key ---
    const historyString = JSON.stringify(historyRef.current);
    // Await the async hash generation
    const historyHash = await generateSha1Hash(historyString);
    const cacheKey = `geminiCache_sha1_${historyHash}`;
    // -----------------------------------------
    try {
      // --- Check localStorage Cache ---
      const cachedResponseJson = localStorage.getItem(cacheKey);
      let modelResponseContent: Content | null = null;

      if (cachedResponseJson) {
        try {
          modelResponseContent = JSON.parse(cachedResponseJson) as Content;
          // Log the HASH, not the full content
          console.log(`[useMedicalNecessityLlm] Using cached response for key: ${cacheKey}`);
        } catch (parseError) {
          console.warn("[useMedicalNecessityLlm] Failed to parse cached response, fetching live.", parseError);
          localStorage.removeItem(cacheKey); // Remove invalid cache entry
        }
      }

      // --- Fetch Live if No Cache Hit --- 
      if (!modelResponseContent) {
        // Log HASH on live fetch too
        console.log(`[useMedicalNecessityLlm] No cache hit for key ${cacheKey}, fetching live response...`);
        const result = await genAIRef.current.models.generateContent({
          model: modelName,
          contents: historyRef.current, // Still send the full contents
          ...(geminiConfig ? { generationConfig: geminiConfig } : {}),
          ...(safetySettings ? { safetySettings } : {})
        });

        if (result.candidates?.[0]?.content) {
          modelResponseContent = result.candidates[0].content;
          try {
            // Store using the HASH key
            localStorage.setItem(cacheKey, JSON.stringify(modelResponseContent));
          } catch (storageError) {
            console.warn("[useMedicalNecessityLlm] Failed to save response to localStorage:", storageError);
            // Optionally implement cache eviction strategy here if storage is full
          }
        } else {
          throw new Error("No valid content received from Gemini API.");
        }
      }

      // --- Process the Response (Cached or Live) --- 
      if (!modelResponseContent) {
        // Should not happen if logic above is correct, but as a safeguard
        throw new Error("Model response content is unexpectedly null after cache check/fetch.");
      }

      // Add the response (cached or live) to history *before* processing actions
      if (modelResponseContent) {
        historyRef.current.push(modelResponseContent);
      } else {
        console.warn("[useMedicalNecessityLlm] Cannot add null model content to history.");
      }

      // Extract turn data from the response text
      const raw = modelResponseContent.parts?.[0]?.text || '';
      const match = raw.match(/```json\n([\s\S]*?)\n```/);
      const turn = JSON.parse(match?.[1] ?? raw) as LlmTurn;

      setLastEhrSearchKeywords(null);
      setLastEhrSearchResultCount(null);
      setScratchpad(turn.scratchpad || []);

      // 1) Inline EHR search
      if (turn.nextAction?.action === 'searchEHR') {
        const keywords = turn.nextAction.searchEHR!.keywords;
        // Update EHR search keywords
        setLastEhrSearchKeywords(keywords);
        debug('searchEHR with keywords', keywords);
        const res = await ehrSearch(keywords);
        // Update count of search hits (non-empty lines)
        const count = res.md ? res.md.split('\n').filter(l => l.trim()).length : 0;
        setLastEhrSearchResultCount(count);
        historyRef.current.push({ role: 'user', parts: [{ text: res.md }] });
        await runGemini();
        return;
      }

      // 2) Ask clinician questions
      if (turn.clinicianCommunication?.length) {
        safeEmitIntent({ type: 'ASK', questions: turn.clinicianCommunication });
        dispatch({ type: 'ASK' });
        return;
      }

      // 3) Conclude success or fail
      if (turn.nextAction?.action === 'concludeSuccess' && turn.nextAction.concludeSuccess) {
        safeEmitIntent({ type: 'SUCCESS', criteriaTree: turn.nextAction.concludeSuccess.criteriaMetTree });
      } else {
        safeEmitIntent({ type: 'FAIL', reason: 'Workflow ended without explicit success action.' });
      }
      dispatch({ type: 'DONE' });
    } catch (err: any) {
      debug('Gemini error', err);
      const errorObj = err instanceof Error ? err : new Error(String(err));
      dispatch({ type: 'ERROR', err: errorObj });
      safeEmitIntent({ type: 'FAIL', reason: errorObj.message });
    }
  }, [ehrSearch, safeEmitIntent, modelName, geminiConfig, safetySettings]);

  const start = (args: StartLlmArgs) => {
    // Reset debug state on new start
    setScratchpad(null);
    setLastEhrSearchKeywords(null);
    setLastEhrSearchResultCount(null);
    historyRef.current = [{
      role: 'user',
      parts: [
        { text: `${SYSTEM_PROMPT}\n\n## Patient & Request\n${args.patientDetails}\n\nTreatment: ${args.treatment}\nIndication: ${args.indication}` },
        { inlineData: { data: args.policyFileBase64, mimeType: args.policyMimeType } }
      ]
    }];
    runGemini();
  };

  const submitAnswers = (answers: Record<string, { value: string; snippet?: string }>) => {
    if (phase !== 'awaiting_answers') return;
    // --- NEW: accumulate endorsed snippets ---
    setEndorsedSnippets(prev => {
      const updated = { ...prev };
      Object.entries(answers).forEach(([qid, ans]) => {
        if (ans.snippet?.trim()) {
          const existing = updated[qid];
          updated[qid] = {
            title: qid,
            content: ans.snippet,
            endorsed: existing?.endorsed ?? true,
          };
        }
      });
      return updated;
    });

    historyRef.current.push({
      role: 'user',
      parts: [{ text: JSON.stringify({ answers }) }]
    });
    runGemini();
  };

  // --- NEW: Resume Evaluation --- 
  const resumeEvaluation = useCallback((message: string) => {
    // Allow resuming unless actively calling the LLM
    if (phase === 'calling') {
      console.warn("[useMedicalNecessityLlm] Cannot resume evaluation while LLM call is in progress.");
      return;
    }
    console.log("[useMedicalNecessityLlm] Resuming evaluation with new message:", message);
    // Convert A2A Message to Gemini Content (assuming only text parts for now)
    const geminiContent: Content = {
      role: 'user',
      parts: [{ text: message }]
    };
    historyRef.current.push(geminiContent);
    runGemini();
  }, [phase, runGemini]); // Depend on phase and runGemini

  const cancel = () => dispatch({ type: 'DONE' });

  return {
    start,
    submitAnswers,
    resumeEvaluation,
    cancel,
    isLoading: phase === 'calling',
    error: error ?? null,
    scratchpad,
    lastEhrSearchKeywords,
    lastEhrSearchResultCount,
    endorsedSnippets
  };
}
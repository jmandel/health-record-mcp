import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Content, GoogleGenAI } from "@google/genai";
import { useEhrContext } from "../../context/EhrContext";
import { grepRecordLogic } from "../../tools";
// A2A Imports
import { useTaskLiaison } from "../../hooks/useTaskLiaison";
import type { Message, Task, Part, FilePart } from '@a2a/client/src/types'; // A2A types

// ─────────────────────────────────────────────────────────────────────────────
// 1. INTERFACES ─ complete definitions used by the LLM and the UI
// ─────────────────────────────────────────────────────────────────────────────
export interface Evidence {
  /** Format "ResourceType/ID", e.g. "Observation/12345" */
  fhirSource?: string;
  /** Human‑readable snippet that supports this condition */
  text: string;
}

export interface ConditionNode {
  label: string;
  operator?: "AND" | "OR"; // required if conditions present
  conditions?: ConditionNode[];
  evidence?: Evidence[];
}

export interface ProposedSnippet {
  title: string;
  content: string;
  /** Suggested location within note – e.g. "Assessment & Plan" */
  locationSuggestion?: string;
}

export interface QuestionOption {
  label: string;
  proposedSnippet?: ProposedSnippet;
}

export interface NumericRange {
  min?: number;
  max?: number;
  units?: string;
  proposedSnippetIfWithinRange?: ProposedSnippet;
}

export interface ClinicianQuestion {
  id: string;
  label: string;
  explanation: string;
  /** Enforced input modality */
  questionType: "boolean" | "multipleChoice" | "numeric" | "freeText" | "multipleSelect";
  text: string;
  options?: QuestionOption[]; // For multipleSelect, MUST include "None of the above" as the last item
  numericRange?: NumericRange;
  /** When true UI suppresses snippet editor even if proposedSnippet present */
  hideSnippetEditor?: boolean;
  /** Snippet specifically for multipleSelect, uses $CHOICES placeholder (used ONLY if items OTHER than "None of the above" are selected)*/
  multiSelectSnippet?: ProposedSnippet;
  // ^ If you are using multipleSelect, you MUST include "None of the above" as the last item in the options array, and populate its individual proposal snippet.
}

export interface Attachment {
  fhirSource?: string;
  text: string;
}

// Note: ActionRequest is now part of LlmTurn's nextAction
export interface ActionRequest {
  action:
    | "searchEHR"
    | "evaluateJS"
    | "clinicianCommunication" // This is technically handled by LlmTurn.clinicianCommunication
    | "concludeSuccess" ;
  timestamp: string;
  searchEHR?: { keywords: string[]; maxSnippets?: number };
  evaluateJS?: { code: string; description?: string };
  // clinicianCommunication is handled separately in LlmTurn
  concludeSuccess?: {
    payer: string;
    policyId: string;
    treatment: string;
    indication: string;
    criteriaMetTree: ConditionNode;
    attachments?: Attachment[];
  };
}

// ───── Scratchpad blocks (model "shows its work")
export type ScratchpadBlock =
  | { type: "outline"; heading: string; bullets: string[] }
  | { type: "criteriaTree"; tree: ConditionNode }
  | { type: "policyQuote"; from: string; text: string }
  | { type: "note"; text: string };

export interface LlmTurn {
  scratchpad: ScratchpadBlock[];
  clinicianCommunication?: ClinicianQuestion[];
  nextAction?: Omit<ActionRequest, "clinicianCommunication" | "timestamp">; // Exclude timestamp too, add later
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. UPDATED SYSTEM PROMPT – exhaustive, example‑rich (triple back‑tick json
//    blocks maintained so the LLM can copy/paste).
// ─────────────────────────────────────────────────────────────────────────────
// NOTE: $POLICY_MARKDOWN placeholder needs actual policy text injected
//       if we are not sending the PDF separately. For now, assume PDF is sent.
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
type QuestionOption    = { label: string; proposedSnippet?: ProposedSnippet };
type NumericRange      = { min?: number; max?: number; units?: string; proposedSnippetIfWithinRange?: ProposedSnippet };

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
    criteriaMetTree: ConditionNode;
    attachments?: Attachment[];
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
6. Your goal in asking questions is to reduce your own uncertainty or (better!) propose language and get usreer approval/twaksn signed note snippets to include in the submission.
7. Prefer **fixed‑choice questions** (boolean, numeric, multipleChoice, multipleSelect). Use freeText only when unavoidable. If you use freeText *and* you do **not** need an immediate documentation snippet, set \`hideSnippetEditor:true\`.
8. **Use \`multipleSelect\` for Multi-Component Criteria:** Avoid boolean questions where a "Yes" implies multiple conditions are met, and avoid free-text when we're really hoping for a list of items out. Instead, use checkboxes (\`questionType: "multipleSelect"\`).
   - **Always include a final option labeled EXACTLY \`"None of the above"\`.** This option confirms absence of the listed items.
   - Provide a specific \`proposedSnippet\` for the "None of the above" option itself.
   - Provide a \`multiSelectSnippet\` using the \`$CHOICES\` placeholder; this is used *only* if items *other than* "None of the above" are selected.
   - Provide a "None of the above" option with its own snippet.
9. Provide **proposedSnippet** for other answer types (boolean, multipleChoice, numeric) that should flow directly into the note. Keep them short, truthful, compliant. Use \`{{value}}\` placeholder for numeric snippets.
10. When additional tools are required (EHR search, or final conclusion) set **nextAction** accordingly. If no further action or questions are needed, omit \`nextAction\` and \`clinicianCommunication\`.
11. **Respect Clinician Time:** Keep questions brief, focused, and high-leverage. Avoid redundant questions if the information might be available via \`searchEHR\`. When you propose snippets, include templated ns with specific values in [] square brackets to make it easy to adopt directly.

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
        "units": "points",
        "proposedSnippetIfWithinRange": {
          "title": "Baseline PHQ‑9 meets threshold",
          "content": "PHQ‑9 score today is {{value}}/27, meeting the policy requirement of ≥ 10.",
          "locationSuggestion": "Subjective / Assessment"
        }
      }
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

You **must** follow this structure in every reply.
`;

// ─────────────────────────────────────────────────────────────────────────────
// 3. REACT COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

// 🍱 Scratchpad renderer – shows model reasoning blocks
const Scratchpad: React.FC<{ blocks: ScratchpadBlock[] }> = ({ blocks }) => (
  <div className="scratchpad">
    {blocks.map((b, i) => {
      switch (b.type) {
        case "outline":
          return (
            <div key={i} className="pad-block pad-outline">
              <h4 className="pad-heading">{b.heading}</h4>
              <ul className="pad-list">{b.bullets.map((t, j) => <li key={j}>{t}</li>)}</ul>
            </div>
          );
        case "policyQuote":
          return (
            <blockquote key={i} className="pad-block pad-quote">
              <cite className="pad-cite">{b.from}</cite>
              <p>{b.text}</p>
            </blockquote>
          );
        case "criteriaTree":
          return (
            <div key={i} className="pad-block pad-tree">
                {/* Optionally add a heading */}
                {/* <h4 className="pad-heading">Criteria Tree</h4> */}
                <CriteriaTree node={b.tree} />
            </div>
          );
        case "note": // Updated to handle 'note' type
            return (
                <div key={i} className="pad-block pad-note">
                  <p>{b.text}</p>
                </div>
            );
        default:
            // Fallback for unknown types or if 'text' is expected but missing
             // Check if the block has a 'text' property for the default case
            const blockWithText = b as { text?: string };
            if (blockWithText.text) {
                return <p key={i} className="pad-block pad-unknown">{blockWithText.text}</p>;
            }
            console.warn("Unknown or invalid scratchpad block type:", b);
            return <div key={i} className="pad-block pad-unknown">[Unknown Scratchpad Content]</div>;
      }
    })}
  </div>
);

// CriteriaTree unchanged from original (can be reused as is)
const CriteriaTree: React.FC<{ node: ConditionNode }> = ({ node }) => (
  <ul className="criteria-tree-list">
    <li>
      <span className="criteria-label">{node.label}</span>
      {node.operator && (
        <span className="criteria-operator">({node.operator})</span>
      )}
      {node.evidence && (
        <ul className="evidence-list">
          {node.evidence.map((e, i) => (
            <li key={i} title={e.fhirSource || "No FHIR Source"}>{e.text}</li>
          ))}
        </ul>
      )}
      {node.conditions?.map((c, i) => (
        <CriteriaTree key={i} node={c} />
      ))}
    </li>
  </ul>
);


// QuestionCard – only change: guard snippet editor visibility
interface QuestionCardProps { 
    question: ClinicianQuestion; 
    currentAnswer: { value: string; snippet: string } | undefined; 
  onAnswer: (
    id: string,
    value: string,
    snippet: string,
    type: ClinicianQuestion["questionType"]
  ) => void;
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  currentAnswer,
  onAnswer,
}) => {
  const [inputValue, setInputValue] = useState<string>(currentAnswer?.value || "");
  const [selectedLabel, setSelectedLabel] = useState<string | undefined>(
    // Initialize based on question type and current answer
    (question.questionType === 'boolean' || question.questionType === 'multipleChoice') ? currentAnswer?.value : undefined
  );
  // --- NEW State for multiple selections ---
  // Store selected checkbox labels in a Set for easy add/remove
  const [selectedMultiValues, setSelectedMultiValues] = useState<Set<string>>(new Set());
  // Store the generated snippet for multi-select separately
  const [multiSelectSnippetContent, setMultiSelectSnippetContent] = useState<string>("");
  // --- END NEW State ---
  const [snippetContent, setSnippetContent] = useState<string>(
    currentAnswer?.snippet || ""
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Effect to initialize state based on currentAnswer prop and question type
  useEffect(() => {
    const answerValue = currentAnswer?.value;
    const answerSnippet = currentAnswer?.snippet || "";
    setSnippetContent(answerSnippet);

    if (question.questionType === 'numeric' || question.questionType === 'freeText') {
        setInputValue(answerValue || "");
      setSelectedLabel(undefined);
      setSelectedMultiValues(new Set()); // Clear multi-select
      // Handle numeric range snippet logic on load
        if (question.questionType === 'numeric' && question.numericRange?.proposedSnippetIfWithinRange && answerValue) {
            const numValue = parseFloat(answerValue);
          const { min, max, proposedSnippetIfWithinRange } = question.numericRange;
            if (!isNaN(numValue) && (min === undefined || numValue >= min) && (max === undefined || numValue <= max)) {
              // If no snippet was saved, use the proposed one
              if (!answerSnippet) {
                  setSnippetContent(proposedSnippetIfWithinRange.content.replace('{{value}}', answerValue) || "");
              }
            } else {
              // If out of range or not a number, clear snippet unless one was saved
              if (!answerSnippet) setSnippetContent("");
          }
      } else if (question.questionType === 'freeText') {
          // Free text: keep saved snippet, otherwise empty
           if (!answerSnippet) setSnippetContent("");
      }
    } else if (question.questionType === 'multipleSelect') {
        setInputValue("");
        setSelectedLabel(undefined);
        // Initialize selectedMultiValues from comma-separated string in answerValue
        const initialMulti = new Set(answerValue ? answerValue.split(',').map(s => s.trim()).filter(Boolean) : []);
        setSelectedMultiValues(initialMulti);
        // Initialize snippet (or generate if needed)
        if (!answerSnippet && question.multiSelectSnippet && initialMulti.size > 0) {
            const choicesString = Array.from(initialMulti).join(', ');
            setSnippetContent(question.multiSelectSnippet.content.replace('$CHOICES', choicesString));
        }
    } else { // boolean or multipleChoice
        setSelectedLabel(answerValue);
      setInputValue("");
      setSelectedMultiValues(new Set()); // Clear multi-select
      // Handle boolean/multi-choice snippet logic on load
        if (answerValue) {
            const opt = question.options?.find(o => o.label === answerValue);
          // If no snippet was saved, use the proposed one from the selected option
          if (!answerSnippet) {
              setSnippetContent(opt?.proposedSnippet?.content || "");
          }
        } else {
          // If no answer selected, clear snippet unless one was saved
           if (!answerSnippet) setSnippetContent("");
      }
    }
  }, [currentAnswer, question]);

  // Handler for Radio button selection (boolean/multipleChoice)
  const handleRadioSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const label = event.target.value;
    setSelectedLabel(label);
    setInputValue(""); // Clear numeric/text input if radio selected
    const opt = question.options?.find(o => o.label === label);
    const proposedSnippet = opt?.proposedSnippet?.content || "";
    setSnippetContent(proposedSnippet);
    onAnswer(question.id, label, proposedSnippet, question.questionType);
  };

  // --- NEW Handler for Checkbox changes (multipleSelect) ---
  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const { value: label, checked } = event.target;
      const isNoneOfTheAbove = label === "None of the above";
      let currentSelected = new Set(selectedMultiValues);

      if (isNoneOfTheAbove) {
          if (checked) {
              // If "None" is checked, clear others and select only "None"
              currentSelected = new Set([label]);
          } else {
              // If "None" is unchecked, just remove it (leaving others if any)
              currentSelected.delete(label);
          }
      } else {
          // If any other item is changed
          if (checked) {
              // Add the item and remove "None" if present
              currentSelected.add(label);
              currentSelected.delete("None of the above");
          } else {
              // Just remove the item
              currentSelected.delete(label);
          }
      }

      setSelectedMultiValues(currentSelected);
      setSelectedLabel(undefined); // Clear single select
      setInputValue(""); // Clear text input

      // Generate value string (comma-separated labels)
      const valueString = Array.from(currentSelected).join(', ');

      // --- Snippet Generation Logic --- (Updated)
      let currentSnippet = "";
      const noneIsSelected = currentSelected.has("None of the above");

      if (noneIsSelected && currentSelected.size === 1) {
          // Only "None of the above" is selected
          const noneOption = question.options?.find(o => o.label === "None of the above");
          if (noneOption?.proposedSnippet) {
              currentSnippet = noneOption.proposedSnippet.content;
          }
      } else if (currentSelected.size > 0 && !noneIsSelected) {
          // Other items are selected (and "None" isn't)
          if (question.multiSelectSnippet) {
              // Filter out "None" just in case, though logic above should prevent it
              const choicesString = Array.from(currentSelected)
                  .filter(item => item !== "None of the above")
                  .join(', ');
              currentSnippet = question.multiSelectSnippet.content.replace('$CHOICES', choicesString);
          }
      } 
      // If nothing is selected, currentSnippet remains ""

      setSnippetContent(currentSnippet); // Update snippet state

      // Call onAnswer with the updated value string and snippet
      onAnswer(question.id, valueString, currentSnippet, question.questionType);
  };
  // --- END NEW Handler ---

  // Handler for Numeric/FreeText input changes
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.value;
    setInputValue(value);
    setSelectedLabel(undefined); // Clear radio selection
    setSelectedMultiValues(new Set()); // Clear multi-select
    let currentSnippet = ""; // Start with empty snippet
    if (question.questionType === 'numeric' && question.numericRange?.proposedSnippetIfWithinRange) {
        const numValue = parseFloat(value);
        const { min, max, proposedSnippetIfWithinRange } = question.numericRange;
        if (!isNaN(numValue) && (min === undefined || numValue >= min) && (max === undefined || numValue <= max)) {
            // Value is within range, use the proposed snippet, replacing placeholder
            currentSnippet = proposedSnippetIfWithinRange.content.replace('{{value}}', value);
        }
        // Set snippet state - this will be sent back unless manually edited
            setSnippetContent(currentSnippet);
    } else if (question.questionType === 'freeText') {
         // For free text, no automatic snippet proposal. Keep manual edits or stay empty.
         // Retain the current snippetContent unless manually changed later.
         currentSnippet = snippetContent; // Keep existing manually edited snippet if any
    } else {
         // Should not happen if input type matches question type, but clear snippet just in case
         setSnippetContent("");
         currentSnippet = "";
    }
    
    // Pass back the input value and the *potentially* updated snippet
    onAnswer(question.id, value, currentSnippet, question.questionType);
  };

  // Handler for manually editing ANY proposed snippet
  const handleSnippetChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newSnippetContent = e.target.value;
      setSnippetContent(newSnippetContent);
      // Determine the primary value (selectedLabel, multi-select string, or inputValue)
      let primaryValue = "";
      if (question.questionType === 'multipleSelect') {
           primaryValue = Array.from(selectedMultiValues).join(', ');
      } else {
          primaryValue = selectedLabel || inputValue || "";
      }
      onAnswer(question.id, primaryValue, newSnippetContent, question.questionType); 
  };

  // --- Update shouldShowSnippetEditor logic ---
  const shouldShowSnippetEditor = useMemo(() => {
      if (question.hideSnippetEditor) return false;

      const noneIsSelected = selectedMultiValues.has("None of the above");
      const noneOption = question.options?.find(o => o.label === "None of the above");

      if (selectedLabel) { // Boolean or MultiChoice
          const opt = question.options?.find(o => o.label === selectedLabel);
          return !!opt?.proposedSnippet || snippetContent.trim() !== '';
      } else if (question.questionType === 'multipleSelect') { 
          // Show if "None" is selected AND its option has a snippet
          if (noneIsSelected && selectedMultiValues.size === 1 && !!noneOption?.proposedSnippet) return true;
          // Show if *other* items are selected AND multiSelectSnippet exists
          if (selectedMultiValues.size > 0 && !noneIsSelected && !!question.multiSelectSnippet) return true;
           // Always show if there's manually entered content
           if (snippetContent.trim() !== '') return true;
           // Otherwise, hide
           return false;
      } else if (question.questionType === 'numeric' && inputValue) { // Numeric
          const numValue = parseFloat(inputValue);
          const { min, max, proposedSnippetIfWithinRange } = question.numericRange || {};
          const isInRange = !isNaN(numValue) && (min === undefined || numValue >= min) && (max === undefined || numValue <= max);
          return (isInRange && !!proposedSnippetIfWithinRange) || snippetContent.trim() !== '';
      } else if (question.questionType === 'freeText') { // FreeText
          // Always show the optional snippet editor for free text unless hidden by flag
          return true;
      }
      return false; // Default: don't show
  }, [question, selectedLabel, selectedMultiValues, inputValue, snippetContent]); // Added selectedMultiValues


  // --- RENDER LOGIC ---
  return (
    <div className="question-card">
      <div className="card-content">
        <h3 className="question-label">{question.label}</h3>
        <p className="question-explanation">{question.explanation}</p>
        <p className="question-text">{question.text}</p>
        
        {/* Boolean / Multiple Choice */} 
        {(question.questionType === 'boolean' || question.questionType === 'multipleChoice') && (
            <div>
              {question.options?.map((o, i) => {
                 const inputId = `${question.id}-${i}`;
                 return (
                    <div key={i} className="form-group form-group-radio">
                      <label htmlFor={inputId} className="radio-label">
                        <input
                            type="radio"
                            value={o.label}
                            id={inputId}
                            name={question.id} 
                            checked={selectedLabel === o.label}
                            onChange={handleRadioSelection}
                            className="form-radio"
                        />
                        <span className="radio-option-label">{o.label}</span>
                      </label>
                      {/* Snippet only shown if selected and editor not hidden */}
                      {selectedLabel === o.label && shouldShowSnippetEditor && (
                         <div className="snippet-container">
                             <p className="snippet-title">
                              Proposed Snippet: 
                               {o.proposedSnippet && <span className="snippet-title-detail"> ({o.proposedSnippet.title})</span>}
                          </p>
                          <textarea
                            ref={textareaRef}
                             className="snippet-textarea"
                             value={snippetContent}
                            onChange={handleSnippetChange}
                          />
                          {o.proposedSnippet?.locationSuggestion && (
                             <p className="snippet-suggestion">Suggestion: {o.proposedSnippet.locationSuggestion}</p>
                          )}
                        </div>
                      )}
                    </div>
                 )
              })}
            </div>
        )}

        {/* Multiple Select (Checkboxes) - Updated Snippet Rendering */}
        {question.questionType === 'multipleSelect' && (
            <div>
              {question.options?.map((o, i) => {
                  const inputId = `${question.id}-${i}`;
                  // Determine checked state based on the Set
                  const isChecked = selectedMultiValues.has(o.label);
                  return (
                      <div key={i} className="form-group form-group-checkbox">
                          <label htmlFor={inputId} className="checkbox-label">
                              <input
                                  type="checkbox"
                                  value={o.label}
                                  id={inputId}
                                  name={question.id} // Conceptual grouping
                                  checked={isChecked}
                                  onChange={handleCheckboxChange}
                                  className="form-checkbox"
                              />
                              <span className="checkbox-option-label">{o.label}</span>
                          </label>
                      </div>
                  )
              })}
              {/* Snippet editor visibility and content updated */}
              {shouldShowSnippetEditor && (
                 <div className="snippet-container">
                     <p className="snippet-title">
                       {/* Conditional Title based on selection state */} 
                       {(selectedMultiValues.has("None of the above") && selectedMultiValues.size === 1)
                           ? (question.options?.find(o=>o.label==="None of the above")?.proposedSnippet ? `Proposed Snippet (None Selected):` : 'Optional Note:')
                           : (selectedMultiValues.size > 0 && question.multiSelectSnippet) 
                               ? `Proposed Snippet (Selection: ${Array.from(selectedMultiValues).filter(l=>l!=="None of the above").join(', ')}):` 
                               : 'Optional Note:' // Fallback if nothing relevant is selected but editor shown due to manual edits
                       }
                       {/* Show specific snippet title if available */} 
                       {(selectedMultiValues.has("None of the above") && selectedMultiValues.size === 1) && question.options?.find(o=>o.label==="None of the above")?.proposedSnippet &&
                           <span className="snippet-title-detail"> ({question.options.find(o=>o.label==="None of the above")?.proposedSnippet?.title})</span>}
                       {(selectedMultiValues.size > 0 && !selectedMultiValues.has("None of the above")) && question.multiSelectSnippet && 
                           <span className="snippet-title-detail"> ({question.multiSelectSnippet.title})</span>}
                   </p>
                   <textarea
                     ref={textareaRef}
                     className="snippet-textarea"
                     value={snippetContent}
                     onChange={handleSnippetChange}
                     placeholder={
                         (selectedMultiValues.has("None of the above") && selectedMultiValues.size === 1) 
                         ? "Edit snippet for \"None of the above\"..." 
                         : (selectedMultiValues.size > 0 ? "Edit snippet for selected items..." : "Add an optional note...")
                     }
                   />
                   {/* Conditional location suggestion */}
                    {(selectedMultiValues.has("None of the above") && selectedMultiValues.size === 1) && question.options?.find(o=>o.label==="None of the above")?.proposedSnippet?.locationSuggestion && (
                        <p className="snippet-suggestion">Suggestion: {question.options.find(o=>o.label==="None of the above")?.proposedSnippet?.locationSuggestion}</p>
                    )}
                    {(selectedMultiValues.size > 0 && !selectedMultiValues.has("None of the above")) && question.multiSelectSnippet?.locationSuggestion && (
                        <p className="snippet-suggestion">Suggestion: {question.multiSelectSnippet.locationSuggestion}</p>
                    )}
                 </div>
              )}
            </div>
        )}

        {/* Numeric Input */} 
        {question.questionType === 'numeric' && (
            <div className="form-group">
                 <input 
                    type="number" 
                    value={inputValue}
                    onChange={handleInputChange}
                    min={question.numericRange?.min}
                    max={question.numericRange?.max}
                    placeholder={`Enter number${question.numericRange?.units ? ` (${question.numericRange.units})` : ''}`}
                    className="form-input form-input-number"
                 />
                 {/* Snippet only shown if editor not hidden and conditions met (in range or manual content) */}
                 {shouldShowSnippetEditor && (
                      <div className="snippet-container">
                        <p className="snippet-title">
                           Proposed Snippet (if in range): 
                           {question.numericRange?.proposedSnippetIfWithinRange && <span className="snippet-title-detail"> ({question.numericRange.proposedSnippetIfWithinRange.title})</span>}
                       </p>
                       <textarea
                         ref={textareaRef}
                          className="snippet-textarea"
                          value={snippetContent}
                         onChange={handleSnippetChange}
                       />
                        {question.numericRange?.proposedSnippetIfWithinRange?.locationSuggestion && (
                          <p className="snippet-suggestion">Suggestion: {question.numericRange.proposedSnippetIfWithinRange.locationSuggestion}</p>
                       )}
                     </div>
                 )}
            </div>
        )}

        {/* Free Text Input */} 
        {question.questionType === 'freeText' && (
            <div className="form-group">
                <textarea 
                    value={inputValue}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="Enter response..."
                    className="form-textarea"
                 />
                 {/* Optional snippet editor for free text, only shown if not hidden by flag */}
                 {shouldShowSnippetEditor && (
                   <div className="snippet-container">
                     <p className="snippet-title">Optional Note/Snippet:</p>
                     <textarea
                         ref={textareaRef}
                         className="snippet-textarea snippet-textarea-optional"
                         value={snippetContent}
                         onChange={handleSnippetChange}
                         placeholder="Add any relevant note here..."
                     />
                 </div>
                 )}
            </div>
        )}
      </div>
    </div>
  );
};


// ResultCard simple wrapper (unchanged)
const ResultCard: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <div className="result-card">
    <div className="card-content">
      <h2 className="result-title">{title}</h2>
      {children}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// 4. MAIN WORKFLOW COMPONENT – adapted to parse LlmTurn
// ─────────────────────────────────────────────────────────────────────────────
// Rename component to OrdersTab
const OrdersTab: React.FC = () => {
  // ▸ State: streamlines original + new scratchpad support
  const [paState, setPaState] = useState<
    "idle" | "processing" | "asking" | "concluded" | "fetching-policy" | "error"
  >("idle"); // Added fetching-policy state
  // History now stores LlmTurn objects
  const [history, setHistory] = useState<LlmTurn[]>([]);
  // Current turn holds the latest response from the LLM
  const [currentTurn, setCurrentTurn] = useState<LlmTurn | null>(null);
  // Separate state for the scratchpad to display
  const [scratchpad, setScratchpad] = useState<ScratchpadBlock[]>([]);
  // State for answers remains the same structure
  const [userAnswers, setUserAnswers] = useState<
    Record<string, { value: string; snippet: string }>
  >({});
  // State for signable snippets at the end
    const [signedSnippets, setSignedSnippets] = useState<Record<string, { title: string; content: string; signed: boolean }>>({});
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
  // State for conversation history sent to API
    const [nextApiContents, setNextApiContents] = useState<Content[]>([]);
  // State for the order form
  const [treatment, setTreatment] = useState<string>("Standard rTMS"); // Example default
  const [indication, setIndication] = useState<string>("Bipolar I Depression"); // Example default
  // State for history visibility (can keep or remove)
  const [_isHistoryExpanded, setIsHistoryExpanded] = useState<boolean>(false);
  // State to hold conclusion details determined by the internal LLM workflow
  const [internalConclusionData, setInternalConclusionData] = useState<any>(null); 


    const { ehrData, effectiveApiKey } = useEhrContext(); 
  const GEMINI_MODEL_NAME = "gemini-2.5-pro-preview-03-25";
//   const GEMINI_MODEL_NAME = "gemini-2.5-pro-exp-03-25";
//   const GEMINI_MODEL_NAME = "gemini-2.5-flash-preview-04-17";
  const genAI = useMemo(
    () => new GoogleGenAI({ apiKey: effectiveApiKey }),
    [effectiveApiKey]
  );

  // --- A2A Liaison State ---
  const A2A_AGENT_URL = 'http://localhost:3001/a2a'; // Define agent URL
  const {
    state: liaisonState,
    actions: liaisonActions
  } = useTaskLiaison({ agentUrl: A2A_AGENT_URL });

  // New state for received policy data
  const [policyDataProcessed, setPolicyDataProcessed] = useState<boolean>(false);
  // State to hold final A2A result artifact data
  const [finalEvalResultData, setFinalEvalResultData] = useState<any>(null);

  // ────────────────────────────
  // Core LLM loop (processTurnInternal) - Needs Adaptation
  // ────────────────────────────
  // This function now assumes the policy content is passed in via initialContents
  const processTurnInternal = useCallback(
    async (contentsToProcess: Content[]) => {
        setIsLoading(true);
        setError(null);
      // Don't clear scratchpad here, let it accumulate or be overwritten by LLM response
      // setScratchpad([]);
      let currentContents = [...contentsToProcess];

      try {
        // --- Main loop for LLM interaction ---
            while (true) {
                console.log("Making LLM call with contents:", JSON.stringify(currentContents, null, 2));
                // Store contents *before* this specific API call might be needed if user interaction breaks loop
                setNextApiContents(currentContents);

          // --- Call Gemini API ---
            const result = await genAI.models.generateContent({
                model: GEMINI_MODEL_NAME,
            contents: currentContents,
            config: { temperature: 0.7 }, // Adjust temp as needed
          });

          // --- Process Response ---
                const candidate = result.candidates?.[0];
          if (!candidate?.content?.parts?.length) {
                     const finishReason = candidate?.finishReason || 'Unknown';
                     const safetyRatings = JSON.stringify(candidate?.safetyRatings || [], null, 2);
                     console.error(`LLM response generation failed or was empty. Finish Reason: ${finishReason}`, safetyRatings);
                     throw new Error(`LLM response generation failed or was empty. Finish Reason: ${finishReason}. Check safety ratings if applicable.`);
                }
                
                const responseText = candidate.content.parts[0].text || '';
                if (!responseText) {
                    console.warn("LLM response text part was empty.");
                    throw new Error("LLM response text part was empty.");
                }
            console.log("LLM Response Text:", responseText);


          // --- Parse LlmTurn JSON ---
          let parsedTurn: LlmTurn;
            try {
                const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
            const jsonString = jsonMatch ? jsonMatch[1] : responseText;
            parsedTurn = JSON.parse(jsonString);

                    // Basic validation
             if (!parsedTurn || typeof parsedTurn !== 'object' || !Array.isArray(parsedTurn.scratchpad)) {
                 throw new Error("Parsed response is not a valid LlmTurn object (missing scratchpad array).");
                    }
            } catch (parseError) {
            console.error("Failed to parse LLM JSON response as LlmTurn:", parseError);
                    const snippet = responseText.length > 200 ? `${responseText.substring(0, 200)}...` : responseText;
            throw new Error(`LLM response was not valid LlmTurn JSON: ${snippet}`);
          }
          console.log("Parsed LLM Turn:", parsedTurn); // Added console log here

          // --- Update State from Parsed Turn ---
          setScratchpad(parsedTurn.scratchpad || []); // Update scratchpad display
          setHistory((prev) => [...prev, parsedTurn]); // Add the raw turn to history log
          setCurrentTurn(parsedTurn); // Store the latest turn for UI rendering

          // --- Add Model's Response to API History ---
          // We add the *parsed* LlmTurn object back as the model's response content
          const modelResponseContent: Content = { role: 'model', parts: [{ text: JSON.stringify(parsedTurn) }] };
                currentContents.push(modelResponseContent); 


          // --- Handle Next Action or Questions --- 
          // NOTE: This logic might need refinement based on how the A2A workflow drives state
          if (parsedTurn.nextAction?.action === "searchEHR") {
            setPaState("processing"); // Indicate processing search
            console.log("Performing EHR search based on nextAction...");

                    if (!ehrData) {
                        throw new Error("EHR data is not available for searching.");
                    }
            const keywords = parsedTurn.nextAction.searchEHR?.keywords;
                    if (!keywords || keywords.length === 0) {
                        throw new Error("searchEHR action received without keywords.");
                    }
                    const regexQuery = keywords.map(k => k.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|');
                    console.log(`Constructed grep query: /${regexQuery}/gi`);

                    let grepResultMarkdown: string;
                    try {
              grepResultMarkdown = await grepRecordLogic(ehrData, regexQuery);
                    } catch (grepError: any) {
                         console.error("Error calling grepRecordLogic:", grepError);
                         grepResultMarkdown = `**Error during EHR search:** ${grepError.message || 'Unknown error'}`;
                    }
            console.log("Grep Result Markdown length:", grepResultMarkdown?.length || 0);

                    // --- Prepare Grep Results as Next User Input ---
                    const userGrepResponse: Content = { role: "user", parts: [{ text: grepResultMarkdown || "**No results found.**" }] };
            currentContents.push(userGrepResponse);

                    // Loop continues: immediately send history + grep results back to LLM
            continue; // Go to the next iteration of the while loop

          } else if (parsedTurn.clinicianCommunication && parsedTurn.clinicianCommunication.length > 0) {
            setPaState("asking"); // Transition to asking state
            // Reset answers for the new set of questions
            setUserAnswers({});
            // Initialize snippets based on the *new* questions
                const initialSnippets: Record<string, { title: string; content: string; signed: boolean }> = {};
             parsedTurn.clinicianCommunication.forEach(q => {
                   if (q.options) {
                       q.options.forEach(o => {
                                if (o.proposedSnippet) { 
                             const key = `${q.id}_${o.label}`;
                                    initialSnippets[key] = { ...o.proposedSnippet, signed: false }; 
                                }
                       });
                   } else if (q.numericRange?.proposedSnippetIfWithinRange) {
                     const key = `${q.id}_numericRange`;
                            initialSnippets[key] = { ...q.numericRange.proposedSnippetIfWithinRange, signed: false };
                   } else if (q.multiSelectSnippet) { // Initialize for multiSelect
                     const key = `${q.id}_multiSelect`;
                     initialSnippets[key] = { ...q.multiSelectSnippet, content: '', signed: false }; // Initial content empty
                   }
             });
             setSignedSnippets(initialSnippets); // Reset/set signable snippets for this turn

            // Break the loop to wait for user input (handleSubmitAnswers)
            // nextApiContents is already set for the *next* call
            setIsLoading(false); // Stop loading when waiting for user input
            break;

          } else if (parsedTurn.nextAction?.action === "concludeSuccess") {
            console.log("[Internal Workflow] Reached internal conclusion:", parsedTurn.nextAction.action);

            // Generate final signable snippets first, as they are needed for success message
                const finalSnippets: Record<string, { title: string; content: string; signed: boolean }> = {};
            const lastQuestionTurn = history.slice(0, -1).reverse().find(turn => turn.clinicianCommunication && turn.clinicianCommunication.length > 0);
            if (lastQuestionTurn?.clinicianCommunication) {
                // ... (Keep existing snippet generation logic here) ...
                 Object.entries(userAnswers).forEach(([qId, answer]) => {
                      const question = lastQuestionTurn.clinicianCommunication?.find(q => q.id === qId);
                      if (!question || !answer.value || question.hideSnippetEditor) return; 
                      let keySuffix = '';
                     let proposed: ProposedSnippet | undefined;
                      let finalContent = answer.snippet; 
                        if (question.questionType === 'boolean' || question.questionType === 'multipleChoice') {
                          keySuffix = answer.value;
                         proposed = question.options?.find(o => o.label === answer.value)?.proposedSnippet;
                          if (!finalContent && proposed) finalContent = proposed.content;
                      } else if (question.questionType === 'multipleSelect') {
                          keySuffix = `multi_${answer.value.replace(/[^a-zA-Z0-9]/g, '-')}`; 
                          if (answer.value === "None of the above") {
                              const noneOption = question.options?.find(o => o.label === "None of the above");
                              proposed = noneOption?.proposedSnippet;
                              if (!finalContent && proposed) finalContent = proposed.content;
                          } else {
                              proposed = question.multiSelectSnippet;
                              if (proposed && !finalContent) {
                                  const choicesString = answer.value.split(',').map(s => s.trim()).filter(s => s !== "None of the above").join(', ');
                                  finalContent = proposed.content.replace('$CHOICES', choicesString);
                              }
                          }
                        } else if (question.questionType === 'numeric' && question.numericRange?.proposedSnippetIfWithinRange) {
                         const numValue = parseFloat(answer.value);
                         const { min, max } = question.numericRange;
                         if (!isNaN(numValue) && (min === undefined || numValue >= min) && (max === undefined || numValue <= max)) {
                             proposed = question.numericRange.proposedSnippetIfWithinRange;
                              keySuffix = 'numericRange';
                              if (!finalContent && proposed) {
                                  finalContent = proposed.content.replace('{{value}}', answer.value);
                              }
                         }
                        } else if (question.questionType === 'freeText') {
                          if (answer.snippet && !question.hideSnippetEditor) {
                              keySuffix = 'freeText';
                            proposed = { title: `Note for '${question.label}'`, content: answer.snippet };
                              finalContent = answer.snippet; 
                     }
                      }
                      if (proposed && finalContent) {
                            const key = `${qId}_${keySuffix}`;
                          finalSnippets[key] = { ...proposed, content: finalContent, signed: false };
                      }
                 });
            }
            setSignedSnippets(finalSnippets); // Keep setting snippets locally for potential later display

            // --- Send Message to A2A Agent on Success --- 
            if (parsedTurn.nextAction.action === "concludeSuccess" && parsedTurn.nextAction.concludeSuccess) {
                const conclusionData = parsedTurn.nextAction.concludeSuccess;
                const snippetsText = formatSnippetsForAgent(finalSnippets);

                // Prepare the data structure for internal display
                const internalResult = {
                    status: 'Approved', 
                    payer: conclusionData.payer,
                    policyId: conclusionData.policyId,
                    treatment: conclusionData.treatment,
                    indication: conclusionData.indication,
                    criteriaMetTree: conclusionData.criteriaMetTree
                };
                setInternalConclusionData(internalResult); // Set internal state immediately
                console.log("[Internal Workflow] Set internalConclusionData for Success:", internalResult);

                const messageToAgent: Message = {
                    role: 'user', 
                    parts: [
                        {
                            type: 'text',
                            text: JSON.stringify(conclusionData, null, 2),
                            metadata: { contentType: 'application/json', description: 'Internal Success Conclusion' }
                        },
                        {
                            type: 'text',
                            text: snippetsText,
                            metadata: { description: 'Clinician-Authored Snippets' }
                        }
                    ]
                };
                
                console.log("[Internal Workflow] Sending success conclusion to A2A agent:", messageToAgent);
                // Use sendInput instead of sendMessage
                liaisonActions.sendInput(messageToAgent);
                setPaState('processing'); // Stay in processing while waiting for A2A confirmation
                setIsLoading(true); // Ensure loading is on
                // Do NOT set finalEvalResultData here - wait for A2A response
                // Do NOT set paState to concluded here

            // --- Handle Internal Failure (keep original logic) --- 
            } 
            // --- End A2A message sending / Failure handling --- 

             // Break the internal LLM loop after concluding (success or failure)
             break;

           } else if (parsedTurn.nextAction?.action === "evaluateJS") {
            // Placeholder for evaluateJS - treat as error for now
             setPaState("processing"); // Or maybe "idle"?
                    console.warn("evaluateJS action received but not implemented yet.");
                    const evalFeedback: Content = { role: "user", parts: [{ text: "**Action 'evaluateJS' is not implemented.**" }] };
                    currentContents.push(evalFeedback);
             // Let the LLM try again after getting feedback
             continue;

           } else if (parsedTurn.nextAction) {
            // Handle unknown actions defined in ActionRequest but not handled above
            setPaState("processing");
            console.error(`Unknown or unhandled nextAction type received: ${parsedTurn.nextAction.action}`);
            const unknownActionFeedback: Content = { role: "user", parts: [{ text: `**Error: Unknown or unhandled action type '${parsedTurn.nextAction.action}'.**` }] };
                    currentContents.push(unknownActionFeedback);
            // Let the LLM try again
            continue;

          } else {
             // No more actions or questions - implies workflow is stuck or finished unexpectedly?
             console.log("LLM Turn has no clinicianCommunication and no nextAction. Workflow may be complete or stalled.");
             // Optionally set state to 'concluded' or 'idle' with a message?
             // For now, just break the loop. The UI will show the last scratchpad.
             setPaState("idle"); // Or perhaps a new state like 'stalled'?
             setError("Workflow concluded without a success/failure action.");
             setIsLoading(false); // Stop loading if stalled
             break;
          }

            } // End while loop

      } catch (err: any) {
            console.error("Error processing turn:", err);
            setError(err instanceof Error ? err.message : String(err));
            setPaState("error"); // Revert to error state on error
        } finally {
            // Don't set isLoading=false here definitively, let loop breaks handle it
            // setIsLoading(false); 
        }
    },
    [genAI, GEMINI_MODEL_NAME, ehrData, history, userAnswers] // Added history and userAnswers dependency for snippet generation
  );

  // --- Effect to handle A2A Task Updates (Moved here) ---
  useEffect(() => {
    console.log("[OrdersTab Effect] Liaison state changed:", liaisonState.status, "Current paState:", paState);
    
    // Update loading state based on liaison status
    if (liaisonState.status !== 'running' && liaisonState.status !== 'connecting') {
        // Only set loading false if we are not already processing internally
        if (paState !== 'processing' && paState !== 'asking') {
            setIsLoading(false);
        }
    } else if (paState !== 'idle') { // <--- Added check for paState !== 'idle'
        // Only set loading to true if the liaison is busy AND the internal state is NOT idle
        setIsLoading(true); // Keep loading true if liaison is busy
    }

    // Handle errors from liaison
    if (liaisonState.error) {
        console.error("[OrdersTab Effect] Error from liaison hook:", liaisonState.error);
        setError(liaisonState.error.message || 'Unknown error from A2A agent.');
        setPaState('error');
        setIsLoading(false);
        return; // Stop further processing on error
    }

    // Process received policy files when in fetching state
    if (paState === 'fetching-policy' && liaisonState.task?.history && liaisonState.task.history.length > 0 && !policyDataProcessed) {
        console.log("[OrdersTab Effect] Checking for policy files in task history...");
        const lastMessage = liaisonState.task.history[liaisonState.task.history.length - 1];
        
        if (lastMessage.role === 'agent' && lastMessage.parts) {
            let pdfPart: FilePart | undefined;
            let mdPart: FilePart | undefined;

            for (const part of lastMessage.parts) {
                if (part.type === 'file' && part.file?.mimeType === 'application/pdf') {
                    pdfPart = part as FilePart;
                } else if (part.type === 'file' && part.file?.mimeType === 'text/markdown') {
                    mdPart = part as FilePart;
                }
            }

            const policyForGemini: { mimeType: string; data: string } | null = 
                mdPart?.file?.bytes ? { mimeType: 'text/markdown', data: mdPart.file.bytes } :
                pdfPart?.file?.bytes ? { mimeType: 'application/pdf', data: pdfPart.file.bytes } :
                null;

            if (policyForGemini) {
                console.log(`[OrdersTab Effect] Found policy file part for Gemini (type: ${policyForGemini.mimeType}). Starting internal workflow.`);
                setPolicyDataProcessed(true); // Mark as processed to prevent re-triggering
                setPaState('processing'); // Switch to internal processing state
                setIsLoading(true); // Ensure loading is true

                // Construct initial API call contents for the *internal* Gemini workflow
                // Use the SYSTEM_PROMPT and the received policy file data
                const initialUserMessageText = `${SYSTEM_PROMPT}\n\n## Current Request\nTreatment: ${treatment}\nIndication: ${indication}\nPolicy Provided by Agent. Your Goal: Determine Medical Necessity`;
                const initialContents: Content[] = [
                    {
                        role: "user",
                        parts: [
                            { text: initialUserMessageText },
                            { inlineData: policyForGemini } // Use the found MD or PDF data
                        ]
                    }
                ];

                console.log("[OrdersTab Effect] Calling processTurnInternal with received policy data.");
                processTurnInternal(initialContents).catch(internalError => {
                     console.error("[OrdersTab Effect] Error calling processTurnInternal:", internalError);
                     setError(`Internal workflow error: ${internalError.message}`);
                     setPaState("error");
                     setIsLoading(false);
                });

            } else {
                 console.warn("[OrdersTab Effect] In fetching-policy state, but last agent message did not contain expected PDF or MD FilePart. Still waiting...");
                 // Removed error setting - just ignore this update and wait for the next one
                 // setError("Agent did not return the expected policy document.");
                 // setPaState("error");
                 // setIsLoading(false);
            }
        } else if (lastMessage.role !== 'agent') {
             console.log("[OrdersTab Effect] Last message not from agent while fetching policy. Still waiting...");
        } else {
            console.log("[OrdersTab Effect] Still fetching policy, but condition not met (no parts?). Waiting...");
        }
    } else if (paState === 'fetching-policy') {
        // Still fetching, but no history update yet or already processed
        console.log("[OrdersTab Effect] In fetching-policy state, but no new history or policy already processed. Waiting for A2A task update...");
    }

    // Handle final A2A task completion/error
    if (liaisonState.status === 'completed' || liaisonState.status === 'error') {
         // If the internal PA state hasn't already concluded or errored out from its own logic,
         // update based on the liaison's final state.
         if (paState !== 'concluded' && paState !== 'error') { 
             console.log(`[OrdersTab Effect] A2A Task ended (Status: ${liaisonState.status}). Finalizing internal state.`);
             // Extract final artifact if needed (example)
             const finalArtifact = liaisonState.task?.artifacts?.find(a => a.name === 'prior-auth-evaluation-final' || a.name === 'prior-auth-approval');
             const finalDataPart = finalArtifact?.parts?.find(p => p.type === 'data');
             if (finalDataPart && finalDataPart.type === 'data') {
                  setFinalEvalResultData(finalDataPart.data);
                  console.log("[OrdersTab Effect] Stored final evaluation data from artifact:", finalDataPart.data);
             }
             
             // Set final state based on liaison outcome
             if (liaisonState.status === 'completed' && !liaisonState.error) {
                  // Assuming 'completed' maps to our 'concluded', but might need refinement
                  // based on the actual final artifact content.
                  setPaState('concluded'); 
                } else {
                  setPaState('error');
                  // Error message is already set by the error handling block above
             }
             setIsLoading(false); 
         }
    }

  }, [liaisonState, paState, policyDataProcessed, treatment, indication, SYSTEM_PROMPT, processTurnInternal]); // Add dependencies


  // --- Event Handlers ---
  
  // handleStartPA: Initiates A2A task with treatment/indication
  const handleStartPA = useCallback(async () => {
    // Reset all relevant states
    setHistory([]);
    setCurrentTurn(null);
    setScratchpad([]);
    setUserAnswers({}); 
    setSignedSnippets({});
    setError(null);
    setIsHistoryExpanded(false);
    setPolicyDataProcessed(false);
    setFinalEvalResultData(null);
    
    setPaState("fetching-policy"); // New state indicating waiting for A2A
    setIsLoading(true);

    if (!ehrData) {
        setError("Cannot start: EHR data is not loaded.");
        setPaState("idle");
        setIsLoading(false);
        return;
    }
    if (!treatment || !indication) {
         setError("Cannot start: Treatment and Indication must be provided.");
        setPaState("idle");
        setIsLoading(false);
        return;
    }

    // Construct the initial message for the A2A agent
    const initialUserMessageText = `Start prior auth check for Treatment: ${treatment}, Indication: ${indication}`;
    const initialMessage: Message = {
        role: 'user',
        parts: [{ type: 'text', text: initialUserMessageText }]
    };

    console.log("[OrdersTab] Starting A2A task with liaisonActions.startTask");
    try {
        // Use liaison actions to start the task
        liaisonActions.startTask(initialMessage);
        // The hook will now manage the A2A communication.
        // We will monitor liaisonState changes in useEffect.
        // No direct call to processTurnInternal here.
        // The old policy fetching logic (fetch index, pdf, findBestPolicyMatch) is removed.
    } catch (err: any) {
        console.error("[OrdersTab] Error starting A2A task:", err);
        setError(`Failed to initiate prior auth check: ${err.message}`);
        setPaState("error"); // Use a distinct error state
        setIsLoading(false);
    }
    // isLoading will be set to false based on liaisonState updates

  }, [ehrData, treatment, indication, liaisonActions]); // Dependencies: ehrData, treatment, indication, liaisonActions


  // --- Helper function to view attached files ---
  const handleViewFile = useCallback((part: Part) => {
      if (part.type !== 'file' || !part.file?.bytes || !part.file?.mimeType) {
          console.error('Invalid file part for viewing:', part);
          alert('Cannot view file: Missing data or mime type.');
          return;
      }
      try {
          // Decode base64
          const byteCharacters = atob(part.file.bytes);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);

          // Create Blob
          const blob = new Blob([byteArray], { type: part.file.mimeType });

          // Create Object URL and open
          const blobUrl = URL.createObjectURL(blob);
          window.open(blobUrl, '_blank');
          // Consider revoking URL later if needed: URL.revokeObjectURL(blobUrl);
      } catch (error) {
          console.error('Error decoding or opening file blob:', error);
          alert('Error opening file. See console for details.');
      }
  }, []); // No dependencies needed for this function

  // handleAnswer: Updates the answer state (value + snippet)
  const handleAnswer = useCallback((questionId: string, value: string, snippetContent: string) => {
    console.log(`Answered Q:${questionId} Value: ${value} Snippet: ${snippetContent.substring(0, 50)}...`);
        setUserAnswers(prev => ({
            ...prev,
        [questionId]: { value: value, snippet: snippetContent }
        }));
    }, []);

    // handleSubmitAnswers: Packages answers and sends them to the LLM
    const handleSubmitAnswers = useCallback(() => {
    if (paState !== "asking" || !currentTurn?.clinicianCommunication) return;

    // Prepare the user's answer content string
        const answersToSend: Record<string, { answer: string; snippet?: string }> = {};
    currentTurn.clinicianCommunication.forEach(q => {
        const answer = userAnswers[q.id];
        if (answer) {
            // Include snippet only if it's non-empty AND the editor wasn't hidden for this question
            answersToSend[q.id] = {
                answer: answer.value, 
                ...(answer.snippet && !q.hideSnippetEditor && { snippet: answer.snippet })
            };
        } else {
             // Handle case where a question might not have been answered (should be prevented by isReadyToSubmit)
             console.warn(`Question ${q.id} was not found in userAnswers during submit.`);
             answersToSend[q.id] = { answer: '' }; // Send empty answer? Or handle differently?
        }
        });
        const userResponseText = JSON.stringify({ answers: answersToSend });

        // Construct the user message content
        const userAnswerContent: Content = { role: 'user', parts: [{ text: userResponseText }] };

        // Append user answer to the existing conversation history
        const contentsForNextCall = [...nextApiContents, userAnswerContent];

        setPaState("processing"); 
        // Call internal processing with the *full* history + new answer
        processTurnInternal(contentsForNextCall);

  }, [paState, currentTurn, userAnswers, processTurnInternal, nextApiContents]);


    // handleSignSnippet: Marks a specific snippet as 'signed'
    const handleSignSnippet = useCallback((snippetKey: string) => {
        setSignedSnippets(prev => {
        if (!prev[snippetKey]) return prev;
            const updatedSnippet = { ...prev[snippetKey], signed: true };
            console.log(`Signed snippet: ${snippetKey}`, updatedSnippet);
        // Implement actual note appending logic here if needed
        alert(`Snippet "${updatedSnippet.title}" signed! (Simulated)`);
        return { ...prev, [snippetKey]: updatedSnippet };
    });
  }, []);


  // isReadyToSubmit: Check if all *currently displayed* questions have a value
    const isReadyToSubmit = useMemo(() => {
    if (paState !== 'asking' || !currentTurn?.clinicianCommunication) return false;
    // Check if every question in the current turn has an entry in userAnswers with a non-empty value
    return currentTurn.clinicianCommunication.every(q =>
            userAnswers[q.id]?.value !== undefined && userAnswers[q.id]?.value.trim() !== ''
        );
  }, [paState, currentTurn, userAnswers]);


    // relevantSnippets: Filters the signedSnippets state for display in conclusion
    const relevantSnippets = useMemo(() => {
       // Use signedSnippets directly as it's populated correctly on conclusion
        if (paState !== 'concluded') return [];
        return Object.entries(signedSnippets)
              .filter(([key, snippet]) => snippet.content) // Filter out any potentially empty snippets
              .map(([key, snippet]) => ({ key, ...snippet }));
    }, [paState, signedSnippets]); 


  // ───────────────────────── UI RENDER ─────────────────────────
    return (
    // Use a more specific class name if needed, e.g., orders-v3-tab
    <div className="orders-tab">
      <h2>Medical Necessity Workflow</h2>

            {/* Order Form - Only shown in idle state */} 
            {paState === "idle" && (
          <div className="order-form-section">
              <h3 className="section-title">Order Details</h3>
              <div className="form-group">
                  <label htmlFor="treatment" className="form-label">Treatment:</label>
                        <input 
                           type="text" 
                           id="treatment" 
                           value={treatment}
                           onChange={(e) => setTreatment(e.target.value)} 
                      className="form-input"
                      disabled={isLoading}
                        />
                     </div>
                     <div className="form-group">
                  <label htmlFor="indication" className="form-label">Indication:</label>
                         <input 
                           type="text" 
                           id="indication" 
                           value={indication}
                           onChange={(e) => setIndication(e.target.value)} 
                      className="form-input"
                      disabled={isLoading}
                        />
                     </div>
                <button 
                    onClick={handleStartPA} 
                    className="btn btn-primary btn-start-pa"
                    disabled={!treatment || !indication || isLoading || !ehrData}
                >
                    {isLoading ? "Preparing..." : `Determine Medical Necessity for ${treatment} (${indication})`}
                </button>
             {!ehrData && paState === 'idle' && (
                    <p className="status-message status-warning">Waiting for EHR data to load...</p>
                 )}
          </div>
      )}

      {/* Active Workflow Layout (Rendered for all non-idle states) */} 
      {paState !== 'idle' && (
          <>
             {/* Loading Indicator & Error Display (shown above the columns) */} 
            {isLoading && (
                 <div className="loading-indicator">
                     {/* Spinner SVG */}
                     <svg className="spinner-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                     Processing... (State: {paState} / Liaison: {liaisonState.status})
                 </div>
             )}
             {error && <div className="error-message" style={{ marginBottom: '1rem' }}>Error: {error}</div>}

             {/* --- 3 Column Layout --- */} 
             <div className="active-workflow-layout">
                 {/* --- Column 1: Clinician Input / Success Conclusion --- */} 
                 <div className="workflow-column questions-column">
                    {/* Conditional Rendering based on paState and internalConclusionData */} 

                    {/* Case 1: Asking for Input */} 
                    {paState === "asking" && currentTurn?.clinicianCommunication && (
                        <>
                            <h3 className="column-title">Clinician Input</h3>
                            {/* ... questions rendering ... */}
                            <div className="questions-section">
                                {/* ... QuestionCard mapping ... */} 
                                {currentTurn.clinicianCommunication.map(q => (
                        <QuestionCard
                             key={q.id}
                             question={q}
                                        currentAnswer={userAnswers[q.id]}
                             onAnswer={handleAnswer} 
                        />
                    ))}
                     <button 
                        onClick={handleSubmitAnswers} 
                        disabled={!isReadyToSubmit || isLoading} 
                                    className="btn btn-success btn-submit-answers"
                    >
                        {isLoading ? "Submitting..." : "Submit Answers"}
                     </button>
                </div>
                        </>
                    )}

                    {/* Case 2: Displaying Internal Success Conclusion (While paState might be processing) */} 
                    {internalConclusionData?.status === 'Approved' && (
                        <>
                             {/* Add indication that final confirmation is pending */}
                             <h3 className="column-title">Determination: Medically Necessary</h3>
                             <p style={{fontSize: '0.8rem', fontStyle:'italic', color:'#555', marginTop:'-0.5rem', marginBottom:'0.8rem'}}>
                                (Pending final confirmation from Agent)
                             </p>
                             <div className="conclusion-details success-conclusion">
                                 <p><strong>Payer:</strong> {internalConclusionData.payer || 'N/A'}</p>
                                 <p><strong>Policy ID:</strong> {internalConclusionData.policyId || 'N/A'}</p>
                                 <p><strong>Treatment:</strong> {internalConclusionData.treatment || 'N/A'}</p>
                                 <p><strong>Indication:</strong> {internalConclusionData.indication || 'N/A'}</p>
                                {internalConclusionData.criteriaMetTree && (
                                    <>
                                         <h4 className="subsection-title">Criteria Met Tree:</h4>
                                         <div className="criteria-tree-container">
                                             <CriteriaTree node={internalConclusionData.criteriaMetTree} />
                            </div>
                                    </> 
                                )}
                                 {/* Render signable snippets based on finalSnippets state */} 
                                 {Object.keys(signedSnippets).length > 0 && (
                                     <div className="signable-snippets">
                                         <h4 className="subsection-title">Proposed Documentation Snippets ({Object.keys(signedSnippets).length}):</h4>
                                         {Object.entries(signedSnippets).map(([key, snippet]) => (
                                             <div key={key} className="snippet-item snippet-signable">
                                                 <p className="snippet-item-title">{snippet.title}</p>
                                                 <p className="snippet-item-content">{snippet.content}</p>
                                             <button
                                                     onClick={() => handleSignSnippet(key)}
                                                 disabled={snippet.signed || isLoading}
                                                     className={`btn btn-sign-snippet ${snippet.signed ? 'signed' : ''}`}
                                             >
                                                 {snippet.signed ? '✓ Signed' : 'Sign & Add to Note'}
                                             </button>
                                        </div>
                                     ))}
                                </div>
                            )}
                             </div>
                        </>
                    )}

                    {/* Case 3: Other states (Processing, Error, Concluded but not Approved, Idle-but-not-asking) */} 
                    {!(paState === "asking" && currentTurn?.clinicianCommunication) && 
                     !(internalConclusionData?.status === 'Approved') && 
                    (
                         <>
                             <h3 className="column-title">Clinician Input</h3>
                             {/* More specific placeholder text */} 
                             <p className="placeholder-text">
                                {paState === 'concluded' ? "Workflow complete (See Conclusion Below)." : 
                                 paState === 'fetching-policy' ? "Fetching policy..." : 
                                 paState === 'processing' && !internalConclusionData ? "Processing..." : 
                                 paState === 'processing' && internalConclusionData ? "Waiting for final agent confirmation..." : 
                                 paState === 'error' ? "An error occurred." : 
                                 "No questions pending."}
                            </p>
                         </>
                    )}
                            </div>

                 {/* --- Column 2: Scratchpad --- */} 
                 <div className="workflow-column scratchpad-column">
                    <h3 className="column-title">AI Scratchpad</h3>
                     {scratchpad.length > 0 ? (
                        <div className="scratchpad-section">
                            <Scratchpad blocks={scratchpad} />
                            </div>
                    ) : (
                         <p className="placeholder-text">
                             {paState === 'concluded' ? "Final scratchpad state." : 
                              paState === 'error' ? "-" : 
                              "Scratchpad is empty."}
                         </p>
                     )}
                 </div>

                 {/* --- Column 3: A2A History --- */} 
                 <div className="workflow-column a2a-history-column">
                    <h3 className="column-title">Agent Task History</h3>
                     {liaisonState.task?.history && liaisonState.task.history.length > 0 ? (
                         <div 
                             className="conversation-history a2a-history-display" 
                             style={{ /* Removed inline styles - handle in CSS */ }}
                         >
                            {/* ... A2A history mapping ... */}
                             {liaisonState.task.history.map((message: Message, index: number) => {
                                 const isUser = message.role === 'user';
                                 const style: React.CSSProperties = {
                                     marginBottom: '5px',
                                     padding: '5px 8px',
                                     borderRadius: '4px',
                                     backgroundColor: isUser ? '#e1f5fe' : '#f0f0f0',
                                     textAlign: 'left',
                                     whiteSpace: 'pre-wrap',
                                     wordBreak: 'break-word',
                                 };
             
                                 return (
                                     <div key={`a2a-hist-${index}`} style={style}>
                                         <strong>{isUser ? 'User:' : 'Agent:'}</strong>
                                         {message.parts.map((part, partIndex) => {
                                             if (part.type === 'text') {
                                                 return <span key={partIndex}>{part.text}</span>;
                                             } else if (part.type === 'file' && part.file) {
                                                 const fileName = part.file.name || 'untitled';
                                                 const filePart = part as FilePart; 
                                                 return (
                                                     <div key={partIndex} style={{ marginTop: '5px', fontSize: '0.9em' }}>
                                                         <span style={{ fontStyle: 'italic' }}>File: {fileName}</span> (
                                                         <button
                                                             onClick={() => handleViewFile(filePart)}
                                                             disabled={!filePart.file?.bytes}
                                                             style={{
                                                                 background: 'none', border: 'none', color: 'blue',
                                                                 textDecoration: 'underline', cursor: 'pointer',
                                                                 padding: 0, fontSize: 'inherit'
                                                             }}
                                                             title={filePart.file?.bytes ? `View ${fileName}` : 'File content not available'}
                                                         >
                                                             View
                                                         </button>
                                                         )
                                                     </div>
                                                 );
                                             } else if (part.type === 'data') {
                                                  return <pre key={partIndex} style={{ fontSize: '0.8em', background: '#eee', padding: '3px', marginTop: '5px' }}>Data: {JSON.stringify(part.data)}</pre>;
                                             }
                                             return <span key={partIndex}> (Unsupported Part Type: {part.type})</span>;
                                         })}
                                         {message.parts.length === 0 && <span> (Empty message)</span>}
                                     </div>
                                 );
                             })}
                         </div>
                    ) : (
                         <p className="placeholder-text">
                             {paState === 'concluded' ? "Final A2A task history." : 
                              paState === 'error' ? "-" : 
                              "No A2A task history yet."}
                         </p>
                     )}
                            </div>
             </div>
          </>
      )}

      {/* Concluded State (Rendered below the 3-column layout - ONLY FAILURE/Fallback cases) */} 
      {paState === "concluded" && (
           <div className="conclusion-section" style={{ marginTop: '1rem' }}>
                {/* Only render if NOT Approved (Approved case is handled in the first column now) */} 
                 {finalEvalResultData && finalEvalResultData.status !== 'Approved' && (
                     <> {/* Use Fragment */} 
                         {/* Cannot Approve Case */} 
                         {finalEvalResultData.status === 'CannotApprove' ? ( 
                             <ResultCard title={`Determination: Cannot Approve`}>
                                 <p><strong>Reason:</strong> {finalEvalResultData.reason || 'N/A'}</p>
                                 {/* Display Unmet Criteria Tree if available */} 
                                 {finalEvalResultData.unmetCriteriaTree && (
                                     <>
                                         <h4 className="subsection-title">Unmet Criteria Tree:</h4>
                                         <div className="criteria-tree-container criteria-tree-failure">
                                             <CriteriaTree node={finalEvalResultData.unmetCriteriaTree} />
                                         </div>
                                     </>
                                 )}
                                 {/* Optionally show snippets for reference on failure */} 
                             {relevantSnippets.length > 0 && (
                                     <div className="signable-snippets snippets-for-reference">
                                         {/* ... snippet rendering ... */}
                                         <h4 className="subsection-title">Generated Snippets (for reference):</h4>
                                     {relevantSnippets.map(snippet => (
                                            <div key={snippet.key} className="snippet-item snippet-reference">
                                                <p className="snippet-item-title">{snippet.title}</p>
                                                <p className="snippet-item-content">{snippet.content}</p>
                                        </div>
                                     ))}
                                </div>
                            )}
                        </ResultCard>
                         /* Other Status / Fallback within finalEvalResultData */
                         ) : ( 
                              <ResultCard title={`Determination: ${finalEvalResultData.status || 'Concluded'}`}>
                                 <p><strong>Details:</strong> {finalEvalResultData.reason || 'Process finished.'}</p>
                        </ResultCard>
                    )}
                     </>
                 )}
                 {/* Fallback if finalEvalResultData is missing entirely */} 
                 {!finalEvalResultData && (
                      <ResultCard title="Determination Concluded">
                         <p>The prior authorization process has concluded, but the final result details could not be extracted from the agent response artifact.</p>
                      </ResultCard>
                 )}
                
                  {/* Start New Button (Remains at the bottom for all concluded cases) */} 
                    <button 
                      onClick={() => { 
                          setPaState('idle'); 
                          setError(null); 
                          setIsLoading(false); 
                          setScratchpad([]); 
                          setCurrentTurn(null); 
                          setHistory([]); 
                          liaisonActions.cancelTask(); // Also explicitly cancel liaison task if still active
                          setFinalEvalResultData(null); 
                          setPolicyDataProcessed(false); 
                          setInternalConclusionData(null); // Reset internal conclusion
                      }} 
                        disabled={isLoading}
                      className="btn btn-secondary btn-start-new"
                    >
                      Start New Determination
                    </button>
                </div>
            )}
        </div>
    );
};

export default OrdersTab; // Export with the new name

// Helper function for simple keyword matching (can be improved)
const findBestPolicyMatch = (indexContent: string, treatment: string, indication: string): string | null => {
    const query = `${treatment} ${indication}`.toLowerCase().split(/\s+/);
    const policies = indexContent.split('\n')
        .map(line => line.trim())
        .filter(line => line.includes('|'))
        .map(line => {
            const parts = line.split('|', 2);
            return { number: parts[0].trim(), title: parts[1]?.trim() || '' };
        })
        .filter(p => p.number && p.title);

    if (policies.length === 0) return null;

    let bestMatch = null;
    let highestScore = -1;

    policies.forEach(policy => {
        const titleWords = policy.title.toLowerCase().split(/\s+/);
        let currentScore = 0;
        query.forEach(qWord => {
            if (titleWords.includes(qWord)) {
                currentScore++;
            }
        });

        // Simple boost for matching treatment words directly in title
        treatment.toLowerCase().split(/\s+/).forEach(tWord => {
             if (titleWords.includes(tWord)) {
                 currentScore += 1; // Add extra weight
             }
        });

        if (currentScore > highestScore) {
            highestScore = currentScore;
            bestMatch = policy.number;
        }
    });

    // Return null if no keywords matched at all
    return highestScore > 0 ? bestMatch : null; 
}; 

// Helper function to format signed snippets for sending to A2A agent
const formatSnippetsForAgent = (snippets: Record<string, { title: string; content: string; signed: boolean }>): string => {
    const lines = Object.entries(snippets)
        // Optional: Filter only signed snippets if needed, or send all generated
        // .filter(([, snippet]) => snippet.signed)
        .map(([key, snippet]) => {
            return `--- Snippet: ${snippet.title} (Key: ${key}, Signed: ${snippet.signed}) ---
${snippet.content}
--- End Snippet ---`;
        });
    return lines.length > 0 ? lines.join('\n\n') : 'No documentation snippets were generated or signed.';
};
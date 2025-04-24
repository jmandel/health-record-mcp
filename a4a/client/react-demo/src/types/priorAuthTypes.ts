// a4a/client/react-demo/src/types/priorAuthTypes.ts

// Base types - dependencies for others
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
  meetsCriteria?: boolean;
}

export interface NumericRange {
  min?: number;
  max?: number;
  units?: string;
}

// Extended types
export interface SubRangeSnippet {
  min?: number; // Inclusive min for this sub-range
  max?: number; // Inclusive max for this sub-range
  proposedSnippet: ProposedSnippet; // Snippet for this sub-range
}

export interface ClinicianQuestion {
  id: string;
  label: string;
  explanation: string;
  questionType: "boolean" | "multipleChoice" | "numeric" | "freeText" | "multipleSelect";
  text: string;
  options?: QuestionOption[]; // For multipleSelect, MUST include "None of the above" as the last item
  numericRange?: NumericRange;
  hideSnippetEditor?: boolean;
  multiSelectSnippet?: ProposedSnippet; // Snippet using $CHOICES
  proposedSnippetsBySubRange?: SubRangeSnippet[]; 
}

export interface Attachment {
  fhirSource?: string;
  text: string;
}

export interface ActionRequest {
  action:
    | "searchEHR"
    | "evaluateJS"
    | "clinicianCommunication" // This is technically handled by LlmTurn.clinicianCommunication
    | "concludeSuccess" ;
  timestamp: string; // Note: LlmTurn omits this for nextAction
  searchEHR?: { keywords: string[]; maxSnippets?: number };
  evaluateJS?: { code: string; description?: string };
  concludeSuccess?: {
    payer: string;
    policyId: string;
    treatment: string;
    indication: string;
    criteriaMetTree: ConditionNode;
  };
}

export type ScratchpadBlock =
  | { type: "outline"; heading: string; bullets: string[] }
  | { type: "criteriaTree"; tree: ConditionNode }
  | { type: "policyQuote"; from: string; text: string }
  | { type: "note"; text: string };

// Added based on MiniEngine usage
export type Answer = { value: string; snippet?: string };

// Added based on engineTypes usage, maps to ProposedSnippet for now
export type Snippet = ProposedSnippet;

// Top-level type for LLM communication
export interface LlmTurn {
  scratchpad: ScratchpadBlock[];
  clinicianCommunication?: ClinicianQuestion[];
  // Note: Omitting timestamp and clinicianCommunication from the base ActionRequest type
  nextAction?: Omit<ActionRequest, "clinicianCommunication" | "timestamp">; 
} 
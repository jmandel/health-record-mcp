import type { ClinicianQuestion, ConditionNode, ProposedSnippet as Snippet } from "../types/priorAuthTypes"; // Use ProposedSnippet as Snippet for now

/** exactly mirrors the three nextAction cases we care about */
export type EngineResult =
  | { kind: "ask"; questions: ClinicianQuestion[] }          // → nextAction.searchEHR / askUser
  | { kind: "package"; bundle: PackageBundle }               // → nextAction.concludeSuccess
  | { kind: "error"; message: string };

export interface PackageBundle {
  criteriaTree: ConditionNode;
  snippets: Snippet[];
  // add evid-by-fhir etc. if you like
}

## TypeScript Schema for Policy Index JSON

```typescript
/**
 * Defines the overall structure for the JSON output representing a single medical policy document.
 * The goal is to index treatments, indications, and their coverage status for easy searching,
 * without embedding the full complexity of the policy logic.
 */
interface PolicyIndex {
  /**
   * Contains metadata about the specific policy document being indexed.
   * Source: Typically found in the header or footer of the policy document.
   */
  policyMetadata: PolicyMetadata;

  /**
   * An array defining all distinct treatments, procedures, or technologies
   * discussed in the policy. Each treatment should have a unique ID within this document.
   * Source: Identify all specific medical services, devices, or techniques mentioned.
   * Look in the title, introduction, policy criteria, investigational sections, coding section, and regulatory status.
   */
  treatments: TreatmentDefinition[];

  /**
   * An array defining all distinct indications (reasons for treatment), contraindications
   * (reasons *not* to treat), or specific policy rule contexts (like adjunctive use)
   * discussed in the policy. Each should have a unique ID within this document.
   * Source: Identify all diseases, conditions, symptoms, patient characteristics, or specific usage scenarios
   * mentioned in relation to the treatments. Look in the introduction, policy criteria sections (medical necessity,
   * investigational, contraindications), and potentially the evidence review for context.
   */
  indications: IndicationDefinition[];

  /**
   * An array summarizing the coverage determinations for specific combinations
   * of treatments and indications/contraindications/rules defined above.
   * This is the core linkage showing what the policy concludes for each pair.
   * Source: Synthesize information from the "Policy Coverage Criteria", "Indications Considered Medical Necessity",
   * "Indications Considered Investigational", and "Contraindications" sections.
   */
  coverageRules: CoverageRule[];
}

/**
 * Metadata about the source policy document.
 */
interface PolicyMetadata {
  /**
   * The official title of the medical policy.
   * Source: Document header.
   * Example: "Transcranial Magnetic Stimulation as a Treatment of Depression and Other Psychiatric/Neurologic Disorders"
   */
  policyTitle: string;

  /**
   * The unique identifier or number assigned to this policy by the issuer.
   * Source: Document header.
   * Example: "2.01.526"
   */
  policyNumber: string;

  /**
   * The date when this version of the policy becomes effective.
   * Format: YYYY-MM-DD.
   * Source: Document header or effective date section.
   * Example: "2024-11-01"
   */
  effectiveDate: string;

  /**
   * The date when this policy was last revised or updated.
   * Format: YYYY-MM-DD.
   * Source: Document header or revision history.
   * Example: "2024-10-21"
   */
  lastRevisedDate: string;

  /**
   * (Optional) The policy number this policy replaces, if specified.
   * Source: Document header or revision history.
   * Example: "2.01.50"
   */
  replacesPolicy?: string;

  /**
   * (Optional) Reference to a related BCBSA (Blue Cross Blue Shield Association) policy, if specified.
   * Source: Document header.
   * Example: "2.01.50"
   */
  bcbsaRefPolicy?: string;

  /**
   * The original filename of the source document (e.g., PDF). Helps link back to the source.
   * Example: "premera_bc_2_01_526_tms.pdf"
   */
  sourceFilename: string;

  /**
   * Version number for this JSON schema structure itself, in case the schema evolves.
   * Example: "2.0"
   */
  schemaVersion: string;
}

/**
 * Defines a specific treatment, procedure, or technology mentioned in the policy.
 */
interface TreatmentDefinition {
  /**
   * A unique, concise identifier for this treatment *within this policy file*.
   * Convention: Use a prefix like "tms_" followed by a descriptive term (e.g., "tms_standard", "tms_deep", "tms_any"). Must be unique within the 'treatments' array.
   */
  id: string;

  /**
   * The primary, standardized name for the treatment as used in the policy.
   * Example: "Standard/Conventional Repetitive TMS", "Deep TMS", "Any TMS Type"
   */
  name: string;

  /**
   * A comprehensive list of keywords, synonyms, acronyms, brand names, codes,
   * and related terms associated with this treatment. Crucial for searchability.
   * Be thorough: include terms from the policy text, common clinical usage, and the coding section.
   * Source: Policy text (title, intro, criteria, investigational list, regulatory status, coding), common knowledge.
   * Example: ["TMS", "rTMS", "Transcranial Magnetic Stimulation", "Standard TMS", "SNOMED:123", "NeuroStar"]
   */
  keywords: string[];

  /**
   * An array of CPT, HCPCS, or other specified codes explicitly associated with this *specific* treatment
   * in the policy's coding section or text. Only include if directly linked.
   * Source: Coding section of the policy.
   * Example: ["CPT:90867", "CPT:90868", "CPT:90869"]
   */
  codes?: string[];
}

/**
 * Defines the type of an indication entry. Helps differentiate between clinical conditions,
 * reasons *not* to perform a procedure, and specific usage rules.
 * Use only these exact values.
 */
type IndicationType =
  /** The indication represents a clinical disease, disorder, symptom, or patient group. */
  | 'Condition'
  /** The indication represents a contraindication – a reason the treatment should NOT be performed. */
  | 'Contraindication'
  /** The indication represents a specific policy rule or context (e.g., adjunctive use, use with other tech). */
  | 'PolicyRule';

/**
 * Defines a specific indication (clinical condition, contraindication, or policy rule context).
 */
interface IndicationDefinition {
  /**
   * A unique, concise identifier for this indication *within this policy file*.
   * Convention: Use a prefix like "ind_", "contra_", or "rule_" followed by a descriptive term (e.g., "ind_mdd", "contra_implant", "rule_adjunctive"). Must be unique within the 'indications' array.
   */
  id: string;

  /**
   * Categorizes the indication using the predefined IndicationType values.
   * This helps interpret the coverage rules correctly (e.g., a 'Contraindication' rule means NMN).
   */
  type: IndicationType;

  /**
   * The primary, standardized name for the indication, contraindication, or rule.
   * Example: "Major Depressive Disorder (Unipolar)", "Contraindication: Metallic Implant", "Adjunctive Use (Boosting other treatments)"
   */
  name: string;

  /**
   * A comprehensive list of keywords, synonyms, acronyms, related terms, or specific examples
   * associated with this indication/contraindication/rule. Crucial for searchability.
   * Be thorough: include terms from policy text, common clinical usage, related conditions/situations.
   * Source: Policy text (criteria sections for necessity, investigational, contraindications), common knowledge.
   * Example: ["MDD", "Major Depressive Disorder", "Unipolar Depression", "TRD"]
   * For Contraindications: ["Contraindication", "Not Medically Necessary", "Metal", "Implant", "Ferromagnetic"]
   */
  keywords: string[];
}

/**
 * Defines the coverage status determination for a specific treatment/indication pair.
 * Use only these exact values.
 */
type CoverageStatus =
  /** The treatment is considered medically necessary for the indication, provided specific criteria (detailed in the full policy) are met. */
  | 'Medically Necessary'
  /** The treatment is considered NOT medically necessary for the indication. This often applies to contraindications or explicitly excluded scenarios. */
  | 'Not Medically Necessary'
  /** The treatment is considered investigational (experimental, unproven) for the indication. */
  | 'Investigational';

/**
 * Represents a specific coverage rule linking one treatment to one indication/contraindication/rule,
 * summarizing the policy's determination for that combination.
 */
interface CoverageRule {
  /**
   * The unique ID of the treatment this rule applies to. Must match an 'id' from the 'treatments' array.
   * Use generic IDs like "tms_any" when a rule applies broadly to multiple or all defined treatments.
   */
  treatmentId: string;

  /**
   * The unique ID of the indication, contraindication, or rule this rule applies to. Must match an 'id' from the 'indications' array.
   * Use generic IDs like "ind_any" when a rule applies broadly to multiple or all defined indications.
   */
  indicationId: string;

  /**
   * The summary coverage determination for this specific treatment-indication combination,
   * using one of the predefined CoverageStatus values.
   * Source: Synthesize from the main policy statements (Medically Necessary, Investigational, Not Medically Necessary/Contraindicated).
   */
  coverageStatus: CoverageStatus;

  /**
   * (Optional) A brief, concise note providing essential context or clarification for this specific rule,
   * *without* detailing the full criteria. Focus on key exceptions, scope limitations, or important nuances.
   * Example: "Criteria apply: Age >= 18, moderate/severe, specific medication failures required.", "Excludes accelerated/SNT/SAINT protocols.", "Unless specific clearance documented."
   */
  notes?: string;
}
```

---

## LLM Prompting Strategy and Guide for Data Abstraction

**Core Prompt Structure:**

```text
You are an expert medical policy analyst tasked with extracting structured information from medical policy documents into a specific JSON format. Your goal is to create an index summarizing coverage decisions for treatments and indications, focusing on findability via keywords, without embedding complex clinical criteria.

**Input:**
The full text content of a single medical policy document will be provided.

**Output:**
Generate a single JSON object that strictly conforms to the following TypeScript schema:

<PASTE_TYPESCRIPT_SCHEMA_HERE>

**Instructions:**

1.  **Parse Metadata:** Extract the information required for the `policyMetadata` object from the document's header, footer, or revision history sections. Ensure dates are in YYYY-MM-DD format. Include the original filename and the specified schema version ("2.0").

2.  **Identify and Define Treatments:**
    *   Carefully read the policy (title, introduction, criteria, investigational list, coding, regulatory status) to identify *all distinct* treatments, procedures, devices, or technologies mentioned.
    *   For each distinct treatment, create an object in the `treatments` array.
    *   Assign a unique `id` using the convention `tms_[descriptive_term]` (e.g., `tms_standard`, `tms_deep`, `tms_saint`). Use `tms_any` for rules applying broadly.
    *   Assign the most appropriate standardized `name`.
    *   Populate the `keywords` array *comprehensively*. Include:
        *   The primary name and acronyms (TMS, rTMS, dTMS, TBS).
        *   Full names (Transcranial Magnetic Stimulation).
        *   Synonyms or variations mentioned (Standard, Conventional, Repetitive).
        *   Specific parameters if they define a type (Accelerated, >= 3/day, Neuronavigation, H-Coil).
        *   Brand names mentioned (NeuroStar, Brainsway, Cerena).
        *   Relevant CPT/HCPCS/other codes mentioned anywhere in the policy (even if also listed in `codes`).
        *   Related concepts (Image-guided, qEEG guided).
    *   If specific CPT/HCPCS/other codes are explicitly linked *only* to this treatment type in the coding section, add them to the optional `codes` array.

3.  **Identify and Define Indications/Contraindications/Rules:**
    *   Read the policy (introduction, medical necessity criteria, investigational criteria, contraindications, other rules sections) to identify *all distinct* clinical conditions, reasons *not* to treat (contraindications), or specific policy contexts/rules (e.g., adjunctive use, use with other therapies).
    *   For each distinct item, create an object in the `indications` array.
    *   Assign a unique `id` using conventions: `ind_[condition_term]` (e.g., `ind_mdd`), `contra_[reason_term]` (e.g., `contra_implant`), `rule_[context_term]` (e.g., `rule_adjunctive`). Use `ind_any` for rules applying broadly to indications.
    *   Assign the appropriate `type`: 'Condition', 'Contraindication', or 'PolicyRule'.
    *   Assign the most appropriate standardized `name`.
    *   Populate the `keywords` array *comprehensively*. Include:
        *   The primary name and acronyms (MDD, OCD, PTSD, TBI, ICP).
        *   Synonyms (Unipolar Depression, Manic-Depressive Illness).
        *   Related concepts or severity levels mentioned (Treatment Resistant, TRD, Moderate, Severe).
        *   Specific examples listed under broader categories (e.g., list specific metallic implants under the 'Metallic Implant' contraindication keywords).
        *   For Contraindications, *always* include "Contraindication" and "Not Medically Necessary" as keywords.
        *   For Policy Rules, include terms describing the context (Adjunctive, Combination, Concurrent Use, Bridge Therapy).

4.  **Determine and Record Coverage Rules:**
    *   For *each relevant combination* of a Treatment and an Indication/Contraindication/Rule explicitly or implicitly addressed in the policy:
        *   Create an object in the `coverageRules` array.
        *   Set `treatmentId` to the ID of the relevant treatment (use `tms_any` if the rule applies to all/multiple TMS types discussed).
        *   Set `indicationId` to the ID of the relevant indication/contraindication/rule (use `ind_any` if the rule applies regardless of specific indication).
        *   Determine the overall `coverageStatus` based *only* on the policy's explicit statements (Medically Necessary, Investigational, Not Medically Necessary).
            *   "Medically Necessary": Found in sections defining coverage criteria.
            *   "Investigational": Found in sections listing investigational uses.
            *   "Not Medically Necessary": Found in contraindication sections or explicit statements of non-coverage (e.g., use with ECT).
        *   If necessary, add a *brief* `notes` field to capture critical context mentioned alongside the determination (e.g., age limits, specific exclusions like "Excludes psychotic features", prerequisite conditions like "Unless specific clearance documented"). **Do NOT copy detailed clinical criteria here.** Keep notes concise (max 1-2 short sentences).

5.  **Consistency and Completeness:**
    *   Ensure all `treatmentId` and `indicationId` values used in `coverageRules` correspond exactly to IDs defined in the `treatments` and `indications` arrays.
    *   Be thorough in identifying all distinct treatments and indications/rules mentioned.
    *   Prioritize comprehensive keywords for robust searching.
    *   Strictly adhere to the allowed values for `coverageStatus` and `indicationType`.
    *   If the policy mentions a treatment or indication but provides no clear coverage determination for a specific combination, do *not* create a rule for it unless there's a default rule (like "all other indications are investigational").

**Example Snippet Translation:**

*   **Policy Text:** "Theta burst stimulation is considered investigational for the treatment of Obsessive Compulsive Disorder."
*   **Should Result In (assuming IDs `tms_tbs` and `ind_ocd` exist):**
    ```json
    {
      "treatmentId": "tms_tbs",
      "indicationId": "ind_ocd",
      "coverageStatus": "Investigational"
    }
    ```

*   **Policy Text:** "Contraindications: ... Seizure disorder or a history of a seizure disorder, unless stable and well-controlled on medication..."
*   **Should Result In (assuming IDs `tms_any` and `contra_seizure` exist):**
    ```json
    {
      "treatmentId": "tms_any", // Applies to all TMS types
      "indicationId": "contra_seizure",
      "coverageStatus": "Not Medically Necessary",
      "notes": "Unless stable/well-controlled or specific exceptions apply."
    }
    ```

Generate the JSON output based on these instructions and the provided policy text.

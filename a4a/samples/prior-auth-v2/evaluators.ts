// prior-auth-v2/evaluators.ts

/**
 * Structured details extracted from a prior authorization request text.
 */
export interface PriorAuthRequestDetails {
    procedure?: string;      // e.g., "MRI Lumbar Spine", "Botox Injection"
    diagnosis?: string;      // e.g., "Low back pain", "Chronic Migraine post-concussion"
    clinicalSummary: string; // The relevant clinical text provided by the user
}

/**
 * Result of evaluating a request against a policy.
 */
export interface PolicyEvalResult {
    decision: 'Approved' | 'Needs More Info' | 'CannotApprove';
    reason: string;
    missingInfo?: string[]; // List of specific missing criteria/information
}

/**
 * Interface for different prior authorization evaluation strategies.
 */
export interface PriorAuthEvaluator {
    /**
     * Parses the initial user request text to extract key details.
     * @param requestText The user's initial request message.
     * @param taskId Optional task ID for logging.
     * @returns Structured request details.
     */
    parseInitialRequest(requestText: string, taskId?: string): Promise<PriorAuthRequestDetails>;

    /**
     * Finds the most relevant policy file path based on request details and policy index.
     * @param requestDetails The structured details parsed from the request.
     * @param policyIndexContent The string content of the policy index file.
     * @param taskId Optional task ID for logging.
     * @returns The filename/ID of the most relevant policy, or null if none found.
     */
    findRelevantPolicy(requestDetails: PriorAuthRequestDetails, policyIndexContent: string, taskId?: string): Promise<string | null>;

    /**
     * Evaluates the clinical summary (and potentially subsequent user input) against the provided policy text.
     * @param policyText The full text of the relevant policy.
     * @param requestDetails The structured details parsed from the request (includes initial summary).
     * @param taskId Optional task ID for logging.
     * @param previousResult Optional: The result of the previous evaluation, if re-evaluating after 'Needs More Info'.
     * @param userInputText Optional: The text provided by the user in response to the request for more information.
     * @returns A structured evaluation result.
     */
    evaluateAgainstPolicy(
        policyText: string, 
        requestDetails: PriorAuthRequestDetails, 
        taskId?: string, 
        previousResult?: PolicyEvalResult, // Optional param for re-evaluation context
        userInputText?: string           // Optional param for user's new input
    ): Promise<PolicyEvalResult>;

    /**
     * Drafts a user-friendly response message based on the evaluation outcome.
     * @param evaluation The structured evaluation result.
     * @param requestDetails The structured details parsed from the request.
     * @param taskId Optional task ID for logging.
     * @returns A string containing the drafted response message.
     */
    draftResponse(evaluation: PolicyEvalResult, requestDetails: PriorAuthRequestDetails, taskId?: string): Promise<string>;
} 
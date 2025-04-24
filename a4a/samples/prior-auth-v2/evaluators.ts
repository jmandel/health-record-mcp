// prior-auth-v2/evaluators.ts

/**
 * Represents a single turn in the conversation history.
 */
export type MessageTurn = {
    role: 'agent' | 'user';
    text: string;
};

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
     * Finds the most relevant policy ID based on request details and compact policy content.
     * @param requestDetails The structured details parsed from the request.
     * @param policyCompactContent The string content of the policies_compact.txt file.
     * @param taskId Optional task ID for logging.
     * @returns The ID (e.g., "9.02.502") of the most relevant policy, or null if none found.
     */
    findRelevantPolicy(requestDetails: PriorAuthRequestDetails, policyCompactContent: string, taskId?: string): Promise<string | null>;

    /**
     * Evaluates the clinical summary and subsequent conversation against the provided policy text.
     * @param policyText The full text of the relevant policy.
     * @param requestDetails The structured details parsed from the *initial* request.
     * @param conversationHistory An array containing the conversation turns (agent questions, user responses) since the policy was identified.
     * @param taskId Optional task ID for logging.
     * @returns A structured evaluation result.
     */
    evaluateAgainstPolicy(
        policyText: string,
        requestDetails: PriorAuthRequestDetails,
        conversationHistory: MessageTurn[], // Changed parameter
        taskId?: string
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
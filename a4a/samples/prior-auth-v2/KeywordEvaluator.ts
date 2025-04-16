import type { PriorAuthEvaluator, PriorAuthRequestDetails, PolicyEvalResult } from './evaluators';

/**
 * A simple, deterministic evaluator based on keyword matching for testing purposes.
 */
export class KeywordEvaluator implements PriorAuthEvaluator {
    private readonly MAX_SUMMARY_LENGTH = 200; // Limit summary length

    /**
     * Tries to extract details using simple patterns. Very basic.
     * Quick Fix: Treat entire input as summary and extract keywords directly.
     */
    async parseInitialRequest(requestText: string, taskId?: string): Promise<PriorAuthRequestDetails> {
        console.log(`[KeywordEval${taskId ? ' Task ' + taskId : ''}] Parsing request: ${requestText.substring(0, 50)}...`);
        // Quick Fix: No complex parsing, just use the text as summary
        const clinicalSummary = requestText.trim();

        // Still try basic extraction for potential direct use later, but don't rely on it for keywords
        let procedure: string | undefined;
        let diagnosis: string | undefined;
        const procMatch = requestText.match(/procedure[:\s]+([^\n.,]+)/i);
        if (procMatch) procedure = procMatch[1].trim();
        const diagMatch = requestText.match(/diagnosis[:\s]+([^\n.,]+)/i);
        if (diagMatch) diagnosis = diagMatch[1].trim();

        return {
            procedure, // Keep potentially extracted values
            diagnosis,
            clinicalSummary: clinicalSummary.substring(0, this.MAX_SUMMARY_LENGTH),
        };
    }

    /**
     * Finds a policy file containing keywords from procedure, diagnosis, OR summary text.
     */
    async findRelevantPolicy(requestDetails: PriorAuthRequestDetails, availablePolicies: string[], taskId?: string): Promise<string | null> {
        console.log(`[KeywordEval${taskId ? ' Task ' + taskId : ''}] Finding policy for:`, requestDetails);
        
        // Quick Fix: Extract keywords from summary too
        const keywords = [
            ...(requestDetails.procedure?.toLowerCase().split(/\s+/) || []),
            ...(requestDetails.diagnosis?.toLowerCase().split(/\s+/) || []),
            ...(requestDetails.clinicalSummary.toLowerCase().split(/\s+|[.,!?;:]/).filter(Boolean) || []) // Split summary more aggressively
        ].filter(kw => kw.length > 2); // Simple filtering
        const uniqueKeywords = [...new Set(keywords)]; // Remove duplicates

        if (uniqueKeywords.length === 0) {
            console.log(`[KeywordEval${taskId ? ' Task ' + taskId : ''}] No keywords found to select policy.`);
            return null; 
        }
        console.log(`[KeywordEval${taskId ? ' Task ' + taskId : ''}] Trying keywords: ${uniqueKeywords.join(', ')}`);

        for (const policyFile of availablePolicies) {
            const lowerPolicyFile = policyFile.toLowerCase();
            if (uniqueKeywords.some(kw => lowerPolicyFile.includes(kw))) {
                console.log(`[KeywordEval${taskId ? ' Task ' + taskId : ''}] Found matching policy: ${policyFile}`);
                return policyFile;
            }
        }

        console.log(`[KeywordEval${taskId ? ' Task ' + taskId : ''}] No policy file matched keywords.`);
        return null;
    }

    /**
     * Evaluates based on `# REQUIRE:` and `# DENY:` lines in the policy file.
     * MODIFIED FOR TESTING: Will always return 'Needs More Info' until the phrase 'MAGIC APPROVE' is present in the input.
     */
    async evaluateAgainstPolicy(
        policyText: string, 
        requestDetails: PriorAuthRequestDetails, 
        taskId?: string, 
        previousResult?: PolicyEvalResult, 
        userInputText?: string
    ): Promise<PolicyEvalResult> {
        console.log(`[KeywordEval${taskId ? ' Task ' + taskId : ''}] Evaluating against policy. Has user input: ${!!userInputText}`);
        const requiredKeywords: string[] = [];
        const denyKeywords: string[] = [];
        const magicPhrase = "magic approve";

        // Combine original summary and new input for checking
        const fullText = (requestDetails.clinicalSummary + ' ' + (userInputText || '')).toLowerCase();

        // --- TESTING HOOK --- 
        // Check for the magic phrase first
        if (!fullText.includes(magicPhrase)) {
            console.log(`[KeywordEval${taskId ? ' Task ' + taskId : ''}] Magic phrase not found. Forcing 'Needs More Info'.`);
            return {
                decision: 'Needs More Info',
                reason: `Policy evaluation pending. Please provide the magic approval phrase to proceed.`, 
                missingInfo: ['magic approval phrase'] // Indicate what's missing
            };
        }
        // --- END TESTING HOOK ---

        console.log(`[KeywordEval${taskId ? ' Task ' + taskId : ''}] Magic phrase found! Proceeding with normal keyword evaluation.`);

        // Parse policy for keywords (only relevant if magic phrase was found)
        policyText.split('\n').forEach(line => {
            const reqMatch = line.match(/^#\s*REQUIRE:\s*(.+)/i);
            if (reqMatch) {
                requiredKeywords.push(reqMatch[1].trim().toLowerCase());
            }
            const denyMatch = line.match(/^#\s*DENY:\s*(.+)/i);
            if (denyMatch) {
                denyKeywords.push(denyMatch[1].trim().toLowerCase());
            }
        });

        // Check for denying keywords
        const deniedBecause = denyKeywords.find(kw => fullText.includes(kw));
        if (deniedBecause) {
            console.log(`[KeywordEval${taskId ? ' Task ' + taskId : ''}] Denied due to keyword: ${deniedBecause}`);
            return {
                decision: 'Denied',
                reason: `Request denied because it mentions '${deniedBecause}', which is excluded by policy (even with magic phrase).`, 
                missingInfo: []
            };
        }

        // Check for required keywords
        const missingInfo = requiredKeywords.filter(kw => !fullText.includes(kw));

        if (missingInfo.length > 0) {
            console.log(`[KeywordEval${taskId ? ' Task ' + taskId : ''}] Magic phrase found, but still needs info for: ${missingInfo.join(', ')}`);
             return {
                 decision: 'Needs More Info',
                 reason: `Magic phrase received, but request still requires more information regarding: ${missingInfo.join(', ')}`,
                 missingInfo: missingInfo
             };
        }

        // Magic phrase found, all required keywords found, none denied
        console.log(`[KeywordEval${taskId ? ' Task ' + taskId : ''}] Approved (magic phrase + keywords).`);
        return {
            decision: 'Approved',
            reason: 'Request meets policy criteria based on provided information (including magic phrase).',
            missingInfo: []
        };
    }

    /**
     * Drafts a simple templated response.
     */
    async draftResponse(evaluation: PolicyEvalResult, requestDetails: PriorAuthRequestDetails, taskId?: string): Promise<string> {
        console.log(`[KeywordEval${taskId ? ' Task ' + taskId : ''}] Drafting response for decision: ${evaluation.decision}`);
        let response = `Prior Authorization Update:\nDecision: ${evaluation.decision}\nReason: ${evaluation.reason}`;
        // No extra detail needed for this simple evaluator
        return response;
    }
} 
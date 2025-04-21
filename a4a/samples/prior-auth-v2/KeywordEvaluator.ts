import type { PriorAuthEvaluator, PriorAuthRequestDetails, PolicyEvalResult } from './evaluators';
import { stemmer } from 'porter-stemmer';
// Removed path import as file reading is now done externally
// import path from 'node:path'; 

// Helper function to get stemmed keywords from text
const getStemmedKeywords = (text: string): Set<string> => {
    if (!text) return new Set<string>();
    // 1. Lowercase
    const lowerCaseText = text.toLowerCase();
    // 2. Split on non-alphanumeric sequences (keeps numbers potentially relevant like CPT codes)
    const words = lowerCaseText.split(/[^a-z0-9]+/);
    // 3. Filter out empty strings and very short words (optional, adjust '2' as needed)
    const filteredWords = words.filter(kw => kw && kw.length > 2);
    // 4. Stem each word and explicitly cast to string
    const stemmedWords = filteredWords.map(word => stemmer(word) as string);
    // 5. Return unique stems
    return new Set<string>(stemmedWords);
};

/**
 * A simple, deterministic evaluator based on keyword matching for testing purposes.
 */
export class KeywordEvaluator implements PriorAuthEvaluator {
    private readonly MAX_SUMMARY_LENGTH = 200000; // Limit summary length
    // Removed POLICY_INDEX_PATH as it's no longer read here
    // private readonly POLICY_INDEX_PATH = '../../client/react-demo/public/premera_policies/index.txt';

    /**
     * Tries to extract details using simple patterns. Very basic.
     * Quick Fix: Treat entire input as summary and extract keywords directly.
     */
    async parseInitialRequest(requestText: string, taskId?: string): Promise<PriorAuthRequestDetails> {
        console.log(`[KeywordEval${taskId ? ' Task ' + taskId : ''}] Parsing request: ${requestText}...`);
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
     * Finds the best matching policy by comparing stemmed keywords from the request
     * against stemmed keywords from policy titles parsed from the provided index content.
     */
    async findRelevantPolicy(requestDetails: PriorAuthRequestDetails, policyIndexContent: string, taskId?: string): Promise<string | null> {
        console.log(`[KeywordEval${taskId ? ' Task ' + taskId : ''}] Finding policy using provided index content.`);

        // 1. Get stemmed keywords from the request details
        const requestText = [
            requestDetails.procedure,
            requestDetails.diagnosis,
            requestDetails.clinicalSummary
        ].filter(Boolean).join(' ');
        const requestKeywords = getStemmedKeywords(requestText);

        if (requestKeywords.size === 0) {
            console.log(`[KeywordEval${taskId ? ' Task ' + taskId : ''}] No usable keywords found in the request.`);
            return null;
        }
        console.log(`[KeywordEval${taskId ? ' Task ' + taskId : ''}] Request stemmed keywords: ${Array.from(requestKeywords).join(', ')}`);

        // 2. Parse the provided policy index content
        if (!policyIndexContent) {
             console.error(`[KeywordEval${taskId ? ' Task ' + taskId : ''}] Received empty policy index content.`);
             return null;
        }

        // 3. Calculate scores for each policy from the parsed index
        let bestMatchId: string | null = null;
        let highestScore = 0;

        const lines = policyIndexContent.split('\n');
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || !trimmedLine.includes('|')) continue; // Skip empty or invalid lines

            const parts = trimmedLine.split('|', 2);
            const policyId = parts[0]?.trim();
            const policyTitle = parts[1]?.trim();

            if (!policyId || !policyTitle) continue; // Skip lines missing ID or title

            const titleKeywords = getStemmedKeywords(policyTitle);
            if (titleKeywords.size === 0) continue; // Skip policies with no usable title keywords

            // Calculate overlap score
            let currentScore = 0;
            for (const reqKeyword of requestKeywords) {
                if (titleKeywords.has(reqKeyword)) {
                    currentScore++;
                }
            }

            // Update best match if current score is higher
            if (currentScore > highestScore) {
                highestScore = currentScore;
                bestMatchId = policyId;
                // Optional: Log intermediate better matches
                // console.log(`[KeywordEval${taskId ? ' Task ' + taskId : ''}] New best match: ${policyId} (Score: ${highestScore})`);
            }
        }

        if (bestMatchId) {
            console.log(`[KeywordEval${taskId ? ' Task ' + taskId : ''}] Best matching policy found: ${bestMatchId} (Score: ${highestScore})`);
        } else {
            console.log(`[KeywordEval${taskId ? ' Task ' + taskId : ''}] No policy title sufficiently matched request keywords.`);
        }

        return bestMatchId;
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
            console.log(`[KeywordEval${taskId ? ' Task ' + taskId : ''}] Cannot approve due to keyword: ${deniedBecause}`);
            return {
                decision: 'CannotApprove',
                reason: `Automated approval cannot be granted because the request mentions '${deniedBecause}', which is excluded by policy. Forwarding for human review.`,
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

        if (evaluation.missingInfo && evaluation.missingInfo.length > 0) {
            response += `\n\nPlease provide information about: ${evaluation.missingInfo.join(', ')}`;
        }
        // No extra detail needed for this simple evaluator
        return response;
    }
}
import type { TaskSendParams, Message, Task } from '@a2a/bun-express';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';

const POLICIES_DIR = path.join(__dirname, '..', 'policies');

// --- Helper to read a specific policy file ---
async function readPolicyFile(filename: string): Promise<string> {
    try {
        const fullPath = path.join(POLICIES_DIR, filename);
        // Basic check to prevent path traversal
        if (path.dirname(fullPath) !== POLICIES_DIR || !filename.endsWith('.md')) {
            throw new Error(`Invalid policy filename requested: ${filename}`);
        }
        const content = await fs.readFile(fullPath, 'utf-8');
        console.log(`[PolicyLLMInterface] Read policy file: ${filename}`);
        return content;
    } catch (error: any) {
        console.error(`[PolicyLLMInterface] Error reading policy file ${filename}: ${error.message}`);
        throw error; // Re-throw error if file reading fails
    }
}


// --- Interface Definition ---

export interface PolicyCheckResult {
    /** Filename of the applicable policy (e.g., 'lbp-mri-policy.md') or null/special value */
    policyFilename: string | null;
    /** Full content of the policy file if applicable */
    policyContent?: string;
    /** Any structured details extracted or relevant (optional) */
    details?: any;
}

export interface SubmissionEvaluationResult {
    isComplete: boolean;
    missingInfo: string | null;
    approvalNumber?: string;
}

export interface PolicyLLMInterface {
    /**
     * Determines if a PA policy applies to the initial request.
     * @param params Initial task parameters.
     * @returns Policy details or indication that none applies.
     */
    checkPolicy(params: TaskSendParams): Promise<PolicyCheckResult>;

    /**
     * Evaluates if the submission (history + new message) meets policy requirements.
     * @param task Current task object (potentially including history).
     * @param newMessage The latest message received.
     * @param policyContent The content of the specific policy being evaluated.
     * @returns Evaluation result.
     */
    evaluateSubmission(
        task: Task,
        newMessage: Message,
        policyContent: string
    ): Promise<SubmissionEvaluationResult>;
}


// --- Canned Implementation for Testing ---

export class CannedPolicyLLM implements PolicyLLMInterface {
    async checkPolicy(params: TaskSendParams): Promise<PolicyCheckResult> {
        console.log(`[CannedPolicyLLM] Checking policy for task ${params.id}`);
        const userText = params.message.parts
            .filter(part => part.type === 'text')
            .map(part => part.text)
            .join(' ')
            .toLowerCase();

        let policyFilename: string | null = null;

        if (userText.includes('botox') && (userText.includes('headache') || userText.includes('concussion'))) {
            policyFilename = 'pcs-botox-policy.md';
        } else if (userText.includes('mri') && (userText.includes('back pain') || userText.includes('lbp'))) {
            policyFilename = 'lbp-mri-policy.md';
        } else if (userText.includes('ozempic') || userText.includes('wegovy') || userText.includes('glp-1')) {
            // Example: Let's pretend we have a GLP-1 policy file
            // In a real scenario, you'd have a policy file for this too.
            // For the canned response, we can return details without reading a file.
             console.log(`[CannedPolicyLLM] Detected GLP-1 request (canned).`);
            return {
                 policyFilename: 'POLICY-GLP1-RA-V1', // Use ID if no file
                 policyContent: '## Canned Policy: GLP-1 Receptor Agonist (POLICY-GLP1-RA-V1)\n\n**Documentation Required:**\n* T2DM Diagnosis\n* A1C Level > 7.0%\n* Failure of Metformin',
                 details: { name: 'GLP-1 Receptor Agonist Policy (Canned)' }
            };
        }

        if (policyFilename) {
             console.log(`[CannedPolicyLLM] Policy identified: ${policyFilename}`);
             try {
                const policyContent = await readPolicyFile(policyFilename);
                return { policyFilename, policyContent };
            } catch (e) {
                // If file reading fails, return as if no policy found
                 console.error(`[CannedPolicyLLM] Failed to read policy file ${policyFilename}. Proceeding as NO_PRIOR_AUTH_NEEDED.`);
                 return { policyFilename: null };
            }
        } else {
            console.log(`[CannedPolicyLLM] No specific policy identified.`);
            return { policyFilename: null }; // Represents NO_PRIOR_AUTH_NEEDED
        }
    }

    async evaluateSubmission(
        task: Task,
        newMessage: Message,
        policyContent: string // Use the provided policy content
    ): Promise<SubmissionEvaluationResult> {
        console.log(`[CannedPolicyLLM] Evaluating submission for task ${task.id}`);

        // Combine text from history and new message for analysis
        let combinedText = "";
        if (task.history) {
            combinedText += task.history
                .flatMap(m => m.parts)
                .filter(p => p.type === 'text')
                .map(p => p.text)
                .join(' \n ');
        }
        combinedText += newMessage.parts
            .filter(p => p.type === 'text')
            .map(p => p.text)
            .join(' \n ');
        combinedText = combinedText.toLowerCase();

        const missing: string[] = [];

        // Simple keyword checks based on policy content
        if (policyContent.includes('LBP-MRI-001')) {
             console.log(`[CannedPolicyLLM] Evaluating against LBP-MRI policy...`);
             
             // Check duration >= 6 weeks
             const durationMatch = combinedText.match(/(\d+)\s+weeks?/);
             const durationWeeks = durationMatch ? parseInt(durationMatch[1], 10) : null;
             if (durationWeeks === null || durationWeeks < 6) {
                 missing.push("Pain > 6 weeks");
             }

             if (!combinedText.includes('conservative treatment') && !combinedText.includes('physical therapy') && !combinedText.includes('nsaids')) missing.push("Conservative treatment details");
             // Assume red flags or surgery rationale are sufficient if mentioned
             if (!combinedText.includes('red flag') && !combinedText.includes('neurological deficit') && !combinedText.includes('surgery planned')) missing.push("Red flags OR Surgery Rationale");

        } else if (policyContent.includes('PCS-BTX-001')) {
             console.log(`[CannedPolicyLLM] Evaluating against PCS-Botox policy...`);
             if (!combinedText.includes('post-concussion') && !combinedText.includes('pcs')) missing.push("PCS Diagnosis");
             if (!combinedText.includes('3 months') && !combinedText.includes('three months')) missing.push("Headache >= 3 months");
            
             // Count distinct prophylactic trials mentioned OR explicit failure count
             let prophylacticTrials = 0;
             const mentionedDrugs = new Set<string>();
             if (combinedText.includes('amitriptyline')) mentionedDrugs.add('amitriptyline');
             if (combinedText.includes('topiramate')) mentionedDrugs.add('topiramate');
             if (combinedText.includes('propranolol')) mentionedDrugs.add('propranolol');
             prophylacticTrials = mentionedDrugs.size;

             // Check for explicit mentions like "failed two trials" or "failed 2 trials"
             if (prophylacticTrials < 2 && combinedText.match(/failed (two|2) prophylactic trial/)) {
                 prophylacticTrials = 2;
             }
             // Fallback for general statement
             if (prophylacticTrials < 2 && combinedText.includes('failed prophylactic')) {
                 prophylacticTrials = 2; 
             }

             if (prophylacticTrials < 2) missing.push("Trial of >= 2 standard prophylactics");

             // MOH Check V3: Check if it's explicitly ruled out. If not, require confirmation.
             const mohRuledOutPattern = /moh (is |was )?ruled out/;
             if (!mohRuledOutPattern.test(combinedText)) {
                 // If not explicitly ruled out, we need confirmation
                 missing.push("Medication Overuse Headache ruled out");
             }
             // If the pattern *is* found, the check passes, and nothing is pushed.

        } else if (policyContent.includes('POLICY-GLP1-RA-V1')) { // Check canned policy
             console.log(`[CannedPolicyLLM] Evaluating against canned GLP-1 policy...`);
             if (!combinedText.includes('t2dm') && !combinedText.includes('type 2 diabetes')) missing.push('T2DM Diagnosis');
            
             // More flexible A1C check for numbers >= 7.0
             const a1cMatch = combinedText.match(/a1c[^\d]*(\d+(\.\d+)?)/);
             const a1cValue = a1cMatch ? parseFloat(a1cMatch[1]) : null;
             if (a1cValue === null || a1cValue < 7.0) {
                 missing.push('A1C Level > 7.0%');
             }
             
             if (!combinedText.includes('metformin fail') && !combinedText.includes('failed metformin')) missing.push('Failure of Metformin');
        } else {
             console.warn(`[CannedPolicyLLM] Unknown policy content provided for evaluation.`);
             // Default to incomplete if policy is unknown
             return { isComplete: false, missingInfo: "Could not evaluate against unknown policy." };
        }


        if (missing.length > 0) {
            const missingInfo = `Missing required information: ${missing.join(', ')}.`;
            console.log(`[CannedPolicyLLM] Evaluation Result: Incomplete. ${missingInfo}`);
            return { isComplete: false, missingInfo: missingInfo };
        } else {
            const approvalNumber = `PA-CANNED-${randomUUID().substring(0, 6).toUpperCase()}`;
            console.log(`[CannedPolicyLLM] Evaluation Result: Complete. Approval: ${approvalNumber}`);
            return { isComplete: true, missingInfo: null, approvalNumber: approvalNumber };
        }
    }
} 
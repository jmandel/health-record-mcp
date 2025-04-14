import { describe, it, expect, beforeEach } from 'bun:test';
import { CannedPolicyLLM } from './policyLLMInterface';
import type { PolicyLLMInterface, PolicyCheckResult, SubmissionEvaluationResult } from './policyLLMInterface';
import type { TaskSendParams, Message, Task } from '@a2a/bun-express';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

// Helper function to create TaskSendParams
const createTaskSendParams = (text: string, id: string = 'task-123'): TaskSendParams => ({
    id: id,
    message: { role: 'user', parts: [{ type: 'text', text }] },
    metadata: {}
});

// Helper function to create a Task object
const createTask = (id: string = 'task-abc', history: Message[] = [], metadata: Record<string, any> = {}): Task => {
    const now = new Date().toISOString();
    return {
        id: id,
        sessionId: 'sess-xyz',
        status: { state: 'working', timestamp: now },
        history: history,
        artifacts: [],
        metadata: metadata,
        createdAt: now,
        updatedAt: now,
    };
};

// Helper function to create a Message object
const createMessage = (text: string): Message => ({
    role: 'user',
    parts: [{ type: 'text', text }]
});

describe('CannedPolicyLLM', () => {
    let llm: PolicyLLMInterface;
    let pcsBotoxPolicyContent: string;
    let lbpMriPolicyContent: string;
    const cannedGlp1PolicyContent = '## Canned Policy: GLP-1 Receptor Agonist (POLICY-GLP1-RA-V1)\n\n**Documentation Required:**\n* T2DM Diagnosis\n* A1C Level > 7.0%\n* Failure of Metformin';

    beforeEach(async () => {
        llm = new CannedPolicyLLM();
        // Pre-read policy contents for assertions
        try {
            pcsBotoxPolicyContent = await fs.readFile(path.join(__dirname, '..', 'policies', 'pcs-botox-policy.md'), 'utf-8');
            lbpMriPolicyContent = await fs.readFile(path.join(__dirname, '..', 'policies', 'lbp-mri-policy.md'), 'utf-8');
        } catch (e) {
            console.error("Error pre-reading policy files for test setup:", e);
            throw new Error("Could not read policy files needed for tests.");
        }
    });

    // --- Tests for checkPolicy ---
    describe('checkPolicy', () => {
        it('should identify PCS Botox policy', async () => {
            const params = createTaskSendParams("Request PA for Botox for concussion headache");
            const result = await llm.checkPolicy(params);
            expect(result.policyFilename).toBe('pcs-botox-policy.md');
            expect(result.policyContent).toBe(pcsBotoxPolicyContent);
        });

        it('should identify LBP MRI policy', async () => {
            const params = createTaskSendParams("Need MRI for chronic lower back pain (LBP)");
            const result = await llm.checkPolicy(params);
            expect(result.policyFilename).toBe('lbp-mri-policy.md');
            expect(result.policyContent).toBe(lbpMriPolicyContent);
        });

        it('should identify canned GLP-1 policy by drug name', async () => {
            const params = createTaskSendParams("Prior auth request for Ozempic");
            const result = await llm.checkPolicy(params);
            expect(result.policyFilename).toBe('POLICY-GLP1-RA-V1');
            expect(result.policyContent).toBe(cannedGlp1PolicyContent);
            expect(result.details?.name).toBe('GLP-1 Receptor Agonist Policy (Canned)');
        });

         it('should identify canned GLP-1 policy by class name', async () => {
            const params = createTaskSendParams("Want to start a GLP-1 medication");
            const result = await llm.checkPolicy(params);
            expect(result.policyFilename).toBe('POLICY-GLP1-RA-V1');
            expect(result.policyContent).toBe(cannedGlp1PolicyContent);
        });

        it('should return null filename when no policy matches', async () => {
            const params = createTaskSendParams("Request for routine blood work");
            const result = await llm.checkPolicy(params);
            expect(result.policyFilename).toBeNull();
            expect(result.policyContent).toBeUndefined();
        });

        // TODO: Add test for file read error scenario if possible (might need mocks)
    });

    // --- Tests for evaluateSubmission ---
    describe('evaluateSubmission', () => {
        // --- LBP MRI Policy Tests ---
        it('LBP MRI: should approve when all criteria mentioned', async () => {
            const task = createTask('task-lbp-1', [], { policyFilename: 'lbp-mri-policy.md' });
            const message = createMessage("Patient has LBP > 6 weeks, failed physical therapy and NSAIDs. Also has red flag neurological deficit.");
            const result = await llm.evaluateSubmission(task, message, lbpMriPolicyContent);
            expect(result.isComplete).toBe(true);
            expect(result.missingInfo).toBeNull();
            expect(result.approvalNumber).toMatch(/^PA-CANNED-/);
        });

        it('LBP MRI: should request info when duration missing', async () => {
            const task = createTask('task-lbp-2', [], { policyFilename: 'lbp-mri-policy.md' });
            const message = createMessage("Patient needs MRI for back pain, failed conservative treatment. Has red flags.");
            const result = await llm.evaluateSubmission(task, message, lbpMriPolicyContent);
            expect(result.isComplete).toBe(false);
            expect(result.missingInfo).toContain("Pain > 6 weeks");
            expect(result.approvalNumber).toBeUndefined();
        });

        it('LBP MRI: should request info when treatment and flags missing', async () => {
            const task = createTask('task-lbp-3', [], { policyFilename: 'lbp-mri-policy.md' });
            const message = createMessage("MRI for back pain lasting over six weeks.");
            const result = await llm.evaluateSubmission(task, message, lbpMriPolicyContent);
            expect(result.isComplete).toBe(false);
            expect(result.missingInfo).toContain("Conservative treatment details");
            expect(result.missingInfo).toContain("Red flags OR Surgery Rationale");
        });

        // --- PCS Botox Policy Tests ---
        it('PCS Botox: should approve when all criteria mentioned', async () => {
            const task = createTask('task-pcs-1', [], { policyFilename: 'pcs-botox-policy.md' });
            const message = createMessage("Patient with post-concussion syndrome (PCS) dx after TBI. Debilitating headaches ongoing for 3 months+. Failed amitriptyline and topiramate prophylaxis. MOH ruled out.");
            const result = await llm.evaluateSubmission(task, message, pcsBotoxPolicyContent);
            expect(result.isComplete).toBe(true);
            expect(result.missingInfo).toBeNull();
            expect(result.approvalNumber).toMatch(/^PA-CANNED-/);
        });

         it('PCS Botox: should request info when duration and MOH missing', async () => {
            const task = createTask('task-pcs-2', [], { policyFilename: 'pcs-botox-policy.md' });
            const message = createMessage("Botox for PCS headaches. Failed two prophylactic trials.");
            const result = await llm.evaluateSubmission(task, message, pcsBotoxPolicyContent);
            expect(result.isComplete).toBe(false);
            expect(result.missingInfo).not.toContain("PCS Diagnosis");
            expect(result.missingInfo).toContain("Headache >= 3 months");
            expect(result.missingInfo).toContain("Medication Overuse Headache ruled out");
             expect(result.missingInfo).not.toContain("Trial of >= 2 standard prophylactics");
        });

         it('PCS Botox: should consider history', async () => {
            const history: Message[] = [createMessage("This patient has PCS from an injury last year.")];
            const task = createTask('task-pcs-3', history, { policyFilename: 'pcs-botox-policy.md' });
            const message = createMessage("Headaches continue > 3 months. Tried amitriptyline and failed. MOH is ruled out. Need Botox.");
            const result = await llm.evaluateSubmission(task, message, pcsBotoxPolicyContent);
            expect(result.isComplete).toBe(false);
             expect(result.missingInfo).toContain("Trial of >= 2 standard prophylactics");
             expect(result.missingInfo).not.toContain("PCS Diagnosis");
             expect(result.missingInfo).not.toContain("Headache >= 3 months");
             expect(result.missingInfo).not.toContain("Medication Overuse Headache ruled out");
        });

        // --- Canned GLP-1 Policy Tests ---
         it('Canned GLP-1: should approve when all criteria mentioned', async () => {
            const task = createTask('task-glp-1', [], { policyFilename: 'POLICY-GLP1-RA-V1' });
            const message = createMessage("Request Ozempic for T2DM patient, A1C is 8.0. Previously failed metformin due to side effects.");
            const result = await llm.evaluateSubmission(task, message, cannedGlp1PolicyContent);
            expect(result.isComplete).toBe(true);
            expect(result.missingInfo).toBeNull();
            expect(result.approvalNumber).toMatch(/^PA-CANNED-/);
        });

         it('Canned GLP-1: should request info when criteria missing', async () => {
            const task = createTask('task-glp-2', [], { policyFilename: 'POLICY-GLP1-RA-V1' });
            const message = createMessage("Patient with Type 2 Diabetes needs Wegovy.");
            const result = await llm.evaluateSubmission(task, message, cannedGlp1PolicyContent);
            expect(result.isComplete).toBe(false);
             expect(result.missingInfo).toContain("A1C Level > 7.0%");
             expect(result.missingInfo).toContain("Failure of Metformin");
        });

        // --- Unknown Policy ---
         it('should return incomplete for unknown policy content', async () => {
            const task = createTask('task-unk-1');
            const message = createMessage("Some request");
            const result = await llm.evaluateSubmission(task, message, "## Unknown Policy Content");
            expect(result.isComplete).toBe(false);
            expect(result.missingInfo).toBe("Could not evaluate against unknown policy.");
        });
    });
}); 
// a4a/samples/prior-auth-agent/server.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { startA2AExpressServer, InMemoryTaskStore, type A2AErrorCodes } from '@a2a/bun-express';
import type { Task, Message, TaskSendParams, AgentCard } from '@a2a/bun-express';
import { CannedPolicyLLM } from './src/policyLLMInterface';
import { PriorAuthProcessor } from './PriorAuthProcessor';
import { priorAuthAgentCard } from './agentCard';
import type * as http from 'node:http';

const TEST_PORT = 3102; // Use a different port for testing
const BASE_URL = `http://localhost:${TEST_PORT}`;
const A2A_ENDPOINT = `${BASE_URL}/a2a`;
const AGENT_CARD_ENDPOINT = `${BASE_URL}/.well-known/agent.json`;

// Helper to make A2A RPC calls
async function makeRpcCall(method: string, params: any): Promise<any> {
    const response = await fetch(A2A_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // Add mock auth header needed by our server config
            'Authorization': 'Bearer valid-client-token'
        },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: Math.random().toString(36).substring(7), // Unique ID for each call
            method: method,
            params: params
        })
    });
    if (!response.ok) {
        throw new Error(`RPC call failed with status ${response.status}: ${await response.text()}`);
    }
    const jsonResponse = await response.json() as { result?: any; error?: { code: number; message: string; data?: any } };
    if (jsonResponse.error) {
        console.error("A2A RPC Error:", jsonResponse.error);
        throw new Error(`A2A RPC Error ${jsonResponse.error.code}: ${jsonResponse.error.message}`);
    }
    return jsonResponse.result;
}

describe('Prior Auth Agent Server Integration Tests', () => {
    let server: http.Server;
    let taskStore: InMemoryTaskStore;
    let llm: CannedPolicyLLM;
    let processor: PriorAuthProcessor;

    beforeAll(() => {
        taskStore = new InMemoryTaskStore();
        llm = new CannedPolicyLLM(); // Use the canned LLM
        processor = new PriorAuthProcessor(llm); // Inject it

        server = startA2AExpressServer({
            agentDefinition: priorAuthAgentCard,
            taskStore: taskStore,
            taskProcessors: [processor],
            port: TEST_PORT,
            baseUrl: BASE_URL,
            serverAuthentication: { schemes: ['Bearer'] }, // Match canned token
            getAuthContext: (req) => { // Simple auth context for testing
                if (req.headers.authorization === 'Bearer valid-client-token') {
                    return { userId: 'test-user' };
                }
                return null;
            },
            // No custom app config needed for these tests
        });
        console.log(`Test server started on port ${TEST_PORT}`);
    });

    afterAll((done) => {
        console.log("Shutting down test server...");
        server.close((err) => {
            if (err) {
                console.error("Error shutting down server:", err);
                done(err); // Signal error to Bun test runner
            } else {
                console.log("Test server shut down.");
                done(); // Signal successful completion
            }
        });
         // Force exit if server doesn't close gracefully after a timeout
        setTimeout(() => {
            console.warn("Server close timed out, forcing exit.");
            process.exit(0); // Force exit - adjust timeout as needed
        }, 2000); 
    });

    it('should return agent card', async () => {
        const response = await fetch(AGENT_CARD_ENDPOINT);
        expect(response.ok).toBe(true);
        const card = await response.json() as AgentCard;
        expect(card.name).toEqual(priorAuthAgentCard.name!);
        expect(card.url).toBe(A2A_ENDPOINT); // Check server-provided URL
        expect(card.authentication.schemes).toEqual(['Bearer']); // Check server-provided auth
        expect(card.skills[0]?.id).toBe('prior-auth-medication');
    });

    it('should handle a request needing no PA', async () => {
        const params: TaskSendParams = {
            id: 'task-no-pa-1',
            message: { role: 'user', parts: [{ type: 'text', text: 'Need appointment for checkup' }] },
            metadata: { skillId: 'prior-auth-medication' } // Target the skill
        };
        // Call tasks/send - don't assert on its immediate result state
        await makeRpcCall('tasks/send', params); 
        
        // Allow some time for async processing and check final state via tasks/get
        await Bun.sleep(100); // Small delay, might need adjustment
        const finalTask = await makeRpcCall('tasks/get', { id: 'task-no-pa-1' });
        expect(finalTask.status.state).toBe('completed');
        expect(finalTask.status.message?.parts[0].text).toContain('No Prior Authorization required');
    });

    it('should request input if initial submission for MRI policy is incomplete', async () => {
        const taskId = 'task-mri-incomplete-1';
        const params: TaskSendParams = {
            id: taskId,
            message: { role: 'user', parts: [{ type: 'text', text: 'Request MRI for LBP' }] },
            metadata: { skillId: 'prior-auth-medication' }
        };
        const result: Task = await makeRpcCall('tasks/send', params);

        expect(result.id).toBe(taskId);
        // Initial response might still be 'working' or 'submitted'
        expect(['working', 'submitted']).toContain(result.status.state);

        // Wait and fetch final state
        await Bun.sleep(1500); // Allow time for canned LLM calls
        const finalTask = await makeRpcCall('tasks/get', { id: taskId });

        expect(finalTask.status.state).toBe('input-required');
        expect(finalTask.status.message?.parts[0].text).toContain('Missing required information');
        expect(finalTask.status.message?.parts[0].text).toContain('Pain > 6 weeks');
        expect(finalTask.status.message?.parts[0].text).toContain('Conservative treatment details');
        expect(finalTask.status.message?.parts[0].text).toContain('Red flags OR Surgery Rationale');
    });

     it('should complete MRI task if follow-up message provides required info', async () => {
         const taskId = 'task-mri-complete-1';
         // Step 1: Initial incomplete request
         const initialParams: TaskSendParams = {
             id: taskId,
             message: { role: 'user', parts: [{ type: 'text', text: 'Need MRI for back pain.' }] },
             metadata: { skillId: 'prior-auth-medication' }
         };
         await makeRpcCall('tasks/send', initialParams);
         await Bun.sleep(1500); // Allow processing
         const taskAfterInitial = await makeRpcCall('tasks/get', { id: taskId });
         expect(taskAfterInitial.status.state).toBe('input-required'); // Verify it needs input

         // Step 2: Send follow-up message
         const resumeParams: TaskSendParams = {
             id: taskId, // Use same task ID to resume
             message: { role: 'user', parts: [{ type: 'text', text: 'Patient notes: Pain ongoing for 8 weeks, failed NSAIDs and physical therapy. Red flags present.' }] },
             metadata: { skillId: 'prior-auth-medication' } // Skill might be needed again? Check Core logic.
         };
         const resumeResult: Task = await makeRpcCall('tasks/send', resumeParams);
         // Resume call should transition to 'working'
         expect(resumeResult.status.state).toBe('working');

         // Step 3: Wait and check final state
         await Bun.sleep(1500); // Allow resume processing
         const finalTask = await makeRpcCall('tasks/get', { id: taskId });

         expect(finalTask.status.state).toBe('completed');
         expect(finalTask.status.message?.parts[0].text).toContain('Prior Authorization Approved');
         expect(finalTask.artifacts).toHaveLength(1);
         expect(finalTask.artifacts![0].name).toBe('PriorAuthApproval');
         expect(finalTask.artifacts![0].parts[0].data.status).toBe('Approved');
         expect(finalTask.artifacts![0].parts[0].data.approvalNumber).toMatch(/^PA-CANNED-/);
         expect(finalTask.artifacts![0].parts[0].data.policyId).toBe('lbp-mri-policy.md');
     });

     it('should require input again if follow-up for Botox is still incomplete', async () => {
        const taskId = 'task-botox-incomplete-2';
        // Step 1: Initial request triggering Botox policy but incomplete
        const initialParams: TaskSendParams = {
            id: taskId,
            message: { role: 'user', parts: [{ type: 'text', text: 'Botox for concussion headache' }] },
            metadata: { skillId: 'prior-auth-medication' }
        };
        await makeRpcCall('tasks/send', initialParams);
        await Bun.sleep(1500);
        const taskAfterInitial = await makeRpcCall('tasks/get', { id: taskId });
        expect(taskAfterInitial.status.state).toBe('input-required');
        expect(taskAfterInitial.status.message?.parts[0].text).toContain('PCS Diagnosis'); // Ensure initial check caught missing info

        // Step 2: Send follow-up providing *some* info
         const resumeParams: TaskSendParams = {
             id: taskId,
             message: { role: 'user', parts: [{ type: 'text', text: 'Patient has PCS diagnosis. Headaches ongoing > 3 months.' }] },
             metadata: { skillId: 'prior-auth-medication' }
         };
         const resumeResult: Task = await makeRpcCall('tasks/send', resumeParams);
         expect(resumeResult.status.state).toBe('working');

         // Step 3: Wait and check final state - should still need input
         await Bun.sleep(1500);
         const finalTask = await makeRpcCall('tasks/get', { id: taskId });

         expect(finalTask.status.state).toBe('input-required');
         expect(finalTask.status.message?.parts[0].text).toContain('Still missing information');
         expect(finalTask.status.message?.parts[0].text).toContain('Trial of >= 2 standard prophylactics');
         expect(finalTask.status.message?.parts[0].text).toContain('Medication Overuse Headache ruled out');
    });

    // TODO: Add test for task completion on initial submission (e.g., provide all MRI info at once)
    // TODO: Add test for authentication failure
}); 
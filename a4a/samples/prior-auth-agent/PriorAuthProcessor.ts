import type {
    TaskProcessor,
    TaskUpdater,
    TaskSendParams,
    Message,
    Task,
    Part,
    Artifact,
    DataPart,
    TextPart
} from '@a2a/bun-express';
import { randomUUID } from 'node:crypto';
// Import the interface and potentially a default implementation
import type { PolicyLLMInterface, PolicyCheckResult, SubmissionEvaluationResult } from './src/policyLLMInterface'; // Correct path
import { CannedPolicyLLM } from './src/policyLLMInterface'; // Correct path

export class PriorAuthProcessor implements TaskProcessor {

    private policyLLM: PolicyLLMInterface;

    // Inject the PolicyLLM implementation (or use a default)
    constructor(policyLLM?: PolicyLLMInterface) {
        this.policyLLM = policyLLM || new CannedPolicyLLM(); // Use injected or default to Canned
        console.log(`[PriorAuthProcessor] Initialized with LLM implementation: ${this.policyLLM.constructor.name}`);
    }

    // Check for specific skill ID (canHandle remains simple)
  async canHandle(params: TaskSendParams): Promise<boolean> {
      return params.metadata?.skillId === 'prior-auth-medication';
  }

  // Handle the initial PA request
  async start(params: TaskSendParams, updater: TaskUpdater, authContext?: any): Promise<void> {
    console.log(`[PriorAuthProcessor] Starting task ${updater.taskId}. Auth context:`, authContext);
      // Auth check example (can be enhanced)
    if (!authContext?.userId) {
           console.warn(`[PriorAuthProcessor] Auth context missing or invalid for task ${updater.taskId}. Failing task.`);
           await updater.signalCompletion('failed', {role: 'agent', parts:[{type: 'text', text: 'Authentication failed.'}]});
           return;
    }

    try {
        await updater.updateStatus('working', { role: 'agent', parts: [{ type: 'text', text: 'Received PA request. Checking applicable policies...' }] });

        // 1. Check policy using the injected LLM implementation
        const policyCheck: PolicyCheckResult = await this.policyLLM.checkPolicy(params);
        const policyFilename = policyCheck.policyFilename;
        const policyContent = policyCheck.policyContent; // Get content directly from check result

        if (policyFilename && policyContent) {
            console.log(`[PriorAuthProcessor] Policy '${policyFilename}' applies. Evaluating initial submission.`);
            // Store policy FILENAME and content using internal state
            let updatedMetadata: Record<string, any> | undefined = undefined;
            try {
                const internalState = {
                     policyFilename: policyFilename,
                     policyContent: policyContent, // Store content here now
                     policyDetails: policyCheck.details 
                 };
                await updater.setInternalState(internalState);
                console.log(`[PriorAuthProcessor] Policy details and content stored in internal task state.`);

                // Also store filename in public metadata for potential client visibility/debugging
                 updatedMetadata = { ...(params.metadata || {}), policyFilename: policyFilename };
                 // Hacky access for example, needs stable API - Ideally updater.updateMetadata()
                 await (updater as any)._core?.taskStore?.updateTask(updater.taskId, { 
                    metadata: updatedMetadata 
                });
                console.log(`[PriorAuthProcessor] Policy filename stored in task metadata.`);

            } catch (stateError) {
                console.error(`[PriorAuthProcessor] Failed to store policy in internal state/metadata for task ${updater.taskId}. Error:`, stateError);
                await updater.signalCompletion('failed', {role: 'agent', parts:[{type: 'text', text: 'Internal error storing policy details.'}]});
                 return;
            }

            await updater.updateStatus('working', { role: 'agent', parts: [{ type: 'text', text: `Policy '${policyFilename}' applies. Evaluating provided information...` }] });

            // Construct a minimal task object for evaluation, assuming metadata update succeeded
            const taskForEval: Partial<Task> & Pick<Task, 'id' | 'metadata'> = {
                id: updater.taskId,
                metadata: updatedMetadata, // Use the metadata we tried to set
                 // Include other necessary fields if evaluateSubmission uses them (it shouldn't need much else)
                 status: { state: 'working', timestamp: new Date().toISOString() }, // Added timestamp
                 history: [], // Assume empty history for initial eval
            };

            // 2. Evaluate the *initial* submission against the policy
            const evaluationResult = await this.policyLLM.evaluateSubmission(
                taskForEval as Task, // Cast to Task, acknowledge it's partial
                params.message,
                policyContent // Pass content explicitly too
            );

            if (evaluationResult.isComplete) {
                // Policy met with initial submission
                const approvalArtifact: Omit<Artifact, 'id' | 'index' | 'timestamp'> = {
                     name: 'PriorAuthApproval',
          parts: [
                          { type: 'data', data: { status: 'Approved', approvalNumber: evaluationResult.approvalNumber, policyId: policyFilename } }
                      ]
                };
                await updater.addArtifact(approvalArtifact);
                await updater.signalCompletion('completed', { role: 'agent', parts: [{ type: 'text', text: `Prior Authorization Approved. Number: ${evaluationResult.approvalNumber}` }] });
                console.log(`[PriorAuthProcessor] Task ${updater.taskId} completed on initial submission. Approval: ${evaluationResult.approvalNumber}`);
            } else {
                // Policy applies, but initial submission is incomplete
                await updater.updateStatus('input-required', {
                     role: 'agent',
                     parts: [{ type: 'text', text: evaluationResult.missingInfo ?? 'Additional information required based on policy.' }]
                });
                console.log(`[PriorAuthProcessor] Task ${updater.taskId} requires input: ${evaluationResult.missingInfo}`);
            }
      } else {
            // No policy applies
            console.log(`[PriorAuthProcessor] No PA policy applicable. Completing task.`);
            await updater.signalCompletion('completed', { role: 'agent', parts: [{ type: 'text', text: 'No Prior Authorization required based on initial assessment.' }] });
      }

    } catch (error: any) {
      console.error(`[PriorAuthProcessor] Error during 'start' for task ${updater.taskId}:`, error);
      await updater.signalCompletion('failed', { role: 'agent', parts: [{ type: 'text', text: `Processing error: ${error.message}` }] });
    }
  }

  // Handle response when task was 'input-required'
  async resume(currentTask: Task, resumeMessage: Message, updater: TaskUpdater, authContext?: any): Promise<void> {
    console.log(`[PriorAuthProcessor] Resuming task ${updater.taskId} based on message from ${resumeMessage.role}. Task state before resume: ${currentTask.status.state}`);

       // Ensure task was actually waiting for input *before* the core transitioned it to working
       if (currentTask.status.state !== 'input-required') {
            console.warn(`[PriorAuthProcessor] Resume called on task ${updater.taskId} but its state *before* resume was ${currentTask.status.state}. Ignoring resume logic.`);
            // We might still want to add the user message to history even if we ignore the logic
            // await updater.addHistoryMessage(resumeMessage); // Consider adding this if appropriate
            // The task is already 'working' because the core set it.
            // We could optionally set it back to input-required here if ignoring the resume means asking again.
            // await updater.updateStatus('input-required', { role: 'agent', parts:[{type:'text', text: 'Unexpected message received. Still waiting for required input.'}]});
            return;
        }

        // Auth check on resume?
        if (!authContext?.userId) {
             console.warn(`[PriorAuthProcessor] Auth context missing or invalid on resume for task ${updater.taskId}. Failing task.`);
             await updater.signalCompletion('failed', {role: 'agent', parts:[{type: 'text', text: 'Authentication failed during resume.'}]});
          return;
      }

    try {
        await updater.updateStatus('working', { role: 'agent', parts: [{ type: 'text', text: 'Received additional information. Re-evaluating against policy...' }] });
        
        // Retrieve the internal state stored previously
        const internalState = await updater.getInternalState();
        const policyContent = internalState?.policyContent as string | undefined;
        const policyFilename = internalState?.policyFilename as string | undefined;

        if (!policyFilename || !policyContent) {
            console.error(`[PriorAuthProcessor] Cannot resume task ${updater.taskId}: Policy information missing from internal state.`);
             await updater.signalCompletion('failed', { role: 'agent', parts: [{ type: 'text', text: 'Internal error: Policy context lost.' }] });
            return;
        }
        console.log(`[PriorAuthProcessor] Resuming evaluation against policy: ${policyFilename}`);

        // Evaluate the submission 
        // Pass currentTask which *might* have history from TaskStore get
        const evaluationResult = await this.policyLLM.evaluateSubmission(
            currentTask, 
            resumeMessage,
            policyContent // Pass the retrieved policy content
        );

         if (evaluationResult.isComplete) {
             // Policy now met
             const approvalArtifact: Omit<Artifact, 'id' | 'index' | 'timestamp'> = {
                  name: 'PriorAuthApproval',
                  parts: [
                      { type: 'data', data: { status: 'Approved', approvalNumber: evaluationResult.approvalNumber, policyId: policyFilename } }
                  ]
             };
             await updater.addArtifact(approvalArtifact);
             await updater.signalCompletion('completed', { role: 'agent', parts: [{ type: 'text', text: `Prior Authorization Approved based on additional information. Number: ${evaluationResult.approvalNumber}` }] });
             console.log(`[PriorAuthProcessor] Task ${updater.taskId} completed after resume. Approval: ${evaluationResult.approvalNumber}`);
         } else {
             // Still incomplete after resume
             await updater.updateStatus('input-required', {
                  role: 'agent',
                  parts: [{ type: 'text', text: `Still missing information: ${evaluationResult.missingInfo ?? 'Policy requirements not yet met.'}` }]
             });
             console.log(`[PriorAuthProcessor] Task ${updater.taskId} still requires input after resume: ${evaluationResult.missingInfo}`);
         }

    } catch (error: any) {
             console.error(`[PriorAuthProcessor] Error during 'resume' for task ${updater.taskId}:`, error);
             await updater.signalCompletion('failed', { role: 'agent', parts: [{ type: 'text', text: `Processing error during resume: ${error.message}` }] });
    }
  }

    // Removed handleInternalUpdate - logic moved to start/resume with policy evaluation
    // Removed simulateInternalCallback
    // Removed fetchFileContent and submitToClinicalReview (replaced by LLM placeholders)

}

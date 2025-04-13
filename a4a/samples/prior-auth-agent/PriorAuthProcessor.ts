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

// Simulate fetching a file from a URI (replace with actual fetch in real scenario)
async function fetchFileContent(uri: string): Promise<string> {
    console.log(`[PriorAuthProcessor] Simulating fetch for URI: ${uri}`);
    // In real world: use Bun.fetch(uri).then(res => res.arrayBuffer()) etc.
    await Bun.sleep(200);
    if (uri.includes("labs")) return "Simulated PDF content for Labs";
    if (uri.includes("lmn")) return "Simulated PDF content for Letter of Medical Necessity";
    return "Simulated generic file content";
}

// Simulate interacting with a backend clinical review system
async function submitToClinicalReview(taskId: string, data: any): Promise<string> {
     console.log(`[PriorAuthProcessor] Submitting task ${taskId} data to internal clinical review system.`);
     await Bun.sleep(1000);
     // Returns a correlation ID or reference for the review
     return `review-ref-${taskId.substring(0, 6)}`;
}

export class PriorAuthProcessor implements TaskProcessor {

  // Check for specific skill ID or structure in data part
  async canHandle(params: TaskSendParams): Promise<boolean> {
    if (params.metadata?.skillId === 'prior-auth-medication') return true;
    const dataPart = params.message.parts.find(p => p.type === 'data') as DataPart | undefined;
    return dataPart?.data?.requestType === 'medicationPriorAuth';
  }

  // Handle the initial PA request
  async start(params: TaskSendParams, updater: TaskUpdater, authContext?: any): Promise<void> {
    console.log(`[PriorAuthProcessor] Starting task ${updater.taskId}. Auth context:`, authContext);

    if (!authContext?.userId) {
         // Example of checking auth context passed from Express middleware
         console.warn(`[PriorAuthProcessor] Authentication context missing for task ${updater.taskId}. Proceeding for sample, but should fail in production.`);
         // await updater.signalCompletion('failed', {role: 'agent', parts:[{type: 'text', text: 'Authentication failed.'}]});
         // return;
    }

    try {
      await updater.updateStatus('working', { role: 'agent', parts: [{ type: 'text', text: 'Received PA request. Performing initial validation...' }] });

      // --- Process Initial Request Parts ---
      const structuredData = (params.message.parts.find(p => p.type === 'data') as DataPart)?.data;
      const clinicalJustification = (params.message.parts.find(p => p.type === 'text') as TextPart)?.text;
      const fileParts = params.message.parts.filter(p => p.type === 'file');

      console.log(`[PriorAuthProcessor] Received Data:`, structuredData);
      console.log(`[PriorAuthProcessor] Justification:`, clinicalJustification);

      // Simulate fetching attached files (if URI provided)
      for (const part of fileParts) {
        if (part.type === 'file' && part.file.uri) {
          const content = await fetchFileContent(part.file.uri);
          console.log(`[PriorAuthProcessor] Fetched content for ${part.file.name || 'file'}: ${content.substring(0, 50)}...`);
          // In real agent, store or process this content
        } else if (part.type === 'file' && part.file.bytes) {
             console.log(`[PriorAuthProcessor] Received file ${part.file.name || 'file'} with base64 data.`);
             // Decode and process bytes
        }
      }

      await Bun.sleep(500); // Simulate validation logic

      // --- Simulate Business Logic Decision ---
      const requiresLMN = !clinicalJustification?.toLowerCase().includes("letter of medical necessity attached"); // Simple check for demo

      if (requiresLMN) {
        console.log(`[PriorAuthProcessor] Task ${updater.taskId} requires LMN.`);
        const requiredDocs = [{ code: 'LMN_V1', description: 'Signed Letter of Medical Necessity (PDF)' }];
        const inputRequiredMsg: Message = {
          role: 'agent',
          parts: [
            { type: 'text', text: 'Clinical review required. Please attach the following document(s):' },
            { type: 'data', data: { requiredDocuments: requiredDocs }, metadata: { schema: "https://schemas.payer.com/pa_required_docs_v1.json" } }
          ]
        };
        await updater.updateStatus('input-required', inputRequiredMsg);
        console.log(`[PriorAuthProcessor] Task ${updater.taskId} moved to input-required.`);
      } else {
        // If LMN seems attached or not needed by initial rules
        console.log(`[PriorAuthProcessor] Task ${updater.taskId} proceeding to clinical review simulation.`);
        // Simulate submission to backend
        const reviewRef = await submitToClinicalReview(updater.taskId, { structuredData, clinicalJustification, files: fileParts });
        await updater.updateStatus('working', { role: 'agent', parts: [{ type: 'text', text: `Request submitted for clinical review. Reference: ${reviewRef}` }] });
        // In a real scenario, the task stays 'working' until the backend calls back via handleInternalUpdate
        console.log(`[PriorAuthProcessor] Task ${updater.taskId} waiting for internal update (simulated).`);
        // For the sample, we can auto-trigger the internal update after a delay
        this.simulateInternalCallback(updater.taskId, 'approved', 5000); // Simulate approval after 5s
      }

    } catch (error: any) {
      console.error(`[PriorAuthProcessor] Error during 'start' for task ${updater.taskId}:`, error);
      await updater.signalCompletion('failed', { role: 'agent', parts: [{ type: 'text', text: `Processing error: ${error.message}` }] });
    }
  }

  // Handle response when task was 'input-required'
  async resume(currentTask: Task, resumeMessage: Message, updater: TaskUpdater, authContext?: any): Promise<void> {
    console.log(`[PriorAuthProcessor] Resuming task ${updater.taskId} based on message from ${resumeMessage.role}.`);

     if (currentTask.status.state !== 'input-required') {
          console.warn(`[PriorAuthProcessor] Resume called on task ${updater.taskId} but state is ${currentTask.status.state}. Ignoring resume.`);
          // Optionally update status back to working or add history message
          await updater.addHistoryMessage({role:'agent', parts: [{type:'text', text: `Received unexpected resume message while in state ${currentTask.status.state}`}]});
          return;
      }

    try {
      await updater.updateStatus('working', { role: 'agent', parts: [{ type: 'text', text: 'Received additional information. Resuming processing...' }] });

      // Process the new message parts (e.g., find the LMN file)
      const fileParts = resumeMessage.parts.filter(p => p.type === 'file');
       for (const part of fileParts) {
        if (part.type === 'file' && part.file.uri) {
          const content = await fetchFileContent(part.file.uri);
           console.log(`[PriorAuthProcessor] Fetched content for ${part.file.name || 'file'}: ${content.substring(0, 50)}...`);
           // Check if it's the LMN, store/process
        } else if (part.type === 'file' && part.file.bytes) {
             console.log(`[PriorAuthProcessor] Received file ${part.file.name || 'file'} with base64 data.`);
        }
      }
       // Assume LMN was provided correctly for the demo
      console.log(`[PriorAuthProcessor] Task ${updater.taskId} assuming LMN received, proceeding to clinical review simulation.`);

      // Simulate submission to backend (using data from original task + new message)
      const allData = { originalRequest: currentTask.metadata?.initialData, lmnMessage: resumeMessage }; // Need to store original data better
      const reviewRef = await submitToClinicalReview(updater.taskId, allData);
      await updater.updateStatus('working', { role: 'agent', parts: [{ type: 'text', text: `Request with additional documents submitted for review. Reference: ${reviewRef}` }] });

       console.log(`[PriorAuthProcessor] Task ${updater.taskId} waiting for internal update (simulated).`);
        // Again, simulate the callback for the demo
       this.simulateInternalCallback(updater.taskId, 'rejected', 7000); // Simulate rejection after 7s

    } catch (error: any) {
      console.error(`[PriorAuthProcessor] Error during 'resume' for task ${updater.taskId}:`, error);
      await updater.signalCompletion('failed', { role: 'agent', parts: [{ type: 'text', text: `Processing error during resume: ${error.message}` }] });
    }
  }

  // Handle updates from the backend system (triggered via internal mechanism)
  async handleInternalUpdate(taskId: string, updatePayload: any, updater: TaskUpdater): Promise<void> {
    console.log(`[PriorAuthProcessor] Handling internal update for task ${taskId}. Payload:`, updatePayload);

    try {
        const determination = updatePayload.status; // 'approved' or 'rejected'
        const reason = updatePayload.reason ?? (determination === 'approved' ? 'Meets clinical criteria.' : 'Insufficient clinical justification provided.');
        const determinationDocContent = `Simulated PA Determination Document\nTask ID: ${taskId}\nStatus: ${determination}\nReason: ${reason}\nDate: ${new Date().toLocaleDateString()}`;
        const determinationDocBytes = Buffer.from(determinationDocContent).toString('base64');

        // Add determination artifact
         const artifactData: Omit<Artifact, 'index' | 'id' | 'timestamp'> = {
             name: 'PriorAuthDetermination',
             parts: [
                 { type: 'data', data: { status: determination, reason: reason }, metadata: { schema: "https://schemas.payer.com/pa_determination_v1.json" } },
                 { type: 'file', file: { name: `PA_${determination}_${taskId.substring(0,6)}.pdf`, mimeType: 'application/pdf', bytes: determinationDocBytes } }
             ]
         };
        await updater.addArtifact(artifactData);

        // Signal final completion
        const finalMessageText = `Prior Authorization ${determination}. ${reason}`;
        await updater.signalCompletion('completed', { role: 'agent', parts: [{ type: 'text', text: finalMessageText }] });
        console.log(`[PriorAuthProcessor] Task ${taskId} completed via internal update. Final status: ${determination}`);

    } catch (error: any) {
        console.error(`[PriorAuthProcessor] Error during 'handleInternalUpdate' for task ${taskId}:`, error);
        // Don't call signalCompletion('failed') again if it's already failed, maybe just log
         if (updater.currentStatus !== 'failed') {
             await updater.signalCompletion('failed', { role: 'agent', parts: [{ type: 'text', text: `Error processing internal update: ${error.message}` }] });
         }
    }
  }

   // --- Simulation Helper ---
   private simulateInternalCallback(taskId: string, outcome: 'approved' | 'rejected', delayMs: number): void {
       console.log(`[PriorAuthProcessor] Simulating internal callback for task ${taskId} (${outcome}) in ${delayMs}ms...`);
       setTimeout(() => {
            // In a real app, this would be triggered by an incoming request to the internal callback endpoint
            console.log(`[PriorAuthProcessor] Triggering simulated internal callback for task ${taskId}`);
            // Need access to the A2AServerCore instance to call triggerInternalUpdate
            // This is tricky from within the processor. The core server should manage this.
            // WORKAROUND for sample: Make a fetch call to a dedicated endpoint on our own server.
            fetch(`http://localhost:${process.env.PORT || 3002}/internal-callback/${taskId}`, { // Adjust port
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ status: outcome, reason: `Simulated outcome: ${outcome}` })
            }).catch(err => console.error(`[PriorAuthProcessor] Failed to trigger simulated callback for ${taskId}:`, err));
       }, delayMs);
   }

}

import crypto from 'node:crypto'; // Import crypto
import fs from 'node:fs/promises';
import path from 'node:path';
import type { ProcessorInputValue, ProcessorStepContext, ProcessorYieldValue, TaskProcessorV2 } from '../../src/interfaces/processorV2';
import { ProcessorCancellationError } from '../../src/interfaces/processorV2';
import type { Message, Part, TaskSendParams, TextPart } from '../../src/types';
import type { PolicyEvalResult, PriorAuthEvaluator, PriorAuthRequestDetails } from './evaluators'; // Import interfaces
import { KeywordEvaluator } from './KeywordEvaluator'; // Import it
import { GeminiEvaluator } from './GeminiEvaluator';
// Gemini Helper

// Helper Function to extract text from all message parts
function extractTextFromMessage(message: Message | undefined | null): string {
    if (!message?.parts) {
        return '';
    }
    return message.parts
        .map(p => p.type === 'text' ? p.text : p.type === 'data' ? JSON.stringify(p.data) : '')
        .filter(Boolean) // Remove empty strings from non-text/data parts
        .join('\n')
        .trim();
}

export class PriorAuthProcessor implements TaskProcessorV2 {
    private static PRIOR_AUTH_SKILL = 'priorAuthRequest';
    private policiesDir = path.join(import.meta.dir, '../../client/react-demo/public/premera_policies');
    private evaluator: PriorAuthEvaluator; // Use the interface

    constructor() {
        // Instantiate the desired evaluator implementation
        this.evaluator = new GeminiEvaluator();
        // this.evaluator = new KeywordEvaluator(); // Use the keyword evaluator
    }

    async canHandle(_params: TaskSendParams): Promise<boolean> {
            return true;
    }

    async *process(context: ProcessorStepContext, initialParams: TaskSendParams): AsyncGenerator<ProcessorYieldValue, void, ProcessorInputValue> {
        const taskId = context.task.id;
        console.log(`[PriorAuthProc ${taskId}] Starting task.`);
        let evaluationResult: PolicyEvalResult | undefined = undefined; // Use undefined initially
        let requestDetails: PriorAuthRequestDetails | null = null;
        let policyTextForEval: string | null = null; // Store policy text (MD or PDF) for evaluation

        try {
            yield { type: 'statusUpdate', state: 'working', message: { role: 'agent', parts: [{ type: 'text', text: 'Processing prior authorization request...' }] } };

            // --- 1. Extract Request Text --- 
            let initialRequestText = extractTextFromMessage(initialParams.message);
            // (Keep the loop for prompting if initial text is missing)
            while (!initialRequestText) {
                const inputPrompt: Message = {
                    role: 'agent',
                    parts: [{ type: 'text', text: 'Please describe the prior authorization need.' }]
                };
                const userInput = yield { type: 'statusUpdate', state: 'input-required', message: inputPrompt };
                if (!userInput || userInput.type !== 'message') {
                    throw new ProcessorCancellationError('User did not provide the prior authorization request details.');
                }
                initialRequestText = extractTextFromMessage(userInput.message);
                if (!initialRequestText) {
                     yield { type: 'statusUpdate', state: 'working', message: { role: 'agent', parts: [{ type: 'text', text: 'I didn\'t receive text. Please describe the request.' }] } };
                }
            }
            console.log(`[PriorAuthProc ${taskId}] Received request text: ${initialRequestText}...`);


            // --- 2. Parse Request Details using Evaluator --- 
            // (Keep the loop for handling parsing errors)
            let parsed = false;
            while (!parsed) {
                yield { type: 'statusUpdate', state: 'working', message: { role: 'agent', parts: [{ type: 'text', text: 'Parsing request details...' }] } };
                try {
                    requestDetails = await this.evaluator.parseInitialRequest(initialRequestText!, taskId);
                    console.log(`[PriorAuthProc ${taskId}] Parsed request details:`, requestDetails);
                    parsed = true;
                } catch (parseError: any) {
                    console.error(`[PriorAuthProc ${taskId}] Error parsing request details:`, parseError);
                    const detailPrompt: Message = {
                        role: 'agent',
                        parts: [{ type: 'text', text: `Failed to understand the request: ${parseError.message}. Please provide more details.` }]
                    };
                    const userInput = yield { type: 'statusUpdate', state: 'input-required', message: detailPrompt };
                     if (!userInput || userInput.type !== 'message') {
                        throw new ProcessorCancellationError('User did not provide additional details for the request.');
                    }
                    initialRequestText = extractTextFromMessage(userInput.message);
                     if (!initialRequestText) {
                        yield { type: 'statusUpdate', state: 'working', message: { role: 'agent', parts: [{ type: 'text', text: 'I didn\'t receive text. Please provide additional details.' }] } };
                        // Stay in the parsing loop
                     }
                }
            }

            // --- 3. Find Relevant Policy and Read Content --- 
            yield { type: 'statusUpdate', state: 'working', message: { role: 'agent', parts: [{ type: 'text', text: 'Identifying relevant policy...' }] } };
            let policyIndexContent: string | null = null;
            let selectedPolicyTitle: string | null = null;
            let selectedPolicyId: string | null = null;
            let policyFilename: string | null = null;
            let policyPdfBase64: string | null = null;
            let policyMdFilename: string | null = null;
            let policyMdBase64: string | null = null;
            let policyMdText: string | null = null;

            try {
                const indexFilePath = path.join(this.policiesDir, 'index.txt');
                const indexFile = Bun.file(indexFilePath);
                if (!(await indexFile.exists())) throw new Error('Policy index file not found.');
                policyIndexContent = await indexFile.text();

                // Find policy ID using evaluator
                selectedPolicyId = await this.evaluator.findRelevantPolicy(requestDetails!, policyIndexContent!, taskId);
                if (!selectedPolicyId) throw new Error('No relevant prior authorization policy found for the request described.');

                // Extract title from index
                const lines = policyIndexContent.split('\n');
                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (trimmedLine.startsWith(selectedPolicyId + ' |')) {
                        selectedPolicyTitle = trimmedLine.split('|', 2)[1]?.trim() || `Policy ${selectedPolicyId}`;
                        break;
                    }
                }
                selectedPolicyTitle = selectedPolicyTitle || `Policy ${selectedPolicyId}`; // Ensure title is set

                // Read PDF
                policyFilename = `${selectedPolicyId}.pdf`;
                const policyFilePath = path.join(this.policiesDir, policyFilename);
                const policyFile = Bun.file(policyFilePath);
                 if (!(await policyFile.exists())) throw new Error(`Selected policy file not found: ${policyFilename}`);
                const policyTextPdf = await policyFile.text(); // Read text for potential fallback evaluation
                try {
                    const policyBuffer = await policyFile.arrayBuffer();
                    policyPdfBase64 = Buffer.from(policyBuffer).toString('base64');
                } catch (readPdfErr) { console.error(`Error reading PDF buffer: ${readPdfErr}`); }
                
                // Read MD if exists
                policyMdFilename = policyFilename.replace(/\.pdf$/i, '.md');
                const policyMdFilePath = path.join(this.policiesDir, policyMdFilename);
                const policyMdFile = Bun.file(policyMdFilePath);
                if (await policyMdFile.exists()) {
                     try {
                        policyMdText = await policyMdFile.text(); // Read text for evaluation
                        const policyMdBuffer = await policyMdFile.arrayBuffer();
                        policyMdBase64 = Buffer.from(policyMdBuffer).toString('base64');
                    } catch (readMdErr) { console.error(`Error reading MD file: ${readMdErr}`); policyMdFilename = null; }
                } else {
                    policyMdFilename = null; // Ensure null if not found
                }

                // Determine policy text to use for evaluation (prefer MD)
                policyTextForEval = policyMdText ?? policyTextPdf;
                if (!policyTextForEval) throw new Error('Failed to load any policy text (MD or PDF) for evaluation.');
                 console.log(`[PriorAuthProc ${taskId}] Using ${policyMdText ? 'Markdown' : 'PDF'} content for evaluation.`);

            } catch (e: any) {
                console.error(`[PriorAuthProc ${taskId}] Error identifying or reading policy:`, e);
                yield { type: 'statusUpdate', state: 'failed', message: { role: 'agent', parts: [{ type: 'text', text: `Internal error: Could not access policy definitions (${e.message}).` }] } };
                return;
            }

            // --- 4. Prepare Initial Input Request Message --- 
            const initialQuestionText = `The relevant policy is "${selectedPolicyTitle}" (ID: ${selectedPolicyId}). Based on this policy and your request (Procedure: ${requestDetails?.procedure || 'N/A'}, Diagnosis: ${requestDetails?.diagnosis || 'N/A'}), please provide any additional details required for approval. The policy document(s) are attached.`;
            let messageParts: Part[] = [{ type: 'text', text: initialQuestionText }];
            if (policyPdfBase64 && policyFilename) {
                 messageParts.push({ type: 'file', file: { name: policyFilename, mimeType: 'application/pdf', bytes: policyPdfBase64 } });
            }
             if (policyMdBase64 && policyMdFilename) {
                 messageParts.push({ type: 'file', file: { name: policyMdFilename, mimeType: 'text/markdown', bytes: policyMdBase64 } });
            }
            let currentInputRequiredMessage: Message = { role: 'agent', parts: messageParts };

            yield { type: 'statusUpdate', state: 'working', message: { role: 'agent', parts: [{ type: 'text', text: 'Preparing initial request for clinician input...' }] } };

            // --- 5. Unified Evaluation Loop --- 
            while (true) {
                // --- 5a. Yield for User Input --- 
                 console.log(`[PriorAuthProc ${taskId}] Yielding input-required. Message:`, currentInputRequiredMessage.parts.find(p => p.type === 'text')?.text.substring(0,100));
                 const userInput = yield {
                    type: 'statusUpdate',
                    state: 'input-required',
                    message: currentInputRequiredMessage
                 };

                 // --- 5b. Process User Input --- 
                if (!userInput || userInput.type !== 'message') {
                    throw new ProcessorCancellationError('User did not provide required input or signal received.');
                }
                // Use helper to extract from all text/data parts
                const userResponseText = extractTextFromMessage(userInput.message); 
                if (!userResponseText) {
                    console.warn(`[PriorAuthProc ${taskId}] User response message did not contain text or data.`);
                    yield { type: 'statusUpdate', state: 'working', message: { role: 'agent', parts: [{ type: 'text', text: 'I didn\'t receive text/data in your response. Asking again...' }] } };
                    // Let currentInputRequiredMessage remain the same and loop again
                    continue; 
                }
                console.log(`[PriorAuthProc ${taskId}] Received user response: ${userResponseText}...`);
                yield { type: 'statusUpdate', state: 'working', message: { role: 'agent', parts: [{ type: 'text', text: 'Evaluating your submission.' }] } };

                // --- 5c. Evaluate --- 
                 try {
                     evaluationResult = await this.evaluator.evaluateAgainstPolicy(
                         policyTextForEval, // Use the text determined earlier
                         requestDetails!,   
                         taskId,            
                         evaluationResult,  // Pass previous result (undefined first time)
                         userResponseText   // Pass the new user input
                     );
                     console.log(`[PriorAuthProc ${taskId}] Evaluation result:`, evaluationResult);
                 } catch (evalError: any) {
                     console.error(`[PriorAuthProc ${taskId}] Error during evaluation:`, evalError);
                     yield { type: 'statusUpdate', state: 'failed', message: { role: 'agent', parts: [{ type: 'text', text: `Failed evaluation: ${evalError.message}` }] } };
                     return; // Exit processor on evaluation error
                 }

                // --- 5d. Check Decision and Loop/Break --- 
                 if (evaluationResult?.decision === 'Needs More Info') {
                     console.log(`[PriorAuthProc ${taskId}] Evaluation requires more info. Reason: ${evaluationResult.reason}`);
                     yield { type: 'statusUpdate', state: 'working', message: { role: 'agent', parts: [{ type: 'text', text: 'Drafting follow-up question...' }] } };
                     let nextQuestionText: string;
                    try {
                        nextQuestionText = await this.evaluator.draftResponse(evaluationResult, requestDetails!, taskId);
                    } catch (draftError: any) {
                        console.error(`[PriorAuthProc ${taskId}] Error drafting follow-up question:`, draftError);
                        nextQuestionText = `Decision: ${evaluationResult.decision}. Reason: ${evaluationResult.reason}. Failed to draft specific question (${draftError.message}). Please provide more details.`;
                    }
                    // Update the message for the next iteration
                     currentInputRequiredMessage = { role: 'agent', parts: [{ type: 'text', text: nextQuestionText }] };
                     // Continue loop
                 } else {
                     // Decision is Approved, CannotApprove, or unexpected
                     console.log(`[PriorAuthProc ${taskId}] Evaluation loop finished. Final Decision: ${evaluationResult?.decision}`);
                     break; // Exit the loop
                 }
             } // End while loop


             // --- 6. Final Evaluation Result Processing --- 
             console.log(`[PriorAuthProc ${taskId}] Processing final decision: ${evaluationResult?.decision}`);

             // --- 6a. Yield Final Artifact --- 
            if (evaluationResult) { 
                if (evaluationResult.decision === 'Approved') {
                    // --- Generate Enhanced Approval Artifact ---
                    const approvalTimestamp = new Date().toISOString();
                    const approvalReferenceNumber = crypto.randomUUID();
                    const approvalArtifactData = {
                        status: evaluationResult.decision, // Explicit status
                        reason: evaluationResult.reason,
                        approvalReferenceNumber: approvalReferenceNumber,
                        timestamp: approvalTimestamp,
                        digitalSignature: `placeholder-signature-for-${approvalReferenceNumber}` // Placeholder
                    };
                    console.log(`[PriorAuthProc ${taskId}] Yielding enhanced approval artifact.`);
                    yield {
                        type: 'artifact',
                        artifactData: {
                            index: 0,
                            name: 'prior-auth-approval', // Specific name
                            parts: [
                                { type: 'data', data: approvalArtifactData }
                            ]
                        }
                    };
                } else { // Includes 'CannotApprove' and potentially others
                    // --- Yield standard evaluation result for non-approved finals ---
                    console.log(`[PriorAuthProc ${taskId}] Yielding standard evaluation artifact (Decision: ${evaluationResult.decision}).`);
                    yield {
                        type: 'artifact',
                        artifactData: {
                            index: 0,
                            name: 'prior-auth-evaluation-final',
                            parts: [
                                { type: 'data', data: evaluationResult } 
                            ]
                        }
                    };
                }
            } else {
                 console.error(`[PriorAuthProc ${taskId}] Reached end of processing but evaluationResult is null/undefined. Cannot yield artifact.`);
                 // Final status will be set below
            }

            // --- 6b. Draft Final Response Message --- 
            yield { type: 'statusUpdate', state: 'working', message: { role: 'agent', parts: [{ type: 'text', text: 'Drafting final response...' }] } };
            let finalMessageText: string;
             try {
                // Draft response based on the *final* evaluation result
                 finalMessageText = await this.evaluator.draftResponse(evaluationResult!, requestDetails!, taskId);
             } catch (draftError: any) {
                 console.error(`[PriorAuthProc ${taskId}] Error drafting final response:`, draftError);
                 // Construct a fallback based on the final decision 
                if (evaluationResult?.decision === 'Approved') {
                     finalMessageText = `Decision: Approved. Reason: ${evaluationResult.reason}. (Failed to draft response: ${draftError.message})`;
                 } else if (evaluationResult?.decision === 'CannotApprove') {
                     finalMessageText = `Automated approval could not be completed (Reason: ${evaluationResult.reason}). Forwarding for human review. (Failed response draft: ${draftError.message})`;
                 } else { // Handle null/undefined or other unexpected decision
                    finalMessageText = `Processing completed, but final status unclear (${evaluationResult?.decision ?? 'No result'}). (Failed response draft: ${draftError.message})`;
                 }
            }

            // --- 6c. Signal Completion --- 
            // Final state is always 'completed' because the loop exits only on 'Approved' or 'CannotApprove'
            // (or an error would have terminated earlier)
             yield { type: 'statusUpdate', state: 'completed', message: { role: 'agent', parts: [{ type: 'text', text: finalMessageText }] } };
             console.log(`[PriorAuthProc ${taskId}] Task finished with final state: completed`);

        } catch (error: any) {
            console.error(`[PriorAuthProc ${taskId}] Unhandled error during processing:`, error);
            let yieldErrorState: 'failed' | 'canceled' = 'failed';
            let yieldErrorMessage = `An unexpected error occurred: ${error.message}`;

            if (error instanceof ProcessorCancellationError) {
                 yieldErrorState = 'canceled';
                 yieldErrorMessage = 'Prior authorization request canceled.';
                 console.log(`[PriorAuthProc ${taskId}] Task processing canceled.`);
            }
             try {
                 // Check context exists and has status before accessing
                 const currentStatus = context?.task?.status?.state; 
                 if (currentStatus !== 'completed' && currentStatus !== 'failed' && currentStatus !== 'canceled') {
                     yield { type: 'statusUpdate', state: yieldErrorState, message: { role: 'agent', parts: [{ type: 'text', text: yieldErrorMessage }] } };
                 }
             } catch (yieldError) {
                  console.error(`[PriorAuthProc ${taskId}] Error yielding final error state:`, yieldError);
             }
        } finally {
            console.log(`[PriorAuthProc ${taskId}] Exiting process function.`);
        }
    }
}

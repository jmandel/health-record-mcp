import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto'; // Import crypto
import type { ProcessorInputValue, ProcessorStepContext, ProcessorYieldValue, TaskProcessorV2 } from '../../src/interfaces/processorV2';
import { ProcessorCancellationError } from '../../src/interfaces/processorV2';
import type { TaskSendParams, Message, Part, TextPart } from '../../src/types';
import type { PolicyEvalResult, PriorAuthEvaluator, PriorAuthRequestDetails } from './evaluators'; // Import interfaces
import { KeywordEvaluator } from './KeywordEvaluator'; // Import it
import { GeminiEvaluator } from './GeminiEvaluator'; // Import the Gemini implementation
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai'; // Add missing import for Gemini classes used by evaluator
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
    private policiesDir = path.join(import.meta.dir, 'policies');
    private evaluator: PriorAuthEvaluator; // Use the interface

    constructor() {
        // Instantiate the desired evaluator implementation
        // this.evaluator = new GeminiEvaluator();
        this.evaluator = new KeywordEvaluator(); // Use the keyword evaluator
    }

    async canHandle(_params: TaskSendParams): Promise<boolean> {
            return true;
    }

    async *process(context: ProcessorStepContext, initialParams: TaskSendParams): AsyncGenerator<ProcessorYieldValue, void, ProcessorInputValue> {
        const taskId = context.task.id;
        console.log(`[PriorAuthProc ${taskId}] Starting task.`);
        let evaluationResult: PolicyEvalResult | null = null;
        let requestDetails: PriorAuthRequestDetails | null = null;
        let policyText: string | null = null; // Store policy text for potential re-evaluation

        try {
            yield { type: 'statusUpdate', state: 'working', message: { role: 'agent', parts: [{ type: 'text', text: 'Processing prior authorization request...' }] } };

            // --- 1. Extract Request Text --- 
            let initialRequestText = extractTextFromMessage(initialParams.message);

            // Prompt user for request text until provided
            while (!initialRequestText) {
                const inputPrompt: Message = {
                    role: 'agent',
                    parts: [{ type: 'text', text: 'Please describe the prior authorization need.' }]
                };
                const userInput = yield { type: 'statusUpdate', state: 'input-required', message: inputPrompt };
                if (!userInput || userInput.type !== 'message') {
                    throw new ProcessorCancellationError('User did not provide the prior authorization request details.');
                }
                const textPart = userInput.message.parts.find((p): p is TextPart => p.type === 'text');
                if (!textPart?.text) {
                    yield { type: 'statusUpdate', state: 'working', message: { role: 'agent', parts: [{ type: 'text', text: 'I didn\'t receive text. Please describe the request.' }] } };
                    continue;
                }
                // Use helper again if reprocessing is needed based on user input
                initialRequestText = extractTextFromMessage(userInput.message);
                console.log(`[PriorAuthProc ${taskId}] Received request text parts:\n${initialRequestText}`);
            }
            console.log(`[PriorAuthProc ${taskId}] Received request text: ${initialRequestText}...`);


            // --- 2. Parse Request Details using Evaluator --- 
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
                    const textPart = userInput.message.parts.find((p): p is TextPart => p.type === 'text');
                    if (!textPart?.text) {
                        yield { type: 'statusUpdate', state: 'working', message: { role: 'agent', parts: [{ type: 'text', text: 'I didn\'t receive text. Please provide additional details.' }] } };
                        continue;
                    }
                    // Use helper again if reprocessing is needed based on user input
                    initialRequestText = extractTextFromMessage(userInput.message);
                }
            }


            // --- 3. List Available Policies --- 
            yield { type: 'statusUpdate', state: 'working', message: { role: 'agent', parts: [{ type: 'text', text: 'Identifying relevant policy...' }] } };
            let policyFiles: string[] = [];
            try {
                policyFiles = await fs.readdir(this.policiesDir);
                policyFiles = policyFiles.filter(f => f.endsWith('.md'));
            } catch (e: any) {
                console.error(`[PriorAuthProc ${taskId}] Could not read policies directory: ${this.policiesDir}`, e);
                yield { type: 'statusUpdate', state: 'failed', message: { role: 'agent', parts: [{ type: 'text', text: 'Internal error: Could not access policy definitions.' }] } };
                return;
            }
            if (policyFiles.length === 0) {
                yield { type: 'statusUpdate', state: 'failed', message: { role: 'agent', parts: [{ type: 'text', text: 'Internal error: No policy definitions found.' }] } };
                return;
            }


            // --- 4. Find Relevant Policy using Evaluator --- 
            const selectedPolicyFilename = await this.evaluator.findRelevantPolicy(requestDetails!, policyFiles, taskId);

            if (!selectedPolicyFilename) {
                console.log(`[PriorAuthProc ${taskId}] Evaluator did not find a relevant policy.`);
                yield { type: 'statusUpdate', state: 'failed', message: { role: 'agent', parts: [{ type: 'text', text: `No relevant prior authorization policy found for the request described.` }] } };
                return;
            }
            const policyFilePath = path.join(this.policiesDir, selectedPolicyFilename);
            console.log(`[PriorAuthProc ${taskId}] Evaluator selected policy: ${selectedPolicyFilename}`);
            yield { type: 'statusUpdate', state: 'working', message: { role: 'agent', parts: [{ type: 'text', text: `Applying policy: ${selectedPolicyFilename}...` }] } };


            // --- 5. Read Policy File --- 
            const policyFile = Bun.file(policyFilePath);
            if (!(await policyFile.exists())) {
                yield { type: 'statusUpdate', state: 'failed', message: { role: 'agent', parts: [{ type: 'text', text: `Internal error: Selected policy file not found: ${selectedPolicyFilename}` }] } };
                return;
            }
            policyText = await policyFile.text(); // Store policy text


            // --- 6. Initial Evaluation ---
            yield { type: 'statusUpdate', state: 'working', message: { role: 'agent', parts: [{ type: 'text', text: 'Evaluating clinical summary against policy criteria...' }] } };
            try {
                 evaluationResult = await this.evaluator.evaluateAgainstPolicy(policyText, requestDetails!, taskId);
                 console.log(`[PriorAuthProc ${taskId}] Initial evaluation result:`, evaluationResult);
            } catch (evalError: any) {
                 console.error(`[PriorAuthProc ${taskId}] Error during initial evaluation:`, evalError);
                 yield { type: 'statusUpdate', state: 'failed', message: { role: 'agent', parts: [{ type: 'text', text: `Failed initial evaluation: ${evalError.message}` }] } };
                 return;
            }
            
            // --- 7. Evaluation Loop (Handle 'Needs More Info') ---
            let inputRequiredYieldedBefore = false; // Flag to track if we've asked for input before
            while (evaluationResult?.decision === 'Needs More Info') {
                console.log(`[PriorAuthProc ${taskId}] Evaluation requires more info. Reason: ${evaluationResult.reason}`);

                // --- 7a. Draft Question (Evaluator determines the content) ---
                yield { type: 'statusUpdate', state: 'working', message: { role: 'agent', parts: [{ type: 'text', text: 'Drafting question for more information...' }] } };
                let questionText: string;
                try {
                    questionText = await this.evaluator.draftResponse(evaluationResult, requestDetails!, taskId);
                } catch (draftError: any) {
                    console.error(`[PriorAuthProc ${taskId}] Error drafting question:`, draftError);
                    questionText = `Decision: ${evaluationResult.decision}. Reason: ${evaluationResult.reason}. Failed to draft specific question (${draftError.message}). Please provide more details.`;
                }

                // --- 7b. Construct Message & Yield input-required ---
                console.log(`[PriorAuthProc ${taskId}] Preparing input-required yield.`);
                let messageParts: Part[] = [{ type: 'text', text: questionText }];

                // Add policy text only on the *first* input-required yield in this loop
                if (policyText && !inputRequiredYieldedBefore) {
                     console.log(`[PriorAuthProc ${taskId}] Adding policy text to the message as this is the first input request.`);
                    messageParts.push({ 
                        type: 'text', 
                        text: `\n\n--- Relevant Policy ---\n${policyText}`
                    });
                } else if (!policyText && !inputRequiredYieldedBefore) {
                     console.warn(`[PriorAuthProc ${taskId}] First input request, but policyText is missing. Cannot include policy.`);
                } else if (inputRequiredYieldedBefore) {
                     console.log(`[PriorAuthProc ${taskId}] Not the first input request, policy text already sent or skipped.`);
                }
                
                const inputRequiredMessage: Message = {
                    role: 'agent',
                    parts: messageParts
                };

                // Mark that we are about to yield input-required for the first time (or again)
                inputRequiredYieldedBefore = true; 

                const userInput = yield {
                    type: 'statusUpdate',
                    state: 'input-required',
                    message: inputRequiredMessage 
                };

                // --- 7c. Process User Input ---
                if (!userInput || userInput.type !== 'message') {
                    // Handle cancellation or unexpected input type
                    console.log(`[PriorAuthProc ${taskId}] Received null or non-message input (${userInput?.type}) after input-required. Assuming cancellation.`);
                    throw new ProcessorCancellationError('User did not provide required input or signal received.');
                }
                const userResponseText = extractTextFromMessage(userInput.message);

                if (!userResponseText) {
                    console.warn(`[PriorAuthProc ${taskId}] User response message did not contain text.`);
                    yield { type: 'statusUpdate', state: 'working', message: { role: 'agent', parts: [{ type: 'text', text: 'I didn\'t receive text in your response. Let me ask again...' }] } };
                    continue; 
                }
                console.log(`[PriorAuthProc ${taskId}] Received user response: ${userResponseText.substring(0, 100)}...`);
                yield { type: 'statusUpdate', state: 'working', message: { role: 'agent', parts: [{ type: 'text', text: 'Processing additional information...' }] } };

                // --- 7d. Re-evaluate with new input --- 
                try {
                     evaluationResult = await this.evaluator.evaluateAgainstPolicy(
                        policyText!,       
                        requestDetails!,   
                        taskId,            
                        evaluationResult,  
                        userResponseText   
                    );
                    console.log(`[PriorAuthProc ${taskId}] Re-evaluation result:`, evaluationResult);
                } catch (reEvalError: any) {
                    console.error(`[PriorAuthProc ${taskId}] Error during re-evaluation:`, reEvalError);
                    yield { type: 'statusUpdate', state: 'failed', message: { role: 'agent', parts: [{ type: 'text', text: `Failed during re-evaluation: ${reEvalError.message}` }] } };
                    return; 
                }
            } // End while loop


            // --- 8. Final Evaluation Result Processing ---
            console.log(`[PriorAuthProc ${taskId}] Loop finished. Final evaluation decision: ${evaluationResult?.decision}`);

            // --- 8a. Yield Final Artifact --- 
            if (evaluationResult) { 
                if (evaluationResult.decision === 'Approved') {
                    // --- Generate Enhanced Approval Artifact ---
                    const approvalTimestamp = new Date().toISOString();
                    const approvalReferenceNumber = crypto.randomUUID();
                    const artifactContentToSign = {
                        taskId: taskId,
                        decision: evaluationResult.decision,
                        reason: evaluationResult.reason,
                        referenceNumber: approvalReferenceNumber,
                        timestamp: approvalTimestamp,
                    };
                    // Placeholder for actual signing logic
                    const digitalSignature = `placeholder-signature-for-${approvalReferenceNumber}`;

                    const approvalArtifactData = {
                        status: evaluationResult.decision, // Explicit status
                        reason: evaluationResult.reason,
                        approvalReferenceNumber: approvalReferenceNumber,
                        timestamp: approvalTimestamp,
                        digitalSignature: digitalSignature,
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
                } else {
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
                 console.error(`[PriorAuthProc ${taskId}] Reached end of processing but evaluationResult is null. Cannot yield artifact.`);
                 // Don't yield failed message here, let 8b/8c handle final status
            }


            // --- 8b. Draft Final Response --- 
            yield { type: 'statusUpdate', state: 'working', message: { role: 'agent', parts: [{ type: 'text', text: 'Drafting final response...' }] } };
            let finalMessageText: string;
             try {
                 finalMessageText = await this.evaluator.draftResponse(evaluationResult!, requestDetails!, taskId);
             } catch (draftError: any) {
                console.error(`[PriorAuthProc ${taskId}] Error drafting final response:`, draftError);
                 finalMessageText = `Decision: ${evaluationResult!.decision}. Reason: ${evaluationResult!.reason}. Failed to draft detailed response (${draftError.message}).`;
            }

            // --- 8c. Signal Completion --- 
            // Final state should be 'completed' as the loop only exits on non-'Needs More Info' decisions
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

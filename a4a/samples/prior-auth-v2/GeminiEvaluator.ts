import type { PriorAuthEvaluator, PriorAuthRequestDetails, PolicyEvalResult } from './evaluators';
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai';

// --- Gemini Helper (Corrected API Call Structure) --- //

// Define specific response types for clarity
interface GeminiParseRequestResponse extends PriorAuthRequestDetails {}
interface GeminiEvalResponse extends PolicyEvalResult {}

async function callGemini(
    prompt: string,
    taskId: string | undefined,
    expectedFormat: 'json' | 'text' = 'text'
): Promise<string | GeminiEvalResponse | GeminiParseRequestResponse | null> {
    const apiKey = process.env.GEMINI_API_KEY;
    const logPrefix = `[GeminiEvaluator${taskId ? ' Task ' + taskId : ''}]`;
    if (!apiKey) {
        console.warn(`${logPrefix} GEMINI_API_KEY not set. Cannot call API.`);
        throw new Error("GEMINI_API_KEY not configured.");
    }

    try {
        const genAI = new GoogleGenAI({ apiKey });
        const modelName = "gemini-1.5-flash-latest"; // Define model name
        
        // Use 'config' key for generation settings
        const config = { 
            temperature: 0.2, 
            responseMimeType: expectedFormat === 'json' ? 'application/json' : 'text/plain',
        };
        // Omit safetySettings for now to match the working example
        /*
        const safetySettings = [
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ];
        */
        
        const contents = [{ role: 'user', parts: [{ text: prompt }] }];

        console.log(`${logPrefix} Sending request to Gemini...`);

        // Call structure based on the working generateJokeWithGemini example
        const result = await genAI.models.generateContent({
            model: modelName, 
            contents: contents,
            config: config // Use 'config' key 
            // safetySettings: safetySettings // Omitted for now
        });
        
        // Access response via candidates path, as in the working example
        const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!responseText) {
            // Safety checks based on result.response removed as that path was incorrect.
            // We might need to inspect the full 'result' or 'candidates' structure 
            // if blocked responses need specific handling with this call pattern.
            console.warn(`${logPrefix} Gemini returned no response text.`);
            return null;
        }
        console.log(`${logPrefix} Gemini raw response received.`);

        if (expectedFormat === 'json') {
            try {
                const parsedJson = JSON.parse(responseText);
                console.log(`${logPrefix} Parsed Gemini JSON response:`, parsedJson);
                return parsedJson; // Return raw parsed JSON
            } catch (e: any) {
                console.error(`${logPrefix} Failed to parse Gemini JSON: ${e.message}`, responseText);
                throw new Error(`Failed to parse Gemini JSON response: ${e.message}`);
            }
        } else {
            console.log(`${logPrefix} Gemini text response: ${responseText.substring(0, 100)}...`);
            return responseText.trim();
        }

    } catch (error: any) {
        // Keep existing error handling, but remove specific safety check relying on result.response
        console.error(`${logPrefix} Error calling Gemini API:`, error.message || error);
        /* // Removed safety check that depended on the old response structure
        if (error instanceof Error && error.message.includes('safety settings')) {
             throw error;
        }
        */
         if (error instanceof Error && error.message?.includes('quota')) {
             console.error(`${logPrefix} API quota exceeded.`);
             throw new Error('API quota exceeded.');
         }
        throw new Error(`Gemini API Error: ${error.message || error}`);
    }
}

// --- Implementation --- //

export class GeminiEvaluator implements PriorAuthEvaluator {

    async parseInitialRequest(requestText: string, taskId?: string): Promise<PriorAuthRequestDetails> {
        const prompt = `Parse the following clinical text requesting prior authorization. Extract the main procedure requested, the primary diagnosis, and the core clinical summary supporting the request. Respond ONLY with a JSON object containing: "procedure" (string or null), "diagnosis" (string or null), and "clinicalSummary" (string). Text:\n${requestText}`;
        
        const result = await callGemini(prompt, taskId, 'json');
        
        if (!result || typeof result === 'string') {
            throw new Error('Failed to parse request details using Gemini.');
        }
        
        const parsedDetails = result as GeminiParseRequestResponse;
        if (typeof parsedDetails.clinicalSummary !== 'string') { 
             throw new Error('Gemini failed to provide a clinical summary in the parsed request.');
        }
        
        return parsedDetails;
    }

    async findRelevantPolicy(requestDetails: PriorAuthRequestDetails, availablePolicies: string[], taskId?: string): Promise<string | null> {
        const policyListString = availablePolicies.join(", ");
        const prompt = `Given the prior authorization request details (Procedure: ${requestDetails.procedure || 'Not specified'}, Diagnosis: ${requestDetails.diagnosis || 'Not specified'}, Summary: ${requestDetails.clinicalSummary}) and the list of available policy filenames (${policyListString}), which policy filename is the most relevant? Respond ONLY with the exact filename (e.g., 'policy_mri_back_pain.md') or the word 'None' if no policy seems applicable.`;
        
        const result = await callGemini(prompt, taskId, 'text');
        if (!result || typeof result !== 'string' || result.toLowerCase() === 'none') {
            return null;
        }
        
        if (availablePolicies.includes(result)) {
            return result;
        } else {
             console.warn(`[GeminiEvaluator${taskId ? ' Task ' + taskId : ''}] Gemini suggested policy "${result}" which is not in the available list: ${policyListString}`);
             return null;
        }
    }

    async evaluateAgainstPolicy(
        policyText: string, 
        requestDetails: PriorAuthRequestDetails, 
        taskId?: string, 
        previousResult?: PolicyEvalResult, // Optional param for re-evaluation context
        userInputText?: string           // Optional param for user's new input
    ): Promise<PolicyEvalResult> {
        const logPrefix = `[GeminiEvaluator${taskId ? ' Task ' + taskId : ''}]`;
        let prompt: string;

        if (previousResult && userInputText) {
            // --- Re-evaluation Scenario --- 
            console.log(`${logPrefix} Evaluating with new user input (re-evaluation).`);
            prompt = `Re-evaluate a prior authorization request based on new information provided by the user.

Policy:
---
${policyText}
---

Original Request Details:
Procedure: ${requestDetails.procedure || 'Not specified'}
Diagnosis: ${requestDetails.diagnosis || 'Not specified'}
Clinical Summary: ${requestDetails.clinicalSummary}

Previous Evaluation Outcome: ${previousResult.decision}
Reason/Missing Info: ${previousResult.reason} ${previousResult.missingInfo ? `(Specifically looking for: ${previousResult.missingInfo.join(', ')})` : ''}

New Information Provided by User:
---
${userInputText}
---

Evaluate ALL the information (original summary + new input) against the policy. Determine if the request now meets the criteria. Respond ONLY with a JSON object containing: "decision" ('Approved', 'Denied', or 'Needs More Info'), "reason" (a concise explanation for the new decision), and "missingInfo" (an array of specific criteria still lacking if decision remains 'Denied' or 'Needs More Info', otherwise an empty array).`;
        } else {
            // --- Initial Evaluation Scenario --- 
            console.log(`${logPrefix} Performing initial evaluation.`);
            prompt = `Evaluate the following clinical summary against the provided prior authorization policy. Determine if the request meets the policy criteria. Respond ONLY with a JSON object containing: "decision" ('Approved', 'Denied', or 'Needs More Info'), "reason" (a concise explanation for the decision, referencing specific policy points), and "missingInfo" (an array of specific criteria/information lacking if decision is 'Denied' or 'Needs More Info', otherwise an empty array). Policy:\n---
${policyText}\n---
\nRequest Summary:\n${requestDetails.clinicalSummary}`;
        }
        
        const result = await callGemini(prompt, taskId, 'json');
        if (!result || typeof result === 'string') {
            throw new Error('Failed to get policy evaluation result from Gemini.');
        }
        // Validate the specific structure needed for PolicyEvalResult
        const parsedEval = result as GeminiEvalResponse;
        if (typeof parsedEval.decision !== 'string' || typeof parsedEval.reason !== 'string' || !Array.isArray(parsedEval.missingInfo)) { 
            throw new Error('Invalid JSON structure received from Gemini evaluation.');
        }
        console.log(`${logPrefix} Evaluation complete. Decision: ${parsedEval.decision}`);
        return parsedEval;
    }

    async draftResponse(evaluation: PolicyEvalResult, requestDetails: PriorAuthRequestDetails, taskId?: string): Promise<string> {
         const prompt = `Based on the following prior authorization evaluation results for a request regarding procedure "${requestDetails.procedure || '[Not specified]'}" and diagnosis "${requestDetails.diagnosis || '[Not specified]'}", draft a clear, concise, and polite message for the requesting provider, suitable for direct display. Briefly explain the outcome and any next steps if applicable (especially if more info is needed). Evaluation: ${JSON.stringify(evaluation)}`;
        
        const result = await callGemini(prompt, taskId, 'text');
        if (!result || typeof result !== 'string') {
            console.warn(`[GeminiEvaluator${taskId ? ' Task ' + taskId : ''}] Gemini failed to draft a response, returning generic message.`);
            return `Prior auth decision: ${evaluation.decision}. Reason: ${evaluation.reason}${evaluation.missingInfo && evaluation.missingInfo.length > 0 ? ' Missing info: ' + evaluation.missingInfo.join(', ') : ''}`; 
        }
        return result;
    }
} 
import type { PriorAuthEvaluator, PriorAuthRequestDetails, PolicyEvalResult, MessageTurn } from './evaluators';
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai';

// --- Gemini Helper (Corrected API Call Structure) --- //

// Simple in-memory cache
const geminiCache = new Map<string, string | GeminiEvalResponse | GeminiParseRequestResponse>();

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

    // --- Check Cache --- 
    if (geminiCache.has(prompt)) {
        console.log(`${logPrefix} Using cached Gemini response.`);
        return geminiCache.get(prompt)!; // Assert non-null as we checked with .has()
    }

    try {
        const genAI = new GoogleGenAI({ apiKey });
        const modelName = "gemini-2.5-flash-preview-04-17"; // Define model name
        // const modelName = "gemini-2.5-pro-exp-03-25"; // Define model name
        
        // Use 'config' key for generation settings
        const config = { 
            temperature: 0.8, 
            responseMimeType: expectedFormat === 'json' ? 'application/json' : 'text/plain',
        };
        
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
                geminiCache.set(prompt, parsedJson); // Cache the PARSED OBJECT
                return parsedJson; // Return raw parsed JSON
            } catch (e: any) {
                console.error(`${logPrefix} Failed to parse Gemini JSON: ${e.message}`, responseText);
                throw new Error(`Failed to parse Gemini JSON response: ${e.message}`);
            }
        } else {
            console.log(`${logPrefix} Gemini text response: ${responseText.substring(0, 100)}...`);
            const resultToCache = responseText.trim();
            geminiCache.set(prompt, resultToCache); // Cache the text response
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

    // Updated findRelevantPolicy to use policyCompactContent
    async findRelevantPolicy(requestDetails: PriorAuthRequestDetails, policyCompactContent: string, taskId?: string): Promise<string | null> {
        const logPrefix = `[GeminiEvaluator${taskId ? ' Task ' + taskId : ''}]`;
        console.log(`${logPrefix} Finding relevant policy using Gemini from compact policy content.`);

        // Updated prompt to work with the compact format
        const prompt = `Analyze the following prior authorization request details and the provided compact policy content. The policy content lists policies, each starting with an ID (e.g., "9.02.502:"), followed by the title, and then semicolon-separated sections like "Treatments:" and "Indications:". Identify the single most relevant policy ID (the part before the first colon ':') from the content that best matches the request based on procedure, diagnosis, and clinical summary. Respond ONLY with a JSON object containing a single key "policyId" whose value is the best matching policy ID string (e.g., "9.02.502"), or null if no suitable match is found.

Request Details:
Procedure: ${requestDetails.procedure || 'Not specified'}
Diagnosis: ${requestDetails.diagnosis || 'Not specified'}
Clinical Summary: ${requestDetails.clinicalSummary}

Compact Policy Content:
---
${policyCompactContent}
---

Respond ONLY with the JSON object containing the best "policyId" or null.`;

        const result = await callGemini(prompt, taskId, 'json');

        // Define an expected type for the response
        type GeminiPolicyResponse = { policyId: string | null };

        if (!result || typeof result === 'string') {
            console.error(`${logPrefix} Failed to get a valid response from Gemini for policy finding.`);
            return null;
        }

        // Cast to unknown first to satisfy TypeScript
        const parsedResult = result as unknown as GeminiPolicyResponse;

        // Validate that policyId exists and is a string or null
        if (parsedResult && typeof parsedResult.policyId !== 'undefined') {
             if (typeof parsedResult.policyId === 'string' && parsedResult.policyId.trim() !== '') {
                 console.log(`${logPrefix} Gemini identified relevant policy ID: ${parsedResult.policyId}`);
                 return parsedResult.policyId;
             } else if (parsedResult.policyId === null) {
                 console.log(`${logPrefix} Gemini explicitly determined no relevant policy ID found.`);
                 return null;
             }
        }
        
        // If structure is wrong or policyId is missing/invalid type
        console.warn(`${logPrefix} Gemini did not return a valid policy ID structure (result: ${JSON.stringify(result)}).`);
        return null; // Treat invalid structure as no match found
    }

    async evaluateAgainstPolicy(
        policyText: string,
        requestDetails: PriorAuthRequestDetails,
        conversationHistory: MessageTurn[],
        taskId?: string
    ): Promise<PolicyEvalResult> {
        const logPrefix = `[GeminiEvaluator${taskId ? ' Task ' + taskId : ''}]`;
        console.log(`${logPrefix} Evaluating request using conversation history.`);

        // Format conversation history for the prompt
        const formattedHistory = conversationHistory
            .map(turn => `${turn.role === 'agent' ? 'AI Assistant' : 'User'}: ${turn.text}`)
            .join('\n\n');

        // Use the correct evaluation logic that includes conversation history
        const prompt = `Evaluate a prior authorization request based on the provided policy, the initial request details, and the subsequent conversation between the AI assistant and the user.

Policy:
---
${policyText}
---

Initial Request Details:
Procedure: ${requestDetails.procedure || 'Not specified'}
Diagnosis: ${requestDetails.diagnosis || 'Not specified'}
Clinical Summary: ${requestDetails.clinicalSummary}

Conversation History (Assistant requesting info, User responding):
---
${formattedHistory}
---

Evaluate ALL the information (initial summary + conversation) against the policy. Determine if the request now meets the criteria.
Respond ONLY with a JSON object containing:
- "decision": 'Approved' (if ALL criteria met), 'CannotApprove' (if criteria definitively NOT met or exclusion applies), or 'Needs More Info' (if more info could lead to approval).
- "reason": A concise explanation for the decision, referencing specific policy points.
- "missingInfo": An array of specific criteria still lacking if decision is 'Needs More Info', otherwise an empty array.`;

        const result = await callGemini(prompt, taskId, 'json');
        if (!result || typeof result === 'string') {
            throw new Error('Failed to get policy evaluation result from Gemini.');
        }
        // Validate the specific structure needed for PolicyEvalResult
        const parsedEval = result as GeminiEvalResponse;
        // Add CannotApprove to validation
        if (typeof parsedEval.decision !== 'string' || !['Approved', 'Needs More Info', 'CannotApprove'].includes(parsedEval.decision) || typeof parsedEval.reason !== 'string' || !Array.isArray(parsedEval.missingInfo)) { 
            console.error("Invalid JSON structure received from Gemini evaluation:", result); // Log the invalid structure
            throw new Error('Invalid JSON structure received from Gemini evaluation.');
        }
        console.log(`${logPrefix} Evaluation complete. Decision: ${parsedEval.decision}`);
        return parsedEval as PolicyEvalResult; // Cast as PolicyEvalResult for return
    }

    async draftResponse(evaluation: PolicyEvalResult, requestDetails: PriorAuthRequestDetails, taskId?: string): Promise<string> {
         const logPrefix = `[GeminiEvaluator${taskId ? ' Task ' + taskId : ''}]`;
         let prompt: string;

         switch (evaluation.decision) {
            case 'Approved':
                console.log(`${logPrefix} Drafting approval message.`);
                 prompt = `Based on the following APPROVED prior authorization evaluation result for a request regarding procedure "${requestDetails.procedure || '[Not specified]'}" and diagnosis "${requestDetails.diagnosis || '[Not specified]'}", draft a clear, concise, and polite approval message for the requesting provider. Include the reason for approval briefly. Evaluation: ${JSON.stringify(evaluation)}`;
                 break;
            case 'CannotApprove':
                 console.log(`${logPrefix} Drafting message for non-approval (human review).`);
                 prompt = `Based on the following prior authorization evaluation result (Decision: CannotApprove) for a request regarding procedure "${requestDetails.procedure || '[Not specified]'}" and diagnosis "${requestDetails.diagnosis || '[Not specified]'}", draft a clear, concise, and polite message for the requesting provider. Explain that automated approval could not be completed based on the provided information (briefly reference the reason: ${evaluation.reason}). State clearly that the request is being forwarded for human review. DO NOT use the word "Denied". Evaluation: ${JSON.stringify(evaluation)}`;
                 break;
             case 'Needs More Info':
             default:
                 console.log(`${logPrefix} Drafting message requesting more info.`);
                 prompt = `Based on the following prior authorization evaluation result (Decision: Needs More Info) for a request regarding procedure "${requestDetails.procedure || '[Not specified]'}" and diagnosis "${requestDetails.diagnosis || '[Not specified]'}", draft a clear, concise, and polite message for the requesting provider. Specifically ask for the missing information listed in the evaluation. Missing info: ${evaluation.missingInfo?.join(', ') || 'Details not specified'}. Evaluation: ${JSON.stringify(evaluation)}`;
                 break;
         }

         prompt += `\nAlways refer to yourself as "Prior Auth Auto Approval Bot" and be concise.`;
        
        const result = await callGemini(prompt, taskId, 'text');
        if (!result || typeof result !== 'string') {
            console.warn(`${logPrefix} Gemini failed to draft a response, returning generic message for decision ${evaluation.decision}.`);
            // Fallback message construction based on decision
            if (evaluation.decision === 'Approved') {
                 return `Prior auth decision: Approved. Reason: ${evaluation.reason}.`;
            } else if (evaluation.decision === 'CannotApprove') {
                 return `Automated prior authorization could not be completed based on the information provided (Reason: ${evaluation.reason}). The request is being forwarded for human review.`;
            } else { // Needs More Info
                 return `Prior auth requires more information: ${evaluation.missingInfo?.join(', ') || evaluation.reason || 'Please provide more details.'}`;
            }
        }
        return result;
    }
} 
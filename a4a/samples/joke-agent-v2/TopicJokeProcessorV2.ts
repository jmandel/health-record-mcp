import type { 
    TaskProcessorV2, 
    ProcessorYieldValue, 
    ProcessorInputValue, 
    ProcessorInputInternal // Import this specific type for checking
} from '../../src/interfaces/processorV2'; 
import { ProcessorCancellationError } from '../../src/interfaces/processorV2'; // Import the error class
// Import common types from the main library entry
import type { 
    TaskSendParams, 
    Message, 
    Task, 
    TextPart, 
    DataPart, 
    Artifact 
} from '@a2a/bun-express'; 
// Import the Google Generative AI library
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai';

// Map of predefined topics (lowercase) to specific jokes
const PREDEFINED_JOKES: Record<string, string> = {
    "cats": "Why are cats such bad poker players? Because they always have a fur ace up their sleeve!",
    "computers": "Why did the computer keep sneezing? It had a virus!",
    "coffee": "How does Moses make coffee? He brews it!",
    "programmers": "Why do programmers prefer dark mode? Because light attracts bugs!"
};

// --- Helper Function for Gemini API Call (unchanged) ---
async function generateJokeWithGemini(topic: string): Promise<string | null> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.warn("[TopicJokeProcessorV2] GEMINI_API_KEY not set. Cannot generate joke via API.");
        return null;
    }

    try {
        const genAI = new GoogleGenAI({ apiKey });
        
        const modelName = "gemini-2.5-flash-preview-04-17";
        const generationConfig = { temperature: 0.9 };
        const safetySettings = [
             { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
             { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
             { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
             { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        ];

        const prompt = `Generate one genuinely funny and clever joke about "${topic}". Aim for smart wordplay or an unexpected punchline, avoiding overly simple or common puns for this topic "${topic}". Crucially, your output must consist *only* of the joke text itself, with absolutely no introductory or concluding phrases, commentary, or explanation.`;
        
        const contents = [{ role: 'user', parts: [{ text: prompt }] }];

        console.log(`[TopicJokeProcessorV2] Sending request to Gemini for topic: "${topic}"`);
        
        const result = await genAI.models.generateContent({
            model: modelName,
            contents: contents,
            config: generationConfig
        });
        
        const text = result.candidates?.[0]?.content?.parts?.[0].text ?? "Couldn't think of anything funny";
        console.log(`[TopicJokeProcessorV2] Gemini generated joke for "${topic}"`);
        return text.trim();

    } catch (error: any) {
        console.error(`[TopicJokeProcessorV2] Error calling Gemini API for topic "${topic}":`, error.message || error);
        return null;
    }
}
// --- End Helper Function ---

export class TopicJokeProcessorV2 implements TaskProcessorV2 {
    private static JOKE_ABOUT_TOPIC_SKILL = 'jokeAboutTopic';
    private static RANDOM_JOKE_KEYWORD = 'random'; // Keyword for the other processor

    // canHandle remains largely the same, might accept Task in the future?
    async canHandle(params: TaskSendParams, existingTask?: Task): Promise<boolean> {
        const skillId = params.metadata?.skillId as string | undefined;
        if (skillId === TopicJokeProcessorV2.JOKE_ABOUT_TOPIC_SKILL) {
            return true;
        }

        const initialMessageText = params.message.parts.find(p => p.type === 'text')?.text?.toLowerCase() || "";

        // Handle if "about" keyword is present
        if (initialMessageText.includes('about')) {
            return true;
        }
        // Handle as default if no skill ID is provided AND the "random" keyword is NOT present
        // AND the specific skill ID wasn't already matched
        if (!skillId && !initialMessageText.includes(TopicJokeProcessorV2.RANDOM_JOKE_KEYWORD)) {
            return true;
        }

        // Default processor if others don't match (e.g., random joke processor handles 'random')
        // Note: The order processors are provided to the server matters for default routing.
        return true; 
    }

    // The core logic moves into the process generator
    async * process(
        task: Task,
        params: TaskSendParams,
        authContext?: any
    ): AsyncGenerator<ProcessorYieldValue, void, ProcessorInputValue> {
        console.log(`[TopicJokeProcessorV2] Starting task ${task.id}`);
        let topic: string | undefined;
        let jokeText: string | null = null;

        try {
            // Extract topic from initial message
            const initialMessageText = params.message.parts.find(p => p.type === 'text')?.text?.trim() || "";
            const topicMatch = initialMessageText.match(/about\s+(.+)/i);
            topic = topicMatch?.[1];

            // Loop to handle potential input request
            while (!topic) {
                console.log(`[TopicJokeProcessorV2] Task ${task.id} requires topic input.`);
                const predefinedTopics = Object.keys(PREDEFINED_JOKES);
                const textPart: TextPart = { type: 'text', text: 'Okay, I can tell a joke, but what topic should it be about? You can also choose one of these:' };
                const dataPart: DataPart = { type: 'data', data: { options: predefinedTopics } };
                const message: Message = { role: 'agent', parts: [textPart, dataPart] };

                // Yield input-required and wait for the next input
                const inputValue: ProcessorInputValue = yield { 
                    type: 'statusUpdate', 
                    state: 'input-required', 
                    message: message 
                };

                console.log(`[TopicJokeProcessorV2] Received input value type: ${inputValue?.type}`);
                if (inputValue?.type === 'message') {
                    topic = inputValue.message.parts.find(p => p.type === 'text')?.text?.trim();
                    if (!topic) {
                         console.warn(`[TopicJokeProcessorV2] Received message input for task ${task.id}, but no text part found or text is empty.`);
                         // Ask again (loop continues)
                    } else {
                         console.log(`[TopicJokeProcessorV2] Received topic from input: "${topic}"`);
                         // Break the loop, proceed with joke generation
                    }
                } else if (inputValue?.type === 'internalUpdate') { // Corrected type check
                    console.warn(`[TopicJokeProcessorV2] Received internalUpdate with payload:`, inputValue.payload);
                     // Decide how to handle internal signals if needed
                } else {
                    // Should not happen if core sends correct types
                    console.warn(`[TopicJokeProcessorV2] Received unexpected input value for task ${task.id}:`, inputValue);
                    // Ask again just in case
                    topic = undefined;
                }
            }

            // --- Topic is now guaranteed to be defined --- 
            const lowerCaseTopic = topic.toLowerCase();
            jokeText = PREDEFINED_JOKES[lowerCaseTopic]; // Check predefined first

            if (!jokeText) { // Not predefined, try generating
                yield { type: 'statusUpdate', state: 'working', message: { role: 'agent', parts: [{ type: 'text', text: `Thinking of a *really* good joke about ${topic}...` }] }};
                jokeText = await generateJokeWithGemini(topic);
                if (!jokeText) { // Generation failed or no API key
                    console.log(`[TopicJokeProcessorV2] Falling back to template joke for topic: "${topic}"`);
                    jokeText = `Why was the ${topic} so good at networking? Because it had great connections!`; // Fallback template
                }
            } else { // Predefined joke found
                 yield { type: 'statusUpdate', state: 'working', message: { role: 'agent', parts: [{ type: 'text', text: `Okay, thinking of a joke about ${topic}...` }] }};
                 await Bun.sleep(100); // Simulate quick retrieval
            }

            // Yield the artifact
            yield { 
                type: 'artifact', 
                artifactData: { 
                    name: 'joke-result', 
                    parts: [{ type: 'text', text: jokeText }], 
                    metadata: { topic: topic } // Add original topic to artifact metadata
                 } 
            };

            // Yield completion
            yield { type: 'statusUpdate', state: 'completed' };
            console.log(`[TopicJokeProcessorV2] Completed task ${task.id} with a joke about ${topic}.`);

        } catch (error: any) {
             console.error(`[TopicJokeProcessorV2] Error in task ${task.id}:`, error);
             // Check if it's a cancellation error from the core
             if (error instanceof ProcessorCancellationError) {
                 console.log(`[TopicJokeProcessorV2] Task ${task.id} was canceled by the core.`);
                 // Yield canceled state
                 yield { type: 'statusUpdate', state: 'canceled', message: { role: 'agent', parts: [{ type: 'text', text: 'Joke task canceled.' }] } };
                 // No need to throw, just return to end the generator
                 return; 
             }

             // For other errors, yield failed state
             const failMsg: Message = { role: 'agent', parts: [{ type: 'text', text: `Failed to tell joke: ${error.message}` }] };
             yield { type: 'statusUpdate', state: 'failed', message: failMsg };
             // Returning ends the generator implicitly after the yield
        }
    }
} 
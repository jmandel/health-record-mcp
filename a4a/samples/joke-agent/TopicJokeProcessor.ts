import type { TaskProcessor, TaskUpdater, TaskSendParams, Message, Task, TextPart, DataPart } from '@a2a/bun-express';
// Import the Google Generative AI library
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai';

// Map of predefined topics (lowercase) to specific jokes
const PREDEFINED_JOKES: Record<string, string> = {
    "cats": "Why are cats such bad poker players? Because they always have a fur ace up their sleeve!",
    "computers": "Why did the computer keep sneezing? It had a virus!",
    "coffee": "How does Moses make coffee? He brews it!",
    "programmers": "Why do programmers prefer dark mode? Because light attracts bugs!"
};

// --- Helper Function for Gemini API Call ---
async function generateJokeWithGemini(topic: string): Promise<string | null> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.warn("[TopicJokeProcessor] GEMINI_API_KEY not set. Cannot generate joke via API.");
        return null;
    }

    try {
        const genAI = new GoogleGenAI({ apiKey });
        
        const modelName = "gemini-1.5-flash-latest";
        const generationConfig = { temperature: 0.9 };
        const safetySettings = [
             { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
             { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
             { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
             { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        ];

        const prompt = `Generate one genuinely funny and clever joke about "${topic}". Aim for smart wordplay or an unexpected punchline, avoiding overly simple or common puns for this topic "${topic}". Crucially, your output must consist *only* of the joke text itself, with absolutely no introductory or concluding phrases, commentary, or explanation.`;
        
        // Construct contents as expected by the API
        const contents = [{ role: 'user', parts: [{ text: prompt }] }];

        console.log(`[TopicJokeProcessor] Sending request to Gemini for topic: "${topic}"`);
        
        // Use ai.models.generateContent, passing config inline
        const result = await genAI.models.generateContent({
            model: modelName,
            contents: contents,
            config: generationConfig
        });
        
        // Access the response directly from the result object
        const text = result.candidates?.[0]?.content?.parts?.[0].text ?? "Couldn't think of anything funny";
        console.log(`[TopicJokeProcessor] Gemini generated joke for "${topic}"`);
        return text.trim();

    } catch (error: any) {
        console.error(`[TopicJokeProcessor] Error calling Gemini API for topic "${topic}":`, error.message || error);
        return null;
    }
}
// --- End Helper Function ---

export class TopicJokeProcessor implements TaskProcessor {
    private static JOKE_ABOUT_TOPIC_SKILL = 'jokeAboutTopic';
    private static RANDOM_JOKE_KEYWORD = 'random'; // Keyword for the other processor

    async canHandle(params: TaskSendParams): Promise<boolean> {
        // Skill ID check should be first
        const skillId = params.metadata?.skillId as string | undefined;
        if (skillId === TopicJokeProcessor.JOKE_ABOUT_TOPIC_SKILL) {
            return true;
        }

        const initialMessageText = params.message.parts.find(p => p.type === 'text')?.text?.toLowerCase() || "";

        // Handle if "about" keyword is present
        if (initialMessageText.includes('about')) {
            return true;
        }
        // Handle as default if no skill ID is provided AND the "random" keyword is NOT present
        // AND the specific skill ID wasn't already matched
        if (!skillId && !initialMessageText.includes(TopicJokeProcessor.RANDOM_JOKE_KEYWORD)) {
            return true;
        }

        return true;
    }

    async start(params: TaskSendParams, updater: TaskUpdater): Promise<void> {
        console.log(`[TopicJokeProcessor] Starting task ${updater.taskId}`);
        // We don't need skillId here anymore as canHandle directs the request
        const initialMessageText = params.message.parts.find(p => p.type === 'text')?.text?.trim() || "";
        let jokeText: string | null = null;

        try {
            // Only extract topic if "about ..." is explicitly mentioned
            const topicMatch = initialMessageText.match(/about\s+(.+)/i);
            const topic = topicMatch?.[1];

            // If a topic was explicitly extracted
            if (topic) {
                const lowerCaseTopic = topic.toLowerCase();
                jokeText = PREDEFINED_JOKES[lowerCaseTopic]; // Check predefined first

                if (!jokeText) { // Not predefined, try generating
                    await updater.updateStatus('working', { role: 'agent', parts: [{ type: 'text', text: `Thinking of a *really* good joke about ${topic}...` }] });
                    jokeText = await generateJokeWithGemini(topic);
                    if (!jokeText) { // Generation failed or no API key
                        console.log(`[TopicJokeProcessor] Falling back to template joke for topic: "${topic}"`);
                        jokeText = `Why was the ${topic} so good at networking? Because it had great connections!`; // Fallback template
                    }
                } else { // Predefined joke found
                    await updater.updateStatus('working', { role: 'agent', parts: [{ type: 'text', text: `Okay, thinking of a joke about ${topic}...` }] });
                    await Bun.sleep(100); // Simulate quick retrieval
                }

                await updater.addArtifact({
                    name: 'joke-result',
                    parts: [{ type: 'text', text: jokeText }],
                    metadata: { topic: topic } // Add original topic to artifact metadata
                });
                await updater.signalCompletion('completed');
                console.log(`[TopicJokeProcessor] Completed task ${updater.taskId} with a joke about ${topic}.`);
            } else {
                // No explicit topic found via "about", require input.
                console.log(`[TopicJokeProcessor] Task ${updater.taskId} requires topic input because none was specified with 'about'.`);

                const predefinedTopics = Object.keys(PREDEFINED_JOKES);
                const textPart: TextPart = { type: 'text', text: 'Okay, I can tell a joke, but what topic should it be about? You can also choose one of these:' };
                const dataPart: DataPart = { type: 'data', data: { options: predefinedTopics } };

                await updater.updateStatus('input-required', {
                    role: 'agent',
                    parts: [textPart, dataPart] // Send both text and data parts
                });
            }

        } catch (error: any) {
            console.error(`[TopicJokeProcessor] Error in task ${updater.taskId}:`, error);
            const failMsg: Message = { role: 'agent', parts: [{ type: 'text', text: `Failed to tell joke: ${error.message}` }] };
            // Avoid signaling completion if one was already signaled (e.g., after successful artifact add)
            if (!jokeText) { // Only signal failure if we didn't get a joke text at all
                 const currentStatus = await updater.getCurrentStatus();
                 if (currentStatus !== 'completed' && currentStatus !== 'canceled') {
                     await updater.signalCompletion('failed', failMsg);
                 }
            }
        }
    }

    async resume(task: Task, resumeMessage: Message, updater: TaskUpdater): Promise<void> {
        console.log(`[TopicJokeProcessor] Resuming task ${task.id}`);

        const topic = resumeMessage.parts.find(p => p.type === 'text')?.text?.trim();
        let jokeText: string | null = null;

        if (!topic) {
            console.warn(`[TopicJokeProcessor] Resume for task ${task.id} did not provide a topic in the message.`);
            // Ask again, providing options
            const predefinedTopics = Object.keys(PREDEFINED_JOKES);
            const textPart: TextPart = { type: 'text', text: 'Sorry, I still need a topic for the joke. What should it be about? You can also choose one of these:' };
            const dataPart: DataPart = { type: 'data', data: { options: predefinedTopics } };

            await updater.updateStatus('input-required', {
                role: 'agent',
                parts: [textPart, dataPart]
            });
            return;
        }

        try {
            const lowerCaseTopic = topic.toLowerCase();
            jokeText = PREDEFINED_JOKES[lowerCaseTopic]; // Check predefined first

            if (!jokeText) { // Not predefined, try generating
                await updater.updateStatus('working', { role: 'agent', parts: [{ type: 'text', text: `Thinking of a *really* good joke about ${topic}...` }] });
                jokeText = await generateJokeWithGemini(topic);
                if (!jokeText) { // Generation failed or no API key
                    console.log(`[TopicJokeProcessor] Falling back to resume template joke for topic: "${topic}"`);
                    jokeText = `Why did the ${topic} refuse to fight? Because it didn\'t want to get into a ${topic}-kle!`; // Fallback resume template
                }
            } else { // Predefined joke found
                 await updater.updateStatus('working', { role: 'agent', parts: [{ type: 'text', text: `Okay, thinking of a joke about ${topic}...` }] });
                 await Bun.sleep(100); // Simulate quick retrieval
            }

            await updater.addArtifact({
                name: 'joke-result',
                parts: [{ type: 'text', text: jokeText }],
                metadata: { topic: topic } // Keep original casing for metadata
            });

            await updater.signalCompletion('completed');
            console.log(`[TopicJokeProcessor] Completed resumed task ${task.id} with a joke about ${topic}.`);

        } catch (error: any) {
            console.error(`[TopicJokeProcessor] Error during resume for task ${task.id}:`, error);
            const failMsg: Message = { role: 'agent', parts: [{ type: 'text', text: `Failed during resume: ${error.message}` }] };
            // Avoid signaling completion if one was already signaled
            if (!jokeText) { // Only signal failure if we didn't get a joke text at all
                 const currentStatus = await updater.getCurrentStatus();
                 if (currentStatus !== 'completed' && currentStatus !== 'canceled') {
                     await updater.signalCompletion('failed', failMsg);
                 }
            }
        }
    }
}


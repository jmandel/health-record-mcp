import type { 
    TaskProcessorV2, 
    ProcessorYieldValue, 
    ProcessorInputValue 
} from '../../src/interfaces/processorV2'; 
import { ProcessorCancellationError } from '../../src/interfaces/processorV2';
import type { 
    TaskSendParams, 
    Message, 
    Task, 
    TextPart, 
    Artifact 
} from '@jmandel/a2a-bun-express-server';

const RANDOM_JOKES: string[] = [
    "Why don't scientists trust atoms? Because they make up everything!",
    "Why did the scarecrow win an award? Because he was outstanding in his field!",
    "What do you call fake spaghetti? An impasta!",
    "Why couldn't the bicycle stand up by itself? It was two tired!"
];

export class RandomJokeProcessorV2 implements TaskProcessorV2 {
    private static RANDOM_JOKE_KEYWORD = 'random';

    async canHandle(params: TaskSendParams, existingTask?: Task): Promise<boolean> {
        const skillId = params.metadata?.skillId as string | undefined;
        const initialMessageText = params.message.parts.find(p => p.type === 'text')?.text?.toLowerCase() || "";

        // Handle if skillId matches or text includes "random"
        return skillId === 'randomJoke' || initialMessageText.includes(RandomJokeProcessorV2.RANDOM_JOKE_KEYWORD);
    }

    async * process(
        task: Task,
        params: TaskSendParams,
        authContext?: any
    ): AsyncGenerator<ProcessorYieldValue, void, ProcessorInputValue> {
        console.log(`[RandomJokeProcessorV2] Starting task ${task.id}`);
        try {
            // Signal working
            yield { type: 'statusUpdate', state: 'working', message: { role: 'agent', parts: [{ type: 'text', text: 'Thinking of a random joke...' }] }};
            
            await Bun.sleep(200); // Simulate thinking

            // Select a random joke
            const randomIndex = Math.floor(Math.random() * RANDOM_JOKES.length);
            const jokeText = RANDOM_JOKES[randomIndex];

            // Yield artifact
            yield { 
                type: 'artifact', 
                artifactData: { 
                    name: 'random-joke-result', 
                    parts: [{ type: 'text', text: jokeText }]
                 } 
            };

            // Yield completion
            yield { type: 'statusUpdate', state: 'completed' };
            console.log(`[RandomJokeProcessorV2] Completed task ${task.id}`);

        } catch (error: any) {
            console.error(`[RandomJokeProcessorV2] Error in task ${task.id}:`, error);
            if (error instanceof ProcessorCancellationError) {
                 console.log(`[RandomJokeProcessorV2] Task ${task.id} was canceled.`);
                 yield { type: 'statusUpdate', state: 'canceled', message: { role: 'agent', parts: [{ type: 'text', text: 'Random joke task canceled.' }] } };
                 return;
             }

            const failMsg: Message = { role: 'agent', parts: [{ type: 'text', text: `Failed to get random joke: ${error.message}` }] };
            yield { type: 'statusUpdate', state: 'failed', message: failMsg };
        }
    }
} 
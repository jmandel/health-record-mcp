import type { TaskProcessor, TaskUpdater, TaskSendParams } from '@a2a/bun-express';

const JOKES = [
    "Why did the scarecrow win an award? Because he was outstanding in his field!",
    "Why don't scientists trust atoms? Because they make up everything!",
    "What do you call fake spaghetti? An impasta!",
    "Why did the bicycle fall over? Because it was two tired!",
    "How does a penguin build its house? Igloos it together!"
];

export class RandomJokeProcessor implements TaskProcessor {
    private static TELL_JOKE_SKILL = 'tell-joke';
    private static RANDOM_JOKE_KEYWORD = 'random';

    async canHandle(params: TaskSendParams): Promise<boolean> {
        const skillId = params.metadata?.skillId as string | undefined;
        const initialMessageText = params.message.parts.find(p => p.type === 'text')?.text?.toLowerCase() || "";

        // Handle if specific skill ID matches
        if (skillId === RandomJokeProcessor.TELL_JOKE_SKILL) {
            return true;
        }
        // Handle if "random" keyword is present
        if (initialMessageText.includes(RandomJokeProcessor.RANDOM_JOKE_KEYWORD)) {
            return true;
        }

        return false;
    }

    async start(params: TaskSendParams, updater: TaskUpdater): Promise<void> {
        console.log(`[RandomJokeProcessor] Starting task ${updater.taskId}`);

        try {
            await updater.updateStatus('working', { role: 'agent', parts: [{ type: 'text', text: 'Thinking of a good random one...' }] });
            await Bun.sleep(1500); // Simulate work

            const jokeText = JOKES[Math.floor(Math.random() * JOKES.length)];

            await updater.addArtifact({
                name: 'joke-result',
                parts: [{ type: 'text', text: jokeText }],
            });

            await updater.signalCompletion('completed');
            console.log(`[RandomJokeProcessor] Completed task ${updater.taskId} with a random joke.`);

        } catch (error: any) {
            console.error(`[RandomJokeProcessor] Error in task ${updater.taskId}:`, error);
            const failMsg = { role: 'agent', parts: [{ type: 'text', text: `Failed to tell random joke: ${error.message}` }] };
            const currentStatus = await updater.getCurrentStatus();
             if (currentStatus !== 'completed' && currentStatus !== 'canceled') {
                await updater.signalCompletion('failed', failMsg);
             }
        }
    }

    // No resume needed for random jokes as it doesn't require input.
}

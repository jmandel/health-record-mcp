import type { TaskProcessor, TaskUpdater, TaskSendParams, Message } from '@a2a/bun-express';

const JOKES = [
    "Why did the scarecrow win an award? Because he was outstanding in his field!",
    "Why don't scientists trust atoms? Because they make up everything!",
    "What do you call fake spaghetti? An impasta!",
    "Why did the bicycle fall over? Because it was two tired!",
    "How does a penguin build its house? Igloos it together!"
];

export class JokeProcessor implements TaskProcessor {

  // Simple check: does the input text contain 'joke'?
  async canHandle(params: TaskSendParams): Promise<boolean> {
    const textPart = params.message.parts.find(p => p.type === 'text');
    return !!textPart?.text?.toLowerCase().includes('joke');
  }

  async start(params: TaskSendParams, updater: TaskUpdater): Promise<void> {
    console.log(`[JokeProcessor] Starting task ${updater.taskId}`);

    try {
        await updater.updateStatus('working', { role: 'agent', parts: [{type: 'text', text: 'Thinking of a good one...'}]});

        // Simulate some work
        await Bun.sleep(1500); // Use Bun.sleep

        const jokeText = JOKES[Math.floor(Math.random() * JOKES.length)];

        // Add the joke as an artifact
        await updater.addArtifact({
            name: 'joke-result',
            parts: [{ type: 'text', text: jokeText }],
        });

        // Signal completion
        await updater.signalCompletion('completed');
        console.log(`[JokeProcessor] Completed task ${updater.taskId}`);

    } catch (error: any) {
        console.error(`[JokeProcessor] Error in task ${updater.taskId}:`, error);
        const failMsg: Message = { role: 'agent', parts: [{ type: 'text', text: `Failed to tell joke: ${error.message}` }] };
        // Signal failure using the updater
        await updater.signalCompletion('failed', failMsg);
    }
  }

  // No resume, cancel or internal update logic needed for this simple agent
}

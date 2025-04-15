import type { TaskProcessor, TaskUpdater, TaskSendParams, Message } from '@a2a/bun-express';
import type { Task } from '@a2a/bun-express'; // Import Task type from package alias

const JOKES = [
    "Why did the scarecrow win an award? Because he was outstanding in his field!",
    "Why don't scientists trust atoms? Because they make up everything!",
    "What do you call fake spaghetti? An impasta!",
    "Why did the bicycle fall over? Because it was two tired!",
    "How does a penguin build its house? Igloos it together!"
];

export class JokeProcessor implements TaskProcessor {

  // Define supported skill IDs
  private static TELL_JOKE_SKILL = 'tell-joke';
  private static JOKE_ABOUT_TOPIC_SKILL = 'jokeAboutTopic';

  // Simple check: does the input text contain 'joke'?
  async canHandle(params: TaskSendParams): Promise<boolean> {
    // Check if the specified skill ID is one we handle
    const skillId = params.metadata?.skillId as string | undefined;
    return skillId === JokeProcessor.TELL_JOKE_SKILL || skillId === JokeProcessor.JOKE_ABOUT_TOPIC_SKILL;
  }

  async start(params: TaskSendParams, updater: TaskUpdater): Promise<void> {
    console.log(`[JokeProcessor] Starting task ${updater.taskId}`);
    const skillId = params.metadata?.skillId as string | undefined;
    const initialMessageText = params.message.parts.find(p => p.type === 'text')?.text?.trim() || "";

    try {
      if (skillId === JokeProcessor.JOKE_ABOUT_TOPIC_SKILL) {
        // --- Handle jokeAboutTopic skill ---
        // Very basic topic extraction: check if text mentions "about ..."
        const topicMatch = initialMessageText.match(/about\s+(.+)/i);
        const topic = topicMatch?.[1];

        if (topic) {
          // await Bun.sleep(100);
          const jokeText = `Why was the ${topic} so good at networking? Because it had great connections!`; // Placeholder topic joke
          await updater.addArtifact({
              name: 'joke-result',
              parts: [{ type: 'text', text: jokeText }],
              metadata: { topic: topic } // Add topic to artifact metadata
          });
          await updater.signalCompletion('completed');
          console.log(`[JokeProcessor] Completed task ${updater.taskId} with a joke about ${topic}.`);
        } else {
          // No topic found, require input
          console.log(`[JokeProcessor] Task ${updater.taskId} requires topic input.`);
          await updater.updateStatus('input-required', {
              role: 'agent',
              parts: [{ type: 'text', text: 'Okay, I can tell a joke, but what topic should it be about?' }]
          });
        }

      } else {
        // --- Handle tell-joke skill (or default if no skillId provided) ---
        if (skillId !== JokeProcessor.TELL_JOKE_SKILL) {
             console.warn(`[JokeProcessor] Task ${updater.taskId} started without a recognized skillId, defaulting to tell-joke.`);
        }
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
      }

    } catch (error: any) {
        console.error(`[JokeProcessor] Error in task ${updater.taskId}:`, error);
        const failMsg: Message = { role: 'agent', parts: [{ type: 'text', text: `Failed to tell joke: ${error.message}` }] };
        // Check current status before overriding - avoid failing an already completed/canceled task if error happens late
        const currentStatus = await updater.getCurrentStatus();
        if (currentStatus !== 'completed' && currentStatus !== 'canceled') {
           await updater.signalCompletion('failed', failMsg);
        }
    }
  }

  async resume(task: Task, resumeMessage: Message, updater: TaskUpdater): Promise<void> {
       console.log(`[JokeProcessor] Resuming task ${task.id}`);

       // NOTE: The A2AServerCore already transitioned state to 'working' before calling resume.
       // We proceed assuming the resume call is valid for the current flow.

       const topic = resumeMessage.parts.find(p => p.type === 'text')?.text?.trim();

       if (!topic) {
           console.warn(`[JokeProcessor] Resume for task ${task.id} did not provide a topic in the message.`);
            // Ask again? Or fail?
            await updater.updateStatus('input-required', {
               role: 'agent',
               parts: [{ type: 'text', text: 'Sorry, I still need a topic for the joke. What should it be about?' }]
           });
           return;
       }

       try {
           await updater.updateStatus('working', { role: 'agent', parts: [{type: 'text', text: `Okay, thinking of a joke about ${topic}...`}]});
           await Bun.sleep(100);

           const jokeText = `Why did the ${topic} refuse to fight? Because it didn\'t want to get into a ${topic}-kle!`; // Placeholder topic joke

           await updater.addArtifact({
                name: 'joke-result',
               parts: [{ type: 'text', text: jokeText }],
               metadata: { topic: topic }
           });

           await updater.signalCompletion('completed');
           console.log(`[JokeProcessor] Completed resumed task ${task.id} with a joke about ${topic}.`);

       } catch (error: any) {
           console.error(`[JokeProcessor] Error during resume for task ${task.id}:`, error);
           const failMsg: Message = { role: 'agent', parts: [{ type: 'text', text: `Failed during resume: ${error.message}` }] };
           const currentStatus = await updater.getCurrentStatus();
            if (currentStatus !== 'completed' && currentStatus !== 'canceled') {
                 await updater.signalCompletion('failed', failMsg);
            }
       }
  }
}

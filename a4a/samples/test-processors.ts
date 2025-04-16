import type { TaskProcessorV2, ProcessorYieldValue, ProcessorInputValue } from '../src/interfaces/processorV2';
import type { Task, TaskSendParams, Message, Part } from '../src/types'; // Assuming types are directly in src/types
import { ProcessorCancellationError } from '../src/interfaces/processorV2';

export class EchoProcessor implements TaskProcessorV2 {
    async canHandle(params: TaskSendParams): Promise<boolean> {
        return params.metadata?.skillId === 'echo';
    }

    async *process(initialTask: Task, initialParams: TaskSendParams): AsyncGenerator<ProcessorYieldValue, void, ProcessorInputValue> {
        const inputText = initialParams.message.parts.find((p: Part) => p.type === 'text')?.text ?? 'no text provided';

        yield { type: 'statusUpdate', state: 'working' };

        yield { type: 'statusUpdate', state: 'working', message: { role: 'agent', parts: [{type: 'text', text: `Echoing: ${inputText}`}]} };

        await Bun.sleep(10); // Simulate final work

        yield {
            type: 'artifact',
            artifactData: {
                name: 'echo-response',
                parts: [{ type: 'text', text: inputText }]
            }
        };
        // Generator finishes, core sets status to 'completed'
    }
}

export class CounterProcessor implements TaskProcessorV2 {
    async canHandle(params: TaskSendParams): Promise<boolean> {
        return params.metadata?.skillId === 'counter';
    }

    async *process(initialTask: Task, initialParams: TaskSendParams): AsyncGenerator<ProcessorYieldValue, void, ProcessorInputValue> {
        let count = 0;
        console.log(`[CounterProc ${initialTask.id}] Starting.`);

        yield { type: 'statusUpdate', state: 'working', message: { role: 'agent', parts: [{type: 'text', text: 'Counter started.'}]} };

        const inputMessage: Message = {
            role: 'agent',
            parts: [{ type: 'text', text: 'Please send a number to add.' }]
        };

        console.log(`[CounterProc ${initialTask.id}] Yielding for input...`);
        // Yield 'input-required' and wait. The value from generator.next(input) will be assigned here.
        const input: ProcessorInputValue = yield { type: 'statusUpdate', state: 'input-required', message: inputMessage };
        console.log(`[CounterProc ${initialTask.id}] Resumed with input:`, input);


        // Now process the received input
        if (input?.type === 'message') {
            const text = input.message.parts.find((p: Part) => p.type === 'text')?.text;
            const num = parseInt(text ?? '0', 10);
            if (!isNaN(num)) {
                count += num;
                yield { type: 'statusUpdate', state: 'working', message: { role: 'agent', parts: [{type: 'text', text: `Added ${num}. Current count: ${count}`}]} };
            } else {
                 yield { type: 'statusUpdate', state: 'working', message: { role: 'agent', parts: [{type: 'text', text: `Invalid number received: '${text}'. Count remains ${count}`}]} };
            }
        } else {
            // Handle cases where input wasn't a message (e.g., undefined if resumed unexpectedly)
             yield { type: 'statusUpdate', state: 'working', message: { role: 'agent', parts: [{type: 'text', text: `Input received was not of type 'message' type. Count remains ${count}`}]} };
             console.warn(`[CounterProc ${initialTask.id}] Resumed, but input was not of type 'message':`, input);
        }

         await Bun.sleep(10); // Simulate final work

        yield {
            type: 'artifact',
            artifactData: {
                name: 'final-count',
                parts: [{ type: 'text', text: `Final Count: ${count}` }]
            }
        };
         console.log(`[CounterProc ${initialTask.id}] Finishing.`);
        // Generator finishes, core sets status to 'completed'
    }
}

export class StreamingProcessor implements TaskProcessorV2 {
    async canHandle(params: TaskSendParams): Promise<boolean> {
        return params.metadata?.skillId === 'stream';
    }

    async *process(initialTask: Task, initialParams: TaskSendParams): AsyncGenerator<ProcessorYieldValue, void, ProcessorInputValue> {
         console.log(`[StreamProc ${initialTask.id}] Starting stream.`);
         yield { type: 'statusUpdate', state: 'working', message: { role: 'agent', parts: [{type: 'text', text: 'Starting stream...'}]} };
         await Bun.sleep(10);

         for (let i = 1; i <= 3; i++) {
             yield { // Yield each part as a separate artifact for simplicity in this core
                 type: 'artifact',
                 artifactData: {
                     name: `stream-part-${i}`,
                     parts: [{ type: 'text', text: `Part ${i}` }]
                 }
             };
              yield { type: 'statusUpdate', state: 'working', message: { role: 'agent', parts: [{type: 'text', text: `Sent part ${i}`}]} };
             await Bun.sleep(10);
         }
          yield { type: 'statusUpdate', state: 'working', message: { role: 'agent', parts: [{type: 'text', text: 'Stream finished.'}]} };
          console.log(`[StreamProc ${initialTask.id}] Finished stream.`);
          // Generator finishes, core sets status to completed
    }
}

export class CancelProcessor implements TaskProcessorV2 {
    async canHandle(params: TaskSendParams): Promise<boolean> {
        return params.metadata?.skillId === 'cancelTest';
    }

    async *process(initialTask: Task, initialParams: TaskSendParams): AsyncGenerator<ProcessorYieldValue, void, ProcessorInputValue> {
        console.log(`[CancelProc ${initialTask.id}] Starting, will wait...`);
        yield { type: 'statusUpdate', state: 'working' };

        try {
             await Bun.sleep(100); // Reduced sleep time
             // If this logs, the test failed as cancellation didn't happen in time
             console.error(`[CancelProc ${initialTask.id}] Sleep finished, wasn't cancelled!`); 
             yield { type: 'artifact', artifactData: { name: 'cancel-fail', parts: [{ type: 'text', text: 'Error: Not cancelled within time!' }]}};
             yield { type: 'statusUpdate', state: 'failed', message: { role: 'agent', parts: [{ type: 'text', text: 'Cancellation timed out'}]}};
        } catch (error) {
            // If cancellation works, this should be ProcessorCancellationError
            console.log(`[CancelProc ${initialTask.id}] Caught error (expected for cancellation):`, error);
             if (error instanceof ProcessorCancellationError) {
                 yield { type: 'statusUpdate', state: 'canceled', message: { role: 'agent', parts: [{ type: 'text', text: 'Task successfully canceled.'}]}};
             } else {
                 // Unexpected error during sleep/cancellation
                 yield { type: 'statusUpdate', state: 'failed', message: { role: 'agent', parts: [{ type: 'text', text: `Unexpected error during cancellation: ${error instanceof Error ? error.message : String(error)}`}]}};
             }
        } finally {
            console.log(`[CancelProc ${initialTask.id}] Exiting process function.`);
        }
    }
}

export class InputRequiredProcessor implements TaskProcessorV2 {
    async canHandle(params: TaskSendParams): Promise<boolean> {
        return params.metadata?.skillId === 'inputRequired';
    }

    async *process(initialTask: Task, initialParams: TaskSendParams): AsyncGenerator<ProcessorYieldValue, void, ProcessorInputValue> {
        console.log(`[InputReqProc ${initialTask.id}] Starting.`);
        yield { type: 'statusUpdate', state: 'working', message: { role: 'agent', parts: [{ type: 'text', text: 'Processor started.' }] } };

        const promptMessage: Message = {
            role: 'agent',
            parts: [{ type: 'text', text: 'Please provide the required input.' }]
        };

        console.log(`[InputReqProc ${initialTask.id}] Yielding input-required...`);
        const input: ProcessorInputValue = yield { type: 'statusUpdate', state: 'input-required', message: promptMessage };
        console.log(`[InputReqProc ${initialTask.id}] Resumed with input:`, input);

        let receivedText = 'No valid input received';
        if (input?.type === 'message') {
            receivedText = input.message.parts.find((p: Part) => p.type === 'text')?.text ?? 'Input message had no text part';
            yield { type: 'statusUpdate', state: 'working', message: { role: 'agent', parts: [{ type: 'text', text: `Received: ${receivedText}` }] } };
        } else {
            console.warn(`[InputReqProc ${initialTask.id}] Resumed, but input was not of type 'message':`, input);
            yield { type: 'statusUpdate', state: 'working', message: { role: 'agent', parts: [{ type: 'text', text: `Input was not a message.` }] } };
        }

        await Bun.sleep(10);

        yield {
            type: 'artifact',
            artifactData: {
                name: 'received-input',
                parts: [{ type: 'text', text: receivedText }]
            }
        };
        console.log(`[InputReqProc ${initialTask.id}] Finishing.`);
    }
}

export class PauseProcessor implements TaskProcessorV2 {
    private pauseDurationMs: number;

    constructor(pauseDurationMs: number = 500) {
        this.pauseDurationMs = pauseDurationMs;
    }

    async canHandle(params: TaskSendParams): Promise<boolean> {
        return params.metadata?.skillId === 'pauseTest';
    }

    async *process(initialTask: Task, initialParams: TaskSendParams): AsyncGenerator<ProcessorYieldValue, void, ProcessorInputValue> {
        const taskId = initialTask.id;
        console.log(`[PauseProc ${taskId}] Starting, will pause for ${this.pauseDurationMs}ms.`);
        yield { type: 'statusUpdate', state: 'working', message: { role: 'agent', parts: [{ type: 'text', text: 'Starting pause...' }] } };
        
        await Bun.sleep(this.pauseDurationMs);
        
        console.log(`[PauseProc ${taskId}] Resuming after pause.`);
        yield { type: 'statusUpdate', state: 'working', message: { role: 'agent', parts: [{ type: 'text', text: 'Resuming after pause.' }] } };
        
        await Bun.sleep(10); // Simulate final work

        yield {
            type: 'artifact',
            artifactData: {
                name: 'pause-result',
                parts: [{ type: 'text', text: 'Pause complete' }]
            }
        };
        console.log(`[PauseProc ${taskId}] Finishing.`);
        // Core handles final 'completed' state
    }
} 
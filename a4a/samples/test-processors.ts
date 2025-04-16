import type { TaskProcessorV2, ProcessorYieldValue, ProcessorInputValue, ProcessorStepContext } from '../src/interfaces/processorV2';
import type { Task, TaskSendParams, Message, Part } from '../src/types'; // Assuming types are directly in src/types
import { ProcessorCancellationError } from '../src/interfaces/processorV2';

export class EchoProcessor implements TaskProcessorV2 {
    async canHandle(params: TaskSendParams): Promise<boolean> {
        return params.metadata?.skillId === 'echo';
    }

    async *process(context: ProcessorStepContext, initialParams: TaskSendParams): AsyncGenerator<ProcessorYieldValue, void, ProcessorInputValue> {
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

    async *process(context: ProcessorStepContext, initialParams: TaskSendParams): AsyncGenerator<ProcessorYieldValue, void, ProcessorInputValue> {
        let count = 0;
        const taskId = context.task.id;
        console.log(`[CounterProc ${taskId}] Starting. Initial history length: ${context.task.history?.length ?? 0}`);

        yield { type: 'statusUpdate', state: 'working', message: { role: 'agent', parts: [{type: 'text', text: 'Counter started.'}]} };

        const inputMessage: Message = {
            role: 'agent',
            parts: [{ type: 'text', text: 'Please send a number to add.' }]
        };

        console.log(`[CounterProc ${taskId}] Yielding for input...`);
        const input: ProcessorInputValue = yield { type: 'statusUpdate', state: 'input-required', message: inputMessage };
        
        // --- CONTEXT CHECK --- 
        // When we resume here, the context should contain the updated task state, including history
        const historyLengthOnResume = context.task.history?.length ?? 0;
        console.log(`[CounterProc ${taskId}] Resumed with input. History length in context: ${historyLengthOnResume}`);
        // Expected history: [user initial msg, agent working msg, agent input req msg]
        if (historyLengthOnResume < 3) {
             console.error(`[CounterProc ${taskId}] ERROR: Expected history length >= 3 on resume, but got ${historyLengthOnResume}`);
        } else {
            // Optional: Deeper checks on roles/content if needed
             console.log(`[CounterProc ${taskId}] History check passed (length >= 3). Last message role: ${context.task.history?.[historyLengthOnResume - 1]?.role}`);
        }
        // --- END CONTEXT CHECK --- 

        console.log(`[CounterProc ${taskId}] Processing received input:`, input);
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
             yield { type: 'statusUpdate', state: 'working', message: { role: 'agent', parts: [{type: 'text', text: `Input received was not of type 'message' type. Count remains ${count}`}]} };
             console.warn(`[CounterProc ${taskId}] Resumed, but input was not of type 'message':`, input);
        }

         await Bun.sleep(10); 

        yield {
            type: 'artifact',
            artifactData: {
                name: 'final-count',
                // Include history length observed in the artifact for testing
                parts: [{ type: 'text', text: `Final Count: ${count}` }],
                metadata: { historyLengthObserved: historyLengthOnResume } 
            }
        };
         console.log(`[CounterProc ${taskId}] Finishing.`);
    }
}

export class StreamingProcessor implements TaskProcessorV2 {
    async canHandle(params: TaskSendParams): Promise<boolean> {
        return params.metadata?.skillId === 'stream';
    }

    async *process(context: ProcessorStepContext, initialParams: TaskSendParams): AsyncGenerator<ProcessorYieldValue, void, ProcessorInputValue> {
         console.log(`[StreamProc ${context.task.id}] Starting stream.`);
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
          console.log(`[StreamProc ${context.task.id}] Finished stream.`);
          // Generator finishes, core sets status to completed
    }
}

export class CancelProcessor implements TaskProcessorV2 {
    async canHandle(params: TaskSendParams): Promise<boolean> {
        return params.metadata?.skillId === 'cancelTest';
    }

    async *process(context: ProcessorStepContext, initialParams: TaskSendParams): AsyncGenerator<ProcessorYieldValue, void, ProcessorInputValue> {
        const taskId = context.task.id;
        console.log(`[CancelProc ${taskId}] Starting, will wait...`);
        yield { type: 'statusUpdate', state: 'working' };

        try {
             await Bun.sleep(100); // Reduced sleep time
             // If this logs, the test failed as cancellation didn't happen in time
             console.error(`[CancelProc ${taskId}] Sleep finished, wasn't cancelled!`); 
             yield { type: 'artifact', artifactData: { name: 'cancel-fail', parts: [{ type: 'text', text: 'Error: Not cancelled within time!' }]}};
             yield { type: 'statusUpdate', state: 'failed', message: { role: 'agent', parts: [{ type: 'text', text: 'Cancellation timed out'}]}};
        } catch (error) {
            // If cancellation works, this should be ProcessorCancellationError
            console.log(`[CancelProc ${taskId}] Caught error (expected for cancellation):`, error);
             if (error instanceof ProcessorCancellationError) {
                 yield { type: 'statusUpdate', state: 'canceled', message: { role: 'agent', parts: [{ type: 'text', text: 'Task successfully canceled.'}]}};
             } else {
                 // Unexpected error during sleep/cancellation
                 yield { type: 'statusUpdate', state: 'failed', message: { role: 'agent', parts: [{ type: 'text', text: `Unexpected error during cancellation: ${error instanceof Error ? error.message : String(error)}`}]}};
             }
        } finally {
            console.log(`[CancelProc ${taskId}] Exiting process function.`);
        }
    }
}

export class InputRequiredProcessor implements TaskProcessorV2 {
    async canHandle(params: TaskSendParams): Promise<boolean> {
        return params.metadata?.skillId === 'inputRequired';
    }

    async *process(context: ProcessorStepContext, initialParams: TaskSendParams): AsyncGenerator<ProcessorYieldValue, void, ProcessorInputValue> {
        const taskId = context.task.id;
        console.log(`[InputReqProc ${taskId}] Starting.`);
        yield { type: 'statusUpdate', state: 'working', message: { role: 'agent', parts: [{ type: 'text', text: 'Processor started.' }] } };

        const promptMessage: Message = {
            role: 'agent',
            parts: [{ type: 'text', text: 'Please provide the required input.' }]
        };

        console.log(`[InputReqProc ${taskId}] Yielding input-required...`);
        const input: ProcessorInputValue = yield { type: 'statusUpdate', state: 'input-required', message: promptMessage };
        console.log(`[InputReqProc ${taskId}] Resumed with input:`, input);

        let receivedText = 'No valid input received';
        if (input?.type === 'message') {
            receivedText = input.message.parts.find((p: Part) => p.type === 'text')?.text ?? 'Input message had no text part';
            yield { type: 'statusUpdate', state: 'working', message: { role: 'agent', parts: [{ type: 'text', text: `Received: ${receivedText}` }] } };
        } else {
            console.warn(`[InputReqProc ${taskId}] Resumed, but input was not of type 'message':`, input);
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
        console.log(`[InputReqProc ${taskId}] Finishing.`);
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

    async *process(context: ProcessorStepContext, initialParams: TaskSendParams): AsyncGenerator<ProcessorYieldValue, void, ProcessorInputValue> {
        const taskId = context.task.id;
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
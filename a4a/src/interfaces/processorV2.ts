import type { Task, TaskSendParams, Message, Artifact, TaskState } from '../types';

// --- Values Yielded BY the Generator ---

export interface YieldStatusUpdate {
    type: 'statusUpdate';
    state: TaskState;
    // Optional message to accompany the status.
    // Required when state is 'input-required'.
    message?: Message;
}

export interface YieldArtifact {
    type: 'artifact';
    artifactData: Omit<Artifact, 'index' | 'id' | 'timestamp'>; // Core provides index/id/timestamp
}

// Union of all possible yield types
export type ProcessorYieldValue = YieldStatusUpdate | YieldArtifact;


// --- Values Passed INTO the Generator via next() ---

// For resuming after inputRequired or subsequent sends
export interface ProcessorInputMessage {
    type: 'message';
    message: Message;
}

// For handling internal triggers (if needed by the processor)
export interface ProcessorInputInternal {
    type: 'internalUpdate';
    payload: any;
}

// Union of all possible input types (excluding initial params)
// undefined is possible on the first implicit .next() call
export type ProcessorInputValue = ProcessorInputMessage | ProcessorInputInternal | undefined;


// --- Error Type for Cancellation ---
export class ProcessorCancellationError extends Error {
    constructor(message = "Task canceled") {
        super(message);
        this.name = "ProcessorCancellationError";
    }
}


// --- New TaskProcessor Interface ---

export interface TaskProcessorV2 {
    /**
     * Determines if this processor can handle the initial request or resume an existing task
     * based on the provided parameters or task state.
     * NOTE: For resuming, the core might need additional logic if canHandle
     * relies solely on initial params.
     */
    canHandle(params: TaskSendParams, existingTask?: Task): Promise<boolean>;

    /**
     * Processes the task logic as an async generator.
     * - Yields status updates, artifacts, or input requests.
     * - Receives subsequent messages or internal updates via generator.next().
     * - Handles cancellation via generator.throw(new ProcessorCancellationError()).
     * - Normal completion signals 'completed' status.
     * - Throwing any other error signals 'failed' status.
     *
     * @param initialTask The initial state of the Task (might be newly created or existing).
     * @param initialParams The parameters from the first tasks/send or tasks/sendSubscribe call.
     * @param authContext Optional authentication context.
     * @returns A Promise that resolves when the generator completes successfully.
     * @yields {ProcessorYieldValue} Actions for the core to take.
     * @throws {ProcessorCancellationError} If cancellation is triggered externally.
     * @throws {Error} Any other error signals task failure.
     * @receives {ProcessorInputValue | undefined} Input for subsequent steps.
     */
    process(
        initialTask: Task,
        initialParams: TaskSendParams,
        authContext?: any
    ): AsyncGenerator<ProcessorYieldValue, void, ProcessorInputValue>;

    // Optional: Explicitly declare capabilities if needed
    // supportsInternalUpdates?: boolean;
} 
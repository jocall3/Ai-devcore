/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { injectable } from 'inversify';
import 'reflect-metadata';

/**
 * @interface IComputationService
 * @description Defines the contract for a service that runs computationally
 * intensive tasks off the main UI thread using a pool of Web Workers.
 */
export interface IComputationService {
  /**
   * Executes a registered task in a Web Worker.
   * @template T The expected return type of the task.
   * @param {string} taskName The unique identifier for the task to execute (e.g., 'aiService.generateCommitMessage').
   * @param {any[]} args The arguments to pass to the task function.
   * @returns {Promise<T>} A promise that resolves with the result of the task.
   * @example
   * const result = await computationService.execute<string>('aiService.generateCommitMessageStream', diff);
   */
  execute<T>(taskName: string, ...args: any[]): Promise<T>;

  /**
   * Terminates all workers in the pool. Should be called on application shutdown to free resources.
   * @returns {void}
   * @example
   * window.addEventListener('beforeunload', () => {
   *   computationService.terminate();
   * });
   */
  terminate(): void;
}

/**
 * @private
 * @interface QueuedTaskPayload
 * @description Represents the data payload for a task waiting in the queue.
 */
interface QueuedTaskPayload {
  /** @property {string} taskId - A unique identifier for this specific task instance. */
  taskId: string;
  /** @property {string} taskName - The name of the function to execute in the worker. */
  taskName: string;
  /** @property {any[]} args - Arguments for the task function. */
  args: any[];
}

/**
 * @private
 * @interface WorkerState
 * @description Represents the state of a single worker in the pool.
 */
interface WorkerState {
  /** @property {Worker} worker - The Web Worker instance. */
  worker: Worker;
  /** @property {boolean} isBusy - A flag indicating if the worker is currently processing a task. */
  isBusy: boolean;
  /** @property {string | null} currentTaskId - The ID of the task the worker is currently executing. */
  currentTaskId: string | null;
}

/**
 * @injectable
 * @class ComputationService
 * @implements {IComputationService}
 * @description Manages a pool of Web Workers to execute computationally intensive
 * tasks off the main UI thread. This service is responsible for queueing tasks,
 * dispatching them to available workers, and returning the results.
 * It is a key component of the off-thread computation strategy, ensuring the
 * application remains responsive during heavy operations like AI calls.
 *
 * @example
 * // In a DI container setup (e.g., InversifyJS)
 * // container.bind<IComputationService>(TYPES.ComputationService).to(ComputationService).inSingletonScope();
 *
 * // In a component or another service
 * // @inject(TYPES.ComputationService) private computationService: IComputationService;
 *
 * async function runAiTask() {
 *   const prompt = "Generate a commit message for a bug fix.";
 *   // All AI service calls are proxied through the computation service
 *   const commitMessage = await this.computationService.execute<string>('aiService.generateCommitMessageStream', prompt);
 *   console.log(commitMessage);
 * }
 */
@injectable()
export class ComputationService implements IComputationService {
  /**
   * @private
   * @property {WorkerState[]} workerPool - The pool of workers managed by the service.
   */
  private workerPool: WorkerState[] = [];
  /**
   * @private
   * @property {QueuedTaskPayload[]} taskQueue - A FIFO queue for tasks waiting for an available worker.
   */
  private taskQueue: QueuedTaskPayload[] = [];
  /**
   * @private
   * @property {Map<string, { resolve: Function; reject: Function }>} promiseResolvers - Stores promise resolvers for active tasks, keyed by taskId.
   */
  private promiseResolvers: Map<string, { resolve: Function; reject: Function }> = new Map();
  /**
   * @private
   * @readonly
   * @property {number} maxWorkers - The maximum number of workers in the pool.
   */
  private readonly maxWorkers: number;

  /**
   * @constructor
   * Initializes the worker pool based on the available hardware concurrency.
   */
  constructor() {
    this.maxWorkers = Math.max(navigator.hardwareConcurrency || 2, 2);
    this.initializeWorkerPool();
  }

  /**
   * @private
   * @method initializeWorkerPool
   * @description Creates all Web Workers for the pool and sets up their handlers.
   */
  private initializeWorkerPool(): void {
    for (let i = 0; i < this.maxWorkers; i++) {
      this.createWorker(i);
    }
  }

  /**
   * @private
   * @method createWorker
   * @description Creates a single Web Worker and adds it to the pool.
   * @param {number} index - The index in the pool to create the worker for.
   */
  private createWorker(index: number): void {
    const worker = new Worker(new URL('./computation.worker.ts', import.meta.url), {
      type: 'module',
      name: `ComputationWorker-${index}`
    });

    worker.onmessage = this.handleWorkerMessage.bind(this, index);
    worker.onerror = this.handleWorkerError.bind(this, index);

    this.workerPool[index] = { worker, isBusy: false, currentTaskId: null };
  }

  /**
   * @public
   * @method execute
   * @description Queues a task to be executed by an available worker.
   * @template T The expected return type of the task.
   * @param {string} taskName A unique identifier for the task (e.g., 'aiService.generateCommitMessageStream').
   * @param {any[]} args Arguments to be passed to the task function in the worker.
   * @returns {Promise<T>} A promise that resolves with the result from the worker.
   */
  public execute<T>(taskName: string, ...args: any[]): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const taskId = `${taskName}-${Date.now()}-${Math.random()}`;
      this.promiseResolvers.set(taskId, { resolve: resolve as Function, reject: reject as Function });
      this.taskQueue.push({ taskId, taskName, args });
      this.dispatchQueue();
    });
  }

  /**
   * @private
   * @method dispatchQueue
   * @description Checks for available workers and dispatches the next task from the queue.
   */
  private dispatchQueue(): void {
    if (this.taskQueue.length === 0) return;

    const availableWorkerIndex = this.workerPool.findIndex(w => !w.isBusy);
    if (availableWorkerIndex !== -1) {
      const workerState = this.workerPool[availableWorkerIndex];
      const task = this.taskQueue.shift();

      if (task) {
        workerState.isBusy = true;
        workerState.currentTaskId = task.taskId;
        workerState.worker.postMessage({
          taskId: task.taskId,
          taskName: task.taskName,
          args: task.args,
        });
      }
    }
  }

  /**
   * @private
   * @method handleWorkerMessage
   * @description Handles messages from a worker, resolving or rejecting the corresponding promise.
   * @param {number} workerIndex The index of the worker that sent the message.
   * @param {MessageEvent} event The message event from the worker.
   */
  private handleWorkerMessage(workerIndex: number, event: MessageEvent): void {
    const { taskId, result, error } = event.data;
    const workerState = this.workerPool[workerIndex];

    if (workerState.currentTaskId !== taskId) return;

    const resolvers = this.promiseResolvers.get(taskId);
    if (resolvers) {
      if (error) {
        resolvers.reject(new Error(error));
      } else {
        resolvers.resolve(result);
      }
      this.promiseResolvers.delete(taskId);
    }

    this.cleanupWorker(workerIndex);
  }

  /**
   * @private
   * @method handleWorkerError
   * @description Handles catastrophic error events from a worker.
   * @param {number} workerIndex The index of the worker that threw the error.
   * @param {ErrorEvent} error The error event from the worker.
   */
  private handleWorkerError(workerIndex: number, error: ErrorEvent): void {
    console.error(`Catastrophic error in Worker #${workerIndex}:`, error.message);
    const workerState = this.workerPool[workerIndex];
    const taskId = workerState.currentTaskId;

    if (taskId) {
      const resolvers = this.promiseResolvers.get(taskId);
      if (resolvers) {
        resolvers.reject(new Error(`Worker crashed while executing task ${taskId}: ${error.message}`));
        this.promiseResolvers.delete(taskId);
      }
    }
    this.restartWorker(workerIndex);
  }

  /**
   * @private
   * @method cleanupWorker
   * @description Resets a worker's state after a task is completed and attempts to dispatch a new task.
   * @param {number} workerIndex The index of the worker to clean up.
   */
  private cleanupWorker(workerIndex: number): void {
    this.workerPool[workerIndex].isBusy = false;
    this.workerPool[workerIndex].currentTaskId = null;
    this.dispatchQueue();
  }

  /**
   * @private
   * @method restartWorker
   * @description Terminates a failed worker and creates a new one in its place.
   * @param {number} workerIndex The index of the worker to restart.
   */
  private restartWorker(workerIndex: number): void {
    this.workerPool[workerIndex].worker.terminate();
    this.createWorker(workerIndex);
    this.dispatchQueue(); // Try to process queue with the new worker
  }

  /**
   * @public
   * @method terminate
   * @description Terminates all workers in the pool to clean up resources.
   */
  public terminate(): void {
    this.workerPool.forEach(state => state.worker.terminate());
    this.workerPool = [];
  }
}

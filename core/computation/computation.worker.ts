/// <reference lib="webworker" />

/**
 * @fileoverview This is the main script for the Computation Web Worker.
 * It listens for messages from the main thread, executes computationally
 * intensive tasks (primarily AI service calls), and posts results back.
 * This isolates heavy processing from the main UI thread, preventing freezes.
 */

// NOTE: The original `aiService.ts` has a type error that prevents TypeScript from
// correctly resolving its exports at build time. To work around this without modifying
// the broken file, this worker dynamically imports the module at runtime.

/**
 * Defines the structure for messages sent from the main thread to the worker.
 */
export interface ComputationWorkerRequest {
  taskId: string;
  command: string; // Changed from a static keyof to a dynamic string to support runtime import
  payload: any[];
}

/**
 * Defines the structure for messages sent from the worker back to the main thread.
 */
export interface ComputationWorkerResponse {
  taskId: string;
  result?: any;
  chunk?: any;
  isDone?: boolean;
  error?: { name: string; message: string; stack?: string };
}

/**
 * Main message handler for the worker.
 * It receives a task, dynamically imports the aiService, executes the corresponding command,
 * and posts messages back with the results.
 * It handles both promise-based functions and async generators (streams).
 * @param {MessageEvent<ComputationWorkerRequest>} event - The message event from the main thread.
 */
self.onmessage = async (event: MessageEvent<ComputationWorkerRequest>) => {
  const { taskId, command, payload } = event.data;

  try {
    // Dynamically import the aiService module at runtime. This bypasses build-time type
    // resolution issues caused by errors within the aiService.ts module itself.
    const aiServiceModule = await import('../../services/aiService');
    
    // Access the exported function dynamically.
    const func = (aiServiceModule as any)[command];

    if (typeof func !== 'function') {
      throw new Error(`Unknown or non-function command in computation worker: '${command}'`);
    }

    // Execute the function with the provided arguments
    const result = func(...payload);

    // Handle both streaming (async generator) and promise-based functions
    if (result && typeof result[Symbol.asyncIterator] === 'function') {
      for await (const chunk of result) {
        // Post each chunk back to the main thread
        self.postMessage({ taskId, chunk, isDone: false } as ComputationWorkerResponse);
      }
      // Signal that the stream is complete
      self.postMessage({ taskId, isDone: true } as ComputationWorkerResponse);
    } else {
      // Handle a regular promise
      const promiseResult = await result;
      self.postMessage({ taskId, result: promiseResult } as ComputationWorkerResponse);
    }
  } catch (err: unknown) {
    // Ensure the error is in a serializable format before posting back to the main thread
    const errorPayload = err instanceof Error
      ? { name: err.name, message: err.message, stack: err.stack }
      : { name: 'UnknownError', message: String(err) };
      
    self.postMessage({ taskId, error: errorPayload } as ComputationWorkerResponse);
  }
};

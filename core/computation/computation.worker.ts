/// <reference lib="webworker" />

/**
 * @fileoverview This is the main script for the Computation Web Worker.
 * It listens for messages from the main thread, executes computationally
 * intensive tasks (primarily AI service calls), and posts results back.
 * This isolates heavy processing from the main UI thread, preventing freezes.
 * @example
 * // From the main thread (e.g., ComputationService.ts):
 * const worker = new Worker(new URL('./computation.worker.ts', import.meta.url));
 * const taskId = Date.now().toString();
 * worker.postMessage({
 *   taskId,
 *   command: 'generateContent',
 *   payload: ['Explain quantum computing in simple terms']
 * });
 * worker.onmessage = (event) => {
 *   if (event.data.taskId === taskId) {
 *     console.log('Worker result:', event.data.result);
 *   }
 * };
 */

import * as aiService from '../../services/aiService';

/**
 * Defines the structure for messages sent from the main thread to the worker.
 * @typedef {object} ComputationWorkerRequest
 * @property {string} taskId - A unique identifier for the task, used to correlate responses.
 * @property {keyof typeof commandMap} command - The name of the function to execute.
 * @property {any[]} payload - An array of arguments to pass to the command function.
 */
export interface ComputationWorkerRequest {
  taskId: string;
  command: keyof typeof commandMap;
  payload: any[];
}

/**
 * Defines the structure for messages sent from the worker back to the main thread.
 * @typedef {object} ComputationWorkerResponse
 * @property {string} taskId - The unique identifier for the task.
 * @property {any} [result] - The result of a successfully completed promise-based task.
 * @property {any} [chunk] - A chunk of data from a streaming task.
 * @property {boolean} [isDone] - Indicates if a streaming task is complete.
 * @property {{name: string; message: string; stack?: string}} [error] - A serializable error object if an error occurred.
 */
export interface ComputationWorkerResponse {
  taskId: string;
  result?: any;
  chunk?: any;
  isDone?: boolean;
  error?: { name: string; message: string; stack?: string };
}

/**
 * A map of allowed commands to their corresponding functions in the `aiService`.
 * This acts as a security and routing layer, ensuring only specific functions can be executed.
 * @type {Record<string, (...args: any[]) => Promise<any> | AsyncGenerator<any>>}
 */
const commandMap = {
  // Streaming functions
  streamContent: aiService.streamContent,
  explainCodeStream: aiService.explainCodeStream,
  generateRegExStream: aiService.generateRegExStream,
  generateCommitMessageStream: aiService.generateCommitMessageStream,
  generateUnitTestsStream: aiService.generateUnitTestsStream,
  formatCodeStream: aiService.formatCodeStream,
  generateComponentFromImageStream: aiService.generateComponentFromImageStream,
  transcribeAudioToCodeStream: aiService.transcribeAudioToCodeStream,
  transferCodeStyleStream: aiService.transferCodeStyleStream,
  generateCodingChallengeStream: aiService.generateCodingChallengeStream,
  reviewCodeStream: aiService.reviewCodeStream,
  generateChangelogFromLogStream: aiService.generateChangelogFromLogStream,
  enhanceSnippetStream: aiService.enhanceSnippetStream,
  summarizeNotesStream: aiService.summarizeNotesStream,
  migrateCodeStream: aiService.migrateCodeStream,
  analyzeConcurrencyStream: aiService.analyzeConcurrencyStream,
  debugErrorStream: aiService.debugErrorStream,
  refactorForPerformance: aiService.refactorForPerformance,
  refactorForReadability: aiService.refactorForReadability,
  convertToFunctionalComponent: aiService.convertToFunctionalComponent,
  generateJsDoc: aiService.generateJsDoc,
  translateComments: aiService.translateComments,
  generateDockerfile: aiService.generateDockerfile,
  convertCssToTailwind: aiService.convertCssToTailwind,
  applySpecificRefactor: aiService.applySpecificRefactor,
  generateBugReproductionTestStream: aiService.generateBugReproductionTestStream,
  generateIamPolicyStream: aiService.generateIamPolicyStream,
  convertJsonToXbrlStream: aiService.convertJsonToXbrlStream,

  // Promise-based functions
  generateContent: aiService.generateContent,
  generateJson: aiService.generateJson,
  generateAppFeatureComponent: aiService.generateAppFeatureComponent,
  generatePipelineCode: aiService.generatePipelineCode,
  generateCiCdConfig: aiService.generateCiCdConfig,
  analyzePerformanceTrace: aiService.analyzePerformanceTrace,
  suggestA11yFix: aiService.suggestA11yFix,
  createApiDocumentation: aiService.createApiDocumentation,
  jsonToTypescriptInterface: aiService.jsonToTypescriptInterface,
  suggestAlternativeLibraries: aiService.suggestAlternativeLibraries,
  explainRegex: aiService.explainRegex,
  generateMermaidJs: aiService.generateMermaidJs,
  generateWeeklyDigest: aiService.generateWeeklyDigest,
  generateTechnicalSpecFromDiff: aiService.generateTechnicalSpecFromDiff,
  explainCodeStructured: aiService.explainCodeStructured,
  generateThemeFromDescription: aiService.generateThemeFromDescription,
  generateSemanticTheme: aiService.generateSemanticTheme,
  generatePrSummaryStructured: aiService.generatePrSummaryStructured,
  generateFeature: aiService.generateFeature,
  generateFullStackFeature: aiService.generateFullStackFeature,
  generateCronFromDescription: aiService.generateCronFromDescription,
  generateColorPalette: aiService.generateColorPalette,
  generateMockData: aiService.generateMockData,
  analyzeCodeForVulnerabilities: aiService.analyzeCodeForVulnerabilities,
  sqlToApiEndpoints: aiService.sqlToApiEndpoints,
  detectCodeSmells: aiService.detectCodeSmells,
  generateTagsForCode: aiService.generateTagsForCode,
  reviewCodeStructured: aiService.reviewCodeStructured,
  generateClientFromApiSchema: aiService.generateClientFromApiSchema,
  generateTerraformConfig: aiService.generateTerraformConfig,
  getInferenceFunction: aiService.getInferenceFunction,
  generateImage: aiService.generateImage,
  generateImageFromImageAndText: aiService.generateImageFromImageAndText,
};

/**
 * Main message handler for the worker.
 * It receives a task, executes the corresponding command, and posts messages back with the results.
 * It handles both promise-based functions and async generators (streams).
 * @param {MessageEvent<ComputationWorkerRequest>} event - The message event from the main thread.
 */
self.onmessage = async (event: MessageEvent<ComputationWorkerRequest>) => {
  const { taskId, command, payload } = event.data;

  try {
    const func = commandMap[command];
    if (!func) {
      throw new Error(`Unknown command in computation worker: ${command}`);
    }

    // Execute the function with the provided arguments
    const result = func(...payload);

    if (result && typeof result[Symbol.asyncIterator] === 'function') {
      // Handle async generator (stream)
      for await (const chunk of result) {
        self.postMessage({ taskId, chunk, isDone: false } as ComputationWorkerResponse);
      }
      self.postMessage({ taskId, isDone: true } as ComputationWorkerResponse);
    } else {
      // Handle promise
      const promiseResult = await result;
      self.postMessage({ taskId, result: promiseResult } as ComputationWorkerResponse);
    }
  } catch (err: unknown) {
    // Ensure the error is in a serializable format before posting back
    const errorPayload = err instanceof Error
      ? { name: err.name, message: err.message, stack: err.stack }
      : { name: 'UnknownError', message: String(err) };

    self.postMessage({ taskId, error: errorPayload } as ComputationWorkerResponse);
  }
};

/**
 * @file Defines the command for generating unit tests for a code snippet.
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// FIX: Corrected import path for AIEngineService.
import type { AIEngineService } from '../ai-engine.service';

// FIX: ICommand is defined locally to resolve a broken import path.
// In a fully refactored system, this would be a central, shared interface.
/**
 * Represents a command that can be executed.
 * @template T - The expected return type of the execute method.
 */
export interface ICommand<T> {
  /**
   * Executes the command logic.
   * @param context - The context containing necessary services and data for execution.
   * @returns The result of the command execution.
   */
  execute(context: { [key: string]: any }): T;
}

/**
 * @class GenerateUnitTestCommand
 * @implements {ICommand<Promise<AsyncGenerator<string>>>}
 * @description A command encapsulating the logic for generating unit tests for a given code snippet.
 * This command is intended to be processed by a central command handler within the application's
 * modular architecture.
 *
 * @example
 * ```typescript
 * // In a service or component where dependency injection is available:
 * const aiEngineService = container.get<AIEngineService>(TYPES.AIEngineService);
 * const codeToTest = `export const add = (a, b) => a + b;`;
 *
 * const command = new GenerateUnitTestCommand(codeToTest);
 * const testStream = await command.execute({ aiEngineService });
 *
 * let generatedTests = '';
 * for await (const chunk of testStream) {
 *   generatedTests += chunk;
 * }
 * console.log(generatedTests);
 * ```
 */
export class GenerateUnitTestCommand implements ICommand<Promise<AsyncGenerator<string>>> {
  /**
   * The code snippet for which unit tests will be generated.
   * This property is private and read-only to ensure the command is immutable after creation.
   * @private
   * @readonly
   * @type {string}
   */
  private readonly code: string;

  /**
   * Creates an instance of GenerateUnitTestCommand.
   *
   * @param {string} code The source code snippet to generate tests for.
   */
  public constructor(code: string) {
    this.code = code;
  }

  /**
   * Executes the unit test generation command by calling the appropriate method on the AIEngineService.
   * This method encapsulates the core logic of the command.
   *
   * @param {object} context - The execution context.
   * @param {AIEngineService} context.aiEngineService - The AI engine service responsible for executing AI-related tasks.
   * @returns {Promise<AsyncGenerator<string>>} A promise that resolves to an asynchronous generator,
   * which yields the generated unit test code in streaming chunks.
   */
  public async execute(context: { aiEngineService: AIEngineService }): Promise<AsyncGenerator<string>> {
    if (!context || !context.aiEngineService) {
      throw new Error('Execution context must contain an "aiEngineService".');
    }
    // The command delegates the actual work to the injected service.
    // This adheres to the single responsibility principle and keeps the command
    // focused on encapsulating the "what" (generate tests) rather than the "how".
    return context.aiEngineService.generateUnitTestsStream(this.code);
  }
}

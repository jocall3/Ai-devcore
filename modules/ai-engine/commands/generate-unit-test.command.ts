/**
 * @file Defines the command for generating unit tests for a code snippet.
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// These imports assume a new modular architecture is in place.
// ICommand would be a core interface for the command bus pattern.
// AIEngineService would be the central service for the AI-Engine module.
import type { ICommand } from '../../common/command-bus/command.interface';
import type { AIEngineService } from '../services/ai-engine.service';

/**
 * @class GenerateUnitTestCommand
 * @implements {ICommand<AsyncGenerator<string>>}
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
 * const command = new GenerateUnitTestCommand(codeToTest, aiEngineService);
 * const testStream = await command.execute();
 *
 * let generatedTests = '';
 * for await (const chunk of testStream) {
 *   generatedTests += chunk;
 * }
 * console.log(generatedTests);
 * ```
 */
export class GenerateUnitTestCommand implements ICommand<AsyncGenerator<string>> {
  /**
   * The code snippet for which unit tests will be generated.
   * This property is private and read-only to ensure the command is immutable after creation.
   * @private
   * @readonly
   * @type {string}
   */
  private readonly code: string;

  /**
   * An instance of the AIEngineService, injected to handle the actual AI call.
   * This decouples the command from the specific implementation of the AI provider.
   * @private
   * @readonly
   * @type {AIEngineService}
   */
  private readonly aiEngineService: AIEngineService;

  /**
   * Creates an instance of GenerateUnitTestCommand.
   *
   * @param {string} code The source code snippet to generate tests for.
   * @param {AIEngineService} aiEngineService The AI engine service responsible for executing AI-related tasks.
   * This dependency is expected to be injected by a DI container.
   */
  public constructor(code: string, aiEngineService: AIEngineService) {
    this.code = code;
    this.aiEngineService = aiEngineService;
  }

  /**
   * Executes the unit test generation command by calling the appropriate method on the AIEngineService.
   * This method encapsulates the core logic of the command.
   *
   * @returns {Promise<AsyncGenerator<string>>} A promise that resolves to an asynchronous generator,
   * which yields the generated unit test code in streaming chunks.
   */
  public async execute(): Promise<AsyncGenerator<string>> {
    // The command delegates the actual work to the injected service.
    // This adheres to the single responsibility principle and keeps the command
    // focused on encapsulating the "what" (generate tests) rather than the "how".
    return this.aiEngineService.generateUnitTestsStream(this.code);
  }
}

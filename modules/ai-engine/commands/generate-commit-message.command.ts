/**
 * @file Implements the command for generating a commit message.
 * @license Apache-2.0
 */

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
 * @interface IAiProvider
 * @description Defines the contract for an AI provider, abstracting the specific implementation (e.g., Gemini, OpenAI).
 */
export interface IAiProvider {
  /**
   * Generates a commit message based on a provided git diff.
   * @param diff - The git diff string.
   * @returns A promise that resolves to the generated commit message string.
   */
  generateCommitMessage(diff: string): Promise<string>;
}

/**
 * @class GenerateCommitMessageCommand
 * @implements {ICommand<Promise<string>>}
 * @description A command to generate a conventional commit message from a git diff.
 *
 * This command encapsulates the data (the git diff) required to generate a commit message.
 * The actual AI call is made within the `execute` method, which relies on an `IAiProvider`
 * passed in the execution context. This decouples the command from the specific AI service implementation.
 */
export class GenerateCommitMessageCommand implements ICommand<Promise<string>> {
  /**
   * The git diff string to be used for generating the commit message.
   * @private
   * @readonly
   */
  private readonly diff: string;

  /**
   * Creates an instance of GenerateCommitMessageCommand.
   * @param {string} diff - The git diff string.
   *
   * @example
   * const diff = 'diff --git a/file.js b/file.js\n--- a/file.js\n+++ b/file.js\n@@ -1,1 +1,1 @@\n-console.log("hello");\n+console.log("hello world");';
   * const command = new GenerateCommitMessageCommand(diff);
   */
  constructor(diff: string) {
    if (!diff || typeof diff !== 'string' || diff.trim() === '') {
      throw new Error('A non-empty diff string must be provided.');
    }
    this.diff = diff;
  }

  /**
   * Executes the command to generate the commit message.
   * It expects an `IAiProvider` to be available in the context object.
   *
   * @param {object} context - The execution context.
   * @param {IAiProvider} context.aiProvider - The AI provider service to use for generation.
   * @returns {Promise<string>} A promise that resolves to the generated commit message.
   * @throws {Error} If the aiProvider is not found in the context.
   *
   * @example
   * // Assuming a command handler and a configured AI provider
   * const mockAiProvider = {
   *   generateCommitMessage: async (diff) => Promise.resolve('feat: update greeting message')
   * };
   * const command = new GenerateCommitMessageCommand('...');
   * const commitMessage = await command.execute({ aiProvider: mockAiProvider });
   * console.log(commitMessage); // 'feat: update greeting message'
   */
  public async execute(context: { aiProvider: IAiProvider }): Promise<string> {
    if (!context || !context.aiProvider) {
      throw new Error('Execution context must contain an "aiProvider".');
    }

    const { aiProvider } = context;
    return aiProvider.generateCommitMessage(this.diff);
  }
}

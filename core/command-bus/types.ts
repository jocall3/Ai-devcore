/**
 * @file Defines the core types and interfaces for the application's command bus system,
 *       which is central to the modular monolith architecture.
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Represents a generic command. Commands are immutable objects that describe a user's
 * intent to change the system's state or perform an action.
 *
 * @template T The type of the payload associated with the command.
 * @property {string} id - A unique string identifier for the command type.
 * @property {T} payload - The data required to execute the command.
 *
 * @example
 * ```ts
 * // A command to generate a commit message.
 * const generateCommitCommand: ICommand<{ diff: string }> = {
 *   id: 'ai.generateCommitMessage',
 *   payload: { diff: '...' }
 * };
 * ```
 */
export interface ICommand<T = any> {
  /**
   * A unique string identifier for the command type (e.g., 'ai.generateCommitMessage').
   * This is used by the Command Bus to route the command to the correct handler.
   * @readonly
   */
  readonly id: string;

  /**
   * The data payload required for the command's execution. It is strongly typed
   * based on the command's definition.
   * @readonly
   */
  readonly payload: T;
}

/**
 * Represents a handler for a specific command type. Command handlers contain the
 * business logic to execute a command. Each handler is responsible for a single command.
 *
 * @template C The specific type of ICommand this handler can process.
 * @template R The type of the result returned by the handler's execution.
 *
 * @example
 * ```ts
 * // An example handler for the 'ai.generateCommitMessage' command.
 * class GenerateCommitMessageHandler implements ICommandHandler<GenerateCommitCommand, string> {
 *   public readonly commandId = 'ai.generateCommitMessage';
 *
 *   public async handle(command: GenerateCommitCommand): Promise<string> {
 *     const { diff } = command.payload;
 *     // ... logic to call AI service ...
 *     return "feat: Implement new feature";
 *   }
 * }
 * ```
 */
export interface ICommandHandler<C extends ICommand, R = any> {
  /**
   * The unique identifier of the command that this handler is responsible for.
   * This must match the `id` of the command it handles.
   * @readonly
   */
  readonly commandId: C['id'];

  /**
   * Executes the business logic for the associated command.
   * @param {C} command The command object to be handled.
   * @returns {Promise<R>} A promise that resolves with the result of the command's execution.
   */
  handle(command: C): Promise<R>;
}

/**
 * Defines the contract for the central Command Bus. The Command Bus is responsible
 * for receiving commands and dispatching them to their registered handlers.
 * It decouples the command issuer from the command executor.
 *
 * @example
 * ```ts
 * // Somewhere in the application setup:
 * const commandBus = new CommandBus();
 * const generateCommitHandler = new GenerateCommitMessageHandler();
 * commandBus.registerHandler(generateCommitHandler);
 *
 * // Somewhere in a UI component or service:
 * const diff = '...';
 * const result = await commandBus.execute({
 *   id: 'ai.generateCommitMessage',
 *   payload: { diff }
 * });
 * console.log(result); // "feat: Implement new feature"
 * ```
 */
export interface ICommandBus {
  /**
   * Executes a command by finding and invoking its registered handler.
   * @template T The payload type of the command.
   * @template R The expected return type from the command handler.
   * @param {ICommand<T>} command The command to execute.
   * @returns {Promise<R>} A promise that resolves with the result from the handler.
   * @throws {Error} If no handler is registered for the given command ID.
   */
  execute<T, R>(command: ICommand<T>): Promise<R>;

  /**
   * Registers a command handler with the bus.
   * @param {ICommandHandler<any, any>} handler The command handler instance to register.
   * @throws {Error} If a handler is already registered for the same command ID.
   */
  registerHandler(handler: ICommandHandler<any, any>): void;
}

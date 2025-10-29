/**
 * @file Implements the central command bus for the application.
 * @summary This service orchestrates the command pattern, decoupling command issuers from command handlers.
 * It follows the principles of a modular monolith by acting as a central point for inter-module communication
 * through commands, ensuring that features do not directly call each other's services.
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @interface ICommand
 * @description Base interface for all commands within the application.
 * Each command represents a single, discrete action that can be performed.
 * It is a simple Data Transfer Object (DTO) containing a unique type identifier and a payload.
 *
 * @template TPayload The type of the data payload the command carries. Defaults to `any`.
 *
 * @example
 * // Definition of a specific command
 * interface GenerateCommitMessagePayload {
 *   diff: string;
 * }
 *
 * class GenerateCommitMessageCommand implements ICommand<GenerateCommitMessagePayload> {
 *   public readonly type = 'ai:generateCommitMessage';
 *   constructor(public readonly payload: GenerateCommitMessagePayload) {}
 * }
 */
export interface ICommand<TPayload = any> {
  /**
   * A unique string identifier for the command type.
   * This is used by the CommandBusService to find the correct handler.
   * A good convention is `module:action`, e.g., `ai:generateCommitMessage`.
   * @type {string}
   * @readonly
   */
  readonly type: string;

  /**
   * The data required to execute the command.
   * @type {TPayload}
   * @readonly
   */
  readonly payload: TPayload;
}

/**
 * @interface ICommandHandler
 * @description Interface for a handler that executes a specific command.
 * Each handler is responsible for the logic of a single command type.
 * Handlers are registered with the CommandBusService at application startup.
 *
 * @template TCommand The specific type of command this handler processes, extending ICommand.
 * @template TResult The type of the result returned by the handler's execute method.
 *
 * @example
 * // Implementation of a handler for GenerateCommitMessageCommand
 * class GenerateCommitMessageCommandHandler implements ICommandHandler<GenerateCommitMessageCommand, string> {
 *   public readonly commandType = 'ai:generateCommitMessage';
 *
 *   constructor(private readonly aiService: AiService) {}
 *
 *   public async execute(command: GenerateCommitMessageCommand): Promise<string> {
 *     const { diff } = command.payload;
 *     return this.aiService.generateCommitMessage(diff);
 *   }
 * }
 */
export interface ICommandHandler<TCommand extends ICommand, TResult> {
  /**
   * The unique type identifier of the command this handler is responsible for.
   * This must match the `type` property of the command it handles.
   * @type {string}
   * @readonly
   */
  readonly commandType: TCommand['type'];

  /**
   * Executes the command's logic.
   * @param {TCommand} command The command instance to execute.
   * @returns {Promise<TResult>} A promise that resolves with the result of the command execution.
   */
  execute(command: TCommand): Promise<TResult>;
}

/**
 * @class CommandBusService
 * @description A central service for dispatching commands and routing them to their respective handlers.
 * This class implements the core of the command pattern for the application.
 * It should be instantiated as a singleton and provided through a Dependency Injection container.
 *
 * @example
 * // In the DI container setup
 * container.bind<CommandBusService>(TYPES.CommandBusService).to(CommandBusService).inSingletonScope();
 *
 * // Registering a handler
 * const commandBus = container.get<CommandBusService>(TYPES.CommandBusService);
 * const handler = new GenerateCommitMessageCommandHandler(aiService);
 * commandBus.register(handler);
 *
 * // Executing a command from a UI component or another service
 * const command = new GenerateCommitMessageCommand({ diff: '...' });
 * const commitMessage = await commandBus.execute<string>(command);
 */
export class CommandBusService {
  /**
   * A map to store registered command handlers, keyed by command type.
   * @private
   * @type {Map<string, ICommandHandler<any, any>>}
   */
  private readonly handlers = new Map<string, ICommandHandler<any, any>>();

  /**
   * Registers a command handler with the command bus.
   * If a handler for the same command type already exists, it will be overwritten and a warning will be logged.
   * @public
   * @template TCommand The command type the handler processes.
   * @template TResult The result type of the handler.
   * @param {ICommandHandler<TCommand, TResult>} handler The command handler instance to register.
   * @returns {void}
   *
   * @example
   * const handler = new MyCommandHandler();
   * commandBus.register(handler);
   */
  public register<TCommand extends ICommand, TResult>(
    handler: ICommandHandler<TCommand, TResult>
  ): void {
    if (this.handlers.has(handler.commandType)) {
      console.warn(
        `[CommandBusService] A handler for command type "${handler.commandType}" is already registered. It will be overwritten.`
      );
    }
    this.handlers.set(handler.commandType, handler);
  }

  /**
   * Executes a command by finding and invoking its registered handler.
   * @public
   * @template TResult The expected result type of the command execution.
   * @param {ICommand} command The command instance to execute.
   * @returns {Promise<TResult>} A promise that resolves with the result from the handler.
   * @throws {Error} If no handler is found for the given command type.
   *
   * @example
   * const command = new MyCommand({ foo: 'bar' });
   * const result = await commandBus.execute<MyResultType>(command);
   */
  public async execute<TResult>(command: ICommand): Promise<TResult> {
    const handler = this.handlers.get(command.type);

    if (!handler) {
      console.error(
        `[CommandBusService] No command handler registered for command type "${command.type}".`
      );
      throw new Error(
        `No command handler registered for command type "${command.type}".`
      );
    }

    try {
      return await handler.execute(command);
    } catch (error) {
      console.error(
        `[CommandBusService] Error executing command "${command.type}":`,
        error
      );
      // Re-throw the error to be handled by the caller
      throw error;
    }
  }
}

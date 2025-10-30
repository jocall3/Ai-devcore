/**
 * @file Implements the central command bus for the application.
 * @summary This service orchestrates the command pattern, decoupling command issuers from command handlers.
 * It follows the principles of a modular monolith by acting as a central point for inter-module communication
 * through commands, ensuring that features do not directly call each other's services.
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { injectable } from 'inversify';
import 'reflect-metadata';
import { ICommand, ICommandHandler, ICommandBus } from './types';

/**
 * @class CommandBusService
 * @implements {ICommandBus}
 * @description A central service for dispatching commands and routing them to their respective handlers.
 * This class implements the core of the command pattern for the application.
 * It should be instantiated as a singleton and provided through a Dependency Injection container.
 *
 * @example
 * // In the DI container setup
 * container.bind<ICommandBus>(TYPES.CommandBus).to(CommandBusService).inSingletonScope();
 *
 * // Registering a handler
 * const commandBus = container.get<ICommandBus>(TYPES.CommandBus);
 * const handler = new GenerateCommitMessageCommandHandler(aiService);
 * commandBus.registerHandler(handler);
 *
 * // Executing a command from a UI component or another service
 * const command: ICommand = { id: 'ai:generateCommitMessage', payload: { diff: '...' } };
 * const commitMessage = await commandBus.execute<string>(command);
 */
@injectable()
export class CommandBusService implements ICommandBus {
  /**
   * A map to store registered command handlers, keyed by command ID.
   * @private
   * @type {Map<string, ICommandHandler<any, any>>}
   */
  private readonly handlers = new Map<string, ICommandHandler<any, any>>();

  /**
   * Registers a command handler with the command bus.
   * If a handler for the same command ID already exists, it will be overwritten and a warning will be logged.
   * @public
   * @param {ICommandHandler<any, any>} handler The command handler instance to register.
   * @returns {void}
   *
   * @example
   * const handler = new MyCommandHandler();
   * commandBus.registerHandler(handler);
   */
  public registerHandler(handler: ICommandHandler<any, any>): void {
    if (this.handlers.has(handler.commandId)) {
      console.warn(
        `[CommandBusService] A handler for command ID "${handler.commandId}" is already registered. It will be overwritten.`
      );
    }
    this.handlers.set(handler.commandId, handler);
  }

  /**
   * Executes a command by finding and invoking its registered handler.
   * @public
   * @template T The payload type of the command.
   * @template R The expected result type of the command execution.
   * @param {ICommand<T>} command The command instance to execute.
   * @returns {Promise<R>} A promise that resolves with the result from the handler.
   * @throws {Error} If no handler is found for the given command ID.
   *
   * @example
   * const command: ICommand = { id: 'myCommand', payload: { foo: 'bar' } };
   * const result = await commandBus.execute<MyResultType>(command);
   */
  public async execute<T, R>(command: ICommand<T>): Promise<R> {
    const handler = this.handlers.get(command.id);

    if (!handler) {
      const errorMessage = `No command handler registered for command ID "${command.id}".`;
      console.error(`[CommandBusService] ${errorMessage}`);
      throw new Error(errorMessage);
    }

    try {
      return await handler.handle(command);
    } catch (error) {
      console.error(
        `[CommandBusService] Error executing command "${command.id}":`,
        error
      );
      // Re-throw the error to be handled by the caller
      throw error;
    }
  }
}

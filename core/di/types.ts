/**
 * @file This file defines the service identifiers for the Dependency Injection (DI) container.
 * These symbols are used to bind and resolve services throughout the application, ensuring
 * a decoupled and modular architecture. Using symbols prevents naming conflicts and provides
 * a centralized registry of all injectable services.
 *
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @description A collection of unique symbols representing the identifiers for various services
 *              used within the application's dependency injection container. Each symbol is a key
 *              that maps to an interface or class in the DI container configuration.
 * @example
 * ```typescript
 * // In a service registration file (e.g., core/di/container.ts)
 * import { container } from './container';
 * import { TYPES } from './types';
 * import { EventBus } from '../event-bus/EventBus';
 * import { IEventBus } from '../event-bus/IEventBus';
 *
 * container.bind<IEventBus>(TYPES.EventBus).to(EventBus).inSingletonScope();
 *
 * // In a service that needs the EventBus
 * import { inject, injectable } from 'inversify';
 * import { IMyService } from './IMyService';
 *
 * @injectable()
 * class MyService implements IMyService {
 *   private readonly eventBus: IEventBus;
 *   public constructor(@inject(TYPES.EventBus) eventBus: IEventBus) {
 *     this.eventBus = eventBus;
 *   }
 *   // ...
 * }
 * ```
 */
const TYPES = {
  // Core Module: Foundational, cross-cutting concerns
  EventBus: Symbol.for('EventBus'),
  CommandHandler: Symbol.for('CommandHandler'),
  NotificationService: Symbol.for('NotificationService'),

  // Security Core Module: Handles encryption, vault, and session keys
  SecurityCore: Symbol.for('SecurityCore'),
  VaultService: Symbol.for('VaultService'),
  AuthService: Symbol.for('AuthService'),

  // Desktop Environment Module: Manages UI, windows, and state
  WindowingManager: Symbol.for('WindowingManager'),

  // Computation Module: Off-thread work and caching
  ComputationService: Symbol.for('ComputationService'),
  CachingService: Symbol.for('CachingService'),

  // AI Engine Module: Abstractions for AI providers
  AiProviderFactory: Symbol.for('AiProviderFactory'),
  GeminiProvider: Symbol.for('GeminiProvider'),
  OpenAiProvider: Symbol.for('OpenAiProvider'),

  // Workspace Connectors Module: Integrations with external services
  WorkspaceConnectorService: Symbol.for('WorkspaceConnectorService'),
  GithubService: Symbol.for('GithubService'),
  GoogleApiService: Symbol.for('GoogleApiService'),
};

export { TYPES };

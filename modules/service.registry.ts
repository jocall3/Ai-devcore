/**
 * @file service.registry.ts
 * @description This file initializes and configures the InversifyJS dependency injection (DI) container.
 * It defines service identifiers and binds them to their concrete implementations, managing the application's
 * service lifecycle and dependencies in a centralized location. This is the core of the application's
 * modular architecture.
 *
 * @requires reflect-metadata - Must be imported once at the application's entry point.
 * @requires inversify - The DI container library.
 */
import 'reflect-metadata';
import { Container } from 'inversify';

// Import interfaces and implementations for all services
// Note: These paths are based on the new modular architecture.
import { IEventBus } from './common/i-event-bus';
import { EventBus } from './common/event-bus';
import { IAIEngine } from './ai-engine/i-ai-engine.service';
import { AIEngine } from './ai-engine/ai-engine.service';
import { IWorkspaceConnectorService } from './workspace-connectors/i-workspace-connector.service';
import { WorkspaceConnectorService } from './workspace-connectors/workspace-connector.service';
import { IWindowingManager } from './desktop-environment/i-windowing-manager.service';
import { WindowingManager } from './desktop-environment/windowing-manager.service';
import { ISecurityCore } from './security-core/i-security-core.service';
import { SecurityCore } from './security-core/security-core.service';
import { IComputationService } from './computation/i-computation.service';
import { ComputationService } from './computation/computation.service';
import { ICachingService } from './caching/i-caching.service';
import { CachingService } from './caching/caching.service';
import { ICommandHandler } from './command-bus/i-command-handler.service';
import { CommandHandler } from './command-bus/command-handler.service';
import { IProviderFactory } from './ai-providers/i-provider.factory';
import { ProviderFactory } from './ai-providers/provider.factory';

/**
 * @constant SERVICE_IDENTIFIER
 * @description An object containing unique symbols (identifiers) for each service in the application.
 * These identifiers are used to bind and resolve dependencies within the InversifyJS container.
 * Using symbols prevents naming conflicts and provides a type-safe way to reference services.
 *
 * @example
 * // To inject the AIEngine service:
 * import { inject } from 'inversify';
 * import { IAIEngine } from '../modules/ai-engine/i-ai-engine.service';
 * import { SERVICE_IDENTIFIER } from '../modules/service.registry';
 *
 * class MyClass {
 *   private _aiEngine: IAIEngine;
 *
 *   public constructor(
 *     @inject(SERVICE_IDENTIFIER.AIEngine) aiEngine: IAIEngine
 *   ) {
 *     this._aiEngine = aiEngine;
 *   }
 * }
 */
export const SERVICE_IDENTIFIER = {
  /** @property {symbol} EventBus - Identifier for the central asynchronous event bus service. */
  EventBus: Symbol.for('EventBus'),
  /** @property {symbol} AIEngine - Identifier for the service managing AI-related operations. */
  AIEngine: Symbol.for('AIEngine'),
  /** @property {symbol} WorkspaceConnectorService - Identifier for the service managing integrations with external workspaces (Jira, Slack, etc.). */
  WorkspaceConnectorService: Symbol.for('WorkspaceConnectorService'),
  /** @property {symbol} WindowingManager - Identifier for the desktop environment's windowing manager service. */
  WindowingManager: Symbol.for('WindowingManager'),
  /** @property {symbol} SecurityCore - Identifier for the worker-isolated vault and cryptography service. */
  SecurityCore: Symbol.for('SecurityCore'),
  /** @property {symbol} ComputationService - Identifier for the service that manages off-thread computations in a worker pool. */
  ComputationService: Symbol.for('ComputationService'),
  /** @property {symbol} CachingService - Identifier for the service providing LRU caching with IndexedDB persistence. */
  CachingService: Symbol.for('CachingService'),
  /** @property {symbol} CommandHandler - Identifier for the central handler that processes command objects. */
  CommandHandler: Symbol.for('CommandHandler'),
  /** @property {symbol} ProviderFactory - Identifier for the factory that creates AI provider instances. */
  ProviderFactory: Symbol.for('ProviderFactory'),
};

/**
 * @constant container
 * @description The global InversifyJS DI container instance for the application.
 * All application services are bound here.
 *
 * @example
 * // To resolve a service from the container directly (e.g., in the main application entry point):
 * import { container, SERVICE_IDENTIFIER } from './modules/service.registry';
 * import { IEventBus } from './modules/common/i-event-bus';
 *
 * const eventBus = container.get<IEventBus>(SERVICE_IDENTIFIER.EventBus);
 * eventBus.publish('application:started', {});
 */
const container = new Container();

// --- Service Bindings ---
// Binds service interfaces to their concrete implementations with a specified scope.
// Most core services are singletons to ensure a single instance exists throughout the application lifecycle.

/**
 * Binds the IEventBus interface to the EventBus implementation as a singleton.
 * This ensures a single, shared event bus for the entire application.
 */
container.bind<IEventBus>(SERVICE_IDENTIFIER.EventBus).to(EventBus).inSingletonScope();

/**
 * Binds the IAIEngine interface to the AIEngine implementation as a singleton.
 */
container.bind<IAIEngine>(SERVICE_IDENTIFIER.AIEngine).to(AIEngine).inSingletonScope();

/**
 * Binds the IWorkspaceConnectorService interface to the WorkspaceConnectorService implementation as a singleton.
 */
container.bind<IWorkspaceConnectorService>(SERVICE_IDENTIFIER.WorkspaceConnectorService).to(WorkspaceConnectorService).inSingletonScope();

/**
 * Binds the IWindowingManager interface to the WindowingManager implementation as a singleton.
 */
container.bind<IWindowingManager>(SERVICE_IDENTIFIER.WindowingManager).to(WindowingManager).inSingletonScope();

/**
 * Binds the ISecurityCore interface to the SecurityCore implementation as a singleton.
 * This is crucial for managing the vault's state and session key centrally.
 */
container.bind<ISecurityCore>(SERVICE_IDENTIFIER.SecurityCore).to(SecurityCore).inSingletonScope();

/**
 * Binds the IComputationService interface to the ComputationService implementation as a singleton.
 */
container.bind<IComputationService>(SERVICE_IDENTIFIER.ComputationService).to(ComputationService).inSingletonScope();

/**
 * Binds the ICachingService interface to the CachingService implementation as a singleton.
 */
container.bind<ICachingService>(SERVICE_IDENTIFIER.CachingService).to(CachingService).inSingletonScope();

/**
 * Binds the ICommandHandler interface to the CommandHandler implementation as a singleton.
 */
container.bind<ICommandHandler>(SERVICE_IDENTIFIER.CommandHandler).to(CommandHandler).inSingletonScope();

/**
 * Binds the IProviderFactory interface to the ProviderFactory implementation as a singleton.
 */
container.bind<IProviderFactory>(SERVICE_IDENTIFIER.ProviderFactory).to(ProviderFactory).inSingletonScope();

export { container };

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

// Import service identifiers. These act as unique keys for services in the DI container.
import { TYPES } from '../core/di/types';

// Import interfaces and their concrete implementations for all major services.
// Note: This registry assumes that the corresponding interface (e.g., IEventBus)
// is exported from the same file as the service implementation.
import { IEventBus, EventBusService } from '../core/bus/event-bus.service';
import { ICommandBus, CommandBusService } from '../core/command-bus/command-bus.service';
import { IAIEngineService, AIEngineService } from './ai-engine/ai-engine.service';
import { IWorkspaceConnectorService, WorkspaceConnectorService } from './workspace-connectors/workspace-connectors.service';
import { WindowingManagerService } from './desktop-environment/windowing-manager.service';
import { SecurityCoreService } from './security-core/security-core.service';
import { IComputationService, ComputationService } from '../core/computation/computation.service';
import { CachingService } from '../core/caching/caching.service';
import { ProviderFactory } from './ai-engine/providers/provider.factory';
import { ICachingService } from '../core/caching/types';
import { IWindowingManager } from './desktop-environment/types';
import { ISecurityCore } from './security-core/types';
import { IProviderFactory } from './ai-engine/providers/iai-provider';

/**
 * @constant container
 * @description The global InversifyJS DI container instance for the application.
 * All application services are bound here to be resolved throughout the app.
 */
const container = new Container();

// --- Service Bindings ---
// Services are bound to their interfaces (when available) or concrete classes.
// Most core services are singletons to ensure a single instance exists throughout the application lifecycle.

container.bind<IEventBus>(TYPES.EventBus).to(EventBusService).inSingletonScope();

// Note: The identifier in TYPES is 'CommandHandler', but the service is a 'CommandBus'.
// Binding the ICommandBus interface to the CommandHandler symbol to reconcile this.
container.bind<ICommandBus>(TYPES.CommandHandler).to(CommandBusService).inSingletonScope();

container.bind<IAIEngineService>(TYPES.AIEngine).to(AIEngineService).inSingletonScope();
container.bind<IWorkspaceConnectorService>(TYPES.WorkspaceConnectorService).to(WorkspaceConnectorService).inSingletonScope();

// IWindowingManager is not exported from its service, so we bind the concrete class.
container.bind<WindowingManagerService>(TYPES.WindowingManager).to(WindowingManagerService).inSingletonScope();

// ISecurityCore is not exported from its service, so we bind the concrete class.
container.bind<SecurityCoreService>(TYPES.SecurityCore).to(SecurityCoreService).inSingletonScope();

container.bind<IComputationService>(TYPES.ComputationService).to(ComputationService).inSingletonScope();

// ICachingService is not exported from its service, so we bind the concrete class.
container.bind<CachingService>(TYPES.CachingService).to(CachingService).inSingletonScope();

// IProviderFactory is not exported from its service, so we bind the concrete class.
container.bind<ProviderFactory>(TYPES.AiProviderFactory).to(ProviderFactory).inSingletonScope();

export { container };

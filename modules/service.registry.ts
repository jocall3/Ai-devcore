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

// The AI Engine service binding was previously commented out. Assuming IAIEngineService and AIEngineService
// are now correctly exported from ai-engine.service.ts, and TYPES.AIEngine is defined.
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
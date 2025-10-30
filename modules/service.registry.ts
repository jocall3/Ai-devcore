import 'reflect-metadata';
import { Container } from 'inversify';

// Central registry for all injectable service identifiers.
export const SERVICE_IDENTIFIER = {
    // Core Services
    EventBus: Symbol.for('EventBus'),
    CommandBus: Symbol.for('CommandBus'),
    ComputationService: Symbol.for('ComputationService'),
    CachingService: Symbol.for('CachingService'),
    
    // AI Engine
    AIEngineService: Symbol.for('AIEngineService'),
    AiProviderFactory: Symbol.for('AiProviderFactory'),

    // Modules
    SecurityCore: Symbol.for('SecurityCore'),
    WindowingManager: Symbol.for('WindowingManager'),
    WorkspaceConnectorService: Symbol.for('WorkspaceConnectorService'),
};

// Import interfaces and their concrete implementations.
import { IEventBus, EventBusService } from '../core/bus/event-bus.service';
import { ICommandBus } from '../core/command-bus/types';
import { CommandBusService } from '../core/command-bus/command-bus.service';
import { IComputationService, ComputationService } from '../core/computation/computation.service';
import { CachingService } from '../core/caching/caching.service';
import { IAIEngine, AIEngine } from './ai-engine/ai-engine.service';
import { ProviderFactory } from './ai-engine/providers/provider.factory';
import { IWorkspaceConnectorService, WorkspaceConnectorService } from './workspace-connectors/workspace-connectors.service';
import { WindowingManagerService } from './desktop-environment/windowing-manager.service';
import { SecurityCoreService } from './security-core/security-core.service';

/**
 * @constant container
 * @description The global InversifyJS DI container instance for the application.
 * All application services are bound here to be resolved throughout the app.
 */
const container = new Container();

// --- Service Bindings ---

// Core
container.bind<IEventBus>(SERVICE_IDENTIFIER.EventBus).to(EventBusService).inSingletonScope();
container.bind<ICommandBus>(SERVICE_IDENTIFIER.CommandBus).to(CommandBusService).inSingletonScope();
container.bind<IComputationService>(SERVICE_IDENTIFIER.ComputationService).to(ComputationService).inSingletonScope();
container.bind<CachingService>(SERVICE_IDENTIFIER.CachingService).to(CachingService).inSingletonScope();

// AI Engine
container.bind<IAIEngine>(SERVICE_IDENTIFIER.AIEngineService).to(AIEngine).inSingletonScope();
container.bind<ProviderFactory>(SERVICE_IDENTIFIER.AiProviderFactory).to(ProviderFactory).inSingletonScope();

// Modules
container.bind<SecurityCoreService>(SERVICE_IDENTIFIER.SecurityCore).to(SecurityCoreService).inSingletonScope();
container.bind<WindowingManagerService>(SERVICE_IDENTIFIER.WindowingManager).to(WindowingManagerService).inSingletonScope();
container.bind<IWorkspaceConnectorService>(SERVICE_IDENTIFIER.WorkspaceConnectorService).to(WorkspaceConnectorService).inSingletonScope();

export { container };

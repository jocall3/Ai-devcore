import 'reflect-metadata';
import { Container } from 'inversify';
import { TYPES } from './types';

// Core services (interfaces and classes)
import { EventBusService } from '../bus/event-bus.service';
import type { IEventBus } from '../bus/event-bus.service';
import { CommandBusService } from '../command-bus/command-bus.service';
import type { ICommandBus } from '../command-bus/types';
import { ComputationService } from '../computation/computation.service';
import type { IComputationService } from '../computation/computation.service';
import { CachingService } from '../caching/caching.service';

// Module services (interfaces and classes)
import { AIEngine } from '../../modules/ai-engine/ai-engine.service';
import type { IAIEngine } from '../../modules/ai-engine/ai-engine.service';
import { ProviderFactory } from '../../modules/ai-engine/providers/provider.factory';
import { WindowingManagerService } from '../../modules/desktop-environment/windowing-manager.service';
import { SecurityCoreService } from '../../modules/security-core/security-core.service';
import { WorkspaceConnectorService } from '../../modules/workspace-connectors/workspace-connectors.service';
import type { IWorkspaceConnectorService } from '../../modules/workspace-connectors/workspace-connectors.service';

/**
 * A global singleton instance of the Inversify DIContainer.
 * This instance should be used throughout the application to register and resolve services.
 */
const container = new Container();

// --- Service Bindings ---

// Core Services
container.bind<IEventBus>(TYPES.EventBus).to(EventBusService).inSingletonScope();
// Note: TYPES.CommandHandler is used for the command bus.
container.bind<ICommandBus>(TYPES.CommandHandler).to(CommandBusService).inSingletonScope();
container.bind<IComputationService>(TYPES.ComputationService).to(ComputationService).inSingletonScope();
container.bind<CachingService>(TYPES.CachingService).to(CachingService).inSingletonScope();

// AI Engine
// NOTE: The identifier for AIEngine is missing from core/di/types.ts.
// Using a string literal 'IAIEngineService' as a stable identifier.
container.bind<IAIEngine>('IAIEngineService').to(AIEngine).inSingletonScope();
container.bind<ProviderFactory>(TYPES.AiProviderFactory).to(ProviderFactory).inSingletonScope();

// Other Module Services
container.bind<IWorkspaceConnectorService>(TYPES.WorkspaceConnectorService).to(WorkspaceConnectorService).inSingletonScope();
container.bind<WindowingManagerService>(TYPES.WindowingManager).to(WindowingManagerService).inSingletonScope();
container.bind<SecurityCoreService>(TYPES.SecurityCore).to(SecurityCoreService).inSingletonScope();

export { container };

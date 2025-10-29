/**
 * @file This file defines a simple custom Dependency Injection (DI) container.
 * @licence SPDX-License-Identifier: Apache-2.0
 */

/**
 * A simple type for a class constructor.
 * @template T The type of the class.
 */
export type Constructor<T = any> = new (...args: any[]) => T;

/**
 * A symbol or string used to identify a service in the container.
 * Using a class constructor as an identifier is a common pattern.
 * @template T The type of the service.
 */
export type ServiceIdentifier<T> = string | symbol | Constructor<T>;

/**
 * Options for registering a service.
 */
export interface RegistrationOptions {
  /**
   * The lifecycle scope of the service.
   * - `singleton`: A single instance of the service is created and shared throughout the application.
   * - `transient`: A new instance of the service is created every time it is requested.
   * @default 'transient'
   */
  scope: 'singleton' | 'transient';
}

/**
 * Represents a registered provider in the container.
 * @internal
 */
interface Provider<T> {
  implementation: Constructor<T>;
  scope: 'singleton' | 'transient';
}

/**
 * @class DIContainer
 * @description A simple, custom dependency injection (DI) container.
 * This class is responsible for managing the lifecycle of services and resolving dependencies.
 * It supports singleton and transient service lifecycles. This implementation does not
 * handle automatic constructor injection; services are expected to resolve their own
 * dependencies from the global container instance (Service Locator pattern).
 */
export class DIContainer {
  /**
   * A map to store registered service providers.
   * The key is the service identifier.
   * The value contains the implementation class and its lifecycle scope.
   * @private
   */
  private readonly providers = new Map<ServiceIdentifier<any>, Provider<any>>();

  /**
   * A map to store singleton instances that have already been created.
   * @private
   */
  private readonly singletons = new Map<ServiceIdentifier<any>, any>();

  /**
   * Registers a service with the container.
   * @template T The type of the service.
   * @param {ServiceIdentifier<T>} identifier The identifier for the service (e.g., a class constructor, string, or symbol).
   * @param {Constructor<T>} implementation The class constructor that implements the service.
   * @param {RegistrationOptions} [options={ scope: 'transient' }] The lifecycle options for the service.
   * @example
   * ```typescript
   * import { container, MyService } from './services';
   *
   * // Register MyService as a singleton
   * container.register(MyService, MyService, { scope: 'singleton' });
   *
   * // Register a service with a string identifier
   * container.register('ApiService', ApiServiceImpl, { scope: 'transient' });
   * ```
   */
  public register<T>(
    identifier: ServiceIdentifier<T>,
    implementation: Constructor<T>,
    options: RegistrationOptions = { scope: 'transient' }
  ): void {
    this.providers.set(identifier, { implementation, scope: options.scope });
  }

  /**
   * Resolves a registered service from the container.
   * If the service is a singleton, it returns the existing instance or creates one if it doesn't exist.
   * If transient, it always creates and returns a new instance.
   * @template T The type of the service to resolve.
   * @param {ServiceIdentifier<T>} identifier The identifier of the service to resolve.
   * @returns {T} An instance of the resolved service.
   * @throws {Error} If no provider is registered for the given identifier.
   * @example
   * ```typescript
   * import { container, MyService } from './services';
   *
   * const myServiceInstance = container.resolve(MyService);
   * myServiceInstance.doSomething();
   * ```
   */
  public resolve<T>(identifier: ServiceIdentifier<T>): T {
    const provider = this.providers.get(identifier);

    if (!provider) {
      const name = typeof identifier === 'function' ? identifier.name : identifier.toString();
      throw new Error(`DIContainer Error: No provider registered for identifier: ${name}`);
    }

    if (provider.scope === 'singleton') {
      if (!this.singletons.has(identifier)) {
        // This simple implementation does not handle dependency injection into the constructor.
        // Services are expected to resolve their dependencies manually.
        const instance = new provider.implementation();
        this.singletons.set(identifier, instance);
      }
      return this.singletons.get(identifier) as T;
    }

    // It's a transient scope
    return new provider.implementation() as T;
  }

  /**
   * Clears all registered providers and singleton instances from the container.
   * Primarily intended for use in testing environments to ensure a clean state between tests.
   * @example
   * ```typescript
   * afterEach(() => {
   *   container.reset();
   * });
   * ```
   */
  public reset(): void {
    this.providers.clear();
    this.singletons.clear();
  }
}

/**
 * A global singleton instance of the DIContainer.
 * This instance should be used throughout the application to register and resolve services.
 * @example
 * ```typescript
 * // In your main application entry point (e.g., index.ts)
 * import { container } from './core/di/container';
 * import { ApiService, MyService } from './services';
 *
 * container.register('ApiService', ApiService, { scope: 'singleton' });
 * container.register(MyService, MyService);
 *
 * // In a service file
 * import { container } from './core/di/container';
 *
 * export class MyService {
 *   private apiService;
 *   constructor() {
 *     // Manually resolve dependency using the global container (Service Locator pattern)
 *     this.apiService = container.resolve('ApiService');
 *   }
 * }
 * ```
 */
export const container = new DIContainer();

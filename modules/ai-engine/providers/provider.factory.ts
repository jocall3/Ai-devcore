/**
 * @file Implements the factory for creating AI provider instances, decoupling the application from concrete provider implementations.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { IAiProvider } from './iai-provider.ts';
import { GeminiProvider } from './gemini.provider.ts';
import { OpenAiProvider } from './openai.provider.ts';
import { AiProviderType } from '../../../services/aiProviderState.ts';
// FIX: The ISecurityCore interface/file does not exist in the provided context.
// Importing the concrete SecurityCoreService class instead to align with provider constructors.
import { SecurityCoreService } from '../../security-core/security-core.service.ts';

/**
 * @class ProviderFactory
 * @description Responsible for creating instances of AI providers based on configuration.
 * This class implements the Factory and Strategy patterns to decouple the AI service
 * from concrete provider implementations. This class is designed to be managed by a
 * Dependency Injection container.
 */
export class ProviderFactory {
  /**
   * @private
   * @type {SecurityCoreService}
   * @description The service for retrieving decrypted credentials from the vault.
   */
  private readonly securityCore: SecurityCoreService;

  /**
   * @constructor
   * @description Creates an instance of ProviderFactory.
   * @param {SecurityCoreService} securityCore - The injected security core service, which provides secure access to API keys.
   */
  public constructor(securityCore: SecurityCoreService) {
    this.securityCore = securityCore;
  }

  /**
   * @method create
   * @description Creates and returns an instance of an AI provider.
   * The provider itself will handle retrieving credentials via the injected security core service.
   * @param {AiProviderType} providerType - The type of provider to create (e.g., 'gemini').
   * @returns {IAiProvider} An instance of the requested AI provider.
   * @throws {Error} If the provider type is unsupported.
   * @example
   * ```typescript
   * // Assuming securityCore is an instance of SecurityCoreService provided by a DI container.
   * const factory = new ProviderFactory(securityCore);
   * const geminiProvider = factory.create('gemini');
   * const response = await geminiProvider.generateContent('Hello, world!');
   * ```
   */
  public create(providerType: AiProviderType): IAiProvider {
    switch (providerType) {
      case 'gemini': {
        // The GeminiProvider's constructor expects the SecurityCoreService.
        // It will use this service internally to get the API key when needed.
        return new GeminiProvider(this.securityCore);
      }
      case 'openai': {
        // The OpenAiProvider's constructor also expects the SecurityCoreService.
        // Note: The OpenAI provider's constructor might expect an ISecurityCore interface.
        // We are passing the concrete class, which should be compatible.
        return new OpenAiProvider(this.securityCore);
      }
      default:
        // This ensures that if new provider types are added, this will be a compile-time error.
        const exhaustiveCheck: never = providerType;
        throw new Error(`Unsupported AI provider type: ${exhaustiveCheck}`);
    }
  }
}

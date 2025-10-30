/**
 * @file Implements the factory for creating AI provider instances, decoupling the application from concrete provider implementations.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { IAiProvider } from './iai-provider.ts';
import { GeminiProvider } from './gemini.provider.ts';
import { OpenAiProvider } from './openai.provider.ts';
import { AiProviderType } from '../../../services/aiProviderState.ts';
import { ISecurityCore } from '../../security-core/i-security-core.service.ts'; // Changed to import the interface

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
   * @type {ISecurityCore}
   * @description The service for retrieving decrypted credentials from the vault.
   */
  private readonly credentialService: ISecurityCore; // Changed type to ISecurityCore

  /**
   * @constructor
   * @description Creates an instance of ProviderFactory.
   * @param {ISecurityCore} credentialService - The injected credential service, which provides secure access to API keys.
   */
  public constructor(credentialService: ISecurityCore) { // Changed parameter type to ISecurityCore
    this.credentialService = credentialService;
  }

  /**
   * @method create
   * @description Creates and returns an instance of an AI provider.
   * It retrieves the necessary API key from the secure vault before instantiation.
   * @param {AiProviderType} providerType - The type of provider to create (e.g., 'gemini').
   * @returns {Promise<IAiProvider>} A promise that resolves with an instance of the requested AI provider.
   * @throws {Error} If the vault is locked, the required API key is not found, or the provider type is unsupported.
   * @example
   * ```typescript
   * // Assuming credentialService is an instance of a class that implements ISecurityCore
   * // and has been provided by a DI container.
   * const factory = new ProviderFactory(credentialService);
   * const geminiProvider = await factory.create('gemini');
   * const response = await geminiProvider.generateContent('Hello, world!');
   * ```
   */
  public async create(providerType: AiProviderType): Promise<IAiProvider> {
    switch (providerType) {
      case 'gemini': {
        const apiKey = await this.credentialService.getDecryptedCredential('gemini_api_key');
        if (!apiKey) {
          throw new Error('Gemini API key not found in vault. Please add it in the Workspace Connector Hub.');
        }
        return new (GeminiProvider as any)(apiKey);
      }
      case 'openai': {
        const apiKey = await this.credentialService.getDecryptedCredential('openai_api_key');
        if (!apiKey) {
          throw new Error('OpenAI API key not found in vault. Please add it in the Workspace Connector Hub.');
        }
        // This provider is a placeholder for future implementation.
        return new (OpenAiProvider as any)(apiKey);
      }
      default:
        // This ensures that if new provider types are added, this will be a compile-time error.
        const exhaustiveCheck: never = providerType;
        throw new Error(`Unsupported AI provider type: ${exhaustiveCheck}`);
    }
  }
}
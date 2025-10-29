/**
 * @file This file implements the AI Service module, following the Command and Strategy design patterns.
 * It provides a decoupled architecture for handling AI operations through a central command handler.
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import type { GenerateContentResponse, FunctionDeclaration } from "@google/genai";
import { logError } from './telemetryService.ts';
import { getDecryptedCredential } from './vaultService.ts';
import type { GeneratedFile, StructuredPrSummary, StructuredExplanation, SemanticColorTheme, SecurityVulnerability, CodeSmell, CustomFeature, CronParts } from '../types.ts';

//==============================================================================
// 1. PROVIDER ABSTRACTION (STRATEGY PATTERN)
//==============================================================================

/**
 * @interface IAiProvider
 * @description Defines the contract for an AI provider, abstracting specific implementations (e.g., Gemini).
 * This allows for easy swapping of backend AI models without changing the core application logic.
 * @example
 * class MockAiProvider implements IAiProvider {
 *   async *streamContent(prompt, systemInstruction) {
 *     yield "Mock response chunk";
 *   }
 *   // ... implement other methods
 * }
 */
export interface IAiProvider {
  streamContent(prompt: string | { parts: any[] }, systemInstruction: string, temperature: number): AsyncGenerator<string, void, unknown>;
  generateContent(prompt: string, systemInstruction: string, temperature: number): Promise<string>;
  generateJson<T>(prompt: any, systemInstruction: string, schema: any, temperature: number): Promise<T>;
  generateImage(prompt: string): Promise<string>;
}

/**
 * @class GeminiProvider
 * @description Implements the IAiProvider interface using the Google Gemini API.
 * It handles the logic for initializing the Gemini client and making API calls.
 * @implements {IAiProvider}
 */
class GeminiProvider implements IAiProvider {
  private ai: GoogleGenAI | null = null;
  private lastUsedApiKey: string | null = null;

  /**
   * Retrieves the Gemini API key from the vault and initializes the GoogleGenAI client.
   * Caches the client to avoid re-initialization on every call.
   * @private
   * @returns {Promise<GoogleGenAI>} A promise that resolves to the initialized AI client.
   * @throws {Error} If the vault is locked or the API key is not found.
   */
  private async getAiClient(): Promise<GoogleGenAI> {
    const apiKey = await getDecryptedCredential('gemini_api_key');
    if (!apiKey) {
      throw new Error("Google Gemini API key not found. Please add it in the Workspace Connector Hub.");
    }

    if (!this.ai || apiKey !== this.lastUsedApiKey) {
      this.lastUsedApiKey = apiKey;
      this.ai = new GoogleGenAI({ apiKey });
    }
    
    return this.ai;
  }

  /**
   * @inheritdoc
   */
  async *streamContent(prompt: string | { parts: any[] }, systemInstruction: string, temperature: number): AsyncGenerator<string, void, unknown> {
    const aiClient = await this.getAiClient();
    try {
      const response = await aiClient.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: prompt as any,
        config: { systemInstruction, temperature }
      });

      for await (const chunk of response) {
        yield chunk.text;
      }
    } catch (error) {
      logError(error as Error, { prompt, systemInstruction, provider: 'Gemini' });
      throw error;
    }
  }

  /**
   * @inheritdoc
   */
  async generateContent(prompt: string, systemInstruction: string, temperature: number): Promise<string> {
    const aiClient = await this.getAiClient();
    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { systemInstruction, temperature }
      });
      return response.text;
    } catch (error) {
      logError(error as Error, { prompt, systemInstruction, provider: 'Gemini' });
      throw error;
    }
  }

  /**
   * @inheritdoc
   */
  async generateJson<T>(prompt: any, systemInstruction: string, schema: any, temperature: number): Promise<T> {
    const aiClient = await this.getAiClient();
    try {
      const response = await aiClient.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: schema,
          temperature,
        }
      });
      return JSON.parse(response.text.trim());
    } catch (error) {
      logError(error as Error, { prompt, systemInstruction, provider: 'Gemini' });
      throw error;
    }
  }

  /**
   * @inheritdoc
   */
  async generateImage(prompt: string): Promise<string> {
    const aiClient = await this.getAiClient();
    const response = await aiClient.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: { numberOfImages: 1, outputMimeType: 'image/png' },
    });
    const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
    return `data:image/png;base64,${base64ImageBytes}`;
  }
  
  /**
   * Handles function calling for complex commands.
   * @param {string} prompt - The user's prompt.
   * @param {FunctionDeclaration[]} functionDeclarations - The functions the model can call.
   * @param {string} knowledgeBase - Contextual information for the model.
   * @returns {Promise<any>} The result of the function call or a text response.
   */
  async getInferenceFunction(prompt: string, functionDeclarations: FunctionDeclaration[], knowledgeBase: string): Promise<any> {
      const aiClient = await this.getAiClient();
      try {
          const response: GenerateContentResponse = await aiClient.models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { systemInstruction: `You are a helpful assistant for a developer tool. You must decide which function to call to satisfy the user's request, based on your knowledge base. If no specific tool seems appropriate, respond with text.\n\nKnowledge Base:\n${knowledgeBase}`, tools: [{ functionDeclarations }] } });
          const functionCalls: { name: string, args: any; }[] = [];
          const parts = response.candidates?.[0]?.content?.parts ?? [];
          for (const part of parts) { if (part.functionCall) { functionCalls.push({ name: part.functionCall.name, args: part.functionCall.args }); } }
          return { text: response.text, functionCalls: functionCalls.length > 0 ? functionCalls : undefined };
      } catch (error) {
          logError(error as Error, { prompt });
          throw error;
      }
  }
}

//==============================================================================
// 2. PROVIDER FACTORY
//==============================================================================

/**
 * @class ProviderFactory
 * @description Creates and provides the currently configured AI provider.
 * Follows the Singleton pattern to ensure only one provider instance is used.
 */
class ProviderFactory {
  private static providerInstance: IAiProvider;

  /**
   * Gets the singleton instance of the AI provider.
   * @public
   * @static
   * @returns {IAiProvider} The configured AI provider.
   * @example
   * const provider = ProviderFactory.getProvider();
   */
  public static getProvider(): IAiProvider {
    if (!this.providerInstance) {
      // In a future implementation, this could read from a config to decide which provider to instantiate.
      this.providerInstance = new GeminiProvider();
    }
    return this.providerInstance;
  }
}

//==============================================================================
// 3. COMMAND ABSTRACTION (COMMAND PATTERN)
//==============================================================================

/**
 * @interface ICommand
 * @template T - The expected result type of the command's execution.
 * @description Base interface for all AI commands. Each command encapsulates a request to the AI.
 */
export interface ICommand<T> {
  execute(provider: IAiProvider): Promise<T> | AsyncGenerator<T, void, unknown>;
}

//==============================================================================
// 4. COMMAND HANDLER (AI SERVICE)
//==============================================================================

/**
 * @class AiService
 * @description The central command handler for all AI operations.
 * It receives command objects and delegates their execution to the current AI provider.
 */
class AiService {
  /**
   * Executes a given command using the configured AI provider.
   * @public
   * @template T
   * @param {ICommand<T>} command - The command object to execute.
   * @returns {Promise<T> | AsyncGenerator<T, void, unknown>} The result of the command execution.
   * @example
   * const command = new StreamContentCommand("Explain quantum physics", "You are a physics professor.");
   * for await (const chunk of aiService.execute(command)) {
   *   console.log(chunk);
   * }
   */
  public execute<T>(command: ICommand<T>): Promise<T> | AsyncGenerator<T, void, unknown> {
    try {
      const provider = ProviderFactory.getProvider();
      return command.execute(provider);
    } catch(error) {
      logError(error as Error, { command: command.constructor.name });
      // Re-throw to be handled by the caller
      throw error;
    }
  }
}

//==============================================================================
// 5. SINGLETON EXPORT
//==============================================================================

/**
 * The singleton instance of the AiService.
 * @type {AiService}
 */
export const aiService = new AiService();

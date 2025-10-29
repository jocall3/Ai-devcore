/**
 * @file Implements the AI provider interface for Google's Gemini models.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenerativeAI, GenerativeModel, GenerateContentRequest, Part, Tool, FunctionDeclarationsTool } from "@google/generative-ai";
import { inject, injectable } from "inversify";
import "reflect-metadata";
import { SecurityCoreServiceConnector } from "../../security-core/connectors/security-core.service-connector";
import { SERVICE_IDENTIFIER } from "../../../inversify.identifiers";
import { logError } from "../../../services/telemetryService";

// --- Interfaces and Types --- 

/**
 * @interface IAiProvider
 * @description Defines the contract for all AI provider implementations. This ensures that different AI services (like Gemini, OpenAI, etc.) can be used interchangeably.
 */
export interface IAiProvider {
  /**
   * Streams a response from the AI model.
   * @param {GenerateContentRequest} request - The content generation request.
   * @returns {AsyncGenerator<string>} An async generator that yields chunks of the response text.
   */
  streamContent(request: GenerateContentRequest): AsyncGenerator<string>;

  /**
   * Generates a single, complete response from the AI model.
   * @param {GenerateContentRequest} request - The content generation request.
   * @returns {Promise<string>} A promise that resolves to the full response text.
   */
  generateContent(request: GenerateContentRequest): Promise<string>;

  /**
   * Generates a JSON object from the AI model based on a provided schema.
   * @template T
   * @param {GenerateContentRequest} request - The content generation request.
   * @param {object} schema - The JSON schema for the expected output.
   * @returns {Promise<T>} A promise that resolves to the parsed JSON object.
   */
  generateJson<T>(request: GenerateContentRequest, schema: object): Promise<T>;

  /**
   * Generates a response that may include function calls for the client to execute.
   * @param {GenerateContentRequest} request - The content generation request.
   * @param {FunctionDeclarationsTool[]} tools - The tools (function declarations) available to the model.
   * @returns {Promise<{ text: string | null; functionCalls: { name: string; args: any; }[] | null; }>} An object containing text and/or function calls.
   */
  generateContentWithFunctionCalling(request: GenerateContentRequest, tools: FunctionDeclarationsTool[]): Promise<{ text: string | null; functionCalls: { name: string; args: any; }[] | null; }>;

  /**
   * Generates an image from a text prompt.
   * @param {string} prompt - The text prompt describing the image.
   * @returns {Promise<string>} A promise that resolves to a base64-encoded data URL of the generated image.
   */
  generateImage(prompt: string): Promise<string>;
}

/**
 * @class GeminiProvider
 * @implements {IAiProvider}
 * @description Concrete implementation of the IAiProvider interface for Google's Gemini models. This class encapsulates all communication with the Gemini API and handles secure retrieval of the API key.
 * @example
 * ```typescript
 * // InversifyJS will handle instantiation
 * const geminiProvider: IAiProvider = container.get(SERVICE_IDENTIFIER.IAiProvider);
 * const response = await geminiProvider.generateContent({ contents: [{ role: 'user', parts: [{ text: 'Hello, world!' }] }] });
 * console.log(response);
 * ```
 */
@injectable()
export class GeminiProvider implements IAiProvider {
    private ai: GoogleGenerativeAI | null = null;
    private lastUsedApiKey: string | null = null;
    private readonly securityCore: SecurityCoreServiceConnector;

    /**
     * @constructor
     * @param {SecurityCoreServiceConnector} securityCore - A connector to the Security Core for securely retrieving API keys. This is injected via a DI container.
     */
    public constructor(
        @inject(SERVICE_IDENTIFIER.SecurityCoreServiceConnector) securityCore: SecurityCoreServiceConnector
    ) {
        this.securityCore = securityCore;
    }

    /**
     * @private
     * @method getAiClient
     * @description Retrieves and initializes the GoogleGenerativeAI client. It uses a cached instance unless the API key has been updated in the vault.
     * @returns {Promise<GoogleGenerativeAI>} A promise that resolves to an initialized GoogleGenerativeAI instance.
     * @throws {Error} If the Gemini API key is not found in the vault.
     */
    private async getAiClient(): Promise<GoogleGenerativeAI> {
        const apiKey = await this.securityCore.getDecryptedCredential('gemini_api_key');
        if (!apiKey) {
            throw new Error("Google Gemini API key not found. Please add it in the Workspace Connector Hub.");
        }

        if (!this.ai || apiKey !== this.lastUsedApiKey) {
            this.lastUsedApiKey = apiKey;
            this.ai = new GoogleGenerativeAI(apiKey);
        }
        
        return this.ai;
    }

    /**
     * @inheritdoc
     * @example
     * ```typescript
     * const request = { contents: [{ role: 'user', parts: [{ text: 'Explain quantum computing simply.' }] }] };
     * for await (const chunk of geminiProvider.streamContent(request)) {
     *   console.log(chunk);
     * }
     * ```
     */
    public async *streamContent(request: GenerateContentRequest): AsyncGenerator<string> {
        try {
            const aiClient = await this.getAiClient();
            const model = aiClient.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result: GenerateContentStreamResult = await model.generateContentStream(request);
            
            for await (const chunk of result.stream) {
                yield chunk.text();
            }
        } catch (error) {
            logError(error as Error, { provider: 'Gemini', method: 'streamContent' });
            throw error; // Re-throw for the caller to handle
        }
    }

    /**
     * @inheritdoc
     * @example
     * ```typescript
     * const request = { contents: [{ role: 'user', parts: [{ text: 'What is the capital of France?' }] }] };
     * const response = await geminiProvider.generateContent(request);
     * // response: 'Paris'
     * ```
     */
    public async generateContent(request: GenerateContentRequest): Promise<string> {
        try {
            const aiClient = await this.getAiClient();
            const model = aiClient.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent(request);
            return result.response.text();
        } catch (error) {
            logError(error as Error, { provider: 'Gemini', method: 'generateContent' });
            throw error;
        }
    }

    /**
     * @inheritdoc
     * @example
     * ```typescript
     * const request = { contents: [{ role: 'user', parts: [{ text: 'Create a user profile for John Doe.' }] }] };
     * const schema = { type: 'object', properties: { name: { type: 'string' }, email: { type: 'string' } } };
     * const user = await geminiProvider.generateJson<{ name: string; email: string; }>(request, schema);
     * ```
     */
    public async generateJson<T>(request: GenerateContentRequest, schema: object): Promise<T> {
        try {
            const aiClient = await this.getAiClient();
            const model = aiClient.getGenerativeModel({ 
                model: "gemini-1.5-flash",
                generationConfig: { responseMimeType: "application/json" },
            });
            // The schema is attached to the tool, not the model config directly
            const tools: Tool[] = [{
              functionDeclarations: [{
                name: 'json_output',
                description: 'Outputs the structured data.',
                parameters: schema,
              }]
            }];

            const result = await model.generateContent({ ...request, tools });
            const call = result.response.functionCalls()?.[0];
            if (call) {
                return call.args as T;
            }
            throw new Error('AI did not return a valid JSON object in a function call.');
        } catch (error) {
            logError(error as Error, { provider: 'Gemini', method: 'generateJson' });
            throw error;
        }
    }
    
    /**
     * @inheritdoc
     * @example
     * ```typescript
     * const tools = [{ functionDeclarations: [...] }];
     * const request = { contents: [{ role: 'user', parts: [{ text: 'Find flights from SFO to LAX.' }] }] };
     * const result = await geminiProvider.generateContentWithFunctionCalling(request, tools);
     * ```
     */
    public async generateContentWithFunctionCalling(request: GenerateContentRequest, tools: FunctionDeclarationsTool[]): Promise<{ text: string | null; functionCalls: { name: string; args: any; }[] | null; }> {
        try {
            const aiClient = await this.getAiClient();
            const model = aiClient.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent({ ...request, tools });

            const response = result.response;
            const text = response.text() || null;
            const functionCalls = response.functionCalls()?.map(call => ({ name: call.name, args: call.args })) || null;

            return { text, functionCalls };
        } catch (error) {
            logError(error as Error, { provider: 'Gemini', method: 'generateContentWithFunctionCalling' });
            throw error;
        }
    }
    
    /**
     * @inheritdoc
     * @example
     * ```typescript
     * const prompt = "A photorealistic image of a futuristic city at sunset";
     * const imageUrl = await geminiProvider.generateImage(prompt);
     * ```
     */
    public async generateImage(prompt: string): Promise<string> {
      console.warn("Image generation with Gemini is not yet implemented via the standard provider interface.");
      // This would require a different model and API endpoint call structure.
      // For now, returning a placeholder.
      return Promise.resolve(`data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><text y="50" x="50">Not Impl</text></svg>')}`);
    }
}

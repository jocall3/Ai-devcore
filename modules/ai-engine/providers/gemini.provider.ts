
/**
 * @file Implements the AI provider interface for Google's Gemini models.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenerativeAI, GenerateContentRequest, Tool, FunctionDeclaration, GenerateContentStreamResult, FunctionCall, Part } from "@google/genai";
import { inject, injectable } from "inversify";
import "reflect-metadata";
import { SecurityCoreService } from '../../security-core/security-core.service';
import { TYPES } from '../../../core/di/types';
import { logError } from "../../../services/telemetryService";
import { IAiProvider, Prompt, CommandResponse } from './iai-provider';

/**
 * @class GeminiProvider
 * @implements {IAiProvider}
 * @description Concrete implementation of the IAiProvider interface for Google's Gemini models. This class encapsulates all communication with the Gemini API and handles secure retrieval of the API key.
 * @example
 * ```typescript
 * // InversifyJS will handle instantiation
 * const geminiProvider: IAiProvider = container.get(TYPES.GeminiProvider);
 * const response = await geminiProvider.generateContent('Hello, world!');
 * console.log(response);
 * ```
 */
@injectable()
export class GeminiProvider implements IAiProvider {
    private ai: GoogleGenerativeAI | null = null;
    private lastUsedApiKey: string | null = null;
    private readonly securityCore: SecurityCoreService;

    /**
     * @constructor
     * @param {SecurityCoreService} securityCore - A connector to the Security Core for securely retrieving API keys. This is injected via a DI container.
     */
    public constructor(
        @inject(TYPES.SecurityCore) securityCore: SecurityCoreService
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
     */
    public async *streamContent(prompt: Prompt, systemInstruction?: string, temperature: number = 0.7): AsyncGenerator<string> {
        try {
            const aiClient = await this.getAiClient();
            const model = aiClient.getGenerativeModel({ 
                model: "gemini-1.5-flash",
                systemInstruction,
            });

            const result: GenerateContentStreamResult = await model.generateContentStream({
                contents: [{ role: 'user', parts: Array.isArray(prompt) ? prompt : [{ text: prompt as string }] }],
                generationConfig: { temperature }
            });
            
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
     */
    public async generateContent(prompt: Prompt, systemInstruction?: string, temperature: number = 0.7): Promise<string> {
        try {
            const aiClient = await this.getAiClient();
            const model = aiClient.getGenerativeModel({ 
                model: "gemini-1.5-flash",
                systemInstruction,
            });

            const result = await model.generateContent({
                contents: [{ role: 'user', parts: Array.isArray(prompt) ? prompt : [{ text: prompt as string }] }],
                generationConfig: { temperature }
            });
            return result.response.text();
        } catch (error) {
            logError(error as Error, { provider: 'Gemini', method: 'generateContent' });
            throw error;
        }
    }

    /**
     * @inheritdoc
     */
    public async generateJson<T>(prompt: Prompt, schema: object, systemInstruction?: string, temperature: number = 0.2): Promise<T> {
        try {
            const aiClient = await this.getAiClient();
            const model = aiClient.getGenerativeModel({ 
                model: "gemini-1.5-flash",
                systemInstruction,
                generationConfig: { responseMimeType: "application/json", temperature },
            });

            const tools: Tool[] = [{
              functionDeclarations: [{
                name: 'json_output',
                description: 'Outputs the structured data.',
                parameters: schema,
              }]
            }];

            const result = await model.generateContent({ 
                contents: [{ role: 'user', parts: Array.isArray(prompt) ? prompt : [{ text: prompt as string }] }],
                tools 
            });
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
     */
    public async getInferenceFunction(prompt: string, functionDeclarations: object[], knowledgeBase?: string): Promise<CommandResponse> {
        try {
            const aiClient = await this.getAiClient();
            const model = aiClient.getGenerativeModel({ 
                model: "gemini-1.5-flash",
                systemInstruction: `You are a helpful assistant. Use the provided tools to answer the user's request. Knowledge Base: ${knowledgeBase || 'N/A'}`,
            });
            
            const tools: Tool[] = [{ functionDeclarations: functionDeclarations as FunctionDeclaration[] }];

            const result = await model.generateContent({ 
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                tools 
            });

            const response = result.response;
            const text = response.text() || '';
            const functionCalls = response.functionCalls()?.map((call: FunctionCall) => ({ name: call.name, args: call.args }));

            return { text, functionCalls };
        } catch (error) {
            logError(error as Error, { provider: 'Gemini', method: 'getInferenceFunction' });
            throw error;
        }
    }
    
    /**
     * @inheritdoc
     */
    public async generateImage(prompt: string): Promise<string> {
      console.warn("Image generation with Gemini is not yet implemented via the standard provider interface.");
      // This would require a different model and API endpoint call structure.
      // For now, returning a placeholder.
      return Promise.resolve(`data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><text y="50" x="50">Not Impl</text></svg>')}`);
    }

    /**
     * @inheritdoc
     */
    public async generateImageFromImageAndText(prompt: string, base64Image: string, mimeType: string): Promise<string> {
        console.warn("Image-from-image generation with Gemini is not yet implemented.");
        // This would require a different model (e.g., gemini-pro-vision for input, Imagen for output) and is complex.
        // For now, returning a placeholder.
        return Promise.resolve(`data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><text y="50" x="5">Not Impl</text></svg>')}`);
    }
}

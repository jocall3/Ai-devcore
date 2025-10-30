/**
 * @file This file is intended to contain the implementation for a Gemini AI provider.
 * As part of a refactor to abstract AI services, this file would define a class
 * that conforms to a generic IAiProvider interface, encapsulating all direct
 * interactions with the Google Gemini API.
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";
import type { GenerateContentResponse, FunctionDeclaration } from "@google/genai";
import { logError } from './telemetryService.ts';

/**
 * @interface CommandResponse
 * @description Represents the structured response from a function-calling AI model.
 * It includes the model's text response and any function calls it decided to make.
 * @property {string} text - The textual response from the model.
 * @property {object[] | undefined} functionCalls - An optional array of function calls requested by the model.
 * @property {string} functionCalls[].name - The name of the function to call.
 * @property {any} functionCalls[].args - The arguments for the function, as an object.
 */
export interface CommandResponse {
  text: string;
  functionCalls?: { name: string; args: any; }[];
}

/**
 * @interface IAiProvider
 * @description Defines the contract for an AI provider. This allows for a standard
 * way to interact with different AI models (e.g., Gemini, OpenAI) by abstracting
 * the specific implementation details of each service.
 */
export interface IAiProvider {
  /**
   * Generates content as a stream from the AI model.
   * @param {string | { parts: any[] }} prompt - The prompt to send to the model. Can be a simple string or a complex object with parts.
   * @param {string} systemInstruction - System-level instructions to guide the model's behavior.
   * @param {number} [temperature=0.5] - The sampling temperature for the model's response.
   * @returns {AsyncGenerator<string, void, unknown>} An async generator that yields chunks of the response text.
   * @example
   * const provider = new GeminiProvider(apiKey);
   * const stream = provider.streamContent("Write a short story.", "You are a creative writer.", 0.8);
   * for await (const chunk of stream) {
   *   console.log(chunk);
   * }
   */
  streamContent(prompt: string | { parts: any[] }, systemInstruction: string, temperature?: number): AsyncGenerator<string, void, unknown>;

  /**
   * Generates a complete content response from the AI model.
   * @param {string} prompt - The prompt to send to the model.
   * @param {string} systemInstruction - System-level instructions to guide the model's behavior.
   * @param {number} [temperature=0.5] - The sampling temperature for the model's response.
   * @returns {Promise<string>} A promise that resolves to the full text response from the model.
   * @example
   * const provider = new GeminiProvider(apiKey);
   * const response = await provider.generateContent("What is the capital of France?", "You are a helpful assistant.", 0.2);
   * console.log(response); // "Paris"
   */
  generateContent(prompt: string, systemInstruction: string, temperature?: number): Promise<string>;
  
  /**
   * Generates a JSON object from the AI model based on a provided schema.
   * @template T
   * @param {any} prompt - The prompt to send to the model.
   * @param {string} systemInstruction - System-level instructions to guide the model's behavior.
   * @param {any} schema - The JSON schema the response must conform to.
   * @param {number} [temperature=0.2] - The sampling temperature for the model's response.
   * @returns {Promise<T>} A promise that resolves to the parsed JSON object of type T.
   * @example
   * const schema = { type: Type.OBJECT, properties: { city: { type: Type.STRING } } };
   * const result = await provider.generateJson<{ city: string }>("Where is the Eiffel Tower?", "You respond in JSON.", schema, 0.1);
   * console.log(result.city); // "Paris"
   */
  generateJson<T>(prompt: any, systemInstruction: string, schema: any, temperature?: number): Promise<T>;

  /**
   * Interacts with the AI model to determine if a function should be called.
   * @param {string} prompt - The user's prompt.
   * @param {FunctionDeclaration[]} functionDeclarations - An array of function declarations available to the model.
   * @param {string} knowledgeBase - Additional context or knowledge for the model.
   * @returns {Promise<CommandResponse>} A promise that resolves to a CommandResponse object.
   * @example
   * const tools = [{ functionDeclarations: [{ name: 'getWeather', description: 'Gets weather for a city', parameters: { ... } }] }];
   * const response = await provider.getInferenceFunction("What's the weather in London?", tools, "");
   * if (response.functionCalls) { console.log(response.functionCalls[0].name); }
   */
  getInferenceFunction(prompt: string, functionDeclarations: FunctionDeclaration[], knowledgeBase: string): Promise<CommandResponse>;

  /**
   * Generates a single image from a text prompt.
   * @param {string} prompt - The text prompt describing the image.
   * @returns {Promise<string>} A promise that resolves to a base64-encoded data URL of the generated image.
   * @example
   * const imageUrl = await provider.generateImage("A photorealistic cat wearing a wizard hat.");
   * // Use imageUrl in an <img> src attribute
   */
  generateImage(prompt: string): Promise<string>;

  /**
   * Generates an image based on a text prompt and a source image.
   * @param {string} prompt - The text prompt describing the desired changes or style.
   * @param {string} base64Image - The base64-encoded source image.
   * @param {string} mimeType - The MIME type of the source image.
   * @returns {Promise<string>} A promise that resolves to a base64-encoded data URL of the generated image.
   * @example
   * const newImageUrl = await provider.generateImageFromImageAndText("Make it look like a Van Gogh painting.", base64ImageData, "image/png");
   */
  generateImageFromImageAndText(prompt: string, base64Image: string, mimeType: string): Promise<string>;
}

/**
 * @class GeminiProvider
 * @description An implementation of the IAiProvider interface that uses the Google Gemini API.
 * This class encapsulates all logic for communicating with the Gemini models.
 * @implements {IAiProvider}
 */
export class GeminiProvider implements IAiProvider {
  /**
   * @private
   * @type {GoogleGenAI}
   * @description The instance of the GoogleGenAI client.
   */
  private ai: GoogleGenAI;

  /**
   * Creates an instance of GeminiProvider.
   * @param {string} apiKey - The Google Gemini API key.
   * @throws {Error} If the API key is not provided.
   * @example
   * const apiKey = await getDecryptedCredential('gemini_api_key');
   * const geminiProvider = new GeminiProvider(apiKey);
   */
  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("Google Gemini API key is required to initialize GeminiProvider.");
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  /**
   * @inheritdoc
   */
  async *streamContent(prompt: string | { parts: any[] }, systemInstruction: string, temperature = 0.5): AsyncGenerator<string, void, unknown> {
    try {
        const response = await this.ai.models.generateContentStream({
            model: 'gemini-1.5-flash',
            contents: prompt as any,
            config: { systemInstruction, temperature }
        });

        for await (const chunk of response) {
            yield chunk.text();
        }
    } catch (error) {
        console.error("Error streaming from Gemini model:", error);
        logError(error as Error, { prompt, systemInstruction });
        if (error instanceof Error) {
            yield `An error occurred while communicating with the Gemini model: ${error.message}`;
        } else {
            yield "An unknown error occurred while generating the response.";
        }
    }
  }

  /**
   * @inheritdoc
   */
  async generateContent(prompt: string, systemInstruction: string, temperature = 0.5): Promise<string> {
    try {
        const response = await this.ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: prompt,
            config: { systemInstruction, temperature }
        });
        return response.text();
    } catch (error) {
        console.error("Error generating content from Gemini model:", error);
        logError(error as Error, { prompt, systemInstruction });
        throw error;
    }
  }

  /**
   * @inheritdoc
   */
  async generateJson<T>(prompt: any, systemInstruction: string, schema: any, temperature = 0.2): Promise<T> {
    try {
        const response = await this.ai.models.generateContent({
            model: "gemini-1.5-flash",
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature,
            }
        });
        return JSON.parse(response.text().trim());
    } catch (error) {
        console.error("Error generating JSON from Gemini model:", error);
        logError(error as Error, { prompt, systemInstruction });
        throw error;
    }
  }

  /**
   * @inheritdoc
   */
  async getInferenceFunction(prompt: string, functionDeclarations: FunctionDeclaration[], knowledgeBase: string): Promise<CommandResponse> {
    try {
        const response: GenerateContentResponse = await this.ai.models.generateContent({ model: "gemini-1.5-flash", contents: prompt, config: { systemInstruction: `You are a helpful assistant for a developer tool. You must decide which function to call to satisfy the user's request, based on your knowledge base. If no specific tool seems appropriate, respond with text.\n\nKnowledge Base:\n${knowledgeBase}`, tools: [{ functionDeclarations }] } });
        const functionCalls: { name: string, args: any }[] = [];
        const parts = response.candidates?.[0]?.content?.parts ?? [];
        for (const part of parts) { 
            if (part.functionCall && part.functionCall.name) { 
                functionCalls.push({ name: part.functionCall.name, args: part.functionCall.args }); 
            } 
        }
        return { text: response.text(), functionCalls: functionCalls.length > 0 ? functionCalls : undefined };
    } catch (error) {
        logError(error as Error, { prompt });
        throw error;
    }
  }

  /**
   * @inheritdoc
   */
  async generateImage(prompt: string): Promise<string> {
    const response = await this.ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: { numberOfImages: 1, outputMimeType: 'image/png' },
    });

    const images = response.generatedImages;
    if (!images || images.length === 0 || !images[0].image.imageBytes) {
        throw new Error('Image generation failed to return an image.');
    }
    const base64ImageBytes: string = images[0].image.imageBytes;
    return `data:image/png;base64,${base64ImageBytes}`;
  }

  /**
   * @inheritdoc
   */
  async generateImageFromImageAndText(prompt: string, _base64Image: string, _mimeType: string): Promise<string> {
    console.warn("Image-to-image generation is not fully supported by the current SDK implementation; using text prompt only.");
    // When SDK supports image-to-image, the implementation will change here.
    // For now, we fall back to text-to-image.
    return this.generateImage(prompt);
  }
}

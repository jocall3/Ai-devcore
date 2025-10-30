/**
 * @file This file is intended to contain the implementation for a Gemini AI provider.
 * As part of a refactor to abstract AI services, this file would define a class
 * that conforms to a generic IAiProvider interface, encapsulating all direct
 * interactions with the Google Gemini API.
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenerativeAI } from "@google/generative-ai"; // Corrected import name
import type { GenerateContentResponse, FunctionDeclaration } from "@google/generative-ai"; // Corrected import name
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
   * @type {GoogleGenerativeAI}
   * @description The instance of the GoogleGenerativeAI client.
   */
  private ai: GoogleGenerativeAI; // Corrected type name

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
    this.ai = new GoogleGenerativeAI({ apiKey }); // Corrected class name
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

        for await (const chunk of response.stream) { // Access response.stream
            if (chunk.text) { // Check if text property exists
                yield chunk.text; // Access .text as a property, not a method
            }
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
        const result = await this.ai.models.generateContent({ // Use result to distinguish from response in error message
            model: 'gemini-1.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }], // Ensure contents are in the correct format
            systemInstruction,
            generationConfig: { temperature }
        });
        const response = result.response;
        return response.text(); // Access .text() as a method from the GenerateContentResponse interface
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
        const result = await this.ai.models.generateContent({
            model: "gemini-1.5-flash",
            contents: [{ role: 'user', parts: [{ text: prompt }] }], // Ensure contents are in the correct format
            systemInstruction,
            generationConfig: { temperature },
            tools: [{ functionDeclarations: [] }], // Empty tools if not using function calling
            toolConfig: { functionCallingConfig: { mode: "ANY" } }, // Explicitly set if needed, or omit
            responseMimeType: "application/json", // This is usually part of generationConfig or model capabilities
            // responseSchema: schema, // `responseSchema` is not directly supported in the model config for JSON mode.
            // JSON mode expects `response_mime_type: application/json` and guides the model to produce JSON.
            // Schema validation would typically happen client-side after parsing the text.
        });
        const response = result.response;
        // Gemini's JSON mode aims to return valid JSON in the text.
        // The schema parameter might be used to prompt the model to conform, but validation is manual.
        return JSON.parse(response.text().trim()) as T; // Access .text() as a method
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
        const result = await this.ai.models.generateContent({
            model: "gemini-1.5-flash",
            contents: [{ role: 'user', parts: [{ text: prompt }] }], // Ensure contents are in the correct format
            systemInstruction: `You are a helpful assistant for a developer tool. You must decide which function to call to satisfy the user's request, based on your knowledge base. If no specific tool seems appropriate, respond with text.\n\nKnowledge Base:\n${knowledgeBase}`,
            tools: [{ functionDeclarations }],
            toolConfig: {
                functionCallingConfig: {
                    mode: "ANY", // AUTO, ANY, NONE
                },
            },
        });
        const response = result.response;
        const functionCalls: { name: string, args: any }[] = [];
        const parts = response.candidates?.[0]?.content?.parts ?? [];
        for (const part of parts) { 
            if (part.functionCall && part.functionCall.name) { 
                functionCalls.push({ name: part.functionCall.name, args: part.functionCall.args }); 
            } 
        }
        return { text: response.text(), functionCalls: functionCalls.length > 0 ? functionCalls : undefined }; // Access .text() as a method
    } catch (error) {
        logError(error as Error, { prompt });
        throw error;
    }
  }

  /**
   * @inheritdoc
   */
  async generateImage(prompt: string): Promise<string> {
    // Note: The generateImages method is part of a separate API or older client
    // With `genai` SDK, image generation is usually done via `generateContent` with image parts,
    // or by calling a separate image generation service/API.
    // The current `@google/generative-ai` SDK does not expose `models.generateImages` directly.
    // This section might need an external image generation API call or a different model.
    // For now, retaining a placeholder or simulating a text-only response if image generation isn't directly supported.

    // If using the official `genai` client, image generation typically involves a prompt with a specific model for images,
    // or through a service like Google Cloud's AI Platform / Vertex AI.
    // The `generateImages` method is not part of `GoogleGenerativeAI` from `@google/generative-ai`.
    // This method would typically call an external image generation service or a specific image model.
    // Given the current SDK, this method would require a significant refactor to use a different image generation API.
    // As a placeholder or if an external service is intended, this would remain.
    
    // For now, let's throw an error or return a placeholder if actual image generation isn't supported by this SDK.
    // A robust solution would involve a dedicated image generation service integration (e.g., DALL-E, Stability AI, or Google's Imagen API through Vertex AI).
    throw new Error("Direct image generation with `generateImages` is not supported by the current GoogleGenerativeAI SDK. Please integrate with a dedicated image generation API.");

    // Example of how it might look if a dedicated image generation service (like an external Imagen API) was integrated:
    /*
    try {
      const response = await fetch('YOUR_IMAGEN_API_ENDPOINT', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` },
        body: JSON.stringify({ prompt, numberOfImages: 1, outputMimeType: 'image/png' }),
      });
      const data = await response.json();
      const base64ImageBytes: string = data.generatedImages[0].image.imageBytes;
      return `data:image/png;base64,${base64ImageBytes}`;
    } catch (error) {
      console.error("Error generating image:", error);
      logError(error as Error, { prompt });
      throw error;
    }
    */
  }

  /**
   * @inheritdoc
   */
  async generateImageFromImageAndText(prompt: string, _base64Image: string, _mimeType: string): Promise<string> {
    console.warn("Image-to-image generation is not fully supported by the current SDK implementation for direct image modifications. Falling back to text-to-image or requiring a dedicated image editing service.");
    // When SDK supports image-to-image, the implementation will change here.
    // For now, we fall back to text-to-image or throw.
    return this.generateImage(prompt); // This will now throw the error defined above.
  }
}
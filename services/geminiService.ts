/**
 * @file This file is intended to contain the implementation for a Gemini AI provider.
 * As part of a refactor to abstract AI services, this file would define a class
 * that conforms to a generic IAiProvider interface, encapsulating all direct
 * interactions with the Google Gemini API.
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenerativeAI, Part, FunctionDeclaration, GenerateContentStreamResult, FunctionCall } from "@google/genai";
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
   */
  streamContent(prompt: string | { parts: any[] }, systemInstruction: string, temperature?: number): AsyncGenerator<string, void, unknown>;

  /**
   * Generates a complete content response from the AI model.
   * @param {string} prompt - The prompt to send to the model.
   * @param {string} systemInstruction - System-level instructions to guide the model's behavior.
   * @param {number} [temperature=0.5] - The sampling temperature for the model's response.
   * @returns {Promise<string>} A promise that resolves to the full text response from the model.
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
   */
  generateJson<T>(prompt: any, systemInstruction: string, schema: any, temperature?: number): Promise<T>;

  /**
   * Interacts with the AI model to determine if a function should be called.
   * @param {string} prompt - The user's prompt.
   * @param {FunctionDeclaration[]} functionDeclarations - An array of function declarations available to the model.
   * @param {string} knowledgeBase - Additional context or knowledge for the model.
   * @returns {Promise<CommandResponse>} A promise that resolves to a CommandResponse object.
   */
  getInferenceFunction(prompt: string, functionDeclarations: FunctionDeclaration[], knowledgeBase: string): Promise<CommandResponse>;

  /**
   * Generates a single image from a text prompt.
   * @param {string} prompt - The text prompt describing the image.
   * @returns {Promise<string>} A promise that resolves to a base64-encoded data URL of the generated image.
   */
  generateImage(prompt: string): Promise<string>;

  /**
   * Generates an image based on a text prompt and a source image.
   * @param {string} prompt - The text prompt describing the desired changes or style.
   * @param {string} base64Image - The base64-encoded source image.
   * @param {string} mimeType - The MIME type of the source image.
   * @returns {Promise<string>} A promise that resolves to a base64-encoded data URL of the generated image.
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
  private ai: GoogleGenerativeAI;

  /**
   * Creates an instance of GeminiProvider.
   * @param {string} apiKey - The Google Gemini API key.
   * @throws {Error} If the API key is not provided.
   */
  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("Google Gemini API key is required to initialize GeminiProvider.");
    }
    this.ai = new GoogleGenerativeAI(apiKey);
  }

  /**
   * @inheritdoc
   */
  async *streamContent(prompt: string | { parts: any[] }, systemInstruction: string, temperature = 0.5): AsyncGenerator<string, void, unknown> {
    try {
      const model = this.ai.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        systemInstruction: { role: 'user', parts: [{ text: systemInstruction }] },
        generationConfig: { temperature }
      });
      
      const contents = typeof prompt === 'string' ? [{ role: 'user', parts: [{ text: prompt }] }] : [{ role: 'user', parts: prompt.parts }];
      const result: GenerateContentStreamResult = await model.generateContentStream({ contents });

      for await (const chunk of result.stream) {
          if (chunk.text) {
              yield chunk.text();
          }
      }
    } catch (error) {
        logError(error as Error, { prompt, systemInstruction });
        if (error instanceof Error) {
            yield `An error occurred with the Gemini model: ${error.message}`;
        } else {
            yield "An unknown error occurred during the request.";
        }
    }
  }

  /**
   * @inheritdoc
   */
  async generateContent(prompt: string, systemInstruction: string, temperature = 0.5): Promise<string> {
    try {
      const model = this.ai.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        systemInstruction: { role: 'user', parts: [{ text: systemInstruction }] },
        generationConfig: { temperature }
      });
      const result = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
      return result.response.text();
    } catch (error) {
        logError(error as Error, { prompt, systemInstruction });
        throw error;
    }
  }

  /**
   * @inheritdoc
   */
  async generateJson<T>(prompt: any, systemInstruction: string, schema: any, temperature = 0.2): Promise<T> {
      try {
          const model = this.ai.getGenerativeModel({
              model: "gemini-1.5-flash",
              systemInstruction: { role: 'user', parts: [{ text: systemInstruction }] },
              generationConfig: { temperature, responseMimeType: "application/json" },
              tools: [{
                  functionDeclarations: [{
                      name: 'json_output',
                      description: 'Formats the output as a JSON object matching the provided schema.',
                      parameters: schema,
                  }]
              }],
              toolConfig: { functionCallingConfig: { mode: 'ONE_CALL', allowedFunctionNames: ['json_output'] } },
          });

          const result = await model.generateContent(typeof prompt === 'string' ? prompt : JSON.stringify(prompt));
          const call = result.response.functionCalls()?.[0];
          if (call?.args) {
              return call.args as T;
          }
          // Fallback if the model returns raw JSON in text despite function calling setup
          const textResponse = result.response.text().trim();
          if (textResponse) {
              return JSON.parse(textResponse) as T;
          }
          throw new Error('AI did not return a valid JSON object.');
      } catch (error) {
          logError(error as Error, { prompt, systemInstruction });
          throw error;
      }
  }

  /**
   * @inheritdoc
   */
  async getInferenceFunction(prompt: string, functionDeclarations: FunctionDeclaration[], knowledgeBase: string): Promise<CommandResponse> {
    try {
        const model = this.ai.getGenerativeModel({
            model: "gemini-1.5-flash",
            systemInstruction: {
                role: 'user',
                parts: [{ text: `You are an assistant for a developer tool. Decide which function to call based on the user's request and your knowledge base. If no tool is appropriate, respond with text.\n\nKnowledge Base:\n${knowledgeBase}` }]
            },
            tools: [{ functionDeclarations }],
        });

        const result = await model.generateContent(prompt);
        const response = result.response;
        const functionCalls = response.functionCalls()?.map((call: FunctionCall) => ({ name: call.name, args: call.args }));
        
        return { text: response.text(), functionCalls: functionCalls && functionCalls.length > 0 ? functionCalls : undefined };
    } catch (error) {
        logError(error as Error, { prompt });
        throw error;
    }
  }

  /**
   * @inheritdoc
   */
  async generateImage(prompt: string): Promise<string> {
    logError(new Error("GeminiProvider.generateImage is not implemented."));
    throw new Error("Direct image generation is not supported by this provider implementation.");
  }

  /**
   * @inheritdoc
   */
  async generateImageFromImageAndText(prompt: string, _base64Image: string, _mimeType: string): Promise<string> {
    logError(new Error("GeminiProvider.generateImageFromImageAndText is not implemented."));
    throw new Error("Image-to-image generation is not supported by this provider implementation.");
  }
}
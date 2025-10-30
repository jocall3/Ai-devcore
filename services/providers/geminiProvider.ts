/**
 * @file Implements the AI provider interface for Google's Gemini models.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import {
  GoogleGenerativeAI,
  FunctionDeclaration,
  Part,
  FunctionCall,
  GenerateContentStreamResult
} from "@google/genai";
import { logError } from "../telemetryService";

// Note: In a full modular refactor, the interfaces below would be moved
// to a dedicated file, e.g., `services/providers/IAiProvider.ts`.

/**
 * Represents the arguments for a streaming content request.
 */
export interface StreamContentArgs {
  prompt: string | (string | Part)[];
  systemInstruction?: string;
  temperature?: number;
}

/**
 * Represents the arguments for a standard content generation request.
 */
export interface GenerateContentArgs extends StreamContentArgs {}

/**
 * Represents the arguments for a JSON generation request.
 */
export interface GenerateJsonArgs extends GenerateContentArgs {
  schema: object; // The JSON schema for the response.
}

/**
 * Represents the arguments for a function calling request.
 */
export interface GetInferenceFunctionArgs extends GenerateContentArgs {
  functionDeclarations: FunctionDeclaration[];
}

/**
 * Represents the response from a function calling request.
 */
export interface CommandResponse {
  text: string;
  functionCalls?: { name: string; args: any; }[];
}

/**
 * Represents the arguments for an image generation request.
 */
export interface GenerateImageArgs {
  prompt: string;
  numberOfImages?: number;
}

/**
 * Defines the contract for all AI providers.
 * This allows for a Strategy Pattern implementation where different providers
 * (e.g., Gemini, OpenAI) can be used interchangeably.
 * @interface
 */
export interface IAiProvider {
  /**
   * Streams content from the AI model.
   * @param {StreamContentArgs} args - The arguments for the request.
   * @returns {AsyncGenerator<string>} An async generator yielding text chunks.
   */
  streamContent(args: StreamContentArgs): AsyncGenerator<string>;

  /**
   * Generates a single block of content from the AI model.
   * @param {GenerateContentArgs} args - The arguments for the request.
   * @returns {Promise<string>} A promise that resolves to the generated text.
   */
  generateContent(args: GenerateContentArgs): Promise<string>;

  /**
   * Generates a JSON object from the AI model based on a schema.
   * @template T The expected type of the parsed JSON object.
   * @param {GenerateJsonArgs} args - The arguments for the request, including the schema.
   * @returns {Promise<T>} A promise that resolves to the parsed JSON object.
   */
  generateJson<T>(args: GenerateJsonArgs): Promise<T>;

  /**
   * Performs function calling based on a prompt and available tools.
   * @param {GetInferenceFunctionArgs} args - The arguments for the request, including function declarations.
   * @returns {Promise<CommandResponse>} A promise that resolves to a CommandResponse object.
   */
  getInferenceFunction(args: GetInferenceFunctionArgs): Promise<CommandResponse>;
  
  /**
   * Generates one or more images from a text prompt.
   * @param {GenerateImageArgs} args - The arguments for the image generation request.
   * @returns {Promise<string[]>} A promise that resolves to an array of data URLs (base64) of the generated images.
   */
  generateImages(args: GenerateImageArgs): Promise<string[]>;
}

/**
 * @class GeminiProvider
 * @implements {IAiProvider}
 * @description An implementation of the IAiProvider interface that uses the Google Gemini API.
 * This class encapsulates all logic for communicating with the Gemini models. It is designed
 * to be instantiated by a factory that handles API key management and dependency injection.
 */
export class GeminiProvider implements IAiProvider {
  /**
   * The underlying GoogleGenerativeAI client instance.
   * @private
   */
  private client: GoogleGenerativeAI;

  /**
   * The model used for text-based generation.
   * @private
   */
  private textModelName = 'gemini-1.5-flash';

  /**
   * Creates an instance of GeminiProvider.
   * @param {GoogleGenerativeAI} client - An initialized GoogleGenerativeAI client instance.
   * @example
   * const aiClient = new GoogleGenerativeAI("YOUR_API_KEY");
   * const geminiProvider = new GeminiProvider(aiClient);
   */
  constructor(client: GoogleGenerativeAI) {
    this.client = client;
  }

  /**
   * @inheritdoc
   * @example
   * const provider = new GeminiProvider(client);
   * const stream = provider.streamContent({ prompt: "Explain quantum computing" });
   * for await (const chunk of stream) {
   *   console.log(chunk);
   * }
   */
  async *streamContent(args: StreamContentArgs): AsyncGenerator<string> {
    try {
      const model = this.client.getGenerativeModel({
        model: this.textModelName,
        systemInstruction: args.systemInstruction,
        generationConfig: { temperature: args.temperature ?? 0.5 }
      });

      const result: GenerateContentStreamResult = await model.generateContentStream(args.prompt);

      for await (const chunk of result.stream) {
        yield chunk.text();
      }
    } catch (error) {
      logError(error as Error, { provider: 'Gemini', method: 'streamContent', args });
      throw new Error(`Gemini streamContent failed: ${(error as Error).message}`);
    }
  }

  /**
   * @inheritdoc
   * @example
   * const provider = new GeminiProvider(client);
   * const response = await provider.generateContent({ prompt: "What is the capital of France?" });
   * console.log(response); // "Paris"
   */
  async generateContent(args: GenerateContentArgs): Promise<string> {
    try {
      const model = this.client.getGenerativeModel({
        model: this.textModelName,
        systemInstruction: args.systemInstruction,
        generationConfig: { temperature: args.temperature ?? 0.5 }
      });
      const result = await model.generateContent(args.prompt);
      return result.response.text();
    } catch (error) {
      logError(error as Error, { provider: 'Gemini', method: 'generateContent', args });
      throw new Error(`Gemini generateContent failed: ${(error as Error).message}`);
    }
  }

  /**
   * @inheritdoc
   * @example
   * const schema = { type: "object", properties: { city: { type: "string" } }, required: ["city"] };
   * const provider = new GeminiProvider(client);
   * const response = await provider.generateJson<{ city: string }>({ 
   *   prompt: "What city is the Eiffel Tower in?",
   *   schema
   * });
   * console.log(response.city); // "Paris"
   */
  async generateJson<T>(args: GenerateJsonArgs): Promise<T> {
    try {
      const model = this.client.getGenerativeModel({
        model: this.textModelName,
        systemInstruction: args.systemInstruction,
        generationConfig: {
          responseMimeType: "application/json",
          temperature: args.temperature ?? 0.2
        },
        tools: [{
          functionDeclarations: [{
            name: 'output_formatter',
            description: 'Outputs the structured data based on the provided schema.',
            parameters: args.schema
          }]
        }],
        toolConfig: {
            functionCallingConfig: {
                mode: "ONE_CALL",
                allowedFunctionNames: ['output_formatter'],
            }
        }
      });

      const result = await model.generateContent(args.prompt);
      const call = result.response.functionCalls()?.[0];

      if (call?.args) {
        return call.args as T;
      }
      
      // Fallback for models that might just return JSON text
      const text = result.response.text().trim();
      return JSON.parse(text);

    } catch (error) {
      logError(error as Error, { provider: 'Gemini', method: 'generateJson', args });
      throw new Error(`Gemini generateJson failed: ${(error as Error).message}`);
    }
  }

  /**
   * @inheritdoc
   * @example
   * const funcs = [{ name: 'getCurrentWeather', parameters: { type: 'object', properties: { location: { type: 'string' } } } }];
   * const provider = new GeminiProvider(client);
   * const response = await provider.getInferenceFunction({ prompt: "What's the weather in Boston?", functionDeclarations: funcs });
   * console.log(response.functionCalls); // [{ name: 'getCurrentWeather', args: { location: 'Boston' } }]
   */
  async getInferenceFunction(args: GetInferenceFunctionArgs): Promise<CommandResponse> {
    try {
      const model = this.client.getGenerativeModel({
        model: this.textModelName,
        systemInstruction: args.systemInstruction,
        tools: [{ functionDeclarations: args.functionDeclarations }]
      });

      const result = await model.generateContent(args.prompt);
      const response = result.response;
      const functionCalls = response.functionCalls()?.map((call: FunctionCall) => ({
        name: call.name,
        args: call.args,
      }));

      return {
        text: response.text(),
        functionCalls: functionCalls && functionCalls.length > 0 ? functionCalls : undefined,
      };
    } catch (error) {
      logError(error as Error, { provider: 'Gemini', method: 'getInferenceFunction', args });
      throw new Error(`Gemini getInferenceFunction failed: ${(error as Error).message}`);
    }
  }

  /**
   * @inheritdoc
   * @example
   * const provider = new GeminiProvider(client);
   * const imageUrls = await provider.generateImages({ prompt: "A photo of an astronaut riding a horse" });
   * console.log(imageUrls[0]); // "data:image/png;base64,..."
   */
  async generateImages(_args: GenerateImageArgs): Promise<string[]> {
    logError(new Error("GeminiProvider.generateImages is not implemented. The underlying public SDK does not support this model."));
    console.warn("GeminiProvider.generateImages is not implemented.");
    // This is a placeholder. The current public @google/generative-ai SDK does not
    // directly support Imagen models. This would typically involve a separate REST API call 
    // to the Vertex AI Imagen endpoint, which is beyond the scope of this provider.
    // We return an empty array to satisfy the interface contract.
    return Promise.resolve([]);
  }
}

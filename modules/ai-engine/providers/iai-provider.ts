/**
 * @file Defines the interface for AI providers, abstracting specific implementations like Gemini or OpenAI.
 * @license SPDX-License-Identifier: Apache-2.0
 */

// The `FunctionDeclaration` type is complex and provider-specific, so we use a generic `object` here to keep the interface provider-agnostic.
// A specific provider implementation (e.g., GeminiProvider) will handle casting this to its required type.

/**
 * @description Represents a part of a multimodal prompt. It can be either a simple text string
 * or an object representing inline data like an image.
 * @example
 * const textPart: PromptPart = "Describe this image:";
 * const imagePart: PromptPart = {
 *   inlineData: {
 *     mimeType: 'image/png',
 *     data: 'iVBORw0KGgoAAAANSUhEUg...' // base64 encoded image
 *   }
 * };
 */
export type PromptPart = string | { inlineData: { mimeType: string; data: string; } };

/**
 * @description Represents the complete prompt sent to the AI model. It can be a simple string for text-only prompts
 * or an array of `PromptPart` for multimodal prompts (e.g., text and images).
 * @example
 * const textPrompt: Prompt = "What is the capital of France?";
 * const multiModalPrompt: Prompt = [
 *   "Describe this image:",
 *   { inlineData: { mimeType: 'image/jpeg', data: '...' } }
 * ];
 */
export type Prompt = string | PromptPart[];

/**
 * @description Defines the structure for a function call requested by the AI model.
 * @property {string} name - The name of the function to be called.
 * @property {object} args - The arguments for the function, as a JSON object.
 */
export interface FunctionCall {
  name: string;
  args: object;
}

/**
 * @description Represents the response from a function-calling inference request.
 * @property {string} text - Any text content returned by the model alongside the function call.
 * @property {FunctionCall[]} [functionCalls] - An optional array of function calls requested by the model.
 */
export interface CommandResponse {
  text: string;
  functionCalls?: FunctionCall[];
}


/**
 * @interface IAiProvider
 * @description Defines the contract for all AI provider services. This allows the application
 * to switch between different AI models (like Gemini, OpenAI, etc.) by simply changing
 * the provider implementation, adhering to the Strategy Pattern.
 */
export interface IAiProvider {
  /**
   * @description Generates content from the AI model as an asynchronous stream of text chunks.
   * This is ideal for chat-like experiences where text is displayed as it's being generated.
   * @param {Prompt} prompt - The prompt to send to the model. Can be a string or an array for multimodal input.
   * @param {string} [systemInstruction] - An optional system-level instruction to guide the model's behavior.
   * @param {number} [temperature] - The sampling temperature for the model's response, typically between 0 and 1.
   * @returns {AsyncGenerator<string, void, unknown>} An async generator that yields string chunks of the response.
   * @example
   * const provider = new GeminiProvider();
   * const stream = provider.streamContent("Write a short story about a robot.");
   * for await (const chunk of stream) {
   *   process.stdout.write(chunk);
   * }
   */
  streamContent(prompt: Prompt, systemInstruction?: string, temperature?: number): AsyncGenerator<string, void, unknown>;

  /**
   * @description Generates content from the AI model and returns the entire response as a single string.
   * This is suitable for tasks where the full response is needed before proceeding.
   * @param {Prompt} prompt - The prompt to send to the model. Can be a string or an array for multimodal input.
   * @param {string} [systemInstruction] - An optional system-level instruction to guide the model's behavior.
   * @param {number} [temperature] - The sampling temperature for the model's response.
   * @returns {Promise<string>} A promise that resolves to the complete generated text.
   * @example
   * const provider = new GeminiProvider();
   * const summary = await provider.generateContent("Summarize the main points of 'Moby Dick'.");
   * console.log(summary);
   */
  generateContent(prompt: Prompt, systemInstruction?: string, temperature?: number): Promise<string>;

  /**
   * @description Generates a structured JSON object from the AI model based on a provided schema.
   * @template T - The expected type of the JSON object.
   * @param {Prompt} prompt - The prompt instructing the model what to generate.
   * @param {object} schema - A JSON schema object defining the expected output structure. The specific format may depend on the provider.
   * @param {string} [systemInstruction] - An optional system-level instruction.
   * @param {number} [temperature] - The sampling temperature for the model's response.
   * @returns {Promise<T>} A promise that resolves to the parsed JSON object of type T.
   * @example
   * const provider = new GeminiProvider();
   * const userSchema = { type: "OBJECT", properties: { name: { type: "STRING" }, email: { type: "STRING" } } };
   * const user = await provider.generateJson<{ name: string; email: string }>("Generate a user object for 'John Doe'.", userSchema);
   * console.log(user.name); // "John Doe"
   */
  generateJson<T>(prompt: Prompt, schema: object, systemInstruction?: string, temperature?: number): Promise<T>;

  /**
   * @description Uses the model's function-calling capabilities to determine which tool or function
   * should be executed based on the user's prompt.
   * @param {string} prompt - The user's natural language command.
   * @param {object[]} functionDeclarations - An array of function schemas that the model can choose from. The format is provider-specific.
   * @param {string} [knowledgeBase] - Optional contextual information to help the model make a better decision.
   * @returns {Promise<CommandResponse>} A promise that resolves to an object containing any text response and a list of requested function calls.
   * @example
   * const provider = new GeminiProvider();
   * const tools = [{ name: 'getWeather', description: 'Gets the weather for a location', parameters: { ... } }];
   * const response = await provider.getInferenceFunction("What's the weather in London?", tools);
   * if (response.functionCalls) {
   *   // execute function call
   * }
   */
  getInferenceFunction(prompt: string, functionDeclarations: object[], knowledgeBase?: string): Promise<CommandResponse>;

  /**
   * @description Generates an image from a text prompt.
   * @param {string} prompt - A descriptive text prompt for the image to be generated.
   * @returns {Promise<string>} A promise that resolves to a data URL (e.g., 'data:image/png;base64,...') of the generated image.
   * @example
   * const provider = new GeminiProvider();
   * const imageUrl = await provider.generateImage("A photorealistic cat wearing a wizard hat.");
   * // Use the data URL in an image tag
   * // <img src={imageUrl} />
   */
  generateImage(prompt: string): Promise<string>;
  
  /**
   * @description Generates a new image based on a source image and a text prompt.
   * Note: The exact capabilities (e.g., inpainting, outpainting, style transfer) may vary by provider.
   * @param {string} prompt - A text prompt describing the desired modifications or style.
   * @param {string} base64Image - The source image, encoded as a Base64 string.
   * @param {string} mimeType - The MIME type of the source image (e.g., 'image/png', 'image/jpeg').
   * @returns {Promise<string>} A promise that resolves to a data URL of the newly generated image.
   * @example
   * const provider = new GeminiProvider();
   * const newImageUrl = await provider.generateImageFromImageAndText(
   *   "Make this cat wear a wizard hat.",
   *   "iVBORw0KGgoAAA...",
   *   "image/png"
   * );
   */
  generateImageFromImageAndText(prompt: string, base64Image: string, mimeType: string): Promise<string>;
}

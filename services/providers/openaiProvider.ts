/**
 * @file OpenAI Provider implementation for the AI Service.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { getDecryptedCredential } from '../vaultService.ts';
import { logError } from '../telemetryService.ts';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Represents the common interface for an AI provider like Gemini or OpenAI.
 * This allows the application to switch between providers seamlessly.
 * @note This interface should be extracted to a separate file (e.g., `services/providers/iAiProvider.ts`).
 * @see {@link OpenAiProvider}
 */
export interface IAiProvider {
  /**
   * Generates a single text response from a prompt.
   * @param {string} prompt The user's prompt.
   * @param {string} systemInstruction A system-level instruction to guide the model's behavior.
   * @param {number} [temperature] The sampling temperature.
   * @returns {Promise<string>} A promise that resolves to the generated text content.
   */
  generateContent(prompt: string, systemInstruction: string, temperature?: number): Promise<string>;

  /**
   * Streams a text response from a prompt.
   * @param {string | { parts: any[] }} prompt The user's prompt, which can be a string or a more complex object for multimodal input.
   * @param {string} systemInstruction A system-level instruction to guide the model's behavior.
   * @param {number} [temperature] The sampling temperature.
   * @returns {AsyncGenerator<string, void, unknown>} An async generator that yields chunks of the response text.
   */
  streamContent(prompt: string | { parts: any[] }, systemInstruction: string, temperature?: number): AsyncGenerator<string, void, unknown>;

  /**
   * Generates a structured JSON object from a prompt, conforming to a given schema.
   * @template T The expected type of the JSON object.
   * @param {*} prompt The user's prompt.
   * @param {string} systemInstruction A system-level instruction to guide the model's behavior.
   * @param {*} schema The JSON schema the output must conform to. This is for typing and may not be used by all providers.
   * @param {number} [temperature] The sampling temperature.
   * @returns {Promise<T>} A promise that resolves to the parsed JSON object of type T.
   */
  generateJson<T>(prompt: any, systemInstruction: string, schema: any, temperature?: number): Promise<T>;
}

/**
 * Implements the IAiProvider interface for OpenAI's chat completion models.
 * @implements {IAiProvider}
 */
export class OpenAiProvider implements IAiProvider {
    private apiKey: string | null = null;

    /**
     * Retrieves the OpenAI API key from the vault.
     * Caches the key for the lifetime of the provider instance after the first retrieval.
     * @private
     * @returns {Promise<string>} The OpenAI API key.
     * @throws {Error} If the API key is not found in the vault or the vault is locked.
     */
    private async getApiKey(): Promise<string> {
        if (this.apiKey) {
            return this.apiKey;
        }

        // This will throw if the vault is locked, which is the desired behavior to enforce security.
        const key = await getDecryptedCredential('openai_api_key');
        if (!key) {
            throw new Error("OpenAI API key not found in vault. Please add it in the Workspace Connector Hub.");
        }
        this.apiKey = key;
        return this.apiKey;
    }

    /**
     * Generates a single text response from a prompt using OpenAI.
     * @param {string} prompt The user's prompt.
     * @param {string} systemInstruction A system-level instruction to guide the model's behavior.
     * @param {number} [temperature=0.5] The sampling temperature.
     * @returns {Promise<string>} A promise that resolves to the generated text content.
     * @example
     * const provider = new OpenAiProvider();
     * // Assuming vault is unlocked and key is set
     * const response = await provider.generateContent("What is React?", "You are a helpful assistant.");
     * console.log(response);
     */
    async generateContent(prompt: string, systemInstruction: string, temperature: number = 0.5): Promise<string> {
        try {
            const apiKey = await this.getApiKey();
            const response = await fetch(OPENAI_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [
                        { role: 'system', content: systemInstruction },
                        { role: 'user', content: prompt },
                    ],
                    temperature,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`OpenAI API Error: ${errorData.error.message}`);
            }

            const data = await response.json();
            return data.choices[0]?.message?.content || '';
        } catch (error) {
            logError(error as Error, { service: 'OpenAiProvider', method: 'generateContent' });
            throw error;
        }
    }

    /**
     * Streams a text response from a prompt using OpenAI.
     * @param {string | { parts: any[] }} prompt The user's prompt. Currently only supports text.
     * @param {string} systemInstruction A system-level instruction to guide the model's behavior.
     * @param {number} [temperature=0.5] The sampling temperature.
     * @returns {AsyncGenerator<string, void, unknown>} An async generator that yields chunks of the response text.
     * @example
     * const provider = new OpenAiProvider();
     * const stream = provider.streamContent("Write a short story about a robot.", "You are a creative writer.");
     * for await (const chunk of stream) {
     *   process.stdout.write(chunk);
     * }
     */
    async *streamContent(prompt: string | { parts: any[] }, systemInstruction: string, temperature: number = 0.5): AsyncGenerator<string, void, unknown> {
        if (typeof prompt !== 'string') {
            logError(new Error("OpenAI provider received non-string prompt for streaming."), { prompt });
            prompt = JSON.stringify(prompt);
        }

        try {
            const apiKey = await this.getApiKey();
            const response = await fetch(OPENAI_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [
                        { role: 'system', content: systemInstruction },
                        { role: 'user', content: prompt },
                    ],
                    temperature,
                    stream: true,
                }),
            });

            if (!response.body) {
                throw new Error("Response body from OpenAI is null.");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep the potentially incomplete last line

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.substring(6);
                        if (data.trim() === '[DONE]') {
                            return;
                        }
                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.choices[0]?.delta?.content;
                            if (content) {
                                yield content;
                            }
                        } catch (e) {
                           logError(e as Error, { context: 'streamContent JSON parse', data: data });
                        }
                    }
                }
            }
        } catch (error) {
            logError(error as Error, { service: 'OpenAiProvider', method: 'streamContent' });
            throw error;
        }
    }
    
    /**
     * Generates a structured JSON object from a prompt using OpenAI's JSON mode.
     * @template T The expected type of the JSON object.
     * @param {*} prompt The user's prompt.
     * @param {string} systemInstruction A system-level instruction to guide the model's behavior.
     * @param {*} _schema The JSON schema for the output. Note: OpenAI does not use the schema directly, but it's part of the interface.
     * @param {number} [temperature=0.2] The sampling temperature.
     * @returns {Promise<T>} A promise that resolves to the parsed JSON object.
     * @example
     * const provider = new OpenAiProvider();
     * const user = await provider.generateJson<{ name: string }>("Extract user 'John Doe'", "You output JSON.", null);
     * console.log(user.name); // "John Doe"
     */
    async generateJson<T>(prompt: any, systemInstruction: string, _schema: any, temperature: number = 0.2): Promise<T> {
        try {
            const apiKey = await this.getApiKey();
            const response = await fetch(OPENAI_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [
                        { role: 'system', content: `${systemInstruction} You MUST respond in a valid JSON format.` },
                        { role: 'user', content: typeof prompt === 'string' ? prompt : JSON.stringify(prompt) },
                    ],
                    temperature,
                    response_format: { type: "json_object" },
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`OpenAI API Error: ${errorData.error.message}`);
            }

            const data = await response.json();
            const jsonString = data.choices[0]?.message?.content;
            if (!jsonString) {
                throw new Error("OpenAI API did not return valid content for JSON mode.");
            }
            return JSON.parse(jsonString);
        } catch (error) {
            logError(error as Error, { service: 'OpenAiProvider', method: 'generateJson' });
            throw error;
        }
    }
}

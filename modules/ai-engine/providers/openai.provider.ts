/**
 * @file Implements the AI provider interface for OpenAI models.
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IAiProvider, AiProviderConfig, StreamContentRequest, GenerateJsonRequest } from '../types.ts';
import { logError } from '../../services/telemetryService.ts';

/**
 * @class OpenAiProvider
 * @implements {IAiProvider}
 * @description An AI provider implementation for OpenAI's GPT models.
 * @example
 * ```typescript
 * const config = { apiKey: 'sk-...' };
 * const provider = new OpenAiProvider(config);
 * const stream = provider.streamContent({ prompt: 'Tell me a story.' });
 * for await (const chunk of stream) {
 *   console.log(chunk);
 * }
 * ```
 */
export class OpenAiProvider implements IAiProvider {
    /**
     * @private
     * @readonly
     * @type {string}
     * @description The base URL for the OpenAI API.
     */
    private readonly apiUrl = 'https://api.openai.com/v1/chat/completions';

    /**
     * @private
     * @type {string}
     * @description The API key for authenticating with the OpenAI API.
     */
    private apiKey: string;

    /**
     * @constructor
     * @param {AiProviderConfig} config - The configuration for the provider, containing the API key.
     * @throws {Error} If the API key is not provided in the configuration.
     */
    constructor(config: AiProviderConfig) {
        if (!config.apiKey) {
            throw new Error('OpenAI API key is required for OpenAiProvider.');
        }
        this.apiKey = config.apiKey;
    }

    /**
     * @method streamContent
     * @description Generates content as a stream from the OpenAI API.
     * @param {StreamContentRequest} request - The request object containing the prompt and other parameters.
     * @returns {AsyncGenerator<string, void, unknown>} An async generator that yields text chunks.
     * @example
     * ```typescript
     * const request = { prompt: 'Explain quantum computing simply.' };
     * const stream = openaiProvider.streamContent(request);
     * for await (const chunk of stream) {
     *   process.stdout.write(chunk);
     * }
     * ```
     */
    async *streamContent(request: StreamContentRequest): AsyncGenerator<string, void, unknown> {
        const { prompt, systemInstruction, temperature = 0.7 } = request;

        const messages: { role: 'system' | 'user'; content: string }[] = [];
        if (systemInstruction) {
            messages.push({ role: 'system', content: systemInstruction });
        }
        
        if (typeof prompt === 'string') {
            messages.push({ role: 'user', content: prompt });
        } else {
            const content = prompt.parts.map(p => p.text || '').join('\n');
            messages.push({ role: 'user', content });
        }

        const body = {
            model: 'gpt-4o',
            messages,
            temperature,
            stream: true,
        };

        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify(body),
        });

        if (!response.ok || !response.body) {
            const errorText = await response.text();
            logError(new Error(`OpenAI API error (${response.status}): ${errorText}`), { request: body });
            throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.substring(6);
                    if (data.trim() === '[DONE]') {
                        return;
                    }
                    try {
                        const parsed = JSON.parse(data);
                        const chunk = parsed.choices[0]?.delta?.content;
                        if (chunk) {
                            yield chunk;
                        }
                    } catch (e) {
                        console.error('Error parsing OpenAI stream chunk:', data, e);
                    }
                }
            }
        }
    }

    /**
     * @method generateJson
     * @description Generates a structured JSON response from the OpenAI API.
     * @template T - The expected type of the JSON object.
     * @param {GenerateJsonRequest} request - The request object containing the prompt and system instruction.
     * @returns {Promise<T>} A promise that resolves to the parsed JSON object.
     * @example
     * ```typescript
     * const request = {
     *   prompt: 'Generate a user profile for John Doe.',
     *   systemInstruction: 'You must respond with a JSON object with `name` and `email` fields.'
     * };
     * const userProfile = await openaiProvider.generateJson<{ name: string; email: string; }>(request);
     * console.log(userProfile.email);
     * ```
     */
    async generateJson<T>(request: GenerateJsonRequest): Promise<T> {
        const { prompt, systemInstruction, temperature = 0.2 } = request;

        let finalSystemInstruction = systemInstruction || 'You are a helpful assistant that only responds with JSON.';
        finalSystemInstruction += '\n\nYou MUST respond with a valid JSON object. Do not include any text outside of the JSON object. Do not wrap the JSON in markdown backticks.';

        const messages = [
            { role: 'system', content: finalSystemInstruction },
            { role: 'user', content: prompt }
        ];
        
        const body = {
            model: 'gpt-4o',
            messages,
            temperature,
            response_format: { type: 'json_object' },
        };

        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            logError(new Error(`OpenAI API error (${response.status}): ${errorText}`), { request: body });
            throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
        }

        const jsonResponse = await response.json();
        const content = jsonResponse.choices[0]?.message?.content;

        if (!content) {
            throw new Error('OpenAI API returned an empty response content.');
        }

        try {
            return JSON.parse(content) as T;
        } catch (e) {
            console.error('Failed to parse JSON response from OpenAI:', content);
            logError(e as Error, { context: 'OpenAI JSON parsing', response: content });
            throw new Error('OpenAI API did not return a valid JSON object.');
        }
    }
}

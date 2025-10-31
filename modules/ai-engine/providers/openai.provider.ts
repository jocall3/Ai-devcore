/**
 * @file Implements the AI provider interface for OpenAI models, aligned with the new secure, modular architecture.
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { injectable, inject } from 'inversify';
import 'reflect-metadata';

import { IAiProvider, Prompt, PromptPart, CommandResponse } from './iai-provider';
import { TYPES } from '../../core/di/types';
import { logError } from '../../../services/telemetryService';

// Local interface to represent the Security Core contract during refactoring.
// In a finalized architecture, this would be imported from a shared types file.
interface ISecurityCore {
    getDecryptedCredential(id: string): Promise<string | null>;
}

/**
 * @class OpenAiProvider
 * @implements {IAiProvider}
 * @description An AI provider for OpenAI's models, using the secure vault for API key management.
 * @injectable
 */
@injectable()
export class OpenAiProvider implements IAiProvider {
    private readonly chatApiUrl = 'https://api.openai.com/v1/chat/completions';
    private readonly imageApiUrl = 'https://api.openai.com/v1/images/generations';
    private readonly securityCore: ISecurityCore;

    /**
     * @constructor
     * @param {ISecurityCore} securityCore - Injected Security Core service for secure credential access.
     */
    public constructor(
        @inject(TYPES.SecurityCore) securityCore: ISecurityCore
    ) {
        this.securityCore = securityCore;
    }

    /**
     * Retrieves the OpenAI API key securely from the vault just-in-time.
     * @private
     * @returns {Promise<string>} The OpenAI API key.
     * @throws {Error} If the API key is not found or the vault is locked.
     */
    private async getApiKey(): Promise<string> {
        // This call will throw an error if the vault is locked, which is the desired behavior.
        const key = await this.securityCore.getDecryptedCredential('openai_api_key');
        if (!key) {
            throw new Error('OpenAI API key not found. Please add it in the Workspace Connector Hub.');
        }
        return key;
    }

    /**
     * Converts a generic Prompt type into the format expected by the OpenAI API.
     * @private
     * @param {Prompt} prompt - The prompt to convert.
     * @returns {string | Array<object>} The OpenAI-compatible content payload.
     */
    private formatPrompt(prompt: Prompt): string | Array<object> {
        if (typeof prompt === 'string') {
            return prompt;
        }

        // Handle multimodal prompts
        return prompt.map((p: PromptPart) => {
            if (typeof p === 'string') {
                return { type: 'text', text: p };
            }
            return {
                type: 'image_url',
                image_url: { url: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}` }
            };
        });
    }

    /** @inheritdoc */
    async *streamContent(prompt: Prompt, systemInstruction?: string, temperature: number = 0.7): AsyncGenerator<string, void, unknown> {
        const apiKey = await this.getApiKey();
        const messages: { role: 'system' | 'user'; content: any }[] = [];
        if (systemInstruction) {
            messages.push({ role: 'system', content: systemInstruction });
        }
        messages.push({ role: 'user', content: this.formatPrompt(prompt) });

        const body = {
            model: 'gpt-4o',
            messages,
            temperature,
            stream: true,
        };

        const response = await fetch(this.chatApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
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
                    if (data.trim() === '[DONE]') return;
                    try {
                        const parsed = JSON.parse(data);
                        const chunk = parsed.choices[0]?.delta?.content;
                        if (chunk) yield chunk;
                    } catch (e) {
                        console.error('Error parsing OpenAI stream chunk:', data, e);
                    }
                }
            }
        }
    }

    /** @inheritdoc */
    async generateJson<T>(prompt: Prompt, schema: object, systemInstruction?: string, temperature: number = 0.2): Promise<T> {
        const apiKey = await this.getApiKey();
        const finalSystemInstruction = `${systemInstruction || 'You are a helpful assistant.'} You MUST respond in a valid JSON object. Do not include any text outside of the JSON object. Do not wrap the JSON in markdown backticks.`;

        const body = {
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: finalSystemInstruction },
                { role: 'user', content: this.formatPrompt(prompt) }
            ],
            temperature,
            response_format: { type: 'json_object' },
        };

        const response = await fetch(this.chatApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            logError(new Error(`OpenAI API error (${response.status}): ${errorText}`), { request: body });
            throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
        }

        const jsonResponse = await response.json();
        const content = jsonResponse.choices[0]?.message?.content;
        if (!content) throw new Error('OpenAI API returned an empty response content.');

        try {
            return JSON.parse(content) as T;
        } catch (e) {
            logError(e as Error, { context: 'OpenAI JSON parsing', response: content });
            throw new Error('OpenAI API did not return a valid JSON object.');
        }
    }

    /** @inheritdoc */
    async generateContent(prompt: Prompt, systemInstruction?: string, temperature?: number): Promise<string> {
        let streamedContent = '';
        for await (const chunk of this.streamContent(prompt, systemInstruction, temperature)) {
            streamedContent += chunk;
        }
        return streamedContent;
    }

    /** @inheritdoc */
    async getInferenceFunction(prompt: string, functionDeclarations: object[], knowledgeBase?: string): Promise<CommandResponse> {
        logError(new Error("OpenAiProvider.getInferenceFunction is not implemented."));
        return { text: "Function calling is not implemented for this provider yet." };
    }

    /** @inheritdoc */
    async generateImage(prompt: string): Promise<string> {
        const apiKey = await this.getApiKey();
        const response = await fetch(this.imageApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({ model: 'dall-e-3', prompt, n: 1, size: '1024x1024', response_format: 'b64_json' })
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI Image API error: ${errorText}`);
        }
        const data = await response.json();
        return `data:image/png;base64,${data.data[0].b64_json}`;
    }

    /** @inheritdoc */
    async generateImageFromImageAndText(prompt: string, base64Image: string, mimeType: string): Promise<string> {
        console.warn("OpenAiProvider.generateImageFromImageAndText is not fully implemented and falls back to text-to-image.");
        return this.generateImage(prompt);
    }
}

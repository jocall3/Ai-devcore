/**
 * @file Barrel file for the services module.
 * This file acts as a facade, exporting all public services and functions.
 * It includes a bridge for AI services to adapt to an ongoing architectural refactor.
 * @license SPDX-License-Identifier: Apache-2.0
 */

// --- Standard Service Exports ---
export * from './fileUtils.ts';
export * from './telemetryService.ts';
export * from './dbService.ts';
export * from './googleAuthService.ts';
export * from './githubService.ts';
export * from './componentLoader.ts';
export * from './taxonomyService.ts';
export * from './mocking/mockServer.ts';
export * from './mocking/db.ts';
export * from './profiling/performanceService.ts';
export * from './profiling/bundleAnalyzer.ts';
export * from './auditing/accessibilityService.ts';
export * from './security/staticAnalysisService.ts';
export * from './googleApiService.ts';
export * from './workspaceService.ts';
export * from './gcpService.ts';
export * from './workspaceConnectorService.ts';
export type { EncryptedData, GeneratedFile, StructuredPrSummary, StructuredExplanation, SemanticColorTheme, SecurityVulnerability, CodeSmell, CustomFeature, CronParts } from '../types.ts';

// --- AI Service Bridge ---
// This section acts as a facade to bridge old function-based imports
// with a new provider-based AI service architecture during a refactor.

import { GeminiProvider, IAiProvider } from './geminiService.ts';
import { getDecryptedCredential } from './vaultService.ts';
import { GoogleGenerativeAI, Part } from '@google/generative-ai'; // Corrected import for Google Generative AI client
import type { FunctionDeclaration } from '@google/generative-ai'; // Corrected import for Google Generative AI client

// Singleton provider instance logic to avoid re-initializing on every call
let provider: IAiProvider | null = null;
let providerPromise: Promise<IAiProvider> | null = null;

function getProvider(): Promise<IAiProvider> {
    if (provider) {
        return Promise.resolve(provider);
    }
    if (providerPromise) {
        return providerPromise;
    }
    providerPromise = (async () => {
        try {
            const apiKey = await getDecryptedCredential('gemini_api_key');
            if (!apiKey) {
                throw new Error("Vault is locked or Gemini API key is not configured.");
            }
            // GeminiProvider's constructor expects the API key string based on the error message.
            // The GoogleGenerativeAI client is likely instantiated within the GeminiProvider.
            provider = new GeminiProvider(apiKey);
            providerPromise = null; // Clear promise once resolved
            return provider;
        } catch (e) {
            providerPromise = null; // Reset on failure to allow retry
            throw e;
        }
    })();
    return providerPromise;
}

// --- AI Functions ---

export async function* streamContent(prompt: string | { parts: any[] }, systemInstruction: string, temperature = 0.5): AsyncGenerator<string> {
    const p = await getProvider();
    // streamContent expects separate arguments, not an object
    yield* p.streamContent(prompt, systemInstruction, temperature);
}

export async function generateContent(prompt: string, systemInstruction: string, temperature = 0.5): Promise<string> {
    const p = await getProvider();
    // generateContent expects separate arguments, not an object
    return p.generateContent(prompt, systemInstruction, temperature);
}

export async function generateJson<T>(prompt: any, systemInstruction: string, schema: any, temperature = 0.2): Promise<T> {
    const p = await getProvider();
    // generateJson expects separate arguments, not an object
    return p.generateJson<T>(prompt, systemInstruction, schema, temperature);
}

export async function* generateCommitMessageStream(diff: string): AsyncGenerator<string> {
    const prompt = `Generate a conventional commit message for the following diff:\n\n${diff}`;
    const systemInstruction = `You are an expert at writing conventional commit messages. Respond with only the commit message text, without any markdown formatting like backticks.`;
    yield* streamContent(prompt, systemInstruction, 0.5);
}

export async function* explainCodeStream(code: string): AsyncGenerator<string> {
    const prompt = `Explain this code snippet:\n\n${code}`;
    const systemInstruction = `You are an expert software engineer. Explain the provided code clearly and concisely.`;
    yield* streamContent(prompt, systemInstruction, 0.7);
}

export async function* generateRegExStream(description: string): AsyncGenerator<string> {
    const prompt = `Generate a JavaScript regular expression literal for the following description: ${description}`;
    const systemInstruction = `You are a regular expression expert. Respond with ONLY the regex literal (e.g., /.../flags).`;
    yield* streamContent(prompt, systemInstruction, 0.3);
}

export async function* generateUnitTestsStream(code: string): AsyncGenerator<string> {
    const prompt = `Generate unit tests for the following code using a popular testing framework like Jest or Vitest. Include necessary imports and setup.\n\n${code}`;
    const systemInstruction = `You are a testing expert. Provide a complete, runnable test file in a single markdown code block.`;
    yield* streamContent(prompt, systemInstruction, 0.5);
}

export async function* formatCodeStream(code: string): AsyncGenerator<string> {
    const prompt = `Format the following code according to modern best practices (similar to Prettier).\n\n${code}`;
    const systemInstruction = `You are a code formatter. Respond with ONLY the formatted code inside a single markdown code block.`;
    yield* streamContent(prompt, systemInstruction, 0.2);
}

export async function* generateComponentFromImageStream(base64Image: string): AsyncGenerator<string> {
    const prompt = { parts: [{ text: "Generate a React component with Tailwind CSS based on this screenshot." }, { inlineData: { mimeType: 'image/png', data: base64Image } as Part }] };
    const systemInstruction = `You are an expert React developer specializing in Tailwind CSS. Create a single-file component from the provided image. Respond with only the code in a markdown block.`;
    yield* streamContent(prompt, systemInstruction, 0.5);
}

export async function* transcribeAudioToCodeStream(base64Audio: string, mimeType: string): AsyncGenerator<string> {
    const prompt = { parts: [{ text: "Transcribe the following audio into a code snippet. The user is dictating code." }, { inlineData: { mimeType, data: base64Audio } as Part }] };
    const systemInstruction = `You are an expert at transcribing spoken code into text. Provide only the transcribed code in a markdown block.`;
    yield* streamContent(prompt, systemInstruction, 0.3);
}

export async function* transferCodeStyleStream({ code, styleGuide }: { code: string; styleGuide: string }): AsyncGenerator<string> {
    const prompt = `Rewrite the following code to match the provided style guide.\n\nCode:\n${code}\n\nStyle Guide:\n${styleGuide}`;
    const systemInstruction = `You are an expert at refactoring code to match style guides. Provide only the rewritten code in a markdown block.`;
    yield* streamContent(prompt, systemInstruction, 0.3);
}

export async function* generateCodingChallengeStream(topic: string | null): AsyncGenerator<string> {
    const prompt = `Generate a unique, new coding challenge. ${topic ? `The topic should be: ${topic}.` : ''}`;
    const systemInstruction = `You are a coding challenge generator. Provide a problem description, examples, and constraints in markdown format.`;
    yield* streamContent(prompt, systemInstruction, 0.8);
}

export async function* reviewCodeStream(code: string, personality?: string): AsyncGenerator<string> {
    const prompt = `Review the following code for bugs, style issues, and potential improvements:\n\n${code}`;
    const systemInstruction = personality || `You are a senior software engineer providing a constructive code review.`;
    yield* streamContent(prompt, systemInstruction, 0.6);
}

export async function* generateChangelogFromLogStream(log: string): AsyncGenerator<string> {
    const prompt = `Generate a formatted markdown changelog from this git log output:\n\n${log}`;
    const systemInstruction = `You are an expert at creating release notes. Group changes by type (e.g., Features, Fixes).`;
    yield* streamContent(prompt, systemInstruction, 0.5);
}

export async function* enhanceSnippetStream(code: string): AsyncGenerator<string> {
    const prompt = `Enhance this code snippet by adding comments, improving variable names, and adding error handling if applicable:\n\n${code}`;
    const systemInstruction = `You are a senior developer that improves code snippets. Respond with only the enhanced code in a markdown block.`;
    yield* streamContent(prompt, systemInstruction, 0.5);
}

export async function* summarizeNotesStream(notes: string): AsyncGenerator<string> {
    const prompt = `Summarize the key points and action items from these notes:\n\n${notes}`;
    const systemInstruction = `You are an expert at summarizing meeting notes. Provide a concise summary in markdown.`;
    yield* streamContent(prompt, systemInstruction, 0.6);
}

export async function* migrateCodeStream(code: string, from: string, to: string): AsyncGenerator<string> {
    const prompt = `Translate the following code from ${from} to ${to}:\n\n${code}`;
    const systemInstruction = `You are an expert at code migration. Provide only the translated code in a markdown block.`;
    yield* streamContent(prompt, systemInstruction, 0.3);
}

export async function* analyzeConcurrencyStream(code: string): AsyncGenerator<string> {
    const prompt = `Analyze this JavaScript code for potential concurrency issues related to Web Workers, such as race conditions or deadlocks. Provide a detailed explanation and suggested fixes.\n\n${code}`;
    const systemInstruction = `You are a concurrency expert specializing in browser JavaScript.`;
    yield* streamContent(prompt, systemInstruction, 0.6);
}

export async function* debugErrorStream(error: Error): AsyncGenerator<string> {
    const prompt = `I encountered an error in my application. Here is the error message and stack trace. Please explain what might be wrong and suggest debugging steps.\n\nError: ${error.message}\n\nStack Trace:\n${error.stack}`;
    const systemInstruction = `You are an expert debugger. Provide a helpful, step-by-step guide to resolving the user's error.`;
    yield* streamContent(prompt, systemInstruction, 0.6);
}

export async function* convertJsonToXbrlStream(json: string): AsyncGenerator<string> {
    const prompt = `Convert the following JSON data into a simplified, XBRL-like XML format. Use meaningful tags based on the JSON keys.\n\n${json}`;
    const systemInstruction = `You are an expert in data formats. Respond with only the generated XML in a markdown code block.`;
    yield* streamContent(prompt, systemInstruction, 0.3);
}

export async function explainCodeStructured(code: string): Promise<StructuredExplanation> {
    const prompt = `Analyze this code and provide a structured explanation.\n\n${code}`;
    // Replaced Type.X with string literals as Type is not imported/defined
    const schema = { type: 'object', properties: { summary: { type: 'string' }, lineByLine: { type: 'array', items: { type: 'object', properties: { lines: { type: 'string' }, explanation: { type: 'string' } } } }, complexity: { type: 'object', properties: { time: { type: 'string' }, space: { type: 'string' } } }, suggestions: { type: 'array', items: { type: 'string' } } } };
    return generateJson(prompt, "You are an expert code analyst that returns data in JSON format.", schema);
}

export async function generatePrSummaryStructured(diff: string): Promise<StructuredPrSummary> {
    const prompt = `Generate a structured PR summary for this diff:\n\n${diff}`;
    // Replaced Type.X with string literals
    const schema = { type: 'object', properties: { title: { type: 'string' }, summary: { type: 'string' }, changes: { type: 'array', items: { type: 'string' } } } };
    return generateJson(prompt, "You generate structured PR summaries in JSON format.", schema);
}

export async function generateMermaidJs(code: string): Promise<string> {
    const prompt = `Generate a Mermaid.js flowchart diagram representing the logic of this code:\n\n${code}`;
    const systemInstruction = `You are a Mermaid.js expert. Respond with ONLY the Mermaid code inside a single markdown block.`;
    return generateContent(prompt, systemInstruction, 0.3);
}

export async function suggestA11yFix(issue: any): Promise<string> {
    const prompt = `For the accessibility issue described by this JSON, suggest a code fix:\n\n${JSON.stringify(issue, null, 2)}`;
    const systemInstruction = `You are an accessibility expert. Provide a concise suggestion and a code example.`;
    return generateContent(prompt, systemInstruction, 0.4);
}

export async function generateCiCdConfig(platform: string, description: string): Promise<string> {
    const prompt = `Generate a CI/CD configuration file for ${platform} that does the following: ${description}`;
    const systemInstruction = `You are a DevOps expert. Provide a complete, valid configuration file in a single markdown code block.`;
    return generateContent(prompt, systemInstruction, 0.3);
}

export async function generateColorPalette(baseColor: string): Promise<{ colors: string[] }> {
    const prompt = `Generate a 6-color UI palette from the base color ${baseColor}.`;
    // Replaced Type.X with string literals
    const schema = { type: 'object', properties: { colors: { type: 'array', items: { type: 'string' } } } };
    return generateJson(prompt, "You are a UI design expert. Return a JSON object with a 'colors' array of 6 hex codes.", schema, 0.8);
}

export async function generateCronFromDescription(description: string): Promise<CronParts> {
    const prompt = `Convert this description to a cron expression parts: "${description}"`;
    // Replaced Type.X with string literals
    const schema = { type: 'object', properties: { minute: { type: 'string' }, hour: { type: 'string' }, dayOfMonth: { type: 'string' }, month: { type: 'string' }, dayOfWeek: { type: 'string' } } };
    return generateJson(prompt, "You are a cron job expert. You return a JSON object with the parts of a cron expression.", schema, 0.2);
}

export async function generateTerraformConfig(cloud: 'aws' | 'gcp', description: string, context: string): Promise<string> {
    const prompt = `Generate a Terraform configuration for ${cloud} to provision the following infrastructure: ${description}. Additional context: ${context}`;
    const systemInstruction = `You are an expert in Infrastructure as Code. Provide a complete, valid Terraform (.tf) file in a single markdown block.`;
    return generateContent(prompt, systemInstruction, 0.4);
}

export async function generateSemanticTheme(prompt: { parts: any[] }): Promise<SemanticColorTheme> {
    // Replaced Type.X with string literals
    const schema = { type: 'object', properties: { mode: { type: 'string', enum: ['light', 'dark'] }, palette: { type: 'object', properties: { primary: { type: 'object', properties: { value: { type: 'string' }, name: { type: 'string' } } }, secondary: { type: 'object', properties: { value: { type: 'string' }, name: { type: 'string' } } }, accent: { type: 'object', properties: { value: { type: 'string' }, name: { type: 'string' } } }, neutral: { type: 'object', properties: { value: { type: 'string' }, name: { type: 'string' } } } } }, theme: { type: 'object', properties: { background: { type: 'object', properties: { value: { type: 'string' }, name: { type: 'string' } } }, surface: { type: 'object', properties: { value: { type: 'string' }, name: { type: 'string' } } }, textPrimary: { type: 'object', properties: { value: { type: 'string' }, name: { type: 'string' } } }, textSecondary: { type: 'object', properties: { value: { type: 'string' }, name: { type: 'string' } } }, textOnPrimary: { type: 'object', properties: { value: { type: 'string' }, name: { type: 'string' } } }, border: { type: 'object', properties: { value: { type: 'string' }, name: { type: 'string' } } } } }, accessibility: { type: 'object', properties: { primaryOnSurface: { type: 'object', properties: { ratio: { type: 'number' }, score: { type: 'string' } } }, textPrimaryOnSurface: { type: 'object', properties: { ratio: { type: 'number' }, score: { type: 'string' } } }, textSecondaryOnSurface: { type: 'object', properties: { ratio: { type: 'number' }, score: { type: 'string' } } }, textOnPrimaryOnPrimary: { type: 'object', properties: { ratio: { type: 'number' }, score: { type: 'string' } } } } } } };
    return generateJson(prompt, "You are a UI/UX designer specializing in color theory and accessibility. Generate a complete theme based on the user's prompt, adhering to the provided JSON schema.", schema, 0.8);
}

export async function generateWeeklyDigest(commitLogs: string, telemetry: object): Promise<string> {
    const prompt = `Generate a weekly project digest email in HTML format. Use this week's commit logs and telemetry data.\n\nCommits:\n${commitLogs}\n\nTelemetry:\n${JSON.stringify(telemetry, null, 2)}`;
    const systemInstruction = `You are an engineering manager writing a weekly update email. The output must be a single block of well-formatted HTML.`;
    return generateContent(prompt, systemInstruction, 0.7);
}

export async function analyzePerformanceTrace(traceData: any): Promise<string> {
    const prompt = `Analyze this performance data (either a runtime trace or bundle stats) and provide optimization suggestions.\n\nData:\n${JSON.stringify(traceData, null, 2)}`;
    const systemInstruction = `You are a web performance expert. Provide actionable advice in markdown format.`;
    return generateContent(prompt, systemInstruction, 0.5);
}

// Pruned the re-export list to only include members that exist in './aiService'
export { getInferenceFunction, generateImageFromImageAndText, analyzeCodeForVulnerabilities, detectCodeSmells, generateTagsForCode, generateFeature, generateFullStackFeature, generateAppFeatureComponent, generatePipelineCode, generateTechnicalSpecFromDiff, generateMockData } from './aiService';
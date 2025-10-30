
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

// --- Type Re-exports for external consumption ---
export type { EncryptedData, GeneratedFile, StructuredPrSummary, StructuredExplanation, SemanticColorTheme, SecurityVulnerability, CodeSmell, CustomFeature, CronParts } from '../types.ts';

// --- IAiProvider Definition ---
// This interface defines the contract for AI providers in the new architecture.
// It is defined here to resolve compilation errors within this file and make it available
// via the services barrel, assuming it's not properly exported elsewhere yet during refactor.
// Ideally, this interface would reside in a shared interfaces/types file (e.g., ai-engine/interfaces/i-ai-provider.ts).
export interface IAiProvider {
    streamContent(prompt: string | { parts: any[] }, systemInstruction: string, temperature?: number): AsyncGenerator<string>;
    generateContent(prompt: string, systemInstruction: string, temperature?: number): Promise<string>;
    generateJson<T>(prompt: any, systemInstruction: string, schema: any, temperature?: number): Promise<T>;
    // Add other methods here if they are consistently part of the AI provider contract
}


// --- Local Type Imports for internal use in index.ts ---
import type { StructuredExplanation, StructuredPrSummary, CronParts, SemanticColorTheme } from '../types.ts';
import type { ICommand } from './aiService'; // Assuming ICommand is a type/interface from aiService.ts

// --- AI Service Bridge ---
// This section acts as a facade to bridge old function-based imports
// with a new provider-based AI service architecture during a refactor.

import { GeminiProvider } from './geminiService.ts'; // GeminiProvider should implement IAiProvider
import { getDecryptedCredential } from './vaultService.ts';
// Corrected import for Google Generative AI client (using 'google-generative-ai' package)
import { GoogleGenerativeAI, Part, FunctionDeclaration } from 'google-generative-ai';

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
            // GeminiProvider's constructor expects the API key string.
            // It is expected to implement the IAiProvider interface.
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
    yield* p.streamContent(prompt, systemInstruction, temperature);
}

export async function generateContent(prompt: string, systemInstruction: string, temperature = 0.5): Promise<string> {
    const p = await getProvider();
    return p.generateContent(prompt, systemInstruction, temperature);
}

export async function generateJson<T>(prompt: any, systemInstruction: string, schema: any, temperature = 0.2): Promise<T> {
    const p = await getProvider();
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
    const schema = { type: 'object', properties: { summary: { type: 'string' }, lineByLine: { type: 'array', items: { type: 'object', properties: { lines: { type: 'string' }, explanation: { type: 'string' } } } }, complexity: { type: 'object', properties: { time: { type: 'string' }, space: { type: 'string' } } }, suggestions: { type: 'array', items: { type: 'string' } } } };
    return generateJson(prompt, "You are an expert code analyst that returns data in JSON format.", schema);
}

export async function generatePrSummaryStructured(diff: string): Promise<StructuredPrSummary> {
    const prompt = `Generate a structured PR summary for this diff:\n\n${diff}`;
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

/**
 * Generates a complete semantic color theme based on a base color, suitable for UI applications.
 * This function now leverages the more comprehensive `generateSemanticTheme` to return a full theme object.
 */
export async function generateColorPalette(baseColor: string): Promise<SemanticColorTheme> {
    const promptParts = [
        { text: `Generate a complete semantic color theme (prioritize light mode, but infer dark mode if ${baseColor} suggests it) including a 4-color palette, derived from the base color ${baseColor}. Ensure accessibility ratios are good.` },
    ];
    // Call generateSemanticTheme which already has the complex schema and handles JSON generation.
    return generateSemanticTheme({ parts: promptParts });
}

export async function generateCronFromDescription(description: string): Promise<CronParts> {
    const prompt = `Convert this description to a cron expression parts: "${description}"`;
    const schema = { type: 'object', properties: { minute: { type: 'string' }, hour: { type: 'string' }, dayOfMonth: { type: 'string' }, month: { type: 'string' }, dayOfWeek: { type: 'string' } } };
    return generateJson(prompt, "You are a cron job expert. You return a JSON object with the parts of a cron expression.", schema, 0.2);
}

export async function generateTerraformConfig(cloud: 'aws' | 'gcp', description: string, context: string): Promise<string> {
    const prompt = `Generate a Terraform configuration for ${cloud} to provision the following infrastructure: ${description}. Additional context: ${context}`;
    const systemInstruction = `You are an expert in Infrastructure as Code. Provide a complete, valid Terraform (.tf) file in a single markdown block.`;
    return generateContent(prompt, systemInstruction, 0.4);
}

export async function generateSemanticTheme(prompt: { parts: any[] }): Promise<SemanticColorTheme> {
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

// --- Newly added AI stream/content generation functions ---

export async function* generateBugReproductionTestStream(bugDescription: string, code: string): AsyncGenerator<string> {
    const prompt = `Generate a reproduction test for the following bug:\n\nBug Description: ${bugDescription}\n\nRelated Code:\n${code}`;
    const systemInstruction = `You are an expert at writing minimal bug reproduction tests. Provide a complete, runnable test file in a single markdown code block.`;
    yield* streamContent(prompt, systemInstruction, 0.5);
}

// Adjusted signature for generateIamPolicyStream to match expected usage (2 arguments)
export async function* generateIamPolicyStream(policyDescription: string, targetPlatform: string): AsyncGenerator<string> {
    const prompt = `Generate an IAM policy described as: "${policyDescription}". The policy should be applicable to the ${targetPlatform} cloud platform.`;
    const systemInstruction = `You are a security expert. Provide the IAM policy in YAML or JSON format inside a markdown block.`;
    yield* streamContent(prompt, systemInstruction, 0.4);
}

export async function* generateDockerfileStream(framework: string): AsyncGenerator<string> {
    const prompt = `Generate a Dockerfile for a ${framework} application.`;
    const systemInstruction = `You are an expert DevOps engineer specializing in Docker. Provide a complete, valid Dockerfile in a single markdown code block.`;
    yield* streamContent(prompt, systemInstruction, 0.4);
}

export async function* refactorForPerformance(code: string): AsyncGenerator<string> {
    const prompt = `Refactor the following code for optimal performance:\n\n${code}`;
    const systemInstruction = `You are an expert at optimizing code. Respond with only the refactored code in a markdown block.`;
    yield* streamContent(prompt, systemInstruction, 0.5);
}

export async function* refactorForReadability(code: string): AsyncGenerator<string> {
    const prompt = `Refactor the following code for improved readability and maintainability:\n\n${code}`;
    const systemInstruction = `You are an expert at writing clean, readable code. Respond with only the refactored code in a markdown block.`;
    yield* streamContent(prompt, systemInstruction, 0.5);
}

export async function* generateJsDoc(code: string): AsyncGenerator<string> {
    const prompt = `Generate JSDoc comments for the following JavaScript/TypeScript code:\n\n${code}`;
    const systemInstruction = `You are an expert at generating comprehensive JSDoc. Respond with only the code including JSDoc comments in a markdown block.`;
    yield* streamContent(prompt, systemInstruction, 0.4);
}

export async function* convertToFunctionalComponent(code: string): AsyncGenerator<string> {
    const prompt = `Convert the following React class component to a functional component using hooks:\n\n${code}`;
    const systemInstruction = `You are an expert React developer. Respond with only the converted functional component code in a markdown block.`;
    yield* streamContent(prompt, systemInstruction, 0.5);
}

// Pruned the re-export list to only include members that exist in './aiService'
// and adjust types. Removed 'generateFile' and 'generateImage' due to errors indicating they don't exist.
export {
    getInferenceFunction,
    generateImageFromImageAndText,
    analyzeCodeForVulnerabilities,
    detectCodeSmells,
    generateTagsForCode,
    generateFeature,
    generateFullStackFeature,
    generateAppFeatureComponent,
    generatePipelineCode,
    generateTechnicalSpecFromDiff,
    generateMockData,
} from './aiService';

export type {
    ICommand // Re-export ICommand as a type
} from './aiService';

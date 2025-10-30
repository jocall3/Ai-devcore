/**
 * @file This file implements the AI Service module, providing a decoupled architecture for handling AI operations.
 * It uses a central provider (`GeminiProvider`) to interact with the AI model, which securely retrieves
 * credentials from the vault. All AI functionalities are exposed as exported functions.
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenerativeAI, FunctionDeclaration, Part, Tool } from "@google/genai";
import { logError } from './telemetryService.ts';
import { getDecryptedCredential } from './vaultService.ts';
import type { GeneratedFile, StructuredPrSummary, StructuredExplanation, SemanticColorTheme, SecurityVulnerability, CodeSmell, CustomFeature, CronParts } from '../types.ts';

// --- LOCAL INTERFACES FOR DECOUPLING DURING REFACTOR ---

export interface CommandResponse {
  text: string;
  functionCalls?: { name: string; args: any; }[];
}

export interface IAiProvider {
  streamContent(prompt: string | { parts: any[] }, systemInstruction: string, temperature: number): AsyncGenerator<string, void, unknown>;
  generateContent(prompt: string, systemInstruction: string, temperature: number): Promise<string>;
  generateJson<T>(prompt: any, systemInstruction: string, schema: any, temperature: number): Promise<T>;
  generateImage(prompt: string): Promise<string>;
  generateImageFromImageAndText(prompt: string, base64Image: string, mimeType: string): Promise<string>;
  getInferenceFunction(prompt: string, functionDeclarations: FunctionDeclaration[], knowledgeBase: string): Promise<CommandResponse>;
}

//==============================================================================
// 1. PROVIDER IMPLEMENTATION (GEMINI)
//==============================================================================

class GeminiProvider implements IAiProvider {
  private ai: GoogleGenerativeAI | null = null;
  private lastUsedApiKey: string | null = null;

  private async getAiClient(): Promise<GoogleGenerativeAI> {
    const apiKey = await getDecryptedCredential('gemini_api_key');
    if (!apiKey) {
      throw new Error("Google Gemini API key not found or vault is locked. Please add it in the Workspace Connector Hub.");
    }

    if (!this.ai || apiKey !== this.lastUsedApiKey) {
      this.lastUsedApiKey = apiKey;
      this.ai = new GoogleGenerativeAI(apiKey);
    }
    return this.ai;
  }

  async *streamContent(prompt: string | { parts: any[] }, systemInstruction: string, temperature: number): AsyncGenerator<string, void, unknown> {
    const aiClient = await this.getAiClient();
    const model = aiClient.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction });
    const contents = typeof prompt === 'string' ? [{ role: 'user', parts: [{ text: prompt }] }] : [{ role: 'user', parts: prompt.parts as Part[] }];
    const result = await model.generateContentStream({ contents, generationConfig: { temperature } });
    for await (const chunk of result.stream) {
      yield chunk.text() ?? '';
    }
  }

  async generateContent(prompt: string, systemInstruction: string, temperature: number): Promise<string> {
    const aiClient = await this.getAiClient();
    const model = aiClient.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction });
    const result = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature } });
    return result.response.text();
  }

  async generateJson<T>(prompt: any, systemInstruction: string, schema: any, temperature: number): Promise<T> {
    const aiClient = await this.getAiClient();
    const model = aiClient.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction });
    const tools: Tool[] = [{ functionDeclarations: [{ name: 'json_output', description: 'Outputs structured data.', parameters: schema }] }];
    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: typeof prompt === 'string' ? prompt : JSON.stringify(prompt) }] }],
        tools,
        toolConfig: { functionCallingConfig: { mode: 'ONE_CALL', allowedFunctionNames: ['json_output'] } },
        generationConfig: { temperature, responseMimeType: 'application/json' }
    });
    const call = result.response.functionCalls()?.[0];
    if (call?.args) {
        return call.args as T;
    }
     try {
      const textResponse = result.response.text();
      return JSON.parse(textResponse);
    } catch (e) {
      logError(e as Error, { context: 'Gemini JSON fallback parsing', response: result.response.text() });
      throw new Error('AI did not return a valid JSON object.');
    }
  }

  async generateImage(prompt: string): Promise<string> {
    const msg = "Image generation is not implemented in this provider.";
    logError(new Error(msg), { prompt });
    throw new Error(msg);
  }

  async generateImageFromImageAndText(prompt: string, base64Image: string, mimeType: string): Promise<string> {
    const aiClient = await this.getAiClient();
    const model = aiClient.getGenerativeModel({ model: "gemini-1.5-flash" });
    const imagePart: Part = { inlineData: { mimeType, data: base64Image } };
    const result = await model.generateContent([prompt, imagePart]);
    return result.response.text();
  }

  async getInferenceFunction(prompt: string, functionDeclarations: FunctionDeclaration[], knowledgeBase: string): Promise<CommandResponse> {
    const aiClient = await this.getAiClient();
    const systemInstruction = `You are a helpful assistant for a developer tool. You must decide which function to call to satisfy the user's request, based on your knowledge base. If no specific tool seems appropriate, respond with text.\n\nKnowledge Base:\n${knowledgeBase}`;
    const model = aiClient.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction, tools: [{ functionDeclarations }] });
    const result = await model.generateContent(prompt);
    const response = result.response;
    const functionCalls = response.functionCalls()?.map(call => ({ name: call.name, args: call.args }));
    return { text: response.text(), functionCalls: functionCalls && functionCalls.length > 0 ? functionCalls : undefined };
  }
}

let providerInstance: IAiProvider | null = null;
const getProvider = (): IAiProvider => {
    if (!providerInstance) {
        providerInstance = new GeminiProvider();
    }
    return providerInstance;
};

//==============================================================================
// 2. EXPORTED AI FUNCTIONS
//==============================================================================

// --- Core Methods ---
export const streamContent = (prompt: string | { parts: any[] }, systemInstruction: string, temperature = 0.5) => getProvider().streamContent(prompt, systemInstruction, temperature);
export const generateContent = (prompt: string, systemInstruction: string, temperature = 0.5) => getProvider().generateContent(prompt, systemInstruction, temperature);
export const generateJson = <T>(prompt: any, systemInstruction: string, schema: any, temperature = 0.2) => getProvider().generateJson<T>(prompt, systemInstruction, schema, temperature);

// --- Streaming Functions ---
export const generateCommitMessageStream = (diff: string) => streamContent(`Generate a conventional commit message for this diff:\n\n${diff}`, 'You are an expert at writing conventional commit messages.');
export const generateUnitTestsStream = (code: string) => streamContent(`Generate unit tests for this code using a popular testing framework like Jest or Vitest:\n\n${code}`, 'You are an expert test engineer. Respond with only the code in a markdown block.');
export const generateChangelogFromLogStream = (log: string) => streamContent(`Generate a formatted changelog in Markdown from this git log output:\n\n${log}`, 'You are an expert at writing release notes and changelogs.');
export const analyzeConcurrencyStream = (code: string) => streamContent(`Analyze this JavaScript code for potential Web Worker concurrency issues like race conditions or deadlocks. Explain the issues and suggest solutions.\n\n${code}`, 'You are an expert in concurrent programming and JavaScript Web Workers.');
export const debugErrorStream = (error: Error) => streamContent(`Given this error, provide a likely cause and a solution. Error: ${error.message}\nStack Trace:\n${error.stack || 'Not available'}`, 'You are an expert debugger.');
export const generateIamPolicyStream = (resource: string, actions: string[], context: string) => streamContent(`Generate a ${context.toUpperCase()} IAM policy for this requirement: "${resource}" with actions like [${actions.join(', ')}]`, 'You are a cloud security expert. Respond with only the JSON policy in a markdown block.');
export const generateRegExStream = (prompt: string) => streamContent(`Generate a single regex literal for: ${prompt}`, 'You are a regex expert. Respond with ONLY the regex literal, e.g., /.../g');
export const formatCodeStream = (code: string) => streamContent(`Format this code according to modern best practices (like Prettier):\n\n${code}`, 'You are a code formatter. Respond with only the formatted code inside a markdown block.');
export const transferCodeStyleStream = (options: { code: string; styleGuide: string; }) => streamContent(`Rewrite this code:\n\n\`\`\`\n${options.code}\n\`\`\`\n\nTo match this style guide:\n${options.styleGuide}`, 'You are a code formatter. Respond with only the rewritten code inside a markdown block.');
export const generateCodingChallengeStream = (topic: string | null) => streamContent(`Generate a unique, new coding challenge. ${topic ? `The topic should be: ${topic}` : ''}`, 'You are a programming instructor creating coding challenges.');

// --- Promise-Based Functions ---
export const explainCodeStructured = (code: string): Promise<StructuredExplanation> => generateJson(code, `You are an expert code explainer. Analyze the provided code snippet and return a structured explanation in JSON format.`, { type: "object", properties: { summary: { type: "string" }, lineByLine: { type: "array", items: { type: "object", properties: { lines: { type: "string" }, explanation: { type: "string" } } } }, complexity: { type: "object", properties: { time: { type: "string" }, space: { type: "string" } } }, suggestions: { type: "array", items: { type: "string" } } } });
export const generatePrSummaryStructured = (diff: string): Promise<StructuredPrSummary> => generateJson(`Generate a structured PR summary for this diff:\n\n${diff}`, 'You are an expert at writing PR summaries. Respond in JSON with title, summary, and a changes array.', { type: "object", properties: { title: { type: "string" }, summary: { type: "string" }, changes: { type: "array", items: { type: "string" } } } });
export const generateSemanticTheme = (prompt: { parts: any[] }): Promise<SemanticColorTheme> => generateJson(prompt, 'You are a UI/UX designer specializing in color theory and accessibility. Generate a complete theme based on the user\'s prompt, adhering to the provided JSON schema.', { type: "object", properties: { mode: { type: "string", enum: ['light', 'dark'] }, palette: { type: "object", properties: { primary: { type: "object", properties: { value: { type: "string" }, name: { type: "string" } } }, secondary: { type: "object", properties: { value: { type: "string" }, name: { type: "string" } } }, accent: { type: "object", properties: { value: { type: "string" }, name: { type: "string" } } }, neutral: { type: "object", properties: { value: { type: "string" }, name: { type: "string" } } } } }, theme: { type: "object", properties: { background: { type: "object", properties: { value: { type: "string" }, name: { type: "string" } } }, surface: { type: "object", properties: { value: { type: "string" }, name: { type: "string" } } }, textPrimary: { type: "object", properties: { value: { type: "string" }, name: { type: "string" } } }, textSecondary: { type: "object", properties: { value: { type: "string" }, name: { type: "string" } } }, textOnPrimary: { type: "object", properties: { value: { type: "string" }, name: { type: "string" } } }, border: { type: "object", properties: { value: { type: "string" }, name: { type: "string" } } } } }, accessibility: { type: "object", properties: { primaryOnSurface: { type: "object", properties: { ratio: { type: "number" }, score: { type: "string" } } }, textPrimaryOnSurface: { type: "object", properties: { ratio: { type: "number" }, score: { type: "string" } } }, textSecondaryOnSurface: { type: "object", properties: { ratio: { type: "number" }, score: { type: "string" } } }, textOnPrimaryOnPrimary: { type: "object", properties: { ratio: { type: "number" }, score: { type: "string" } } } } } } });
export const generateCronFromDescription = (description: string): Promise<CronParts> => generateJson(`Generate a cron expression for: "${description}"`, 'You are a cron expert. Respond with a JSON object containing minute, hour, dayOfMonth, month, and dayOfWeek.', { type: "object", properties: { minute: { type: "string" }, hour: { type: "string" }, dayOfMonth: { type: "string" }, month: { type: "string" }, dayOfWeek: { type: "string" } } });
export const generateColorPalette = (baseColor: string): Promise<any> => generateJson(`Generate a semantic color theme based on the color ${baseColor}`, 'You are a UI designer specializing in accessible color palettes. Respond with a JSON object matching the SemanticColorTheme structure.', {});
export const generateMockData = (schema: string, count: number): Promise<any[]> => generateJson(`Generate an array of ${count} mock objects that match this schema: "${schema}"`, 'You are a mock data generator. Respond with only a JSON array of objects.', { type: "array", items: { type: "object" } });
export const analyzeCodeForVulnerabilities = (code: string): Promise<SecurityVulnerability[]> => generateJson(`Analyze this code for security vulnerabilities. For each vulnerability, describe it, rate its severity, and suggest a mitigation.\n\n${code}`, 'You are a security expert. Respond with a JSON array of vulnerability objects.', { type: 'array', items: { type: 'object' } });
export const detectCodeSmells = (code: string): Promise<CodeSmell[]> => generateJson(`Analyze this code for code smells like long methods, large classes, duplicated code, etc. For each smell, identify the line number and explain it.\n\n${code}`, 'You are a code quality expert. Respond with a JSON array of code smell objects.', { type: 'array', items: { type: 'object' } });
export const generateAppFeatureComponent = (prompt: string): Promise<Omit<CustomFeature, 'id'>> => generateJson(`Generate a new single-file React feature component for an application based on this prompt: "${prompt}". Respond with a JSON object containing 'name', 'description', 'icon' (a valid name from heroicons), and the full 'code' for the component.`, 'You are a full-stack software engineer. Respond with a JSON object containing the feature details.', { type: 'object' });
export const generateTechnicalSpecFromDiff = (diff: string, summary: StructuredPrSummary): Promise<string> => generateContent(`Generate a technical specification document in Markdown based on this PR summary and diff.\n\nSummary:\n${JSON.stringify(summary)}\n\nDiff:\n${diff}`, 'You are a senior technical writer.');
export const generateFeature = (prompt: string, framework: string, styling: string): Promise<GeneratedFile[]> => generateJson(`Generate a new feature for a ${framework} and ${styling} application. The feature is: "${prompt}". Respond with an array of file objects, each with filePath and content.`, 'You are a full-stack software engineer. You must respond with a JSON array of file objects.', { type: 'array', items: { type: 'object' } });
export const generateFullStackFeature = (prompt: string, framework: string, styling: string): Promise<GeneratedFile[]> => generateJson(`Generate a new full-stack feature. The frontend is ${framework} with ${styling}. The backend is a single Google Cloud Function with Firestore. The feature is: "${prompt}". Respond with an array of file objects, each with filePath and content.`, 'You are a full-stack software engineer specializing in GCP. You must respond with a JSON array of file objects.', { type: 'array', items: { type: 'object' } });
export const generatePipelineCode = (flowDescription: string): Promise<string> => generateContent(`Generate a JavaScript async function that implements this logical flow:\n\n${flowDescription}`, 'You are a senior software engineer. Respond with only the JavaScript code in a markdown block.');
export const analyzePerformanceTrace = (trace: any): Promise<string> => generateContent(`Analyze this performance trace and suggest optimizations. Trace:\n\n${JSON.stringify(trace, null, 2)}`, 'You are a performance optimization expert.');
export const suggestA11yFix = (issue: any): Promise<string> => generateContent(`Given this accessibility issue found by axe-core, suggest a solution with a code example:\n\n${JSON.stringify(issue, null, 2)}`, 'You are an accessibility expert.');

// Add other specific, non-streaming functions here...

const aiService = {
  streamContent,
  generateContent,
  generateJson,
  generateCommitMessageStream,
  generateUnitTestsStream,
  generateChangelogFromLogStream,
  analyzeConcurrencyStream,
  debugErrorStream,
  generateIamPolicyStream,
  generateRegExStream,
  formatCodeStream,
  transferCodeStyleStream,
  generateCodingChallengeStream,
  explainCodeStructured,
  generatePrSummaryStructured,
  generateSemanticTheme,
  generateCronFromDescription,
  generateColorPalette,
  generateMockData,
  analyzeCodeForVulnerabilities,
  detectCodeSmells,
  generateAppFeatureComponent,
  generateTechnicalSpecFromDiff,
  generateFeature,
  generateFullStackFeature,
  generatePipelineCode,
  analyzePerformanceTrace,
  suggestA11yFix,
  // Add other functions to this object
};

export default aiService;

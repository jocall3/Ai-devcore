```typescript
/**
 * @file This file implements the AI Service module, providing a decoupled architecture for handling AI operations.
 * It uses a central provider (`GeminiProvider`) to interact with the AI model, which securely retrieves
 * credentials from the vault. All AI functionalities are exposed as exported functions.
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenerativeAI, FunctionDeclaration, Part, Tool } from "@google/generative-ai";
import { FunctionDeclarationSchemaType } from "@google/generative-ai/server";
import { logError } from './telemetryService.ts';
import { getDecryptedCredential } from './vaultService.ts';
import type { GeneratedFile, StructuredPrSummary, StructuredExplanation, SemanticColorTheme, SecurityVulnerability, CodeSmell, CustomFeature } from '../types.ts';

export interface CronParts {
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
}

export interface ICommand {
  text: string;
  functionCalls?: { name: string; args: any; }[];
}

export interface IAiProvider {
  streamContent(prompt: string | { parts: any[] }, systemInstruction: string, temperature: number): AsyncGenerator<string, void, unknown>;
  generateContent(prompt: string, systemInstruction: string, temperature: number): Promise<string>;
  generateJson<T>(prompt: any, systemInstruction: string, schema: any, temperature: number): Promise<T>;
  generateImage(prompt: string): Promise<string>;
  generateImageFromImageAndText(prompt: string, base64Image: string, mimeType: string): Promise<string>;
  getInferenceFunction(prompt: string, functionDeclarations: FunctionDeclaration[], knowledgeBase: string): Promise<ICommand>;
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
      this.ai = new GoogleGenerativeAI({ apiKey }); // Corrected constructor call for @google/generative-ai
    }
    return this.ai;
  }

  async *streamContent(prompt: string | { parts: any[] }, systemInstruction: string, temperature: number): AsyncGenerator<string, void, unknown> {
    const aiClient = await this.getAiClient();
    const model = aiClient.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction });
    const contents = typeof prompt === 'string' ? [{ role: 'user', parts: [{ text: prompt }] }] : [{ role: 'user', parts: prompt.parts }];
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
    const result = await model.generateContent({ 
        contents: [{ role: 'user', parts: [{ text: typeof prompt === 'string' ? prompt : JSON.stringify(prompt) }] }],
        tools: [{ functionDeclarations: [{ name: 'json_output', description: 'Outputs structured data.', parameters: schema }] }],
        toolConfig: { functionCallingConfig: { mode: 'ONE_CALL', allowedFunctionNames: ['json_output'] } },
        generationConfig: { temperature }
    });
    const call = result.response.functionCalls()?.[0];
    if (call?.args) {
        return call.args as T;
    }
    throw new Error('AI did not return a valid JSON object in a function call.');
  }
  
  async generateImage(prompt: string): Promise<string> {
    const aiClient = await this.getAiClient();
    const model = aiClient.getGenerativeModel({ model: 'imagen-3.0-generate-001' });
    const result = await model.generateContent(prompt);
    const image = result.response.candidates?.[0]?.content.parts[0];
    if (image && 'inlineData' in image && image.inlineData) {
        return `data:${image.inlineData.mimeType};base64,${image.inlineData.data}`;
    }
    throw new Error('Image generation failed to return an image.');
  }
  
  async generateImageFromImageAndText(prompt: string, base64Image: string, mimeType: string): Promise<string> {
    const aiClient = await this.getAiClient();
    const model = aiClient.getGenerativeModel({ model: 'imagen-3.0-generate-001' });
    const imagePart: Part = { inlineData: { mimeType, data: base64Image } };
    const result = await model.generateContent([prompt, imagePart]);
    const image = result.response.candidates?.[0]?.content.parts[0];
     if (image && 'inlineData' in image && image.inlineData) {
        return `data:${image.inlineData.mimeType};base64,${image.inlineData.data}`;
    }
    throw new Error('Image generation failed to return an image.');
  }
  
  async getInferenceFunction(prompt: string, functionDeclarations: FunctionDeclaration[], knowledgeBase: string): Promise<ICommand> {
    const aiClient = await this.getAiClient();
    const systemInstruction = `You are a helpful assistant for a developer tool. You must decide which function to call to satisfy the user's request, based on your knowledge base. If no specific tool seems appropriate, respond with text.\n\nKnowledge Base:\n${knowledgeBase}`;
    const model = aiClient.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction, tools: [{ functionDeclarations }] });
    const result = await model.generateContent(prompt);
    const response = result.response;
    const functionCalls = response.functionCalls()?.map(call => ({ name: call.name, args: call.args }));
    return { text: response.text(), functionCalls: functionCalls && functionCalls.length > 0 ? functionCalls : undefined };
  }
}

const provider = new GeminiProvider();

//==============================================================================
// 2. EXPORTED AI FUNCTIONS
//==============================================================================

// --- Core Streaming & Generation ---
export const streamContent = (prompt: string, systemInstruction: string, temperature = 0.5) => provider.streamContent(prompt, systemInstruction, temperature);
export const generateContent = (prompt: string, systemInstruction: string, temperature = 0.5) => provider.generateContent(prompt, systemInstruction, temperature);
export const generateJson = <T>(prompt: any, systemInstruction: string, schema: any, temperature = 0.2) => provider.generateJson<T>(prompt, systemInstruction, schema, temperature);

// --- Image Generation ---
export const generateImage = (prompt: string) => provider.generateImage(prompt);
export const generateImageFromImageAndText = (prompt: string, base64Image: string, mimeType: string) => provider.generateImageFromImageAndText(prompt, base64Image, mimeType);

// --- Function Calling ---
export const getInferenceFunction = (prompt: string, functionDeclarations: FunctionDeclaration[], knowledgeBase: string) => provider.getInferenceFunction(prompt, functionDeclarations, knowledgeBase);

// --- Streaming Functions ---
export const explainCodeStream = (code: string) => streamContent(`Explain this code snippet:\n\n\`\`\`\n${code}\n\`\`\``, 'You are an expert code explainer.');
export const generateRegExStream = (description: string) => streamContent(`Generate a single regex literal for: ${description}`, 'You are a regex expert. Respond with ONLY the regex literal, e.g., /.../g');
export const generateCommitMessageStream = (diff: string) => streamContent(`Generate a conventional commit message for this diff:\n\n${diff}`, 'You are an expert at writing conventional commit messages.');
export const generateUnitTestsStream = (code: string) => streamContent(`Generate unit tests for this code using a popular testing framework like Jest or Vitest:\n\n${code}`, 'You are an expert test engineer.');
export const formatCodeStream = (code: string) => streamContent(`Format this code according to modern best practices (like Prettier):\n\n${code}`, 'You are a code formatter. Respond with only the formatted code inside a markdown block.');
export const generateComponentFromImageStream = (base64Image: string) => provider.streamContent({ parts: [{ text: 'Generate a React component with Tailwind CSS based on this image.' }, { inlineData: { mimeType: 'image/png', data: base64Image } }] }, 'You are an expert React developer specializing in Tailwind CSS. Respond with only the code in a markdown block.', 0.2);
export const transcribeAudioToCodeStream = (base64Audio: string, mimeType: string) => provider.streamContent({ parts: [{ text: 'Transcribe the following audio into a functional code snippet. Infer the language and intent.' }, { inlineData: { mimeType, data: base64Audio } }] }, 'You are an expert programmer who can write code from spoken instructions.', 0.2);
export const transferCodeStyleStream = ({ code, styleGuide }: { code: string, styleGuide: string }) => streamContent(`Rewrite this code:\n\n\`\`\`\n${code}\n\`\`\`\n\nTo match this style guide:\n${styleGuide}`, 'You are a code formatter. Respond with only the rewritten code inside a markdown block.');
export const generateCodingChallengeStream = (topic: string | null) => streamContent(`Generate a unique, new coding challenge. ${topic ? `The topic should be: ${topic}` : ''}`, 'You are a programming instructor creating coding challenges.');
export const reviewCodeStream = (code: string, systemInstruction?: string) => streamContent(`Review this code for bugs, style issues, and performance improvements:\n\n${code}`, systemInstruction || 'You are a senior software engineer performing a helpful code review.');
export const generateChangelogFromLogStream = (log: string) => streamContent(`Generate a formatted changelog in Markdown from this git log output:\n\n${log}`, 'You are an expert at writing release notes and changelogs.');
export const enhanceSnippetStream = (code: string) => streamContent(`Enhance this code snippet by adding comments, improving variable names, and adding error handling:\n\n${code}`, 'You are a senior software engineer that improves code snippets.');
export const summarizeNotesStream = (notes: string) => streamContent(`Summarize the key points from these notes into a bulleted list:\n\n${notes}`, 'You are a note-taking assistant that provides concise summaries.');
export const migrateCodeStream = (code: string, from: string, to: string) => streamContent(`Migrate this code from ${from} to ${to}:\n\n\`\`\`\n${code}\n\`\`\``, `You are an expert code migrator. Respond with only the migrated code in a markdown block.`);
export const analyzeConcurrencyStream = (code: string) => streamContent(`Analyze this JavaScript code for potential Web Worker concurrency issues like race conditions or deadlocks. Explain the issues and suggest solutions.\n\n${code}`, 'You are an expert in concurrent programming and JavaScript Web Workers.');
export const debugErrorStream = (error: { message: string, stack?: string }) => streamContent(`Given this error, provide a likely cause and a solution. Error: ${error.message}\nStack Trace:\n${error.stack || 'Not available'}`, 'You are an expert debugger.');
export const refactorForPerformance = (code: string) => streamContent(`Refactor this code for better performance without changing its functionality:\n\n${code}`, 'You are an expert in code optimization. Respond with only the refactored code in a markdown block.');
export const refactorForReadability = (code: string) => streamContent(`Refactor this code for better readability and maintainability:\n\n${code}`, 'You are an expert in writing clean, readable code. Respond with only the refactored code in a markdown block.');
export const convertToFunctionalComponent = (code: string) => streamContent(`Convert this React class component to a functional component using hooks:\n\n${code}`, 'You are an expert React developer. Respond with only the refactored code in a markdown block.');
export const generateJsDoc = (code: string) => streamContent(`Add JSDoc comments to this code:\n\n${code}`, 'You are an expert in writing documentation. Respond with only the documented code in a markdown block.');
export const translateComments = (code: string, language: string) => streamContent(`Translate only the comments in this code to ${language}:\n\n${code}`, 'You are a code translator. Respond with only the code, with translated comments, in a markdown block.');
export const generateDockerfile = (framework: string) => streamContent(`Generate a production-ready, multi-stage Dockerfile for a ${framework} application.`, 'You are a DevOps expert. Respond with only the Dockerfile content in a markdown block.');
export const convertCssToTailwind = (css: string) => streamContent(`Convert the following CSS to Tailwind CSS classes. Provide the HTML structure with the classes applied.\n\n${css}`, 'You are an expert in Tailwind CSS. Respond with only the HTML and classes in a markdown block.');
export const applySpecificRefactor = (code: string, instruction: string) => streamContent(`Apply this refactoring to the code: "${instruction}".\n\nCode:\n${code}`, 'You are a senior software engineer. Respond with only the refactored code in a markdown block.');
export const generateBugReproductionTestStream = (stackTrace: string, context?: string) => streamContent(`Given this stack trace and code context, generate a failing unit test that reproduces the bug.\n\nStack Trace:\n${stackTrace}\n\nContext:\n${context || 'No additional context provided.'}`, 'You are an expert test engineer specializing in bug reproduction.');
export const generateIamPolicyStream = (description: string, platform: 'aws' | 'gcp') => streamContent(`Generate a ${platform.toUpperCase()} IAM policy for this requirement: "${description}"`, 'You are a cloud security expert. Respond with only the JSON policy in a markdown block.');
export const convertJsonToXbrlStream = (json: string) => streamContent(`Convert this JSON data into a simplified, human-readable XBRL-like XML format.\n\n${json}`, 'You are an expert in financial data formats. Respond with only the XML in a markdown block.');

// --- Promise-Based Functions ---
const jsonFromStream = async (stream: AsyncGenerator<string, void, unknown>) => {
    let fullResponse = '';
    for await (const chunk of stream) { fullResponse += chunk; }
    const jsonMatch = fullResponse.match(/```json\n?([\s\S]*?)\n?```/);
    try {
      return JSON.parse(jsonMatch ? jsonMatch[1] : fullResponse);
    } catch (e) {
      logError('Failed to parse JSON from stream', e, { fullResponse });
      throw new Error('Invalid JSON response from AI');
    }
};

export const explainCodeStructured = (code: string): Promise<StructuredExplanation> => generateJson(code, `You are an expert code explainer. Analyze the provided code snippet and return a structured explanation in JSON format.`, { type: FunctionDeclarationSchemaType.OBJECT, properties: { summary: { type: FunctionDeclarationSchemaType.STRING }, lineByLine: { type: FunctionDeclarationSchemaType.ARRAY, items: { type: FunctionDeclarationSchemaType.OBJECT, properties: { lines: { type: FunctionDeclarationSchemaType.STRING }, explanation: { type: FunctionDeclarationSchemaType.STRING } } } }, complexity: { type: FunctionDeclarationSchemaType.OBJECT, properties: { time: { type: FunctionDeclarationSchemaType.STRING }, space: { type: FunctionDeclarationSchemaType.STRING } } }, suggestions: { type: FunctionDeclarationSchemaType.ARRAY, items: { type: FunctionDeclarationSchemaType.STRING } } } });
export const generateMermaidJs = (code: string): Promise<string> => generateContent(`Generate a Mermaid.js flowchart diagram for this code:\n\n${code}`, 'You are a Mermaid.js expert. Respond with only the Mermaid code inside a markdown block.');
export const suggestA11yFix = (issue: any): Promise<string> => generateContent(`Given this accessibility issue found by axe-core, suggest a solution with a code example:\n\n${JSON.stringify(issue, null, 2)}`, 'You are an accessibility expert.');
export const generateFile = (prompt: string, framework: string, styling: string): Promise<GeneratedFile[]> => jsonFromStream(streamContent(`Generate a new file or set of files for a ${framework} and ${styling} application. The request is: "${prompt}". Respond with an array of file objects, each with filePath and content.`, 'You are a full-stack software engineer. You must respond with a JSON array of file objects.'));
export const generateFeature = (prompt: string, framework: string, styling: string): Promise<GeneratedFile[]> => jsonFromStream(streamContent(`Generate a new feature for a ${framework} and ${styling} application. The feature is: "${prompt}". Respond with an array of file objects, each with filePath and content.`, 'You are a full-stack software engineer. You must respond with a JSON array of file objects.'));
export const generateFullStackFeature = (prompt: string, framework: string, styling: string): Promise<GeneratedFile[]> => jsonFromStream(streamContent(`Generate a new full-stack feature. The frontend is ${framework} with ${styling}. The backend is a single Google Cloud Function with Firestore. The feature is: "${prompt}". Respond with an array of file objects, each with filePath and content.`, 'You are a full-stack software engineer specializing in GCP. You must respond with a JSON array of file objects.'));
export const generatePrSummaryStructured = (diff: string): Promise<StructuredPrSummary> => jsonFromStream(streamContent(`Generate a structured PR summary for this diff:\n\n${diff}`, 'You are an expert at writing PR summaries. Respond in JSON with title, summary, and a changes array.'));
export const generateTechnicalSpecFromDiff = (diff: string, summary: StructuredPrSummary): Promise<string> => generateContent(`Generate a technical specification document in Markdown based on this PR summary and diff.\n\nSummary:\n${JSON.stringify(summary)}\n\nDiff:\n${diff}`, 'You are a senior technical writer.');
export const generateSemanticTheme = (prompt: { parts: any[] }): Promise<SemanticColorTheme> => generateJson(prompt, 'You are a UI/UX designer. Generate a semantic color theme in JSON format based on the user request.', { type: FunctionDeclarationSchemaType.OBJECT, properties: { mode: { type: FunctionDeclarationSchemaType.STRING, enum: ['light', 'dark'] }, palette: { type: FunctionDeclarationSchemaType.OBJECT, properties: { primary: {type: FunctionDeclarationSchemaType.OBJECT, properties: {value: {type: FunctionDeclarationSchemaType.STRING}, name: {type: FunctionDeclarationSchemaType.STRING}}}, secondary: {type: FunctionDeclarationSchemaType.OBJECT, properties: {value: {type: FunctionDeclarationSchemaType.STRING}, name: {type: FunctionDeclarationSchemaType.STRING}}}, accent: {type: FunctionDeclarationSchemaType.OBJECT, properties: {value: {type: FunctionDeclarationSchemaType.STRING}, name: {type: FunctionDeclarationSchemaType.STRING}}}, neutral: {type: FunctionDeclarationSchemaType.OBJECT, properties: {value: {type: FunctionDeclarationSchemaType.STRING}, name: {type: FunctionDeclarationSchemaType.STRING}}} } }, theme: { type: FunctionDeclarationSchemaType.OBJECT, properties: { background: {type: FunctionDeclarationSchemaType.OBJECT, properties: {value: {type: FunctionDeclarationSchemaType.STRING}, name: {type: FunctionDeclarationSchemaType.STRING}}}, surface: {type: FunctionDeclarationSchemaType.OBJECT, properties: {value: {type: FunctionDeclarationSchemaType.STRING}, name: {type: FunctionDeclarationSchemaType.STRING}}}, textPrimary: {type: FunctionDeclarationSchemaType.OBJECT, properties: {value: {type: FunctionDeclarationSchemaType.STRING}, name: {type: FunctionDeclarationSchemaType.STRING}}}, textSecondary: {type: FunctionDeclarationSchemaType.OBJECT, properties: {value: {type: FunctionDeclarationSchemaType.STRING}, name: {type: FunctionDeclarationSchemaType.STRING}}}, textOnPrimary: {type: FunctionDeclarationSchemaType.OBJECT, properties: {value: {type: FunctionDeclarationSchemaType.STRING}, name: {type: FunctionDeclarationSchemaType.STRING}}}, border: {type: FunctionDeclarationSchemaType.OBJECT, properties: {value: {type: FunctionDeclarationSchemaType.STRING}, name: {type: FunctionDeclarationSchemaType.STRING}}} } }, accessibility: { type: FunctionDeclarationSchemaType.OBJECT, properties: { primaryOnSurface: { type: FunctionDeclarationSchemaType.OBJECT, properties: {ratio: {type: FunctionDeclarationSchemaType.NUMBER}, score: {type: FunctionDeclarationSchemaType.STRING}}}, textPrimaryOnSurface: { type: FunctionDeclarationSchemaType.OBJECT, properties: {ratio: {type: FunctionDeclarationSchemaType.NUMBER}, score: {type: FunctionDeclarationSchemaType.STRING}}}, textSecondaryOnSurface: { type: FunctionDeclarationSchemaType.OBJECT, properties: {ratio: {type: FunctionDeclarationSchemaType.NUMBER}, score: {type: FunctionDeclarationSchemaType.STRING}}}, textOnPrimaryOnPrimary: { type: FunctionDeclarationSchemaType.OBJECT, properties: {ratio: {type: FunctionDeclarationSchemaType.NUMBER}, score: {type: FunctionDeclarationSchemaType.STRING}}} } } } });
export const generateCronFromDescription = (description: string): Promise<CronParts> => generateJson(`Generate a cron expression for: "${description}"`, 'You are a cron expert. Respond with a JSON object containing minute, hour, dayOfMonth, month, and dayOfWeek.', { type: FunctionDeclarationSchemaType.OBJECT, properties: { minute: { type: FunctionDeclarationSchemaType.STRING }, hour: { type: FunctionDeclarationSchemaType.STRING }, dayOfMonth: { type: FunctionDeclarationSchemaType.STRING }, month: { type: FunctionDeclarationSchemaType.STRING }, dayOfWeek: { type: FunctionDeclarationSchemaType.STRING } } });
export const generateColorPalette = (baseColor: string): Promise<{colors: string[]}> => generateJson(`Generate a 6-color palette based on the color ${baseColor}`, 'You are a UI designer. Respond with a JSON object with a "colors" array of 6 hex codes.', { type: FunctionDeclarationSchemaType.OBJECT, properties: { colors: { type: FunctionDeclarationSchemaType.ARRAY, items: { type: FunctionDeclarationSchemaType.STRING } } } });
export const generateMockData = (schema: string, count: number): Promise<any[]> => generateJson(`Generate an array of ${count} mock objects that match this schema: "${schema}"`, 'You are a mock data generator. Respond with only a JSON array of objects.', { type: FunctionDeclarationSchemaType.ARRAY, items: { type: FunctionDeclarationSchemaType.OBJECT } });
export const analyzeCodeForVulnerabilities = (code: string): Promise<SecurityVulnerability[]> => jsonFromStream(streamContent(`Analyze this code for security vulnerabilities. For each vulnerability, describe it, rate its severity, and suggest a mitigation.\n\n${code}`, 'You are a security expert. Respond with a JSON array of vulnerability objects.'));
export const detectCodeSmells = (code: string): Promise<CodeSmell[]> => jsonFromStream(streamContent(`Analyze this code for code smells like long methods, large classes, duplicated code, etc. For each smell, identify the line number and explain it.\n\n${code}`, 'You are a code quality expert. Respond with a JSON array of code smell objects.'));
export const generateTagsForCode = (code: string): Promise<string[]> => generateJson(`Generate up to 5 relevant tags (keywords) for this code snippet:\n\n${code}`, 'You are a code tagging expert. Respond with a JSON array of strings.', { type: FunctionDeclarationSchemaType.ARRAY, items: { type: FunctionDeclarationSchemaType.STRING } });
export const generateTerraformConfig = (cloud: 'aws' | 'gcp', description: string, context: string): Promise<string> => generateContent(`Generate a Terraform configuration for ${cloud.toUpperCase()}.\nRequirement: "${description}"\nContext: "${context}"`, 'You are a DevOps expert specializing in Terraform. Respond with only the HCL code in a markdown block.');
export const generateWeeklyDigest = (commitLogs: string, telemetry: any): Promise<string> => generateContent(`Generate a weekly project digest email in HTML format. Use this data:\n\nCommit Logs:\n${commitLogs}\n\nTelemetry:\n${JSON.stringify(telemetry)}`, 'You are an expert at writing project summaries. Respond with only the HTML for an email.');
export const generateAppFeatureComponent = (prompt: string): Promise<Omit<CustomFeature, 'id'>> => jsonFromStream(streamContent(`Generate a new single-file React feature component for an application based on this prompt: "${prompt}". Respond with a JSON object containing 'name', 'description', 'icon' (a valid name from heroicons), and the full 'code' for the component.`, 'You are a full-stack software engineer. Respond with a JSON object containing the feature details.'));
export const generatePipelineCode = (flowDescription: string): Promise<string> => generateContent(`Generate a JavaScript async function that implements this logical flow:\n\n${flowDescription}`, 'You are a senior software engineer. Respond with only the JavaScript code in a markdown block.');
export const generateCiCdConfig = (platform: string, description: string): Promise<string> => generateContent(`Generate a CI/CD configuration file for ${platform} that does the following: ${description}`, `You are a DevOps expert specializing in ${platform}. Respond with only the YAML configuration in a markdown block.`);
export const analyzePerformanceTrace = (trace: any): Promise<string> => generateContent(`Analyze this performance trace and suggest optimizations. Trace:\n\n${JSON.stringify(trace, null, 2)}`, 'You are a performance optimization expert.');


export const aiService = {
  streamContent,
  generateContent,
  generateJson,
  generateImage,
  generateImageFromImageAndText,
  getInferenceFunction,
  explainCodeStream,
  generateRegExStream,
  generateCommitMessageStream,
  generateUnitTestsStream,
  formatCodeStream,
  generateComponentFromImageStream,
  transcribeAudioToCodeStream,
  transferCodeStyleStream,
  generateCodingChallengeStream,
  reviewCodeStream,
  generateChangelogFromLogStream,
  enhanceSnippetStream,
  summarizeNotesStream,
  migrateCodeStream,
  analyzeConcurrencyStream,
  debugErrorStream,
  refactorForPerformance,
  refactorForReadability,
  convertToFunctionalComponent,
  generateJsDoc,
  translateComments,
  generateDockerfile,
  convertCssToTailwind,
  applySpecificRefactor,
  generateBugReproductionTestStream,
  generateIamPolicyStream,
  convertJsonToXbrlStream,
  explainCodeStructured,
  generateMermaidJs,
  suggestA11yFix,
  generateFile,
  generateFeature,
  generateFullStackFeature,
  generatePrSummaryStructured,
  generateTechnicalSpecFromDiff,
  generateSemanticTheme,
  generateCronFromDescription,
  generateColorPalette,
  generateMockData,
  analyzeCodeForVulnerabilities,
  detectCodeSmells,
  generateTagsForCode,
  generateTerraformConfig,
  generateWeeklyDigest,
  generateAppFeatureComponent,
  generatePipelineCode,
  generateCiCdConfig,
  analyzePerformanceTrace,
};
```
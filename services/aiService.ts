import { GoogleGenAI, Type } from "@google/genai";
import type { GenerateContentResponse, FunctionDeclaration } from "@google/genai";
import type { GeneratedFile, StructuredPrSummary, StructuredExplanation, ColorTheme, SemanticColorTheme, StructuredReview, SlideSummary, SecurityVulnerability, CodeSmell, CustomFeature } from '../types.ts';
import { logError } from './telemetryService.ts';
import { getDecryptedCredential } from './vaultService.ts';

let ai: GoogleGenAI | null = null;
let lastUsedApiKey: string | null = null;

/**
 * Gets a GoogleGenAI client instance, initializing it with a key from the vault.
 * It caches the client and only re-initializes if the key changes (e.g., user updates it).
 * @returns A promise that resolves to a GoogleGenAI instance.
 */
const getAiClient = async (): Promise<GoogleGenAI> => {
    const apiKey = await getDecryptedCredential('gemini_api_key');
    if (!apiKey) {
        throw new Error("Google Gemini API key not found in vault. Please add it in the Workspace Connector Hub.");
    }

    if (!ai || apiKey !== lastUsedApiKey) {
        lastUsedApiKey = apiKey;
        ai = new GoogleGenAI({ apiKey });
    }
    
    return ai;
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Unified AI Helpers ---

export async function* streamContent(prompt: string | { parts: any[] }, systemInstruction: string, temperature = 0.5) {
    const aiClient = await getAiClient();
    try {
        const response = await aiClient.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: prompt as any,
            config: { systemInstruction, temperature }
        });

        for await (const chunk of response) {
            yield chunk.text;
        }
    } catch (error) {
        console.error("Error streaming from AI model:", error);
        logError(error as Error, { prompt, systemInstruction });
        if (error instanceof Error) {
            yield `An error occurred while communicating with the AI model: ${error.message}`;
        } else {
            yield "An unknown error occurred while generating the response.";
        }
    }
}

export async function generateContent(prompt: string, systemInstruction: string, temperature = 0.5): Promise<string> {
    const aiClient = await getAiClient();
    try {
        const response = await aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { systemInstruction, temperature }
        });
        return response.text;
    } catch (error) {
         console.error("Error generating content from AI model:", error);
        logError(error as Error, { prompt, systemInstruction });
        throw error;
    }
}


export async function generateJson<T>(prompt: any, systemInstruction: string, schema: any, temperature = 0.2): Promise<T> {
    const aiClient = await getAiClient();
    try {
        const response = await aiClient.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature,
            }
        });
        return JSON.parse(response.text.trim());
    } catch (error) {
        console.error("Error generating JSON from AI model:", error);
        logError(error as Error, { prompt, systemInstruction });
        throw error;
    }
}

export const generateAppFeatureComponent = (prompt: string): Promise<Omit<CustomFeature, 'id'>> => {
    const systemInstruction = "You are an expert software developer creating a new, self-contained React functional component for an application. The component should be written in TypeScript, use Tailwind CSS for styling, and be defined as a single string. It must not contain any import statements. All necessary React logic should be inline (e.g., `React.useState`). Respond with only a JSON object containing the name, description, a valid icon name from the provided list, and the component code string.";
    const validIcons = "CommandCenterIcon, CodeExplainerIcon, FeatureBuilderIcon, CodeMigratorIcon, ThemeDesignerIcon, SnippetVaultIcon, UnitTestGeneratorIcon, CommitGeneratorIcon, GitLogAnalyzerIcon, ConcurrencyAnalyzerIcon, RegexSandboxIcon, PromptCraftPadIcon, CodeFormatterIcon, JsonTreeIcon, CssGridEditorIcon, SchemaDesignerIcon, PwaManifestEditorIcon, MarkdownSlidesIcon, ScreenshotToComponentIcon, SvgPathEditorIcon, StyleTransferIcon, CodingChallengeIcon, CodeReviewBotIcon, ChangelogGeneratorIcon, CronJobBuilderIcon, AsyncCallTreeIcon, AudioToCodeIcon, CodeDiffGhostIcon, CodeSpellCheckerIcon, ColorPaletteGeneratorIcon, LogicFlowBuilderIcon, MetaTagEditorIcon, NetworkVisualizerIcon, ResponsiveTesterIcon, SassCompilerIcon, ImageGeneratorIcon, XbrlConverterIcon, DigitalWhiteboardIcon, TypographyLabIcon, AiPullRequestAssistantIcon, ProjectExplorerIcon, ServerStackIcon, DocumentTextIcon, ChartBarIcon, EyeIcon, PaperAirplaneIcon, CloudIcon, ShieldCheckIcon, CpuChipIcon, SparklesIcon, MailIcon, BugAntIcon, MagnifyingGlassIcon, RectangleGroupIcon, GcpIcon";

    const schema = {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING, description: "A short, descriptive name for the feature." },
            description: { type: Type.STRING, description: "A one-sentence description of what the feature does." },
            icon: { type: Type.STRING, description: `A valid icon name from this list: ${validIcons}` },
            code: { type: Type.STRING, description: "The full React component code as a single string. It must start with `() => {` and be a valid React functional component body. Do not include imports." }
        },
        required: ["name", "description", "icon", "code"]
    };
    
    const fullPrompt = `Based on the user request, generate a new feature component.
    
    User Request: "${prompt}"

    Valid Icon Names: ${validIcons}.
    `;
    return generateJson(fullPrompt, systemInstruction, schema);
};

// --- Unified Feature Functions (Streaming) ---

export const explainCodeStream = (code: string) => streamContent(
    `Please explain the following code snippet:\n\n\`\`\`\n${code}\n\`\`\``,
    "You are an expert software engineer providing a clear, concise explanation of code."
);

export const generateRegExStream = (description: string) => streamContent(
    `Generate a single valid JavaScript regex literal (e.g., /abc/gi) for the following description. Respond with ONLY the regex literal and nothing else: "${description}"`,
    "You are an expert in regular expressions. You only output valid JavaScript regex literals.",
    0.7
);

export const generateCommitMessageStream = (diff: string) => streamContent(
    `Generate a conventional commit message for the following context of new files being added:\n\n${diff}`,
    "You are an expert programmer who writes excellent, conventional commit messages. The response should be only the commit message text.",
    0.8
);

export const generateUnitTestsStream = (code: string) => streamContent(
    `Generate Vitest unit tests for this React component code:\n\n\`\`\`tsx\n${code}\n\`\`\``,
    "You are a software quality engineer specializing in writing comprehensive and clear unit tests using Vitest and React Testing Library.",
    0.6
);

export const formatCodeStream = (code: string) => streamContent(
    `Format this code:\n\n\`\`\`javascript\n${code}\n\`\`\``,
    "You are a code formatter. Your only purpose is to format code. Respond with only the formatted code, enclosed in a single markdown block.",
    0.2
);

export const generateComponentFromImageStream = (base64Image: string) => streamContent(
    {
        parts: [
            { text: "Generate a single-file React component using Tailwind CSS that looks like this image. Respond with only the code in a markdown block." },
            { inlineData: { mimeType: 'image/png', data: base64Image } }
        ]
    },
    "You are an expert frontend developer specializing in React and Tailwind CSS. You create clean, functional components from screenshots."
);

export const transcribeAudioToCodeStream = (base64Audio: string, mimeType: string) => streamContent(
    {
        parts: [
            { text: "Transcribe my speech into a code snippet. If I describe a function or component, write it out." },
            { inlineData: { mimeType, data: base64Audio } }
        ]
    },
    "You are an expert programmer. You listen to a user's voice and transcribe their ideas into code."
);

export const transferCodeStyleStream = (args: { code: string, styleGuide: string }) => streamContent(
    `Rewrite the following code to match the provided style guide.\n\nStyle Guide:\n${args.styleGuide}\n\nCode to rewrite:\n\`\`\`\n${args.code}\n\`\`\``,
    "You are an AI assistant that rewrites code to match a specific style guide. Respond with only the rewritten code in a markdown block.",
    0.3
);

export const generateCodingChallengeStream = (_: any) => streamContent(
    `Generate a new, interesting coding challenge suitable for an intermediate developer. Include a clear problem description, one or two examples, and any constraints. Format it in markdown.`,
    "You are an AI that creates unique and interesting coding challenges for software developers.",
    0.9
);

export const reviewCodeStream = (code: string, systemInstruction?: string) => streamContent(
    `Please perform a detailed code review on the following code snippet. Identify potential bugs, suggest improvements for readability and performance, and point out any anti-patterns. Structure your feedback with clear headings.\n\n\`\`\`\n${code}\n\`\`\``,
    systemInstruction || "You are a senior software engineer performing a code review. You are meticulous, helpful, and provide constructive feedback.",
    0.6
);

export const generateChangelogFromLogStream = (log: string) => streamContent(
    `Analyze this git log and create a changelog:\n\n\`\`\`\n${log}\n\`\`\``,
    "You are a git expert and project manager. Analyze the provided git log and generate a clean, categorized changelog in Markdown format. Group changes under 'Features' and 'Fixes'.",
    0.6
);

export const enhanceSnippetStream = (code: string) => streamContent(
    `Enhance this code snippet. Add comments, improve variable names, and refactor for clarity or performance if possible.\n\n\`\`\`\n${code}\n\`\`\``,
    "You are a senior software engineer who excels at improving code. Respond with only the enhanced code in a markdown block.",
    0.5
);

export const summarizeNotesStream = (notes: string) => streamContent(
    `Summarize these developer notes into a bulleted list of key points and action items:\n\n${notes}`,
    "You are a productivity assistant who is an expert at summarizing technical notes.",
    0.7
);

export const migrateCodeStream = (code: string, from: string, to: string) => streamContent(
    `Translate this ${from} code to ${to}. Respond with only the translated code in a markdown block.\n\n\`\`\`\n${code}\n\`\`\``,
    `You are an expert polyglot programmer who specializes in migrating code between languages and frameworks.`,
    0.4
);

export const analyzeConcurrencyStream = (code: string) => streamContent(
    `Analyze this JavaScript code for potential concurrency issues, especially related to Web Workers. Identify race conditions, deadlocks, or inefficient data passing.\n\n\`\`\`javascript\n${code}\n\`\`\``,
    "You are an expert in JavaScript concurrency, web workers, and multi-threaded programming concepts.",
    0.6
);

export const debugErrorStream = (error: Error) => streamContent(
    `I encountered an error in my React application. Here are the details:\n    \n    Message: ${error.message}\n    \n    Stack Trace:\n    ${error.stack}\n    \n    Please analyze this error. Provide a brief explanation of the likely cause, followed by a bulleted list of potential solutions or debugging steps. Structure your response in clear, concise markdown.`,
    "You are an expert software engineer specializing in debugging React applications. You provide clear, actionable advice to help developers solve errors."
);

export const convertJsonToXbrlStream = (json: string) => streamContent(
    `Convert the following JSON to a simplified, XBRL-like XML format. Use meaningful tags based on the JSON keys. The root element should be <xbrl>. Do not include XML declarations or namespaces.\n\nJSON:\n${json}`,
    "You are an expert in data formats who converts JSON to clean, XBRL-like XML."
);

// --- New Streaming Functions ---

export const refactorForPerformance = (code: string) => streamContent(
    `Refactor the following code for maximum performance. Focus on algorithmic efficiency, efficient data structures, and avoiding unnecessary computations. Respond with only the refactored code in a markdown block.\n\nCode:\n\`\`\`\n${code}\n\`\`\``,
    "You are an expert software engineer specializing in code performance optimization."
);

export const refactorForReadability = (code: string) => streamContent(
    `Refactor the following code for maximum readability. Focus on clear variable names, breaking down complex functions, and adding helpful comments. Respond with only the refactored code in a markdown block.\n\nCode:\n\`\`\`\n${code}\n\`\`\``,
    "You are an expert software engineer who writes exceptionally clean and readable code."
);

export const convertToFunctionalComponent = (classComponent: string) => streamContent(
    `Convert the following React class component to a functional component using hooks (useState, useEffect, etc.). Ensure all lifecycle methods are correctly mapped. Respond with only the refactored code in a markdown block.\n\nCode:\n\`\`\`\n${classComponent}\n\`\`\``,
    "You are a React expert specializing in modernizing codebases by converting class components to functional components with hooks."
);

export const generateJsDoc = (code: string) => streamContent(
    `Generate a complete JSDoc block for the following function or component. Include descriptions for the function, its parameters, and what it returns. Respond with only the JSDoc block and the original function.\n\nCode:\n\`\`\`\n${code}\n\`\`\``,
    "You are an AI assistant that writes comprehensive and accurate JSDoc documentation."
);

export const translateComments = (code: string, targetLanguage: string) => streamContent(
    `Translate only the code comments in the following snippet to ${targetLanguage}. Do not alter the code itself. Respond with the full code snippet including the translated comments.\n\nCode:\n\`\`\`\n${code}\n\`\`\``,
    "You are an AI assistant that translates code comments into different languages without changing any of the code."
);

export const generateDockerfile = (framework: string) => streamContent(
    `Generate a basic, multi-stage Dockerfile for a ${framework} project. The Dockerfile should be production-ready, including build and serve stages. Respond with only the Dockerfile content in a markdown block.`,
    "You are a DevOps expert specializing in containerization with Docker."
);

export const convertCssToTailwind = (css: string) => streamContent(
    `Convert the following CSS code to Tailwind CSS utility classes. Provide the equivalent HTML structure with the Tailwind classes. Respond with only the HTML in a markdown block.\n\nCSS:\n\`\`\`css\n${css}\n\`\`\``,
    "You are an expert in Tailwind CSS and modern CSS practices."
);

export const applySpecificRefactor = (code: string, instruction: string) => streamContent(
    `Apply this specific refactoring instruction to the code: "${instruction}". Respond with only the complete, refactored code in a markdown block.\n\nCode:\n\`\`\`\n${code}\n\`\`\``,
    "You are an AI assistant that precisely applies refactoring instructions to code."
);

export const generateBugReproductionTestStream = (stackTrace: string, context?: string) => streamContent(
    `Generate a minimal, runnable unit test (using Vitest) that reproduces the bug described by the following stack trace. Respond with only the code in a markdown block.\n\nStack Trace:\n${stackTrace}\n\n${context ? `Additional Context:\n${context}` : ''}`,
    "You are a senior software engineer specializing in debugging and automated testing. You create concise, effective unit tests to reproduce bugs."
);

export const generateIamPolicyStream = (description: string, platform: 'aws' | 'gcp') => streamContent(
    `Generate a valid ${platform.toUpperCase()} IAM policy in JSON format based on this description: "${description}". Respond with only the JSON policy in a markdown block.`,
    "You are a cloud security expert specializing in IAM policies for AWS and GCP."
);


// --- Simple Generate Content ---
export const generatePipelineCode = (flow: string): Promise<string> => generateContent(`Based on the following described workflow, generate a single asynchronous JavaScript function that orchestrates the steps. Use placeholder functions for the actual tool logic. The workflow is: ${flow}`, "You are an expert software architect who writes clean, asynchronous JavaScript code to orchestrate complex workflows based on a description.", 0.5);

export const generateCiCdConfig = (platform: string, description: string): Promise<string> => generateContent(
    `Generate a CI/CD configuration file for ${platform} based on this description: "${description}". Respond with only the YAML/config file content inside a markdown block.`,
    "You are a DevOps expert specializing in CI/CD pipelines."
);

export const analyzePerformanceTrace = (trace: object): Promise<string> => generateContent(
    `Analyze the following performance trace data and provide optimization suggestions in markdown format. Data: ${JSON.stringify(trace, null, 2)}`,
    "You are an expert performance engineer."
);

export const suggestA11yFix = (issue: object): Promise<string> => generateContent(
    `Explain this accessibility issue and suggest a code fix in markdown. Issue: ${JSON.stringify(issue, null, 2)}`,
    "You are an expert in web accessibility (a11y)."
);

export const createApiDocumentation = (apiCode: string): Promise<string> => generateContent(
    `Generate Markdown documentation for the following API endpoint code. Include the endpoint, HTTP method, parameters, and example request/response.\n\nCode:\n\`\`\`\n${apiCode}\n\`\`\``,
    "You are a technical writer who creates clear and concise API documentation."
);

export const jsonToTypescriptInterface = (json: string): Promise<string> => generateContent(
    `Generate a TypeScript interface from this JSON object. Respond with only the TypeScript code in a markdown block.\n\nJSON:\n${json}`,
    "You are an expert in TypeScript and data modeling."
);

export const suggestAlternativeLibraries = (code: string): Promise<string> => generateContent(
    `Analyze the following code, particularly its import statements and common patterns (like date manipulation). Suggest modern, more efficient library alternatives where applicable (e.g., suggest 'date-fns' or 'dayjs' over 'moment.js'). Explain why.\n\nCode:\n\`\`\`\n${code}\n\`\`\``,
    "You are a senior software engineer with deep knowledge of the JavaScript ecosystem."
);

export const explainRegex = (regex: string): Promise<string> => generateContent(
    `Provide a step-by-step explanation of what each part of this regular expression does: \`${regex}\``,
    "You are an expert in regular expressions who can explain complex patterns simply."
);

export const generateMermaidJs = (code: string): Promise<string> => generateContent(
    `Generate a Mermaid.js flowchart string that represents the logic of the following code. Respond with only the Mermaid.js code in a markdown block (e.g., \`\`\`mermaid\n...\n\`\`\`).\n\nCode:\n\`\`\`\n${code}\n\`\`\``,
    "You are an expert in code analysis and can visualize logic flows using Mermaid.js."
);

export const generateWeeklyDigest = (commitLogs: string, telemetryData: object): Promise<string> => generateContent(
    `Generate a concise, professional weekly summary email in HTML format based on the following data.
    
    Commit Logs:
    \`\`\`
    ${commitLogs}
    \`\`\`
    
    Performance Telemetry:
    \`\`\`json
    ${JSON.stringify(telemetryData, null, 2)}
    \`\`\`
    
    The email should have sections for "New Features", "Bug Fixes", and "Performance Notes". It should be visually clean and easy to read.`,
    "You are an AI assistant that generates weekly engineering progress reports in HTML format."
);

export const generateTechnicalSpecFromDiff = (diff: string, summary: StructuredPrSummary): Promise<string> => generateContent(
    `Generate a comprehensive technical specification document in Markdown format based on the following pull request information.

The spec should include the following sections:
- **Problem:** A brief description of the issue being addressed.
- **Solution:** A detailed explanation of the changes made.
- **Technical Details:** An overview of the implementation, including any new functions, components, or patterns.
- **Impact:** How this change affects other parts of the application.

**PR Title:** ${summary.title}
**PR Summary:** ${summary.summary}

**Code Diff:**
\`\`\`diff
${diff}
\`\`\`
`,
    "You are an expert programmer who writes excellent, clear, and comprehensive technical specification documents from pull request data."
);

// --- STRUCTURED JSON ---

export const explainCodeStructured = async (code: string): Promise<StructuredExplanation> => {
    const systemInstruction = "You are an expert software engineer providing a structured analysis of a code snippet. In the summary, identify any imported dependencies and explain their purpose within the code.";
    const prompt = `Analyze this code: \n\n\`\`\`\n${code}\n\`\`\``;
    const schema = { type: Type.OBJECT, properties: { summary: { type: Type.STRING }, lineByLine: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { lines: { type: Type.STRING }, explanation: { type: Type.STRING } }, required: ["lines", "explanation"] } }, complexity: { type: Type.OBJECT, properties: { time: { type: Type.STRING }, space: { type: Type.STRING } }, required: ["time", "space"] }, suggestions: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["summary", "lineByLine", "complexity", "suggestions"] };
    return generateJson(prompt, systemInstruction, schema);
}

export const generateThemeFromDescription = async (description: string): Promise<ColorTheme> => {
    const systemInstruction = "You are a UI/UX design expert specializing in color theory. Generate a color theme based on the user's description. Provide hex codes for each color.";
    const prompt = `Generate a color theme for: "${description}"`;
    const schema = { type: Type.OBJECT, properties: { primary: { type: Type.STRING }, background: { type: Type.STRING }, surface: { type: Type.STRING }, textPrimary: { type: Type.STRING }, textSecondary: { type: Type.STRING }, textOnPrimary: { type: Type.STRING }, border: { type: Type.STRING } }, required: ["primary", "background", "surface", "textPrimary", "textSecondary", "textOnPrimary", "border"] };
    return generateJson(prompt, systemInstruction, schema);
};

export const generateSemanticTheme = (prompt: { parts: any[] }): Promise<SemanticColorTheme> => {
    const systemInstruction = `You are a world-class UI/UX designer with an expert understanding of color theory, accessibility, and branding.
    Your task is to generate a comprehensive, semantically named color theme from a user's prompt (which could be text or an image).
    - Determine if the theme should be 'light' or 'dark' mode.
    - Palette colors should be harmonious and versatile.
    - Theme colors must be derived from the palette and assigned to specific UI roles (background, text, border, etc.).
    - 'textOnPrimary' MUST have a high contrast ratio against 'primary'.
    - You MUST calculate the WCAG 2.1 contrast ratio for key text/background pairs and provide a score (AAA, AA, or Fail).
    - Provide creative, evocative names for each color (e.g., "Midnight Blue", "Dune Sand").`;

    const colorObjectSchema = {
        type: Type.OBJECT,
        properties: {
            value: { type: Type.STRING, description: "The hex code of the color, e.g., #RRGGBB" },
            name: { type: Type.STRING, description: "A creative, evocative name for the color." }
        },
        required: ["value", "name"]
    };

    const accessibilityCheckSchema = {
        type: Type.OBJECT,
        properties: {
            ratio: { type: Type.NUMBER, description: "The calculated contrast ratio." },
            score: { type: Type.STRING, enum: ["AAA", "AA", "Fail"], description: "The WCAG 2.1 accessibility score." }
        },
        required: ["ratio", "score"]
    };

    const schema = {
        type: Type.OBJECT,
        properties: {
            mode: {
                type: Type.STRING, enum: ["light", "dark"],
                description: "The recommended UI mode for this theme, 'light' or 'dark'."
            },
            palette: {
                type: Type.OBJECT,
                description: "A harmonious 4-color palette extracted from the prompt.",
                properties: {
                    primary: colorObjectSchema,
                    secondary: colorObjectSchema,
                    accent: colorObjectSchema,
                    neutral: colorObjectSchema,
                },
                required: ["primary", "secondary", "accent", "neutral"]
            },
            theme: {
                type: Type.OBJECT,
                description: "Specific color assignments for UI elements, derived from the palette.",
                properties: {
                    background: colorObjectSchema,
                    surface: colorObjectSchema,
                    textPrimary: colorObjectSchema,
                    textSecondary: colorObjectSchema,
                    textOnPrimary: colorObjectSchema,
                    border: colorObjectSchema,
                },
                required: ["background", "surface", "textPrimary", "textSecondary", "textOnPrimary", "border"]
            },
            accessibility: {
                type: Type.OBJECT,
                description: "WCAG 2.1 contrast ratio checks for common text/background pairings.",
                properties: {
                    primaryOnSurface: accessibilityCheckSchema,
                    textPrimaryOnSurface: accessibilityCheckSchema,
                    textSecondaryOnSurface: accessibilityCheckSchema,
                    textOnPrimaryOnPrimary: accessibilityCheckSchema,
                },
                required: ["primaryOnSurface", "textPrimaryOnSurface", "textSecondaryOnSurface", "textOnPrimaryOnPrimary"]
            }
        },
        required: ["mode", "palette", "theme", "accessibility"]
    };
    return generateJson(prompt, systemInstruction, schema);
};


export const generatePrSummaryStructured = (diff: string): Promise<StructuredPrSummary> => {
    const systemInstruction = "You are an expert programmer who writes excellent PR summaries.";
    const prompt = `Generate a PR summary for the following diff:\n\n\`\`\`diff\n${diff}\n\`\`\``;
    const schema = { type: Type.OBJECT, properties: { title: { type: Type.STRING }, summary: { type: Type.STRING }, changes: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["title", "summary", "changes"] };
    return generateJson(prompt, systemInstruction, schema);
};

export const generateFeature = (prompt: string, framework: string, styling: string): Promise<GeneratedFile[]> => {
    const systemInstruction = `You are an AI that generates complete, production-ready components. Create all necessary files for the requested framework and styling option.
    IMPORTANT: When the user's prompt is about maps, location, addresses, or stores, you MUST use the Google Maps JavaScript API. Generate a component that accepts an 'apiKey' prop and uses it to load the Maps script.`;
    const userPrompt = `Generate the files for a ${framework} component using ${styling} for the following feature request: "${prompt}". Make sure to include a .tsx component file.`;
    const schema = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { filePath: { type: Type.STRING }, content: { type: Type.STRING }, description: { type: Type.STRING } }, required: ["filePath", "content", "description"] } };
    return generateJson(userPrompt, systemInstruction, schema);
};

export const generateFullStackFeature = (prompt: string, framework: string, styling: string): Promise<GeneratedFile[]> => {
    const systemInstruction = `You are an AI that generates complete, production-ready full-stack features.
    You must generate four files:
    1. A frontend ${framework} component using ${styling}. File path should be 'Component.tsx'.
    2. A backend Google Cloud Function in Node.js. File path should be 'functions/index.js'. It should be a simple HTTP-triggered function that interacts with Firestore.
    3. A 'package.json' for the Cloud Function, including 'firebase-admin' and 'firebase-functions'. File path should be 'functions/package.json'.
    4. Firestore Security Rules that allow public reads but only authenticated writes. File path should be 'firestore.rules'.
    Ensure the frontend component knows how to call the cloud function.
    IMPORTANT: When the user's prompt is about maps, location, addresses, or stores, you MUST prioritize using the Google Maps JavaScript API in the frontend component. Generate a component that accepts an 'apiKey' prop and uses it to load the Maps script.`;
    const userPrompt = `Generate a full-stack feature for: "${prompt}"`;
    const schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                filePath: { type: Type.STRING, enum: ['Component.tsx', 'functions/index.js', 'functions/package.json', 'firestore.rules'] },
                content: { type: Type.STRING },
                description: { type: Type.STRING }
            },
            required: ["filePath", "content", "description"]
        }
    };
    return generateJson(userPrompt, systemInstruction, schema);
};

export interface CronParts { minute: string; hour: string; dayOfMonth: string; month: string; dayOfWeek: string; }
export const generateCronFromDescription = (description: string): Promise<CronParts> => {
    const systemInstruction = "You are an expert in cron expressions. Convert the user's description into a valid cron expression parts.";
    const prompt = `Convert this schedule to a cron expression: "${description}"`;
    const schema = { type: Type.OBJECT, properties: { minute: { type: Type.STRING }, hour: { type: Type.STRING }, dayOfMonth: { type: Type.STRING }, month: { type: Type.STRING }, dayOfWeek: { type: Type.STRING } }, required: ["minute", "hour", "dayOfMonth", "month", "dayOfWeek"] };
    return generateJson(prompt, systemInstruction, schema);
};

export const generateColorPalette = (baseColor: string): Promise<{ colors: string[] }> => {
    const systemInstruction = "You are a color theory expert. Generate a 6-color palette based on the given base color.";
    const prompt = `Generate a harmonious 6-color palette based on the color ${baseColor}.`;
    const schema = { type: Type.OBJECT, properties: { colors: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["colors"] };
    return generateJson(prompt, systemInstruction, schema);
};

export const generateMockData = (description: string, count: number): Promise<object[]> => {
    const systemInstruction = "You are an expert data scientist who creates realistic mock data based on a schema description. You must respond with only a valid JSON array of objects.";
    const prompt = `Generate an array of ${count} mock data objects based on the following schema description. Respond with only the JSON array.\n\nSchema: "${description}"`;
    const schema = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {} }}; // Freeform objects
    return generateJson(prompt, systemInstruction, schema, 0.8);
};

export const analyzeCodeForVulnerabilities = (code: string): Promise<SecurityVulnerability[]> => {
    const systemInstruction = "You are an expert security engineer. Analyze the code for vulnerabilities. For each vulnerability, provide a structured response including a potential cURL command or code snippet to demonstrate the exploit.";
    const prompt = `Analyze this code for security issues like XSS, injection, hardcoded secrets, etc. Provide detailed explanations, mitigation advice, and an exploit suggestion.\n\nCode:\n\`\`\`\n${code}\n\`\`\``;
    const schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                vulnerability: { type: Type.STRING },
                severity: { type: Type.STRING, enum: ['Critical', 'High', 'Medium', 'Low', 'Informational'] },
                description: { type: Type.STRING },
                mitigation: { type: Type.STRING },
                exploitSuggestion: { type: Type.STRING, description: "A cURL command, code snippet, or description of how to exploit the vulnerability." }
            },
            required: ['vulnerability', 'severity', 'description', 'mitigation', 'exploitSuggestion']
        }
    };
    return generateJson(prompt, systemInstruction, schema);
};

export const sqlToApiEndpoints = (schema: string, framework: 'express' | 'fastify'): Promise<GeneratedFile[]> => {
    const systemInstruction = "You are an expert backend developer who generates boilerplate CRUD API endpoints from a SQL schema.";
    const prompt = `Generate boilerplate CRUD API endpoint files for a ${framework} server based on the following SQL table schema. Create separate files for routes, controllers, and models.\n\nSQL:\n\`\`\`sql\n${schema}\n\`\`\``;
    const filesSchema = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { filePath: { type: Type.STRING }, content: { type: Type.STRING }, description: { type: Type.STRING } }, required: ["filePath", "content", "description"] } };
    return generateJson(prompt, systemInstruction, filesSchema);
};

export const detectCodeSmells = (code: string): Promise<CodeSmell[]> => {
    const systemInstruction = "You are an expert software engineer who identifies code smells like long methods, large classes, feature envy, etc.";
    const prompt = `Analyze the following code for code smells and provide explanations.\n\nCode:\n\`\`\`\n${code}\n\`\`\``;
    const schema = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { smell: { type: Type.STRING }, line: { type: Type.INTEGER }, explanation: { type: Type.STRING } }, required: ["smell", "line", "explanation"] } };
    return generateJson(prompt, systemInstruction, schema);
};

export const generateTagsForCode = (code: string): Promise<string[]> => {
    const systemInstruction = "You are an AI assistant that analyzes code and suggests relevant tags.";
    const prompt = `Generate 3-5 relevant, single-word, lowercase tags for this code snippet to help categorize it. Respond with only a JSON array of strings.\n\nCode:\n\`\`\`\n${code}\n\`\`\``;
    const schema = { type: Type.ARRAY, items: { type: Type.STRING } };
    return generateJson(prompt, systemInstruction, schema);
};

export const reviewCodeStructured = (code: string): Promise<StructuredReview> => {
    const systemInstruction = "You are a senior software engineer performing a meticulous code review. Provide a summary and a list of specific, actionable suggestions for improvement.";
    const prompt = `Review this code and provide structured feedback:\n\n\`\`\`\n${code}\n\`\`\``;
    const schema = {
        type: Type.OBJECT,
        properties: {
            summary: { type: Type.STRING, description: "A high-level summary of the code quality, identifying the main issues." },
            suggestions: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        suggestion: { type: Type.STRING, description: "A concise description of the suggested change." },
                        codeBlock: { type: Type.STRING, description: "The exact block of code that should be replaced." },
                        explanation: { type: Type.STRING, description: "Why the change is recommended (e.g., performance, readability)." }
                    },
                    required: ["suggestion", "codeBlock", "explanation"]
                }
            }
        },
        required: ["summary", "suggestions"]
    };
    return generateJson(prompt, systemInstruction, schema);
};

export const generateClientFromApiSchema = (schema: string, framework: string): Promise<GeneratedFile[]> => {
    const systemInstruction = "You are an expert full-stack developer. Generate client-side code from an API schema.";
    const prompt = `Generate all necessary files for a ${framework} client based on the following OpenAPI/GraphQL schema. This should include data-fetching hooks, type definitions, and basic display components.\n\nSchema:\n\`\`\`\n${schema}\n\`\`\``;
    const filesSchema = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { filePath: { type: Type.STRING }, content: { type: Type.STRING }, description: { type: Type.STRING } }, required: ["filePath", "content", "description"] } };
    return generateJson(prompt, systemInstruction, filesSchema);
};

export const generateTerraformConfig = (cloud: 'aws' | 'gcp', description: string, context?: string): Promise<string> => {
    const systemInstruction = `You are a DevOps expert specializing in Terraform. Generate a complete .tf file based on the user's description.`;
    const prompt = `Generate a Terraform configuration for ${cloud}.
    Description: "${description}"
    ${context ? `\n\nCloud Context (e.g., existing resources):\n${context}` : ''}
    Respond with only the HCL code in a markdown block.`;
    return generateContent(prompt, systemInstruction);
};


// --- FUNCTION CALLING ---
export interface CommandResponse { text: string; functionCalls?: { name: string; args: any; }[]; }
export const getInferenceFunction = async (prompt: string, functionDeclarations: FunctionDeclaration[], knowledgeBase: string): Promise<CommandResponse> => {
    const aiClient = await getAiClient();
    try {
        const response: GenerateContentResponse = await aiClient.models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { systemInstruction: `You are a helpful assistant for a developer tool. You must decide which function to call to satisfy the user's request, based on your knowledge base. If no specific tool seems appropriate, respond with text.\n\nKnowledge Base:\n${knowledgeBase}`, tools: [{ functionDeclarations }] } });
        const functionCalls: { name: string, args: any }[] = [];
        const parts = response.candidates?.[0]?.content?.parts ?? [];
        for (const part of parts) { if (part.functionCall) { functionCalls.push({ name: part.functionCall.name, args: part.functionCall.args }); } }
        return { text: response.text, functionCalls: functionCalls.length > 0 ? functionCalls : undefined };
    } catch (error) {
        logError(error as Error, { prompt });
        throw error;
    }
};


// --- IMAGE & VIDEO GENERATION ---
export const generateImage = async (prompt: string): Promise<string> => {
    const aiClient = await getAiClient();
    const response = await aiClient.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: { numberOfImages: 1, outputMimeType: 'image/png' },
    });
    const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
    return `data:image/png;base64,${base64ImageBytes}`;
};

export const generateImageFromImageAndText = async (prompt: string, base64Image: string, mimeType: string): Promise<string> => {
    console.warn("Image-to-image generation is not fully supported by the current SDK implementation; using text prompt only.");
    return generateImage(prompt);
};
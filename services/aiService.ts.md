```typescript
import { GoogleGenerativeAI } from '@google/generative-ai'; // Corrected import path for the new Google Generative AI SDK
// Assuming these are the necessary types from the @google/generative-ai SDK
import { Part, FunctionDeclaration, Tool, FunctionCall } from '@google/generative-ai';

/**
 * Represents a command that the AI can execute.
 * This interface is used to define tools that the AI can call.
 */
export interface ICommand {
    name: string;
    description: string;
    // Parameters should conform to the OpenAPI schema for tool declarations
    parameters: {
        type: 'object';
        properties: {
            [key: string]: {
                type: 'string' | 'number' | 'boolean' | 'array' | 'object';
                description: string;
                items?: { type: 'string' }; // For array types
                enum?: string[]; // For enums
            };
        };
        required: string[];
    };
    handler: (...args: any[]) => Promise<any> | any;
}

/**
 * Defines the contract for an AI provider.
 * This interface abstracts the underlying AI model (e.g., Gemini, OpenAI).
 */
export interface IAiProvider {
    /** Initializes the AI provider. */
    init(): Promise<void>;

    /** Generates plain text output. */
    generateText(prompt: string, options?: any): Promise<string>;

    /** Generates structured output based on a provided schema. */
    generateStructuredOutput<T>(prompt: string, schema: any, options?: any): Promise<T>;

    /** Generates a stream of text output. */
    generateStream(prompt: string, options?: any): AsyncGenerator<string>;

    /** Generates a stream of output, potentially including function calls, by utilizing available tools. */
    generateStreamWithTools(
        prompt: string,
        availableTools: ICommand[],
        options?: any
    ): AsyncGenerator<{ text?: string, functionCall?: FunctionCall }>;

    /** Returns a list of commands (tools) that the provider can expose to the AI. */
    getAvailableTools(): ICommand[];
}

/**
 * Manages AI operations, including provider selection and command execution.
 * This class acts as a central hub for all AI-related functionalities.
 */
class AiServiceManager {
    private currentProvider: IAiProvider | null = null;
    private registeredCommands: Map<string, ICommand> = new Map();

    /**
     * Initializes the AI service with a specific provider.
     * @param provider The AI provider to use (e.g., GeminiProvider, OpenAIProvider).
     */
    public async initialize(provider: IAiProvider): Promise<void> {
        this.currentProvider = provider;
        await this.currentProvider.init();
        // Register any commands that the provider itself might offer
        (provider.getAvailableTools() || []).forEach(command => this.registerCommand(command));
    }

    /**
     * Registers a command (tool) that the AI can call.
     * @param command The command object to register.
     */
    public registerCommand(command: ICommand): void {
        if (this.registeredCommands.has(command.name)) {
            console.warn(`Command with name "${command.name}" is already registered. Overwriting.`);
        }
        this.registeredCommands.set(command.name, command);
        console.log(`Command registered: ${command.name}`);
    }

    /**
     * Retrieves a registered command by its name.
     * @param name The name of the command.
     * @returns The ICommand object or undefined if not found.
     */
    public getCommand(name: string): ICommand | undefined {
        return this.registeredCommands.get(name);
    }

    /**
     * Generates text using the currently active AI provider.
     * @param prompt The input prompt for text generation.
     * @param options Optional settings for the generation request.
     * @returns A promise that resolves to the generated text.
     */
    public async generateText(prompt: string, options?: any): Promise<string> {
        if (!this.currentProvider) throw new Error("AI provider not initialized.");
        return this.currentProvider.generateText(prompt, options);
    }

    /**
     * Generates structured output using the currently active AI provider.
     * @param prompt The input prompt for structured output generation.
     * @param schema The schema defining the expected structure of the output.
     * @param options Optional settings for the generation request.
     * @returns A promise that resolves to the generated structured object.
     */
    public async generateStructuredOutput<T>(prompt: string, schema: any, options?: any): Promise<T> {
        if (!this.currentProvider) throw new Error("AI provider not initialized.");
        return this.currentProvider.generateStructuredOutput<T>(prompt, schema, options);
    }

    /**
     * Generates a stream of text output using the currently active AI provider.
     * @param prompt The input prompt for text generation.
     * @param options Optional settings for the generation request.
     * @returns An async generator that yields chunks of generated text.
     */
    public async *generateStream(prompt: string, options?: any): AsyncGenerator<string> {
        if (!this.currentProvider) throw new Error("AI provider not initialized.");
        yield* this.currentProvider.generateStream(prompt, options);
    }

    /**
     * Generates a stream of output, potentially including function calls, by utilizing all registered commands.
     * @param prompt The input prompt for generation.
     * @param options Optional settings for the generation request.
     * @returns An async generator that yields objects containing either text or function call information.
     */
    public async *generateStreamWithTools(
        prompt: string,
        options?: any
    ): AsyncGenerator<{ text?: string, functionCall?: FunctionCall }> {
        if (!this.currentProvider) throw new Error("AI provider not initialized.");
        const availableTools = Array.from(this.registeredCommands.values());
        yield* this.currentProvider.generateStreamWithTools(prompt, availableTools, options);
    }
}

/**
 * The singleton instance of the AiServiceManager.
 * This is the primary export for interacting with the AI functionalities.
 */
export const aiService = new AiServiceManager();

/**
 * Generates file content based on a prompt, filename, and file type.
 * @param prompt The description of the file content to generate.
 * @param filename The intended name of the file (e.g., 'mycomponent.tsx').
 * @param fileType The type of the file (e.g., 'tsx', 'dockerfile', 'md').
 * @param context Additional context for the AI to consider.
 * @returns An async generator that yields chunks of the generated file content.
 */
export async function* generateFile(
    prompt: string,
    filename: string,
    fileType: 'js' | 'ts' | 'jsx' | 'tsx' | 'html' | 'css' | 'json' | 'md' | 'yaml' | 'dockerfile' | 'text' | string,
    context: string = ''
): AsyncGenerator<string> {
    const fullPrompt = `Generate the content for a ${fileType} file named "${filename}". 
    The file should fulfill the following requirements: ${prompt}. 
    Consider the following context: ${context}.
    Return only the complete, raw file content, without any markdown fences, special formatting, or additional explanations outside the file content itself.`;

    if (!aiService) {
        throw new Error("AI Service is not initialized. Call aiService.initialize() first.");
    }

    for await (const chunk of aiService.generateStream(fullPrompt)) {
        yield chunk;
    }
}

/**
 * Generates a Dockerfile for a given application framework.
 * This is a specialized wrapper around `generateFile`.
 * @param framework The framework of the application (e.g., 'Node.js', 'React', 'Python Flask').
 * @returns An async generator that yields chunks of the generated Dockerfile content.
 */
export async function* generateDockerfile(framework: string): AsyncGenerator<string> {
    const prompt = `Create a robust and efficient Dockerfile suitable for a ${framework} application. 
                    Include best practices for build efficiency, security, and runtime performance.`;
    for await (const chunk of generateFile(prompt, 'Dockerfile', 'dockerfile', `Application framework: ${framework}`)) {
        yield chunk;
    }
}
```
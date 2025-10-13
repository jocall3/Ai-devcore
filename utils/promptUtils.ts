import type { SystemPrompt } from '../types.ts';

/**
 * Converts a structured SystemPrompt object into a single string
 * that can be used as the `systemInstruction` for the Gemini API.
 * @param prompt The SystemPrompt object.
 * @returns A formatted string representing the system prompt.
 */
export const formatSystemPromptToString = (prompt: SystemPrompt): string => {
    if (!prompt) return "You are a helpful assistant.";

    let instruction = `**PERSONA:**\n${prompt.persona}\n\n`;

    if (prompt.rules && prompt.rules.length > 0) {
        instruction += `**RULES:**\n${prompt.rules.map(rule => `- ${rule}`).join('\n')}\n\n`;
    }

    if (prompt.outputFormat) {
        instruction += `**OUTPUT FORMAT:**\nYou must respond in ${prompt.outputFormat} format.\n\n`;
    }

    if (prompt.exampleIO && prompt.exampleIO.length > 0) {
        instruction += `**EXAMPLES:**\n`;
        prompt.exampleIO.forEach(ex => {
            if (ex.input && ex.output) {
                instruction += `User Input:\n\`\`\`\n${ex.input}\n\`\`\`\n`;
                instruction += `Your Output:\n\`\`\`\n${ex.output}\n\`\`\`\n---\n`;
            }
        });
    }

    return instruction.trim();
};
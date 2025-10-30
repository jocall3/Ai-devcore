/**
 * @file Implements the command for explaining a code snippet using an AI provider.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { Type } from "@google/genai";
import type { IAiProvider } from '../providers/iai-provider';
import type { StructuredExplanation } from '../../../types';

// NOTE: This command is implemented as an executable class. This pattern is being phased out
// in favor of DTO commands processed by a central handler. This file is kept for compatibility
// until the refactor is complete.

/**
 * A local definition of an executable command interface to ensure this module compiles
 * during the ongoing architectural refactor.
 */
export interface ICommand<TPayload, TResult> {
  execute(payload: TPayload): Promise<TResult>;
}

/**
 * @interface ExplainCodePayload
 * @description Defines the input payload for the ExplainCodeCommand.
 */
export interface ExplainCodePayload {
  /**
   * The code snippet to be explained.
   * @type {string}
   */
  code: string;
}

/**
 * @description The result of the ExplainCodeCommand, which is a structured explanation of the code.
 */
export type ExplainCodeResult = StructuredExplanation;

/**
 * @class ExplainCodeCommand
 * @implements ICommand<ExplainCodePayload, ExplainCodeResult>
 * @description A command to encapsulate the logic for explaining a code snippet.
 * It uses an AI provider to perform the analysis and returns a structured explanation.
 */
export class ExplainCodeCommand implements ICommand<ExplainCodePayload, ExplainCodeResult> {
  private readonly aiProvider: IAiProvider;

  /**
   * @constructor
   * @param {IAiProvider} aiProvider - An instance of an AI provider that conforms to the IAiProvider interface.
   */
  public constructor(aiProvider: IAiProvider) {
    this.aiProvider = aiProvider;
  }

  /**
   * @public
   * @async
   * @method execute
   * @param {ExplainCodePayload} payload - The payload containing the code to be explained.
   * @returns {Promise<ExplainCodeResult>} A promise that resolves to the structured explanation of the code.
   * @throws {Error} Throws an error if the AI provider fails to generate the explanation.
   */
  public async execute(payload: ExplainCodePayload): Promise<ExplainCodeResult> {
    const { code } = payload;

    const systemInstruction = "You are an expert software engineer providing a structured analysis of a code snippet. Your analysis must be clear, concise, and accurate. Follow the provided JSON schema precisely.";
    
    const prompt = `Analyze this code and provide a structured explanation:\n\n\`\`\`\n${code}\n\`\`\``;

    const schema = {
      type: Type.OBJECT,
      properties: {
        summary: {
          type: Type.STRING,
          description: "A high-level summary of what the code does, including its purpose and overall approach."
        },
        lineByLine: {
          type: Type.ARRAY,
          description: "A detailed, line-by-line or block-by-block breakdown of the code.",
          items: {
            type: Type.OBJECT,
            properties: {
              lines: {
                type: Type.STRING,
                description: "The line number or range (e.g., '1-5')."
              },
              explanation: {
                type: Type.STRING,
                description: "The explanation for that specific line or block."
              }
            },
            required: ["lines", "explanation"]
          }
        },
        complexity: {
          type: Type.OBJECT,
          description: "Big O notation for time and space complexity.",
          properties: {
            time: {
              type: Type.STRING,
              description: "The time complexity (e.g., 'O(n^2)')."
            },
            space: {
              type: Type.STRING,
              description: "The space complexity (e.g., 'O(1)')."
            }
          },
          required: ["time", "space"]
        },
        suggestions: {
          type: Type.ARRAY,
          description: "A list of suggestions for improvement, such as refactoring, performance optimizations, or best practices.",
          items: {
            type: Type.STRING
          }
        }
      },
      required: ["summary", "lineByLine", "complexity", "suggestions"]
    };

    const explanation = await this.aiProvider.generateJson<ExplainCodeResult>(
      prompt,
      schema,
      systemInstruction
    );

    return explanation;
  }
}

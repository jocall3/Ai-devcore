/**
 * @fileoverview Defines the AIEngineService, the primary entry point for all AI-related
 * operations. It acts as a facade, delegating computationally intensive tasks to a
 * worker-based ComputationService, adhering to the modular monolith architecture.
 * @version 1.0.0
 * @license SPDX-License-Identifier: Apache-2.0
 */

// NOTE: 'inversify' and other module paths are assumed to be configured in the project's tsconfig.
import { injectable, inject } from 'inversify';
import { TYPES } from '../../core/types';
import type { IComputationService } from '../computation/computation.service.interface';
import type { IAIEngineService } from './ai-engine.service.interface';
import type { GeneratedFile, StructuredPrSummary, StructuredExplanation, SemanticColorTheme, SecurityVulnerability, CodeSmell, CustomFeature, CommandResponse } from '../../types';
import type { FunctionDeclaration } from '@google/genai';

// Commands are assumed to be defined in a central place within the module.
// These classes would encapsulate the logic and parameters for each AI operation.
import {
  AnalyzeConcurrencyCommand,
  AnalyzeCodeForVulnerabilitiesCommand,
  AnalyzePerformanceTraceCommand,
  ApplySpecificRefactorCommand,
  ConvertCssToTailwindCommand,
  ConvertToFunctionalComponentCommand,
  ConvertJsonToXbrlCommand,
  CreateApiDocumentationCommand,
  DebugErrorCommand,
  DetectCodeSmellsCommand,
  EnhanceSnippetCommand,
  ExplainCodeStructuredCommand,
  ExplainRegexCommand,
  FormatCodeCommand,
  GenerateAppFeatureComponentCommand,
  GenerateBugReproductionTestCommand,
  GenerateChangelogFromLogCommand,
  GenerateCiCdConfigCommand,
  GenerateClientFromApiSchemaCommand,
  GenerateCodingChallengeCommand,
  GenerateCommitMessageCommand,
  GenerateComponentFromImageCommand,
  GenerateContentCommand,
  GenerateCronFromDescriptionCommand,
  GenerateDockerfileCommand,
  GenerateFeatureCommand,
  GenerateFullStackFeatureCommand,
  GenerateImageCommand,
  GenerateImageFromImageAndTextCommand,
  GenerateIamPolicyCommand,
  GenerateJsDocCommand,
  GenerateJsonCommand,
  GenerateMermaidJsCommand,
  GenerateMockDataCommand,
  GeneratePipelineCodeCommand,
  GeneratePrSummaryStructuredCommand,
  GenerateRegExCommand,
  GenerateSemanticThemeCommand,
  GenerateTagsForCodeCommand,
  GenerateTechnicalSpecFromDiffCommand,
  GenerateTerraformConfigCommand,
  GenerateUnitTestsCommand,
  GenerateWeeklyDigestCommand,
  GetInferenceFunctionCommand,
  JsonToTypescriptInterfaceCommand,
  MigrateCodeCommand,
  RefactorForPerformanceCommand,
  RefactorForReadabilityCommand,
  ReviewCodeCommand,
  SqlToApiEndpointsCommand,
  StreamContentCommand,
  SuggestA11yFixCommand,
  SuggestAlternativeLibrariesCommand,
  SummarizeNotesCommand,
  TransferCodeStyleCommand,
  TranscribeAudioToCodeCommand,
  TranslateCommentsCommand
} from './commands';

/**
 * @class AIEngineService
 * @description The main service for interacting with the AI engine.
 * This service implements the Command Pattern by creating command objects for each AI operation
 * and dispatching them to the ComputationService. This ensures that all AI-related processing
 * happens off the main thread, keeping the UI responsive. It also acts as a clean facade,
 * abstracting away the complexities of command creation and execution.
 *
 * This new architecture implicitly resolves issues with vault access, as the responsibility for
 * retrieving API keys is delegated to the worker threads, which communicate with a dedicated
 * Security Core worker. This service does not handle credentials directly, fixing the problem
 * where a locked vault would block AI operations on the main thread.
 *
 * @implements {IAIEngineService}
 * @example
 * ```typescript
 * const aiEngineService = container.get<IAIEngineService>(TYPES.AIEngineService);
 * const explanation = await aiEngineService.explainCodeStructured('const x = 1;');
 * console.log(explanation.summary);
 * ```
 */
@injectable()
export class AIEngineService implements IAIEngineService {
  /**
   * @private
   * @type {IComputationService}
   * @description The service responsible for executing commands in a worker thread.
   */
  private readonly computationService: IComputationService;

  /**
   * @constructor
   * @param {IComputationService} computationService - The injected computation service from the DI container.
   */
  public constructor(
    @inject(TYPES.ComputationService) computationService: IComputationService
  ) {
    this.computationService = computationService;
  }

  /**
   * @inheritdoc
   */
  public streamContent(prompt: string | { parts: any[] }, systemInstruction: string, temperature = 0.5): AsyncGenerator<string> {
    const command = new StreamContentCommand(prompt, systemInstruction, temperature);
    return this.computationService.executeStream(command);
  }

  /**
   * @inheritdoc
   */
  public async generateContent(prompt: string, systemInstruction: string, temperature = 0.5): Promise<string> {
    const command = new GenerateContentCommand(prompt, systemInstruction, temperature);
    return this.computationService.execute(command);
  }

  /**
   * @inheritdoc
   */
  public async generateJson<T>(prompt: any, systemInstruction: string, schema: any, temperature = 0.2): Promise<T> {
    const command = new GenerateJsonCommand<T>(prompt, systemInstruction, schema, temperature);
    return this.computationService.execute(command);
  }

  /**
   * @inheritdoc
   */
  public async generateAppFeatureComponent(prompt: string): Promise<Omit<CustomFeature, 'id'>> {
    const command = new GenerateAppFeatureComponentCommand(prompt);
    return this.computationService.execute(command);
  }

  /**
   * @inheritdoc
   */
  public async explainCodeStructured(code: string): Promise<StructuredExplanation> {
    const command = new ExplainCodeStructuredCommand(code);
    return this.computationService.execute(command);
  }
  
  /**
   * @inheritdoc
   */
  public async generatePrSummaryStructured(diff: string): Promise<StructuredPrSummary> {
    const command = new GeneratePrSummaryStructuredCommand(diff);
    return this.computationService.execute(command);
  }

  /**
   * @inheritdoc
   */
  public async generateFeature(prompt: string, framework: string, styling: string): Promise<GeneratedFile[]> {
    const command = new GenerateFeatureCommand(prompt, framework, styling);
    return this.computationService.execute(command);
  }

  /**
   * @inheritdoc
   */
  public async generateFullStackFeature(prompt: string, framework: string, styling: string): Promise<GeneratedFile[]> {
    const command = new GenerateFullStackFeatureCommand(prompt, framework, styling);
    return this.computationService.execute(command);
  }

  /**
   * @inheritdoc
   */
  public async detectCodeSmells(code: string): Promise<CodeSmell[]> {
    const command = new DetectCodeSmellsCommand(code);
    return this.computationService.execute(command);
  }

  /**
   * @inheritdoc
   */
  public async getInferenceFunction(prompt: string, functionDeclarations: FunctionDeclaration[], knowledgeBase: string): Promise<CommandResponse> {
    const command = new GetInferenceFunctionCommand(prompt, functionDeclarations, knowledgeBase);
    return this.computationService.execute(command);
  }

  /**
   * @inheritdoc
   */
  public async generateImage(prompt: string): Promise<string> {
    const command = new GenerateImageCommand(prompt);
    return this.computationService.execute(command);
  }

  /**
   * @inheritdoc
   */
  public async analyzeCodeForVulnerabilities(code: string): Promise<SecurityVulnerability[]> {
    const command = new AnalyzeCodeForVulnerabilitiesCommand(code);
    return this.computationService.execute(command);
  }

  /**
   * @inheritdoc
   */
  public async generateTechnicalSpecFromDiff(diff: string, summary: StructuredPrSummary): Promise<string> {
    const command = new GenerateTechnicalSpecFromDiffCommand(diff, summary);
    return this.computationService.execute(command);
  }

  /**
   * @inheritdoc
   */
  public async generateSemanticTheme(prompt: { parts: any[] }): Promise<SemanticColorTheme> {
    const command = new GenerateSemanticThemeCommand(prompt);
    return this.computationService.execute(command);
  }

  // --- Streaming Methods --- 

  /**
   * @inheritdoc
   */
  public generateCommitMessageStream(diff: string): AsyncGenerator<string> {
    const command = new GenerateCommitMessageCommand(diff);
    return this.computationService.executeStream(command);
  }

  /**
   * @inheritdoc
   */
  public generateUnitTestsStream(code: string): AsyncGenerator<string> {
    const command = new GenerateUnitTestsCommand(code);
    return this.computationService.executeStream(command);
  }

  /**
   * @inheritdoc
   */
  public generateBugReproductionTestStream(stackTrace: string, context?: string): AsyncGenerator<string> {
    const command = new GenerateBugReproductionTestCommand(stackTrace, context);
    return this.computationService.executeStream(command);
  }

  /**
   * @inheritdoc
   */
  public migrateCodeStream(code: string, from: string, to: string): AsyncGenerator<string> {
    const command = new MigrateCodeCommand(code, from, to);
    return this.computationService.executeStream(command);
  }

  /**
   * @inheritdoc
   */
  public analyzeConcurrencyStream(code: string): AsyncGenerator<string> {
    const command = new AnalyzeConcurrencyCommand(code);
    return this.computationService.executeStream(command);
  }

  /**
   * @inheritdoc
   */
  public debugErrorStream(error: Error): AsyncGenerator<string> {
    // Error objects are not serializable, so we pass their properties.
    const errorData = { message: error.message, stack: error.stack };
    const command = new DebugErrorCommand(errorData);
    return this.computationService.executeStream(command);
  }

  /**
   * @inheritdoc
   */
  public generateChangelogFromLogStream(log: string): AsyncGenerator<string> {
    const command = new GenerateChangelogFromLogCommand(log);
    return this.computationService.executeStream(command);
  }

  /**
   * @inheritdoc
   */
  public generateIamPolicyStream(description: string, platform: 'aws' | 'gcp'): AsyncGenerator<string> {
    const command = new GenerateIamPolicyCommand(description, platform);
    return this.computationService.executeStream(command);
  }
}
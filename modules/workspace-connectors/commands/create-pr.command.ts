/**
 * @file Implements the command for creating a GitHub pull request.
 * @author Elite AI Implementation Team
 * @license Apache-2.0
 */

import { inject, injectable } from 'inversify';
import 'reflect-metadata';
import type { Octokit } from 'octokit';

// Corrected imports to resolve module not found errors.
import { WorkspaceConnectorService } from '../workspace-connectors.service';
import { SERVICE_IDENTIFIER } from '../../service.registry';

/**
 * @interface ICommand
 * @description A generic command interface for actions that take a payload and return a result.
 * @template TPayload - The type of the payload for the command.
 * @template TResult - The expected return type of the command.
 */
interface ICommand<TPayload, TResult> {
    execute(payload: TPayload): Promise<TResult>;
}

/**
 * @interface CreatePullRequestPayload
 * @description The payload required by the CreatePullRequestCommand to create a new pull request.
 * This interface defines all necessary parameters for the GitHub API.
 */
export interface CreatePullRequestPayload {
  /**
   * The account owner of the repository. The name is not case sensitive.
   * @type {string}
   * @example 'my-organization'
   */
  owner: string;

  /**
   * The name of the repository without the .git extension. The name is not case sensitive.
   * @type {string}
   * @example 'my-awesome-project'
   */
  repo: string;

  /**
   * The title of the new pull request.
   * @type {string}
   * @example 'feat: Implement revolutionary new feature'
   */
  title: string;

  /**
   * The name of the branch where your changes are implemented.
   * @type {string}
   * @example 'feature/new-login-flow'
   */
  head: string;

  /**
   * The name of the branch you want the changes pulled into.
   * @type {string}
   * @example 'main'
   */
  base: string;

  /**
   * The contents of the pull request.
   * @type {string}
   * @optional
   */
  body?: string;
}

/**
 * @type CreatePullRequestResult
 * @description The result returned from a successful pull request creation, containing key details.
 */
export type CreatePullRequestResult = {
  /**
   * The web URL of the created pull request.
   * @type {string}
   */
  url: string;

  /**
   * The number identifying the pull request within the repository.
   * @type {number}
   */
  number: number;
};

/**
 * @class CreatePullRequestCommand
 * @implements ICommand<CreatePullRequestPayload, CreatePullRequestResult>
 * @description A command encapsulating the logic to create a GitHub pull request.
 * It relies on the WorkspaceConnectorService to provide an authenticated GitHub client.
 *
 * @example
 * // Assuming 'container' is an InversifyJS container
 * const createPrCommand = container.get<CreatePullRequestCommand>(SERVICE_IDENTIFIER.CreatePullRequestCommand); // Assuming it's bound
 * try {
 *   const result = await createPrCommand.execute({
 *     owner: 'my-org',
 *     repo: 'my-repo',
 *     title: 'feat: Implement new feature',
 *     head: 'feature-branch',
 *     base: 'main',
 *     body: 'This PR implements the new feature as per ticket #123.'
 *   });
 *   console.log(`Successfully created PR #${result.number}: ${result.url}`);
 * } catch (error) {
 *   console.error('Failed to create PR:', error.message);
 * }
 */
@injectable()
export class CreatePullRequestCommand implements ICommand<CreatePullRequestPayload, CreatePullRequestResult> {

  /**
   * @private
   * @readonly
   * @type {WorkspaceConnectorService}
   */
  private readonly workspaceConnectorService: WorkspaceConnectorService;

  /**
   * @constructor
   * @param {WorkspaceConnectorService} workspaceConnectorService - The injected workspace connector service,
   * which provides access to authenticated clients for various services.
   */
  public constructor(
    @inject(SERVICE_IDENTIFIER.WorkspaceConnectorService) workspaceConnectorService: WorkspaceConnectorService
  ) {
    this.workspaceConnectorService = workspaceConnectorService;
  }

  /**
   * Executes the command to create a new pull request on GitHub.
   *
   * @param {CreatePullRequestPayload} payload - The data required to create the pull request.
   * @returns {Promise<CreatePullRequestResult>} A promise that resolves with the URL and number of the created PR.
   * @throws {Error} Throws an error if the GitHub client cannot be initialized (e.g., missing credentials, locked vault)
   * or if the GitHub API call fails.
   */
  public async execute(payload: CreatePullRequestPayload): Promise<CreatePullRequestResult> {
    const octokit: Octokit | null = await this.workspaceConnectorService.getGithubClient();

    if (!octokit) {
      throw new Error('GitHub client is not available. Please ensure your GitHub account is connected and the vault is unlocked.');
    }

    const { owner, repo, title, head, base, body } = payload;

    const response = await octokit.pulls.create({
      owner,
      repo,
      title,
      head,
      base,
      body,
    });

    if (response.status < 200 || response.status >= 300) {
        // @ts-ignore - 'message' may not exist on data for all statuses, but it's a common pattern
        const errorMessage = response.data?.message || 'An unknown GitHub API error occurred.';
        throw new Error(`GitHub API failed with status ${response.status}: ${errorMessage}`);
    }

    return {
      url: response.data.html_url,
      number: response.data.number,
    };
  }
}

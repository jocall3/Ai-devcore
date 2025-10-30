/**
 * @file Implements the command and handler for creating a GitHub pull request.
 * @author Elite AI Implementation Team
 * @license Apache-2.0
 */

import { inject, injectable } from 'inversify';
import 'reflect-metadata';
import type { Octokit } from 'octokit';
import { ICommand, ICommandHandler } from '../../../core/command-bus/command-bus.service';
import { TYPES } from '../../../core/di/types';
import type { IWorkspaceConnectorService } from '../workspace-connectors.service';

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
 * @implements ICommand<CreatePullRequestPayload>
 * @description A command DTO for creating a GitHub pull request.
 */
export class CreatePullRequestCommand implements ICommand<CreatePullRequestPayload> {
    readonly type = 'github:createPullRequest';
    constructor(public readonly payload: CreatePullRequestPayload) {}
}

/**
 * @class CreatePullRequestCommandHandler
 * @implements ICommandHandler<CreatePullRequestCommand, CreatePullRequestResult>
 * @description The handler for CreatePullRequestCommand. It is registered with the CommandBus
 * and is responsible for the business logic of creating a GitHub pull request.
 */
@injectable()
export class CreatePullRequestCommandHandler implements ICommandHandler<CreatePullRequestCommand, CreatePullRequestResult> {
    readonly commandType = 'github:createPullRequest';

    private readonly workspaceConnectorService: IWorkspaceConnectorService;

    /**
     * @constructor
     * @param {IWorkspaceConnectorService} workspaceConnectorService - The injected workspace connector service,
     * which provides access to authenticated clients for various services.
     */
    public constructor(
        @inject(TYPES.WorkspaceConnectorService) workspaceConnectorService: IWorkspaceConnectorService
    ) {
        this.workspaceConnectorService = workspaceConnectorService;
    }

    /**
     * Executes the command to create a new pull request on GitHub.
     *
     * @param {CreatePullRequestCommand} command - The command containing the data required to create the pull request.
     * @returns {Promise<CreatePullRequestResult>} A promise that resolves with the URL and number of the created PR.
     * @throws {Error} Throws an error if the GitHub client cannot be initialized (e.g., missing credentials, locked vault)
     * or if the GitHub API call fails.
     */
    public async execute(command: CreatePullRequestCommand): Promise<CreatePullRequestResult> {
        const octokit: Octokit | null = await this.workspaceConnectorService.getGithubClient();

        if (!octokit) {
            throw new Error('GitHub client is not available. Please ensure your GitHub account is connected and the vault is unlocked.');
        }

        const { owner, repo, title, head, base, body } = command.payload;

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

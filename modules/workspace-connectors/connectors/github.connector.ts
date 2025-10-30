/**
 * @fileoverview Connector for GitHub, providing workspace actions using the Command Pattern.
 * @module modules/workspace-connectors/connectors/github.connector
 * @version 1.0.0
 * @author AI-Implementation-Team
 * @license Apache-2.0
 */

import { Octokit } from '@octokit/rest';
import { initializeOctokit } from '../../../services/authService.ts';
import { getDecryptedCredential, isUnlocked } from '../../../services/vaultService.ts';
import * as githubService from '../../../services/githubService.ts';
import type { WorkspaceAction } from '../../../services/workspaceConnectorService.ts';
import { logError } from '../../../services/telemetryService.ts';

/**
 * Retrieves the GitHub Personal Access Token from the vault and returns an authenticated Octokit client.
 * This is the central function for all GitHub actions to get an API client.
 * It handles vault state and ensures a clear error is thrown if credentials are not available.
 *
 * @private
 * @async
 * @function getAuthenticatedOctokit
 * @returns {Promise<Octokit>} A promise that resolves to an authenticated Octokit instance.
 * @throws {Error} If the vault is locked, not initialized, or if the GitHub token is missing.
 * @example
 * try {
 *   const octokit = await getAuthenticatedOctokit();
 *   const repos = await githubService.getRepos(octokit);
 * } catch (error) {
 *   console.error(error.message); // e.g., "Vault is locked. Please unlock it to use GitHub integrations."
 * }
 */
export const getAuthenticatedOctokit = async (): Promise<Octokit> => {
    if (!isUnlocked()) {
        throw new Error("Vault is locked. Please unlock it to use GitHub integrations.");
    }
    
    const token = await getDecryptedCredential('github_pat');
    
    if (!token) {
        throw new Error("GitHub token not found. Please connect your GitHub account in the Workspace Connector Hub.");
    }
    
    return initializeOctokit(token);
};

/**
 * @constant {WorkspaceAction} getReposAction
 * @description Workspace action to retrieve a list of repositories for the authenticated user.
 * @example
 * // This would be executed by the central command handler
 * const repos = await executeWorkspaceAction('github_get_repos', {});
 */
const getReposAction: WorkspaceAction = {
    id: 'github_get_repos',
    service: 'GitHub',
    description: 'Lists all repositories for the authenticated user.',
    getParameters: () => ({}),
    execute: async () => {
        try {
            const octokit = await getAuthenticatedOctokit();
            return await githubService.getRepos(octokit);
        } catch (error) {
            logError(error as Error, { actionId: 'github_get_repos' });
            throw error; // Re-throw to be handled by the central executor
        }
    },
};

/**
 * @constant {WorkspaceAction} getRepoTreeAction
 * @description Workspace action to get the file tree of a specific repository.
 * @example
 * const tree = await executeWorkspaceAction('github_get_repo_tree', {
 *   owner: 'facebook',
 *   repo: 'react'
 * });
 */
const getRepoTreeAction: WorkspaceAction = {
    id: 'github_get_repo_tree',
    service: 'GitHub',
    description: "Gets the file tree for a repository's default branch.",
    getParameters: () => ({
        owner: { type: 'string', required: true, default: '' },
        repo: { type: 'string', required: true, default: '' },
    }),
    execute: async (params: { owner: string; repo: string }) => {
        try {
            const octokit = await getAuthenticatedOctokit();
            return await githubService.getRepoTree(octokit, params.owner, params.repo);
        } catch (error) {
            logError(error as Error, { actionId: 'github_get_repo_tree', params });
            throw error;
        }
    },
};

/**
 * @constant {WorkspaceAction} getFileContentAction
 * @description Workspace action to retrieve the content of a file from a repository.
 * @example
 * const content = await executeWorkspaceAction('github_get_file_content', {
 *   owner: 'facebook',
 *   repo: 'react',
 *   path: 'README.md'
 * });
 */
const getFileContentAction: WorkspaceAction = {
    id: 'github_get_file_content',
    service: 'GitHub',
    description: "Retrieves the content of a specific file in a repository.",
    getParameters: () => ({
        owner: { type: 'string', required: true, default: '' },
        repo: { type: 'string', required: true, default: '' },
        path: { type: 'string', required: true, default: '' },
    }),
    execute: async (params: { owner: string; repo: string; path: string }) => {
        try {
            const octokit = await getAuthenticatedOctokit();
            return await githubService.getFileContent(octokit, params.owner, params.repo, params.path);
        } catch (error) {
            logError(error as Error, { actionId: 'github_get_file_content', params });
            throw error;
        }
    },
};

/**
 * @constant {WorkspaceAction} commitFilesAction
 * @description Workspace action to commit one or more files to a repository branch.
 * @example
 * const commitUrl = await executeWorkspaceAction('github_commit_files', {
 *   owner: 'my-org',
 *   repo: 'my-project',
 *   branch: 'main',
 *   message: 'feat: Update README with new instructions',
 *   files: JSON.stringify([{ path: 'README.md', content: 'New content here.' }])
 * });
 */
const commitFilesAction: WorkspaceAction = {
    id: 'github_commit_files',
    service: 'GitHub',
    description: "Commits one or more file changes to a specified branch.",
    getParameters: () => ({
        owner: { type: 'string', required: true, default: '' },
        repo: { type: 'string', required: true, default: '' },
        branch: { type: 'string', required: false, default: 'main' },
        message: { type: 'string', required: true, default: '' },
        files: { type: 'string', required: true, default: '' }, // JSON string of {path, content}[]
    }),
    execute: async (params: { owner: string; repo: string; branch?: string; message: string; files: string; }) => {
        try {
            const octokit = await getAuthenticatedOctokit();
            const filesToCommit = JSON.parse(params.files);
            if (!Array.isArray(filesToCommit)) {
                throw new Error("The 'files' parameter must be a JSON string representing an array.");
            }
            return await githubService.commitFiles(octokit, params.owner, params.repo, filesToCommit, params.message, params.branch);
        } catch (error) {
            logError(error as Error, { actionId: 'github_commit_files', params: { ...params, files: '...truncated...' } });
            throw error;
        }
    },
};

/**
 * @constant {WorkspaceAction[]} githubActions
 * @description An array containing all defined GitHub workspace actions for registration.
 */
export const githubActions: WorkspaceAction[] = [
    getReposAction,
    getRepoTreeAction,
    getFileContentAction,
    commitFilesAction,
];
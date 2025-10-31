/**
 * @fileoverview Connector for GitHub, providing workspace actions using the Command Pattern.
 * @module modules/workspace-connectors/connectors/github.connector
 * @version 2.0.0
 * @author AI-Implementation-Team
 * @license Apache-2.0
 */

import { Octokit } from '@octokit/rest';
// CQRS/DI refactor: Direct service imports are replaced with DI container access.
import { container } from '../../../core/di/container.ts';
import { TYPES } from '../../../core/di/types.ts';
import { SecurityCoreService } from '../../security-core/security-core.service.ts';
import { VaultStatus } from '../../security-core/types.ts';
import { initializeOctokit } from '../../../services/authService.ts';
import * as githubService from '../../../services/githubService.ts';
import type { WorkspaceAction } from '../../../services/workspaceConnectorService.ts';
import { logError } from '../../../services/telemetryService.ts';

/**
 * Retrieves the GitHub Personal Access Token from the vault and returns an authenticated Octokit client.
 * This is the central function for all GitHub actions to get an API client.
 * It uses the central DI container to resolve the SecurityCoreService for secure credential access.
 *
 * @private
 * @async
 * @function getAuthenticatedOctokit
 * @returns {Promise<Octokit>} A promise that resolves to an authenticated Octokit instance.
 * @throws {Error} If the vault is locked, not initialized, or if the GitHub token is missing.
 */
export const getAuthenticatedOctokit = async (): Promise<Octokit> => {
    // Resolve the security service from the DI container.
    const securityCore = container.resolve<SecurityCoreService>(TYPES.SecurityCore);
    
    if (securityCore.getStatus() !== VaultStatus.UNLOCKED) {
        throw new Error("Vault is locked. Please unlock it to use GitHub integrations.");
    }
    
    // getDecryptedCredential is now an async method on the service instance.
    const token = await securityCore.getDecryptedCredential('github_pat');
    
    if (!token) {
        throw new Error("GitHub token not found. Please connect your GitHub account in the Workspace Connector Hub.");
    }
    
    return initializeOctokit(token);
};

// The actions below remain structurally the same but now rely on the refactored getAuthenticatedOctokit.

/**
 * @constant {WorkspaceAction} getReposAction
 * @description Workspace action to retrieve a list of repositories for the authenticated user.
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
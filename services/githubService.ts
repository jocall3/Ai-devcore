/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import type { Octokit } from '@octokit/rest';
import type { Repo, FileNode } from '../types.ts';
import { logEvent, logError, measurePerformance } from './telemetryService.ts';

/**
 * Fetches the repositories for the authenticated user.
 * @param {Octokit} octokit - An authenticated Octokit instance.
 * @returns {Promise<Repo[]>} A promise that resolves to an array of repositories.
 * @example
 * const octokit = initializeOctokit(token);
 * const repos = await getRepos(octokit);
 */
export const getRepos = async (octokit: Octokit): Promise<Repo[]> => {
    return measurePerformance('getRepos', async () => {
        logEvent('getRepos_start');
        try {
            const { data } = await octokit.request('GET /user/repos', { type: 'owner', sort: 'updated', per_page: 100 });
            logEvent('getRepos_success', { count: data.length });
            return data as Repo[];
        } catch (error) {
            logError(error as Error, { context: 'getRepos' });
            throw new Error(`Failed to fetch repositories: ${(error as Error).message}`);
        }
    });
};

/**
 * Deletes a repository for the authenticated user.
 * @param {Octokit} octokit - An authenticated Octokit instance.
 * @param {string} owner - The owner of the repository.
 * @param {string} repo - The name of the repository.
 * @returns {Promise<void>} A promise that resolves when the repository is deleted.
 * @example
 * await deleteRepo(octokit, 'my-org', 'my-repo');
 */
export const deleteRepo = async (octokit: Octokit, owner: string, repo: string): Promise<void> => {
     return measurePerformance('deleteRepo', async () => {
        logEvent('deleteRepo_start', { owner, repo });
        try {
            await octokit.request('DELETE /repos/{owner}/{repo}', { owner, repo });
            logEvent('deleteRepo_success', { owner, repo });
        } catch (error) {
            logError(error as Error, { context: 'deleteRepo', owner, repo });
            throw new Error(`Failed to delete repository: ${(error as Error).message}`);
        }
    });
};

/**
 * Fetches the entire file tree for a given repository's default branch.
 * @param {Octokit} octokit - An authenticated Octokit instance.
 * @param {string} owner - The owner of the repository.
 * @param {string} repo - The name of the repository.
 * @returns {Promise<FileNode>} A promise that resolves to the root FileNode of the repository tree.
 * @example
 * const fileTree = await getRepoTree(octokit, 'my-org', 'my-repo');
 */
export const getRepoTree = async (octokit: Octokit, owner: string, repo: string): Promise<FileNode> => {
     return measurePerformance('getRepoTree', async () => {
        logEvent('getRepoTree_start', { owner, repo });
        try {
            const { data: repoData } = await octokit.request('GET /repos/{owner}/{repo}', { owner, repo });
            const defaultBranch = repoData.default_branch;
            const { data: branch } = await octokit.request('GET /repos/{owner}/{repo}/branches/{branch}', { owner, repo, branch: defaultBranch });
            const treeSha = branch.commit.commit.tree.sha;
            const { data: treeData } = await octokit.request('GET /repos/{owner}/{repo}/git/trees/{tree_sha}', { owner, repo, tree_sha: treeSha, recursive: 'true' });
            
            const root: FileNode = { name: repo, type: 'folder', path: '', children: [] };
            
            interface TreeItem {
                path?: string;
                type?: 'blob' | 'tree' | 'commit';
            }

            (treeData.tree as TreeItem[]).forEach((item) => {
                if (!item.path) return;
                const pathParts = item.path.split('/');
                let currentNode = root;
                pathParts.forEach((part: string, index: number) => {
                    if (!currentNode.children) { currentNode.children = []; }
                    let childNode = currentNode.children.find((child: FileNode) => child.name === part);
                    if (!childNode) {
                        const isLastPart = index === pathParts.length - 1;
                        const type = isLastPart ? (item.type === 'tree' ? 'folder' : 'file') : 'folder';
                        childNode = { name: part, path: item.path, type };
                         if (type === 'folder') { childNode.children = []; }
                        currentNode.children.push(childNode);
                    }
                    currentNode = childNode;
                });
            });

            logEvent('getRepoTree_success', { owner, repo, items: treeData.tree.length });
            return root;
        } catch (error) {
            logError(error as Error, { context: 'getRepoTree', owner, repo });
            throw new Error(`Failed to fetch repository tree: ${(error as Error).message}`);
        }
    });
};

/**
 * Fetches the content of a specific file from a repository.
 * @param {Octokit} octokit - An authenticated Octokit instance.
 * @param {string} owner - The owner of the repository.
 * @param {string} repo - The name of the repository.
 * @param {string} path - The path to the file within the repository.
 * @returns {Promise<string>} A promise that resolves to the decoded file content as a string.
 * @example
 * const content = await getFileContent(octokit, 'my-org', 'my-repo', 'src/index.js');
 */
export const getFileContent = async (octokit: Octokit, owner: string, repo: string, path: string): Promise<string> => {
    return measurePerformance('getFileContent', async () => {
        logEvent('getFileContent_start', { owner, repo, path });
        try {
            const { data } = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', { owner, repo, path });
            if (Array.isArray(data) || data.type !== 'file' || typeof data.content !== 'string') { 
                throw new Error("The specified path is a directory or an invalid file.");
            }
            const content = atob(data.content);
            logEvent('getFileContent_success', { owner, repo, path, size: content.length });
            return content;
        } catch (error) {
             logError(error as Error, { context: 'getFileContent', owner, repo, path });
             throw new Error(`Failed to fetch file content for \"${path}\": ${(error as Error).message}`);
        }
    });
};

/**
 * Commits one or more files to a repository branch.
 * @param {Octokit} octokit - An authenticated Octokit instance.
 * @param {string} owner - The owner of the repository.
 * @param {string} repo - The name of the repository.
 * @param {{path: string, content: string}[]} files - An array of file objects to commit.
 * @param {string} message - The commit message.
 * @param {string} [branch='main'] - The branch to commit to.
 * @returns {Promise<string>} A promise that resolves to the URL of the new commit.
 * @example
 * const commitUrl = await commitFiles(octokit, 'my-org', 'my-repo', [{ path: 'README.md', content: '# New Readme' }], 'Update README');
 */
export const commitFiles = async (
    octokit: Octokit,
    owner: string,
    repo: string,
    files: { path: string; content: string }[],
    message: string,
    branch: string = 'main'
): Promise<string> => {
    return measurePerformance('commitFiles', async () => {
        logEvent('commitFiles_start', { owner, repo, fileCount: files.length, branch });

        try {
            const { data: refData } = await octokit.request('GET /repos/{owner}/{repo}/git/ref/{ref}', {
                owner,
                repo,
                ref: `heads/${branch}`,
            });
            const latestCommitSha = refData.object.sha;

            const { data: commitData } = await octokit.request('GET /repos/{owner}/{repo}/git/commits/{commit_sha}', {
                owner,
                repo,
                commit_sha: latestCommitSha,
            });
            const baseTreeSha = commitData.tree.sha;

            const blobPromises = files.map(file =>
                octokit.request('POST /repos/{owner}/{repo}/git/blobs', {
                    owner,
                    repo,
                    content: file.content,
                    encoding: 'utf-8',
                })
            );
            const blobs = await Promise.all(blobPromises);
            
            const tree = blobs.map((blob: any, index: number) => ({
                path: files[index].path,
                mode: '100644' as const,
                type: 'blob' as const,
                sha: blob.data.sha,
            }));

            const { data: newTree } = await octokit.request('POST /repos/{owner}/{repo}/git/trees', {
                owner,
                repo,
                base_tree: baseTreeSha,
                tree,
            });

            const { data: newCommit } = await octokit.request('POST /repos/{owner}/{repo}/git/commits', {
                owner,
                repo,
                message,
                tree: newTree.sha,
                parents: [latestCommitSha],
            });

            await octokit.request('PATCH /repos/{owner}/{repo}/git/refs/{ref}', {
                owner,
                repo,
                ref: `heads/${branch}`,
                sha: newCommit.sha,
            });

            logEvent('commitFiles_success', { commitUrl: newCommit.html_url });
            return newCommit.html_url;

        } catch (error) {
            logError(error as Error, { context: 'commitFiles', owner, repo, branch });
            throw new Error(`Failed to commit files: ${(error as Error).message}`);
        }
    });
};
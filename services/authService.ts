/**
 * Service for GitHub authentication and Octokit client management.
 * This service provides stateless utility functions for creating authenticated Octokit clients
 * and validating tokens. It does not manage state or directly handle credential storage.
 */

import { Octokit } from 'octokit';
import type { GitHubUser as User } from '../types.ts';
import { logEvent } from './telemetryService.ts';

/**
 * Creates a new, stateless Octokit instance with the provided token.
 * This function should be called with a plaintext token that has been securely
 * decrypted from the vault just before it is needed.
 *
 * @param {string} token The plaintext GitHub Personal Access Token.
 * @returns {Octokit} A new Octokit instance, authenticated and ready to use.
 * @throws {Error} If no token is provided, preventing unauthenticated client creation.
 * @example
 * import { initializeOctokit } from './authService';
 * import { getDecryptedCredential } from './vaultService';
 *
 * async function fetchUserRepos() {
 *   // UI/service logic should handle the locked state, for example,
 *   // by prompting the user to unlock the vault before calling this.
 *   const token = await getDecryptedCredential('github_pat');
 *   if (token) {
 *     const octokit = initializeOctokit(token);
 *     const { data: repos } = await octokit.request('GET /user/repos');
 *     return repos;
 *   }
 *   return [];
 * }
 */
export const initializeOctokit = (token: string): Octokit => {
    if (!token) {
        throw new Error("Cannot initialize Octokit without a token.");
    }
    logEvent('octokit_initialized');
    return new Octokit({ auth: token, request: { headers: { 'X-GitHub-Api-Version': '2022-11-28' } } });
};

/**
 * Validates a plaintext token by fetching the associated user profile from GitHub.
 * This is useful for confirming that a token is valid and for retrieving user information
 * when establishing a new connection in the application.
 *
 * @param {string} token The plaintext GitHub token to validate.
 * @returns {Promise<User>} A promise that resolves to the user's profile information.
 * @throws {Error} If the token is invalid or the GitHub API request fails.
 * @example
 * try {
 *   const userProfile = await validateToken('ghp_xxxxxxxx');
 *   console.log(`Token is valid for user: ${userProfile.login}`);
 *   // Store user profile in global state or similar
 * } catch (error) {
 *   console.error('Token validation failed.', error);
 * }
 */
export const validateToken = async (token: string): Promise<User> => {
    // Create a temporary, stateless Octokit instance for validation purposes.
    const tempOctokit = new Octokit({ auth: token });
    const { data: user } = await tempOctokit.request('GET /user');
    // Cast to our internal User type as the raw data from Octokit is more complex.
    return user as unknown as User;
};

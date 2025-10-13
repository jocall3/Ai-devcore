import { Octokit } from 'octokit';
import type { GitHubUser as User } from '../types.ts';
import { logEvent } from './telemetryService.ts';

/**
 * Creates a new Octokit instance with the provided token.
 * This function is now stateless and should be called with a plaintext token
 * that has been securely decrypted from the vault just before use.
 * @param token The plaintext GitHub Personal Access Token.
 * @returns A new Octokit instance.
 */
export const initializeOctokit = (token: string): Octokit => {
    if (!token) {
        throw new Error("Cannot initialize Octokit without a token.");
    }
    logEvent('octokit_initialized');
    return new Octokit({ auth: token, request: { headers: { 'X-GitHub-Api-Version': '2022-11-28' } } });
};

/**
 * Validates a plaintext token by fetching the user profile.
 * @param token The plaintext GitHub token to validate.
 * @returns A promise that resolves to the user's profile information.
 */
export const validateToken = async (token: string): Promise<User> => {
    const tempOctokit = new Octokit({ auth: token });
    const { data: user } = await tempOctokit.request('GET /user');
    return user as unknown as User;
};
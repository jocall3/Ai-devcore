/**
 * Service for GitHub authentication and Octokit client management.
 * This service provides methods for creating authenticated Octokit clients
 * and validating tokens by interacting with the secure vault.
 * It is designed to be used via dependency injection.
 */

import { Octokit } from '@octokit/rest';
import { injectable, inject } from 'inversify';
import 'reflect-metadata';
import { TYPES } from '../core/di/types';
import { SecurityCoreService } from '../modules/security-core/security-core.service';
import { VaultStatus } from '../modules/security-core/types';
import type { GitHubUser } from '../types';
import { logEvent } from './telemetryService';

/**
 * @interface IAuthService
 * @description Defines the contract for the authentication service, primarily for GitHub.
 */
export interface IAuthService {
    /**
     * Creates and returns an authenticated Octokit client.
     * It retrieves the GitHub PAT from the secure vault.
     * @returns {Promise<Octokit>} An authenticated Octokit instance.
     * @throws {Error} If the vault is locked or the token is not found.
     */
    getAuthenticatedOctokit(): Promise<Octokit>;

    /**
     * Validates a plaintext token by fetching the associated user profile.
     * @param {string} token The plaintext GitHub token to validate.
     * @returns {Promise<GitHubUser>} The user's profile information.
     * @throws {Error} If the token is invalid or the API request fails.
     */
    validateToken(token: string): Promise<GitHubUser>;
}

/**
 * @class AuthService
 * @implements {IAuthService}
 * @description Manages GitHub authentication logic, including creating authenticated
 * API clients by securely retrieving credentials.
 * @injectable
 */
@injectable()
export class AuthService implements IAuthService {
    
    /**
     * @constructor
     * @param {SecurityCoreService} securityCore - The injected security core service for vault access.
     */
    constructor(
        @inject(TYPES.SecurityCore) private readonly securityCore: SecurityCoreService
    ) {}

    /**
     * Creates a new, stateless Octokit instance with the provided token.
     * @private
     * @param {string} token The plaintext GitHub Personal Access Token.
     * @returns {Octokit} A new authenticated Octokit instance.
     */
    private initializeOctokit(token: string): Octokit {
        if (!token) {
            throw new Error("Cannot initialize Octokit without a token.");
        }
        logEvent('octokit_initialized');
        return new Octokit({ auth: token, request: { headers: { 'X-GitHub-Api-Version': '2022-11-28' } } });
    }

    /**
     * @inheritdoc
     */
    public async getAuthenticatedOctokit(): Promise<Octokit> {
        if (this.securityCore.getStatus() !== VaultStatus.UNLOCKED) {
             throw new Error("Vault is locked. Please unlock it to use GitHub integrations.");
        }
        
        const token = await this.securityCore.getDecryptedCredential('github_pat');
        
        if (!token) {
            throw new Error("GitHub token not found. Please connect your GitHub account in the Workspace Connector Hub.");
        }
        
        return this.initializeOctokit(token);
    }
    
    /**
     * @inheritdoc
     */
    public async validateToken(token: string): Promise<GitHubUser> {
        // This method can use a temporary client as it's for validation before a token is stored.
        const tempOctokit = new Octokit({ auth: token });
        const { data: user } = await tempOctokit.request('GET /user');
        return user as unknown as GitHubUser;
    }
}

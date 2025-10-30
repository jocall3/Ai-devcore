/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { injectable, inject } from 'inversify';
import 'reflect-metadata';
import { TYPES } from '../core/di/types.ts';
import { SecurityCoreService } from '../modules/security-core/security-core.service.ts';
import { logError } from './telemetryService.ts';

declare global {
  interface Window { gapi: any; }
}

/**
 * @class GoogleApiService
 * @description Manages the lifecycle of the Google API client (gapi), including loading, initialization,
 * and authentication. It uses the SecurityCoreService to securely retrieve API keys.
 * This service is intended to be a singleton managed by the DI container.
 */
@injectable()
export class GoogleApiService {
    private readonly CLIENT_ID = "555179712981-36hlicm802genhfo9iq1ufnp1n8cikt9.apps.googleusercontent.com";
    private gapiInitialized = false;
    private securityCore: SecurityCoreService;

    public constructor(
        @inject(TYPES.SecurityCore) securityCore: SecurityCoreService
    ) {
        this.securityCore = securityCore;
    }

    /**
     * Loads the Google API client script ('gapi') into the document.
     * @returns {Promise<void>} A promise that resolves when the client is loaded.
     * @private
     */
    private loadGapiScript = () => new Promise<void>((resolve, reject) => {
        if (window.gapi) {
            window.gapi.load('client', resolve);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => window.gapi.load('client', resolve);
        script.onerror = reject;
        document.body.appendChild(script);
    });

    /**
     * Ensures the Google API client (gapi) is loaded, initialized, and authenticated.
     * This function is idempotent and can be called multiple times safely.
     * It retrieves the necessary API key from the encrypted vault via the SecurityCoreService.
     * @returns {Promise<boolean>} A promise that resolves to true if the client is ready, or throws an error on failure.
     * @throws Will throw an error if the vault is locked, the API key is missing, or initialization fails.
     */
    public ensureGapiClient = async (): Promise<boolean> => {
        if (this.gapiInitialized) return true;
    
        try {
            await this.loadGapiScript();

            // Retrieve the API key from the vault via the injected security core service.
            const apiKey = await this.securityCore.getDecryptedCredential('gemini_api_key');
            if (!apiKey) {
                throw new Error("Google Gemini API key not found in vault. Please add it in the Workspace Connector Hub.");
            }

            await window.gapi.client.init({
                apiKey: apiKey,
                clientId: this.CLIENT_ID,
                discoveryDocs: [
                    "https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest",
                    "https://docs.googleapis.com/$discovery/rest?version=v1",
                    "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest",
                    "https://iam.googleapis.com/$discovery/rest?version=v1"
                ],
            });

            const accessToken = sessionStorage.getItem('google_access_token');
            if (accessToken) {
                window.gapi.client.setToken({ access_token: accessToken });
            } else {
                console.warn("GAPI: Access token not found. Some features may not work until you sign in.");
            }
            
            this.gapiInitialized = true;
            return true;
        } catch (error) {
            logError(error as Error, { service: 'GoogleApiService', function: 'ensureGapiClient' });
            this.gapiInitialized = false;
            // Re-throw the error so calling functions know about the failure.
            throw error;
        }
    };
}

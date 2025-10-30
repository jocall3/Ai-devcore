/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { getDecryptedCredential } from './vaultService.ts';

const CLIENT_ID = "555179712981-36hlicm802genhfo9iq1ufnp1n8cikt9.apps.googleusercontent.com";

declare global { interface Window { gapi: any; } }

let gapiInitialized = false;

/**
 * Loads the Google API client script ('gapi') into the document.
 * @returns {Promise<void>} A promise that resolves when the client is loaded.
 * @private
 */
const loadGapiScript = () => new Promise<void>((resolve, reject) => {
    if (window.gapi) {
        window.gapi.load('client', resolve);
        return;
    };
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => window.gapi.load('client', resolve);
    script.onerror = reject;
    document.body.appendChild(script);
});

/**
 * Ensures the Google API client (gapi) is loaded, initialized, and authenticated.
 * This function is idempotent and can be called multiple times safely.
 * It retrieves the necessary API key from the encrypted vault, which requires the vault to be unlocked.
 * @returns {Promise<boolean>} A promise that resolves to true if the client is ready, or throws an error on failure.
 * @throws Will throw an error if the vault is locked, the API key is missing, or initialization fails.
 * @example
 * try {
 *   await ensureGapiClient();
 *   // gapi is now ready to use
 *   const response = await gapi.client.gmail.users.getProfile({ userId: 'me' });
 * } catch (error) {
 *   console.error("Failed to prepare Google API client:", error);
 *   // Handle error, e.g., by prompting the user to unlock the vault.
 * }
 */
export const ensureGapiClient = async (): Promise<boolean> => {
    if (gapiInitialized) return true;
    
    try {
        await loadGapiScript();

        // Retrieve the API key from the vault. This will throw if the vault is locked.
        const apiKey = await getDecryptedCredential('gemini_api_key');
        if (!apiKey) {
            throw new Error("Google Gemini API key not found in vault. Please add it in the Workspace Connector Hub.");
        }

        await window.gapi.client.init({
            apiKey: apiKey, // Use the key from the vault
            clientId: CLIENT_ID,
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
        
        gapiInitialized = true;
        return true;
    } catch (error) {
        console.error("GAPI client initialization failed:", error);
        gapiInitialized = false;
        // Re-throw the error so calling functions know about the failure, especially if the vault is locked.
        throw error;
    }
};
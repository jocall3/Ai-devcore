/**
 * @file Manages Google OAuth2 authentication flow, session restoration, and vault state validation.
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AppUser } from '../types.ts';
import { logError } from './telemetryService.ts';
import * as vaultService from './vaultService.ts';

declare global {
  const google: any;
}

const GOOGLE_CLIENT_ID = "555179712981-36hlicm802genhfo9iq1ufnp1n8cikt9.apps.googleusercontent.com";

const SCOPES = [
    'openid',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/drive.appdata',
    'https://www.googleapis.com/auth/drive.install',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/iam.test',
    'https://www.googleapis.com/auth/gmail.addons.current.action.compose',
    'https://www.googleapis.com/auth/gmail.addons.current.message.action',
    'https://www.googleapis.com/auth/gmail.send'
].join(' ');

let tokenClient: any;
let onUserChangedCallback: (user: AppUser | null) => void = () => {};

/**
 * Fetches the user's Google profile information using an access token.
 * @param {string} accessToken - The Google OAuth2 access token.
 * @returns {Promise<any>} A promise that resolves with the user's profile JSON object.
 * @throws {Error} If the fetch request fails or the token is invalid.
 * @example
 * const profile = await getGoogleUserProfile('your_access_token');
 * console.log(profile.name);
 */
const getGoogleUserProfile = async (accessToken: string) => {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
        throw new Error('Failed to fetch user profile. The access token may be expired or invalid.');
    }
    return response.json();
};

/**
 * Initializes the Google Authentication client. It also attempts to restore a user session
 * from sessionStorage if a token exists, ensuring the application's vault is in a usable state.
 * If the vault is initialized but locked during session restoration, it forces a sign-out
 * to prevent an inconsistent application state.
 * @param {(user: AppUser | null) => void} callback - A function to call when the user's authentication state changes.
 * @example
 * initGoogleAuth((user) => {
 *   if (user) {
 *     console.log('User signed in:', user.displayName);
 *   } else {
 *     console.log('User signed out.');
 *   }
 * });
 */
export function initGoogleAuth(callback: (user: AppUser | null) => void) {
  if (!GOOGLE_CLIENT_ID) {
    console.error('Google Client ID not configured.');
    return;
  }
  onUserChangedCallback = callback;

  // Attempt to restore session on initialization
  const accessToken = sessionStorage.getItem('google_access_token');
  if (accessToken) {
      (async () => {
          try {
              const isInitialized = await vaultService.isVaultInitialized();
              if (isInitialized && !(await vaultService.isUnlocked())) {
                  throw new Error('VAULT_LOCKED');
              }
              
              const profile = await getGoogleUserProfile(accessToken);
              const appUser: AppUser = {
                  uid: profile.sub,
                  displayName: profile.name,
                  email: profile.email,
                  photoURL: profile.picture,
                  tier: 'free',
              };
              onUserChangedCallback(appUser);
          } catch (error) {
              if (error instanceof Error && error.message === 'VAULT_LOCKED') {
                  console.warn('Session restoration failed: Vault is locked. Forcing sign-out to ensure consistent state.');
              } else {
                  console.warn('Failed to restore session from existing token. It may be expired or invalid.', error);
              }
              signOutUser();
          }
      })();
  }
  
  tokenClient = (google.accounts as any).oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: SCOPES,
    callback: async (tokenResponse: any) => {
      if (tokenResponse && tokenResponse.access_token) {
        try {
            const isInitialized = await vaultService.isVaultInitialized();
            if (isInitialized && !(await vaultService.isUnlocked())) {
                throw new Error("Sign-in successful, but the application's credential vault is locked. Please unlock the vault and try again.");
            }

            sessionStorage.setItem('google_access_token', tokenResponse.access_token);
            const profile = await getGoogleUserProfile(tokenResponse.access_token);
            const appUser: AppUser = {
                uid: profile.sub,
                displayName: profile.name,
                email: profile.email,
                photoURL: profile.picture,
                tier: 'free',
            };
            onUserChangedCallback(appUser);
        } catch (error) {
            logError(error as Error, { context: 'googleAuthInitCallback' });
            signOutUser(); // Ensure partial sign-in state is cleared
            alert(`Authentication failed: ${(error as Error).message}`);
        }
      } else {
        const errorMessage = 'Google sign-in failed: No access token received from Google.';
        logError(new Error(errorMessage), { tokenResponse });
        onUserChangedCallback(null);
        alert(errorMessage);
      }
    },
  });
}

/**
 * Initiates the Google Sign-In flow by requesting an access token.
 * The result is handled by the callback provided to `initGoogleAuth`.
 * @example
 * signInWithGoogle();
 */
export function signInWithGoogle() {
  if (tokenClient) {
    tokenClient.requestAccessToken({ prompt: 'consent' });
  } else {
    const errorMsg = "Authentication service is not ready. Please try again in a moment.";
    logError(new Error("Google Token Client not initialized."));
    alert(errorMsg);
  }
}

/**
 * Signs the current user out, revokes the Google OAuth token if possible,
 * and clears session data.
 * @example
 * signOutUser();
 */
export function signOutUser() {
  const token = sessionStorage.getItem('google_access_token');
  if (token && (window.google?.accounts as any)?.oauth2) {
      (google.accounts as any).oauth2.revoke(token, () => {
        console.log('Google token revoked.');
      });
  }
  sessionStorage.removeItem('google_access_token');
  onUserChangedCallback(null);
}
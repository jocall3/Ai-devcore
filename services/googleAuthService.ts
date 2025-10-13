import type { AppUser } from '../types.ts';
import { logError } from './telemetryService.ts';

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

const getGoogleUserProfile = async (accessToken: string) => {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
        throw new Error('Failed to fetch user profile');
    }
    return response.json();
};

export function initGoogleAuth(callback: (user: AppUser | null) => void) {
  if (!GOOGLE_CLIENT_ID) {
    console.error('Google Client ID not configured.');
    return;
  }
  onUserChangedCallback = callback;
  
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: SCOPES,
    callback: async (tokenResponse: any) => {
      if (tokenResponse && tokenResponse.access_token) {
        sessionStorage.setItem('google_access_token', tokenResponse.access_token);
        try {
            const profile = await getGoogleUserProfile(tokenResponse.access_token);
            const appUser: AppUser = {
                uid: profile.sub, // 'sub' is the standard OIDC field for user ID
                displayName: profile.name,
                email: profile.email,
                photoURL: profile.picture,
                tier: 'free',
            };
            onUserChangedCallback(appUser);
        } catch (error) {
            logError(error as Error, { context: 'googleAuthInitCallback' });
            onUserChangedCallback(null);
        }
      } else {
        logError(new Error('Google sign-in failed: No access token received.'), { tokenResponse });
        onUserChangedCallback(null);
      }
    },
  });
}

export function signInWithGoogle() {
  if (tokenClient) {
    tokenClient.requestAccessToken({ prompt: 'consent' });
  } else {
    logError(new Error("Google Token Client not initialized."));
  }
}

export function signOutUser() {
  const token = sessionStorage.getItem('google_access_token');
  if (token && window.google) {
      google.accounts.oauth2.revoke(token, () => {
        console.log('Google token revoked');
      });
  }
  sessionStorage.removeItem('google_access_token');
  onUserChangedCallback(null);
}
// services/googleApiService.ts
const API_KEY = process.env.GEMINI_API_KEY;
const CLIENT_ID = "555179712981-36hlicm802genhfo9iq1ufnp1n8cikt9.apps.googleusercontent.com";

declare global { interface Window { gapi: any; } }

let gapiInitialized = false;

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

export const ensureGapiClient = async (): Promise<boolean> => {
    if (gapiInitialized) return true;
    
    try {
        await loadGapiScript();

        await window.gapi.client.init({
            apiKey: API_KEY,
            clientId: CLIENT_ID,
            discoveryDocs: [
                "https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest",
                "https://docs.googleapis.com/$discovery/rest?version=v1",
                "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest",
                "https://iam.googleapis.com/$discovery/rest?version=v1"
            ],
        });

        const accessToken = sessionStorage.getItem('google_access_token');
        if (!accessToken) {
            console.error("GAPI: Access token not found. User may need to sign in again.");
            return false;
        }
        
        window.gapi.client.setToken({ access_token: accessToken });
        gapiInitialized = true;
        return true;
    } catch (error) {
        console.error("GAPI client initialization failed:", error);
        gapiInitialized = false;
        return false;
    }
};
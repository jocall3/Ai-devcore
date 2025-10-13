/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

/**
 * A robust way to convert an ArrayBuffer to a Base64 string.
 * @param buffer The ArrayBuffer to convert.
 * @returns The Base64 encoded string.
 */
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
};

/**
 * Converts a Blob object to a Base64 encoded string.
 * This implementation uses readAsArrayBuffer for greater robustness across environments.
 * @param blob The Blob object to convert.
 * @returns A promise that resolves with the Base64 string.
 */
export const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            resolve(arrayBufferToBase64(reader.result as ArrayBuffer));
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(blob);
    });
};

/**
 * Converts a File object to a Base64 encoded string.
 * This function is an alias for blobToBase64.
 * @param file The File object to convert.
 * @returns A promise that resolves with the Base64 string.
 */
export const fileToBase64 = (file: File): Promise<string> => {
    return blobToBase64(file);
};

/**
 * Converts a Blob object to a Data URL string.
 * This implementation uses readAsArrayBuffer for greater robustness across environments.
 * This function keeps the Data URL prefix (e.g., "data:image/png;base64,").
 * @param blob The Blob object to convert.
 * @returns A promise that resolves with the Data URL string.
 */
export const blobToDataURL = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = arrayBufferToBase64(reader.result as ArrayBuffer);
            resolve(`data:${blob.type};base64,${base64}`);
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(blob);
    });
};

/**
 * Triggers a browser download for the given content.
 * @param content The string content to download.
 * @param filename The name of the file.
 * @param mimeType The MIME type of the file.
 */
export const downloadFile = (content: string, filename: string, mimeType: string = 'text/plain') => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

/**
 * Generates and triggers a download for a .env formatted file.
 * @param env A record of key-value pairs for the environment variables.
 */
export const downloadEnvFile = (env: Record<string, string>): void => {
    const content = Object.entries(env)
        .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
        .join('\n');
    downloadFile(content, '.env', 'text/plain');
};

/**
 * Generates and triggers a download for a JSON file.
 * @param data The JavaScript object to stringify and download.
 * @param filename The name of the file.
 */
export const downloadJson = (data: object, filename: string): void => {
    const content = JSON.stringify(data, null, 2);
    downloadFile(content, filename, 'application/json');
};
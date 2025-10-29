/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @file This service acts as the main-thread interface to the Security Core Web Worker.
 * It abstracts away the message-passing mechanism and provides a clean, promise-based API
 * for all cryptographic operations. The session key is managed exclusively within the
 * worker and is never exposed to the main thread.
 */

import { logError } from './telemetryService';
import type { EncryptedData } from '../types';

/**
 * Represents the structure of a message sent to the Security Core worker.
 * @template T - The type of the payload.
 */
interface WorkerRequest<T = any> {
  command: string;
  payload: T;
  requestId: string;
}

/**
 * Represents the structure of a message received from the Security Core worker.
 * @template T - The type of the data in a successful response.
 */
interface WorkerResponse<T = any> {
  requestId: string;
  success: boolean;
  data?: T;
  error?: string;
}

let worker: Worker | null = null;
const pendingRequests = new Map<string, { resolve: (value: any) => void, reject: (reason?: any) => void }>();

/**
 * Initializes the Security Core Web Worker and sets up the message listener.
 * This should be called once when the application starts.
 *
 * @example
 * import { initSecurityCore } from './services/cryptoService';
 *
 * function main() {
 *   try {
 *     initSecurityCore();
 *     console.log('Security Core initialized.');
 *   } catch (error) {
 *     console.error('Failed to initialize Security Core:', error);
 *   }
 * }
 *
 * main();
 */
export function initSecurityCore(): void {
  if (worker) {
    console.warn('Security Core Worker is already initialized.');
    return;
  }

  try {
    worker = new Worker(new URL('../workers/securityCore.worker.ts', import.meta.url), { type: 'module' });

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { requestId, success, data, error } = event.data;
      const request = pendingRequests.get(requestId);

      if (request) {
        if (success) {
          request.resolve(data);
        } else {
          request.reject(new Error(error || 'An unknown error occurred in the Security Core Worker.'));
        }
        pendingRequests.delete(requestId);
      }
    };

    worker.onerror = (error) => {
      logError(error as any, { context: 'SecurityCoreWorker' });
      console.error('An unhandled error occurred in the Security Core Worker:', error);
      pendingRequests.forEach((request) => {
        request.reject(new Error('The Security Core Worker crashed.'));
      });
      pendingRequests.clear();
    };
  } catch (error) {
    logError(error as Error, { context: 'initSecurityCore' });
    console.error('Failed to create the Security Core Worker:', error);
    throw new Error('Could not initialize the Security Core. This may be due to browser limitations or a misconfiguration.');
  }
}

/**
 * Sends a command and payload to the worker and returns a promise that resolves with the result.
 * @template T - The expected return type from the worker.
 * @param {string} command - The command to be executed by the worker.
 * @param {any} [payload={}] - The data associated with the command.
 * @returns {Promise<T>} A promise that resolves with the data from the worker's response.
 * @private
 */
function postMessageToWorker<T>(command: string, payload: any = {}): Promise<T> {
  if (!worker) {
    return Promise.reject(new Error('Security Core Worker is not initialized. Please call initSecurityCore() first.'));
  }

  const requestId = crypto.randomUUID();
  const request: WorkerRequest = { command, payload, requestId };

  return new Promise<T>((resolve, reject) => {
    pendingRequests.set(requestId, { resolve, reject });
    worker!.postMessage(request);
  });
}

/**
 * Generates a cryptographically secure random salt within the worker.
 * @returns {Promise<ArrayBuffer>} A promise that resolves with the new salt.
 * @example
 * const salt = await generateSalt();
 */
export const generateSalt = (): Promise<ArrayBuffer> => {
  return postMessageToWorker<ArrayBuffer>('generate-salt');
};

/**
 * Instructs the worker to derive a key from a password and salt, then caches it in the worker's memory.
 * @param {string} password - The user's master password.
 * @param {ArrayBuffer} salt - The salt to use for key derivation.
 * @returns {Promise<boolean>} A promise that resolves to true on success.
 * @example
 * const salt = await getVaultData('pbkdf2-salt');
 * if (salt) {
 *   await deriveAndCacheKey('my-secret-password', salt);
 * }
 */
export const deriveAndCacheKey = (password: string, salt: ArrayBuffer): Promise<boolean> => {
  return postMessageToWorker<boolean>('derive-and-cache-key', { password, salt });
};

/**
 * Encrypts a plaintext string using the worker's cached session key.
 * @param {string} plaintext - The data to encrypt.
 * @returns {Promise<Omit<EncryptedData, 'id'>>} A promise that resolves with the encrypted data structure, including ciphertext and iv.
 * @example
 * const { ciphertext, iv } = await encrypt('my-secret-api-key');
 * // Now you can store the result in IndexedDB.
 */
export const encrypt = (plaintext: string): Promise<Omit<EncryptedData, 'id'>> => {
    return postMessageToWorker<{ ciphertext: ArrayBuffer, iv: Uint8Array }>('encrypt', { plaintext });
};

/**
 * Decrypts data using the worker's cached session key.
 * @param {Omit<EncryptedData, 'id'>} data - The encrypted data object containing ciphertext and iv.
 * @returns {Promise<string>} A promise that resolves with the decrypted plaintext.
 * @example
 * const encryptedData = await getEncryptedToken('github_pat');
 * if (encryptedData) {
 *   const { id, ...payload } = encryptedData;
 *   const plaintext = await decrypt(payload);
 *   console.log(plaintext);
 * }
 */
export const decrypt = (data: Omit<EncryptedData, 'id'>): Promise<string> => {
    return postMessageToWorker<string>('decrypt', { ciphertext: data.ciphertext, iv: data.iv });
};

/**
 * Instructs the worker to securely discard the cached session key, effectively locking the vault.
 * @returns {Promise<boolean>} A promise that resolves to true when the key is discarded.
 * @example
 * await lock();
 */
export const lock = (): Promise<boolean> => {
  return postMessageToWorker<boolean>('lock');
};

/**
 * Checks if the worker currently holds a session key (i.e., if the vault is unlocked).
 * @returns {Promise<boolean>} A promise that resolves to true if the vault is unlocked, false otherwise.
 * @example
 * if (await isUnlocked()) {
 *   // Proceed with operations
 * }
 */
export const isUnlocked = (): Promise<boolean> => {
  return postMessageToWorker<boolean>('is-unlocked');
};

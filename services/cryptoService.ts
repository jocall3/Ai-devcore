/**
 * @file This service acts as the main-thread interface to the Security Core Web Worker.
 * It abstracts away the message-passing mechanism and provides a clean, promise-based API
 * for all cryptographic operations. The session key is managed exclusively within the
 * worker and is never exposed to the main thread.
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { logError } from './telemetryService.ts';
import type { EncryptedData, VaultCanary } from '../types.ts';

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
  command: string;
  requestId?: string;
  success?: boolean;
  payload?: T;
  error?: string;
}

let worker: Worker | null = null;
const pendingRequests = new Map<string, { resolve: (value: any) => void, reject: (reason?: any) => void }>();

/**
 * Initializes the Security Core Web Worker and sets up the message listener.
 * This should be called once when the application starts.
 * @example
 * initSecurityCore();
 */
export function initSecurityCore(): void {
  if (worker) {
    console.warn('Security Core Worker is already initialized.');
    return;
  }

  try {
    // The worker path is relative to this file's location after build.
    worker = new Worker(new URL('../modules/security-core/security-core.worker.ts', import.meta.url), { type: 'module' });

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { requestId, command, success, payload, error } = event.data;
      if (requestId) {
        const request = pendingRequests.get(requestId);
        if (request) {
          if (success) {
            request.resolve(payload);
          } else {
            request.reject(new Error(error || `An unknown error occurred for command ${command}.`));
          }
          pendingRequests.delete(requestId);
        }
      } else {
        // Handle events without a specific request ID, like 'VAULT_LOCKED'
        console.log(`Security Core Event: ${command}`, payload);
      }
    };

    worker.onerror = (error) => {
      logError(error as any, { context: 'SecurityCoreWorker' });
      console.error('An unhandled error occurred in the Security Core Worker:', error.message);
      // Reject all pending requests as the worker is in an unrecoverable state.
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
function postCommandToWorker<T>(command: string, payload: any = {}): Promise<T> {
  if (!worker) {
    return Promise.reject(new Error('Security Core Worker is not initialized. Please call initSecurityCore() first.'));
  }

  // crypto.randomUUID() refers to the global Web Crypto API (window.crypto.randomUUID())
  const requestId = crypto.randomUUID();
  const request: WorkerRequest = { command, payload, requestId };

  return new Promise<T>((resolve, reject) => {
    pendingRequests.set(requestId, { resolve, reject });
    worker!.postMessage(request);
  });
}

/**
 * Generates a cryptographically secure random salt on the main thread.
 * This is a safe operation to perform on the main thread and is needed before vault initialization.
 * @returns {ArrayBuffer} A new 16-byte salt.
 */
export const generateSalt = (): ArrayBuffer => {
  return window.crypto.getRandomValues(new Uint8Array(16)).buffer;
};

/**
 * Instructs the worker to initialize a new vault with a master password and salt.
 * @param {string} masterPassword - The user's master password.
 * @param {ArrayBuffer} salt - The newly generated salt.
 * @returns {Promise<{ canary: VaultCanary }>} A promise that resolves with the encrypted canary for verification.
 */
export const initializeVault = (masterPassword: string, salt: ArrayBuffer): Promise<{ canary: VaultCanary }> => {
  return postCommandToWorker('INIT_VAULT', { masterPassword, salt });
};

/**
 * Instructs the worker to unlock the vault using the master password, salt, and canary.
 * The worker will derive the key, attempt to decrypt the canary, and store the key in its memory on success.
 * @param {string} masterPassword - The user's master password.
 * @param {ArrayBuffer} salt - The stored salt for the vault.
 * @param {VaultCanary} canary - The encrypted canary for password verification.
 * @returns {Promise<void>} A promise that resolves on successful unlock.
 */
export const unlockVault = (masterPassword: string, salt: ArrayBuffer, canary: VaultCanary): Promise<void> => {
  return postCommandToWorker('UNLOCK_VAULT', { masterPassword, salt, canary });
};

/**
 * Checks if the vault is currently unlocked (i.e., if a session key is cached in the worker).
 * @returns {Promise<boolean>} A promise that resolves with true if unlocked, false otherwise.
 */
export const isVaultUnlocked = (): Promise<boolean> => {
  return postCommandToWorker<boolean>('IS_UNLOCKED');
};

/**
 * Instructs the worker to securely discard the cached session key, effectively locking the vault.
 * @returns {Promise<void>} A promise that resolves when the vault is locked.
 */
export const lockVault = (): Promise<void> => {
  return postCommandToWorker('LOCK_VAULT');
};

/**
 * Encrypts a plaintext string using the worker's cached session key.
 * @param {string} id - A unique identifier for the credential being encrypted.
 * @param {string} plaintext - The data to encrypt.
 * @returns {Promise<EncryptedData>} A promise that resolves with the encrypted data structure, including id, ciphertext, and iv.
 */
export const encrypt = (id: string, plaintext: string): Promise<EncryptedData> => {
  return postCommandToWorker<EncryptedData>('ENCRYPT', { id, plaintext });
};

/**
 * Decrypts data using the worker's cached session key.
 * @param {EncryptedData} data - The encrypted data object to decrypt.
 * @returns {Promise<{ id: string; plaintext: string }>} A promise that resolves with the original ID and decrypted plaintext.
 */
export const decrypt = (data: EncryptedData): Promise<{ id: string; plaintext: string }> => {
  return postCommandToWorker<{ id: string; plaintext: string }>('DECRYPT', data);
};
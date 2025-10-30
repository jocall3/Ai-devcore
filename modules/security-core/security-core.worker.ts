/**
 * @fileoverview Security Core Web Worker
 * @description This worker is the heart of the application's security model. It runs in a separate, sandboxed thread
 * and is the sole manager of the in-memory session key used for encrypting and decrypting credentials.
 * All cryptographic operations are performed exclusively within this worker to isolate sensitive data and
 * prevent access from the main UI thread, enhancing security.
 * Communication with the main thread is handled via a strict message-passing interface.
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/// <reference lib="webworker" />

import type { EncryptedData } from '../../types';

// --- STATE & CONSTANTS ---

/**
 * The in-memory cryptographic key used for the current session. It is null when the vault is locked.
 * @type {CryptoKey | null}
 */
let sessionKey: CryptoKey | null = null;

// --- CRYPTOGRAPHIC IMPLEMENTATIONS ---
// These functions are defined directly in the worker to ensure they are fully sandboxed.

const PBKDF2_ITERATIONS = 250000;
const PBKDF2_HASH = 'SHA-256';
const AES_ALGORITHM = 'AES-GCM';
const AES_KEY_LENGTH = 256;
const AES_IV_LENGTH_BYTES = 12; // 96 bits is recommended for AES-GCM

/**
 * Generates a cryptographically secure random salt.
 * @returns {ArrayBuffer} A new salt.
 */
function generateSalt(): ArrayBuffer {
  return self.crypto.getRandomValues(new Uint8Array(16)).buffer;
}

/**
 * Derives a cryptographic key from a password and salt using PBKDF2.
 * @param {string} password The master password.
 * @param {ArrayBuffer} salt The salt.
 * @returns {Promise<CryptoKey>} The derived CryptoKey.
 */
async function deriveKey(password: string, salt: ArrayBuffer): Promise<CryptoKey> {
  const masterKey = await self.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return self.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    masterKey,
    { name: AES_ALGORITHM, length: AES_KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a plaintext string using a given key.
 * @param {string} plaintext The string to encrypt.
 * @param {CryptoKey} key The key to use for encryption.
 * @returns {Promise<Omit<EncryptedData, 'id'>>} The ciphertext and initialization vector (iv).
 */
async function encrypt(plaintext: string, key: CryptoKey): Promise<Omit<EncryptedData, 'id'>> {
  const iv = self.crypto.getRandomValues(new Uint8Array(AES_IV_LENGTH_BYTES));
  const ciphertext = await self.crypto.subtle.encrypt(
    { name: AES_ALGORITHM, iv },
    key,
    new TextEncoder().encode(plaintext)
  );
  return { ciphertext, iv };
}

/**
 * Decrypts data using a given key.
 * @param {ArrayBuffer} ciphertext The data to decrypt.
 * @param {CryptoKey} key The key to use for decryption.
 * @param {Uint8Array} iv The initialization vector.
 * @returns {Promise<string>} The decrypted plaintext.
 */
async function decrypt(ciphertext: ArrayBuffer, key: CryptoKey, iv: Uint8Array): Promise<string> {
  const decrypted = await self.crypto.subtle.decrypt(
    { name: AES_ALGORITHM, iv },
    key,
    ciphertext
  );
  return new TextDecoder().decode(decrypted);
}

// --- WORKER MESSAGE HANDLING ---

/**
 * Represents a request from the main thread.
 */
interface WorkerRequest {
  requestId: string;
  command: string;
  payload: any;
}

/**
 * Handles incoming messages from the main thread, executes the requested command,
 * and posts the result back.
 * @param {MessageEvent<WorkerRequest>} event The message event.
 */
self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { requestId, command, payload } = event.data;

  try {
    let result: any;
    let transferList: Transferable[] = [];

    switch (command) {
      case 'generate-salt':
        result = generateSalt();
        transferList.push(result);
        break;

      case 'derive-and-cache-key':
        sessionKey = await deriveKey(payload.password, payload.salt);
        result = true;
        break;

      case 'encrypt':
        if (!sessionKey) throw new Error('Vault is locked.');
        result = await encrypt(payload.plaintext, sessionKey);
        transferList.push(result.ciphertext);
        break;

      case 'decrypt':
        if (!sessionKey) throw new Error('Vault is locked.');
        result = await decrypt(payload.ciphertext, sessionKey, payload.iv);
        break;

      case 'lock':
        sessionKey = null;
        result = true;
        break;

      case 'is-unlocked':
        result = !!sessionKey;
        break;

      default:
        throw new Error(`Unknown command: ${command}`);
    }

    self.postMessage({ requestId, success: true, data: result }, transferList);
  } catch (err) {
    const error = err instanceof Error ? { name: err.name, message: err.message } : { name: 'UnknownError', message: 'An unknown error occurred in the worker.' };
    self.postMessage({ requestId, success: false, error: error.message });
  }
};

console.log('Security Core Worker initialized and ready.');
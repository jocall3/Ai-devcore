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

import type { SecurityCoreRequest, SecurityCoreResponse, EncryptedData, VaultCanary } from './security-core.types.ts';
import * as crypto from './crypto.ts';

/**
 * The in-memory cryptographic key used for the current session. It is null when the vault is locked.
 * @type {CryptoKey | null}
 */
let sessionKey: CryptoKey | null = null;

/**
 * The timer ID for the inactivity auto-lock mechanism.
 * @type {number | null}
 */
let inactivityTimer: number | null = null;

/**
 * The duration of inactivity in milliseconds before the vault automatically locks.
 * @constant
 * @type {number}
 * @example 30 minutes
 */
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

/**
 * The known plaintext value used as a "canary" to verify the master password upon unlocking.
 * This value is encrypted during vault initialization and stored. When unlocking, the derived key
 * must be able to decrypt the canary back to this original value.
 * @constant
 * @type {string}
 */
const VAULT_CANARY_PLAINTEXT = 'devcore-vault-check';

/**
 * Posts a message back to the main thread.
 * @template T
 * @param {SecurityCoreResponse<T>} message The message object to send.
 * @param {Transferable[]} [transfer] An optional array of transferable objects.
 * @example
 * postResponse({ command: 'INIT_VAULT_SUCCESS' });
 * postResponse({ command: 'ENCRYPT_SUCCESS', payload: encryptedData }, [encryptedData.ciphertext]);
 */
function postResponse<T>(message: SecurityCoreResponse<T>, transfer?: Transferable[]): void {
  if (transfer) {
    self.postMessage(message, transfer);
  } else {
    self.postMessage(message);
  }
}

/**
 * Locks the vault by clearing the session key and the inactivity timer.
 * Notifies the main thread that the vault has been locked.
 * @returns {void}
 * @example
 * handleLockVault();
 */
function handleLockVault(): void {
  sessionKey = null;
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }
  console.log('Security Core: Vault locked due to inactivity or explicit request.');
  postResponse({ command: 'VAULT_LOCKED' });
}

/**
 * Resets the inactivity timer. Any cryptographic operation will reset the timer.
 * If the timer expires, the vault will be locked automatically.
 * @returns {void}
 * @example
 * resetInactivityTimer();
 */
function resetInactivityTimer(): void {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
  }
  inactivityTimer = self.setTimeout(handleLockVault, SESSION_TIMEOUT_MS);
}

/**
 * Handles incoming messages from the main thread and routes them to the appropriate function.
 * @param {MessageEvent<SecurityCoreRequest>} event The message event from the main thread.
 * @returns {Promise<void>}
 * @example
 * // This function is the event listener for the worker's 'message' event.
 * self.onmessage = handleMessage;
 */
async function handleMessage(event: MessageEvent<SecurityCoreRequest>): Promise<void> {
  const { command, payload } = event.data;

  try {
    switch (command) {
      case 'INIT_VAULT': {
        const { masterPassword, salt } = payload;
        sessionKey = await crypto.deriveKey(masterPassword, salt);
        const canaryCipher = await crypto.encrypt(VAULT_CANARY_PLAINTEXT, sessionKey);
        const canary: VaultCanary = { ciphertext: canaryCipher.ciphertext, iv: canaryCipher.iv };
        resetInactivityTimer();
        postResponse({ command: 'INIT_VAULT_SUCCESS', payload: { canary } }, [canary.ciphertext]);
        break;
      }

      case 'UNLOCK_VAULT': {
        const { masterPassword, salt, canary } = payload;
        const key = await crypto.deriveKey(masterPassword, salt);
        const decryptedCanary = await crypto.decrypt(canary.ciphertext, key, canary.iv);
        if (decryptedCanary !== VAULT_CANARY_PLAINTEXT) {
          throw new Error('Invalid Master Password.');
        }
        sessionKey = key;
        resetInactivityTimer();
        postResponse({ command: 'UNLOCK_VAULT_SUCCESS' });
        break;
      }

      case 'LOCK_VAULT': {
        handleLockVault();
        break;
      }

      case 'ENCRYPT': {
        if (!sessionKey) throw new Error('Vault is locked.');
        const { id, plaintext } = payload;
        const encryptedData = await crypto.encrypt(plaintext, sessionKey);
        const responsePayload: EncryptedData = { id, ...encryptedData };
        resetInactivityTimer();
        postResponse({ command: 'ENCRYPT_SUCCESS', payload: responsePayload }, [responsePayload.ciphertext]);
        break;
      }

      case 'DECRYPT': {
        if (!sessionKey) throw new Error('Vault is locked.');
        const { id, ciphertext, iv } = payload as EncryptedData;
        const plaintext = await crypto.decrypt(ciphertext, sessionKey, iv);
        resetInactivityTimer();
        postResponse({ command: 'DECRYPT_SUCCESS', payload: { id, plaintext } });
        break;
      }

      default:
        throw new Error(`Unknown command: ${command}`);
    }
  } catch (error) {
    console.error(`Security Core Error on command '${command}':`, error);
    // On decryption failure, it's likely the key is wrong. Lock the vault.
    if (command === 'DECRYPT' || command === 'UNLOCK_VAULT') {
      handleLockVault();
    }
    postResponse({ command: `${command}_FAILURE`, error: (error as Error).message });
  }
}

// Set the message handler for the worker.
self.onmessage = handleMessage;

console.log('Security Core Worker initialized.');

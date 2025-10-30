/**
 * @fileoverview Cryptographic utility functions for the Security Core Web Worker.
 * This module encapsulates all Web Crypto API interactions for key derivation, encryption,
 * and decryption. These functions are designed to be run exclusively within the sandboxed
 * security worker, ensuring that master passwords and session keys never leave its context.
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const PBKDF2_ITERATIONS = 250000;
const IV_LENGTH = 12; // 96 bits is recommended for AES-GCM

/**
 * Derives a cryptographic key from a master password and salt using PBKDF2.
 * The derived key is suitable for AES-GCM encryption/decryption.
 * @param {string} password - The master password.
 * @param {ArrayBuffer} salt - The salt to use for derivation.
 * @returns {Promise<CryptoKey>} A promise that resolves to the derived CryptoKey.
 */
export async function deriveKey(password: string, salt: ArrayBuffer): Promise<CryptoKey> {
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
      hash: 'SHA-256',
    },
    masterKey,
    { name: 'AES-GCM', length: 256 },
    true, // The key must be exportable to be used in some contexts, though we don't export it.
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a plaintext string using AES-GCM.
 * @param {string} plaintext - The data to encrypt.
 * @param {CryptoKey} key - The session key to use for encryption.
 * @returns {Promise<{ ciphertext: ArrayBuffer, iv: Uint8Array }>} A promise that resolves to an object containing the ciphertext and initialization vector (IV).
 */
export async function encrypt(plaintext: string, key: CryptoKey): Promise<{ ciphertext: ArrayBuffer, iv: Uint8Array }> {
  const iv = self.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encodedPlaintext = new TextEncoder().encode(plaintext);

  const ciphertext = await self.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    encodedPlaintext
  );

  return { ciphertext, iv };
}

/**
 * Decrypts a ciphertext using AES-GCM.
 * @param {ArrayBuffer} ciphertext - The encrypted data.
 * @param {CryptoKey} key - The session key to use for decryption.
 * @param {Uint8Array} iv - The initialization vector used during encryption.
 * @returns {Promise<string>} A promise that resolves to the decrypted plaintext string.
 * @throws {Error} If decryption fails (e.g., due to incorrect key, IV, or tampered data).
 */
export async function decrypt(ciphertext: ArrayBuffer, key: CryptoKey, iv: Uint8Array): Promise<string> {
  try {
    const decrypted = await self.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    // Throw a generic error to avoid leaking details about why it failed (e.g., padding oracle attacks).
    throw new Error('Decryption failed. The data may be corrupt or the key/IV is incorrect.');
  }
}

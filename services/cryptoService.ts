/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

const KEY_ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const PBKDF2_ALGORITHM = 'PBKDF2';
const PBKDF2_HASH = 'SHA-256';
const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH_BYTES = 16;
const IV_LENGTH_BYTES = 12;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/**
 * Derives a cryptographic key from a master password and a salt using PBKDF2.
 * @param password The master password string.
 * @param salt The salt as an ArrayBuffer.
 * @returns A promise that resolves to a CryptoKey.
 */
export const deriveKey = async (password: string, salt: ArrayBuffer): Promise<CryptoKey> => {
    const masterKey = await crypto.subtle.importKey(
        'raw',
        textEncoder.encode(password),
        { name: PBKDF2_ALGORITHM },
        false,
        ['deriveKey']
    );

    return await crypto.subtle.deriveKey(
        {
            name: PBKDF2_ALGORITHM,
            salt,
            iterations: PBKDF2_ITERATIONS,
            hash: PBKDF2_HASH,
        },
        masterKey,
        { name: KEY_ALGORITHM, length: KEY_LENGTH },
        true,
        ['encrypt', 'decrypt']
    );
};

/**
 * Generates a cryptographically secure random salt.
 * @returns A new salt as an ArrayBuffer.
 */
export const generateSalt = (): ArrayBuffer => {
    return crypto.getRandomValues(new Uint8Array(SALT_LENGTH_BYTES)).buffer;
};

/**
 * Encrypts a plaintext string using a derived key.
 * @param plaintext The string to encrypt.
 * @param key The CryptoKey to use for encryption.
 * @returns A promise that resolves to an object containing the encrypted data (ciphertext), and the initialization vector (iv).
 */
export const encrypt = async (plaintext: string, key: CryptoKey): Promise<{ ciphertext: ArrayBuffer, iv: Uint8Array }> => {
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));
    const encodedPlaintext = textEncoder.encode(plaintext);

    const ciphertext = await crypto.subtle.encrypt(
        {
            name: KEY_ALGORITHM,
            iv,
        },
        key,
        encodedPlaintext
    );

    return { ciphertext, iv };
};

/**
 * Decrypts a ciphertext ArrayBuffer using a derived key and IV.
 * @param ciphertext The ArrayBuffer of the encrypted data.
 * @param key The CryptoKey to use for decryption.
 * @param iv The initialization vector used during encryption.
 * @returns A promise that resolves to the decrypted plaintext string.
 */
export const decrypt = async (ciphertext: ArrayBuffer, key: CryptoKey, iv: Uint8Array): Promise<string> => {
    const decrypted = await crypto.subtle.decrypt(
        {
            name: KEY_ALGORITHM,
            iv,
        },
        key,
        ciphertext
    );

    return textDecoder.decode(decrypted);
};

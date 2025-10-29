/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import * as crypto from './cryptoService.ts';
import * as db from './dbService.ts';
import type { EncryptedData } from '../types.ts';

let sessionKey: CryptoKey | null = null;
let sessionTimeoutId: number | null = null;

// 30 minutes in milliseconds
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

/**
 * A callback function to be invoked when the vault's lock state changes.
 * @param isUnlocked - True if the vault is unlocked, false otherwise.
 */
type StateChangeCallback = (isUnlocked: boolean) => void;
let onStateChangeCallback: StateChangeCallback | null = null;

/**
 * Notifies registered listeners about a change in the vault's lock state.
 * @param {boolean} isUnlocked - The new lock state.
 * @private
 */
const notifyStateChange = (isUnlocked: boolean) => {
    onStateChangeCallback?.(isUnlocked);
};

/**
 * Resets the session timeout timer. Any interaction with the vault should call this
 * to keep the session active.
 * @private
 */
const resetSessionTimeout = () => {
    if (sessionTimeoutId) {
        clearTimeout(sessionTimeoutId);
    }
    sessionTimeoutId = window.setTimeout(() => {
        console.log("Vault session timed out. Locking vault automatically.");
        lockVault();
    }, SESSION_TIMEOUT_MS);
};

/**
 * Registers a callback function to be called whenever the vault's lock state changes.
 * This allows the UI to stay in sync with the vault's internal state.
 * @param {StateChangeCallback} callback - The function to call on state change.
 * @example
 * registerOnStateChange(isUnlocked => {
 *   // dispatch global state update
 * });
 */
export const registerOnStateChange = (callback: StateChangeCallback) => {
    onStateChangeCallback = callback;
};

/**
 * Checks if the vault has been initialized with a master password.
 * @returns {Promise<boolean>} A promise that resolves to true if initialized, false otherwise.
 * @example
 * const initialized = await isVaultInitialized();
 */
export const isVaultInitialized = async (): Promise<boolean> => {
    const salt = await db.getVaultData('pbkdf2-salt');
    return !!salt;
};

/**
 * Initializes the vault with a new master password, creating a salt and deriving the first session key.
 * @param {string} masterPassword - The user's chosen master password.
 * @throws {Error} If the vault is already initialized.
 * @returns {Promise<void>}
 * @example
 * await initializeVault('my-secret-password-123');
 */
export const initializeVault = async (masterPassword: string): Promise<void> => {
    if (await isVaultInitialized()) {
        throw new Error("Vault is already initialized.");
    }
    const salt = crypto.generateSalt();
    await db.saveVaultData('pbkdf2-salt', salt);
    sessionKey = await crypto.deriveKey(masterPassword, salt);
    resetSessionTimeout();
    notifyStateChange(true);
};

/**
 * Checks if the vault is currently unlocked (i.e., the session key is in memory).
 * @returns {boolean} True if the vault is unlocked, false otherwise.
 * @example
 * if (isUnlocked()) {
 *   // perform encrypted action
 * }
 */
export const isUnlocked = (): boolean => {
    return sessionKey !== null;
};

/**
 * Attempts to unlock the vault by deriving a session key from the provided master password.
 * On success, it starts the session timeout.
 * @param {string} masterPassword - The user's master password.
 * @throws {Error} If the vault is not initialized or if the password is incorrect.
 * @returns {Promise<void>}
 * @example
 * await unlockVault('my-secret-password-123');
 */
export const unlockVault = async (masterPassword: string): Promise<void> => {
    const salt = await db.getVaultData('pbkdf2-salt');
    if (!salt) {
        throw new Error("Vault not initialized.");
    }
    try {
        sessionKey = await crypto.deriveKey(masterPassword, salt);
        resetSessionTimeout();
        notifyStateChange(true);
    } catch (e) {
        console.error("Key derivation failed, likely incorrect password", e);
        throw new Error("Invalid Master Password.");
    }
};

/**
 * Locks the vault by clearing the session key from memory and stopping the session timer.
 * @example
 * lockVault();
 */
export const lockVault = (): void => {
    sessionKey = null;
    if (sessionTimeoutId) {
        clearTimeout(sessionTimeoutId);
        sessionTimeoutId = null;
    }
    notifyStateChange(false);
};

/**
 * Saves a plaintext credential to the vault, encrypting it with the current session key.
 * @param {string} id - The unique identifier for the credential (e.g., 'github_pat').
 * @param {string} plaintext - The sensitive data to encrypt and save.
 * @throws {Error} If the vault is locked.
 * @returns {Promise<void>}
 * @example
 * await saveCredential('github_pat', 'ghp_...');
 */
export const saveCredential = async (id: string, plaintext: string): Promise<void> => {
    if (!sessionKey) {
        throw new Error("Vault is locked. Cannot save credential.");
    }
    const { ciphertext, iv } = await crypto.encrypt(plaintext, sessionKey);
    const encryptedData: EncryptedData = {
        id,
        ciphertext,
        iv
    };
    await db.saveEncryptedToken(encryptedData);
    resetSessionTimeout();
};

/**
 * Retrieves and decrypts a credential from the vault.
 * @param {string} id - The unique identifier of the credential to retrieve.
 * @throws {Error} If the vault is locked or if decryption fails.
 * @returns {Promise<string | null>} A promise that resolves to the decrypted plaintext, or null if not found.
 * @example
 * const token = await getDecryptedCredential('github_pat');
 */
export const getDecryptedCredential = async (id: string): Promise<string | null> => {
    if (!sessionKey) {
        // This error is intentional. The UI layer should use the vault state
        // to prevent calling this function when the vault is locked.
        throw new Error("Vault is locked. Cannot retrieve credential.");
    }
    const encryptedData = await db.getEncryptedToken(id);
    if (!encryptedData) {
        return null;
    }
    try {
        const plaintext = await crypto.decrypt(encryptedData.ciphertext, sessionKey, encryptedData.iv);
        resetSessionTimeout(); // Successful decryption is considered activity.
        return plaintext;
    } catch (e) {
        console.error(`Decryption failed for credential '${id}'. The vault will be locked as a security precaution.`, e);
        lockVault(); // Relock on decryption failure.
        throw new Error("Decryption failed. This may be due to data corruption or an invalid key. The vault has been locked.");
    }
};

/**
 * Lists the IDs of all credentials stored in the vault.
 * @returns {Promise<string[]>} A promise that resolves to an array of credential IDs.
 * @example
 * const credentialIds = await listCredentials();
 */
export const listCredentials = async (): Promise<string[]> => {
    return db.getAllEncryptedTokenIds();
};

/**
 * Completely erases all vault data from the database and locks the service.
 * This is a destructive action.
 * @returns {Promise<void>}
 * @example
 * await resetVault();
 */
export const resetVault = async (): Promise<void> => {
    await db.clearAllData();
    lockVault();
}

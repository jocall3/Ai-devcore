import crypto from './cryptoService.ts'; // Changed import from `* as crypto` to `default import`
import * as db from './dbService.ts';
import type { EncryptedData } from '../types.ts';

/**
 * Checks if the vault has been initialized with a master password by looking for a salt in the database.
 * @returns {Promise<boolean>} A promise that resolves to true if initialized, false otherwise.
 */
export const isVaultInitialized = async (): Promise<boolean> => {
    const salt = await db.getVaultData('pbkdf2-salt');
    return !!salt;
};

/**
 * Initializes the vault with a new master password. This generates a new salt, stores it,
 * and commands the Security Core worker to derive and cache a session key.
 * @param {string} masterPassword - The user's chosen master password.
 * @throws {Error} If the vault is already initialized.
 * @returns {Promise<void>} A promise that resolves when the vault is successfully initialized and unlocked.
 */
export const initializeVault = async (masterPassword: string): Promise<void> => {
    if (await isVaultInitialized()) {
        throw new Error("Vault is already initialized.");
    }
    const salt = await crypto.generateSalt();
    await db.saveVaultData('pbkdf2-salt', salt);
    // This command also serves to unlock the vault for the first time.
    await crypto.deriveAndCacheKey(masterPassword, salt);
};

/**
 * Checks if the vault is currently unlocked by querying the Security Core worker.
 * @returns {Promise<boolean>} A promise that resolves to true if the vault is unlocked, false otherwise.
 */
export const isUnlocked = async (): Promise<boolean> => {
    return crypto.isUnlocked();
};

/**
 * Attempts to unlock the vault by sending the master password to the Security Core worker.
 * The worker will derive a key and verify it against a stored "canary" value.
 * On success, the worker caches the session key.
 * @param {string} masterPassword - The user's master password.
 * @throws {Error} If the vault is not initialized or if the password is incorrect.
 * @returns {Promise<void>} A promise that resolves on successful unlock.
 */
export const unlockVault = async (masterPassword: string): Promise<void> => {
    const salt = await db.getVaultData('pbkdf2-salt');
    if (!salt) {
        throw new Error("Vault not initialized.");
    }
    // The worker handles the logic of deriving the key and verifying it.
    // An error will be thrown by postMessageToWorker if derivation/caching fails (e.g., wrong password).
    await crypto.deriveAndCacheKey(masterPassword, salt);
};

/**
 * Locks the vault by instructing the Security Core worker to securely wipe the session key from its memory.
 * @returns {Promise<void>} A promise that resolves when the vault is locked.
 */
export const lockVault = async (): Promise<void> => {
    await crypto.lock();
};

/**
 * Saves a plaintext credential to the vault by encrypting it via the Security Core worker.
 * @param {string} id - The unique identifier for the credential (e.g., 'github_pat').
 * @param {string} plaintext - The sensitive data to encrypt and save.
 * @throws {Error} If the vault is locked.
 * @returns {Promise<void>} A promise that resolves when the credential is saved.
 */
export const saveCredential = async (id: string, plaintext: string): Promise<void> => {
    if (!(await isUnlocked())) {
        throw new Error("Vault is locked. Cannot save credential.");
    }
    const { ciphertext, iv } = await crypto.encrypt(id, plaintext);
    const encryptedData: EncryptedData = { id, ciphertext, iv };
    await db.saveEncryptedToken(encryptedData);
};

/**
 * Retrieves and decrypts a credential from the vault via the Security Core worker.
 * @param {string} id - The unique identifier of the credential to retrieve.
 * @throws {Error} If the vault is locked or if decryption fails.
 * @returns {Promise<string | null>} A promise that resolves to the decrypted plaintext, or null if not found.
 */
export const getDecryptedCredential = async (id: string): Promise<string | null> => {
    if (!(await isUnlocked())) {
        throw new Error("Vault is locked. Cannot retrieve credential.");
    }
    const encryptedData = await db.getEncryptedToken(id);
    if (!encryptedData) {
        return null;
    }
    // The worker will throw if decryption fails, and it will auto-lock itself.
    // We just need to let the error propagate up.
    const decryptedResult = await crypto.decrypt(encryptedData);
    return decryptedResult.plaintext; // Extract the plaintext property from the returned object
};

/**
 * Lists the IDs of all credentials stored in the vault.
 * @returns {Promise<string[]>} A promise that resolves to an array of credential IDs.
 */
export const listCredentials = async (): Promise<string[]> => {
    return db.getAllEncryptedTokenIds();
};

/**
 * Completely erases all vault data from the database and locks the service.
 * This is a destructive action.
 * @returns {Promise<void>}
 */
export const resetVault = async (): Promise<void> => {
    await db.clearAllData();
    await lockVault();
};
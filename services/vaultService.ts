/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import * as crypto from './cryptoService.ts';
import * as db from './dbService.ts';
import type { EncryptedData } from '../types.ts';

let sessionKey: CryptoKey | null = null;

export const isVaultInitialized = async (): Promise<boolean> => {
    const salt = await db.getVaultData('pbkdf2-salt');
    return !!salt;
};

export const initializeVault = async (masterPassword: string): Promise<void> => {
    if (await isVaultInitialized()) {
        throw new Error("Vault is already initialized.");
    }
    const salt = crypto.generateSalt();
    await db.saveVaultData('pbkdf2-salt', salt);
    sessionKey = await crypto.deriveKey(masterPassword, salt);
};

export const isUnlocked = (): boolean => {
    return sessionKey !== null;
};

export const unlockVault = async (masterPassword: string): Promise<void> => {
    const salt = await db.getVaultData('pbkdf2-salt');
    if (!salt) {
        throw new Error("Vault not initialized.");
    }
    try {
        sessionKey = await crypto.deriveKey(masterPassword, salt);
    } catch (e) {
        console.error("Key derivation failed, likely incorrect password", e);
        throw new Error("Invalid Master Password.");
    }
};

export const lockVault = (): void => {
    sessionKey = null;
};

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
};

export const getDecryptedCredential = async (id: string): Promise<string | null> => {
    if (!sessionKey) {
        throw new Error("Vault is locked. Cannot retrieve credential.");
    }
    const encryptedData = await db.getEncryptedToken(id);
    if (!encryptedData) {
        return null;
    }
    try {
        return await crypto.decrypt(encryptedData.ciphertext, sessionKey, encryptedData.iv);
    } catch (e) {
        console.error(`Decryption failed for ${id}`, e);
        lockVault(); // Relock the vault on decryption failure as a security measure
        throw new Error("Decryption failed. The vault has been locked.");
    }
};

export const listCredentials = async (): Promise<string[]> => {
    return db.getAllEncryptedTokenIds();
};

export const resetVault = async (): Promise<void> => {
    await db.clearAllData();
    lockVault();
}
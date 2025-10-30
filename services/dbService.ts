/**
 * @file Manages all interactions with the application's IndexedDB database.
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { GeneratedFile, EncryptedData, CustomFeature } from '../types';

const DB_NAME = 'devcore-db';
const DB_VERSION = 3;
const FILES_STORE_NAME = 'generated-files';
const VAULT_STORE_NAME = 'vault-data';
const ENCRYPTED_TOKENS_STORE_NAME = 'encrypted-tokens';
const CUSTOM_FEATURES_STORE_NAME = 'custom-features';

/**
 * Defines the schema for the DevCore IndexedDB database.
 */
interface DevCoreDB extends DBSchema {
  [FILES_STORE_NAME]: {
    key: string;
    value: GeneratedFile;
    indexes: { 'by-filePath': string };
  };
  [VAULT_STORE_NAME]: {
    key: string;
    value: any;
  };
  [ENCRYPTED_TOKENS_STORE_NAME]: {
    key: string;
    value: EncryptedData;
  };
  [CUSTOM_FEATURES_STORE_NAME]: {
    key: string;
    value: CustomFeature;
  };
}

let dbPromise: Promise<IDBPDatabase<DevCoreDB>> | null = null;

/**
 * Lazily initializes and returns the database connection promise.
 * Implements a singleton pattern for the database connection.
 * @returns {Promise<IDBPDatabase<DevCoreDB>>} A promise that resolves to the database instance.
 */
const getDb = (): Promise<IDBPDatabase<DevCoreDB>> => {
    if (dbPromise) {
        return dbPromise;
    }

    dbPromise = openDB<DevCoreDB>(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion, newVersion, _transaction) {
            console.log(`Upgrading database from version ${oldVersion} to ${newVersion}`);
            // The fall-through switch is an intentional and correct pattern for IndexedDB upgrades.
            switch (oldVersion) {
                case 0:
                    if (!db.objectStoreNames.contains(FILES_STORE_NAME)) {
                        const filesStore = db.createObjectStore(FILES_STORE_NAME, { keyPath: 'filePath' });
                        filesStore.createIndex('by-filePath', 'filePath');
                    }
                    /* falls through */
                case 1:
                    if (!db.objectStoreNames.contains(VAULT_STORE_NAME)) {
                        db.createObjectStore(VAULT_STORE_NAME);
                    }
                    if (!db.objectStoreNames.contains(ENCRYPTED_TOKENS_STORE_NAME)) {
                        db.createObjectStore(ENCRYPTED_TOKENS_STORE_NAME, { keyPath: 'id' });
                    }
                    /* falls through */
                case 2:
                    if (!db.objectStoreNames.contains(CUSTOM_FEATURES_STORE_NAME)) {
                        db.createObjectStore(CUSTOM_FEATURES_STORE_NAME, { keyPath: 'id' });
                    }
                    break;
            }
        },
        blocked() {
            alert('Database update required. Please close all other tabs with this application open and reload.');
        },
        blocking() {
            console.warn('Database is blocking another tab from upgrading.');
        },
        terminated() {
            console.error('Database connection was unexpectedly terminated. Please reload the page.');
        },
    }).catch(err => {
        console.error("Failed to open IndexedDB. Some features may not work.", err);
        dbPromise = null; // Allow retrying the connection
        throw err;
    });

    return dbPromise;
};

// --- Generated Files Store ---

/**
 * Saves or updates a generated file in the database.
 * @param {GeneratedFile} file The file object to save.
 * @returns {Promise<void>} A promise that resolves when the file is saved.
 * @example
 * await saveFile({ filePath: 'component.tsx', content: 'const a = 1;', description: 'A new component' });
 */
export const saveFile = async (file: GeneratedFile): Promise<void> => {
  const db = await getDb();
  await db.put(FILES_STORE_NAME, file);
};

/**
 * Retrieves all generated files from the database.
 * @returns {Promise<GeneratedFile[]>} A promise that resolves to an array of all files.
 * @example
 * const allFiles = await getAllFiles();
 */
export const getAllFiles = async (): Promise<GeneratedFile[]> => {
  const db = await getDb();
  return db.getAll(FILES_STORE_NAME);
};

/**
 * Retrieves a single generated file by its path.
 * @param {string} filePath The path of the file to retrieve.
 * @returns {Promise<GeneratedFile | undefined>} A promise resolving to the file or undefined if not found.
 * @example
 * const myComponent = await getFileByPath('component.tsx');
 */
export const getFileByPath = async (filePath: string): Promise<GeneratedFile | undefined> => {
  const db = await getDb();
  return db.get(FILES_STORE_NAME, filePath);
};

/**
 * Deletes all files from the generated files store.
 * @returns {Promise<void>} A promise that resolves when the store is cleared.
 * @example
 * await clearAllFiles();
 */
export const clearAllFiles = async (): Promise<void> => {
  const db = await getDb();
  await db.clear(FILES_STORE_NAME);
};

// --- Vault Store ---

/**
 * Saves arbitrary data related to the vault's state, such as the salt.
 * @param {string} key The key to store the data under.
 * @param {any} value The value to store.
 * @returns {Promise<void>} A promise that resolves when the data is saved.
 * @example
 * await saveVaultData('pbkdf2-salt', new Uint8Array([...]));
 */
export const saveVaultData = async (key: string, value: any): Promise<void> => {
  const db = await getDb();
  await db.put(VAULT_STORE_NAME, value, key);
};

/**
 * Retrieves data from the vault store by key.
 * @param {string} key The key of the data to retrieve.
 * @returns {Promise<any | undefined>} A promise resolving to the data or undefined if not found.
 * @example
 * const salt = await getVaultData('pbkdf2-salt');
 */
export const getVaultData = async (key: string): Promise<any | undefined> => {
  const db = await getDb();
  return db.get(VAULT_STORE_NAME, key);
};

// --- Encrypted Tokens Store ---

/**
 * Saves an encrypted token object to the database.
 * @param {EncryptedData} data The encrypted data object to save.
 * @returns {Promise<void>} A promise that resolves when the data is saved.
 * @example
 * await saveEncryptedToken({ id: 'github_pat', ciphertext: ..., iv: ... });
 */
export const saveEncryptedToken = async (data: EncryptedData): Promise<void> => {
  const db = await getDb();
  await db.put(ENCRYPTED_TOKENS_STORE_NAME, data);
};

/**
 * Retrieves an encrypted token object by its ID.
 * @param {string} id The ID of the token to retrieve (e.g., 'github_pat').
 * @returns {Promise<EncryptedData | undefined>} A promise resolving to the data or undefined if not found.
 * @example
 * const encryptedToken = await getEncryptedToken('github_pat');
 */
export const getEncryptedToken = async (id: string): Promise<EncryptedData | undefined> => {
  const db = await getDb();
  return db.get(ENCRYPTED_TOKENS_STORE_NAME, id);
};

/**
 * Retrieves all IDs from the encrypted tokens store.
 * @returns {Promise<string[]>} A promise resolving to an array of all token IDs.
 * @example
 * const allTokenIds = await getAllEncryptedTokenIds();
 */
export const getAllEncryptedTokenIds = async (): Promise<string[]> => {
    const db = await getDb();
    return db.getAllKeys(ENCRYPTED_TOKENS_STORE_NAME);
};

// --- Custom Features Store ---

/**
 * Saves a custom-generated feature to the database.
 * @param {CustomFeature} feature The feature object to save.
 * @returns {Promise<void>} A promise that resolves when the feature is saved.
 * @example
 * await saveCustomFeature({ id: 'custom-123', name: 'My Tool', ... });
 */
export const saveCustomFeature = async (feature: CustomFeature): Promise<void> => {
    const db = await getDb();
    await db.put(CUSTOM_FEATURES_STORE_NAME, feature);
};

/**
 * Retrieves all custom features from the database.
 * @returns {Promise<CustomFeature[]>} A promise resolving to an array of all custom features.
 * @example
 * const features = await getAllCustomFeatures();
 */
export const getAllCustomFeatures = async (): Promise<CustomFeature[]> => {
    const db = await getDb();
    return db.getAll(CUSTOM_FEATURES_STORE_NAME);
};

/**
 * Deletes a custom feature from the database by its ID.
 * @param {string} id The ID of the feature to delete.
 * @returns {Promise<void>} A promise that resolves when the feature is deleted.
 * @example
 * await deleteCustomFeature('custom-123');
 */
export const deleteCustomFeature = async (id: string): Promise<void> => {
    const db = await getDb();
    await db.delete(CUSTOM_FEATURES_STORE_NAME, id);
};

// --- Global Actions ---

/**
 * Clears all data from all object stores in the database. Use with caution.
 * @returns {Promise<void>} A promise that resolves when all data is cleared.
 * @example
 * await clearAllData();
 */
export const clearAllData = async (): Promise<void> => {
    const db = await getDb();
    for (const storeName of db.objectStoreNames) {
        await db.clear(storeName);
    }
}

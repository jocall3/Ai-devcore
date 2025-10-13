import { openDB, DBSchema } from 'idb';
import type { GeneratedFile, EncryptedData, CustomFeature } from '../types.ts';

const DB_NAME = 'devcore-db';
const DB_VERSION = 3;
const FILES_STORE_NAME = 'generated-files';
const VAULT_STORE_NAME = 'vault-data';
const ENCRYPTED_TOKENS_STORE_NAME = 'encrypted-tokens';
const CUSTOM_FEATURES_STORE_NAME = 'custom-features';


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

const dbPromise = openDB<DevCoreDB>(DB_NAME, DB_VERSION, {
  upgrade(db, oldVersion) {
    switch (oldVersion) {
        case 0: {
            const store = db.createObjectStore(FILES_STORE_NAME, {
                keyPath: 'filePath',
            });
            store.createIndex('by-filePath', 'filePath');
        }
        // fall-through for new installations
        case 1: {
            if (!db.objectStoreNames.contains(VAULT_STORE_NAME)) {
                db.createObjectStore(VAULT_STORE_NAME);
            }
            if (!db.objectStoreNames.contains(ENCRYPTED_TOKENS_STORE_NAME)) {
                db.createObjectStore(ENCRYPTED_TOKENS_STORE_NAME, { keyPath: 'id' });
            }
        }
        case 2: {
             if (!db.objectStoreNames.contains(CUSTOM_FEATURES_STORE_NAME)) {
                db.createObjectStore(CUSTOM_FEATURES_STORE_NAME, { keyPath: 'id' });
            }
        }
    }
  },
});

// --- Generated Files Store ---
export const saveFile = async (file: GeneratedFile): Promise<void> => {
  const db = await dbPromise;
  await db.put(FILES_STORE_NAME, file);
};

export const getAllFiles = async (): Promise<GeneratedFile[]> => {
  const db = await dbPromise;
  return db.getAll(FILES_STORE_NAME);
};

export const getFileByPath = async (filePath: string): Promise<GeneratedFile | undefined> => {
  const db = await dbPromise;
  return db.get(FILES_STORE_NAME, filePath);
};

export const clearAllFiles = async (): Promise<void> => {
  const db = await dbPromise;
  await db.clear(FILES_STORE_NAME);
};

// --- Vault Store ---
export const saveVaultData = async (key: string, value: any): Promise<void> => {
  const db = await dbPromise;
  await db.put(VAULT_STORE_NAME, value, key);
};

export const getVaultData = async (key: string): Promise<any | undefined> => {
  const db = await dbPromise;
  return db.get(VAULT_STORE_NAME, key);
};

// --- Encrypted Tokens Store ---
export const saveEncryptedToken = async (data: EncryptedData): Promise<void> => {
  const db = await dbPromise;
  await db.put(ENCRYPTED_TOKENS_STORE_NAME, data);
};

export const getEncryptedToken = async (id: string): Promise<EncryptedData | undefined> => {
  const db = await dbPromise;
  return db.get(ENCRYPTED_TOKENS_STORE_NAME, id);
};

export const getAllEncryptedTokenIds = async (): Promise<string[]> => {
    const db = await dbPromise;
    return db.getAllKeys(ENCRYPTED_TOKENS_STORE_NAME);
};

// --- Custom Features Store ---
export const saveCustomFeature = async (feature: CustomFeature): Promise<void> => {
    const db = await dbPromise;
    await db.put(CUSTOM_FEATURES_STORE_NAME, feature);
};

export const getAllCustomFeatures = async (): Promise<CustomFeature[]> => {
    const db = await dbPromise;
    return db.getAll(CUSTOM_FEATURES_STORE_NAME);
};

export const deleteCustomFeature = async (id: string): Promise<void> => {
    const db = await dbPromise;
    await db.delete(CUSTOM_FEATURES_STORE_NAME, id);
};


// --- Global Actions ---
export const clearAllData = async (): Promise<void> => {
    const db = await dbPromise;
    await db.clear(FILES_STORE_NAME);
    await db.clear(VAULT_STORE_NAME);
    await db.clear(ENCRYPTED_TOKENS_STORE_NAME);
    await db.clear(CUSTOM_FEATURES_STORE_NAME);
}
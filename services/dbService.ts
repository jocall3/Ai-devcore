/**
 * @file Manages all interactions with the application's IndexedDB database.
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { injectable } from 'inversify';
import 'reflect-metadata';
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

export interface IDbService {
    saveFile(file: GeneratedFile): Promise<void>;
    getAllFiles(): Promise<GeneratedFile[]>;
    getFileByPath(filePath: string): Promise<GeneratedFile | undefined>;
    clearAllFiles(): Promise<void>;
    saveVaultData(key: string, value: any): Promise<void>;
    getVaultData(key: string): Promise<any | undefined>;
    saveEncryptedToken(data: EncryptedData): Promise<void>;
    getEncryptedToken(id: string): Promise<EncryptedData | undefined>;
    getAllEncryptedTokenIds(): Promise<string[]>;
    saveCustomFeature(feature: CustomFeature): Promise<void>;
    getAllCustomFeatures(): Promise<CustomFeature[]>;
    deleteCustomFeature(id: string): Promise<void>;
    clearAllData(): Promise<void>;
}

@injectable()
export class DbService implements IDbService {
    private dbPromise: Promise<IDBPDatabase<DevCoreDB>> | null = null;
    
    private getDb(): Promise<IDBPDatabase<DevCoreDB>> {
        if (this.dbPromise) {
            return this.dbPromise;
        }

        this.dbPromise = openDB<DevCoreDB>(DB_NAME, DB_VERSION, {
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
            this.dbPromise = null; // Allow retrying the connection
            throw err;
        });

        return this.dbPromise;
    }

    public async saveFile(file: GeneratedFile): Promise<void> {
      const db = await this.getDb();
      await db.put(FILES_STORE_NAME, file);
    }
    
    public async getAllFiles(): Promise<GeneratedFile[]> {
      const db = await this.getDb();
      return db.getAll(FILES_STORE_NAME);
    }
    
    public async getFileByPath(filePath: string): Promise<GeneratedFile | undefined> {
      const db = await this.getDb();
      return db.get(FILES_STORE_NAME, filePath);
    }
    
    public async clearAllFiles(): Promise<void> {
      const db = await this.getDb();
      await db.clear(FILES_STORE_NAME);
    }
    
    public async saveVaultData(key: string, value: any): Promise<void> {
      const db = await this.getDb();
      await db.put(VAULT_STORE_NAME, value, key);
    }
    
    public async getVaultData(key: string): Promise<any | undefined> {
      const db = await this.getDb();
      return db.get(VAULT_STORE_NAME, key);
    }
    
    public async saveEncryptedToken(data: EncryptedData): Promise<void> {
      const db = await this.getDb();
      await db.put(ENCRYPTED_TOKENS_STORE_NAME, data);
    }
    
    public async getEncryptedToken(id: string): Promise<EncryptedData | undefined> {
      const db = await this.getDb();
      return db.get(ENCRYPTED_TOKENS_STORE_NAME, id);
    }
    
    public async getAllEncryptedTokenIds(): Promise<string[]> {
        const db = await this.getDb();
        return db.getAllKeys(ENCRYPTED_TOKENS_STORE_NAME);
    }
    
    public async saveCustomFeature(feature: CustomFeature): Promise<void> {
        const db = await this.getDb();
        await db.put(CUSTOM_FEATURES_STORE_NAME, feature);
    }
    
    public async getAllCustomFeatures(): Promise<CustomFeature[]> {
        const db = await this.getDb();
        return db.getAll(CUSTOM_FEATURES_STORE_NAME);
    }
    
    public async deleteCustomFeature(id: string): Promise<void> {
        const db = await this.getDb();
        await db.delete(CUSTOM_FEATURES_STORE_NAME, id);
    }
    
    public async clearAllData(): Promise<void> {
        const db = await this.getDb();
        for (const storeName of db.objectStoreNames) {
            await db.clear(storeName);
        }
    }
}

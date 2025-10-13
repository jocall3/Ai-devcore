/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { openDB, DBSchema } from 'idb';

const DB_NAME = 'devcore-mock-db';
const DB_VERSION = 1;
const STORE_NAME = 'mock-collections';

interface MockDB extends DBSchema {
  [STORE_NAME]: {
    key: string;
    value: {
        id: string;
        schemaDescription: string;
        data: any[];
    };
  };
}

const dbPromise = openDB<MockDB>(DB_NAME, DB_VERSION, {
  upgrade(db) {
    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
  },
});

export const saveMockCollection = async (collection: { id: string; schemaDescription: string; data: any[] }): Promise<void> => {
  const db = await dbPromise;
  await db.put(STORE_NAME, collection);
};

export const getMockCollection = async (id: string): Promise<{ id: string; schemaDescription: string; data: any[] } | undefined> => {
  const db = await dbPromise;
  return db.get(STORE_NAME, id);
};

export const getAllMockCollections = async (): Promise<{ id: string; schemaDescription: string; data: any[] }[]> => {
    const db = await dbPromise;
    return db.getAll(STORE_NAME);
}

export const deleteMockCollection = async (id: string): Promise<void> => {
  const db = await dbPromise;
  await db.delete(STORE_NAME, id);
};

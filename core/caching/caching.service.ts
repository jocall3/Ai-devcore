/**
 * @file Implements a generic caching service with LRU and TTL strategies using IndexedDB.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

/**
 * @interface CacheItem
 * @description Represents a single item stored in the cache, including metadata for TTL and LRU.
 * @template T - The type of the value being cached.
 */
interface CacheItem<T> {
  /**
   * The unique key for the cache item.
   * @type {string}
   */
  key: string;

  /**
   * The data being stored.
   * @type {T}
   */
  value: T;

  /**
   * The timestamp when the item was created (in milliseconds).
   * @type {number}
   */
  createdAt: number;

  /**
   * The timestamp when the item was last accessed (in milliseconds). Used for LRU.
   * @type {number}
   */
  lastAccessed: number;

  /**
   * Optional. Time-to-live for the item in milliseconds from its creation.
   * If not provided, the item does not expire.
   * @type {number | undefined}
   */
  ttl?: number;
}

/**
 * @interface CacheDBSchema
 * @description Defines the schema for the IndexedDB database used by the CachingService.
 */
interface CacheDBSchema extends DBSchema {
  cache: {
    key: string;
    value: CacheItem<any>;
    indexes: { 'by-lastAccessed': number };
  };
}

/**
 * @interface CachingServiceOptions
 * @description Configuration options for initializing the CachingService.
 */
export interface CachingServiceOptions {
  /**
   * The name of the IndexedDB database.
   * @default 'devcore-cache-db'
   * @type {string | undefined}
   */
  dbName?: string;

  /**
   * The name of the object store within the database.
   * @default 'lru-cache'
   * @type {string | undefined}
   */
  storeName?: string;

  /**
   * The maximum number of items to store in the cache. Oldest items are evicted when this limit is exceeded.
   * @default 100
   * @type {number | undefined}
   */
  maxSize?: number;
}

/**
 * @class CachingService
 * @description Provides a generic, persistent caching layer using IndexedDB with LRU and TTL strategies.
 * It's designed to cache expensive operations like AI generations or API calls.
 *
 * @example
 * ```typescript
 * const cache = new CachingService({ maxSize: 50 });
 *
 * async function getExpensiveData(userId: string) {
 *   const cacheKey = `user-data-${userId}`;
 *   const cached = await cache.get<UserData>(cacheKey);
 *   if (cached) {
 *     return cached;
 *   }
 *
 *   const data = await fetchUserDataFromApi(userId);
 *   // Cache the data for 1 hour
 *   await cache.set(cacheKey, data, { ttl: 3600 * 1000 });
 *   return data;
 * }
 * ```
 */
export class CachingService {
  private dbPromise: Promise<IDBPDatabase<CacheDBSchema>>;
  private storeName: string;
  private maxSize: number;

  /**
   * @constructor
   * @param {CachingServiceOptions} [options={}] - Configuration for the caching service.
   */
  constructor(options: CachingServiceOptions = {}) {
    this.storeName = options.storeName ?? 'lru-cache';
    this.maxSize = options.maxSize ?? 100;
    const dbName = options.dbName ?? 'devcore-cache-db';

    this.dbPromise = openDB<CacheDBSchema>(dbName, 1, {
      upgrade: (db) => {
        if (!db.objectStoreNames.contains(this.storeName as 'cache')) {
          const store = db.createObjectStore(this.storeName as 'cache', { keyPath: 'key' });
          store.createIndex('by-lastAccessed', 'lastAccessed');
        }
      },
    });
  }

  /**
   * Retrieves an item from the cache. Updates the `lastAccessed` timestamp for LRU.
   * Returns null if the item is not found or has expired.
   * @template T
   * @param {string} key - The key of the item to retrieve.
   * @returns {Promise<T | null>} The cached value, or null if not found or expired.
   * @example
   * ```typescript
   * const userData = await cache.get<UserData>('user-123');
   * if (userData) {
   *   console.log('Cache hit:', userData);
   * }
   * ```
   */
  public async get<T>(key: string): Promise<T | null> {
    const db = await this.dbPromise;
    const item = await db.get(this.storeName as 'cache', key);

    if (!item) {
      return null;
    }

    // TTL check
    if (item.ttl && Date.now() > item.createdAt + item.ttl) {
      // Item has expired, delete it from the cache
      await this.delete(key);
      return null;
    }

    // Update lastAccessed for LRU
    item.lastAccessed = Date.now();
    await db.put(this.storeName as 'cache', item);

    return item.value as T;
  }

  /**
   * Adds or updates an item in the cache.
   * Triggers a cleanup process to enforce LRU and TTL policies after the write.
   * @template T
   * @param {string} key - The key of the item to set.
   * @param {T} value - The value to store.
   * @param {{ ttl?: number }} [options={}] - Options, such as time-to-live in milliseconds.
   * @returns {Promise<void>}
   * @example
   * ```typescript
   * // Cache indefinitely
   * await cache.set('api-data', fetchedData);
   *
   * // Cache for 5 minutes
   * await cache.set('temp-data', tempData, { ttl: 5 * 60 * 1000 });
   * ```
   */
  public async set<T>(key: string, value: T, options: { ttl?: number } = {}): Promise<void> {
    const db = await this.dbPromise;
    const now = Date.now();
    const item: CacheItem<T> = {
      key,
      value,
      createdAt: now,
      lastAccessed: now,
      ttl: options.ttl,
    };

    await db.put(this.storeName as 'cache', item);
    
    // Asynchronously clean up without waiting
    this.cleanup().catch(console.error);
  }

  /**
   * Manually removes an item from the cache.
   * @param {string} key - The key of the item to delete.
   * @returns {Promise<void>}
   * @example
   * ```typescript
   * await cache.delete('user-123-stale-data');
   * ```
   */
  public async delete(key: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete(this.storeName as 'cache', key);
  }

  /**
   * Clears all items from the cache store.
   * @returns {Promise<void>}
   * @example
   * ```typescript
   * await cache.clear();
   * console.log('Cache has been cleared.');
   * ```
   */
  public async clear(): Promise<void> {
    const db = await this.dbPromise;
    await db.clear(this.storeName as 'cache');
  }

  /**
   * Internal method to enforce cache policies (LRU and TTL).
   * It checks for expired items and evicts the least recently used items if the cache exceeds its max size.
   * This is typically called automatically after a `set` operation.
   * @private
   * @returns {Promise<void>}
   */
  private async cleanup(): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction(this.storeName as 'cache', 'readwrite');
    const store = tx.objectStore(this.storeName as 'cache');
    const now = Date.now();
    
    // 1. Evict expired items
    let cursor = await store.openCursor();
    while (cursor) {
      if (cursor.value.ttl && now > cursor.value.createdAt + cursor.value.ttl) {
        cursor.delete();
      }
      cursor = await cursor.continue();
    }
    
    // 2. Evict least recently used items if over maxSize
    const count = await store.count();
    if (count > this.maxSize) {
      const index = store.index('by-lastAccessed');
      let lruCursor = await index.openCursor();
      let itemsToDelete = count - this.maxSize;
      while (lruCursor && itemsToDelete > 0) {
        lruCursor.delete();
        itemsToDelete--;
        lruCursor = await lruCursor.continue();
      }
    }
    
    await tx.done;
  }
}

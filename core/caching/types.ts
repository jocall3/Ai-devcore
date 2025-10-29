/**
 * @fileoverview Defines the core types and interfaces for the multi-layered Caching Service.
 * These types support LRU (Least Recently Used) caching, configurable Time-To-Live (TTL),
 * and persistence via IndexedDB.
 *
 * @see CachingService for the implementation that uses these types.
 * @module core/caching/types
 */

/**
 * Represents a single item stored in the cache, including its value and metadata.
 * The metadata is crucial for implementing cache eviction policies like LRU and TTL.
 *
 * @template T The type of the data being cached.
 * @example
 * ```typescript
 * import { CacheItem } from 'core/caching/types';
 *
 * const userProfileCacheItem: CacheItem<{ name: string; email: string; }> = {
 *   value: { name: 'Jane Doe', email: 'jane.doe@example.com' },
 *   createdAt: 1678886400000,
 *   lastAccessedAt: 1678886400000,
 *   ttl: 3600000 // 1 hour
 * };
 * ```
 */
export interface CacheItem<T> {
  /**
   * The actual data payload being stored in the cache.
   */
  value: T;

  /**
   * The timestamp (in milliseconds since the UNIX epoch) when the item was first created and added to the cache.
   * This is used for TTL calculations.
   */
  createdAt: number;

  /**
   * The timestamp (in milliseconds since the UNIX epoch) when the item was last accessed (read from).
   * This property is fundamental for the LRU (Least Recently Used) eviction policy.
   */
  lastAccessedAt: number;

  /**
   * The Time-To-Live for this specific item in milliseconds.
   * If `null`, the item is considered to have an indefinite lifetime and will not expire based on time.
   * If a number is provided, the item is considered expired if `(Date.now() - createdAt) > ttl`.
   */
  ttl: number | null;
}

/**
 * Defines the configuration options for initializing an instance of the `CachingService`.
 * Each cache instance can be configured independently for different use cases
 * (e.g., one for AI results, another for GitHub API calls).
 *
 * @example
 * ```typescript
 * import { CachingServiceOptions } from 'core/caching/types';
 *
 * const aiResultCacheOptions: CachingServiceOptions = {
 *   storeName: 'ai-results-cache',
 *   maxSize: 100, // Keep the 100 most recently used AI results
 *   defaultTtl: 60 * 60 * 1000, // 1 hour default expiration
 * };
 * ```
 */
export interface CachingServiceOptions {
  /**
   * The unique name for the IndexedDB object store that this cache instance will use.
   * This allows for multiple, separate caches within the same database.
   */
  storeName: string;

  /**
   * The maximum number of items to keep in the cache. When this limit is exceeded,
   * the least recently used items will be evicted. This is the core setting for the LRU policy.
   * If not provided, the cache size is not explicitly limited (though browser storage limits still apply).
   * @default undefined
   */
  maxSize?: number;

  /**
   * The default Time-To-Live for all items added to this cache instance, in milliseconds.
   * This can be overridden on a per-item basis when using the `set` method.
   * If not provided, items will not expire by default.
   * @default undefined
   */
  defaultTtl?: number;
}

/**
 * Defines optional parameters that can be provided when adding an item to the cache
 * using the `CachingService.set()` method.
 *
 * @example
 * ```typescript
 * import { CachingService } from 'core/caching/CachingService'; // Assuming this exists
 *
 * const cache = new CachingService({ storeName: 'my-cache' });
 *
 * // This item will use the cache's default TTL (if any)
 * await cache.set('key1', { data: 'some value' });
 *
 * // This item will expire in 5 minutes, overriding the default
 * await cache.set('key2', { data: 'important value' }, { ttl: 5 * 60 * 1000 });
 *
 * // This item will never expire based on time
 * await cache.set('key3', { data: 'permanent value' }, { ttl: null });
 * ```
 */
export interface SetCacheOptions {
  /**
   * A specific Time-To-Live for this item in milliseconds, which overrides the
   * `defaultTtl` set on the `CachingService` instance.
   * - A positive number sets an expiration time.
   * - `null` indicates that the item should never expire based on time.
   * - `undefined` (or omitting the option) will cause the service's `defaultTtl` to be used.
   */
  ttl?: number | null;
}

/**
 * TypeScript port of PhaseCache class
 * Caches phase computation results with support for circular dependency flags
 */

import { PhaseRes } from './PhaseRes';
import { IsCircular } from './types';

/**
 * Reference wrapper for cache keys and values
 * Mimics the Scala implementation's Ref class
 */
class Ref<T> {
  constructor(private value: T | null) {}

  get(): T | null {
    return this.value;
  }

  set(value: T): void {
    this.value = value;
  }
}

/**
 * Cache key type combining ID and circular dependency flag
 */
type CacheKey<Id> = readonly [Id, IsCircular];

/**
 * Phase cache implementation with support for circular dependency detection
 */
export class PhaseCache<Id, U> {
  private readonly cache: Map<string, Ref<PhaseRes<Id, U>>>;

  constructor(initialCapacity: number = 1000) {
    this.cache = new Map();
  }

  /**
   * Gets a cached value or computes it if not present
   * @param key Tuple of (id, isCircular)
   * @param compute Function to compute the value if not cached
   * @returns The cached or computed PhaseRes
   */
  getOrElse(key: CacheKey<Id>, compute: () => PhaseRes<Id, U>): PhaseRes<Id, U> {
    const keyStr = this.keyToString(key);
    
    const existing = this.cache.get(keyStr);
    if (existing) {
      const value = existing.get();
      if (value !== null) {
        return value;
      }
    }

    // Compute new value
    const result = compute();
    
    // Store in cache
    this.cache.set(keyStr, new Ref(result));
    
    return result;
  }

  /**
   * Converts a cache key to a string for use as Map key
   * This ensures proper equality comparison for cache lookups
   */
  private keyToString(key: CacheKey<Id>): string {
    const [id, isCircular] = key;
    return `${String(id)}:${isCircular}`;
  }

  /**
   * Clears the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Gets the current cache size
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Checks if a key exists in the cache
   */
  has(key: CacheKey<Id>): boolean {
    const keyStr = this.keyToString(key);
    const existing = this.cache.get(keyStr);
    return existing !== undefined && existing.get() !== null;
  }

  /**
   * Removes an entry from the cache
   */
  delete(key: CacheKey<Id>): boolean {
    const keyStr = this.keyToString(key);
    return this.cache.delete(keyStr);
  }

  /**
   * Gets all cached keys
   */
  keys(): CacheKey<Id>[] {
    const keys: CacheKey<Id>[] = [];
    for (const keyStr of this.cache.keys()) {
      const parts = keyStr.split(':');
      if (parts.length === 2) {
        const id = parts[0] as Id;
        const isCircular = parts[1] === 'true';
        keys.push([id, isCircular] as const);
      }
    }
    return keys;
  }

  /**
   * Gets cache statistics for debugging
   */
  getStats(): { size: number; hitRate?: number } {
    return {
      size: this.cache.size
    };
  }
}

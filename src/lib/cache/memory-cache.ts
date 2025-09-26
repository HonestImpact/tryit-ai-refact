// High-performance in-memory cache with TTL support
// Optimized for TryIt-AI's RAG and component caching needs

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  maxSize: number;
  memoryUsage: number;
}

interface CacheEntry<T> {
  value: T;
  expiry: number;
  accessCount: number;
  lastAccess: number;
}

export class MemoryCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private stats = { hits: 0, misses: 0 };
  private readonly maxSize: number;
  private readonly defaultTtlMs: number;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(maxSize = 1000, defaultTtlMs = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.defaultTtlMs = defaultTtlMs;
    
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
  }

  set(key: string, value: T, ttlMs?: number): void {
    const expiry = Date.now() + (ttlMs || this.defaultTtlMs);
    
    // Evict if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }
    
    this.cache.set(key, {
      value,
      expiry,
      accessCount: 0,
      lastAccess: Date.now()
    });
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return undefined;
    }
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      this.stats.misses++;
      return undefined;
    }
    
    // Update access stats
    entry.accessCount++;
    entry.lastAccess = Date.now();
    this.stats.hits++;
    
    return entry.value;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    return !!(entry && Date.now() <= entry.expiry);
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      size: this.cache.size,
      maxSize: this.maxSize,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.cache) {
      if (entry.lastAccess < oldestTime) {
        oldestTime = entry.lastAccess;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private estimateMemoryUsage(): number {
    // Rough estimation of memory usage in bytes
    let size = 0;
    for (const [key, entry] of this.cache) {
      size += key.length * 2; // UTF-16 characters
      size += JSON.stringify(entry.value).length * 2;
      size += 64; // Overhead for entry object
    }
    return size;
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// Global cache instances for different use cases
export class CacheManager {
  private static instances = new Map<string, MemoryCache>();
  
  static getCache(name: string, maxSize = 1000, defaultTtlMs = 5 * 60 * 1000): MemoryCache {
    if (!this.instances.has(name)) {
      this.instances.set(name, new MemoryCache(maxSize, defaultTtlMs));
    }
    return this.instances.get(name)!;
  }
  
  static getRAGCache(): MemoryCache<string[]> {
    return this.getCache('rag-context', 500, 5 * 60 * 1000); // 5 min TTL
  }
  
  static getComponentCache(): MemoryCache<any> {
    return this.getCache('components', 100, 30 * 60 * 1000); // 30 min TTL
  }
  
  static getSearchCache(): MemoryCache<any> {
    return this.getCache('search-results', 1000, 10 * 60 * 1000); // 10 min TTL
  }
  
  static getAllStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    for (const [name, cache] of this.instances) {
      stats[name] = cache.getStats();
    }
    return stats;
  }
  
  static clearAll(): void {
    for (const cache of this.instances.values()) {
      cache.clear();
    }
  }
  
  static destroyAll(): void {
    for (const cache of this.instances.values()) {
      cache.destroy();
    }
    this.instances.clear();
  }
}

// Export global cache instance for convenience
export const globalCache = new MemoryCache();

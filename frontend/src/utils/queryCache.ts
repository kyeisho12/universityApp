// Simple in-memory cache for Supabase queries
// Implements stale-while-revalidate pattern for instant UX

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  isRefreshing?: boolean;
}

class QueryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached data or fetch new data
   * Uses stale-while-revalidate: returns cached data immediately, refreshes in background
   */
  async query<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: { ttl?: number; forceRefresh?: boolean }
  ): Promise<T> {
    const ttl = options?.ttl ?? this.defaultTTL;
    const now = Date.now();
    const cached = this.cache.get(key);

    // Force refresh - clear cache and fetch fresh
    if (options?.forceRefresh) {
      this.cache.delete(key);
      const freshData = await fetcher();
      this.cache.set(key, { data: freshData, timestamp: now });
      return freshData;
    }

    // Cache hit and still fresh - return immediately
    if (cached && now - cached.timestamp < ttl) {
      return cached.data;
    }

    // Cache hit but stale - return stale data, refresh in background
    if (cached && !cached.isRefreshing) {
      // Mark as refreshing to prevent duplicate requests
      cached.isRefreshing = true;
      
      // Background refresh (don't await)
      fetcher()
        .then((freshData) => {
          this.cache.set(key, { data: freshData, timestamp: Date.now() });
        })
        .catch((error) => {
          console.error(`Background refresh failed for ${key}:`, error);
          // Keep stale data on error
          cached.isRefreshing = false;
        });

      return cached.data;
    }

    // Cache miss or currently refreshing - fetch fresh data
    if (cached?.isRefreshing) {
      // Wait for ongoing refresh
      return cached.data;
    }

    const freshData = await fetcher();
    this.cache.set(key, { data: freshData, timestamp: now });
    return freshData;
  }

  /**
   * Check if a key exists in cache (regardless of freshness)
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Invalidate a specific cache entry
   */
  invalidate(key: string) {
    this.cache.delete(key);
  }

  /**
   * Invalidate all cache entries matching a pattern
   */
  invalidatePattern(pattern: RegExp) {
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (pattern.test(key)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Generate a cache key from query parameters
   */
  key(prefix: string, ...params: any[]): string {
    return `${prefix}:${JSON.stringify(params)}`;
  }
}

// Export singleton instance
export const queryCache = new QueryCache();

import { useState, useEffect, useCallback, useRef } from 'react';
import { queryCache } from '../utils/queryCache';

interface UseCachedQueryOptions<T> {
  /**
   * Cache time-to-live in milliseconds
   * @default 300000 (5 minutes)
   */
  ttl?: number;
  
  /**
   * Initial data to show while loading
   */
  initialData?: T;
  
  /**
   * Whether to fetch on mount
   * @default true
   */
  enabled?: boolean;
}

interface UseCachedQueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for cached queries with stale-while-revalidate strategy
 * 
 * @example
 * const { data, isLoading, refetch } = useCachedQuery(
 *   'jobs-list',
 *   async () => {
 *     const { data } = await supabase.from('jobs').select('*');
 *     return data || [];
 *   }
 * );
 */
export function useCachedQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: UseCachedQueryOptions<T>
): UseCachedQueryResult<T> {
  const [data, setData] = useState<T | undefined>(options?.initialData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Use refs to store latest values without triggering re-fetches
  const fetcherRef = useRef(fetcher);
  const optionsRef = useRef(options);
  const enabledRef = useRef(options?.enabled !== false);
  
  // Update refs on each render
  fetcherRef.current = fetcher;
  optionsRef.current = options;
  enabledRef.current = options?.enabled !== false;

  const fetchData = useCallback(
    async (forceRefresh = false) => {
      if (!enabledRef.current) return;

      try {
        // Only show loading if there's no cached data
        const hasCache = queryCache.has(key);
        if (!hasCache) {
          setIsLoading(true);
        }
        setError(null);

        const result = await queryCache.query(key, fetcherRef.current, {
          ttl: optionsRef.current?.ttl,
          forceRefresh,
        });

        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    },
    [key] // Only depend on key, not fetcher or options
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => fetchData(true), [fetchData]);

  return { data, isLoading, error, refetch };
}

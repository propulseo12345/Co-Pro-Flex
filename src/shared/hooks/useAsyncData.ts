'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Standard API result type for async operations
 * Defined locally to avoid circular dependencies
 */
export interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================
// TYPES
// ============================================

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  data: T | null;
  status: AsyncStatus;
  error: string | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  isEmpty: boolean;
}

export interface UseAsyncDataOptions<T> {
  /** Initial data to use before first fetch */
  initialData?: T | null;
  /** Whether to fetch immediately on mount */
  immediate?: boolean;
  /** Function to determine if data is "empty" */
  isEmptyFn?: (data: T) => boolean;
  /** Dependencies that trigger a refetch when changed */
  deps?: unknown[];
  /** Callback on success */
  onSuccess?: (data: T) => void;
  /** Callback on error */
  onError?: (error: string) => void;
}

export interface UseAsyncDataReturn<T> extends AsyncState<T> {
  /** Manually trigger a fetch */
  refetch: () => Promise<void>;
  /** Reset state to initial */
  reset: () => void;
  /** Set data manually */
  setData: (data: T | null) => void;
}

// ============================================
// HOOK: useAsyncData
// ============================================

export function useAsyncData<T>(
  fetcher: () => Promise<ApiResult<T>>,
  options: UseAsyncDataOptions<T> = {}
): UseAsyncDataReturn<T> {
  const {
    initialData = null,
    immediate = true,
    isEmptyFn,
    deps = [],
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState<T | null>(initialData);
  const [status, setStatus] = useState<AsyncStatus>(immediate ? 'loading' : 'idle');
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const fetch = useCallback(async () => {
    setStatus('loading');
    setError(null);

    try {
      const result = await fetcherRef.current();

      if (!mountedRef.current) return;

      if (result.success && result.data !== undefined) {
        setData(result.data);
        setStatus('success');
        onSuccess?.(result.data);
      } else {
        const errorMsg = result.error || 'Une erreur est survenue';
        setError(errorMsg);
        setStatus('error');
        onError?.(errorMsg);
      }
    } catch (e) {
      if (!mountedRef.current) return;

      const errorMsg = e instanceof Error ? e.message : 'Erreur inattendue';
      setError(errorMsg);
      setStatus('error');
      onError?.(errorMsg);
    }
  }, [onSuccess, onError]);

  const reset = useCallback(() => {
    setData(initialData);
    setStatus('idle');
    setError(null);
  }, [initialData]);

  useEffect(() => {
    mountedRef.current = true;
    if (immediate) {
      fetch();
    }
    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const isEmpty = data !== null && isEmptyFn ? isEmptyFn(data) : false;

  return {
    data,
    status,
    error,
    isLoading: status === 'loading',
    isError: status === 'error',
    isSuccess: status === 'success',
    isEmpty,
    refetch: fetch,
    reset,
    setData,
  };
}

// ============================================
// HOOK: useAsyncList (specialized for arrays)
// ============================================

export interface UseAsyncListReturn<T> extends Omit<UseAsyncDataReturn<T[]>, 'isEmpty'> {
  isEmpty: boolean;
  count: number;
}

export function useAsyncList<T>(
  fetcher: () => Promise<ApiResult<T[]>>,
  options: Omit<UseAsyncDataOptions<T[]>, 'isEmptyFn'> = {}
): UseAsyncListReturn<T> {
  const result = useAsyncData(fetcher, {
    ...options,
    initialData: options.initialData || [],
    isEmptyFn: (data) => data.length === 0,
  });

  return {
    ...result,
    data: result.data || [],
    count: result.data?.length || 0,
  };
}

// ============================================
// HOOK: useMutation
// ============================================

export interface UseMutationOptions<TData, TVariables> {
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: string, variables: TVariables) => void;
  onSettled?: (data: TData | null, error: string | null, variables: TVariables) => void;
}

export interface UseMutationReturn<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<TData | null>;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  data: TData | null;
  error: string | null;
  status: AsyncStatus;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  reset: () => void;
}

export function useMutation<TData, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<ApiResult<TData>>,
  options: UseMutationOptions<TData, TVariables> = {}
): UseMutationReturn<TData, TVariables> {
  const { onSuccess, onError, onSettled } = options;

  const [data, setData] = useState<TData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<AsyncStatus>('idle');

  const mutateAsync = useCallback(
    async (variables: TVariables): Promise<TData> => {
      setStatus('loading');
      setError(null);

      try {
        const result = await mutationFn(variables);

        if (result.success && result.data !== undefined) {
          setData(result.data);
          setStatus('success');
          onSuccess?.(result.data, variables);
          onSettled?.(result.data, null, variables);
          return result.data;
        } else {
          const errorMsg = result.error || 'Une erreur est survenue';
          setError(errorMsg);
          setStatus('error');
          onError?.(errorMsg, variables);
          onSettled?.(null, errorMsg, variables);
          throw new Error(errorMsg);
        }
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Erreur inattendue';
        if (status !== 'error') {
          setError(errorMsg);
          setStatus('error');
          onError?.(errorMsg, variables);
          onSettled?.(null, errorMsg, variables);
        }
        throw e;
      }
    },
    [mutationFn, onSuccess, onError, onSettled, status]
  );

  const mutate = useCallback(
    async (variables: TVariables): Promise<TData | null> => {
      try {
        return await mutateAsync(variables);
      } catch {
        return null;
      }
    },
    [mutateAsync]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setStatus('idle');
  }, []);

  return {
    mutate,
    mutateAsync,
    data,
    error,
    status,
    isLoading: status === 'loading',
    isError: status === 'error',
    isSuccess: status === 'success',
    reset,
  };
}

// ============================================
// HOOK: usePaginatedData
// ============================================

import type { PaginatedResponse, SearchFilters } from '@/types/common';

export interface UsePaginatedDataOptions extends Omit<UseAsyncDataOptions<unknown>, 'isEmptyFn'> {
  initialPage?: number;
  initialPageSize?: number;
  initialSortBy?: string;
  initialSortOrder?: 'asc' | 'desc';
}

export interface UsePaginatedDataReturn<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  status: AsyncStatus;
  error: string | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  isEmpty: boolean;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  // Actions
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setSortBy: (sortBy: string) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  setFilters: (filters: SearchFilters) => void;
  refetch: () => Promise<void>;
  reset: () => void;
}

export function usePaginatedData<T>(
  fetcher: (filters: SearchFilters) => Promise<ApiResult<PaginatedResponse<T>>>,
  options: UsePaginatedDataOptions = {}
): UsePaginatedDataReturn<T> {
  const {
    initialPage = 1,
    initialPageSize = 20,
    initialSortBy,
    initialSortOrder = 'asc',
    immediate = true,
    deps = [],
  } = options;

  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sortBy, setSortBy] = useState<string | undefined>(initialSortBy);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(initialSortOrder);
  const [customFilters, setCustomFilters] = useState<SearchFilters>({});

  const filters: SearchFilters = {
    page,
    pageSize,
    sortBy,
    sortOrder,
    ...customFilters,
  };

  const {
    data: response,
    status,
    error,
    isLoading,
    isError,
    isSuccess,
    refetch,
    reset: resetAsync,
  } = useAsyncData(() => fetcher(filters), {
    immediate,
    deps: [page, pageSize, sortBy, sortOrder, JSON.stringify(customFilters), ...deps],
  });

  const data = response?.data || [];
  const total = response?.total || 0;
  const totalPages = response?.totalPages || 1;

  const reset = useCallback(() => {
    setPage(initialPage);
    setPageSize(initialPageSize);
    setSortBy(initialSortBy);
    setSortOrder(initialSortOrder);
    setCustomFilters({});
    resetAsync();
  }, [initialPage, initialPageSize, initialSortBy, initialSortOrder, resetAsync]);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages,
    status,
    error,
    isLoading,
    isError,
    isSuccess,
    isEmpty: isSuccess && data.length === 0,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
    setPage,
    setPageSize,
    setSortBy,
    setSortOrder,
    setFilters: setCustomFilters,
    refetch,
    reset,
  };
}

// ============================================
// HELPER: createQueryHook
// ============================================

/**
 * Factory to create typed query hooks for specific API endpoints
 */
export function createQueryHook<TData, TParams = void>(
  fetcher: TParams extends void
    ? () => Promise<ApiResult<TData>>
    : (params: TParams) => Promise<ApiResult<TData>>
) {
  return function useQuery(
    ...[params, options]: TParams extends void
      ? [options?: UseAsyncDataOptions<TData>]
      : [params: TParams, options?: UseAsyncDataOptions<TData>]
  ) {
    const actualOptions = (
      typeof params === 'object' && params !== null && 'immediate' in params
        ? params
        : options
    ) as UseAsyncDataOptions<TData> | undefined;

    const actualParams = (
      typeof params === 'object' && params !== null && 'immediate' in params
        ? undefined
        : params
    ) as TParams | undefined;

    return useAsyncData(
      () => (fetcher as (params?: TParams) => Promise<ApiResult<TData>>)(actualParams),
      actualOptions
    );
  };
}

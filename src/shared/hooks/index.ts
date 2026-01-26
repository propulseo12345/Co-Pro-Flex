/**
 * Shared Hooks
 * useQuery-like patterns for loading/error/empty states
 */

export {
  useAsyncData,
  useAsyncList,
  useMutation,
  usePaginatedData,
  createQueryHook,
  type AsyncStatus,
  type AsyncState,
  type UseAsyncDataOptions,
  type UseAsyncDataReturn,
  type UseAsyncListReturn,
  type UseMutationOptions,
  type UseMutationReturn,
  type UsePaginatedDataOptions,
  type UsePaginatedDataReturn,
} from './useAsyncData';

// Finance-specific hooks
export * from './useFinance';

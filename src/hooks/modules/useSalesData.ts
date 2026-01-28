'use client';

/**
 * Sales Data Hook
 * Loads sales/mutations data from Supabase
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useCopro } from '@/providers/CoproContext';
import * as salesApi from '@/lib/sales/api';
import type {
  MutationOverview,
  MutationDetail,
  SalesStats,
  DbMutationStatus,
} from '@/lib/sales/api';

// ============================================================================
// Types
// ============================================================================

export interface UseSalesListOptions {
  /** Filter by status */
  status?: DbMutationStatus | 'all';
  /** Search term */
  search?: string;
}

export interface UseSalesListResult {
  /** All mutations */
  mutations: MutationOverview[];
  /** Filtered mutations based on options */
  filteredMutations: MutationOverview[];
  /** Statistics */
  stats: SalesStats;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Refresh data */
  refresh: () => Promise<void>;
}

export interface UseSaleDetailOptions {
  /** Mutation ID to load */
  mutationId: string | null;
}

export interface UseSaleDetailResult {
  /** Mutation detail */
  mutation: MutationDetail | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Refresh data */
  refresh: () => Promise<void>;
}

// ============================================================================
// useSalesList - List all sales
// ============================================================================

export function useSalesList(options: UseSalesListOptions = {}): UseSalesListResult {
  const { currentCoproId } = useCopro();
  const [mutations, setMutations] = useState<MutationOverview[]>([]);
  const [stats, setStats] = useState<SalesStats>({
    total: 0,
    draft: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!currentCoproId) {
      setMutations([]);
      setStats({ total: 0, draft: 0, inProgress: 0, completed: 0, cancelled: 0 });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [mutationsData, statsData] = await Promise.all([
        salesApi.listMutations(currentCoproId),
        salesApi.getSalesStats(currentCoproId),
      ]);

      setMutations(mutationsData);
      setStats(statsData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du chargement';
      setError(message);
      console.error('useSalesList error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentCoproId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter mutations based on options
  const filteredMutations = useMemo(() => {
    let result = mutations;

    // Filter by status
    if (options.status && options.status !== 'all') {
      result = result.filter((m) => m.status === options.status);
    }

    // Filter by search term
    if (options.search) {
      const searchLower = options.search.toLowerCase();
      result = result.filter(
        (m) =>
          m.lot_ref?.toLowerCase().includes(searchLower) ||
          m.seller_name?.toLowerCase().includes(searchLower) ||
          m.buyer_name?.toLowerCase().includes(searchLower) ||
          m.notary_name?.toLowerCase().includes(searchLower)
      );
    }

    return result;
  }, [mutations, options.status, options.search]);

  return {
    mutations,
    filteredMutations,
    stats,
    isLoading,
    error,
    refresh: loadData,
  };
}

// ============================================================================
// useSaleDetail - Single sale detail
// ============================================================================

export function useSaleDetail(options: UseSaleDetailOptions): UseSaleDetailResult {
  const { currentCoproId } = useCopro();
  const [mutation, setMutation] = useState<MutationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!currentCoproId || !options.mutationId) {
      setMutation(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await salesApi.getMutationDetail(currentCoproId, options.mutationId);
      setMutation(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du chargement';
      setError(message);
      console.error('useSaleDetail error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentCoproId, options.mutationId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    mutation,
    isLoading,
    error,
    refresh: loadData,
  };
}

// ============================================================================
// Helper hooks for specific use cases
// ============================================================================

/**
 * Hook for sales in progress only
 */
export function useSalesInProgress() {
  const result = useSalesList({ status: 'draft' });

  const salesEnCours = useMemo(() => {
    // Include all non-validated, non-cancelled sales
    return result.mutations.filter(
      (m) => m.status !== 'validated' && m.status !== 'cancelled'
    );
  }, [result.mutations]);

  return {
    ...result,
    salesEnCours,
  };
}

/**
 * Hook for completed sales
 */
export function useSalesCompleted() {
  return useSalesList({ status: 'validated' });
}

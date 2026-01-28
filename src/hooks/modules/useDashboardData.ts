/**
 * Dashboard Data Hooks
 * Provides reactive data fetching for dashboard components
 * Uses Supabase views via dashboard API layer
 */

import { useState, useEffect, useCallback } from 'react';
import { useCopro } from '@/providers/CoproContext';
import {
  getDashboardKpis,
  getDashboardActivity,
  getDashboardTodos,
  getDashboardData,
  type DashboardKpis,
  type DashboardActivity,
  type DashboardTodo,
  type DashboardData,
} from '@/lib/dashboard/api';

// ============================================================================
// TYPES
// ============================================================================

export interface DataState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  isEmpty: boolean;
}

export interface UseKpisResult extends DataState<DashboardKpis> {
  refresh: () => Promise<void>;
}

export interface UseActivitiesResult extends DataState<DashboardActivity[]> {
  refresh: () => Promise<void>;
}

export interface UseTodosResult extends DataState<DashboardTodo[]> {
  refresh: () => Promise<void>;
}

export interface UseDashboardResult extends DataState<DashboardData> {
  refresh: () => Promise<void>;
  isRefreshing: boolean;
}

// ============================================================================
// HOOK: useDashboardKpis
// ============================================================================

/**
 * Hook pour récupérer les KPIs du dashboard
 * Retourne: solde, impayés, prochaine AG
 */
export function useDashboardKpis(): UseKpisResult {
  const { currentCoproId, isLoading: coproLoading } = useCopro();

  const [data, setData] = useState<DashboardKpis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!currentCoproId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await getDashboardKpis(currentCoproId);

    if (result.error) {
      setError(result.error);
      setData(null);
    } else {
      setData(result.data);
    }

    setIsLoading(false);
  }, [currentCoproId]);

  useEffect(() => {
    if (!coproLoading) {
      fetchData();
    }
  }, [coproLoading, fetchData]);

  const isEmpty =
    !data ||
    (data.current_balance === 0 &&
      data.unpaid_total === 0 &&
      data.next_ag_date === null);

  return {
    data,
    isLoading: isLoading || coproLoading,
    error,
    isEmpty,
    refresh: fetchData,
  };
}

// ============================================================================
// HOOK: useDashboardActivity
// ============================================================================

/**
 * Hook pour récupérer l'activité récente
 * Retourne les N derniers événements (default 6)
 */
export function useDashboardActivity(limit: number = 6): UseActivitiesResult {
  const { currentCoproId, isLoading: coproLoading } = useCopro();

  const [data, setData] = useState<DashboardActivity[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!currentCoproId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await getDashboardActivity(currentCoproId, limit);

    if (result.error) {
      setError(result.error);
      setData(null);
    } else {
      setData(result.data);
    }

    setIsLoading(false);
  }, [currentCoproId, limit]);

  useEffect(() => {
    if (!coproLoading) {
      fetchData();
    }
  }, [coproLoading, fetchData]);

  const isEmpty = !data || data.length === 0;

  return {
    data,
    isLoading: isLoading || coproLoading,
    error,
    isEmpty,
    refresh: fetchData,
  };
}

// ============================================================================
// HOOK: useDashboardTodos
// ============================================================================

/**
 * Hook pour récupérer les tâches prioritaires
 * Retourne les N premières tâches par priorité (default 5)
 */
export function useDashboardTodos(limit: number = 5): UseTodosResult {
  const { currentCoproId, isLoading: coproLoading } = useCopro();

  const [data, setData] = useState<DashboardTodo[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!currentCoproId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await getDashboardTodos(currentCoproId, limit);

    if (result.error) {
      setError(result.error);
      setData(null);
    } else {
      setData(result.data);
    }

    setIsLoading(false);
  }, [currentCoproId, limit]);

  useEffect(() => {
    if (!coproLoading) {
      fetchData();
    }
  }, [coproLoading, fetchData]);

  const isEmpty = !data || data.length === 0;

  return {
    data,
    isLoading: isLoading || coproLoading,
    error,
    isEmpty,
    refresh: fetchData,
  };
}

// ============================================================================
// HOOK: useDashboardData (combined)
// ============================================================================

/**
 * Hook combiné pour récupérer toutes les données du dashboard
 * Charge KPIs, activités et todos en parallèle
 * Utile pour le chargement initial de la page
 */
export function useDashboardData(): UseDashboardResult {
  const { currentCoproId, isLoading: coproLoading } = useCopro();

  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    async (isRefresh: boolean = false) => {
      if (!currentCoproId) {
        setIsLoading(false);
        return;
      }

      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const result = await getDashboardData(currentCoproId);

      if (result.error) {
        setError(result.error);
        setData(null);
      } else {
        setData(result.data);
      }

      setIsLoading(false);
      setIsRefreshing(false);
    },
    [currentCoproId]
  );

  useEffect(() => {
    if (!coproLoading) {
      fetchData(false);
    }
  }, [coproLoading, fetchData]);

  const refresh = useCallback(() => fetchData(true), [fetchData]);

  const isEmpty =
    !data ||
    (data.kpis.current_balance === 0 &&
      data.kpis.unpaid_total === 0 &&
      data.kpis.next_ag_date === null &&
      data.activities.length === 0 &&
      data.todos.length === 0);

  return {
    data,
    isLoading: isLoading || coproLoading,
    isRefreshing,
    error,
    isEmpty,
    refresh,
  };
}

// ============================================================================
// RE-EXPORTS
// ============================================================================

export type {
  DashboardKpis,
  DashboardActivity,
  DashboardTodo,
  DashboardData,
  ActivityType,
  TodoPriority,
  TodoType,
} from '@/lib/dashboard/api';

'use client';

/**
 * Impayés Data Hook
 * Loads unpaid charges data from Supabase
 *
 * Uses: v_unpaid_with_reminders, v_unpaid_by_lot, payment_reminders
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useCopro } from '@/providers/CoproContext';
import * as impayesApi from '@/lib/impayes/api';
import type {
  UnpaidWithReminders,
  PaymentReminderOverview,
  ImpayesStats,
} from '@/lib/impayes/api';

// ============================================================================
// Types
// ============================================================================

export interface UseImpayesListOptions {
  /** Filter by severity */
  severity?: 'MINOR' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'all';
  /** Search term */
  search?: string;
  /** Min days overdue */
  minDaysOverdue?: number;
}

export interface UseImpayesListResult {
  /** All unpaid lots */
  impayes: UnpaidWithReminders[];
  /** Filtered based on options */
  filteredImpayes: UnpaidWithReminders[];
  /** Statistics */
  stats: ImpayesStats;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Refresh data */
  refresh: () => Promise<void>;
}

export interface UseImpayeRemindersOptions {
  lotId?: string;
  status?: string;
}

export interface UseImpayeRemindersResult {
  reminders: PaymentReminderOverview[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// ============================================================================
// useImpayesList - List all unpaid lots
// ============================================================================

export function useImpayesList(
  options: UseImpayesListOptions = {}
): UseImpayesListResult {
  const { currentCoproId } = useCopro();
  const [impayes, setImpayes] = useState<UnpaidWithReminders[]>([]);
  const [stats, setStats] = useState<ImpayesStats>({
    totalImpayes: 0,
    montantTotal: 0,
    nbMinor: 0,
    nbMedium: 0,
    nbHigh: 0,
    nbCritical: 0,
    nbRelancesPending: 0,
    nbRelancesSent: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!currentCoproId) {
      setImpayes([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [impayesData, statsData] = await Promise.all([
        impayesApi.listUnpaidWithReminders(currentCoproId),
        impayesApi.getImpayesStats(currentCoproId),
      ]);

      setImpayes(impayesData);
      setStats(statsData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du chargement';
      setError(message);
      console.error('useImpayesList error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentCoproId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter based on options
  const filteredImpayes = useMemo(() => {
    let result = impayes;

    // Filter by severity
    if (options.severity && options.severity !== 'all') {
      result = result.filter((i) => i.severity === options.severity);
    }

    // Filter by search term
    if (options.search) {
      const searchLower = options.search.toLowerCase();
      result = result.filter(
        (i) =>
          i.owner_name?.toLowerCase().includes(searchLower) ||
          i.lot_ref?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by min days overdue
    if (options.minDaysOverdue) {
      result = result.filter((i) => i.days_overdue >= options.minDaysOverdue!);
    }

    return result;
  }, [impayes, options.severity, options.search, options.minDaysOverdue]);

  return {
    impayes,
    filteredImpayes,
    stats,
    isLoading,
    error,
    refresh: loadData,
  };
}

// ============================================================================
// useImpayeReminders - Reminders for a specific lot or all
// ============================================================================

export function useImpayeReminders(
  options: UseImpayeRemindersOptions = {}
): UseImpayeRemindersResult {
  const { currentCoproId } = useCopro();
  const [reminders, setReminders] = useState<PaymentReminderOverview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!currentCoproId) {
      setReminders([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await impayesApi.listPaymentReminders(currentCoproId, {
        lotId: options.lotId,
        status: options.status,
      });
      setReminders(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du chargement';
      setError(message);
      console.error('useImpayeReminders error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentCoproId, options.lotId, options.status]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    reminders,
    isLoading,
    error,
    refresh: loadData,
  };
}

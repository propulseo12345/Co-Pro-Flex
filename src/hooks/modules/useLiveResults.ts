/**
 * Hook pour le polling des résultats live depuis le backend
 * Utilisé par le mode projecteur et l'affichage temps réel
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSupabase } from '@/hooks/useSupabase';
import type { LiveResults } from '@/lib/ag/correspondence';

interface UseLiveResultsParams {
  agId: string;
  enabled?: boolean;
  pollingInterval?: number; // en ms, défaut 3000 (3s)
  onUpdate?: (data: LiveResults) => void;
  onError?: (error: Error) => void;
}

interface UseLiveResultsReturn {
  data: LiveResults | null;
  isLoading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  isPolling: boolean;

  // Controls
  startPolling: () => void;
  stopPolling: () => void;
  refresh: () => Promise<void>;
}

export function useLiveResults({
  agId,
  enabled = true,
  pollingInterval = 3000,
  onUpdate,
  onError,
}: UseLiveResultsParams): UseLiveResultsReturn {
  const { supabase } = useSupabase();

  const [data, setData] = useState<LiveResults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isActiveRef = useRef(enabled);

  /**
   * Récupérer les résultats live
   */
  const fetchResults = useCallback(async () => {
    if (!supabase || !isActiveRef.current) return;

    try {
      const { data: result, error: rpcError } = await supabase
        .rpc('get_ag_live_results', { p_ag_id: agId });

      if (rpcError) throw rpcError;

      const liveResults = result as LiveResults;

      if (liveResults.success) {
        setData(liveResults);
        setLastUpdate(new Date());
        setError(null);
        onUpdate?.(liveResults);
      } else {
        throw new Error(liveResults.error || 'Erreur de récupération');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de connexion';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  }, [supabase, agId, onUpdate, onError]);

  /**
   * Démarrer le polling
   */
  const startPolling = useCallback(() => {
    if (intervalRef.current) return;

    isActiveRef.current = true;
    setIsPolling(true);

    // Fetch immédiat
    fetchResults();

    // Puis polling régulier
    intervalRef.current = setInterval(fetchResults, pollingInterval);
  }, [fetchResults, pollingInterval]);

  /**
   * Arrêter le polling
   */
  const stopPolling = useCallback(() => {
    isActiveRef.current = false;
    setIsPolling(false);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  /**
   * Rafraîchir manuellement
   */
  const refresh = useCallback(async () => {
    setIsLoading(true);
    await fetchResults();
  }, [fetchResults]);

  /**
   * Démarrer le polling au montage si enabled
   */
  useEffect(() => {
    if (enabled && supabase) {
      startPolling();
    }

    return () => {
      stopPolling();
    };
  }, [enabled, supabase, startPolling, stopPolling]);

  /**
   * Gérer les changements de pollingInterval
   */
  useEffect(() => {
    if (isPolling && intervalRef.current) {
      // Redémarrer avec le nouvel interval
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(fetchResults, pollingInterval);
    }
  }, [pollingInterval, isPolling, fetchResults]);

  return {
    data,
    isLoading,
    error,
    lastUpdate,
    isPolling,
    startPolling,
    stopPolling,
    refresh,
  };
}

export default useLiveResults;

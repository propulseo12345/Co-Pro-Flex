'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  loadPendingActions,
  markAgFinalized,
  type PendingAction,
} from '@/lib/ag/api/finalisation.api';

export type BlocStatus = 'pending' | 'activated' | 'failed' | 'loading';

export interface BlocState {
  status: BlocStatus;
  error: string | null;
}

export function useFinalisationPage(agId: string) {
  const [actions, setActions] = useState<PendingAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);
  const [isFinalized, setIsFinalized] = useState(false);

  const loadActions = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await loadPendingActions(agId);
      setActions(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setIsLoading(false);
    }
  }, [agId]);

  useEffect(() => {
    loadActions();
  }, [loadActions]);

  const refreshAction = useCallback(async () => {
    await loadActions();
  }, [loadActions]);

  const allActivated = actions.length > 0 && actions.every(a => a.status === 'activated');

  const handleFinalize = useCallback(async () => {
    if (!allActivated) return;
    setIsFinalizing(true);
    setFinalizeError(null);
    try {
      const result = await markAgFinalized(agId);
      if (!result.success) {
        setFinalizeError(result.error || 'Erreur lors de la finalisation');
        return;
      }
      setIsFinalized(true);
    } finally {
      setIsFinalizing(false);
    }
  }, [agId, allActivated]);

  return {
    actions,
    isLoading,
    loadError,
    allActivated,
    isFinalizing,
    finalizeError,
    isFinalized,
    refreshAction,
    handleFinalize,
  };
}

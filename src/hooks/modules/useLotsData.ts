/**
 * Hooks pour Lots et Clés de Répartition
 * P0#2: Migration Mock → Supabase
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useCoproSafe } from '@/providers/CoproContext';
import * as lotsApi from '@/lib/lots/api';
import type {
  LotWithOwner,
  LotCreate,
  LotUpdate,
  RepartitionKeyWithTotals,
  RepartitionKeyCreate,
  RepartitionKeyUpdate,
  RepartitionKeyLineDetailed,
  RepartitionKeyLineUpsert,
  ValidationResult,
  RepartitionBasis,
} from '@/lib/lots/api';

// ============================================================================
// HOOK: useLots
// ============================================================================

export interface UseLotsReturn {
  lots: LotWithOwner[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createLot: (payload: Omit<LotCreate, 'copro_id'>) => Promise<{ id: string } | null>;
  updateLot: (lotId: string, updates: LotUpdate) => Promise<boolean>;
  deleteLot: (lotId: string) => Promise<boolean>;
  isMutating: boolean;
  stats: {
    totalLots: number;
    totalTantiemes: number;
    lotsWithOwner: number;
    lotsWithoutOwner: number;
  };
}

export function useLots(coproIdParam?: string): UseLotsReturn {
  const ctx = useCoproSafe();
  const currentCoproId = coproIdParam ?? ctx?.currentCoproId ?? null;
  const [lots, setLots] = useState<LotWithOwner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  const fetchLots = useCallback(async () => {
    if (!currentCoproId) {
      setLots([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await lotsApi.listLotsWithOwners(currentCoproId);

    if (fetchError) {
      setError(fetchError.message);
      setLots([]);
    } else {
      setLots(data || []);
    }

    setIsLoading(false);
  }, [currentCoproId]);

  useEffect(() => {
    fetchLots();
  }, [fetchLots]);

  const createLot = useCallback(async (payload: Omit<LotCreate, 'copro_id'>) => {
    if (!currentCoproId) return null;
    setIsMutating(true);

    const { data, error: createError } = await lotsApi.createLot({
      ...payload,
      copro_id: currentCoproId,
    });

    setIsMutating(false);

    if (createError) {
      setError(createError.message);
      return null;
    }

    await fetchLots();
    return data;
  }, [currentCoproId, fetchLots]);

  const updateLot = useCallback(async (lotId: string, updates: LotUpdate) => {
    if (!currentCoproId) return false;
    setIsMutating(true);

    const { success, error: updateError } = await lotsApi.updateLot(currentCoproId, lotId, updates);

    setIsMutating(false);

    if (updateError) {
      setError(updateError.message);
      return false;
    }

    await fetchLots();
    return success;
  }, [currentCoproId, fetchLots]);

  const deleteLot = useCallback(async (lotId: string) => {
    if (!currentCoproId) return false;
    setIsMutating(true);

    const { success, error: deleteError } = await lotsApi.deleteLot(currentCoproId, lotId);

    setIsMutating(false);

    if (deleteError) {
      setError(deleteError.message);
      return false;
    }

    await fetchLots();
    return success;
  }, [currentCoproId, fetchLots]);

  const stats = useMemo(() => {
    const totalLots = lots.length;
    const totalTantiemes = lots.reduce((sum, lot) => sum + (lot.tantiemes_generaux || 0), 0);
    const lotsWithOwner = lots.filter(lot => lot.coproprietaire_id).length;
    const lotsWithoutOwner = totalLots - lotsWithOwner;

    return { totalLots, totalTantiemes, lotsWithOwner, lotsWithoutOwner };
  }, [lots]);

  return {
    lots,
    isLoading,
    error,
    refresh: fetchLots,
    createLot,
    updateLot,
    deleteLot,
    isMutating,
    stats,
  };
}

// ============================================================================
// HOOK: useLot (single lot)
// ============================================================================

export interface UseLotReturn {
  lot: LotWithOwner | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useLot(lotId: string | null, coproIdParam?: string): UseLotReturn {
  const ctx = useCoproSafe();
  const currentCoproId = coproIdParam ?? ctx?.currentCoproId ?? null;
  const [lot, setLot] = useState<LotWithOwner | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLot = useCallback(async () => {
    if (!currentCoproId || !lotId) {
      setLot(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await lotsApi.getLot(currentCoproId, lotId);

    if (fetchError) {
      setError(fetchError.message);
      setLot(null);
    } else {
      setLot(data);
    }

    setIsLoading(false);
  }, [currentCoproId, lotId]);

  useEffect(() => {
    fetchLot();
  }, [fetchLot]);

  return { lot, isLoading, error, refresh: fetchLot };
}

// ============================================================================
// HOOK: useRepartitionKeys
// ============================================================================

export interface UseRepartitionKeysReturn {
  keys: RepartitionKeyWithTotals[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createKey: (payload: Omit<RepartitionKeyCreate, 'copro_id'>) => Promise<{ id: string } | null>;
  updateKey: (keyId: string, updates: RepartitionKeyUpdate) => Promise<boolean>;
  deleteKey: (keyId: string) => Promise<boolean>;
  isMutating: boolean;
}

export function useRepartitionKeys(coproIdParam?: string): UseRepartitionKeysReturn {
  const ctx = useCoproSafe();
  const currentCoproId = coproIdParam ?? ctx?.currentCoproId ?? null;
  const [keys, setKeys] = useState<RepartitionKeyWithTotals[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  const fetchKeys = useCallback(async () => {
    if (!currentCoproId) {
      setKeys([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await lotsApi.listRepartitionKeys(currentCoproId);

    if (fetchError) {
      setError(fetchError.message);
      setKeys([]);
    } else {
      setKeys(data || []);
    }

    setIsLoading(false);
  }, [currentCoproId]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const createKey = useCallback(async (payload: Omit<RepartitionKeyCreate, 'copro_id'>) => {
    if (!currentCoproId) return null;
    setIsMutating(true);

    const { data, error: createError } = await lotsApi.createRepartitionKey({
      ...payload,
      copro_id: currentCoproId,
    });

    if (createError) {
      setIsMutating(false);
      setError(createError.message);
      return null;
    }

    // Si coverage_mode = all_lots, initialiser les lignes
    if (data && payload.coverage_mode !== 'subset') {
      await lotsApi.initializeRepartitionKeyLines(
        currentCoproId,
        data.id,
        payload.basis
      );
    }

    setIsMutating(false);
    await fetchKeys();
    return data;
  }, [currentCoproId, fetchKeys]);

  const updateKey = useCallback(async (keyId: string, updates: RepartitionKeyUpdate) => {
    if (!currentCoproId) return false;
    setIsMutating(true);

    const { success, error: updateError } = await lotsApi.updateRepartitionKey(
      currentCoproId,
      keyId,
      updates
    );

    setIsMutating(false);

    if (updateError) {
      setError(updateError.message);
      return false;
    }

    await fetchKeys();
    return success;
  }, [currentCoproId, fetchKeys]);

  const deleteKey = useCallback(async (keyId: string) => {
    if (!currentCoproId) return false;
    setIsMutating(true);

    const { success, error: deleteError } = await lotsApi.deleteRepartitionKey(currentCoproId, keyId);

    setIsMutating(false);

    if (deleteError) {
      setError(deleteError.message);
      return false;
    }

    await fetchKeys();
    return success;
  }, [currentCoproId, fetchKeys]);

  return {
    keys,
    isLoading,
    error,
    refresh: fetchKeys,
    createKey,
    updateKey,
    deleteKey,
    isMutating,
  };
}

// ============================================================================
// HOOK: useRepartitionKeyDetail
// ============================================================================

export interface UseRepartitionKeyDetailReturn {
  key: RepartitionKeyWithTotals | null;
  lines: RepartitionKeyLineDetailed[];
  validation: ValidationResult | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateLineWeight: (lotId: string, weight: number) => Promise<boolean>;
  deleteLine: (lotId: string) => Promise<boolean>;
  addLine: (lotId: string, weight: number) => Promise<boolean>;
  isMutating: boolean;
}

export function useRepartitionKeyDetail(keyId: string | null, coproIdParam?: string): UseRepartitionKeyDetailReturn {
  const ctx = useCoproSafe();
  const currentCoproId = coproIdParam ?? ctx?.currentCoproId ?? null;
  const [key, setKey] = useState<RepartitionKeyWithTotals | null>(null);
  const [lines, setLines] = useState<RepartitionKeyLineDetailed[]>([]);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  const fetchData = useCallback(async () => {
    if (!currentCoproId || !keyId) {
      setKey(null);
      setLines([]);
      setValidation(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [keyResult, linesResult, validationResult] = await Promise.all([
        lotsApi.getRepartitionKey(currentCoproId, keyId),
        lotsApi.listRepartitionKeyLines(currentCoproId, keyId),
        lotsApi.validateRepartitionKey(currentCoproId, keyId),
      ]);

      if (keyResult.error) {
        setError(keyResult.error.message);
      } else {
        setKey(keyResult.data);
      }

      if (linesResult.error) {
        setError(linesResult.error.message);
      } else {
        setLines(linesResult.data || []);
      }

      if (validationResult.data) {
        setValidation(validationResult.data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    }

    setIsLoading(false);
  }, [currentCoproId, keyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateLineWeight = useCallback(async (lotId: string, weight: number) => {
    if (!currentCoproId || !keyId) return false;
    setIsMutating(true);

    const { success, error: updateError } = await lotsApi.updateRepartitionKeyLineWeight(
      currentCoproId,
      keyId,
      lotId,
      weight
    );

    setIsMutating(false);

    if (updateError) {
      setError(updateError.message);
      return false;
    }

    await fetchData();
    return success;
  }, [currentCoproId, keyId, fetchData]);

  const deleteLine = useCallback(async (lotId: string) => {
    if (!currentCoproId || !keyId) return false;
    setIsMutating(true);

    const { success, error: deleteError } = await lotsApi.deleteRepartitionKeyLine(
      currentCoproId,
      keyId,
      lotId
    );

    setIsMutating(false);

    if (deleteError) {
      setError(deleteError.message);
      return false;
    }

    await fetchData();
    return success;
  }, [currentCoproId, keyId, fetchData]);

  const addLine = useCallback(async (lotId: string, weight: number) => {
    if (!currentCoproId || !keyId) return false;
    setIsMutating(true);

    const payload: RepartitionKeyLineUpsert = {
      copro_id: currentCoproId,
      key_id: keyId,
      lot_id: lotId,
      weight,
    };

    const { success, error: upsertError } = await lotsApi.upsertRepartitionKeyLine(payload);

    setIsMutating(false);

    if (upsertError) {
      setError(upsertError.message);
      return false;
    }

    await fetchData();
    return success;
  }, [currentCoproId, keyId, fetchData]);

  return {
    key,
    lines,
    validation,
    isLoading,
    error,
    refresh: fetchData,
    updateLineWeight,
    deleteLine,
    addLine,
    isMutating,
  };
}

// ============================================================================
// RE-EXPORTS for convenience
// ============================================================================

export type {
  LotWithOwner,
  LotCreate,
  LotUpdate,
  LotType,
  RepartitionKeyWithTotals,
  RepartitionKeyCreate,
  RepartitionKeyUpdate,
  RepartitionKeyLineDetailed,
  ValidationResult,
  RepartitionBasis,
} from '@/lib/lots/api';

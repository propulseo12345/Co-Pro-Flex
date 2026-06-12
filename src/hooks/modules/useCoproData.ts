/**
 * Hooks pour données Copropriétaires
 * P0#1: Migration Mock → Supabase
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useCopro } from '@/providers/CoproContext';
import {
  listCoproprietaires,
  getCoproprietaire,
  createCoproprietaire,
  updateCoproprietaire,
  archiveCoproprietaire,
  listLotsWithOwners,
  type CoproprietaireOverview,
  type CoproprietaireCreate,
  type CoproprietaireUpdate,
  type LotWithOwner,
} from '@/lib/owners/api';

// ============================================================================
// TYPES
// ============================================================================

export type OwnerType = 'COPROPRIETAIRE' | 'ANCIEN' | 'ALL';

interface UseCoproprietairesOptions {
  type?: OwnerType;
  autoFetch?: boolean;
}

interface UseCoproprietairesReturn {
  // Data
  coproprietaires: CoproprietaireOverview[];

  // State
  isLoading: boolean;
  error: string | null;

  // Actions
  refresh: () => Promise<void>;
  create: (data: CoproprietaireCreate) => Promise<{ success: boolean; error: string | null }>;
  update: (id: string, data: CoproprietaireUpdate) => Promise<{ success: boolean; error: string | null }>;
  archive: (id: string) => Promise<{ success: boolean; error: string | null }>;
}

interface UseLotsWithOwnersReturn {
  lots: LotWithOwner[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// ============================================================================
// HOOK: useCoproprietaires
// ============================================================================

export function useCoproprietaires(
  options: UseCoproprietairesOptions = {}
): UseCoproprietairesReturn {
  const { type = 'ALL', autoFetch = true } = options;
  const { currentCoproId } = useCopro();

  const [coproprietaires, setCoproprietaires] = useState<CoproprietaireOverview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track if component is mounted to avoid state updates after unmount
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchData = useCallback(async () => {
    if (!currentCoproId) {
      setCoproprietaires([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await listCoproprietaires(currentCoproId, {
      type: type === 'ALL' ? undefined : type,
    });

    if (!isMounted.current) {
      setIsLoading(false);
      return;
    }

    if (fetchError) {
      setError(fetchError.message);
      setCoproprietaires([]);
    } else {
      setCoproprietaires(data || []);
    }

    setIsLoading(false);
  }, [currentCoproId, type]);

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [autoFetch, fetchData]);

  const create = useCallback(
    async (data: CoproprietaireCreate) => {
      if (!currentCoproId) {
        return { success: false, error: 'Aucune copropriété sélectionnée' };
      }

      const { data: created, error: createError } = await createCoproprietaire(
        currentCoproId,
        data
      );

      if (createError) {
        return { success: false, error: createError.message };
      }

      // Ajoute en tête de liste localement
      if (created && isMounted.current) {
        setCoproprietaires((prev) => [created, ...prev]);
      }

      return { success: true, error: null };
    },
    [currentCoproId]
  );

  const update = useCallback(
    async (id: string, data: CoproprietaireUpdate) => {
      if (!currentCoproId) {
        return { success: false, error: 'Aucune copropriété sélectionnée' };
      }

      const { data: updated, error: updateError } = await updateCoproprietaire(
        currentCoproId,
        id,
        data
      );

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      // Update local state
      if (updated && isMounted.current) {
        setCoproprietaires((prev) =>
          prev.map((c) => (c.id === id ? updated : c))
        );
      }

      return { success: true, error: null };
    },
    [currentCoproId]
  );

  const archive = useCallback(
    async (id: string) => {
      if (!currentCoproId) {
        return { success: false, error: 'Aucune copropriété sélectionnée' };
      }

      const { success, error: archiveError } = await archiveCoproprietaire(
        currentCoproId,
        id
      );

      if (!success) {
        return { success: false, error: archiveError?.message || 'Erreur inconnue' };
      }

      // Refresh to get updated data
      await fetchData();

      return { success: true, error: null };
    },
    [currentCoproId, fetchData]
  );

  return {
    coproprietaires,
    isLoading,
    error,
    refresh: fetchData,
    create,
    update,
    archive,
  };
}

// ============================================================================
// HOOK: useLotsWithOwners
// ============================================================================

export function useLotsWithOwners(): UseLotsWithOwnersReturn {
  const { currentCoproId } = useCopro();

  const [lots, setLots] = useState<LotWithOwner[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchData = useCallback(async () => {
    if (!currentCoproId) {
      setLots([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await listLotsWithOwners(currentCoproId);

    if (!isMounted.current) {
      setIsLoading(false);
      return;
    }

    if (fetchError) {
      setError(fetchError.message);
      setLots([]);
    } else {
      setLots(data || []);
    }

    setIsLoading(false);
  }, [currentCoproId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    lots,
    isLoading,
    error,
    refresh: fetchData,
  };
}

// ============================================================================
// HOOK: useCoproprietaire (single)
// ============================================================================

interface UseCoproprietaireReturn {
  coproprietaire: CoproprietaireOverview | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useCoproprietaire(id: string | null): UseCoproprietaireReturn {
  const { currentCoproId } = useCopro();

  const [coproprietaire, setCoproprietaire] = useState<CoproprietaireOverview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchData = useCallback(async () => {
    if (!currentCoproId || !id) {
      setCoproprietaire(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await getCoproprietaire(currentCoproId, id);

    if (!isMounted.current) {
      setIsLoading(false);
      return;
    }

    if (fetchError) {
      setError(fetchError.message);
      setCoproprietaire(null);
    } else {
      setCoproprietaire(data);
    }

    setIsLoading(false);
  }, [currentCoproId, id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    coproprietaire,
    isLoading,
    error,
    refresh: fetchData,
  };
}

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLots } from '@/hooks/modules/useLotsData';
import { useRepartitionKeys } from '@/hooks/modules/useLotsData';
import { useCopro } from '@/providers/CoproContext';
import { createClient } from '@/lib/supabase/client';
import type { LotWithOwner, RepartitionKeyWithTotals, RepartitionKeyLineDetailed } from '@/lib/lots/api';
import * as lotsApi from '@/lib/lots/api';
import { listCoproprietaires, type CoproprietaireOverview } from '@/lib/owners/api';

export interface GridKeyColumn {
  key_id: string;
  name: string;
  basis: string;
  total_weight: number;
  lots_count: number;
  lots_with_weight_count: number;
  is_complete: boolean;
  color: string;
}

export interface GridRow {
  lot: LotWithOwner;
  weights: Record<string, { weight: number; share_pct: number }>; // key_id → weight data
}

const KEY_COLORS = ['#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899', '#10b981', '#f97316', '#6366f1', '#14b8a6'];

export function useLotsRepartitionGrid() {
  const { currentCoproId } = useCopro();
  const { lots, isLoading: lotsLoading, error: lotsError, refresh: refreshLots, createLot, updateLot, deleteLot, isMutating: lotsMutating, stats } = useLots();
  const { keys, isLoading: keysLoading, error: keysError, refresh: refreshKeys, createKey, updateKey, deleteKey, isMutating: keysMutating } = useRepartitionKeys();

  const [allLines, setAllLines] = useState<RepartitionKeyLineDetailed[]>([]);
  const [linesLoading, setLinesLoading] = useState(true);
  const [owners, setOwners] = useState<CoproprietaireOverview[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateLotModal, setShowCreateLotModal] = useState(false);
  const [showCreateKeyModal, setShowCreateKeyModal] = useState(false);
  const [editingLot, setEditingLot] = useState<LotWithOwner | null>(null);
  const [editingKey, setEditingKey] = useState<RepartitionKeyWithTotals | null>(null);

  // Fetch owners list
  const loadOwners = useCallback(async () => {
    if (!currentCoproId) return;
    const { data } = await listCoproprietaires(currentCoproId, { type: 'COPROPRIETAIRE' });
    if (data) setOwners(data);
  }, [currentCoproId]);

  // Fetch all key lines at once
  const fetchAllLines = useCallback(async () => {
    if (!currentCoproId || keys.length === 0) {
      setAllLines([]);
      setLinesLoading(false);
      return;
    }

    setLinesLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any;

    const { data } = await supabase
      .from('v_repartition_key_lines_detailed')
      .select('*')
      .eq('copro_id', currentCoproId);

    setAllLines(data || []);
    setLinesLoading(false);
  }, [currentCoproId, keys.length]);

  useEffect(() => {
    fetchAllLines();
    loadOwners();
  }, [fetchAllLines, loadOwners]);

  // Key columns (exclude the "charges générales" if it matches tantièmes)
  const keyColumns = useMemo((): GridKeyColumn[] => {
    return keys.map((k, idx) => ({
      key_id: k.key_id,
      name: k.name,
      basis: k.basis,
      total_weight: k.total_weight,
      lots_count: k.lots_count,
      lots_with_weight_count: k.lots_with_weight_count,
      is_complete: k.is_complete,
      color: KEY_COLORS[idx % KEY_COLORS.length],
    }));
  }, [keys]);

  // Grid rows
  const gridRows = useMemo((): GridRow[] => {
    let filtered = [...lots];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(lot =>
        lot.ref.toLowerCase().includes(q) ||
        (lot.owner_display_name && lot.owner_display_name.toLowerCase().includes(q)) ||
        (lot.type && lot.type.toLowerCase().includes(q))
      );
    }

    filtered.sort((a, b) => a.ref.localeCompare(b.ref, 'fr'));

    return filtered.map(lot => {
      const weights: Record<string, { weight: number; share_pct: number }> = {};
      for (const key of keys) {
        const line = allLines.find(l => l.lot_id === lot.id && l.key_id === key.key_id);
        weights[key.key_id] = {
          weight: line ? line.weight : 0,
          share_pct: line ? line.share_pct : 0,
        };
      }
      return { lot, weights };
    });
  }, [lots, keys, allLines, searchQuery]);

  // Wrap CRUD pour rafraîchir aussi les lignes de clé (pas seulement les lots)
  const createLotAndRefresh = useCallback(async (payload: Parameters<typeof createLot>[0]) => {
    const result = await createLot(payload);
    if (result) await Promise.all([fetchAllLines(), refreshKeys()]);
    return result;
  }, [createLot, fetchAllLines, refreshKeys]);

  const updateLotAndRefresh = useCallback(async (lotId: string, updates: Parameters<typeof updateLot>[1]) => {
    const result = await updateLot(lotId, updates);
    if (result) await fetchAllLines();
    return result;
  }, [updateLot, fetchAllLines]);

  const deleteLotAndRefresh = useCallback(async (lotId: string) => {
    const result = await deleteLot(lotId);
    if (result) await Promise.all([fetchAllLines(), refreshKeys()]);
    return result;
  }, [deleteLot, fetchAllLines, refreshKeys]);

  // Update a weight
  const updateWeight = useCallback(async (keyId: string, lotId: string, weight: number) => {
    if (!currentCoproId) return;
    await lotsApi.upsertRepartitionKeyLine({
      copro_id: currentCoproId,
      key_id: keyId,
      lot_id: lotId,
      weight,
    });
    await Promise.all([fetchAllLines(), refreshKeys()]);
  }, [currentCoproId, fetchAllLines, refreshKeys]);

  const assignOwner = useCallback(async (lotId: string, coproprietaireId: string | null) => {
    if (!currentCoproId) return;
    await lotsApi.assignOwnerToLot(currentCoproId, lotId, coproprietaireId);
    await refreshLots();
  }, [currentCoproId, refreshLots]);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshLots(), refreshKeys(), fetchAllLines()]);
  }, [refreshLots, refreshKeys, fetchAllLines]);

  const isLoading = lotsLoading || keysLoading || linesLoading;
  const error = lotsError || keysError;
  const isMutating = lotsMutating || keysMutating;

  return {
    // Grid data
    keyColumns,
    gridRows,
    stats,
    isLoading,
    error,
    isMutating,

    // Search
    searchQuery,
    setSearchQuery,

    // Lot CRUD (avec refresh des lignes de clé)
    createLot: createLotAndRefresh,
    updateLot: updateLotAndRefresh,
    deleteLot: deleteLotAndRefresh,
    editingLot,
    setEditingLot,
    showCreateLotModal,
    setShowCreateLotModal,

    // Key CRUD
    createKey,
    updateKey,
    deleteKey,
    editingKey,
    setEditingKey,
    showCreateKeyModal,
    setShowCreateKeyModal,

    // Weight edit
    updateWeight,

    // Owners
    owners,
    assignOwner,

    // Refresh
    refresh: refreshAll,
  };
}

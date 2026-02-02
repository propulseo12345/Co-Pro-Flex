'use client';

import { useState, useMemo, useCallback } from 'react';
import { useCopro } from '@/providers/CoproContext';
import { useLots, type LotWithOwner } from '@/hooks/modules/useLotsData';

interface EditValues {
  ref: string;
  tantiemes: number;
}

export function useTantiemesPage() {
  const { currentCoproId, isManager } = useCopro();
  const { lots, isLoading, error, refresh, updateLot, isMutating, stats } = useLots();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<EditValues>({ ref: '', tantiemes: 0 });

  // Calculate stats
  const totalTantiemes = stats.totalTantiemes;
  const totalLots = stats.totalLots;

  // Aggregate by owner for display
  const ownerAggregates = useMemo(() => {
    const aggregates = new Map<string, {
      id: string;
      nom: string;
      tantiemes: number;
      lotsCount: number;
    }>();

    lots.forEach(lot => {
      const ownerId = lot.coproprietaire_id || 'sans-proprietaire';
      const ownerName = lot.owner_display_name || 'Sans propriétaire';

      if (aggregates.has(ownerId)) {
        const existing = aggregates.get(ownerId)!;
        existing.tantiemes += lot.tantiemes_generaux;
        existing.lotsCount += 1;
      } else {
        aggregates.set(ownerId, {
          id: ownerId,
          nom: ownerName,
          tantiemes: lot.tantiemes_generaux,
          lotsCount: 1,
        });
      }
    });

    return Array.from(aggregates.values()).sort((a, b) => b.tantiemes - a.tantiemes);
  }, [lots]);

  // Combined loading state
  const isLoadingCombined = !currentCoproId || isLoading;

  // Handlers
  const handleEdit = useCallback((lot: LotWithOwner) => {
    if (!isManager) return;
    setEditingId(lot.id);
    setEditValues({ ref: lot.ref, tantiemes: lot.tantiemes_generaux });
  }, [isManager]);

  const handleSave = useCallback(async (lotId: string) => {
    if (!isManager) return;
    const success = await updateLot(lotId, {
      ref: editValues.ref,
      tantiemes_generaux: editValues.tantiemes,
    });
    if (success) {
      setEditingId(null);
    }
  }, [isManager, updateLot, editValues]);

  const handleCancel = useCallback(() => {
    setEditingId(null);
    setEditValues({ ref: '', tantiemes: 0 });
  }, []);

  const handleRefChange = useCallback((value: string) => {
    setEditValues(prev => ({ ...prev, ref: value }));
  }, []);

  const handleTantiemesChange = useCallback((value: number) => {
    setEditValues(prev => ({ ...prev, tantiemes: value }));
  }, []);

  return {
    // Data
    lots,
    ownerAggregates,
    totalTantiemes,
    totalLots,
    isManager,

    // Loading/error
    isLoading: isLoadingCombined,
    error,
    isMutating,

    // Edit state
    editingId,
    editValues,

    // Handlers
    handleEdit,
    handleSave,
    handleCancel,
    handleRefChange,
    handleTantiemesChange,

    // Actions
    refresh,
  };
}

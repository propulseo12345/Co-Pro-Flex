'use client';

import { useState, useMemo, useCallback } from 'react';
import { useLots } from '@/hooks/modules/useLotsData';
import type { LotWithOwner, LotType } from '@/lib/lots/api';

export type LotFilterType = LotType | 'ALL';
export type LotSortField = 'ref' | 'type' | 'floor' | 'tantiemes_generaux' | 'owner_display_name';
export type SortDirection = 'asc' | 'desc';

export interface UseLotsPageReturn {
  lots: LotWithOwner[];
  filteredLots: LotWithOwner[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterType: LotFilterType;
  setFilterType: (t: LotFilterType) => void;
  sortField: LotSortField;
  sortDirection: SortDirection;
  handleSort: (field: LotSortField) => void;
  stats: {
    totalLots: number;
    totalTantiemes: number;
    lotsWithOwner: number;
    lotsWithoutOwner: number;
  };
  showCreateModal: boolean;
  setShowCreateModal: (v: boolean) => void;
  createLot: ReturnType<typeof useLots>['createLot'];
  updateLot: ReturnType<typeof useLots>['updateLot'];
  deleteLot: ReturnType<typeof useLots>['deleteLot'];
  isMutating: boolean;
  refresh: () => Promise<void>;
}

export function useLotsPage(): UseLotsPageReturn {
  const { lots, isLoading, error, refresh, createLot, updateLot, deleteLot, isMutating, stats } = useLots();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<LotFilterType>('ALL');
  const [sortField, setSortField] = useState<LotSortField>('ref');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleSort = useCallback((field: LotSortField) => {
    if (field === sortField) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  const filteredLots = useMemo(() => {
    let result = [...lots];

    if (filterType !== 'ALL') {
      result = result.filter(lot => lot.type === filterType);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(lot =>
        lot.ref.toLowerCase().includes(q) ||
        (lot.owner_display_name && lot.owner_display_name.toLowerCase().includes(q)) ||
        (lot.type && lot.type.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = typeof aVal === 'string'
        ? aVal.localeCompare(bVal as string, 'fr')
        : (aVal as number) - (bVal as number);
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [lots, filterType, searchQuery, sortField, sortDirection]);

  return {
    lots, filteredLots, isLoading, error,
    searchQuery, setSearchQuery, filterType, setFilterType,
    sortField, sortDirection, handleSort,
    stats, showCreateModal, setShowCreateModal,
    createLot, updateLot, deleteLot, isMutating, refresh,
  };
}

'use client';

import { useState, useMemo, useCallback } from 'react';
import { useALURData, type ALURLotContribution } from '@/hooks/modules/useALURData';

export function useFondsALURPage() {
  const {
    fundSummary,
    lotContributions,
    transfers,
    worksBudgets,
    isLoading,
    error,
    selectedYear,
    setSelectedYear,
    createTransfer,
  } = useALURData();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLot, setSelectedLot] = useState<ALURLotContribution | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);

  const filteredLots = useMemo(() => {
    if (!searchTerm.trim()) return lotContributions;
    const term = searchTerm.toLowerCase();
    return lotContributions.filter(
      (lot) =>
        lot.lotRef.toLowerCase().includes(term) ||
        lot.ownerName.toLowerCase().includes(term)
    );
  }, [lotContributions, searchTerm]);

  const exportToExcel = useCallback(() => {
    if (!fundSummary || lotContributions.length === 0) return;

    const headers = ['Lot', 'Copropriétaire', 'Tantièmes', 'Quote-part (%)', 'Solde ALUR (€)', 'Cotisation annuelle (€)'];
    const rows = lotContributions.map((lot) => [
      lot.lotRef,
      lot.ownerName,
      lot.tantiemesGeneraux.toString(),
      lot.sharePercent.toFixed(2),
      lot.lotSoldeAlur.toFixed(2),
      lot.lotCotisationAnnuelle.toFixed(2),
    ]);

    rows.push([]);
    rows.push(['TOTAL', '', '', '100.00', fundSummary.soldeActuel.toFixed(2), fundSummary.cotisationAnnuelle.toFixed(2)]);

    const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `fonds-alur-${selectedYear}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }, [fundSummary, lotContributions, selectedYear]);

  const handleTransfer = useCallback(
    async (amount: number, destination: 'compte_courant' | 'budget_travaux', budgetId?: string, description?: string) => {
      return createTransfer({
        amount,
        destination,
        destinationBudgetId: budgetId,
        description: description || 'Transfert fonds ALUR',
      });
    },
    [createTransfer]
  );

  const openTransferModal = useCallback(() => setShowTransferModal(true), []);
  const closeTransferModal = useCallback(() => setShowTransferModal(false), []);
  const openLotDetail = useCallback((lot: ALURLotContribution) => setSelectedLot(lot), []);
  const closeLotDetail = useCallback(() => setSelectedLot(null), []);
  const clearSearch = useCallback(() => setSearchTerm(''), []);

  return {
    // Data
    fundSummary,
    lotContributions,
    filteredLots,
    transfers,
    worksBudgets,
    selectedYear,

    // State
    isLoading,
    error,
    searchTerm,
    selectedLot,
    showTransferModal,

    // Actions
    setSelectedYear,
    setSearchTerm,
    clearSearch,
    exportToExcel,
    handleTransfer,
    openTransferModal,
    closeTransferModal,
    openLotDetail,
    closeLotDetail,
  };
}

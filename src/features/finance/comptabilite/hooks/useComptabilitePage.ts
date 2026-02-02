'use client';

import { useState, useMemo, useCallback } from 'react';
import { useCopro } from '@/providers/CoproContext';
import { useGeneralLedger, useTrialBalance, useOpenPeriod } from '@/hooks/modules/useFinanceData';
import {
  TabCompta,
  OperationComptable,
  Depense,
  EtatCloture,
  HistoriqueModification,
  MouvementNonCategorise,
  filterOperations,
  calculateOperationTotals,
  calculateBalanceTotals,
  transformLedgerToOperations,
  transformTrialBalanceToLigneBalance,
} from '@/components/features/finance/Comptabilite';

export function useComptabilitePage() {
  const { currentCoproId } = useCopro();

  // Supabase hooks
  const { data: openPeriod, isLoading: periodLoading } = useOpenPeriod();
  const {
    data: ledgerEntries,
    isLoading: ledgerLoading,
    error: ledgerError,
    refresh: refreshLedger,
  } = useGeneralLedger({ status: 'posted' });
  const {
    data: trialBalanceData,
    isLoading: balanceLoading,
    error: balanceError,
    refresh: refreshBalance,
  } = useTrialBalance(openPeriod?.id || null);

  // Combined loading/error state
  const isLoading = periodLoading || ledgerLoading || balanceLoading;
  const error = ledgerError || balanceError;
  const handleRefresh = useCallback(() => {
    refreshLedger();
    refreshBalance();
  }, [refreshLedger, refreshBalance]);

  // Transform Supabase data to local format
  const operations = useMemo(() => {
    if (!ledgerEntries || ledgerEntries.length === 0) return [];
    return transformLedgerToOperations(ledgerEntries);
  }, [ledgerEntries]);

  const lignesBalance = useMemo(() => {
    if (!trialBalanceData || trialBalanceData.length === 0) return [];
    return transformTrialBalanceToLigneBalance(trialBalanceData);
  }, [trialBalanceData]);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabCompta>('grand-livre');

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [compteFilter, setCompteFilter] = useState('TOUS');
  const [typeDepenseFilter, setTypeDepenseFilter] = useState('TOUS');

  // Modal states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showClotureModal, setShowClotureModal] = useState(false);
  const [showHistoriqueModal, setShowHistoriqueModal] = useState(false);

  // Selected items
  const [selectedOperation, setSelectedOperation] = useState<OperationComptable | null>(null);
  const [selectedDepense, setSelectedDepense] = useState<Depense | null>(null);

  // Data not available from DB yet - use empty defaults
  const etatCloture: EtatCloture = useMemo(
    () => ({
      annee: openPeriod ? new Date(openPeriod.start_date).getFullYear() : new Date().getFullYear(),
      estCloturee: openPeriod?.status === 'closed',
      mouvementsNonCategorises: 0,
      alertes: [],
    }),
    [openPeriod]
  );

  const historique: HistoriqueModification[] = [];
  const mouvementsNonCategorises: MouvementNonCategorise[] = [];

  // Filters & filtered operations
  const filters = { searchTerm, dateDebut, dateFin, compteFilter, typeDepenseFilter };
  const filteredOperations = useMemo(() => filterOperations(operations, filters), [operations, filters]);

  // Totals
  const { totalDebit, totalCredit, isBalanced, ecart } = useMemo(
    () => calculateOperationTotals(filteredOperations),
    [filteredOperations]
  );

  // Unique comptes
  const comptesUniques = useMemo(() => {
    const comptes = new Set<string>();
    operations.forEach((op) => comptes.add(op.compte));
    return Array.from(comptes).sort();
  }, [operations]);

  // Balance stats
  const balanceTotals = useMemo(() => calculateBalanceTotals(lignesBalance), [lignesBalance]);
  const balanceStats = {
    nombreComptes: balanceTotals.nombreComptes,
    totalMouvementDebit: balanceTotals.totalMouvementDebit,
    totalMouvementCredit: balanceTotals.totalMouvementCredit,
    totalClotureDebit: balanceTotals.totalClotureDebit,
    totalClotureCredit: balanceTotals.totalClotureCredit,
  };

  // Handlers
  const handleViewOperationDetail = useCallback((operation: OperationComptable) => {
    setSelectedOperation(operation);
    setSelectedDepense(null);
    setShowDetailModal(true);
  }, []);

  const handleValiderCloture = useCallback(() => {
    if (!isBalanced) {
      alert('Impossible de clôturer !\n\nLe grand livre présente un déséquilibre comptable.');
      return;
    }
    if (etatCloture.mouvementsNonCategorises > 0) {
      alert('Impossible de clôturer !\n\nIl reste des mouvements bancaires non catégorisés.');
      return;
    }
    alert(`Clôture de l'exercice ${etatCloture.annee} validée avec succès !`);
    setShowClotureModal(false);
  }, [isBalanced, etatCloture]);

  const exportToPDF = useCallback(() => {}, []);
  const exportToExcel = useCallback(() => {}, []);

  return {
    // Context
    currentCoproId,

    // Loading/Error
    isLoading,
    error,
    handleRefresh,

    // Period
    openPeriod,

    // Data
    operations,
    filteredOperations,
    lignesBalance,
    etatCloture,
    historique,
    mouvementsNonCategorises,

    // Tabs
    activeTab,
    setActiveTab,

    // Filters
    searchTerm,
    setSearchTerm,
    dateDebut,
    setDateDebut,
    dateFin,
    setDateFin,
    compteFilter,
    setCompteFilter,
    typeDepenseFilter,
    setTypeDepenseFilter,
    comptesUniques,

    // Modals
    showDetailModal,
    setShowDetailModal,
    showClotureModal,
    setShowClotureModal,
    showHistoriqueModal,
    setShowHistoriqueModal,

    // Selected items
    selectedOperation,
    selectedDepense,

    // Totals
    totalDebit,
    totalCredit,
    isBalanced,
    ecart,
    balanceStats,

    // Handlers
    handleViewOperationDetail,
    handleValiderCloture,
    exportToPDF,
    exportToExcel,
  };
}

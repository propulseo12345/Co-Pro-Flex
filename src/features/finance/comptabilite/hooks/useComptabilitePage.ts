'use client';

import { useState, useMemo, useCallback } from 'react';
import { useCopro } from '@/providers/CoproContext';
import { useGeneralLedger, useTrialBalance, useActivePeriod } from '@/hooks/modules/useFinanceData';
import * as financeApi from '@/lib/finance/api';
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
  const [isClosingPeriod, setIsClosingPeriod] = useState(false);
  const [lastClosedPeriodId, setLastClosedPeriodId] = useState<string | null>(null);
  const [lastClosedYear, setLastClosedYear] = useState<number | null>(null);

  // Supabase hooks
  const { data: openPeriod, isLoading: periodLoading, refresh: refreshOpenPeriod } = useActivePeriod();
  const isReadOnly = openPeriod?.status === 'closed';
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
      annee: openPeriod
        ? new Date(openPeriod.start_date).getFullYear()
        : (lastClosedYear ?? new Date().getFullYear()),
      estCloturee:
        openPeriod?.status === 'closed' ||
        openPeriod?.id === lastClosedPeriodId ||
        (!openPeriod && lastClosedYear !== null),
      mouvementsNonCategorises: 0,
      alertes: [],
    }),
    [openPeriod, lastClosedPeriodId, lastClosedYear]
  );

  const historique: HistoriqueModification[] = [];
  const mouvementsNonCategorises: MouvementNonCategorise[] = [];

  // Filters & filtered operations
  const filters = useMemo(
    () => ({ searchTerm, dateDebut, dateFin, compteFilter, typeDepenseFilter }),
    [searchTerm, dateDebut, dateFin, compteFilter, typeDepenseFilter]
  );
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

  const handleValiderCloture = useCallback(async () => {
    const anneeCloture = etatCloture.annee;
    const mouvementsRestants = etatCloture.mouvementsNonCategorises;

    if (!isBalanced) {
      alert('Impossible de clôturer !\n\nLe grand livre présente un déséquilibre comptable.');
      return;
    }
    if (mouvementsRestants > 0) {
      alert('Impossible de clôturer !\n\nIl reste des mouvements bancaires non catégorisés.');
      return;
    }

    if (!openPeriod?.id || !currentCoproId) {
      alert('Aucune période ouverte trouvée pour clôturer l’exercice.');
      return;
    }

    setIsClosingPeriod(true);

    const result = await financeApi.closePeriod(openPeriod.id);
    if (result.error || result.data !== true) {
      const errorMessage = result.error || 'La clôture a échoué.';
      alert(`Échec de la clôture de l'exercice ${anneeCloture}.\n\n${errorMessage}`);
      setIsClosingPeriod(false);
      return;
    }

    setLastClosedPeriodId(openPeriod.id);
    setLastClosedYear(anneeCloture);
    await Promise.all([refreshOpenPeriod(), refreshLedger(), refreshBalance()]);

    setShowClotureModal(false);
    setIsClosingPeriod(false);
    alert(`Clôture de l'exercice ${anneeCloture} validée avec succès !`);
  }, [
    isBalanced,
    etatCloture.annee,
    etatCloture.mouvementsNonCategorises,
    openPeriod,
    currentCoproId,
    refreshOpenPeriod,
    refreshLedger,
    refreshBalance,
  ]);

  const exportToPDF = useCallback(() => {}, []);
  const exportToExcel = useCallback(() => {}, []);

  return {
    // Context
    currentCoproId,

    // Loading/Error
    isLoading,
    error,
    handleRefresh,
    isClosingPeriod,

    // Period
    openPeriod,
    isReadOnly,

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

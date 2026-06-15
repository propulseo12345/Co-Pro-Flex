'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useCopro } from '@/providers/CoproContext';
import { useGeneralLedger, useTrialBalance, useActivePeriod, useAccountingPeriods, useAccounts } from '@/hooks/modules/useFinanceData';
import * as financeApi from '@/lib/finance/api';
import {
  generateGrandLivreCSV,
  generateBalanceCSV,
  generateJournauxCSV,
  downloadCSV,
  csvFileName,
  type ExportCsvKind,
} from '@/lib/export/accounting-csv';
import {
  TabCompta,
  GrandLivreViewMode,
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
  const { currentCoproId, currentCopro } = useCopro();
  const [isClosingPeriod, setIsClosingPeriod] = useState(false);
  const [lastClosedPeriodId, setLastClosedPeriodId] = useState<string | null>(null);
  const [lastClosedYear, setLastClosedYear] = useState<number | null>(null);

  // Period selection: load all periods + auto-select active
  const { data: allPeriods, isLoading: periodsListLoading } = useAccountingPeriods();
  const { data: activePeriod, isLoading: activePeriodLoading } = useActivePeriod();
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);

  // Auto-select best period: most recent with entries, else most recent overall
  useEffect(() => {
    if (selectedPeriodId) return;
    if (allPeriods && allPeriods.length > 0) {
      const withEntries = allPeriods.find(p => (p.entry_count ?? 0) > 0);
      setSelectedPeriodId(withEntries?.id ?? allPeriods[0].id);
    } else if (activePeriod) {
      setSelectedPeriodId(activePeriod.id);
    }
  }, [activePeriod, allPeriods, selectedPeriodId]);

  // Derive the selected period object
  const openPeriod = useMemo(() => {
    if (!allPeriods || !selectedPeriodId) return activePeriod;
    return allPeriods.find(p => p.id === selectedPeriodId) || activePeriod;
  }, [allPeriods, selectedPeriodId, activePeriod]);

  const periodLoading = periodsListLoading || activePeriodLoading;
  const isReadOnly = openPeriod?.status !== 'open';

  // All accounts for "Livre comptable" tab (complete chart)
  const { data: allAccounts } = useAccounts();

  // Supabase hooks — now filtered by selected period
  const {
    data: ledgerEntries,
    isLoading: ledgerLoading,
    error: ledgerError,
    refresh: refreshLedger,
  } = useGeneralLedger({ periodId: selectedPeriodId || undefined, status: 'posted' });
  const {
    data: trialBalanceData,
    isLoading: balanceLoading,
    error: balanceError,
    refresh: refreshBalance,
  } = useTrialBalance(selectedPeriodId || null);

  // Combined loading/error state
  const isLoading = periodLoading || ledgerLoading || balanceLoading;
  const error = ledgerError || balanceError;
  const handleRefresh = useCallback(() => {
    refreshLedger();
    refreshBalance();
  }, [refreshLedger, refreshBalance]);

  // Build complete chart of accounts with 0-balances for "Livre comptable" tab
  const allAccountsWithBalances = useMemo(() => {
    if (!allAccounts) return [];
    // Create a map of account balances from ledger entries
    const balanceMap = new Map<string, { debit: number; credit: number }>();
    if (ledgerEntries) {
      for (const entry of ledgerEntries) {
        const current = balanceMap.get(entry.account_code) || { debit: 0, credit: 0 };
        if (entry.direction === 'debit') {
          current.debit += Number(entry.amount);
        } else {
          current.credit += Number(entry.amount);
        }
        balanceMap.set(entry.account_code, current);
      }
    }
    return allAccounts.map(account => ({
      code: account.code,
      name: account.name,
      accountType: account.account_type,
      debit: balanceMap.get(account.code)?.debit ?? 0,
      credit: balanceMap.get(account.code)?.credit ?? 0,
    }));
  }, [allAccounts, ledgerEntries]);

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
  const [viewMode, setViewMode] = useState<GrandLivreViewMode>('par-compte');

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

  // Contre-passation (0071)
  const [isReversing, setIsReversing] = useState(false);
  const [reverseError, setReverseError] = useState<string | null>(null);
  // Une contre-passation atterrit dans la période OUVERTE — disponible tant qu'IL EXISTE une période
  // ouverte, même si la période AFFICHÉE est close (c'est justement là que l'extourne est utile).
  const hasOpenPeriod = useMemo(() => (allPeriods ?? []).some(p => p.status === 'open'), [allPeriods]);
  // Écritures régénérables (clôture/à-nouveau/affectation) : on les régénère, on ne les contre-passe pas.
  const canReverseSelected = useMemo(() => {
    const op = selectedOperation;
    // Bloqué si : pas de tx, déjà extournée, est elle-même une extourne (reversalOf), aucune période ouverte.
    if (!op?.txId || op.isReversed || op.reversalOf || !hasOpenPeriod) return false;
    const REGENERABLE = ['opening_balance', 'closing', 'opening_onboarding', 'result_allocation'];
    return !REGENERABLE.includes(op.sourceType ?? '');
  }, [selectedOperation, hasOpenPeriod]);

  // Derive approval status from period
  const etatCloture: EtatCloture = useMemo(
    () => {
      const periodStatus = openPeriod?.status || 'open';
      const isClosed = periodStatus === 'closed' || periodStatus === 'approved' || periodStatus === 'rejected'
        || openPeriod?.id === lastClosedPeriodId
        || (!openPeriod && lastClosedYear !== null);

      // Map period status to approval status
      let approvalStatus: 'open' | 'closed' | 'approved' | 'rejected' = 'open';
      if (periodStatus === 'approved') approvalStatus = 'approved';
      else if (periodStatus === 'rejected') approvalStatus = 'rejected';
      else if (isClosed) approvalStatus = 'closed';

      return {
        annee: openPeriod
          ? new Date(openPeriod.start_date).getFullYear()
          : (lastClosedYear ?? new Date().getFullYear()),
        estCloturee: isClosed,
        approvalStatus,
        mouvementsNonCategorises: 0,
        alertes: [],
      };
    },
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
    setReverseError(null);
    setShowDetailModal(true);
  }, []);

  // Contre-passe la TRANSACTION de l'opération sélectionnée (écriture inverse dans la période ouverte).
  const handleReverseOperation = useCallback(async (reason: string) => {
    if (!selectedOperation?.txId) return;
    setIsReversing(true);
    setReverseError(null);
    const result = await financeApi.reverseLedgerTransaction(selectedOperation.txId, reason);
    setIsReversing(false);
    if (result.error) {
      setReverseError(result.error);
      return;
    }
    setShowDetailModal(false);
    setSelectedOperation(null);
    await Promise.all([refreshLedger(), refreshBalance()]);
  }, [selectedOperation, refreshLedger, refreshBalance]);

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
    await Promise.all([refreshLedger(), refreshBalance()]);

    setShowClotureModal(false);
    setIsClosingPeriod(false);
    alert(`Clôture de l'exercice ${anneeCloture} validée avec succès !`);
  }, [
    isBalanced,
    etatCloture.annee,
    etatCloture.mouvementsNonCategorises,
    openPeriod,
    currentCoproId,
    refreshLedger,
    refreshBalance,
  ]);

  // Export comptable CSV (grand livre / balance / journaux) généré côté client
  // depuis les données déjà chargées — finalité légale art. 18-1 (transmission CS/expert).
  const exportCSV = useCallback(
    (kind: ExportCsvKind) => {
      const year = openPeriod?.start_date
        ? new Date(openPeriod.start_date).getFullYear()
        : new Date().getFullYear();
      const meta = {
        coproName: currentCopro?.name ?? null,
        periodName: openPeriod?.name ?? null,
        year,
      };
      const csv =
        kind === 'balance'
          ? generateBalanceCSV(trialBalanceData ?? [], meta)
          : kind === 'journaux'
            ? generateJournauxCSV(ledgerEntries ?? [], meta)
            : generateGrandLivreCSV(ledgerEntries ?? [], meta);
      downloadCSV(csv, csvFileName(kind, meta));
    },
    [openPeriod, currentCopro, ledgerEntries, trialBalanceData]
  );

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
    allPeriods: allPeriods || [],
    selectedPeriodId,
    setSelectedPeriodId,

    // Data
    operations,
    allAccountsWithBalances,
    filteredOperations,
    lignesBalance,
    etatCloture,
    historique,
    mouvementsNonCategorises,

    // Tabs
    activeTab,
    setActiveTab,
    viewMode,
    setViewMode,

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
    exportCSV,

    // Contre-passation (0071)
    isReversing,
    reverseError,
    canReverseSelected,
    handleReverseOperation,
  };
}

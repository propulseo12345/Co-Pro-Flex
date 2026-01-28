'use client';

import { useState, useMemo } from 'react';
import { useCopro } from '@/providers/CoproContext';
import { useGeneralLedger, useTrialBalance, useOpenPeriod } from '@/hooks/modules/useFinanceData';
import {
  ComptaHeader,
  ComptaTabs,
  ComptaStats,
  ComptaFilters,
  ComptaInfoBanner,
  ComptaLoadingState,
  ComptaErrorState,
  ComptaNoPeriodState,
  ComptaTabContent,
  DetailModal,
  ClotureModal,
  HistoriqueModal,
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
import styles from './comptabilite.module.css';

export default function ComptabilitePage() {
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
  const handleRefresh = () => {
    refreshLedger();
    refreshBalance();
  };

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
  const handleViewOperationDetail = (operation: OperationComptable) => {
    setSelectedOperation(operation);
    setSelectedDepense(null);
    setShowDetailModal(true);
  };

  const handleValiderCloture = () => {
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
  };

  const exportToPDF = () => {};
  const exportToExcel = () => {};

  // Loading state
  if (!currentCoproId || isLoading) return <ComptaLoadingState />;

  // Error state
  if (error) return <ComptaErrorState error={error} onRetry={handleRefresh} />;

  // No period state
  if (!openPeriod) {
    return (
      <div className={styles.container}>
        <ComptaHeader
          etatCloture={etatCloture}
          onShowHistorique={() => setShowHistoriqueModal(true)}
          onShowCloture={() => setShowClotureModal(true)}
          onExportPDF={exportToPDF}
          onExportExcel={exportToExcel}
        />
        <ComptaNoPeriodState />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <ComptaHeader
        etatCloture={etatCloture}
        onShowHistorique={() => setShowHistoriqueModal(true)}
        onShowCloture={() => setShowClotureModal(true)}
        onExportPDF={exportToPDF}
        onExportExcel={exportToExcel}
      />

      <ComptaInfoBanner periodName={openPeriod.name} onRefresh={handleRefresh} />
      <ComptaTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <ComptaStats
        activeTab={activeTab}
        totalDebit={totalDebit}
        totalCredit={totalCredit}
        totalDepenses={0}
        totalBudgetPrevu={0}
        isBalanced={isBalanced}
        ecart={ecart}
        balanceStats={balanceStats}
      />

      {(activeTab === 'grand-livre' || activeTab === 'compte-gestion') && (
        <ComptaFilters
          activeTab={activeTab}
          searchTerm={searchTerm}
          dateDebut={dateDebut}
          dateFin={dateFin}
          compteFilter={compteFilter}
          typeDepenseFilter={typeDepenseFilter}
          comptesUniques={comptesUniques}
          onSearchChange={setSearchTerm}
          onDateDebutChange={setDateDebut}
          onDateFinChange={setDateFin}
          onCompteFilterChange={setCompteFilter}
          onTypeDepenseFilterChange={setTypeDepenseFilter}
        />
      )}

      <ComptaTabContent
        activeTab={activeTab}
        operations={operations}
        filteredOperations={filteredOperations}
        lignesBalance={lignesBalance}
        annee={etatCloture.annee}
        onViewOperationDetail={handleViewOperationDetail}
      />

      <DetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        selectedOperation={selectedOperation}
        selectedDepense={selectedDepense}
      />
      <ClotureModal
        isOpen={showClotureModal}
        onClose={() => setShowClotureModal(false)}
        etatCloture={etatCloture}
        mouvementsNonCategorises={mouvementsNonCategorises}
        totalDebit={totalDebit}
        totalCredit={totalCredit}
        isBalanced={isBalanced}
        ecart={ecart}
        onValiderCloture={handleValiderCloture}
      />
      <HistoriqueModal
        isOpen={showHistoriqueModal}
        onClose={() => setShowHistoriqueModal(false)}
        historique={historique}
      />
    </div>
  );
}

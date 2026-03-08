'use client';

import { Calendar, Lock, CircleDot } from 'lucide-react';
import { useComptabilitePage } from '@/features/finance/comptabilite';
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
} from '@/components/features/finance/Comptabilite';
import { FinanceAnnexeStats } from '@/components/features/finance/FinanceAnnexeStats';
import styles from './comptabilite.module.css';

export default function ComptabilitePage() {
  const page = useComptabilitePage();

  if (!page.currentCoproId || page.isLoading) {
    return <ComptaLoadingState />;
  }

  if (page.error) {
    return <ComptaErrorState error={page.error} onRetry={page.handleRefresh} />;
  }

  if (!page.openPeriod) {
    return (
      <div className={styles.container}>
        <ComptaHeader
          etatCloture={page.etatCloture}
          onShowHistorique={() => page.setShowHistoriqueModal(true)}
          onShowCloture={() => page.setShowClotureModal(true)}
          onExportPDF={page.exportToPDF}
          onExportExcel={page.exportToExcel}
        />
        <ComptaNoPeriodState />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <ComptaHeader
        etatCloture={page.etatCloture}
        startDate={page.openPeriod.start_date}
        endDate={page.openPeriod.end_date}
        onShowHistorique={() => page.setShowHistoriqueModal(true)}
        onShowCloture={() => page.setShowClotureModal(true)}
        onExportPDF={page.exportToPDF}
        onExportExcel={page.exportToExcel}
      />

      {/* Sélecteur d'exercice */}
      {page.allPeriods.length > 1 && (
        <div className={styles.periodSelector}>
          <Calendar size={16} />
          <span className={styles.periodSelectorLabel}>Exercice :</span>
          <select
            className={styles.periodSelectorSelect}
            value={page.selectedPeriodId || ''}
            onChange={(e) => page.setSelectedPeriodId(e.target.value)}
          >
            {page.allPeriods.map((period) => (
              <option key={period.id} value={period.id}>
                {period.name} ({period.start_date.slice(0, 4)})
              </option>
            ))}
          </select>
          <span
            className={`${styles.periodStatusBadge} ${
              page.openPeriod.status === 'open' ? styles.periodStatusOpen : styles.periodStatusClosed
            }`}
          >
            {page.openPeriod.status === 'open' ? (
              <><CircleDot size={12} /> En cours</>
            ) : (
              <><Lock size={12} /> Clôturé</>
            )}
          </span>
        </div>
      )}

      <FinanceAnnexeStats periodId={page.selectedPeriodId} />
      <ComptaInfoBanner
        periodName={page.openPeriod.name}
        onRefresh={page.handleRefresh}
        isReadOnly={page.isReadOnly}
      />
      <ComptaTabs activeTab={page.activeTab} onTabChange={page.setActiveTab} />

      <ComptaStats
        activeTab={page.activeTab}
        totalDebit={page.totalDebit}
        totalCredit={page.totalCredit}
        totalDepenses={0}
        totalBudgetPrevu={0}
        isBalanced={page.isBalanced}
        ecart={page.ecart}
        balanceStats={page.balanceStats}
      />

      {(page.activeTab === 'grand-livre' || page.activeTab === 'compte-gestion') && (
        <ComptaFilters
          activeTab={page.activeTab}
          searchTerm={page.searchTerm}
          dateDebut={page.dateDebut}
          dateFin={page.dateFin}
          compteFilter={page.compteFilter}
          typeDepenseFilter={page.typeDepenseFilter}
          comptesUniques={page.comptesUniques}
          onSearchChange={page.setSearchTerm}
          onDateDebutChange={page.setDateDebut}
          onDateFinChange={page.setDateFin}
          onCompteFilterChange={page.setCompteFilter}
          onTypeDepenseFilterChange={page.setTypeDepenseFilter}
        />
      )}

      <ComptaTabContent
        activeTab={page.activeTab}
        operations={page.operations}
        filteredOperations={page.filteredOperations}
        lignesBalance={page.lignesBalance}
        allAccountsWithBalances={page.allAccountsWithBalances}
        annee={page.etatCloture.annee}
        onViewOperationDetail={page.handleViewOperationDetail}
        coproId={page.currentCoproId}
        periodId={page.openPeriod?.id ?? null}
        coproName={page.openPeriod?.name}
      />

      <DetailModal
        isOpen={page.showDetailModal}
        onClose={() => page.setShowDetailModal(false)}
        selectedOperation={page.selectedOperation}
        selectedDepense={page.selectedDepense}
      />
      {!page.isReadOnly && (
        <ClotureModal
          isOpen={page.showClotureModal}
          onClose={() => page.setShowClotureModal(false)}
          etatCloture={page.etatCloture}
          mouvementsNonCategorises={page.mouvementsNonCategorises}
          totalDebit={page.totalDebit}
          totalCredit={page.totalCredit}
          isBalanced={page.isBalanced}
          ecart={page.ecart}
          onValiderCloture={page.handleValiderCloture}
        />
      )}
      <HistoriqueModal
        isOpen={page.showHistoriqueModal}
        onClose={() => page.setShowHistoriqueModal(false)}
        historique={page.historique}
      />
    </div>
  );
}

'use client';

import { useComptabilitePage } from '@/features/finance/comptabilite';
import {
  ComptaSidebar,
  ComptaTopBar,
  ComptaKpiStrip,
  ComptaFilters,
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
      <div className={styles.layout}>
        <ComptaSidebar
          activeTab={page.activeTab}
          onTabChange={page.setActiveTab}
        />
        <div className={styles.main}>
          <ComptaTopBar
            activeTab={page.activeTab}
            onExportPDF={page.exportToPDF}
            onExportExcel={page.exportToExcel}
          />
          <div className={styles.content}>
            <ComptaNoPeriodState />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <ComptaSidebar
        activeTab={page.activeTab}
        onTabChange={page.setActiveTab}
        onShowCloture={() => page.setShowClotureModal(true)}
        onShowHistorique={() => page.setShowHistoriqueModal(true)}
        isReadOnly={page.isReadOnly}
      />

      <div className={styles.main}>
        <ComptaTopBar
          activeTab={page.activeTab}
          periodStart={page.openPeriod.start_date}
          periodEnd={page.openPeriod.end_date}
          periodStatus={page.openPeriod.status}
          onExportPDF={page.exportToPDF}
          onExportExcel={page.exportToExcel}
          onShowCloture={() => page.setShowClotureModal(true)}
          isReadOnly={page.isReadOnly}
        />

        <div className={styles.content}>
          {page.allPeriods.length > 1 && (
            <div className={styles.periodSelector}>
              <select
                className={styles.periodSelect}
                value={page.selectedPeriodId || ''}
                onChange={(e) => page.setSelectedPeriodId(e.target.value)}
              >
                {page.allPeriods.map((period) => (
                  <option key={period.id} value={period.id}>
                    {period.name} ({period.start_date.slice(0, 4)})
                  </option>
                ))}
              </select>
            </div>
          )}

          <FinanceAnnexeStats periodId={page.selectedPeriodId} />

          <ComptaKpiStrip
            totalDebit={page.totalDebit}
            totalCredit={page.totalCredit}
            ecrituresCount={page.filteredOperations.length}
            isBalanced={page.isBalanced}
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
        </div>
      </div>

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

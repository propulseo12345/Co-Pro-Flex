'use client';

import { Download, FileSpreadsheet, Copy, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { useComptabilitePage } from '@/features/finance/comptabilite';
import {
  ComptaNavBar,
  ComptaViewSwitcher,
  ComptaLoadingState,
  ComptaErrorState,
  ComptaNoPeriodState,
  ComptaTabContent,
  DetailModal,
  ClotureModal,
  HistoriqueModal,
} from '@/components/features/finance/Comptabilite';
import { FinanceTopBar, topBarStyles } from '@/components/layout/FinanceTopBar/FinanceTopBar';
import { FinanceKpiStrip } from '@/components/layout/FinanceKpiStrip/FinanceKpiStrip';
import type { FinanceKpi } from '@/components/layout/FinanceKpiStrip/FinanceKpiStrip';
import { FinanceAnnexeStats } from '@/components/features/finance/FinanceAnnexeStats';
import { formatCurrency } from '@/components/features/finance/Comptabilite/utils';
import type { TabCompta } from '@/components/features/finance/Comptabilite/types';
import styles from './comptabilite.module.css';

const TAB_TITLES: Record<TabCompta, string> = {
  'grand-livre': 'Grand Livre',
  'livre-comptable': 'Livre comptable',
  'balance': 'Balance',
  'compte-gestion': 'Compte de gestion',
  'annexe-1': 'Annexe 1 — État financier',
  'annexe-2': 'Annexe 2 — Gestion courante',
  'annexe-3': 'Annexe 3 — Clés de répartition',
  'annexe-4': 'Annexe 4 — Travaux',
  'annexe-5': 'Annexe 5 — Non clôturés',
};

function formatPeriodLabel(start?: string, end?: string): string {
  if (!start || !end) return '';
  const startDate = new Date(start);
  const endDate = new Date(end);
  const year = startDate.getFullYear();
  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  return `Exercice ${year} — ${fmt(startDate)} au ${fmt(endDate)}`;
}

export default function ComptabilitePage() {
  const page = useComptabilitePage();

  if (!page.currentCoproId || page.isLoading) {
    return <ComptaLoadingState />;
  }

  if (page.error) {
    return <ComptaErrorState error={page.error} onRetry={page.handleRefresh} />;
  }

  const title = TAB_TITLES[page.activeTab] || 'Comptabilité';

  if (!page.openPeriod) {
    return (
      <div className={styles.page}>
        <FinanceTopBar
          title={title}
          actions={
            <>
              <button className={topBarStyles.btnIcon} onClick={page.exportToPDF} title="Export PDF">
                <Download size={16} />
              </button>
              <button className={topBarStyles.btnIcon} onClick={page.exportToExcel} title="Export Excel">
                <FileSpreadsheet size={16} />
              </button>
              <button className={topBarStyles.btnIcon} title="Copier">
                <Copy size={16} />
              </button>
            </>
          }
        />
        <ComptaNavBar activeTab={page.activeTab} onTabChange={page.setActiveTab} />
        <div className={styles.content}>
          <ComptaNoPeriodState />
        </div>
      </div>
    );
  }

  const periodLabel = formatPeriodLabel(page.openPeriod.start_date, page.openPeriod.end_date);
  const isOpen = page.openPeriod.status === 'open';

  const kpis: FinanceKpi[] = [
    { label: 'Total Débit', value: formatCurrency(page.totalDebit), color: 'var(--danger)' },
    { label: 'Total Crédit', value: formatCurrency(page.totalCredit), color: 'var(--success)' },
    {
      label: 'Écritures',
      value: String(page.filteredOperations.length),
      color: 'var(--primary)',
      trend: (
        <span style={{ color: 'var(--success)' }}>
          <CheckCircle size={12} /> Toutes comptabilisées
        </span>
      ),
    },
    {
      label: 'État balance',
      value: page.isBalanced ? 'Équilibrée' : 'Déséquilibrée',
      color: page.isBalanced ? 'var(--success)' : 'var(--danger)',
      trend: !page.isBalanced ? (
        <span style={{ color: 'var(--danger)' }}>
          <AlertCircle size={12} /> Vérifier les écritures
        </span>
      ) : undefined,
    },
  ];

  return (
    <div className={styles.page}>
      <FinanceTopBar
        title={title}
        pill={
          periodLabel
            ? {
                label: periodLabel,
                variant: 'green',
                dotVariant: isOpen ? 'green' : 'gray',
              }
            : undefined
        }
        actions={
          <>
            <button className={topBarStyles.btnIcon} onClick={page.exportToPDF} title="Export PDF">
              <Download size={16} />
            </button>
            <button className={topBarStyles.btnIcon} onClick={page.exportToExcel} title="Export Excel">
              <FileSpreadsheet size={16} />
            </button>
            <button className={topBarStyles.btnIcon} title="Copier">
              <Copy size={16} />
            </button>
            {!page.isReadOnly && (
              <button
                className={topBarStyles.btnDanger}
                onClick={() => page.setShowClotureModal(true)}
              >
                <Lock size={14} />
                Clôturer {page.openPeriod.start_date ? new Date(page.openPeriod.start_date).getFullYear() : ''}
              </button>
            )}
          </>
        }
      />

      <ComptaNavBar activeTab={page.activeTab} onTabChange={page.setActiveTab} />

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

        <FinanceKpiStrip items={kpis} />

        {page.activeTab === 'grand-livre' && (
          <ComptaViewSwitcher
            viewMode={page.viewMode}
            onViewModeChange={page.setViewMode}
            searchTerm={page.searchTerm}
            onSearchChange={page.setSearchTerm}
            compteFilter={page.compteFilter}
            onCompteFilterChange={page.setCompteFilter}
            comptesUniques={page.comptesUniques}
            dateFilter={page.dateDebut}
            onDateFilterChange={page.setDateDebut}
          />
        )}

        <ComptaTabContent
          activeTab={page.activeTab}
          viewMode={page.viewMode}
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

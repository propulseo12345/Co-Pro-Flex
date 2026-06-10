'use client';

import { useState, useRef, useEffect } from 'react';
import { Download, Plus, Calendar, ChevronDown } from 'lucide-react';
import { useAppelsFondsPage } from '@/features/finance/appels-fonds/hooks';
import {
  AppelsFondsTabs,
  TabVueGlobale,
  TabBudgetCourant,
  TabTravaux,
  CreateCallWizard,
} from '@/features/finance/appels-fonds/components';
import { formatEuros } from '@/features/finance/appels-fonds/utils';
import { FinanceTopBar, topBarStyles } from '@/components/layout/FinanceTopBar/FinanceTopBar';
import { FinanceKpiStrip } from '@/components/layout/FinanceKpiStrip/FinanceKpiStrip';
import type { FinanceKpi } from '@/components/layout/FinanceKpiStrip/FinanceKpiStrip';
import type { AccountingPeriod } from '@/lib/finance/api';
import periodStyles from '@/features/finance/appels-fonds/styles/AppelsFondsPage.module.css';
import styles from './appels-fonds.module.css';

function formatPeriodDates(period: AccountingPeriod): string {
  const start = new Date(period.start_date).toLocaleDateString('fr-FR');
  const end = new Date(period.end_date).toLocaleDateString('fr-FR');
  return `${start} — ${end}`;
}

export default function AppelsFondsPage() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    calls,
    trimesterCards,
    travauxProjects,
    globalStats,
    courantStats,
    travauxStats,
    activeTab,
    setActiveTab,
    impayesCount,
    periods,
    selectedPeriod,
    selectPeriod,
    isLoading,
    wizardBudgets,
    refreshCalls,
    groupedCalls,
  } = useAppelsFondsPage();

  // Fermer le dropdown au clic exterieur
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setPeriodDropdownOpen(false);
      }
    }
    if (periodDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [periodDropdownOpen]);

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <p>Chargement des appels de fonds...</p>
        </div>
      </div>
    );
  }

  // ── Empty state: no periods ──
  if (periods.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <p>Aucun exercice comptable. Veuillez en creer un depuis les parametres finance.</p>
        </div>
      </div>
    );
  }

  const rateColor = globalStats.recoveryRate >= 80 ? '#22c55e' : globalStats.recoveryRate >= 50 ? '#f59e0b' : '#ef4444';
  const kpis: FinanceKpi[] = [
    { label: 'Total Appelé', value: formatEuros(globalStats.totalCalled), color: '#3b82f6' },
    { label: 'Total Encaissé', value: formatEuros(globalStats.totalPaid), color: '#22c55e' },
    { label: 'Impayés', value: formatEuros(globalStats.totalUnpaid), color: '#ef4444' },
    { label: 'Taux de recouvrement', value: `${globalStats.recoveryRate} %`, color: rateColor },
  ];

  return (
    <div className={styles.container}>
      <FinanceTopBar
        title="Appels de fonds"
        subtitle="Budget courant et travaux — suivi par exercice"
        pill={selectedPeriod ? { label: selectedPeriod.name, variant: 'blue', dotVariant: 'blue' } : undefined}
        actions={
          <>
            <button className={topBarStyles.btnGhost} onClick={() => {/* TODO */}}>
              <Download size={14} /> Export
            </button>
            {/* Bêta : création manuelle désactivée — le wizard appelle une RPC non livrée
                (post_call_for_funds). Les appels sont générés à la validation du budget en AG
                (post_budget_call_for_funds, opérationnel). Réactiver quand l'appel exceptionnel
                (post_exceptional_call_for_funds) sera implémenté. */}
            <button
              className={topBarStyles.btnPrimary}
              onClick={() => setWizardOpen(true)}
              disabled
              title="Création manuelle d'appels bientôt disponible — pour l'instant, les appels sont générés automatiquement à la validation du budget en AG."
            >
              <Plus size={14} /> Générer les appels
            </button>
          </>
        }
      />

      {/* Period selector bar */}
      <div className={periodStyles.periodBar} ref={dropdownRef}>
        <button
          className={periodStyles.periodSelector}
          onClick={() => setPeriodDropdownOpen(!periodDropdownOpen)}
        >
          <Calendar size={16} />
          <span className={periodStyles.periodLabel}>
            {selectedPeriod?.name ?? 'Sélectionner un exercice'}
          </span>
          {selectedPeriod && (
            <span className={periodStyles.periodMeta}>
              {formatPeriodDates(selectedPeriod)}
            </span>
          )}
          <ChevronDown size={14} className={periodDropdownOpen ? periodStyles.chevronOpen : periodStyles.chevron} />
        </button>

        {periodDropdownOpen && (
          <div className={periodStyles.periodDropdown}>
            {periods.map(period => (
              <button
                key={period.id}
                className={`${periodStyles.periodOption} ${period.id === selectedPeriod?.id ? periodStyles.periodOptionActive : ''}`}
                onClick={() => {
                  selectPeriod(period.id);
                  setPeriodDropdownOpen(false);
                }}
              >
                <span className={periodStyles.periodOptionName}>{period.name}</span>
                <span className={periodStyles.periodOptionDates}>{formatPeriodDates(period)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <FinanceKpiStrip items={kpis} />

      <AppelsFondsTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        globalAmount={formatEuros(globalStats.totalCalled)}
        globalRate={globalStats.recoveryRate}
        courantAmount={formatEuros(courantStats.totalCalled)}
        courantRate={courantStats.recoveryRate}
        travauxAmount={formatEuros(travauxStats.totalCalled)}
        travauxRate={travauxStats.recoveryRate}
      />

      {activeTab === 'all' && (
        <TabVueGlobale groupedCalls={groupedCalls} />
      )}

      {activeTab === 'courant' && (
        <TabBudgetCourant
          stats={courantStats}
          trimesterCards={trimesterCards}
          impayesCount={impayesCount}
        />
      )}

      {activeTab === 'travaux' && (
        <TabTravaux
          stats={travauxStats}
          projects={travauxProjects}
        />
      )}

      <CreateCallWizard
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        selectedPeriod={selectedPeriod}
        onSuccess={() => { refreshCalls(); }}
        budgets={wizardBudgets}
      />
    </div>
  );
}

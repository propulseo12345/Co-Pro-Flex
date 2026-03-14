'use client';

import { useAppelsFondsPage } from '@/features/finance/appels-fonds/hooks';
import {
  AppelsFondsHeader,
  AppelsFondsTabs,
  TabVueGlobale,
  TabBudgetCourant,
  TabTravaux,
} from '@/features/finance/appels-fonds/components';
import { formatEuros } from '@/features/finance/appels-fonds/utils';
import styles from './appels-fonds.module.css';

export default function AppelsFondsPage() {
  const {
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
  } = useAppelsFondsPage();

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

  return (
    <div className={styles.container}>
      <AppelsFondsHeader
        periods={periods}
        selectedPeriod={selectedPeriod}
        onSelectPeriod={selectPeriod}
        onGenerate={() => {/* TODO */}}
        onExport={() => {/* TODO */}}
      />

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
        <TabVueGlobale
          globalStats={globalStats}
          courantStats={courantStats}
          travauxStats={travauxStats}
          impayesCount={impayesCount}
        />
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
    </div>
  );
}

'use client';

import {
  useDashboardMainPage,
  DashboardLoadingState,
  DashboardErrorState,
  DashboardEmptyState,
  DashboardTopBar,
  BentoTresorerie,
  BentoAG,
  BentoBudget,
  BentoODS,
  BentoPriorites,
  BentoActivite,
} from '@/features/dashboard/main';
import { WorksToSettleBanner } from './WorksToSettleBanner';
import styles from './dashboard.module.css';

export default function DashboardPage() {
  const {
    data,
    isLoading,
    isRefreshing,
    error,
    isEmpty,
    refresh,
    businessYear,
    coproName,
  } = useDashboardMainPage();

  if (isLoading) {
    return <DashboardLoadingState />;
  }

  if (error) {
    return <DashboardErrorState error={error} onRetry={refresh} />;
  }

  if (isEmpty || !data) {
    return (
      <DashboardEmptyState
        businessYear={businessYear}
        isRefreshing={isRefreshing}
        onRefresh={refresh}
      />
    );
  }

  const { kpis } = data;

  return (
    <div className={styles.container}>
      <DashboardTopBar
        coproName={coproName}
        businessYear={businessYear}
        isRefreshing={isRefreshing}
        onRefresh={refresh}
      />

      <WorksToSettleBanner />

      <div className={styles.bento}>
        <BentoTresorerie
          balance={kpis.current_balance}
          compteCourant={kpis.tresorerie_courante ?? kpis.current_balance}
          fondsTravaux={kpis.tresorerie_travaux ?? 0}
        />

        <BentoAG
          nextAgDate={kpis.next_ag_date}
          nextAgId={kpis.next_ag_id}
        />

        <BentoBudget
          budgetPct={kpis.budget_pct}
          budgetVote={kpis.budget_vote}
          budgetRealise={kpis.budget_realise}
        />

        <BentoODS
          urgents={kpis.ods_urgents ?? 0}
          enCours={kpis.ods_en_cours ?? 0}
          programmes={kpis.ods_programmes ?? 0}
          urgentNames={kpis.ods_urgent_names}
          enCoursNames={kpis.ods_en_cours_names}
          programmesNames={kpis.ods_programmes_names}
        />

        <BentoPriorites
          todos={data.displayedTodos}
          hasTodos={data.hasTodos}
          hasMoreTodos={data.hasMoreTodos}
          todosCount={data.todosCount}
        />

        <BentoActivite
          activities={data.displayedActivities}
          hasActivities={data.hasActivities}
        />
      </div>
    </div>
  );
}

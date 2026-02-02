'use client';

import {
  useDashboardMainPage,
  DashboardHeader,
  DashboardLoadingState,
  DashboardErrorState,
  DashboardEmptyState,
  KpiCards,
  PrioritiesSection,
  ActivitySection,
  QuickActionsSection,
} from '@/features/dashboard/main';
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
    quickActions,
  } = useDashboardMainPage();

  // Loading state
  if (isLoading) {
    return <DashboardLoadingState />;
  }

  // Error state
  if (error) {
    return <DashboardErrorState error={error} onRetry={refresh} />;
  }

  // Empty state
  if (isEmpty || !data) {
    return (
      <DashboardEmptyState
        businessYear={businessYear}
        isRefreshing={isRefreshing}
        onRefresh={refresh}
      >
        <QuickActionsSection quickActions={quickActions} />
      </DashboardEmptyState>
    );
  }

  // Normal render with data
  return (
    <div className={styles.container}>
      <DashboardHeader
        businessYear={businessYear}
        isRefreshing={isRefreshing}
        showDate={true}
        onRefresh={refresh}
      />

      <KpiCards kpis={data.kpis} />

      <div className={styles.mainGrid}>
        <PrioritiesSection
          todos={data.displayedTodos}
          hasTodos={data.hasTodos}
          hasMoreTodos={data.hasMoreTodos}
          todosCount={data.todosCount}
        />
        <ActivitySection
          activities={data.displayedActivities}
          hasActivities={data.hasActivities}
        />
      </div>

      <QuickActionsSection quickActions={quickActions} />
    </div>
  );
}

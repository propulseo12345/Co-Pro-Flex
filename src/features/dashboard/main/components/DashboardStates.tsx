'use client';

import { RefreshCw, Inbox, AlertCircle } from 'lucide-react';
import { MetricsSkeleton, PrioritiesSkeleton, ActivitySkeleton } from './DashboardSkeletons';
import styles from '@/app/(dashboard)/dashboard/dashboard.module.css';

// ============================================================================
// Loading State
// ============================================================================

export function DashboardLoadingState() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Tableau de bord</h1>
        <p className={styles.subtitle}>Chargement...</p>
      </header>
      <MetricsSkeleton />
      <div className={styles.mainGrid}>
        <section className={styles.prioritiesSection}>
          <h2 className={styles.sectionTitle}>À faire maintenant</h2>
          <PrioritiesSkeleton />
        </section>
        <section className={styles.activitySection}>
          <h2 className={styles.sectionTitle}>Activité récente</h2>
          <ActivitySkeleton />
        </section>
      </div>
    </div>
  );
}

// ============================================================================
// Error State
// ============================================================================

interface DashboardErrorStateProps {
  error: string;
  onRetry: () => void;
}

export function DashboardErrorState({ error, onRetry }: DashboardErrorStateProps) {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Tableau de bord</h1>
      </header>
      <div className={styles.errorState}>
        <AlertCircle size={48} className={styles.errorIcon} />
        <p className={styles.errorText}>Erreur lors du chargement : {error}</p>
        <button onClick={onRetry} className={styles.retryBtn}>
          Réessayer
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Empty State
// ============================================================================

interface DashboardEmptyStateProps {
  businessYear: number;
  isRefreshing: boolean;
  onRefresh: () => void;
  children: React.ReactNode;
}

export function DashboardEmptyState({
  businessYear,
  isRefreshing,
  onRefresh,
  children,
}: DashboardEmptyStateProps) {
  return (
    <div className={styles.container}>
      <header className={styles.headerActions}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Tableau de bord</h1>
          <p className={styles.subtitle}>Exercice {businessYear}</p>
        </div>
        <button onClick={onRefresh} disabled={isRefreshing} className={styles.refreshBtn}>
          <RefreshCw size={16} className={isRefreshing ? styles.spinning : ''} />
          Actualiser
        </button>
      </header>
      <div className={styles.emptyState}>
        <Inbox size={48} className={styles.emptyIcon} />
        <h2 className={styles.emptyTitle}>Bienvenue sur CoProFlex</h2>
        <p className={styles.emptySubtitle}>
          Commencez par créer une AG, un appel de fonds ou importer vos données.
        </p>
      </div>
      {children}
    </div>
  );
}

'use client';

import { RefreshCw, Inbox, AlertCircle } from 'lucide-react';
import styles from '@/app/(dashboard)/dashboard/dashboard.module.css';

// ── Loading State ──
export function DashboardLoadingState() {
  return (
    <div className={styles.container}>
      <div className={`${styles.skeleton} ${styles.skeletonTopbar}`} />
      <div className={styles.bento}>
        <div className={`${styles.skeleton} ${styles.skeletonCard} ${styles.span2}`} />
        <div className={`${styles.skeleton} ${styles.skeletonCard}`} />
        <div className={`${styles.skeleton} ${styles.skeletonCard}`} />
        <div className={`${styles.skeleton} ${styles.skeletonCard} ${styles.skeletonCardTall} ${styles.span2}`} />
        <div className={`${styles.skeleton} ${styles.skeletonCard} ${styles.skeletonCardTall} ${styles.span2}`} />
        <div className={`${styles.skeleton} ${styles.skeletonCard} ${styles.skeletonCardTall} ${styles.span2}`} />
      </div>
    </div>
  );
}

// ── Error State ──
interface DashboardErrorStateProps {
  error: string;
  onRetry: () => void;
}

export function DashboardErrorState({ error, onRetry }: DashboardErrorStateProps) {
  return (
    <div className={styles.container}>
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

// ── Empty State ──
interface DashboardEmptyStateProps {
  businessYear: number;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export function DashboardEmptyState({
  businessYear,
  isRefreshing,
  onRefresh,
}: DashboardEmptyStateProps) {
  return (
    <div className={styles.container}>
      <div className={styles.topbar}>
        <div>
          <div className={styles.topbarTitle}>Dashboard</div>
          <div className={styles.topbarSub}>Exercice {businessYear}</div>
        </div>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className={`${styles.btn} ${styles.btnPill} ${styles.btnGhost}`}
        >
          <RefreshCw size={14} className={isRefreshing ? styles.spinning : ''} />
        </button>
      </div>
      <div className={styles.emptyState}>
        <Inbox size={48} className={styles.emptyIcon} />
        <h2 className={styles.emptyTitle}>Bienvenue sur CoProFlex</h2>
        <p className={styles.emptySubtitle}>
          Commencez par créer une AG, un appel de fonds ou importer vos données.
        </p>
      </div>
    </div>
  );
}

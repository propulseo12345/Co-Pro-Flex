'use client';

import { ReactNode } from 'react';
import { Loader2, AlertCircle, Inbox, RefreshCw } from 'lucide-react';
import styles from './DataState.module.css';

export interface DataStateProps {
  isLoading?: boolean;
  isEmpty?: boolean;
  error?: string | null;
  children: ReactNode;
  loadingText?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: ReactNode;
  emptyAction?: ReactNode;
  errorTitle?: string;
  onRetry?: () => void;
  className?: string;
}

export function DataState({
  isLoading = false,
  isEmpty = false,
  error = null,
  children,
  loadingText = 'Chargement...',
  emptyTitle = 'Aucune donnée',
  emptyDescription = 'Aucun élément à afficher pour le moment.',
  emptyIcon,
  emptyAction,
  errorTitle = 'Une erreur est survenue',
  onRetry,
  className = '',
}: DataStateProps) {
  if (isLoading) {
    return (
      <div className={`${styles.state} ${styles.loading} ${className}`}>
        <Loader2 size={32} className={styles.spinner} />
        <p className={styles.text}>{loadingText}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${styles.state} ${styles.error} ${className}`}>
        <div className={styles.iconWrapper}>
          <AlertCircle size={32} className={styles.errorIcon} />
        </div>
        <h3 className={styles.title}>{errorTitle}</h3>
        <p className={styles.description}>{error}</p>
        {onRetry && (
          <button type="button" className={styles.retryButton} onClick={onRetry}>
            <RefreshCw size={16} />
            Réessayer
          </button>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className={`${styles.state} ${styles.empty} ${className}`}>
        <div className={styles.iconWrapper}>
          {emptyIcon || <Inbox size={48} className={styles.emptyIcon} />}
        </div>
        <h3 className={styles.title}>{emptyTitle}</h3>
        <p className={styles.description}>{emptyDescription}</p>
        {emptyAction && <div className={styles.action}>{emptyAction}</div>}
      </div>
    );
  }

  return <>{children}</>;
}

export interface LoadingSkeletonProps {
  rows?: number;
  className?: string;
}

export function LoadingSkeleton({ rows = 5, className = '' }: LoadingSkeletonProps) {
  return (
    <div className={`${styles.skeleton} ${className}`}>
      {Array.from({ length: rows }).map((_, index) => (
        // Skeleton de chargement : lignes purement décoratives sans donnée ni clé naturelle
        // eslint-disable-next-line react/no-array-index-key
        <div key={index} className={styles.skeletonRow}>
          <div className={styles.skeletonCell} style={{ width: '30%' }} />
          <div className={styles.skeletonCell} style={{ width: '50%' }} />
          <div className={styles.skeletonCell} style={{ width: '20%' }} />
        </div>
      ))}
    </div>
  );
}

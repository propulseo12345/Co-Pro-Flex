'use client';

import { AlertTriangle, RefreshCw, Inbox } from 'lucide-react';
import styles from './DataState.module.css';

// ============================================================================
// LOADING STATE
// ============================================================================

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Chargement...' }: LoadingStateProps) {
  return (
    <div className={styles.container}>
      <div className={styles.spinner} />
      <p className={styles.message}>{message}</p>
    </div>
  );
}

// ============================================================================
// ERROR STATE
// ============================================================================

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className={styles.container}>
      <div className={styles.iconError}>
        <AlertTriangle size={48} />
      </div>
      <h3 className={styles.title}>Erreur</h3>
      <p className={styles.message}>{message}</p>
      {onRetry && (
        <button className={styles.retryButton} onClick={onRetry}>
          <RefreshCw size={16} />
          Réessayer
        </button>
      )}
    </div>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  title = 'Aucune donnée',
  message = 'Aucun élément à afficher pour le moment.',
  icon,
  action,
}: EmptyStateProps) {
  return (
    <div className={styles.container}>
      <div className={styles.iconEmpty}>
        {icon || <Inbox size={48} />}
      </div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.message}>{message}</p>
      {action && (
        <button className={styles.actionButton} onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}

// ============================================================================
// NO COPRO SELECTED
// ============================================================================

export function NoCoproSelected() {
  return (
    <div className={styles.container}>
      <div className={styles.iconWarning}>
        <AlertTriangle size={48} />
      </div>
      <h3 className={styles.title}>Aucune copropriété sélectionnée</h3>
      <p className={styles.message}>
        Veuillez sélectionner une copropriété pour accéder à cette fonctionnalité.
      </p>
    </div>
  );
}

// ============================================================================
// INLINE LOADING
// ============================================================================

interface InlineLoadingProps {
  size?: 'sm' | 'md';
}

export function InlineLoading({ size = 'md' }: InlineLoadingProps) {
  return (
    <span className={`${styles.inlineSpinner} ${styles[`spinner-${size}`]}`} />
  );
}

// ============================================================================
// TOAST (Simple notification)
// ============================================================================

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose?: () => void;
}

export function Toast({ message, type = 'info', onClose }: ToastProps) {
  return (
    <div className={`${styles.toast} ${styles[`toast-${type}`]}`}>
      <span>{message}</span>
      {onClose && (
        <button className={styles.toastClose} onClick={onClose}>
          &times;
        </button>
      )}
    </div>
  );
}

// ============================================================================
// DATA STATE (Wrapper for loading/error/empty states)
// ============================================================================

interface DataStateProps {
  isLoading: boolean;
  error?: string | null;
  isEmpty?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  loadingMessage?: string;
  onRetry?: () => void;
  children: React.ReactNode;
}

export function DataState({
  isLoading,
  error,
  isEmpty = false,
  emptyMessage = 'Aucun élément à afficher',
  emptyIcon,
  loadingMessage = 'Chargement...',
  onRetry,
  children,
}: DataStateProps) {
  if (isLoading) {
    return <LoadingState message={loadingMessage} />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }

  if (isEmpty) {
    return (
      <EmptyState
        message={emptyMessage}
        icon={emptyIcon}
      />
    );
  }

  return <>{children}</>;
}

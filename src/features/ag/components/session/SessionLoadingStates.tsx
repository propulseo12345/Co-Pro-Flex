'use client';

import { Loader2, AlertCircle, RefreshCw, Info } from 'lucide-react';
import { StepUnavailable } from '@/components/features/ag';
import type { SessionPersistenceError, RestoreResult } from '@/hooks/modules/useAGSessionPersistence';
import styles from '../../../../app/(dashboard)/ag/[id]/session/session.module.css';

interface LoadingStateProps {
  message?: string;
}

export function SessionLoading({ message = 'Vérification des prérequis...' }: LoadingStateProps) {
  return (
    <div className="container">
      <div className={styles.loadingContainer}>
        <Loader2 className={styles.spinner} size={32} />
        <p>{message}</p>
      </div>
    </div>
  );
}

interface RedirectingStateProps {
  blockReason: string | null;
  redirectUrl: string | null;
  agId: string;
}

export function SessionRedirecting({ blockReason, redirectUrl, agId }: RedirectingStateProps) {
  return (
    <div className="container">
      <StepUnavailable
        reason={blockReason || 'Prérequis non satisfaits'}
        redirectUrl={redirectUrl || undefined}
        redirectLabel="Accéder à l'ordre du jour"
        backUrl={`/ag/${agId}/preparation`}
        backLabel="Retour"
        isRedirecting
      />
    </div>
  );
}

interface BlockedStateProps {
  blockReason: string | null;
  redirectUrl: string | null;
  agId: string;
}

export function SessionBlocked({ blockReason, redirectUrl, agId }: BlockedStateProps) {
  return (
    <div className="container">
      <StepUnavailable
        reason={blockReason || 'Cette étape n\'est pas accessible.'}
        redirectUrl={redirectUrl || `/ag/${agId}/agenda`}
        redirectLabel="Accéder à l'ordre du jour"
        backUrl={`/ag/${agId}/preparation`}
        backLabel="Retour"
      />
    </div>
  );
}

interface ErrorStateProps {
  error: SessionPersistenceError;
  onRetry: () => void;
  onStartNew: () => void;
}

export function SessionError({ error, onRetry, onStartNew }: ErrorStateProps) {
  return (
    <div className="container">
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>
          <AlertCircle size={48} />
        </div>
        <h2 className={styles.errorTitle}>Impossible de restaurer la session</h2>
        <p className={styles.errorMessage}>{error.message}</p>
        <p className={styles.errorCode}>Code erreur : {error.code}</p>
        <div className={styles.errorActions}>
          {error.retryable && (
            <button onClick={onRetry} className="btn btn-primary">
              <RefreshCw size={16} />
              Réessayer
            </button>
          )}
          <button onClick={onStartNew} className="btn btn-secondary">
            Démarrer une nouvelle session
          </button>
        </div>
      </div>
    </div>
  );
}

interface RestoredBannerProps {
  restoreResult: RestoreResult;
}

export function SessionRestoredBanner({ restoreResult }: RestoredBannerProps) {
  if (!restoreResult.lastSaveDate) return null;

  return (
    <div className={styles.restoredBanner}>
      <Info size={16} aria-hidden="true" />
      <span>
        Session restaurée depuis la sauvegarde du{' '}
        {new Date(restoreResult.lastSaveDate).toLocaleString('fr-FR')}
      </span>
      {restoreResult.warnings.length > 0 && (
        <span className={styles.restoredWarning}>
          ({restoreResult.warnings.join(', ')})
        </span>
      )}
    </div>
  );
}

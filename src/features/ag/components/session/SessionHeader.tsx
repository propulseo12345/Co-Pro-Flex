'use client';

import { ArrowLeft, WifiOff, AlertCircle, CheckCircle } from 'lucide-react';
import type { SessionPersistenceStatus } from '@/hooks/modules/useAGSessionPersistence';
import styles from '../../styles/session.module.css';

interface SessionHeaderProps {
  onBack: () => void;
  isOnline: boolean;
  persistenceStatus: SessionPersistenceStatus;
  hasUnsavedChanges: boolean;
  lastSaveDate: Date | null;
}

export function SessionHeader({
  onBack,
  isOnline,
  persistenceStatus,
  hasUnsavedChanges,
  lastSaveDate,
}: SessionHeaderProps) {
  return (
    <div className={styles.headerCompact}>
      <div className={styles.headerLeft}>
        <button onClick={onBack} className={styles.backButtonCompact}>
          <ArrowLeft size={16} aria-hidden="true" />
          Retour
        </button>
        <div className={styles.headerTitleGroup}>
          <h1 className={styles.titleCompact}>Session en direct</h1>
          <span className={styles.subtitleCompact}>Enregistrez les votes en temps réel</span>
        </div>
      </div>
      <div className={styles.saveIndicators}>
        {!isOnline && (
          <span className={styles.offlineIndicator}>
            <WifiOff size={14} aria-hidden="true" />
            Hors-ligne
          </span>
        )}
        {persistenceStatus === 'degraded' && isOnline && (
          <span className={styles.degradedIndicator}>
            <AlertCircle size={14} aria-hidden="true" />
            Mode dégradé
          </span>
        )}
        {hasUnsavedChanges && (
          <span className={styles.unsavedIndicator}>
            <AlertCircle size={14} aria-hidden="true" />
            Modifications non enregistrées
          </span>
        )}
        {lastSaveDate && !hasUnsavedChanges && (
          <span className={styles.lastSaveIndicator}>
            <CheckCircle size={14} aria-hidden="true" />
            Dernière sauvegarde : {lastSaveDate.toLocaleTimeString('fr-FR')}
          </span>
        )}
      </div>
    </div>
  );
}

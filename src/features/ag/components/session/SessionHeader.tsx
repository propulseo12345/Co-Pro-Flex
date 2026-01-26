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
    <div className={styles.header}>
      <button onClick={onBack} className={styles.backButton}>
        <ArrowLeft size={20} aria-hidden="true" />
        Retour
      </button>
      <div className={styles.headerContent}>
        <h1 className={styles.title}>Session en direct</h1>
        <p className={styles.subtitle}>Enregistrez les votes en temps réel</p>
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
    </div>
  );
}

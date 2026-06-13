'use client';

import { AlertTriangle, X, XCircle, Clock } from 'lucide-react';
import clsx from 'clsx';
import styles from '../../../../../app/(dashboard)/documents/ged/ged.module.css';

interface VersioningAlertsProps {
  obsoleteCount: number;
  overdueCount: number;
  onClose: () => void;
  onViewObsolete: () => void;
  onViewOverdue: () => void;
}

export function VersioningAlerts({
  obsoleteCount,
  overdueCount,
  onClose,
  onViewObsolete,
  onViewOverdue,
}: VersioningAlertsProps) {
  if (obsoleteCount === 0 && overdueCount === 0) return null;

  return (
    <div className={styles.versioningAlertsCard}>
      <div className={styles.versioningAlertsHeader}>
        <div className={styles.versioningAlertsTitle}>
          <AlertTriangle size={20} />
          <span>Documents nécessitant une attention</span>
        </div>
        <button
          className={styles.versioningAlertsClose}
          onClick={onClose}
          aria-label="Fermer les alertes"
        >
          <X size={18} />
        </button>
      </div>

      <div className={styles.versioningAlertsList}>
        {obsoleteCount > 0 && (
          <div className={styles.versioningAlertItem}>
            <div className={clsx(styles.versioningAlertIcon, styles.versioningAlertDanger)}>
              <XCircle size={16} />
            </div>
            <div className={styles.versioningAlertContent}>
              <span className={styles.versioningAlertLabel}>
                {obsoleteCount} document{obsoleteCount > 1 ? 's' : ''} obsolète
                {obsoleteCount > 1 ? 's' : ''}
              </span>
              <span className={styles.versioningAlertDesc}>
                Ces documents réglementaires n'ont pas été mis à jour depuis plus de 5 ans
              </span>
            </div>
            <button className={styles.versioningAlertAction} onClick={onViewObsolete}>
              Voir
            </button>
          </div>
        )}

        {overdueCount > 0 && (
          <div className={styles.versioningAlertItem}>
            <div className={clsx(styles.versioningAlertIcon, styles.versioningAlertWarning)}>
              <Clock size={16} />
            </div>
            <div className={styles.versioningAlertContent}>
              <span className={styles.versioningAlertLabel}>
                {overdueCount} document{overdueCount > 1 ? 's' : ''} en retard de révision
              </span>
              <span className={styles.versioningAlertDesc}>
                La date de révision de ces documents est dépassée
              </span>
            </div>
            <button className={styles.versioningAlertAction} onClick={onViewOverdue}>
              Voir
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

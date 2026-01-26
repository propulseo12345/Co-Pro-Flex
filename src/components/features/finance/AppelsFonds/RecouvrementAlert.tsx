'use client';

import { AlertTriangle, TrendingDown, Mail, FileText, Calendar, Scale, ChevronRight, X } from 'lucide-react';
import { useState } from 'react';
import { getRecouvrementAlerts, ACTIONS_RECOUVREMENT, type ActionSuggeree } from '@/lib/utils/alerts';
import styles from './appels-fonds.module.css';

interface RecouvrementAlertProps {
  tauxRecouvrement: number;
  montantRestant: number;
  onActionClick?: (action: ActionSuggeree) => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Mail,
  FileText,
  AlertTriangle,
  Calendar,
  Scale
};

export function RecouvrementAlert({ tauxRecouvrement, montantRestant, onActionClick }: RecouvrementAlertProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [showAllActions, setShowAllActions] = useState(false);

  const alerts = getRecouvrementAlerts();
  const alert = alerts[0];

  if (!alert || isDismissed) {
    return null;
  }

  const isCritique = alert.type === 'RECOUVREMENT_CRITIQUE';
  const actionsSuggerees = isCritique
    ? ACTIONS_RECOUVREMENT.filter(a => a.priorite === 'haute')
    : ACTIONS_RECOUVREMENT.filter(a => a.priorite !== 'basse');

  const displayedActions = showAllActions ? ACTIONS_RECOUVREMENT : actionsSuggerees;

  return (
    <div className={`${styles.recouvrementAlert} ${isCritique ? styles.recouvrementAlertCritique : styles.recouvrementAlertWarning}`}>
      <div className={styles.recouvrementAlertHeader}>
        <div className={styles.recouvrementAlertIcon}>
          {isCritique ? <AlertTriangle size={24} /> : <TrendingDown size={24} />}
        </div>
        <div className={styles.recouvrementAlertContent}>
          <h3 className={styles.recouvrementAlertTitle}>{alert.title}</h3>
          <p className={styles.recouvrementAlertMessage}>{alert.message}</p>
          <div className={styles.recouvrementAlertStats}>
            <span className={styles.recouvrementAlertStat}>
              <strong>{tauxRecouvrement.toFixed(1)}%</strong> encaissé
            </span>
            <span className={styles.recouvrementAlertStatSeparator}>|</span>
            <span className={styles.recouvrementAlertStat}>
              <strong>{montantRestant.toLocaleString('fr-FR')} €</strong> à recouvrer
            </span>
          </div>
        </div>
        <button
          className={styles.recouvrementAlertClose}
          onClick={() => setIsDismissed(true)}
          aria-label="Fermer l'alerte"
        >
          <X size={18} />
        </button>
      </div>

      <div className={styles.recouvrementAlertActions}>
        <h4 className={styles.recouvrementAlertActionsTitle}>
          Actions recommandées
        </h4>
        <div className={styles.recouvrementAlertActionsList}>
          {displayedActions.map((action) => {
            const IconComponent = ICON_MAP[action.icon] || FileText;
            return (
              <button
                key={action.id}
                className={`${styles.recouvrementAlertAction} ${
                  action.priorite === 'haute' ? styles.recouvrementAlertActionHigh :
                  action.priorite === 'moyenne' ? styles.recouvrementAlertActionMedium :
                  styles.recouvrementAlertActionLow
                }`}
                onClick={() => onActionClick?.(action)}
              >
                <div className={styles.recouvrementAlertActionIcon}>
                  <IconComponent size={16} />
                </div>
                <div className={styles.recouvrementAlertActionContent}>
                  <span className={styles.recouvrementAlertActionLabel}>{action.label}</span>
                  <span className={styles.recouvrementAlertActionDelai}>{action.delai}</span>
                </div>
                <ChevronRight size={16} className={styles.recouvrementAlertActionChevron} />
              </button>
            );
          })}
        </div>
        {!showAllActions && ACTIONS_RECOUVREMENT.length > actionsSuggerees.length && (
          <button
            className={styles.recouvrementAlertShowMore}
            onClick={() => setShowAllActions(true)}
          >
            Voir toutes les actions ({ACTIONS_RECOUVREMENT.length})
          </button>
        )}
      </div>
    </div>
  );
}

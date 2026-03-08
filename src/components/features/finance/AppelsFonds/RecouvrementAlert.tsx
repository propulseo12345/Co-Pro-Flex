'use client';

import { AlertTriangle, TrendingDown, X } from 'lucide-react';
import { useState } from 'react';
import { getRecouvrementAlerts } from '@/lib/utils/alerts';
import styles from './appels-fonds.module.css';

interface RecouvrementAlertProps {
  tauxRecouvrement: number;
  montantRestant: number;
}

export function RecouvrementAlert({ tauxRecouvrement, montantRestant }: RecouvrementAlertProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  const alerts = getRecouvrementAlerts();
  const alert = alerts[0];

  if (!alert || isDismissed) {
    return null;
  }

  const isCritique = alert.type === 'RECOUVREMENT_CRITIQUE';

  return (
    <div className={`${styles.recouvrementAlert} ${isCritique ? styles.recouvrementAlertCritique : styles.recouvrementAlertWarning}`}>
      <div className={styles.recouvrementAlertIcon}>
        {isCritique ? <AlertTriangle size={18} /> : <TrendingDown size={18} />}
      </div>
      <span className={styles.recouvrementAlertTitle}>{alert.title}</span>
      <span className={styles.recouvrementAlertSeparator} />
      <span className={styles.recouvrementAlertStat}>
        <strong>{tauxRecouvrement.toFixed(1)}%</strong> encaissé
      </span>
      <span className={styles.recouvrementAlertSeparator} />
      <span className={styles.recouvrementAlertStat}>
        <strong>{montantRestant.toLocaleString('fr-FR')} €</strong> à recouvrer
      </span>
      <button
        className={styles.recouvrementAlertClose}
        onClick={() => setIsDismissed(true)}
        aria-label="Fermer l'alerte"
      >
        <X size={16} />
      </button>
    </div>
  );
}

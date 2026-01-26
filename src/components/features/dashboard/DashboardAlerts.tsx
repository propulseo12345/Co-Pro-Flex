'use client';

import Link from 'next/link';
import { AlertTriangle, ChevronRight, X } from 'lucide-react';
import type { Alert } from '@/lib/utils/alerts';
import styles from '../../../app/(dashboard)/dashboard/dashboard.module.css';

interface DashboardAlertsProps {
  alerts: Alert[];
  onDismiss: (alertId: string) => void;
}

export function DashboardAlerts({ alerts, onDismiss }: DashboardAlertsProps) {
  if (alerts.length === 0) return null;

  return (
    <div className={styles.alertsSection}>
      {alerts.map((alert) => (
        <div key={alert.id} className={`${styles.alertBanner} ${alert.severity === 'error' ? styles.alertBannerError : styles.alertBannerWarning}`}>
          <div className={styles.alertBannerIcon}><AlertTriangle size={24} /></div>
          <div className={styles.alertBannerContent}>
            <h4 className={styles.alertBannerTitle}>{alert.title}</h4>
            <p className={styles.alertBannerMessage}>{alert.message}</p>
            {alert.data?.actionsSuggerees && (
              <div className={styles.alertBannerActions}>
                {alert.data.actionsSuggerees.slice(0, 3).map((action) => (
                  <Link key={action.id} href={alert.link} className={styles.alertBannerActionBtn}>
                    {action.label} ({action.delai})<ChevronRight size={14} />
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className={styles.alertBannerRight}>
            <Link href={alert.link} className={styles.alertBannerLink}>Voir les détails<ChevronRight size={16} /></Link>
            <button className={styles.alertBannerClose} onClick={() => onDismiss(alert.id)} aria-label="Fermer l'alerte"><X size={18} /></button>
          </div>
        </div>
      ))}
    </div>
  );
}

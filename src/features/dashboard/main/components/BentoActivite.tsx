'use client';

import { formatRelativeTime, type DashboardActivity } from '../hooks/useDashboardMainPage';
import styles from '@/app/(dashboard)/dashboard/dashboard.module.css';

interface BentoActiviteProps {
  activities: DashboardActivity[];
  hasActivities: boolean;
}

function getActivityDotClass(activityType: string): string {
  if (activityType.includes('payment') || activityType.includes('paiement')) return styles.dotGreen;
  if (activityType.includes('alert') || activityType.includes('relance')) return styles.dotRed;
  if (activityType.includes('facture') || activityType.includes('document')) return styles.dotAmber;
  return styles.dotBlue;
}

export function BentoActivite({ activities, hasActivities }: BentoActiviteProps) {
  return (
    <div className={`${styles.card} ${styles.span2}`}>
      <div className={styles.activityHeader}>
        <div className={styles.label} style={{ marginBottom: 0 }}>Activité récente</div>
        {/* TODO go-live: lien "Tout voir" (/activity) masqué — page inexistante, à rebrancher quand la vue activité existera */}
      </div>
      {hasActivities ? (
        <div className={styles.activityItems}>
          {activities.map((activity, index) => (
            // Liste d'activités dérivée sans identifiant stable (agrégat) → index combiné au type
            // eslint-disable-next-line react/no-array-index-key
            <div key={`${activity.activity_type}-${index}`} className={styles.activityItem}>
              <span className={`${styles.dot} ${getActivityDotClass(activity.activity_type)}`} />
              <span className={styles.activityText}>{activity.label}</span>
              <span className={styles.activityTime}>{formatRelativeTime(activity.event_date)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '14px' }}>
          Aucune activité récente
        </div>
      )}
    </div>
  );
}

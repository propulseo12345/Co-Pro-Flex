'use client';

import Link from 'next/link';
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
        <Link href="/activity" className={styles.activityLink}>
          Tout voir →
        </Link>
      </div>
      {hasActivities ? (
        <div className={styles.activityItems}>
          {activities.map((activity, index) => (
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

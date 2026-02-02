'use client';

import { formatRelativeTime, type DashboardActivity } from '../hooks/useDashboardMainPage';
import styles from '@/app/(dashboard)/dashboard/dashboard.module.css';

interface ActivitySectionProps {
  activities: DashboardActivity[];
  hasActivities: boolean;
}

export function ActivitySection({ activities, hasActivities }: ActivitySectionProps) {
  return (
    <section className={styles.activitySection}>
      <h2 className={styles.sectionTitle}>Activité récente</h2>

      {hasActivities ? (
        <ul className={styles.activityList}>
          {activities.map((activity: DashboardActivity, index: number) => (
            <li key={`${activity.activity_type}-${index}`} className={styles.activityItem}>
              <span className={styles.activityAction}>{activity.label}</span>
              <span className={styles.activityTime}>{formatRelativeTime(activity.event_date)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.activityEmpty}>
          <p>Aucune activité récente</p>
        </div>
      )}
    </section>
  );
}

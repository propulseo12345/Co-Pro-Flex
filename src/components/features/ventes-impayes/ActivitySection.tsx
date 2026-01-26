'use client';

import Link from 'next/link';
import { Clock, ArrowRight, Home, AlertTriangle, CheckCircle2 } from 'lucide-react';
import styles from '../../../app/(dashboard)/ventes-impayes/ventes-impayes.module.css';

interface Activity {
  id: number;
  type: string;
  title: string;
  description: string;
  date: string;
  color: string;
  link: string;
}

const ICON_MAP: Record<string, typeof Home> = {
  vente: Home,
  impaye: AlertTriangle,
  default: CheckCircle2,
};

interface ActivitySectionProps {
  activities: Activity[];
}

export function ActivitySection({ activities }: ActivitySectionProps) {
  return (
    <div className={styles.activitySection}>
      <h2 className={styles.sectionTitle}>Activité récente</h2>
      <div className={styles.activityList}>
        {activities.map((activity) => {
          const Icon = activity.type === 'vente' ? Home : activity.type === 'impaye' ? AlertTriangle : CheckCircle2;
          return (
            <Link
              key={activity.id}
              href={activity.link}
              className={styles.activityItem}
              aria-hidden="true"
            >
              <div
                className={styles.activityIcon}
                style={{ background: `${activity.color}20` }}
              >
                <Icon size={18} style={{ color: activity.color }} aria-hidden="true" />
              </div>
              <div className={styles.activityContent}>
                <h4 className={styles.activityTitle}>{activity.title}</h4>
                <p className={styles.activityDescription}>{activity.description}</p>
                <span className={styles.activityTime}>
                  <Clock size={12} aria-hidden="true" />
                  {new Date(activity.date).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              <ArrowRight size={16} className={styles.activityArrow} aria-hidden="true" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

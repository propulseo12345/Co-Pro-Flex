'use client';

import { Clock } from 'lucide-react';
import styles from '@/app/(dashboard)/ventes-impayes/ventes/[id]/detail-vente.module.css';

interface TimelineStep {
  label: string;
  status: string | undefined;
  completed: boolean;
  date: string | null | undefined;
}

interface MutationTimelineProps {
  steps: TimelineStep[];
  currentStatus: string | undefined;
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function MutationTimeline({ steps, currentStatus }: MutationTimelineProps) {
  return (
    <div className={styles.sidebarCard}>
      <h3 className={styles.cardTitle}>
        <Clock size={16} />
        Workflow
      </h3>
      <div className={styles.timeline}>
        {steps.map((step, idx) => (
          <div key={idx} className={styles.timelineItem}>
            <div
              className={`${styles.timelineDot} ${
                step.completed ? styles.completed : ''
              } ${
                currentStatus === step.status && step.status !== 'validated'
                  ? styles.active
                  : ''
              }`}
            />
            <div className={styles.timelineContent}>
              <span
                className={`${styles.timelineTitle} ${
                  !step.completed ? styles.pending : ''
                }`}
              >
                {step.label}
              </span>
              {step.date && (
                <span className={styles.timelineDate}>{formatDate(step.date)}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

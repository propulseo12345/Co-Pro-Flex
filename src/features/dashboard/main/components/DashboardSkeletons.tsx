'use client';

import styles from '@/app/(dashboard)/dashboard/dashboard.module.css';

export function MetricsSkeleton() {
  return (
    <section className={styles.metricsRow}>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={`${styles.metricCard} ${styles.skeleton} ${styles.skeletonMetric}`}
        />
      ))}
    </section>
  );
}

export function PrioritiesSkeleton() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <div key={i} className={`${styles.skeleton} ${styles.skeletonPriority}`} />
      ))}
    </>
  );
}

export function ActivitySkeleton() {
  return (
    <div className={styles.activityList}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className={`${styles.skeleton} ${styles.skeletonActivity}`} />
      ))}
    </div>
  );
}

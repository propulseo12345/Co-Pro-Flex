import styles from './loading.module.css';

export default function DashboardLoading() {
  return (
    <div className={styles.container}>
      <div className={styles.skeleton}>
        {/* Header skeleton */}
        <div className={styles.header}>
          <div className={styles.titleBlock} />
          <div className={styles.actionsBlock} />
        </div>

        {/* Content skeleton */}
        <div className={styles.content}>
          <div className={styles.card}>
            <div className={styles.cardHeader} />
            <div className={styles.cardBody}>
              <div className={styles.line} />
              <div className={styles.line} style={{ width: '80%' }} />
              <div className={styles.line} style={{ width: '60%' }} />
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader} />
            <div className={styles.cardBody}>
              <div className={styles.line} />
              <div className={styles.line} style={{ width: '90%' }} />
              <div className={styles.line} style={{ width: '70%' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

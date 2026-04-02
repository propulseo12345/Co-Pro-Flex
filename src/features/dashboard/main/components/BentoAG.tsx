'use client';

import Link from 'next/link';
import { formatDateFR } from '@/lib/time/period';
import styles from '@/app/(dashboard)/dashboard/dashboard.module.css';

interface BentoAGProps {
  nextAgDate: string | null;
  nextAgId: string | null;
  nextAgType?: string;
  nextAgResolutions?: number;
}

export function BentoAG({ nextAgDate, nextAgId, nextAgType, nextAgResolutions }: BentoAGProps) {
  const daysUntil = nextAgDate
    ? Math.ceil((new Date(nextAgDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const agHref = nextAgId ? `/ag/${nextAgId}` : '/ag/dashboard';

  return (
    <div className={styles.card}>
      <div className={styles.label}>Prochaine AG</div>
      {nextAgDate ? (
        <>
          <div className={styles.agDate}>{formatDateFR(nextAgDate)}</div>
          <div className={styles.agSub}>
            {nextAgType ?? 'AG ordinaire'}
            {nextAgResolutions ? ` · ${nextAgResolutions} résolutions` : ''}
          </div>
          {daysUntil !== null && daysUntil > 0 && (
            <div className={styles.agCountdown}>
              <span className={`${styles.badge} ${styles.badgeBlue}`}>
                dans {daysUntil} jour{daysUntil > 1 ? 's' : ''}
              </span>
            </div>
          )}
          <div style={{ flex: 1 }} />
          <Link href={agHref} className={`${styles.btn} ${styles.btnPrimary} ${styles.btnFull}`}>
            Préparer l&apos;AG
          </Link>
        </>
      ) : (
        <>
          <div className={styles.agDate} style={{ color: 'var(--text-secondary)' }}>Aucune prévue</div>
          <div style={{ flex: 1 }} />
          <Link href="/ag/new" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnFull}`}>
            Créer une AG
          </Link>
        </>
      )}
    </div>
  );
}

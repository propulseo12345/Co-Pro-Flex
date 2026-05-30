'use client';

import Link from 'next/link';
import { formatCurrency } from '../hooks/useDashboardMainPage';
import styles from '@/app/(dashboard)/dashboard/dashboard.module.css';

interface BentoTresorerieProps {
  balance: number;
  compteCourant: number;
  fondsTravaux: number;
}

export function BentoTresorerie({ balance, compteCourant, fondsTravaux }: BentoTresorerieProps) {
  return (
    <div className={`${styles.card} ${styles.span2}`}>
      <div className={styles.label}>Trésorerie</div>
      <div className={styles.tresorerieInner}>
        <div>
          <div className={styles.tresorerieValue}>
            {formatCurrency(balance)}
          </div>
          <div className={styles.tresorerieDetail}>
            Compte courant <span className={styles.mono}>{formatCurrency(compteCourant)}</span>
            {' · '}
            Fonds travaux <span className={styles.mono}>{formatCurrency(fondsTravaux)}</span>
          </div>
        </div>
        <div className={styles.tresorerieActions}>
          <Link href="/finance/comptabilite" className={`${styles.btn} ${styles.btnGhost}`}>
            Voir les comptes
          </Link>
          <Link href="/finance/mouvements-bancaires" className={`${styles.btn} ${styles.btnGhost}`}>
            Rapprocher
          </Link>
        </div>
      </div>
    </div>
  );
}

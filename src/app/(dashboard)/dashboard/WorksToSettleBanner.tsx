'use client';

import Link from 'next/link';
import { Layers, ChevronRight } from 'lucide-react';
import { useWorksPendingSettlement } from '@/hooks/modules/useFinanceData';
import styles from './worksBanner.module.css';

const eur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

/** Découvrabilité B4 : alerte dashboard quand des soldes travaux (12) attendent d'être apurés. */
export function WorksToSettleBanner() {
  const { data } = useWorksPendingSettlement();
  const rows = data ?? [];
  if (rows.length === 0) return null;

  const total = rows.reduce((s, r) => s + Math.abs(r.works_balance), 0);

  return (
    <Link href="/finance/operations-a-apurer" className={styles.banner}>
      <Layers size={18} className={styles.icon} />
      <span className={styles.text}>
        <strong>{rows.length}</strong>&nbsp;opération{rows.length > 1 ? 's' : ''} de travaux à apurer
        <span className={styles.sub}> — {eur(total)} en attente d&apos;affectation</span>
      </span>
      <ChevronRight size={18} className={styles.chevron} />
    </Link>
  );
}

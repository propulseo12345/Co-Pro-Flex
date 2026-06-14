'use client';

import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import type { WorksPendingSettlement } from '@/lib/finance/api';
import styles from './styles.module.css';

const eur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

function formatPeriod(start: string, end: string): string {
  const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR');
  return `${fmt(start)} → ${fmt(end)}`;
}

function ageLabel(days: number): string {
  if (days <= 0) return 'Exercice en cours';
  if (days < 365) return `${Math.round(days / 30)} mois`;
  const years = Math.floor(days / 365);
  return years === 1 ? '1 an' : `${years} ans`;
}

interface OperationsAApurerTableProps {
  rows: WorksPendingSettlement[];
  onApurer: (row: WorksPendingSettlement) => void;
}

export function OperationsAApurerTable({ rows, onApurer }: OperationsAApurerTableProps) {
  return (
    <div className={styles.card}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Exercice</th>
            <th>Ancienneté</th>
            <th>Sens</th>
            <th className={styles.right}>Solde travaux (12)</th>
            <th className={styles.right}>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const isCall = r.works_balance > 0;
            return (
              <tr key={r.period_id}>
                <td>
                  <div className={styles.exercice}>{r.period_name}</div>
                  <div className={styles.exerciceMeta}>{formatPeriod(r.period_start, r.period_end)}</div>
                </td>
                <td>{ageLabel(r.age_days)}</td>
                <td>
                  <span className={`${styles.badge} ${isCall ? styles.badgeCall : styles.badgeRefund}`}>
                    {isCall ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
                    {isCall ? 'À appeler' : 'À rembourser'}
                  </span>
                </td>
                <td className={styles.amount}>{eur(Math.abs(r.works_balance))}</td>
                <td className={styles.right}>
                  <button className={styles.actionBtn} onClick={() => onApurer(r)}>
                    Affecter aux copropriétaires
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

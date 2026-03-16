'use client';

import clsx from 'clsx';
import type { Facture } from '@/components/features/finance/Factures/types';
import { isFactureEnRetard } from '@/components/features/finance/Factures/types';
import styles from './FacturesStatusSidebar.module.css';

export type SidebarFilter = 'all' | 'overdue' | 'pending' | 'paid';

interface StatusGroup {
  id: SidebarFilter;
  label: string;
  dotColor: string;
  amountColor: string;
  count: number;
  total: number;
}

interface FacturesStatusSidebarProps {
  factures: Facture[];
  activeFilter: SidebarFilter;
  onFilterChange: (filter: SidebarFilter) => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
}

function computeGroups(factures: Facture[]): StatusGroup[] {
  const facturesOnly = factures.filter(f => f.typeDocument === 'FACTURE');

  const overdue = facturesOnly.filter(f => isFactureEnRetard(f));
  const pending = facturesOnly.filter(f => !isFactureEnRetard(f) && f.statut !== 'PAYEE');
  const paid = facturesOnly.filter(f => f.statut === 'PAYEE');

  return [
    {
      id: 'all',
      label: 'Toutes',
      dotColor: '#e2e8f0',
      amountColor: '#e2e8f0',
      count: facturesOnly.length,
      total: facturesOnly.reduce((s, f) => s + f.montant, 0),
    },
    {
      id: 'overdue',
      label: 'En retard',
      dotColor: '#ef4444',
      amountColor: '#ef4444',
      count: overdue.length,
      total: overdue.reduce((s, f) => s + f.montant, 0),
    },
    {
      id: 'pending',
      label: 'En attente',
      dotColor: '#3b82f6',
      amountColor: '#3b82f6',
      count: pending.length,
      total: pending.reduce((s, f) => s + f.montant, 0),
    },
    {
      id: 'paid',
      label: 'Payées',
      dotColor: '#22c55e',
      amountColor: '#22c55e',
      count: paid.length,
      total: paid.reduce((s, f) => s + f.montant, 0),
    },
  ];
}

export function FacturesStatusSidebar({ factures, activeFilter, onFilterChange }: FacturesStatusSidebarProps) {
  const groups = computeGroups(factures);

  return (
    <div className={styles.sidebar}>
      {groups.map(group => (
        <button
          key={group.id}
          className={clsx(styles.card, activeFilter === group.id && styles.active)}
          onClick={() => onFilterChange(group.id)}
        >
          <div className={styles.labelRow}>
            <div className={styles.dot} style={{ background: group.dotColor }} />
            <span className={styles.label}>{group.label}</span>
          </div>
          <div className={styles.statsRow}>
            <span className={styles.count}>
              {group.count} facture{group.count > 1 ? 's' : ''}
            </span>
            <span className={styles.amount} style={{ color: group.amountColor }}>
              {formatCurrency(group.total)}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

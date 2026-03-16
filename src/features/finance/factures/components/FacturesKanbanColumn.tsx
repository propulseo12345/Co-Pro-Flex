'use client';

import { FileText } from 'lucide-react';
import clsx from 'clsx';
import type { Facture } from '@/components/features/finance/Factures/types';
import type { KanbanColumn } from '../types';
import { FacturesKanbanCard } from './FacturesKanbanCard';
import styles from './FacturesKanban.module.css';

interface FacturesKanbanColumnProps {
  column: KanbanColumn;
  onCardClick: (facture: Facture) => void;
}

const TOTAL_COLOR_MAP: Record<string, string> = {
  overdue: styles.totalRed,
  pending: styles.totalBlue,
  to_pay: styles.totalAmber,
  paid: styles.totalGreen,
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
}

export function FacturesKanbanColumn({ column, onCardClick }: FacturesKanbanColumnProps) {
  return (
    <div className={styles.column}>
      <div className={styles.colHeader}>
        <div className={styles.colTitle}>
          <div className={styles.colDot} style={{ background: column.dotColor }} />
          {column.label}
          <span className={styles.colCount}>{column.factures.length}</span>
        </div>
        <div className={clsx(styles.colTotal, TOTAL_COLOR_MAP[column.id])}>
          {formatCurrency(column.total)}
        </div>
      </div>
      <div className={styles.colBody}>
        {column.factures.length === 0 ? (
          <div className={styles.empty}>
            <FileText size={20} />
            Aucune facture
          </div>
        ) : (
          column.factures.map(facture => (
            <FacturesKanbanCard
              key={facture.id}
              facture={facture}
              columnId={column.id}
              onClick={onCardClick}
            />
          ))
        )}
      </div>
    </div>
  );
}

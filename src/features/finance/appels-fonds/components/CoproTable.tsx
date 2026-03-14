'use client';

import type { CallLineDetailed } from '@/lib/finance/api';
import { StatusBadge } from './StatusBadge';
import type { BadgeVariant } from './StatusBadge';
import { formatEuros } from '../utils';
import styles from '../styles/CoproTable.module.css';

interface CoproTableProps {
  lines: CallLineDetailed[];
  onRemind: (lineId: string) => void;
  onRelance?: (line: CallLineDetailed) => void;
}

const STATUS_CONFIG: Record<string, { label: string; variant: BadgeVariant }> = {
  paid: { label: 'Paye', variant: 'green' },
  partial: { label: 'Partiel', variant: 'amber' },
  unpaid: { label: 'Impaye', variant: 'red' },
};

function getPaidClass(status: string): string {
  if (status === 'paid') return styles.tdRightPaid;
  if (status === 'partial') return styles.tdRightPartial;
  return styles.tdRightUnpaid;
}

export function CoproTable({ lines, onRemind, onRelance }: CoproTableProps) {
  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead className={styles.thead}>
          <tr>
            <th className={styles.th}>Coproprietaire</th>
            <th className={styles.th}>Lot</th>
            <th className={styles.thRight}>Tantiemes</th>
            <th className={styles.thRight}>Montant du</th>
            <th className={styles.thRight}>Paye</th>
            <th className={styles.thCenter}>Statut</th>
            <th className={styles.thCenter}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => {
            const isUnpaid = line.status === 'unpaid';
            const config = STATUS_CONFIG[line.status] ?? STATUS_CONFIG.unpaid;
            const rowClass = isUnpaid ? styles.rowDanger : styles.row;
            const nameClass = isUnpaid ? styles.tdBoldDanger : styles.tdBold;

            return (
              <tr key={line.id} className={rowClass}>
                <td className={nameClass}>
                  {line.owner_name ?? 'Proprietaire inconnu'}
                </td>
                <td className={styles.tdMuted}>{line.lot_ref}</td>
                <td className={styles.tdRightMuted}>
                  {line.lot_weight} / {line.key_total_weight}
                </td>
                <td className={styles.tdRightBold}>
                  {formatEuros(line.amount_due)}
                </td>
                <td className={getPaidClass(line.status)}>
                  {formatEuros(line.amount_paid)}
                </td>
                <td className={styles.tdCenter}>
                  <StatusBadge label={config.label} variant={config.variant} />
                </td>
                <td className={styles.tdCenter}>
                  {line.status === 'paid' ? (
                    <span className={styles.noAction}>&mdash;</span>
                  ) : (
                    <button
                      className={isUnpaid ? styles.linkActionDanger : styles.linkAction}
                      onClick={() => {
                        onRelance?.(line);
                        onRemind(line.id);
                      }}
                    >
                      Relancer
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

'use client';

import type { CallLineDetailed } from '@/lib/finance/api';
import type { EnrichedCallLine, ReminderLevel } from '../hooks/useAppelsFondsDetail';
import { StatusBadge } from './StatusBadge';
import type { BadgeVariant } from './StatusBadge';
import { formatEuros } from '../utils';
import styles from '../styles/CoproTable.module.css';

interface CoproTableProps {
  lines: (CallLineDetailed | EnrichedCallLine)[];
  onRemind: (lineId: string) => void;
  onRelance?: (line: CallLineDetailed) => void;
}

function getReminderLevel(line: CallLineDetailed | EnrichedCallLine): ReminderLevel {
  return 'reminderLevel' in line ? line.reminderLevel : 0;
}

function getRowClass(status: string, level: ReminderLevel): string {
  if (status === 'paid') return styles.rowPaid;
  switch (level) {
    case 3: return styles.rowLevel3;
    case 2: return styles.rowLevel2;
    case 1: return styles.rowLevel1;
    default: return styles.rowLevel0;
  }
}

function getStatusConfig(status: string, level: ReminderLevel): { label: string; variant: BadgeVariant } {
  if (status === 'paid') return { label: 'Paye', variant: 'green' };
  if (status === 'partial') return { label: 'Partiel', variant: 'amber' };
  // Impaye — gradation selon le niveau de relance
  switch (level) {
    case 3: return { label: 'Mise en demeure', variant: 'red' };
    case 2: return { label: 'Relance 2', variant: 'amber' }; // orange via amber
    case 1: return { label: 'Relance 1', variant: 'neutral' }; // yellow-ish via neutral
    default: return { label: 'Impaye', variant: 'red' };
  }
}

function getNameClass(status: string, level: ReminderLevel): string {
  if (status === 'paid') return styles.tdBold;
  if (level >= 3) return styles.tdBoldDanger;
  return styles.tdBold;
}

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
            const level = getReminderLevel(line);
            const config = getStatusConfig(line.status, level);
            const rowClass = getRowClass(line.status, level);
            const nameClass = getNameClass(line.status, level);

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
                      className={level >= 3 ? styles.linkActionDanger : styles.linkAction}
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

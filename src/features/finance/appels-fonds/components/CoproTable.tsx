'use client';

import { Fragment, useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import type { CallLineDetailed } from '@/lib/finance/api';
import type { CallLotRow, ReminderLevel } from '../hooks/useAppelsFondsDetail';
import { StatusBadge } from './StatusBadge';
import type { BadgeVariant } from './StatusBadge';
import { formatEuros } from '../utils';
import styles from '../styles/CoproTable.module.css';

interface CoproTableProps {
  lots: CallLotRow[];
  onRemind: (lineId: string) => void;
  onRelance?: (line: CallLineDetailed) => void;
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
  switch (level) {
    case 3: return { label: 'Mise en demeure', variant: 'red' };
    case 2: return { label: 'Relance 2', variant: 'amber' };
    case 1: return { label: 'Relance 1', variant: 'neutral' };
    default: return { label: 'Impaye', variant: 'red' };
  }
}

function getNameClass(status: string, level: ReminderLevel): string {
  if (status !== 'paid' && level >= 3) return styles.tdBoldDanger;
  return styles.tdBold;
}

function getPaidClass(status: string): string {
  if (status === 'paid') return styles.tdRightPaid;
  if (status === 'partial') return styles.tdRightPartial;
  return styles.tdRightUnpaid;
}

export function CoproTable({ lots, onRemind, onRelance }: CoproTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (lotId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(lotId)) next.delete(lotId);
      else next.add(lotId);
      return next;
    });
  };

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead className={styles.thead}>
          <tr>
            <th className={styles.thChevron} aria-hidden="true" />
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
          {lots.map((lot) => {
            const level = lot.reminderLevel;
            const config = getStatusConfig(lot.status, level);
            const rowClass = getRowClass(lot.status, level);
            const nameClass = getNameClass(lot.status, level);
            const isOpen = expanded.has(lot.lot_id);

            return (
              <Fragment key={lot.lot_id}>
                <tr className={rowClass}>
                  <td className={styles.tdChevron}>
                    <button
                      type="button"
                      className={styles.expandBtn}
                      onClick={() => toggle(lot.lot_id)}
                      aria-expanded={isOpen}
                      aria-label={isOpen ? 'Reduire le detail' : 'Voir le detail par cle'}
                    >
                      {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                  </td>
                  <td className={nameClass}>{lot.owner_name ?? 'Proprietaire inconnu'}</td>
                  <td className={styles.tdMuted}>{lot.lot_ref}</td>
                  <td className={styles.tdRightMuted}>{lot.lot_tantiemes}</td>
                  <td className={styles.tdRightBold}>{formatEuros(lot.amount_due)}</td>
                  <td className={getPaidClass(lot.status)}>{formatEuros(lot.amount_paid)}</td>
                  <td className={styles.tdCenter}>
                    <StatusBadge label={config.label} variant={config.variant} />
                  </td>
                  <td className={styles.tdCenter}>
                    {lot.status === 'paid' ? (
                      <span className={styles.noAction}>&mdash;</span>
                    ) : (
                      <button
                        type="button"
                        className={level >= 3 ? styles.linkActionDanger : styles.linkAction}
                        onClick={() => {
                          onRelance?.(lot.relanceLine);
                          onRemind(lot.relanceLine.id);
                        }}
                      >
                        Relancer
                      </button>
                    )}
                  </td>
                </tr>
                {isOpen && (
                  <tr className={styles.breakdownRow}>
                    <td colSpan={8} className={styles.breakdownCell}>
                      <div className={styles.breakdownTitle}>Ventilation par cle de repartition</div>
                      <ul className={styles.breakdownList}>
                        {lot.breakdown.map((b) => (
                          <li key={b.repartition_key_id ?? b.key_name} className={styles.breakdownItem}>
                            <span className={styles.breakdownKey}>{b.key_name}</span>
                            <span className={styles.breakdownWeight}>
                              {b.lot_weight} / {b.key_total_weight}
                            </span>
                            <span className={styles.breakdownAmount}>{formatEuros(b.amount_due)}</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

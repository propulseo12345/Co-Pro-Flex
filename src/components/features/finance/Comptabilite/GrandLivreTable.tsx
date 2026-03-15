'use client';

import { useMemo } from 'react';
import { CheckCircle } from 'lucide-react';
import type { OperationComptable, GrandLivreViewMode } from './types';
import { formatCurrency, formatDate } from './utils';
import styles from './Comptabilite.module.css';

interface GrandLivreTableProps {
  operations: OperationComptable[];
  onViewDetail: (operation: OperationComptable) => void;
  viewMode?: GrandLivreViewMode;
}

function groupByCompte(operations: OperationComptable[]) {
  const groups = new Map<string, { label: string; ops: OperationComptable[] }>();
  for (const op of operations) {
    const existing = groups.get(op.compte);
    if (existing) {
      existing.ops.push(op);
    } else {
      groups.set(op.compte, { label: op.compteLabel, ops: [op] });
    }
  }
  return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
}

function GroupedSection({ compte, label, children }: { compte: string; label: string; children: React.ReactNode }) {
  return (
    <>
      <tr className={styles.groupHeader}>
        <td colSpan={8}>Compte {compte} — {label}</td>
      </tr>
      {children}
    </>
  );
}

export function GrandLivreTable({ operations, onViewDetail, viewMode = 'par-compte' }: GrandLivreTableProps) {
  const totals = useMemo(() => {
    return operations.reduce(
      (acc, op) => ({ debit: acc.debit + (op.debit || 0), credit: acc.credit + (op.credit || 0) }),
      { debit: 0, credit: 0 }
    );
  }, [operations]);

  const isBalanced = Math.abs(totals.debit - totals.credit) < 0.01;
  const grouped = useMemo(() => groupByCompte(operations), [operations]);

  const renderRow = (op: OperationComptable) => (
    <tr key={op.id} className={styles.glRow} onClick={() => onViewDetail(op)}>
      <td className={styles.mono}>{formatDate(op.date)}</td>
      <td className={styles.mono}>{op.numeroPiece || '—'}</td>
      <td><span className={styles.accountBadge}>{op.compte}</span></td>
      <td className={styles.glLibelle}>{op.libelle}</td>
      <td className={`${styles.textRight} ${styles.mono}`}>
        {op.debit > 0 ? <span className={styles.debit}>{formatCurrency(op.debit)}</span> : '—'}
      </td>
      <td className={`${styles.textRight} ${styles.mono}`}>
        {op.credit > 0 ? <span className={styles.credit}>{formatCurrency(op.credit)}</span> : '—'}
      </td>
      <td className={`${styles.textRight} ${styles.mono} ${styles.glSolde}`}>
        {op.solde !== undefined ? formatCurrency(op.solde) : '—'}
      </td>
      <td>
        <span className={styles.statusPosted}>Posté</span>
      </td>
    </tr>
  );

  if (operations.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>Aucune opération trouvée</p>
      </div>
    );
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.glTable}>
        <thead>
          <tr>
            <th style={{ width: 90 }}>Date</th>
            <th style={{ width: 80 }}>N° Pièce</th>
            <th>Compte</th>
            <th>Libellé</th>
            <th className={styles.textRight} style={{ width: 110 }}>Débit</th>
            <th className={styles.textRight} style={{ width: 110 }}>Crédit</th>
            <th className={styles.textRight} style={{ width: 110 }}>Solde</th>
            <th style={{ width: 70 }}>Statut</th>
          </tr>
        </thead>
        <tbody>
          {viewMode === 'par-compte'
            ? grouped.map(([compte, { label, ops }]) => (
                <GroupedSection key={compte} compte={compte} label={label}>
                  {ops.map(renderRow)}
                </GroupedSection>
              ))
            : operations.map(renderRow)
          }
        </tbody>
      </table>

      <div className={styles.tableFooter}>
        <div>
          <span className={styles.footerLabel}>Total Débit :</span>
          <span className={`${styles.mono} ${styles.debit}`}> {formatCurrency(totals.debit)}</span>
        </div>
        <div>
          <span className={styles.footerLabel}>Total Crédit :</span>
          <span className={`${styles.mono} ${styles.credit}`}> {formatCurrency(totals.credit)}</span>
        </div>
        {isBalanced && (
          <div className={styles.equilibre}>
            <CheckCircle size={14} /> Balance équilibrée
          </div>
        )}
      </div>
    </div>
  );
}

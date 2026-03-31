'use client';

import { FileText } from 'lucide-react';
import type { EtatDatePayloadV2 } from '../../domain/types';
import styles from './etat-date.module.css';

const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

interface EtatDateTransactionsProps {
  transactions: EtatDatePayloadV2['annexe']['recent_transactions'];
}

export function EtatDateTransactions({ transactions }: EtatDateTransactionsProps) {
  return (
    <div className={styles.annexeSection}>
      <h4 className={styles.annexeTitle}><FileText size={14} /> Dernières opérations ({transactions.length})</h4>
      <table className={styles.annexeTable}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Libellé</th>
            <th>Débit</th>
            <th>Crédit</th>
            <th>Solde</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx, i) => (
            <tr key={i}>
              <td>{fmtDate(tx.line_date)}</td>
              <td>{tx.line_type === 'call' ? 'Appel' : 'Paiement'}</td>
              <td>{tx.label}</td>
              <td className="mono">{tx.debit > 0 ? fmt(tx.debit) : '-'}</td>
              <td className="mono">{tx.credit > 0 ? fmt(tx.credit) : '-'}</td>
              <td className="mono">{fmt(tx.running_balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

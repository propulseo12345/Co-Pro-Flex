'use client';

import { Calendar, FileText } from 'lucide-react';
import type { CallForFundsOverview } from '@/lib/finance/api';
import { formatEuros } from '../utils';
import { StatusBadge } from './StatusBadge';
import type { BadgeVariant } from './StatusBadge';
import styles from './TabListe.module.css';

interface TabListeProps {
  calls: CallForFundsOverview[];
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  issued: 'Émis',
  partially_paid: 'Partiel',
  paid: 'Payé',
  cancelled: 'Annulé',
};

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  draft: 'neutral',
  issued: 'amber',
  partially_paid: 'purple',
  paid: 'green',
  cancelled: 'red',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function TabListe({ calls }: TabListeProps) {
  if (calls.length === 0) {
    return (
      <div className={styles.empty}>
        <FileText size={32} />
        <p>Aucun appel de fonds pour cet exercice.</p>
      </div>
    );
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Libellé</th>
            <th>Clé</th>
            <th>Émission</th>
            <th>Échéance</th>
            <th className={styles.thRight}>Appelé</th>
            <th className={styles.thRight}>Payé</th>
            <th className={styles.thRight}>Restant</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>
          {calls.map((call) => (
            <tr key={call.id}>
              <td className={styles.labelCell}>
                <Calendar size={14} className={styles.labelIcon} />
                {call.label}
              </td>
              <td className={styles.keyCell}>{call.repartition_key_name}</td>
              <td>{formatDate(call.issue_date)}</td>
              <td>{formatDate(call.due_date)}</td>
              <td className={styles.amountCell}>{formatEuros(call.total_amount)}</td>
              <td className={styles.amountCellGreen}>{formatEuros(call.total_paid)}</td>
              <td className={styles.amountCellRed}>{formatEuros(call.total_unpaid)}</td>
              <td>
                <StatusBadge
                  label={STATUS_LABELS[call.status] ?? call.status}
                  variant={STATUS_VARIANTS[call.status] ?? 'neutral'}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

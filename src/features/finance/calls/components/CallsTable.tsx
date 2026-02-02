'use client';

import { CheckCircle, Clock, AlertTriangle, X, Info } from 'lucide-react';
import styles from '@/app/(dashboard)/finance/calls/calls.module.css';

interface Call {
  id: string;
  due_date: string;
  label: string;
  status: string;
  lines_paid_count: number;
  lines_count: number;
  total_amount: string | number;
  total_paid: string | number;
  total_unpaid: string | number;
}

interface CallsTableProps {
  calls: Call[];
}

function getStatusDisplay(status: string, linesPaidCount: number, linesCount: number) {
  switch (status) {
    case 'paid':
      return { icon: <CheckCircle size={16} className={styles.successIcon} aria-hidden="true" />, label: `Soldé (${linesPaidCount}/${linesCount})` };
    case 'partially_paid':
      return { icon: <Clock size={16} className={styles.warningIcon} aria-hidden="true" />, label: `Partiellement payé (${linesPaidCount}/${linesCount})` };
    case 'issued':
      return { icon: <CheckCircle size={16} className={styles.successIcon} aria-hidden="true" />, label: `Envoyé (${linesCount})` };
    case 'draft':
      return { icon: <AlertTriangle size={16} className={styles.warningIcon} aria-hidden="true" />, label: 'Brouillon' };
    case 'cancelled':
      return { icon: <X size={16} className={styles.errorIcon} aria-hidden="true" />, label: 'Annulé' };
    default:
      return { icon: null, label: status };
  }
}

export function CallsTable({ calls }: CallsTableProps) {
  return (
    <div className="card">
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Date d'exigibilité</th>
            <th>Libellé</th>
            <th>Statut</th>
            <th className="text-right">Montant total</th>
            <th className="text-right">Encaissé</th>
            <th className="text-right">Reste à percevoir</th>
          </tr>
        </thead>
        <tbody>
          {calls.map((call) => {
            const statusInfo = getStatusDisplay(call.status, call.lines_paid_count, call.lines_count);
            return (
              <tr key={call.id}>
                <td>
                  <div className={styles.dateCell}>
                    {new Date(call.due_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    <Info size={14} className={styles.infoIcon} aria-hidden="true" />
                  </div>
                </td>
                <td>{call.label}</td>
                <td>
                  <div className={styles.statusCell}>
                    {statusInfo.icon}
                    <span>{statusInfo.label}</span>
                  </div>
                </td>
                <td className={styles.amount}>
                  {Number(call.total_amount).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </td>
                <td className={styles.amount}>
                  {Number(call.total_paid).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </td>
                <td className={styles.amount}>
                  {Number(call.total_unpaid).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

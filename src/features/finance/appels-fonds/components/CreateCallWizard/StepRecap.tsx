'use client';

import { Info } from 'lucide-react';
import type { WizardState, VentilationLine } from '../../hooks/useCreateCallWizard';
import type { RepartitionKeyWithTotals } from '@/lib/lots/api';
import styles from './CreateCallWizard.module.css';

interface StepRecapProps {
  state: WizardState;
  selectedKey: RepartitionKeyWithTotals | null;
  ventilation: VentilationLine[];
  budgets: { id: string; label: string; total_amount: number; budget_type: string }[];
}

function formatEuros(n: number): string {
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR');
}

export function StepRecap({ state, selectedKey, ventilation, budgets }: StepRecapProps) {
  const budgetName = state.budgetId
    ? budgets.find(b => b.id === state.budgetId)?.label ?? '—'
    : null;

  const scheduleLabel = state.scheduleMode === 'single'
    ? `Paiement unique — ${formatDate(state.singleDueDate)}`
    : `${state.installments.length} appels : ${state.installments.map(i => formatDate(i.dueDate)).join(', ')}`;

  const totalVentilation = ventilation.reduce((s, v) => s + v.amountDue, 0);

  return (
    <>
      {/* Summary card */}
      <div className={styles.recapCard}>
        <div className={styles.recapRow}>
          <span className={styles.recapLabel}>Type</span>
          <span className={styles.recapValue}>
            {state.callType === 'exceptional' ? 'Exceptionnel' : `Complément budget — ${budgetName}`}
          </span>
        </div>
        <div className={styles.recapRow}>
          <span className={styles.recapLabel}>Libellé</span>
          <span className={styles.recapValue}>{state.label}</span>
        </div>
        <div className={styles.recapRow}>
          <span className={styles.recapLabel}>Montant total</span>
          <span className={styles.recapValue}>{formatEuros(state.totalAmount)}</span>
        </div>
        <div className={styles.recapRow}>
          <span className={styles.recapLabel}>Clé de répartition</span>
          <span className={styles.recapValue}>{selectedKey?.name ?? '—'}</span>
        </div>
        <div className={styles.recapRow}>
          <span className={styles.recapLabel}>Échéancier</span>
          <span className={styles.recapValue}>{scheduleLabel}</span>
        </div>
        {state.description && (
          <div className={styles.recapRow}>
            <span className={styles.recapLabel}>Motif</span>
            <span className={styles.recapValue} style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>
              {state.description}
            </span>
          </div>
        )}
      </div>

      {/* Ventilation table */}
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Ventilation par lot</label>
        <div className={styles.ventilationScroll}>
          <table className={styles.ventilationTable}>
            <thead>
              <tr>
                <th>Lot</th>
                <th>Tantièmes</th>
                <th>Quote-part</th>
                <th style={{ textAlign: 'right' }}>Montant dû</th>
              </tr>
            </thead>
            <tbody>
              {ventilation.map(v => (
                <tr key={v.lotId}>
                  <td>{v.lotRef}</td>
                  <td>{v.weight} / {selectedKey?.total_weight ?? 0}</td>
                  <td>{v.sharePct.toFixed(2)} %</td>
                  <td style={{ textAlign: 'right' }}>{formatEuros(v.amountDue)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}>Total</td>
                <td style={{ textAlign: 'right' }}>{formatEuros(totalVentilation)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Multi-installment warning */}
      {state.scheduleMode === 'multiple' && (
        <div className={styles.infoBox}>
          <Info size={16} style={{ flexShrink: 0 }} />
          <div>
            <strong>{state.installments.length} appels en brouillon</strong> seront créés.
            Vous pourrez les émettre individuellement depuis la page détail.
          </div>
        </div>
      )}
    </>
  );
}

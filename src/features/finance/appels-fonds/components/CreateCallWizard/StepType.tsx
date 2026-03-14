'use client';

import { AlertTriangle, FileText } from 'lucide-react';
import clsx from 'clsx';
import type { WizardState, CallType } from '../../hooks/useCreateCallWizard';
import styles from './CreateCallWizard.module.css';

interface StepTypeProps {
  state: WizardState;
  budgets: { id: string; label: string; total_amount: number; budget_type: string }[];
  setCallType: (type: CallType) => void;
  updateField: <K extends keyof WizardState>(field: K, value: WizardState[K]) => void;
}

function formatEuros(n: number): string {
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}

export function StepType({ state, budgets, setCallType, updateField }: StepTypeProps) {
  return (
    <>
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Type d&apos;appel</label>
        <div className={styles.radioCards}>
          <button
            className={clsx(styles.radioCard, state.callType === 'exceptional' && styles.radioCardSelected)}
            onClick={() => setCallType('exceptional')}
          >
            <div className={styles.radioCardIcon}>
              <AlertTriangle size={18} />
            </div>
            <div>
              <div className={styles.radioCardTitle}>Exceptionnel</div>
              <div className={styles.radioCardDesc}>Dépense imprévue, hors budget voté</div>
            </div>
          </button>
          <button
            className={clsx(styles.radioCard, state.callType === 'complement' && styles.radioCardSelected)}
            onClick={() => setCallType('complement')}
          >
            <div className={styles.radioCardIcon}>
              <FileText size={18} />
            </div>
            <div>
              <div className={styles.radioCardTitle}>Complément budget</div>
              <div className={styles.radioCardDesc}>Complément sur un budget existant</div>
            </div>
          </button>
        </div>
      </div>

      {state.callType === 'complement' && (
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Budget rattaché</label>
          {budgets.length === 0 ? (
            <div className={styles.infoBox}>
              Aucun budget pour cet exercice. Choisissez « Exceptionnel » ou créez un budget.
            </div>
          ) : (
            <select
              className={styles.fieldSelect}
              value={state.budgetId ?? ''}
              onChange={e => updateField('budgetId', e.target.value || null)}
            >
              <option value="">Sélectionner un budget...</option>
              {budgets.map(b => (
                <option key={b.id} value={b.id}>
                  {b.label} — {formatEuros(b.total_amount)} ({b.budget_type})
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Libellé</label>
        <input
          className={styles.fieldInput}
          type="text"
          maxLength={100}
          placeholder="Ex: Réparation fuite toiture"
          value={state.label}
          onChange={e => updateField('label', e.target.value)}
        />
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Motif / Description (optionnel)</label>
        <textarea
          className={styles.fieldTextarea}
          rows={3}
          placeholder="Contexte ou justification de l'appel"
          value={state.description}
          onChange={e => updateField('description', e.target.value)}
        />
      </div>
    </>
  );
}

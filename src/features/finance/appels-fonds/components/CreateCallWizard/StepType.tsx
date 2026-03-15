'use client';

import { useMemo } from 'react';
import { AlertTriangle, Hammer } from 'lucide-react';
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
  // Filter budgets by selected type
  const filteredBudgets = useMemo(() => {
    if (state.callType === 'exceptional') {
      return budgets.filter(b => b.budget_type === 'current');
    }
    if (state.callType === 'travaux') {
      return budgets.filter(b => b.budget_type === 'works');
    }
    return [];
  }, [budgets, state.callType]);

  const budgetLabel = state.callType === 'travaux' ? 'Budget travaux rattaché' : 'Budget courant rattaché';
  const emptyMessage = state.callType === 'travaux'
    ? 'Aucun budget travaux trouvé. Créez-en un dans l\'onglet Budgets > Travaux.'
    : 'Aucun budget courant pour cet exercice.';

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
              <div className={styles.radioCardDesc}>Complément charges, dépense imprévue</div>
            </div>
          </button>
          <button
            className={clsx(styles.radioCard, state.callType === 'travaux' && styles.radioCardSelected)}
            onClick={() => setCallType('travaux')}
          >
            <div className={styles.radioCardIcon}>
              <Hammer size={18} />
            </div>
            <div>
              <div className={styles.radioCardTitle}>Travaux</div>
              <div className={styles.radioCardDesc}>Financement travaux votés en AG</div>
            </div>
          </button>
        </div>
      </div>

      {state.callType && (
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>{budgetLabel}</label>
          {filteredBudgets.length === 0 ? (
            <div className={styles.infoBox}>{emptyMessage}</div>
          ) : (
            <select
              className={styles.fieldSelect}
              value={state.budgetId ?? ''}
              onChange={e => updateField('budgetId', e.target.value || null)}
            >
              <option value="">Sélectionner un budget...</option>
              {filteredBudgets.map(b => (
                <option key={b.id} value={b.id}>
                  {b.label} — {formatEuros(b.total_amount)}
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
          placeholder={state.callType === 'travaux' ? 'Ex: Appel travaux ravalement T1' : 'Ex: Réparation fuite toiture'}
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

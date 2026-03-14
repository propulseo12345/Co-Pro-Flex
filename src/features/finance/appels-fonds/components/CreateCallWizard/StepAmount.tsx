'use client';

import { Info } from 'lucide-react';
import type { WizardState } from '../../hooks/useCreateCallWizard';
import type { RepartitionKeyWithTotals } from '@/lib/lots/api';
import styles from './CreateCallWizard.module.css';

interface StepAmountProps {
  state: WizardState;
  keys: RepartitionKeyWithTotals[];
  keysLoading: boolean;
  keyPreview: { lotsCount: number; totalWeight: number; minAmount: number; maxAmount: number } | null;
  updateField: <K extends keyof WizardState>(field: K, value: WizardState[K]) => void;
}

function formatEuros(n: number): string {
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });
}

export function StepAmount({ state, keys, keysLoading, keyPreview, updateField }: StepAmountProps) {
  return (
    <>
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Montant total (€)</label>
        <input
          className={styles.fieldInput}
          type="number"
          min={0}
          step={0.01}
          placeholder="12 500"
          value={state.totalAmount || ''}
          onChange={e => updateField('totalAmount', parseFloat(e.target.value) || 0)}
        />
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Clé de répartition</label>
        {keysLoading ? (
          <div className={styles.fieldInput} style={{ color: 'var(--text-tertiary)' }}>
            Chargement des clés...
          </div>
        ) : keys.length === 0 ? (
          <div className={styles.infoBox}>
            Aucune clé de répartition active. Créez-en une depuis les paramètres.
          </div>
        ) : (
          <select
            className={styles.fieldSelect}
            value={state.repartitionKeyId ?? ''}
            onChange={e => updateField('repartitionKeyId', e.target.value || null)}
          >
            <option value="">Sélectionner une clé...</option>
            {keys.filter(k => k.is_active).map(k => (
              <option key={k.key_id} value={k.key_id}>
                {k.name} — {k.lots_with_weight_count} lots
              </option>
            ))}
          </select>
        )}
      </div>

      {keyPreview && (
        <div className={styles.infoBox}>
          <Info size={16} style={{ flexShrink: 0 }} />
          <div>
            <strong>{keyPreview.lotsCount} lots</strong> concernés · Total tantièmes : {keyPreview.totalWeight}
            <br />
            Montant par lot : {formatEuros(keyPreview.minAmount)} — {formatEuros(keyPreview.maxAmount)}
          </div>
        </div>
      )}
    </>
  );
}

'use client';

import { Calendar, CalendarRange, Check, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import type { WizardState, ScheduleMode, InstallmentCount, Installment } from '../../hooks/useCreateCallWizard';
import styles from './CreateCallWizard.module.css';

interface StepScheduleProps {
  state: WizardState;
  updateField: <K extends keyof WizardState>(field: K, value: WizardState[K]) => void;
  setInstallmentCount: (count: InstallmentCount) => void;
  updateInstallment: (index: number, field: keyof Installment, value: string | number) => void;
}

function formatEuros(n: number): string {
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });
}

export function StepSchedule({ state, updateField, setInstallmentCount, updateInstallment }: StepScheduleProps) {
  const sum = state.installments.reduce((s, i) => s + i.amount, 0);
  const sumMatch = Math.abs(sum - state.totalAmount) <= 0.01;
  const datesOk = state.installments.every((inst, idx) =>
    idx === 0 || inst.dueDate > state.installments[idx - 1].dueDate
  );

  return (
    <>
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Mode de paiement</label>
        <div className={styles.radioCards}>
          <button
            className={clsx(styles.radioCard, state.scheduleMode === 'single' && styles.radioCardSelected)}
            onClick={() => updateField('scheduleMode', 'single' as ScheduleMode)}
          >
            <div className={styles.radioCardIcon}>
              <Calendar size={18} />
            </div>
            <div>
              <div className={styles.radioCardTitle}>Paiement unique</div>
              <div className={styles.radioCardDesc}>Une seule échéance</div>
            </div>
          </button>
          <button
            className={clsx(styles.radioCard, state.scheduleMode === 'multiple' && styles.radioCardSelected)}
            onClick={() => updateField('scheduleMode', 'multiple' as ScheduleMode)}
          >
            <div className={styles.radioCardIcon}>
              <CalendarRange size={18} />
            </div>
            <div>
              <div className={styles.radioCardTitle}>Échéancier multiple</div>
              <div className={styles.radioCardDesc}>Plusieurs appels étalés</div>
            </div>
          </button>
        </div>
      </div>

      {state.scheduleMode === 'single' && (
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Date d&apos;échéance</label>
          <input
            className={styles.fieldInput}
            type="date"
            value={state.singleDueDate}
            onChange={e => updateField('singleDueDate', e.target.value)}
          />
        </div>
      )}

      {state.scheduleMode === 'multiple' && (
        <>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Nombre d&apos;appels</label>
            <div className={styles.inlineRadios}>
              {([2, 3, 4] as InstallmentCount[]).map(n => (
                <button
                  key={n}
                  className={clsx(styles.inlineRadio, state.installmentCount === n && styles.inlineRadioActive)}
                  onClick={() => setInstallmentCount(n)}
                >
                  {n} appels
                </button>
              ))}
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Échéances</label>
            <table className={styles.scheduleTable}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date échéance</th>
                  <th>Montant</th>
                  <th>%</th>
                </tr>
              </thead>
              <tbody>
                {state.installments.map((inst, i) => {
                  const pct = state.totalAmount > 0
                    ? Math.round((inst.amount / state.totalAmount) * 100)
                    : 0;
                  return (
                    // Échéances = liste figée (2-4 lignes) sans identifiant, l'ordre est la donnée
                    // eslint-disable-next-line react/no-array-index-key
                    <tr key={i}>
                      <td>{i + 1}/{state.installments.length}</td>
                      <td>
                        <input
                          type="date"
                          value={inst.dueDate}
                          onChange={e => updateInstallment(i, 'dueDate', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={inst.amount || ''}
                          onChange={e => updateInstallment(i, 'amount', parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      <td>{pct} %</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className={clsx(styles.sumIndicator, sumMatch ? styles.sumOk : styles.sumError)}>
              {sumMatch ? <Check size={12} /> : <AlertTriangle size={12} />}
              Total : {formatEuros(sum)} / {formatEuros(state.totalAmount)}
            </div>

            {!datesOk && (
              <div className={styles.infoBoxWarning} style={{ marginTop: 8 }}>
                <AlertTriangle size={14} />
                Les dates doivent être strictement croissantes.
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}

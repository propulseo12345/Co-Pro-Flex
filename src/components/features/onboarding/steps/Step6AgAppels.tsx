'use client';

import { useState, useCallback } from 'react';
import { StepHeader } from '../shared/StepHeader';
import { generateCallsFromBudget } from '@/lib/onboarding/api';
import styles from './Step6AgAppels.module.css';

interface Step6Props {
  coproId: string;
  budgetId: string | null;
  periodId: string;
  onComplete: () => void;
  onBack: () => void;
}

type Mode = 'voted' | 'not_voted' | null;
type Schedule = 'trimestriel' | 'semestriel' | 'annuel';

export function Step6AgAppels({ coproId, budgetId, periodId, onComplete, onBack }: Step6Props) {
  const [mode, setMode] = useState<Mode>(null);
  const [agDate, setAgDate] = useState('');
  const [schedule, setSchedule] = useState<Schedule>('trimestriel');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ callsCreated: number; linesCreated: number } | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!budgetId || !agDate) return;
    setIsSaving(true);
    setError(null);

    const res = await generateCallsFromBudget({
      coproId,
      periodId,
      budgetId,
      schedule,
      agDate,
    });

    setIsSaving(false);
    if (res.error) {
      setError(res.error.message);
    } else if (res.data) {
      setResult(res.data);
    }
  }, [coproId, periodId, budgetId, schedule, agDate]);

  const scheduleLabels: Record<Schedule, string> = {
    trimestriel: 'Trimestriel (4 appels)',
    semestriel: 'Semestriel (2 appels)',
    annuel: 'Annuel (1 appel)',
  };

  return (
    <div className={styles.container}>
      <StepHeader
        title="AG & Appels de fonds"
        description="Si le budget a déjà été voté en AG, renseignez la date et générez les appels de fonds. Sinon, passez à l'étape suivante."
      />

      {!budgetId && (
        <div className={styles.noBudgetInfo}>
          Aucun budget n&apos;a été créé à l&apos;étape précédente.<br />
          Les appels de fonds seront générés plus tard, quand un budget sera voté en AG.
        </div>
      )}

      {budgetId && !result && (
        <>
          <div className={styles.modeSelector}>
            <div
              className={mode === 'voted' ? styles.modeCardActive : styles.modeCard}
              onClick={() => setMode('voted')}
            >
              <div className={styles.modeTitle}>Budget déjà voté</div>
              <div className={styles.modeDesc}>
                Le budget a été voté en AG. Je renseigne la date et je génère les appels de fonds.
              </div>
            </div>
            <div
              className={mode === 'not_voted' ? styles.modeCardActive : styles.modeCard}
              onClick={() => setMode('not_voted')}
            >
              <div className={styles.modeTitle}>Pas encore voté</div>
              <div className={styles.modeDesc}>
                Le budget sera voté lors d&apos;une prochaine AG. Je passe pour l&apos;instant.
              </div>
            </div>
          </div>

          {mode === 'voted' && (
            <div className={styles.formSection}>
              <div className={styles.formTitle}>Informations de l&apos;AG</div>
              <div className={styles.fields}>
                <div className={styles.field}>
                  <label className={styles.label}>Date de l&apos;AG</label>
                  <input
                    className={styles.input}
                    type="date"
                    value={agDate}
                    onChange={e => setAgDate(e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Echéancier</label>
                  <select
                    className={styles.select}
                    value={schedule}
                    onChange={e => setSchedule(e.target.value as Schedule)}
                  >
                    {(Object.keys(scheduleLabels) as Schedule[]).map(s => (
                      <option key={s} value={s}>{scheduleLabels[s]}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {error && <div className={styles.errorMsg}>{error}</div>}
        </>
      )}

      {result && (
        <div className={styles.successBox}>
          <div className={styles.successText}>Appels de fonds générés avec succès</div>
          <div className={styles.successDetail}>
            {result.callsCreated} appel(s) créé(s) pour {result.linesCreated} ligne(s) de lot
          </div>
        </div>
      )}

      <div className={styles.footer}>
        <button className={styles.btnBack} onClick={onBack}>Retour</button>
        {mode === 'voted' && !result ? (
          <button
            className={styles.btnNext}
            onClick={handleGenerate}
            disabled={isSaving || !agDate}
          >
            {isSaving ? 'Génération...' : 'Générer les appels'}
          </button>
        ) : (
          <button className={styles.btnNext} onClick={onComplete}>
            Continuer
          </button>
        )}
      </div>
    </div>
  );
}

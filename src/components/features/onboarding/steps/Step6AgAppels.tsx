'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { CalendarDays } from 'lucide-react';
import { StepHeader } from '../shared/StepHeader';
import { createClient } from '@/lib/supabase/client';
import { postOnboardingCalls } from '@/lib/onboarding/api';
import type { OnboardingCallPlan } from '@/lib/onboarding/api';
import styles from './Step6AgAppels.module.css';

interface Step6Props {
  coproId: string;
  budgetId: string | null;
  periodId: string;
  onComplete: (plan: OnboardingCallPlan | null) => void;
  onBack: () => void;
}

type Schedule = 'trimestriel' | 'semestriel' | 'annuel';
type Phase = 'config' | 'preview';

const SCHEDULE_OPTIONS: { value: Schedule; label: string; total: number }[] = [
  { value: 'trimestriel', label: 'Trimestriel', total: 4 },
  { value: 'semestriel', label: 'Semestriel', total: 2 },
  { value: 'annuel', label: 'Annuel', total: 1 },
];

interface CallPreview {
  trimester: number;
  label: string;
  issueDate: string;
  dueDate: string;
  amount: number;
}

/** Formate une Date en 'YYYY-MM-DD' à partir des composantes LOCALES (évite le décalage UTC). */
function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function Step6AgAppels({ coproId, budgetId, periodId, onComplete, onBack }: Step6Props) {
  const [phase, setPhase] = useState<Phase>('config');
  const [schedule, setSchedule] = useState<Schedule>('trimestriel');
  const [alreadyDone, setAlreadyDone] = useState<number>(0);
  const [agDate, setAgDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [budgetTotal, setBudgetTotal] = useState<number>(0);
  // Début de l'exercice (period.start_date) : sert d'ancre aux dates d'appels, pour des
  // échéances relatives au mois de début d'exercice (ex. exercice juillet -> juil/oct/janv/avr).
  const [periodStart, setPeriodStart] = useState<string | null>(null);

  // Preview des appels éditables
  const [callPreviews, setCallPreviews] = useState<CallPreview[]>([]);

  // Charger le montant total du budget
  useEffect(() => {
    if (!budgetId) return;
    const currentBudgetId = budgetId;
    async function loadBudgetTotal() {
      const supabase = createClient();
      const { data } = await supabase
        .from('budget_lines')
        .select('amount')
        .eq('budget_id', currentBudgetId);
      if (data) {
        const total = (data as Array<{ amount: number }>).reduce((s, l) => s + Number(l.amount), 0);
        setBudgetTotal(total);
      }
    }
    loadBudgetTotal();
  }, [budgetId]);

  // Charger la date de début d'exercice (ancre des échéances)
  useEffect(() => {
    if (!periodId) return;
    let cancelled = false;
    async function loadPeriodStart() {
      const supabase = createClient();
      const { data } = await supabase
        .from('accounting_periods')
        .select('start_date')
        .eq('id', periodId)
        .single();
      if (!cancelled && data) setPeriodStart((data as { start_date: string }).start_date);
    }
    loadPeriodStart();
    return () => { cancelled = true; };
  }, [periodId]);

  const totalAppels = SCHEDULE_OPTIONS.find(s => s.value === schedule)?.total || 4;
  const remaining = Math.max(0, totalAppels - alreadyDone);
  const amountPerCall = totalAppels > 0 ? Math.round((budgetTotal / totalAppels) * 100) / 100 : 0;

  const alreadyOptions = useMemo(() => {
    return Array.from({ length: totalAppels }, (_, i) => i);
  }, [totalAppels]);

  const handleScheduleChange = useCallback((newSchedule: Schedule) => {
    setSchedule(newSchedule);
    const newTotal = SCHEDULE_OPTIONS.find(s => s.value === newSchedule)?.total || 4;
    if (alreadyDone >= newTotal) setAlreadyDone(0);
  }, [alreadyDone]);

  const periodLabel = useCallback((idx: number) => {
    if (schedule === 'trimestriel') return `T${idx + 1}`;
    if (schedule === 'semestriel') return `S${idx + 1}`;
    return 'Annuel';
  }, [schedule]);

  // Générer les previews avec dates auto-calculées, ancrées sur le début de l'exercice.
  // Ces dates sont des valeurs par défaut : le gestionnaire peut les modifier ligne par ligne
  // dans la preview (inputs date ci-dessous).
  const goToPreview = useCallback(() => {
    // Ancre = 1er jour de l'exercice (period.start_date). Repli sur l'année de l'AG / janvier
    // si la période n'est pas encore chargée.
    let baseYear: number;
    let baseMonth: number;
    if (periodStart) {
      const [y, m] = periodStart.split('-').map(Number);
      baseYear = y;
      baseMonth = m - 1;
    } else {
      baseYear = agDate ? new Date(agDate).getFullYear() : new Date().getFullYear();
      baseMonth = 0;
    }
    const monthsPerPeriod = schedule === 'annuel' ? 12 : schedule === 'semestriel' ? 6 : 3;

    const previews: CallPreview[] = [];
    for (let i = alreadyDone; i < totalAppels; i++) {
      // JS Date normalise le débordement de mois -> gère le passage d'année automatiquement.
      const issueDate = new Date(baseYear, baseMonth + i * monthsPerPeriod, 1);
      const dueDate = new Date(baseYear, baseMonth + (i + 1) * monthsPerPeriod, 0); // dernier jour de la sous-période

      previews.push({
        trimester: i + 1,
        label: `Appel ${periodLabel(i)}`,
        issueDate: toISODate(issueDate),
        dueDate: toISODate(dueDate),
        amount: amountPerCall,
      });
    }
    setCallPreviews(previews);
    setError(null);
    setPhase('preview');
  }, [periodStart, agDate, schedule, alreadyDone, totalAppels, amountPerCall, periodLabel]);

  const updatePreviewDate = useCallback((idx: number, field: 'issueDate' | 'dueDate', value: string) => {
    setCallPreviews(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  }, []);

  // Post-as-you-go : on POSTE les appels ici (route idempotente), puis on remonte le plan.
  const handleConfirm = useCallback(async () => {
    if (!budgetId) { onComplete(null); return; }
    const plan: OnboardingCallPlan = {
      schedule,
      alreadyDone,
      installments: callPreviews.map(p => ({
        index: p.trimester,
        label: p.label,
        issueDate: p.issueDate,
        dueDate: p.dueDate,
      })),
    };
    if (plan.installments.length > 0) {
      setIsPosting(true);
      setError(null);
      const r = await postOnboardingCalls(coproId, periodId, budgetId, plan);
      setIsPosting(false);
      if (r.error) { setError(r.error.message); return; }
    }
    onComplete(plan);
  }, [budgetId, coproId, periodId, schedule, alreadyDone, callPreviews, onComplete]);

  return (
    <div className={styles.container}>
      <StepHeader
        title="Appels de fonds"
        description="Configurez la fréquence des appels et les dates d'émission. Les écritures seront enregistrées à l'étape de finalisation."
      />

      {/* Pas de budget */}
      {!budgetId && (
        <div className={styles.noBudgetInfo}>
          Aucun budget n&apos;a été créé à l&apos;étape précédente.<br />
          Les appels de fonds seront créés plus tard, quand un budget sera voté.
          <div className={styles.noBudgetAction}>
            <button className={styles.btnNext} onClick={() => onComplete(null)}>Continuer</button>
          </div>
        </div>
      )}

      {/* Phase 1 : Configuration */}
      {budgetId && phase === 'config' && (
        <>
          {/* Montant du budget */}
          {budgetTotal > 0 && (
            <div className={styles.budgetBanner}>
              <span>Budget annuel :</span>
              <strong>{budgetTotal.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</strong>
              <span className={styles.budgetPerCall}>
                → {amountPerCall.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} / {schedule === 'trimestriel' ? 'trimestre' : schedule === 'semestriel' ? 'semestre' : 'an'}
              </span>
            </div>
          )}

          <div className={styles.section}>
            <label className={styles.sectionLabel}>Fréquence des appels</label>
            <div className={styles.pills}>
              {SCHEDULE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  className={`${styles.pill} ${schedule === opt.value ? styles.pillActive : ''}`}
                  onClick={() => handleScheduleChange(opt.value)}
                >
                  {opt.label} ({opt.total})
                </button>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <label className={styles.sectionLabel}>Combien d&apos;appels ont déjà été émis cette année ?</label>
            <p className={styles.sectionHint}>
              Si vous reprenez une copropriété en cours d&apos;exercice, certains appels ont peut-être déjà été envoyés.
            </p>
            <div className={styles.pills}>
              {alreadyOptions.map(n => (
                <button
                  key={n}
                  className={`${styles.pill} ${alreadyDone === n ? styles.pillActive : ''}`}
                  onClick={() => setAlreadyDone(n)}
                >
                  {n === 0 ? 'Aucun' : `${n} (${Array.from({ length: n }, (_, i) => periodLabel(i)).join(', ')})`}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <label className={styles.sectionLabel}>Date de l&apos;AG ayant voté le budget</label>
            <input className={styles.input} type="date" value={agDate} onChange={e => setAgDate(e.target.value)} />
          </div>

          {error && <div className={styles.errorMsg}>{error}</div>}
        </>
      )}

      {/* Phase 2 : Preview éditable */}
      {budgetId && phase === 'preview' && (
        <>
          <div className={styles.previewHeader}>
            <h3 className={styles.previewTitle}>
              {callPreviews.length} appel{callPreviews.length > 1 ? 's' : ''} à valider
            </h3>
            <button className={styles.linkBtn} onClick={() => setPhase('config')}>Modifier la config</button>
          </div>

          <div className={styles.previewTable}>
            <div className={styles.previewRow} style={{ fontWeight: 600, fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.5px', color: 'var(--text-tertiary)' }}>
              <span>Période</span>
              <span>Date d&apos;émission</span>
              <span>Date d&apos;échéance</span>
              <span>Montant</span>
            </div>
            {callPreviews.map((p, idx) => (
              <div key={idx} className={styles.previewRow}>
                <span className={styles.previewPeriod}>
                  <CalendarDays size={14} />
                  {p.label}
                </span>
                <input
                  className={styles.previewDateInput}
                  type="date"
                  value={p.issueDate}
                  onChange={e => updatePreviewDate(idx, 'issueDate', e.target.value)}
                />
                <input
                  className={styles.previewDateInput}
                  type="date"
                  value={p.dueDate}
                  onChange={e => updatePreviewDate(idx, 'dueDate', e.target.value)}
                />
                <span className={styles.previewAmount}>
                  {p.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </span>
              </div>
            ))}
            <div className={styles.previewTotal}>
              <span>Total à appeler</span>
              <span className={styles.previewTotalAmount}>
                {callPreviews.reduce((s, p) => s + p.amount, 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </span>
            </div>
          </div>

          {error && <div className={styles.errorMsg}>{error}</div>}
        </>
      )}

      {/* Footer */}
      <div className={styles.footer}>
        <button className={styles.btnBack} onClick={phase === 'preview' ? () => setPhase('config') : onBack}>
          Retour
        </button>
        {budgetId && phase === 'config' && remaining > 0 && (
          <button
            className={styles.btnNext}
            onClick={goToPreview}
            disabled={!agDate}
          >
            Voir les appels ({remaining})
          </button>
        )}
        {budgetId && phase === 'config' && remaining === 0 && (
          <button className={styles.btnNext} onClick={() => onComplete(null)}>Continuer</button>
        )}
        {budgetId && phase === 'preview' && (
          <button className={styles.btnNext} onClick={handleConfirm} disabled={isPosting}>
            {isPosting
              ? 'Émission…'
              : `Valider ces ${callPreviews.length} appel${callPreviews.length > 1 ? 's' : ''}`}
          </button>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { CalendarDays } from 'lucide-react';
import { StepHeader } from '../shared/StepHeader';
import { createClient } from '@/lib/supabase/client';
import styles from './Step6AgAppels.module.css';

interface Step6Props {
  coproId: string;
  budgetId: string | null;
  periodId: string;
  onComplete: () => void;
  onBack: () => void;
}

type Schedule = 'trimestriel' | 'semestriel' | 'annuel';
type Phase = 'config' | 'preview' | 'done';

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

interface CreatedCall {
  label: string;
  trimester: number;
  keyName: string;
  amount: number;
  lotsCount: number;
  issueDate: string;
  dueDate: string;
}

export function Step6AgAppels({ coproId, budgetId, periodId, onComplete, onBack }: Step6Props) {
  const [phase, setPhase] = useState<Phase>('config');
  const [schedule, setSchedule] = useState<Schedule>('trimestriel');
  const [alreadyDone, setAlreadyDone] = useState<number>(0);
  const [agDate, setAgDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [budgetTotal, setBudgetTotal] = useState<number>(0);
  const [createdCalls, setCreatedCalls] = useState<CreatedCall[]>([]);

  // Preview des appels éditables
  const [callPreviews, setCallPreviews] = useState<CallPreview[]>([]);

  // Charger le montant total du budget
  useEffect(() => {
    if (!budgetId) return;
    async function loadBudgetTotal() {
      const supabase = createClient() as any;
      const { data } = await supabase
        .from('budget_lines')
        .select('amount')
        .eq('budget_id', budgetId);
      if (data) {
        const total = (data as Array<{ amount: number }>).reduce((s, l) => s + Number(l.amount), 0);
        setBudgetTotal(total);
      }
    }
    loadBudgetTotal();
  }, [budgetId]);

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

  // Générer les previews avec dates auto-calculées
  const goToPreview = useCallback(() => {
    const year = agDate ? new Date(agDate).getFullYear() : new Date().getFullYear();
    const monthsPerPeriod = schedule === 'annuel' ? 12 : schedule === 'semestriel' ? 6 : 3;

    const previews: CallPreview[] = [];
    for (let i = alreadyDone; i < totalAppels; i++) {
      const startMonth = i * monthsPerPeriod;
      const issueDate = new Date(year, startMonth, 1);
      const dueDate = new Date(year, startMonth + monthsPerPeriod, 0); // Dernier jour de la période

      previews.push({
        trimester: i + 1,
        label: `Appel ${periodLabel(i)}`,
        issueDate: issueDate.toISOString().split('T')[0],
        dueDate: dueDate.toISOString().split('T')[0],
        amount: amountPerCall,
      });
    }
    setCallPreviews(previews);
    setPhase('preview');
  }, [agDate, schedule, alreadyDone, totalAppels, amountPerCall, periodLabel]);

  const updatePreviewDate = useCallback((idx: number, field: 'issueDate' | 'dueDate', value: string) => {
    setCallPreviews(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  }, []);

  // Créer les appels en DB
  const handleCreate = useCallback(async () => {
    if (!budgetId) return;
    setIsSaving(true);
    setError(null);

    try {
      const supabase = createClient() as any;

      // Récupérer les lignes de budget par clé de répartition
      const { data: budgetLines } = await supabase
        .from('budget_lines')
        .select('amount, repartition_key_id')
        .eq('budget_id', budgetId);
      if (!budgetLines?.length) throw new Error('Aucune ligne de budget');

      // Grouper par clé
      const keyTotals = new Map<string, number>();
      for (const line of budgetLines as Array<{ amount: number; repartition_key_id: string }>) {
        keyTotals.set(line.repartition_key_id, (keyTotals.get(line.repartition_key_id) || 0) + Number(line.amount));
      }

      // Noms des clés
      const { data: keyNames } = await supabase
        .from('repartition_keys')
        .select('id, name')
        .in('id', [...keyTotals.keys()]);
      const keyNameMap: Record<string, string> = {};
      for (const k of (keyNames || []) as Array<{ id: string; name: string }>) {
        keyNameMap[k.id] = k.name;
      }

      // Comptes 450 et 701
      const { data: accounts } = await supabase
        .from('accounts')
        .select('id, code')
        .eq('copro_id', coproId)
        .in('code', ['450', '701']);
      const accList = (accounts || []) as Array<{ id: string; code: string }>;
      let acc450Id = accList.find(a => a.code === '450')?.id;
      let acc701Id = accList.find(a => a.code === '701')?.id;

      if (!acc450Id) {
        const { data: n } = await supabase.from('accounts').insert({ copro_id: coproId, code: '450', name: 'Copropriétaires', account_type: 'asset', is_active: true }).select('id').single();
        acc450Id = n?.id;
      }
      if (!acc701Id) {
        const { data: n } = await supabase.from('accounts').insert({ copro_id: coproId, code: '701', name: 'Provisions pour charges', account_type: 'income', is_active: true }).select('id').single();
        acc701Id = n?.id;
      }

      const results: CreatedCall[] = [];

      for (const preview of callPreviews) {
        for (const [keyId, totalKeyAmount] of Array.from(keyTotals.entries())) {
          const callAmount = Math.round((totalKeyAmount / totalAppels) * 100) / 100;

          // Lots pour cette clé
          const { data: keyLines } = await supabase
            .from('repartition_key_lines')
            .select('lot_id, weight')
            .eq('key_id', keyId);
          if (!keyLines?.length) continue;

          const totalWeight = (keyLines as Array<{ weight: number }>).reduce((s, l) => s + Number(l.weight), 0);
          if (totalWeight === 0) continue;

          // Écriture comptable
          const { data: ltx } = await supabase
            .from('ledger_transactions')
            .insert({
              copro_id: coproId,
              period_id: periodId,
              tx_date: preview.issueDate,
              label: preview.label,
              source_type: 'call_for_funds',
              status: 'posted',
              posted_at: new Date().toISOString(),
            })
            .select('id')
            .single();
          if (!ltx) continue;

          await supabase.from('ledger_entries').insert([
            { copro_id: coproId, period_id: periodId, tx_id: ltx.id, account_id: acc450Id, direction: 'debit', amount: callAmount, entry_label: preview.label },
            { copro_id: coproId, period_id: periodId, tx_id: ltx.id, account_id: acc701Id, direction: 'credit', amount: callAmount, entry_label: preview.label },
          ]);

          // Appel de fonds
          const { data: call } = await supabase
            .from('call_for_funds')
            .insert({
              copro_id: coproId,
              period_id: periodId,
              budget_id: budgetId,
              repartition_key_id: keyId,
              label: preview.label,
              trimester: preview.trimester,
              issue_date: preview.issueDate,
              due_date: preview.dueDate,
              total_amount: callAmount,
              status: 'draft',
              ledger_tx_id: ltx.id,
            })
            .select('id')
            .single();
          if (!call) continue;

          // Lignes par lot
          const lines = (keyLines as Array<{ lot_id: string; weight: number }>).map(l => ({
            copro_id: coproId,
            call_id: call.id,
            lot_id: l.lot_id,
            amount_due: Math.round((callAmount * Number(l.weight) / totalWeight) * 100) / 100,
          }));

          // Fix rounding
          const linesTotal = lines.reduce((s, l) => s + l.amount_due, 0);
          const delta = Math.round((callAmount - linesTotal) * 100) / 100;
          if (lines.length > 0 && delta !== 0) {
            lines[lines.length - 1].amount_due += delta;
          }

          await supabase.from('call_for_funds_lines').insert(lines);

          results.push({
            label: preview.label,
            trimester: preview.trimester,
            keyName: keyNameMap[keyId] || 'Charges générales',
            amount: callAmount,
            lotsCount: lines.length,
            issueDate: preview.issueDate,
            dueDate: preview.dueDate,
          });
        }
      }

      // Valider le budget
      await supabase.from('budgets').update({ status: 'validated', validated_at: new Date().toISOString() }).eq('id', budgetId);

      setCreatedCalls(results);
      setPhase('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }

    setIsSaving(false);
  }, [budgetId, coproId, periodId, callPreviews, totalAppels]);

  const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  const totalCreated = createdCalls.reduce((s, c) => s + c.amount, 0);

  return (
    <div className={styles.container}>
      <StepHeader
        title="Appels de fonds"
        description="Configurez la fréquence des appels et les dates d'émission. Les appels seront créés en brouillon."
      />

      {/* Pas de budget */}
      {!budgetId && (
        <div className={styles.noBudgetInfo}>
          Aucun budget n&apos;a été créé à l&apos;étape précédente.<br />
          Les appels de fonds seront créés plus tard, quand un budget sera voté.
          <div className={styles.noBudgetAction}>
            <button className={styles.btnNext} onClick={onComplete}>Continuer</button>
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
              {callPreviews.length} appel{callPreviews.length > 1 ? 's' : ''} à créer
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

      {/* Phase 3 : Résultat */}
      {budgetId && phase === 'done' && (
        <div className={styles.successBox}>
          <div className={styles.successText}>Appels de fonds créés en brouillon</div>

          <table className={styles.detailTable}>
            <thead>
              <tr>
                <th>Période</th>
                <th>Clé</th>
                <th>Émission</th>
                <th>Échéance</th>
                <th>Montant</th>
                <th>Lots</th>
              </tr>
            </thead>
            <tbody>
              {createdCalls.map((c, i) => (
                <tr key={i}>
                  <td className={styles.detailPeriod}>{periodLabel(c.trimester - 1)}</td>
                  <td>{c.keyName}</td>
                  <td>{formatDate(c.issueDate)}</td>
                  <td>{formatDate(c.dueDate)}</td>
                  <td className={styles.detailAmount}>
                    {c.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </td>
                  <td>{c.lotsCount}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className={styles.detailTotalLabel}>Total</td>
                <td className={styles.detailTotalAmount}>
                  {totalCreated.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>

          <p className={styles.successHint}>
            Visible dans Finance → Appels de fonds. Vous déciderez quand les envoyer.
          </p>
        </div>
      )}

      {/* Footer */}
      <div className={styles.footer}>
        {phase !== 'done' && (
          <button className={styles.btnBack} onClick={phase === 'preview' ? () => setPhase('config') : onBack}>
            Retour
          </button>
        )}
        {phase === 'done' && <div />}
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
          <button className={styles.btnNext} onClick={onComplete}>Continuer</button>
        )}
        {budgetId && phase === 'preview' && (
          <button
            className={styles.btnNext}
            onClick={handleCreate}
            disabled={isSaving}
          >
            {isSaving ? 'Création...' : `Créer ${callPreviews.length} appel${callPreviews.length > 1 ? 's' : ''}`}
          </button>
        )}
        {phase === 'done' && (
          <button className={styles.btnNext} onClick={onComplete}>Continuer</button>
        )}
      </div>
    </div>
  );
}

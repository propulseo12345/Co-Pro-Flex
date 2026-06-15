'use client';

import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { X, Loader2, CheckCircle2 } from 'lucide-react';
import type { ApiResult, PaymentNatureFilter, RecordPaymentPayload, RecordPaymentResult as RecordPaymentData } from '@/lib/finance/api';
import { paymentSchema, PAYMENT_METHODS, PAYMENT_NATURES } from '@/lib/validation/finance/paiement';
import { FormField, FormSelect } from '@/components/ui/FormField';
import type { CallLotRow } from '../hooks/useAppelsFondsDetail';
import { formatEuros } from '../utils';
import styles from '../styles/PaymentModal.module.css';

type PaymentMethod = (typeof PAYMENT_METHODS)[number];

const METHOD_LABELS: Record<PaymentMethod, string> = {
  transfer: 'Virement',
  direct_debit: 'Prélèvement SEPA',
  check: 'Chèque',
  card: 'Carte',
  cash: 'Espèces',
  other: 'Autre',
};

const NATURE_LABELS: Record<PaymentNatureFilter, string> = {
  current: 'Courant',
  works: 'Travaux',
  alur: 'ALUR (fonds travaux)',
};

type RecordPaymentResult = ApiResult<RecordPaymentData>;

// Valeurs telles que saisies (entrée) vs validées/coercées (sortie du schéma).
type PaymentInput = z.input<typeof paymentSchema>;
type PaymentOutput = z.output<typeof paymentSchema>;

interface PaymentModalProps {
  lots: CallLotRow[];
  periodId: string;
  isSubmitting: boolean;
  recordPayment: (payload: Omit<RecordPaymentPayload, 'copro_id'>) => Promise<RecordPaymentResult>;
  onClose: () => void;
  onRecorded: () => void;
}

/** Date du jour au format YYYY-MM-DD en fuseau local. */
function todayISO(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function PaymentModal({ lots, periodId, isSubmitting, recordPayment, onClose, onRecorded }: PaymentModalProps) {
  // Une clé d'idempotence par ouverture de modale : un double-clic / retry n'encaisse qu'une fois.
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const defaultLot = useMemo(() => lots.find((l) => l.remaining > 0.005) ?? lots[0], [lots]);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<PaymentInput, unknown, PaymentOutput>({
    resolver: zodResolver(paymentSchema),
    mode: 'onTouched',
    defaultValues: {
      lotId: defaultLot?.lot_id ?? '',
      amount: defaultLot ? defaultLot.remaining : '',
      paymentDate: todayISO(),
      method: 'transfer',
      natureFilter: '',
      reference: '',
    },
  });

  // Avertissement « trop-perçu » : warning d'UI PUREMENT INFORMATIF (le surplus est TOUJOURS porté
  // en avance 450-3, sans perte) — PAS une erreur de validation, il ne bloque pas la soumission.
  // NB : `remaining` est le restant dû de CET appel (mono-nature) ; si l'utilisateur force un filtre
  // de nature différent, le seuil est approximatif — le reliquat réel ira de toute façon en 450-3.
  const watchedLotId = useWatch({ control, name: 'lotId' });
  const numericAmount = Number(useWatch({ control, name: 'amount' }));
  const selectedLot = lots.find((l) => l.lot_id === watchedLotId) ?? null;
  const showOverpayHint = !!selectedLot && numericAmount > selectedLot.remaining + 0.005;

  const onValid = async (data: PaymentOutput) => {
    setSubmitError(null);
    const result = await recordPayment({
      period_id: periodId,
      lot_id: data.lotId,
      amount: data.amount,
      payment_date: data.paymentDate,
      method: data.method,
      reference: data.reference || undefined,
      idempotency_key: idempotencyKey,
      nature_filter: data.natureFilter || undefined,
    });

    if (result.error) {
      setSubmitError(result.error);
      return;
    }
    setDone(true);
    onRecorded();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerTitle}>Enregistrer un paiement</div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onValid)}>
          <div className={styles.body}>
            {done ? (
              <div className={styles.done}>
                <CheckCircle2 size={32} />
                <div className={styles.doneText}>Paiement enregistré et comptabilisé au grand livre.</div>
              </div>
            ) : (
              <>
                <FormSelect
                  label="Lot"
                  required
                  error={errors.lotId?.message}
                  {...register('lotId', {
                    onChange: (e) => {
                      const lot = lots.find((l) => l.lot_id === e.target.value);
                      if (lot) setValue('amount', lot.remaining, { shouldValidate: true });
                    },
                  })}
                >
                  {lots.map((l) => (
                    <option key={l.lot_id} value={l.lot_id}>
                      Lot {l.lot_ref} — {l.owner_name ?? 'Copropriétaire'} (reste {formatEuros(l.remaining)})
                    </option>
                  ))}
                </FormSelect>

                <div className={styles.row}>
                  <FormField
                    label="Montant (€)"
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    error={errors.amount?.message}
                    {...register('amount')}
                  />
                  <FormField
                    label="Date"
                    required
                    type="date"
                    error={errors.paymentDate?.message}
                    {...register('paymentDate')}
                  />
                </div>

                <div className={styles.row}>
                  <FormSelect label="Mode" error={errors.method?.message} {...register('method')}>
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {METHOD_LABELS[m]}
                      </option>
                    ))}
                  </FormSelect>
                  <FormField
                    label="Référence (optionnel)"
                    type="text"
                    placeholder="N° de chèque, virement…"
                    error={errors.reference?.message}
                    {...register('reference')}
                  />
                </div>

                <FormSelect
                  label="Imputer sur la nature (optionnel)"
                  error={errors.natureFilter?.message}
                  {...register('natureFilter')}
                >
                  <option value="">Cloisonné par défaut (courant puis travaux)</option>
                  {PAYMENT_NATURES.map((n) => (
                    <option key={n} value={n}>
                      {NATURE_LABELS[n]}
                    </option>
                  ))}
                </FormSelect>

                {selectedLot && selectedLot.advanceBalance > 0.005 && (
                  <div className={styles.hint}>
                    Avance disponible sur ce lot : {formatEuros(selectedLot.advanceBalance)} (compte 450-3).
                  </div>
                )}

                {showOverpayHint && selectedLot && (
                  <div className={styles.hint}>
                    Le montant dépasse le restant dû ({formatEuros(selectedLot.remaining)}) : le trop-perçu sera porté en avance (450-3).
                  </div>
                )}

                <div className={styles.allocNote}>
                  L&apos;encaissement est imputé par nature (courant puis travaux), sur les échéances les plus
                  anciennes de chaque nature ; le fonds ALUR n&apos;est imputé que sur sélection explicite.
                </div>

                {submitError && <div className={styles.error}>{submitError}</div>}
              </>
            )}
          </div>

          <div className={styles.footer}>
            {done ? (
              <button type="button" className={styles.btnPrimary} onClick={onClose}>
                Fermer
              </button>
            ) : (
              <>
                <button type="button" className={styles.btnCancel} onClick={onClose} disabled={isSubmitting}>
                  Annuler
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className={styles.spin} /> Enregistrement…
                    </>
                  ) : (
                    'Enregistrer le paiement'
                  )}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

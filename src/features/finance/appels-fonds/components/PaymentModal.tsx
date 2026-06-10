'use client';

import { useMemo, useState } from 'react';
import { X, Loader2, CheckCircle2 } from 'lucide-react';
import type { ApiResult, PaymentNatureFilter, RecordPaymentPayload } from '@/lib/finance/api';
import type { CallLotRow } from '../hooks/useAppelsFondsDetail';
import { formatEuros } from '../utils';
import styles from '../styles/PaymentModal.module.css';

type PaymentMethod = 'transfer' | 'direct_debit' | 'card' | 'check' | 'cash' | 'other';

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

type RecordPaymentResult = ApiResult<{
  payment_id: string;
  ledger_tx_id: string;
  allocations: Array<{ call_line_id: string; amount_allocated: number }>;
}>;

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

  const defaultLot = useMemo(() => lots.find((l) => l.remaining > 0.005) ?? lots[0], [lots]);

  const [lotId, setLotId] = useState<string>(defaultLot?.lot_id ?? '');
  const [amount, setAmount] = useState<string>(defaultLot ? String(defaultLot.remaining) : '');
  const [paymentDate, setPaymentDate] = useState<string>(todayISO());
  const [method, setMethod] = useState<PaymentMethod>('transfer');
  const [natureFilter, setNatureFilter] = useState<'' | PaymentNatureFilter>('');
  const [reference, setReference] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<boolean>(false);

  const selectedLot = lots.find((l) => l.lot_id === lotId) ?? null;
  const numericAmount = Number(amount);
  const canSubmit = lotId !== '' && numericAmount > 0 && paymentDate !== '' && !isSubmitting;

  const handleLotChange = (id: string) => {
    setLotId(id);
    const lot = lots.find((l) => l.lot_id === id);
    if (lot) setAmount(String(lot.remaining));
  };

  const handleSubmit = async () => {
    setError(null);
    if (!canSubmit) return;

    const result = await recordPayment({
      period_id: periodId,
      lot_id: lotId,
      amount: numericAmount,
      payment_date: paymentDate,
      method,
      reference: reference.trim() || undefined,
      idempotency_key: idempotencyKey,
      nature_filter: natureFilter || undefined,
    });

    if (result.error) {
      setError(result.error);
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

        <div className={styles.body}>
          {done ? (
            <div className={styles.done}>
              <CheckCircle2 size={32} />
              <div className={styles.doneText}>Paiement enregistré et comptabilisé au grand livre.</div>
            </div>
          ) : (
            <>
              <label className={styles.field}>
                <span className={styles.label}>Lot</span>
                <select className={styles.input} value={lotId} onChange={(e) => handleLotChange(e.target.value)}>
                  {lots.map((l) => (
                    <option key={l.lot_id} value={l.lot_id}>
                      Lot {l.lot_ref} — {l.owner_name ?? 'Copropriétaire'} (reste {formatEuros(l.remaining)})
                    </option>
                  ))}
                </select>
              </label>

              <div className={styles.row}>
                <label className={styles.field}>
                  <span className={styles.label}>Montant (€)</span>
                  <input
                    className={styles.input}
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Date</span>
                  <input
                    className={styles.input}
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                </label>
              </div>

              <div className={styles.row}>
                <label className={styles.field}>
                  <span className={styles.label}>Mode</span>
                  <select className={styles.input} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                    {(Object.keys(METHOD_LABELS) as PaymentMethod[]).map((m) => (
                      <option key={m} value={m}>
                        {METHOD_LABELS[m]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Référence (optionnel)</span>
                  <input
                    className={styles.input}
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="N° de chèque, virement…"
                  />
                </label>
              </div>

              <label className={styles.field}>
                <span className={styles.label}>Imputer sur la nature (optionnel)</span>
                <select
                  className={styles.input}
                  value={natureFilter}
                  onChange={(e) => setNatureFilter(e.target.value as '' | PaymentNatureFilter)}
                >
                  <option value="">Toutes natures (FIFO)</option>
                  {(Object.keys(NATURE_LABELS) as PaymentNatureFilter[]).map((n) => (
                    <option key={n} value={n}>
                      {NATURE_LABELS[n]}
                    </option>
                  ))}
                </select>
              </label>

              {selectedLot && numericAmount > selectedLot.remaining + 0.005 && (
                <div className={styles.hint}>
                  Le montant dépasse le restant dû ({formatEuros(selectedLot.remaining)}) : le trop-perçu sera porté en avance (450-3).
                </div>
              )}

              <div className={styles.allocNote}>
                L&apos;encaissement est lettré automatiquement sur les échéances les plus anciennes du lot (FIFO).
              </div>

              {error && <div className={styles.error}>{error}</div>}
            </>
          )}
        </div>

        <div className={styles.footer}>
          {done ? (
            <button className={styles.btnPrimary} onClick={onClose}>
              Fermer
            </button>
          ) : (
            <>
              <button className={styles.btnCancel} onClick={onClose} disabled={isSubmitting}>
                Annuler
              </button>
              <button className={styles.btnPrimary} onClick={handleSubmit} disabled={!canSubmit}>
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
      </div>
    </div>
  );
}

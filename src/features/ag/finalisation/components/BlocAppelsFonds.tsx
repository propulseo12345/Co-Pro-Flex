'use client';

import { useState, useCallback, useEffect } from 'react';
import { BlocCard } from './BlocCard';
import {
  loadCallPreviewData,
  generateCombinedCallsFromAg,
  type PendingAction,
  type CallPreviewData,
} from '@/lib/ag/api/finalisation.api';
import styles from './BlocAppelsFonds.module.css';

const NB_LABELS: Record<number, string> = {
  1: 'Annuel (1 appel)',
  2: 'Semestriel (2 appels)',
  4: 'Trimestriel (4 appels)',
};

const PERIOD_PREFIX: Record<number, string> = {
  1: 'Annuel',
  2: 'S',
  4: 'T',
};

function fmt(n: number): string {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

interface BlocAppelsFondsProps {
  agId: string;
  action: PendingAction;
  alurAction?: PendingAction;
  onActivated: () => void;
}

export function BlocAppelsFonds({ agId, action, onActivated }: BlocAppelsFondsProps) {
  const [nbAppels, setNbAppels] = useState(4);
  const [preview, setPreview] = useState<CallPreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [status, setStatus] = useState<'pending' | 'activated' | 'failed' | 'loading'>(
    action.status as 'pending' | 'activated' | 'failed'
  );
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ calls_created?: number; lines_created?: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPreviewLoading(true);
    loadCallPreviewData(agId).then(data => {
      if (!cancelled) {
        setPreview(data);
        setPreviewLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [agId]);

  const handleConfirm = useCallback(async () => {
    setStatus('loading');
    setError(null);
    const res = await generateCombinedCallsFromAg(agId, nbAppels);
    if (res.success) {
      setStatus('activated');
      setResult({ calls_created: res.calls_created, lines_created: res.lines_created });
      onActivated();
    } else {
      setStatus('failed');
      setError(res.error || 'Erreur inconnue');
    }
  }, [agId, nbAppels, onActivated]);

  return (
    <BlocCard
      title="Appels de fonds"
      actionType="SCHEDULE_BUDGET_PAYMENTS"
      status={status}
      error={error}
      onConfirm={handleConfirm}
      confirmLabel="Générer les appels"
      confirmDisabled={previewLoading || !preview}
    >
      {previewLoading && <p>Chargement des données…</p>}

      {preview && (
        <>
          <div className={styles.fields}>
            <div className={styles.field}>
              <label className={styles.label}>Modalités de paiement</label>
              <select
                className={styles.select}
                value={nbAppels}
                onChange={e => setNbAppels(parseInt(e.target.value))}
                disabled={status === 'activated'}
              >
                {Object.entries(NB_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.summary}>
            <div className={styles.summaryRow}>
              <span className={styles.summaryKey}>Budget prévisionnel</span>
              <span className={styles.summaryVal}>{fmt(preview.total_budget)}</span>
            </div>
            {preview.total_alur > 0 && (
              <div className={styles.summaryRow}>
                <span className={styles.summaryKey}>Fonds travaux ALUR</span>
                <span className={styles.summaryVal}>{fmt(preview.total_alur)}</span>
              </div>
            )}
            <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
              <span>Total annuel</span>
              <span>{fmt(preview.total)}</span>
            </div>

            <p className={styles.previewTitle}>Répartition par clé</p>
            {preview.keys.map(k => (
              <div key={k.key_id} className={styles.summaryRow}>
                <span className={styles.summaryKey}>
                  {k.key_name}
                  {k.alur_amount > 0 && (
                    <span className={styles.alurTag}> (dont ALUR : {fmt(k.alur_amount)})</span>
                  )}
                </span>
                <span className={styles.summaryVal}>{fmt(k.total_amount)}</span>
              </div>
            ))}
          </div>

          <div className={styles.preview}>
            <p className={styles.previewTitle}>Aperçu des appels</p>
            <table className={styles.previewTable}>
              <thead>
                <tr>
                  <th>Clé de répartition</th>
                  {Array.from({ length: nbAppels }, (_, i) => (
                    <th key={i}>
                      {nbAppels === 1 ? PERIOD_PREFIX[1] : PERIOD_PREFIX[nbAppels] + (i + 1)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.keys.map(k => (
                  <tr key={k.key_id}>
                    <td>{k.key_name}</td>
                    {Array.from({ length: nbAppels }, (_, i) => (
                      <td key={i}>{fmt(Math.round(k.total_amount / nbAppels * 100) / 100)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {result && (
        <p className={styles.result}>
          {result.calls_created} appels créés, {result.lines_created} lignes par lot
        </p>
      )}
    </BlocCard>
  );
}

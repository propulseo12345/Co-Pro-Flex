'use client';

import { useState, useEffect } from 'react';
import { BlocCard } from './BlocCard';
import {
  loadCallPreviewData,
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
}

/** Revue lecture seule des appels de fonds générés à l'étape PV (aperçu de la répartition). */
export function BlocAppelsFonds({ agId, action }: BlocAppelsFondsProps) {
  const [nbAppels, setNbAppels] = useState(4);
  const [preview, setPreview] = useState<CallPreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);

  useEffect(() => {
    // previewLoading démarre à true (useState) ; setState uniquement dans le callback async.
    let cancelled = false;
    loadCallPreviewData(agId).then(data => {
      if (!cancelled) {
        setPreview(data);
        setPreviewLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [agId]);

  return (
    <BlocCard title="Appels de fonds" actionType="SCHEDULE_BUDGET_PAYMENTS" status={action.status}>
      {previewLoading && <p>Chargement des données…</p>}

      {preview && (
        <>
          <div className={styles.fields}>
            <div className={styles.field}>
              <label className={styles.label}>Répartition de l&apos;aperçu</label>
              <select
                className={styles.select}
                value={nbAppels}
                onChange={e => setNbAppels(parseInt(e.target.value))}
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
            <p className={styles.previewTitle}>Aperçu indicatif des appels (découpage estimatif)</p>
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
    </BlocCard>
  );
}

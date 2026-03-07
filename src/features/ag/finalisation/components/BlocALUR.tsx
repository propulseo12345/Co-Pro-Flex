'use client';

import { useState, useCallback } from 'react';
import { BlocCard } from './BlocCard';
import { createAlurFundFromAg, type PendingAction } from '@/lib/ag/api/finalisation.api';
import styles from './BlocALUR.module.css';

function parseFrenchAmount(val: string | undefined): number {
  if (!val) return 0;
  return parseFloat(val.replace(/\s/g, '').replace(',', '.')) || 0;
}

function mapModalites(val: string | undefined): string {
  switch (val?.toLowerCase()) {
    case 'trimestriel': return 'TRIMESTRIEL';
    case 'semestriel': return 'SEMESTRIEL';
    case 'mensuel': return 'MENSUEL';
    default: return 'UNIQUE';
  }
}

interface BlocALURProps {
  agId: string;
  action: PendingAction;
  scheduleAction?: PendingAction;
  onActivated: () => void;
}

export function BlocALUR({ agId, action, scheduleAction, onActivated }: BlocALURProps) {
  const vars = action.resolution?.variables || {};
  const scheduleVars = scheduleAction?.resolution?.variables || {};

  const [montant, setMontant] = useState(() => parseFrenchAmount(vars['montant']));
  const [modalites, setModalites] = useState(() =>
    mapModalites(scheduleVars['modalites_paiement_fonds'])
  );
  const [status, setStatus] = useState<'pending' | 'activated' | 'failed' | 'loading'>(
    action.status as 'pending' | 'activated' | 'failed'
  );
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = useCallback(async () => {
    setStatus('loading');
    setError(null);
    const result = await createAlurFundFromAg(agId, montant, modalites);
    if (result.success) {
      setStatus('activated');
      onActivated();
    } else {
      setStatus('failed');
      setError(result.error || 'Erreur inconnue');
    }
  }, [agId, montant, modalites, onActivated]);

  return (
    <BlocCard
      title="Fonds de travaux ALUR"
      actionType="CREATE_ALUR_FUND"
      status={status}
      error={error}
      onConfirm={handleConfirm}
      confirmLabel="Créer le fonds ALUR"
      confirmDisabled={montant <= 0}
    >
      <div className={styles.fields}>
        <div className={styles.field}>
          <label className={styles.label}>Montant annuel</label>
          <div className={styles.inputRow}>
            <input
              type="number"
              className={styles.input}
              value={montant}
              onChange={e => setMontant(parseFloat(e.target.value) || 0)}
              disabled={status === 'activated'}
              min="0"
              step="0.01"
            />
            <span className={styles.suffix}>€</span>
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Modalités de paiement</label>
          <select
            className={styles.select}
            value={modalites}
            onChange={e => setModalites(e.target.value)}
            disabled={status === 'activated'}
          >
            <option value="UNIQUE">Annuel (1 appel)</option>
            <option value="SEMESTRIEL">Semestriel (2 appels)</option>
            <option value="TRIMESTRIEL">Trimestriel (4 appels)</option>
          </select>
        </div>
      </div>
    </BlocCard>
  );
}

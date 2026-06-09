'use client';

import { BlocCard } from './BlocCard';
import type { PendingAction } from '@/lib/ag/api/finalisation.api';
import styles from './BlocALUR.module.css';

function parseFrenchAmount(val: string | undefined): number {
  if (!val) return 0;
  return parseFloat(val.replace(/\s/g, '').replace(',', '.')) || 0;
}

const MODALITES_LABELS: Record<string, string> = {
  UNIQUE: 'Annuel (1 appel)',
  SEMESTRIEL: 'Semestriel (2 appels)',
  TRIMESTRIEL: 'Trimestriel (4 appels)',
  MENSUEL: 'Mensuel',
};

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
}

/** Revue lecture seule du fonds de travaux ALUR voté (créé à l'étape PV). */
export function BlocALUR({ action, scheduleAction }: BlocALURProps) {
  const vars = action.resolution?.variables || {};
  const scheduleVars = scheduleAction?.resolution?.variables || {};
  const montant = parseFrenchAmount(vars['montant']);
  const modalites = mapModalites(scheduleVars['modalites_paiement_fonds']);

  return (
    <BlocCard title="Fonds de travaux ALUR" actionType="CREATE_ALUR_FUND" status={action.status}>
      <div className={styles.fields}>
        <div className={styles.field}>
          <label className={styles.label}>Montant annuel</label>
          <span className={styles.value}>
            {montant.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </span>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Modalités de paiement</label>
          <span className={styles.value}>{MODALITES_LABELS[modalites]}</span>
        </div>
      </div>
    </BlocCard>
  );
}

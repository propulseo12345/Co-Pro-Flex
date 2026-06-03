'use client';

import { useCallback } from 'react';
import { StepHeader } from '../shared/StepHeader';
import { BalanceEntreeForm } from './BalanceEntreeForm';
import { SoldesParLotTable } from './SoldesParLotTable';
import { EquilibreIndicator } from './EquilibreIndicator';
import { useRepriseSoldes } from './useRepriseSoldes';
import styles from './RepriseSoldes.module.css';

interface RepriseSoldesProps {
  coproId: string;
  periodId: string;
  /** Bornes de la période ciblée — servent à borner la date de reprise (clamp). [P1] */
  periodStart?: string;
  periodEnd?: string;
  /** Wizard : avance à l'étape suivante après save. Autonome : ferme le panneau. */
  onSaved?: (residual: number) => void;
  /** Wizard : retour. Absent en mode autonome. */
  onBack?: () => void;
  /** Libellé du bouton principal (défaut « Enregistrer la reprise »). */
  saveLabel?: string;
  /** Affiche un bouton « Passer » (wizard uniquement). */
  onSkip?: () => void;
}

export function RepriseSoldes({ coproId, periodId, periodStart, periodEnd, onSaved, onBack, saveLabel, onSkip }: RepriseSoldesProps) {
  const r = useRepriseSoldes(coproId, periodId, periodStart, periodEnd);

  const handleSave = useCallback(async () => {
    const { ok, residual } = await r.save();
    if (ok) onSaved?.(residual);
  }, [r, onSaved]);

  if (r.isLoading) {
    return <div className={styles.loading}>Chargement de la reprise…</div>;
  }

  return (
    <div className={styles.container}>
      <StepHeader
        title="Reprise de soldes"
        description="Saisissez les soldes à la date de reprise (banque, réserves, créances par lot). C'est ré-éditable : enregistrez même si tout n'est pas connu."
      />

      {r.error && <div className={styles.error}>{r.error}</div>}

      <BalanceEntreeForm
        state={r.form}
        bankAccounts={r.bankAccounts}
        planAccounts={r.planAccounts}
        onChange={r.setForm}
      />

      <h3 className={styles.lotTitle}>Soldes par lot</h3>
      <p className={styles.lotHint}>
        Positif = le copropriétaire doit de l&apos;argent. Négatif = il a un avoir.
        L&apos;avance (103) est tracée à part et n&apos;entre pas dans le solde affiché.
      </p>
      <SoldesParLotTable lots={r.lots} values={r.lotValues} onChange={r.setLotValue} />

      <EquilibreIndicator residual={r.residual} />

      <div className={styles.footer}>
        {onBack ? <button className={styles.btnBack} onClick={onBack} disabled={r.isSaving}>Retour</button> : <span />}
        <div className={styles.footerRight}>
          {onSkip && (
            <button className={styles.btnSkip} onClick={onSkip} disabled={r.isSaving}>Passer</button>
          )}
          <button className={styles.btnSave} onClick={handleSave} disabled={r.isSaving}>
            {r.isSaving ? 'Enregistrement…' : (saveLabel ?? 'Enregistrer la reprise')}
          </button>
        </div>
      </div>
    </div>
  );
}

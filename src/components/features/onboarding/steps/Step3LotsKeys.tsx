// src/components/features/onboarding/steps/Step3LotsKeys.tsx
'use client';

import { StepHeader } from '../shared/StepHeader';
import { LotsRepartitionGrid } from '@/components/features/lots/LotsRepartitionGrid';
import { useLotsRepartitionGrid } from '@/hooks/modules/useLotsRepartitionGrid';
import styles from './Step3LotsKeys.module.css';

interface Step3Props {
  coproId: string;
  onComplete: () => void;
  onBack: () => void;
}

export function Step3LotsKeys({ coproId, onComplete, onBack }: Step3Props) {
  const gridProps = useLotsRepartitionGrid(coproId);
  const lotCount = gridProps.rows?.length ?? 0;
  const hasLots = lotCount > 0;

  return (
    <div className={styles.container}>
      <StepHeader
        title="Lots & Clés de répartition"
        description="Créez les lots et définissez leurs tantièmes par clé de répartition. Associez chaque lot à son propriétaire."
        count={hasLots ? `${lotCount} lot${lotCount > 1 ? 's' : ''}` : undefined}
      />

      <div className={styles.info}>
        Utilisez le bouton « + Lot » pour ajouter des lots et « + Clé » pour ajouter des clés de répartition.
        Cliquez sur une cellule de tantièmes pour la modifier. La clé « Tantièmes généraux » est créée automatiquement.
      </div>

      <div className={styles.gridWrapper}>
        <LotsRepartitionGrid {...gridProps} />
      </div>

      <div className={styles.footer}>
        <button className={styles.btnBack} onClick={onBack}>Retour</button>
        <button
          className={styles.btnNext}
          onClick={onComplete}
          disabled={!hasLots}
        >
          Continuer ({lotCount} lot{lotCount > 1 ? 's' : ''})
        </button>
      </div>
    </div>
  );
}

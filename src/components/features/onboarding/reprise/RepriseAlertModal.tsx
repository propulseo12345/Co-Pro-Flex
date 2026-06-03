'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { resolveOnboardingPeriod, type ResolvedPeriod } from '@/lib/onboarding/api';
import { RepriseSoldes } from './RepriseSoldes';
import styles from './RepriseAlertModal.module.css';

interface RepriseAlertModalProps {
  coproId: string;
  onClose: () => void;
}

export function RepriseAlertModal({ coproId, onClose }: RepriseAlertModalProps) {
  const [period, setPeriod] = useState<ResolvedPeriod | null>(null);

  useEffect(() => {
    // Reprise autonome : on cible la période portant DÉJÀ la reprise (sinon l'ouverte,
    // sinon on crée) — pas l'année civile en dur, sinon get_opening_balance renvoie vide. [P1]
    resolveOnboardingPeriod(coproId).then(res => {
      if (res.data) setPeriod(res.data);
    });
  }, [coproId]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.close} onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        {period ? (
          <RepriseSoldes
            coproId={coproId}
            periodId={period.id}
            periodStart={period.start}
            periodEnd={period.end}
            onSaved={() => onClose()}
            saveLabel="Enregistrer"
          />
        ) : (
          <div className={styles.loading}>Chargement…</div>
        )}
      </div>
    </div>
  );
}

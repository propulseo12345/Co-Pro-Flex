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
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // RÉSOLUTION SEULE (FIX 2b) : on cible la période portant DÉJÀ la reprise (sinon l'unique
    // période ouverte). On ne CRÉE JAMAIS de période en effet de bord d'un clic sur l'alerte
    // (la création est réservée au wizard). Si rien n'est trouvé -> on n'ouvre PAS d'écran.
    resolveOnboardingPeriod(coproId).then(res => {
      if (cancelled) return;
      if (res.data) setPeriod(res.data);
      setResolved(true);
    });
    return () => { cancelled = true; };
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
        ) : resolved ? (
          // Aucune période d'onboarding identifiable : pas d'écran de reprise (pas de création
          // parasite). Message clair plutôt qu'un spinner infini.
          <div className={styles.loading}>Aucune reprise d&apos;onboarding en cours pour cette copropriété.</div>
        ) : (
          <div className={styles.loading}>Chargement…</div>
        )}
      </div>
    </div>
  );
}

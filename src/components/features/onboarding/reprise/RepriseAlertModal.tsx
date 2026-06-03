'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { ensureAccountingPeriod } from '@/lib/onboarding/api';
import { RepriseSoldes } from './RepriseSoldes';
import styles from './RepriseAlertModal.module.css';

interface RepriseAlertModalProps {
  coproId: string;
  onClose: () => void;
}

export function RepriseAlertModal({ coproId, onClose }: RepriseAlertModalProps) {
  const [periodId, setPeriodId] = useState<string | null>(null);

  useEffect(() => {
    // Reprise autonome : on cible la période d'ouverture courante de la copro.
    const year = new Date().getFullYear();
    ensureAccountingPeriod(coproId, year).then(res => {
      if (res.data) setPeriodId(res.data.id);
    });
  }, [coproId]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.close} onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        {periodId ? (
          <RepriseSoldes
            coproId={coproId}
            periodId={periodId}
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

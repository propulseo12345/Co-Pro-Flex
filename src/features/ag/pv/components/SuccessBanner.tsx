'use client';

import { CheckCircle, UserCheck } from 'lucide-react';
import styles from '../../../../app/(dashboard)/ag/[id]/pv/pv.module.css';
import type { Signataire } from '../domain/types';

interface SuccessBannerProps {
  signataires?: Signataire[];
}

export function SuccessBanner({ signataires }: SuccessBannerProps) {
  return (
    <div className={styles.successBanner}>
      <CheckCircle size={24} aria-hidden="true" />
      <div>
        <strong>Procès-verbal signé</strong>
        <p>Le PV a été généré et les signatures ont été recueillies.</p>
        {signataires && signataires.length > 0 && (
          <div className={styles.signatairesListBanner}>
            {signataires.map((s) => (
              <div key={s.id} className={styles.signataireBannerItem}>
                <UserCheck size={14} aria-hidden="true" />
                <span>{s.prenom} {s.nom}</span>
                <span className={styles.signataireBannerRole}>{s.roleLabel}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

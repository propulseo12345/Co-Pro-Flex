'use client';

import { CheckCircle } from 'lucide-react';
import styles from '../../../../app/(dashboard)/ag/[id]/pv/pv.module.css';

export function SuccessBanner() {
  return (
    <div className={styles.successBanner}>
      <CheckCircle size={24} aria-hidden="true" />
      <div>
        <strong>Procès-verbal signé</strong>
        <p>Le PV a été généré et les signatures électroniques ont été recueillies.</p>
      </div>
    </div>
  );
}

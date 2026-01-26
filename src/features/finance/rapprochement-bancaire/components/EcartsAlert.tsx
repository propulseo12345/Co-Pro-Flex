'use client';

import { AlertTriangle } from 'lucide-react';
import styles from '../../../../app/(dashboard)/finance/rapprochement-bancaire/rapprochement-bancaire.module.css';

interface EcartsAlertProps {
  ecarts: number;
}

export function EcartsAlert({ ecarts }: EcartsAlertProps) {
  if (ecarts === 0) return null;

  return (
    <div className={styles.alerteEcarts}>
      <AlertTriangle size={24} />
      <div>
        <strong>{ecarts} écart(s) détecté(s)</strong>
        <p>Vérifiez les lignes en rouge et validez-les manuellement ou créez les mouvements manquants avant de certifier.</p>
      </div>
    </div>
  );
}

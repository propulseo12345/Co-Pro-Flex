'use client';

import type { IDPEHistorique } from '@/types';
import styles from './DPEHistorique.module.css';

interface DPEHistoriqueProps {
  historique: IDPEHistorique[];
}

export function DPEHistorique({ historique }: DPEHistoriqueProps) {
  if (historique.length === 0) {
    return <p className={styles.empty}>Aucun DPE antérieur enregistré.</p>;
  }

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Date</th>
          <th>Classe</th>
          <th>Diagnostiqueur</th>
        </tr>
      </thead>
      <tbody>
        {historique.map(h => (
          <tr key={h.id}>
            <td>{new Date(h.dateDiagnostic).toLocaleDateString('fr-FR')}</td>
            <td><span className={styles.classe}>{h.classeEnergie}</span></td>
            <td>{h.diagnostiqueur}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

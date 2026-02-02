'use client';

import { Trash2 } from 'lucide-react';
import type { Lot, CleRepartition } from '../hooks/useInfoCoproPage';
import { TYPES_LOT } from '../hooks/useInfoCoproPage';
import styles from '@/app/(dashboard)/settings/info/info.module.css';

interface LotsTableProps {
  lots: Lot[];
  clesRepartition: CleRepartition[];
  getCoproprietaireNom: (id: string) => string;
  onModifier: (lot: Lot) => void;
  onSupprimer: (id: string) => void;
}

export function LotsTable({
  lots,
  clesRepartition,
  getCoproprietaireNom,
  onModifier,
  onSupprimer,
}: LotsTableProps) {
  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Numero</th>
            <th>Type</th>
            <th>Principal</th>
            <th>Coproprietaire</th>
            <th>Charges generales</th>
            {clesRepartition.filter(c => c.nom !== 'Charges generales').map(cle => (
              <th key={cle.id}>{cle.nom}</th>
            ))}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {lots.map(lot => (
            <tr key={lot.id}>
              <td>{lot.numero}</td>
              <td>{TYPES_LOT.find(t => t.value === lot.type)?.label}</td>
              <td>
                {lot.estPrincipal ? (
                  <span className={styles.badge}>Oui</span>
                ) : (
                  <span className={styles.badgeSecondary}>Non</span>
                )}
              </td>
              <td>{getCoproprietaireNom(lot.coproprietaireId)}</td>
              <td>{lot.tantiemesGeneraux}</td>
              {clesRepartition.filter(c => c.nom !== 'Charges generales').map(cle => (
                <td key={cle.id}>{lot.autresCles[cle.nom] || 0}</td>
              ))}
              <td>
                <div className={styles.actions}>
                  <button
                    onClick={() => onModifier(lot)}
                    className={styles.actionBtn}
                    title="Modifier"
                  >
                    ✏
                  </button>
                  <button
                    onClick={() => onSupprimer(lot.id)}
                    className={styles.actionBtn}
                    title="Supprimer"
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

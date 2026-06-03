'use client';

import { useCallback } from 'react';
import styles from './SoldesParLotTable.module.css';

export type LotCol = 'current' | 'works' | 'alur' | 'avance';

export interface LotRow {
  id: string;
  ref: string;
  ownerName: string | null;
}

interface SoldesParLotTableProps {
  lots: LotRow[];
  /** clé = `${lotId}:${col}` -> valeur texte saisie */
  values: Record<string, string>;
  onChange: (lotId: string, col: LotCol, value: string) => void;
}

const COLS: { key: LotCol; label: string; sub: string }[] = [
  { key: 'current', label: 'Courant', sub: '450-1' },
  { key: 'works', label: 'Travaux', sub: '450-2' },
  { key: 'alur', label: 'Fonds ALUR', sub: '450-5' },
  { key: 'avance', label: 'Avance', sub: '103' },
];

export function SoldesParLotTable({ lots, values, onChange }: SoldesParLotTableProps) {
  const cellClass = useCallback((raw: string) => {
    const v = parseFloat(raw) || 0;
    return v > 0 ? styles.positive : v < 0 ? styles.negative : '';
  }, []);

  if (lots.length === 0) {
    return <div className={styles.empty}>Aucun lot trouvé pour cette copropriété.</div>;
  }

  return (
    <table className={styles.table}>
      <thead className={styles.head}>
        <tr>
          <th className={styles.th}>Lot</th>
          <th className={styles.th}>Propriétaire</th>
          {COLS.map(c => (
            <th key={c.key} className={styles.thRight}>
              {c.label} <span className={styles.thSub}>({c.sub})</span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {lots.map(lot => (
          <tr key={lot.id} className={styles.tr}>
            <td className={styles.tdRef}>{lot.ref}</td>
            <td className={styles.tdOwner}>{lot.ownerName || '—'}</td>
            {COLS.map(c => {
              const k = `${lot.id}:${c.key}`;
              const raw = values[k] || '';
              return (
                <td key={c.key} className={styles.tdInput}>
                  <input
                    className={`${styles.input} ${cellClass(raw)}`}
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={raw}
                    onChange={e => onChange(lot.id, c.key, e.target.value)}
                  />
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

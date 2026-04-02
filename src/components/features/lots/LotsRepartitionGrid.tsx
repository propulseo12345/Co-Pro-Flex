'use client';

import { useCallback } from 'react';
import { Edit } from 'lucide-react';
import type { GridKeyColumn, GridRow } from '@/hooks/modules/useLotsRepartitionGrid';
import type { LotWithOwner } from '@/lib/lots/api';
import styles from './LotsRepartitionGrid.module.css';

const LOT_TYPE_LABELS: Record<string, string> = {
  appartement: 'Appart.', studio: 'Studio', parking: 'Parking',
  cave: 'Cave', local_commercial: 'Commerce', bureau: 'Bureau',
  garage: 'Garage', box: 'Box', autre: 'Autre',
};

const TYPE_BADGE_CLASS: Record<string, string> = {
  parking: styles.badgeBlue,
  cave: styles.badgeDim,
  garage: styles.badgeDim,
  box: styles.badgeDim,
};

interface LotsRepartitionGridProps {
  rows: GridRow[];
  keyColumns: GridKeyColumn[];
  onEditLot: (lot: LotWithOwner) => void;
  onEditKey: (key: GridKeyColumn) => void;
  onUpdateWeight: (keyId: string, lotId: string, weight: number) => void;
}

export function LotsRepartitionGrid({ rows, keyColumns, onEditLot, onEditKey, onUpdateWeight }: LotsRepartitionGridProps) {

  const handleWeightBlur = useCallback((keyId: string, lotId: string, originalWeight: number, e: React.FocusEvent<HTMLInputElement>) => {
    const newWeight = parseInt(e.target.value, 10);
    if (!isNaN(newWeight) && newWeight !== originalWeight) {
      onUpdateWeight(keyId, lotId, newWeight);
    }
  }, [onUpdateWeight]);

  // Compute column totals
  const columnTotals = keyColumns.map(col => {
    const total = rows.reduce((sum, row) => sum + (row.weights[col.key_id]?.weight || 0), 0);
    const lotsWithWeight = rows.filter(row => (row.weights[col.key_id]?.weight || 0) > 0).length;
    return { total, lotsWithWeight, totalLots: rows.length };
  });

  const totalTantiemes = rows.reduce((sum, row) => sum + row.lot.tantiemes_generaux, 0);

  return (
    <div className={styles.grid}>
      <div className={styles.gridScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: 70 }}>Réf</th>
              <th style={{ width: 100 }}>Type</th>
              <th style={{ width: 160 }}>Propriétaire</th>
              <th className={styles.colTantiemes}>Tantièmes</th>

              {keyColumns.map(col => (
                <th key={col.key_id} className={styles.keyHeader} onClick={() => onEditKey(col)}>
                  <div className={styles.keyHeaderContent}>
                    <span className={styles.keyDot} style={{ background: col.color }} />
                    <span className={styles.keyHeaderName}>{col.name}</span>
                    <span className={styles.keyHeaderEdit}>✏</span>
                  </div>
                  <span className={`${styles.keyHeaderStatus} ${col.is_complete ? styles.statusOk : styles.statusWarn}`}>
                    {col.lots_with_weight_count}/{col.lots_count} lots
                  </span>
                </th>
              ))}

              <th style={{ width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.lot.id}>
                <td><span className={styles.cellRef}>{row.lot.ref}</span></td>
                <td>
                  <span className={TYPE_BADGE_CLASS[row.lot.type || ''] || styles.badge}>
                    {row.lot.type ? LOT_TYPE_LABELS[row.lot.type] || row.lot.type : '-'}
                  </span>
                </td>
                <td>
                  <div className={styles.cellOwner}>{row.lot.owner_display_name || '—'}</div>
                </td>
                <td className={styles.cellTantiemes}>{row.lot.tantiemes_generaux}</td>

                {keyColumns.map(col => {
                  const data = row.weights[col.key_id];
                  const w = data?.weight || 0;
                  const pct = data?.share_pct || 0;
                  return (
                    <td key={col.key_id} className={styles.keyCell}>
                      <div className={styles.keyValueWrap}>
                        <input
                          className={w === 0 ? styles.weightInputZero : styles.weightInput}
                          type="number"
                          defaultValue={w}
                          onBlur={(e) => handleWeightBlur(col.key_id, row.lot.id, w, e)}
                        />
                        <span className={w === 0 ? styles.emptyDash : styles.weightPct}>
                          {w === 0 ? '—' : `${pct.toFixed(1)}%`}
                        </span>
                      </div>
                    </td>
                  );
                })}

                <td className={styles.rowActions}>
                  <button className={styles.rowEditBtn} title="Modifier le lot" onClick={() => onEditLot(row.lot)}>
                    <Edit size={14} />
                  </button>
                </td>
              </tr>
            ))}

            {/* Total row */}
            <tr className={styles.totalRow}>
              <td className={styles.totalLabel} colSpan={3}>Total</td>
              <td className={styles.cellTantiemes} style={{ fontSize: 15, color: 'var(--success)' }}>
                {totalTantiemes.toLocaleString('fr-FR')}
              </td>
              {columnTotals.map((ct, idx) => {
                const isComplete = ct.lotsWithWeight === ct.totalLots;
                const color = isComplete ? 'var(--success)' : 'var(--warning)';
                return (
                  <td key={keyColumns[idx].key_id} className={styles.keyCell}>
                    <div className={styles.keyValueWrap}>
                      <span className={styles.totalNum} style={{ color }}>
                        {ct.total.toLocaleString('fr-FR')}
                      </span>
                      <span className={styles.totalSub} style={{ color }}>
                        {ct.lotsWithWeight}/{ct.totalLots}{isComplete ? ' ✓' : ''}
                      </span>
                    </div>
                  </td>
                );
              })}
              <td />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

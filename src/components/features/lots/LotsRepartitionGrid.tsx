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
  /** Clé générale (tantièmes) : rend la colonne TANTIÈMES éditable, source unique. */
  generalKeyId?: string | null;
  onEditLot: (lot: LotWithOwner) => void;
  onEditKey: (key: GridKeyColumn) => void;
  onUpdateWeight: (keyId: string, lotId: string, weight: number) => void;
}

export function LotsRepartitionGrid({ rows, keyColumns, generalKeyId, onEditLot, onEditKey, onUpdateWeight }: LotsRepartitionGridProps) {

  const handleWeightBlur = useCallback((keyId: string, lotId: string, originalWeight: number, e: React.FocusEvent<HTMLInputElement>) => {
    const newWeight = parseInt(e.target.value, 10);
    if (!isNaN(newWeight) && newWeight !== originalWeight) {
      onUpdateWeight(keyId, lotId, newWeight);
    }
  }, [onUpdateWeight]);

  // Total tantièmes = somme de la clé générale (source unique) si dispo, sinon la vue.
  const totalTantiemes = rows.reduce(
    (sum, row) => sum + (generalKeyId ? (row.weights[generalKeyId]?.weight ?? 0) : row.lot.tantiemes_generaux),
    0
  );

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
            {rows.map(row => {
              // Tantièmes = poids de la clé générale (source unique) si dispo, sinon la vue.
              const genWeight = generalKeyId
                ? (row.weights[generalKeyId]?.weight ?? row.lot.tantiemes_generaux)
                : row.lot.tantiemes_generaux;
              return (
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
                <td className={styles.cellTantiemes}>
                  {generalKeyId ? (
                    <input
                      key={`gen-${row.lot.id}-${genWeight}`}
                      className={styles.tantiemesInput}
                      type="number"
                      aria-label={`Tantièmes ${row.lot.ref}`}
                      defaultValue={genWeight}
                      onBlur={(e) => handleWeightBlur(generalKeyId, row.lot.id, genWeight, e)}
                    />
                  ) : genWeight}
                </td>

                {keyColumns.map(col => {
                  const data = row.weights[col.key_id];
                  const w = data?.weight || 0;
                  const pct = data?.share_pct || 0;
                  return (
                    <td key={col.key_id} className={styles.keyCell}>
                      <div className={styles.keyValueWrap}>
                        <input
                          /* key indexée sur le poids committé : force le remount
                             quand la valeur change après coup (création/seed/refresh),
                             sinon l'input non contrôlé garderait sa valeur initiale. */
                          key={`${col.key_id}-${w}`}
                          className={w === 0 ? styles.weightInputZero : styles.weightInput}
                          type="number"
                          aria-label={`${col.name} ${row.lot.ref}`}
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
              );
            })}

            {/* Total row */}
            <tr className={styles.totalRow}>
              <td className={styles.totalLabel} colSpan={3}>Total</td>
              <td className={styles.cellTantiemes} style={{ fontSize: 15, color: 'var(--success)' }}>
                {totalTantiemes.toLocaleString('fr-FR')}
              </td>
              {keyColumns.map(col => {
                const color = col.is_complete ? 'var(--success)' : 'var(--warning)';
                return (
                  <td key={col.key_id} className={styles.keyCell}>
                    <div className={styles.keyValueWrap}>
                      <span className={styles.totalNum} style={{ color }}>
                        {col.total_weight.toLocaleString('fr-FR')}
                      </span>
                      <span className={styles.totalSub} style={{ color }}>
                        {col.lots_with_weight_count}/{col.lots_count}{col.is_complete ? ' ✓' : ''}
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

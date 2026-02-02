'use client';

import { Home, Check, X, Edit2 } from 'lucide-react';
import type { LotWithOwner } from '@/hooks/modules/useLotsData';
import styles from '@/app/(dashboard)/finance/tantiemes/tantiemes.module.css';

interface EditValues {
  ref: string;
  tantiemes: number;
}

interface LotsTableProps {
  lots: LotWithOwner[];
  totalTantiemes: number;
  isManager: boolean;
  editingId: string | null;
  editValues: EditValues;
  isMutating: boolean;
  onEdit: (lot: LotWithOwner) => void;
  onSave: (lotId: string) => void;
  onCancel: () => void;
  onRefChange: (value: string) => void;
  onTantiemesChange: (value: number) => void;
}

export function LotsTable({
  lots,
  totalTantiemes,
  isManager,
  editingId,
  editValues,
  isMutating,
  onEdit,
  onSave,
  onCancel,
  onRefChange,
  onTantiemesChange,
}: LotsTableProps) {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Lot</th>
            <th>Type</th>
            <th>Propriétaire</th>
            <th>Tantièmes</th>
            <th>%</th>
            {isManager && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {lots.map(lot => (
            <tr key={lot.id}>
              <td>
                <div className={styles.lotCell}>
                  <Home size={16} className={styles.lotIcon} />
                  {editingId === lot.id ? (
                    <input
                      type="text"
                      value={editValues.ref}
                      onChange={e => onRefChange(e.target.value)}
                      className={styles.input}
                    />
                  ) : (
                    <span>{lot.ref}</span>
                  )}
                </div>
              </td>
              <td>
                <span className={styles.typeBadge}>
                  {lot.type || 'N/A'}
                </span>
              </td>
              <td>{lot.owner_display_name || <span className={styles.noOwner}>Sans propriétaire</span>}</td>
              <td>
                {editingId === lot.id ? (
                  <input
                    type="number"
                    value={editValues.tantiemes}
                    onChange={e => onTantiemesChange(parseInt(e.target.value) || 0)}
                    className={styles.input}
                    min="0"
                  />
                ) : (
                  <strong>{lot.tantiemes_generaux.toLocaleString('fr-FR')}</strong>
                )}
              </td>
              <td>
                {totalTantiemes > 0
                  ? `${((lot.tantiemes_generaux / totalTantiemes) * 100).toFixed(2)}%`
                  : '-'}
              </td>
              {isManager && (
                <td>
                  <div className={styles.actions}>
                    {editingId === lot.id ? (
                      <>
                        <button
                          className={styles.actionBtn}
                          onClick={() => onSave(lot.id)}
                          title="Enregistrer"
                          disabled={isMutating}
                        >
                          <Check size={16} aria-hidden="true" />
                        </button>
                        <button
                          className={styles.actionBtn}
                          onClick={onCancel}
                          title="Annuler"
                        >
                          <X size={16} aria-hidden="true" />
                        </button>
                      </>
                    ) : (
                      <button
                        className={styles.actionBtn}
                        onClick={() => onEdit(lot)}
                        title="Modifier"
                      >
                        <Edit2 size={16} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className={styles.totalRow}>
            <td colSpan={3}><strong>Total</strong></td>
            <td><strong>{totalTantiemes.toLocaleString('fr-FR')}</strong></td>
            <td><strong>100%</strong></td>
            {isManager && <td></td>}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

'use client';

import { SquareCheck, Square, X } from 'lucide-react';
import styles from '../../../../../app/(dashboard)/ventes-impayes/impayes/impayes.module.css';

interface SelectionBarProps {
  selectedCount: number;
  totalCount: number;
  onToggleSelectAll: () => void;
  onClearSelection: () => void;
}

export function SelectionBar({ selectedCount, totalCount, onToggleSelectAll, onClearSelection }: SelectionBarProps) {
  return (
    <div className={styles.selectionBar}>
      <button className={styles.selectAllBtn} onClick={onToggleSelectAll}>
        {selectedCount === totalCount && totalCount > 0 ? (
          <SquareCheck size={18} aria-hidden="true" />
        ) : (
          <Square size={18} aria-hidden="true" />
        )}
        <span>{selectedCount === 0 ? 'Tout sélectionner' : `${selectedCount} dossier(s) sélectionné(s)`}</span>
      </button>
      {selectedCount > 0 && (
        <button className={styles.clearSelectionBtn} onClick={onClearSelection}>
          <X size={14} aria-hidden="true" />
          Désélectionner
        </button>
      )}
    </div>
  );
}

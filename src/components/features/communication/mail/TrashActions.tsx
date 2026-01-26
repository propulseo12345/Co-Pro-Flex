'use client';

import { Trash2 } from 'lucide-react';
import styles from './mail-components.module.css';

interface TrashActionsProps {
  trashCount: number;
  onEmptyTrash: () => void;
}

export function TrashActions({ trashCount, onEmptyTrash }: TrashActionsProps) {
  if (trashCount === 0) return null;

  return (
    <div className={styles.trashActions}>
      <span className={styles.trashInfo}>
        Les mails sont conservés 30 jours avant suppression automatique
      </span>
      <button className="btn btn-danger btn-sm" onClick={onEmptyTrash}>
        <Trash2 size={14} style={{ marginRight: 6 }} aria-hidden="true" />
        Vider la corbeille
      </button>
    </div>
  );
}

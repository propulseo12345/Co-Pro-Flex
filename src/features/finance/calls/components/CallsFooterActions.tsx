'use client';

import { RotateCcw } from 'lucide-react';
import styles from '@/app/(dashboard)/finance/calls/calls.module.css';

interface CallsFooterActionsProps {
  onCancelLastCall: () => void;
}

export function CallsFooterActions({ onCancelLastCall }: CallsFooterActionsProps) {
  return (
    <div className={styles.footerActions}>
      <button
        className="btn btn-secondary"
        onClick={onCancelLastCall}
      >
        <RotateCcw size={16} style={{ marginRight: 8 }} aria-hidden="true" />
        Annuler la génération du dernier appel de fonds
      </button>
    </div>
  );
}

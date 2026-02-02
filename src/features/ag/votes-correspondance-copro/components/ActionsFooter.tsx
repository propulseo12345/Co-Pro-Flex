'use client';

import { Save, Check } from 'lucide-react';
import styles from '@/app/(dashboard)/ag/[id]/votes-correspondance/[coproId]/votes-correspondance.module.css';

interface ActionsFooterProps {
  isSaving: boolean;
  onSave: () => void;
  onValidate: () => void;
}

export function ActionsFooter({ isSaving, onSave, onValidate }: ActionsFooterProps) {
  return (
    <div className={styles.actions}>
      <button onClick={onSave} className="btn btn-secondary" disabled={isSaving}>
        <Save size={16} aria-hidden="true" />
        {isSaving ? 'Sauvegarde...' : 'Sauvegarder le brouillon'}
      </button>
      <button onClick={onValidate} className="btn btn-primary" disabled={isSaving}>
        <Check size={16} aria-hidden="true" />
        {isSaving ? 'Validation...' : 'Valider le vote'}
      </button>
    </div>
  );
}

'use client';

import { Save } from 'lucide-react';
import styles from '@/app/(dashboard)/finance/factures/new/new-facture.module.css';

interface FormActionsProps {
  isSubmitting: boolean;
  onCancel: () => void;
}

export function FormActions({ isSubmitting, onCancel }: FormActionsProps) {
  return (
    <div className={styles.formActions}>
      <button
        type="button"
        className={styles.cancelButton}
        onClick={onCancel}
        disabled={isSubmitting}
      >
        Annuler
      </button>
      <button
        type="submit"
        className={styles.submitButton}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <div className={styles.spinner} />
            Enregistrement...
          </>
        ) : (
          <>
            <Save size={20} aria-hidden="true" />
            Enregistrer la facture
          </>
        )}
      </button>
    </div>
  );
}

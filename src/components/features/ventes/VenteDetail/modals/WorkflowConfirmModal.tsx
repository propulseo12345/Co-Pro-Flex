'use client';

import { X, AlertTriangle, Check, Loader2 } from 'lucide-react';
import { useId } from 'react';
import styles from '../VenteDetail.module.css';

interface WorkflowConfirmModalProps {
  step: string;
  onClose: () => void;
  onConfirm: () => void;
  isProcessing: boolean;
}

const STEP_CONFIG: Record<string, { title: string; description: string; warning: string }> = {
  generation: {
    title: 'Générer les documents',
    description: 'Les documents obligatoires seront générés automatiquement.',
    warning: 'Assurez-vous que toutes les informations sont correctes.'
  },
  signature: {
    title: 'Valider les signatures',
    description: 'Tous les documents en attente seront marqués comme signés.',
    warning: 'Cette action est irréversible.'
  },
  transmission: {
    title: 'Transmettre au notaire',
    description: 'Les documents seront envoyés au notaire par email.',
    warning: 'Vérifiez l\'adresse email du notaire avant de continuer.'
  },
  notification: {
    title: 'Envoyer la notification Art. 6',
    description: 'La notification légale sera envoyée pour finaliser la vente.',
    warning: 'Cette action finalise le processus de vente.'
  }
};

export function WorkflowConfirmModal({
  step,
  onClose,
  onConfirm,
  isProcessing
}: WorkflowConfirmModalProps) {
  const config = STEP_CONFIG[step] || STEP_CONFIG.generation;
  const titleId = useId();

  return (
    <div className={styles.modalOverlay} aria-hidden="true" onClick={onClose}>
      <div
        className={styles.modalContent}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className={styles.modalHeader}>
          <h3 id={titleId}>{config.title}</h3>
          <button onClick={onClose} className={styles.closeBtn} disabled={isProcessing} aria-label="Fermer">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.modalBody}>
          <p>{config.description}</p>
          <div className={styles.warning} role="alert">
            <AlertTriangle size={16} aria-hidden="true" />
            {config.warning}
          </div>
        </div>

        <div className={styles.modalActions}>
          <button className="btn btn-secondary" onClick={onClose} disabled={isProcessing}>
            Annuler
          </button>
          <button className="btn btn-primary" onClick={onConfirm} disabled={isProcessing} aria-busy={isProcessing}>
            {isProcessing ? (
              <>
                <Loader2 size={16} className={styles.spinner} aria-hidden="true" />
                Traitement...
              </>
            ) : (
              <>
                <Check size={16} style={{ marginRight: 8 }} aria-hidden="true" />
                Confirmer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

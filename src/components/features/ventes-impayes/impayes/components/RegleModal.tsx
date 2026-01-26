'use client';

import { X, CheckCircle2 } from 'lucide-react';
import type { Impaye } from '../domain/types';
import styles from '../../../../../app/(dashboard)/ventes-impayes/impayes/impayes.module.css';

interface RegleModalProps {
  isOpen: boolean;
  impaye: Impaye | null;
  isProcessing: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function RegleModal({ isOpen, impaye, isProcessing, onClose, onConfirm }: RegleModalProps) {
  if (!isOpen || !impaye) return null;

  return (
    <div className={styles.modalOverlay} aria-hidden="true" onClick={() => !isProcessing && onClose()}>
      <div className={styles.modalSmall} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Marquer comme réglé</h2>
          <button className={styles.closeBtn} onClick={onClose} disabled={isProcessing}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.modalContent}>
          <div className={styles.confirmContent}>
            <div className={styles.confirmIcon}>
              <CheckCircle2 size={48} aria-hidden="true" />
            </div>
            <p>
              Confirmez-vous que l'impayé de <strong>{impaye.coproprietaire.nom}</strong> d'un montant de{' '}
              <strong>{impaye.montant.toLocaleString('fr-FR')} €</strong> a été réglé ?
            </p>
            <p className={styles.confirmSubtext}>Cette action déplacera l'impayé dans les dossiers clôturés.</p>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className="btn btn-secondary" onClick={onClose} disabled={isProcessing}>
            Annuler
          </button>
          <button className="btn btn-success" onClick={onConfirm} disabled={isProcessing}>
            {isProcessing ? (
              <>
                <span className={styles.spinner} />
                Traitement...
              </>
            ) : (
              <>
                <CheckCircle2 size={16} aria-hidden="true" />
                Confirmer le règlement
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

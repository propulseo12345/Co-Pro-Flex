'use client';

import styles from '@/app/(dashboard)/ventes-impayes/ventes/[id]/detail-vente.module.css';

interface SignatureModalProps {
  signatureDate: string;
  onSignatureDateChange: (date: string) => void;
  onConfirm: () => void;
  onClose: () => void;
  isProcessing: boolean;
}

export function SignatureModal({
  signatureDate,
  onSignatureDateChange,
  onConfirm,
  onClose,
  isProcessing,
}: SignatureModalProps) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3>Marquer l&apos;acte comme signé</h3>
        <div className={styles.modalField}>
          <label htmlFor="signatureDate">Date de signature</label>
          <input
            id="signatureDate"
            type="date"
            value={signatureDate}
            onChange={(e) => onSignatureDateChange(e.target.value)}
          />
        </div>
        <div className={styles.modalActions}>
          <button className="btn btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button
            className="btn btn-primary"
            onClick={onConfirm}
            disabled={isProcessing}
          >
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}

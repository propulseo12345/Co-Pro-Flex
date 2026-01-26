'use client';

import { RefreshCw, CheckCircle } from 'lucide-react';
import type { ExtractedSignataire } from '@/lib/utils/variable-resolution';
import styles from '../../../../app/(dashboard)/ag/[id]/pv/pv.module.css';

interface AutoFillConfirmModalProps {
  isOpen: boolean;
  autoFillData: ExtractedSignataire[];
  onClose: () => void;
  onApply: (data: ExtractedSignataire[]) => void;
}

export function AutoFillConfirmModal({ isOpen, autoFillData, onClose, onApply }: AutoFillConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={styles.confirmModalHeader}>
          <h3>Confirmer le pré-remplissage</h3>
        </div>
        <p className={styles.confirmModalText}>
          Des données existent déjà pour certains signataires. Voulez-vous les remplacer avec les informations de l'AG ?
        </p>
        <div className={styles.previewData}>
          {autoFillData.map((d, i) => (
            <div key={i} className={styles.previewItem}>
              <span className={styles.previewRole}>{d.roleLabel}</span>
              <span className={styles.previewName}>{d.name || "Non défini dans l'AG"}</span>
              {d.coproprietaire && (
                <span className={styles.foundBadge}>
                  <CheckCircle size={12} aria-hidden="true" />
                  Trouvé
                </span>
              )}
            </div>
          ))}
        </div>
        <div className={styles.confirmActions}>
          <button onClick={onClose} className="btn btn-secondary">
            Annuler
          </button>
          <button onClick={() => onApply(autoFillData)} className="btn btn-primary">
            <RefreshCw size={16} aria-hidden="true" />
            Remplacer les données
          </button>
        </div>
      </div>
    </div>
  );
}

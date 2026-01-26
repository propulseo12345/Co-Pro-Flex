'use client';

import { X, Send } from 'lucide-react';
import styles from '../../../app/(dashboard)/ventes-impayes/ventes-impayes.module.css';

interface RelanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
}

export function RelanceModal({ isOpen, onClose, selectedCount }: RelanceModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} aria-hidden="true" onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={styles.modalHeader}>
          <h3>Planifier les relances</h3>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className={styles.modalContent}>
          <div className={styles.relanceOptions}>
            <div className={styles.relanceOption}>
              <h4>Relances automatiques</h4>
              <p>Configurer l'envoi automatique de relances selon les délais définis</p>
              <div className={styles.relanceSettings}>
                <label>
                  <input type="checkbox" defaultChecked /> Relance 1 après 30 jours
                </label>
                <label>
                  <input type="checkbox" defaultChecked /> Relance 2 après 60 jours
                </label>
                <label>
                  <input type="checkbox" /> Passage contentieux après 90 jours
                </label>
              </div>
            </div>
            <div className={styles.relanceOption}>
              <h4>Relance immédiate</h4>
              <p>Envoyer une relance maintenant aux impayés sélectionnés</p>
              {selectedCount > 0 ? (
                <p className={styles.selectionInfo}>
                  <strong>{selectedCount}</strong> impayé(s) sélectionné(s)
                </p>
              ) : (
                <p className={styles.noSelection}>
                  Aucun impayé sélectionné. Retournez à la liste pour en sélectionner.
                </p>
              )}
            </div>
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.secondaryButton} onClick={onClose}>
            Annuler
          </button>
          <button className={styles.primaryButton} disabled={selectedCount === 0}>
            <Send size={16} aria-hidden="true" />
            Envoyer les relances
          </button>
        </div>
      </div>
    </div>
  );
}

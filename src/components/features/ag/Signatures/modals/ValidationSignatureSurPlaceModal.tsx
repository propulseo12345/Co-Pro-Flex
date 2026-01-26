'use client';

import { useState, useId, useRef, useEffect } from 'react';
import { X, FileSignature, MapPin, Calendar, CheckCircle } from 'lucide-react';
import { SignatairePV, LABELS_TYPE_SIGNATAIRE } from '@/types/models/pv-signature';
import styles from './ValidationSignatureSurPlaceModal.module.css';

interface ValidationSignatureSurPlaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onValider: (options: { lieuSignature?: string; dateSignature?: Date }) => Promise<void>;
  signataires: SignatairePV[];
}

export function ValidationSignatureSurPlaceModal({
  isOpen,
  onClose,
  onValider,
  signataires,
}: ValidationSignatureSurPlaceModalProps) {
  const titleId = useId();
  const modalRef = useRef<HTMLDivElement>(null);

  const [lieuSignature, setLieuSignature] = useState('');
  const [dateSignature, setDateSignature] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Focus trap
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      firstElement?.focus();
    }
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onValider({
        lieuSignature: lieuSignature || undefined,
        dateSignature: dateSignature ? new Date(dateSignature) : new Date(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        ref={modalRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <div className={styles.headerIcon}>
            <FileSignature size={24} aria-hidden="true" />
          </div>
          <h2 id={titleId}>Valider les signatures physiques</h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Fermer"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className={styles.content}>
          <p className={styles.description}>
            Vous confirmez que les signataires suivants ont signé physiquement le procès-verbal :
          </p>

          {/* Liste des signataires */}
          <ul className={styles.signatairesListe}>
            {signataires.map(s => (
              <li key={s.id}>
                <CheckCircle size={16} className={styles.checkIcon} aria-hidden="true" />
                <span>{s.prenom} {s.nom}</span>
                <span className={styles.roleTag}>{LABELS_TYPE_SIGNATAIRE[s.type]}</span>
              </li>
            ))}
          </ul>

          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Lieu de signature (optionnel) */}
            <div className={styles.field}>
              <label htmlFor="lieu">
                <MapPin size={14} aria-hidden="true" />
                Lieu de signature (optionnel)
              </label>
              <input
                id="lieu"
                type="text"
                value={lieuSignature}
                onChange={(e) => setLieuSignature(e.target.value)}
                placeholder="Ex: Salle des fêtes, 10 rue de la Mairie"
              />
            </div>

            {/* Date de signature */}
            <div className={styles.field}>
              <label htmlFor="date">
                <Calendar size={14} aria-hidden="true" />
                Date de signature
              </label>
              <input
                id="date"
                type="date"
                value={dateSignature}
                onChange={(e) => setDateSignature(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Info */}
            <div className={styles.info}>
              <p>
                Vous pourrez scanner et archiver le PV signé ultérieurement.
              </p>
            </div>

            {/* Actions */}
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={onClose}
              >
                Annuler
              </button>
              <button
                type="submit"
                className={styles.submitBtn}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Validation...' : 'Valider les signatures'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

'use client';

import { X, Mail, Paperclip, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { OrdreService } from '@/types';
import styles from './EmailPreviewModal.module.css';

interface EmailPreviewModalProps {
  ordreService: OrdreService;
  onClose: () => void;
  onSend?: () => void;
}

export default function EmailPreviewModal({
  ordreService,
  onClose,
  onSend
}: EmailPreviewModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const emailContent = `À: ${ordreService.fournisseurEmail}\nObjet: ${ordreService.emailObjet}\n\n${ordreService.emailCorps}`;
    navigator.clipboard.writeText(emailContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.overlay} aria-hidden="true" onClick={handleBackdropClick}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <Mail size={20} aria-hidden="true" />
            <h2>Prévisualisation de l'email</h2>
          </div>
          <button
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Fermer"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Email content */}
        <div className={styles.content}>
          {/* Email header */}
          <div className={styles.emailHeader}>
            <div className={styles.emailField}>
              <span className={styles.emailLabel}>À :</span>
              <span className={styles.emailValue}>
                {ordreService.fournisseurNom} &lt;{ordreService.fournisseurEmail}&gt;
              </span>
            </div>
            {ordreService.fournisseurTelephone && (
              <div className={styles.emailField}>
                <span className={styles.emailLabel}>Tél :</span>
                <span className={styles.emailValue}>{ordreService.fournisseurTelephone}</span>
              </div>
            )}
            <div className={styles.emailField}>
              <span className={styles.emailLabel}>Objet :</span>
              <span className={styles.emailValue}>{ordreService.emailObjet}</span>
            </div>
          </div>

          {/* Email body */}
          <div className={styles.emailBody}>
            <pre className={styles.emailText}>{ordreService.emailCorps}</pre>
          </div>

          {/* Attachments */}
          {ordreService.piecesJointes.length > 0 && (
            <div className={styles.attachments}>
              <div className={styles.attachmentsHeader}>
                <Paperclip size={16} aria-hidden="true" />
                <span>
                  {ordreService.piecesJointes.length} pièce{ordreService.piecesJointes.length > 1 ? 's' : ''} jointe{ordreService.piecesJointes.length > 1 ? 's' : ''}
                </span>
              </div>
              <ul className={styles.attachmentsList}>
                {ordreService.piecesJointes.map((piece) => (
                  <li key={piece.id} className={styles.attachmentItem}>
                    <span>{piece.nom}</span>
                    <span className={styles.attachmentSize}>{piece.taille}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Info box */}
          <div className={styles.infoBox}>
            <p>
              <strong>Note :</strong> Il s'agit d'une prévisualisation. L'email ne sera pas réellement envoyé (mockup).
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button
            onClick={handleCopy}
            className={`${styles.button} ${styles.buttonSecondary}`}
          >
            {copied ? (
              <>
                <Check size={16} aria-hidden="true" />
                Copié !
              </>
            ) : (
              <>
                <Copy size={16} aria-hidden="true" />
                Copier le texte
              </>
            )}
          </button>
          <div className={styles.footerActions}>
            <button
              onClick={onClose}
              className={`${styles.button} ${styles.buttonSecondary}`}
            >
              Fermer
            </button>
            {onSend && (
              <button
                onClick={onSend}
                className={`${styles.button} ${styles.buttonPrimary}`}
              >
                <Mail size={16} aria-hidden="true" />
                Envoyer (mockup)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

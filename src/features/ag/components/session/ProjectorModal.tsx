'use client';

import { Monitor, Copy, ExternalLink } from 'lucide-react';
import styles from '../../../../app/(dashboard)/ag/[id]/session/session.module.css';

interface ProjectorModalProps {
  url: string;
  copied: boolean;
  onCopy: () => void;
  onOpenNewTab: () => void;
  onClose: () => void;
}

export function ProjectorModal({ url, copied, onCopy, onOpenNewTab, onClose }: ProjectorModalProps) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.projectorModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.projectorModalHeader}>
          <Monitor size={24} />
          <h2>Mode Projecteur</h2>
        </div>
        <p className={styles.projectorModalDescription}>
          Affichez les votes en temps réel sur un écran ou projecteur.
          Cette vue est read-only et ne permet aucune action.
        </p>
        <div className={styles.projectorUrlContainer}>
          <input
            type="text"
            value={url}
            readOnly
            className={styles.projectorUrlInput}
          />
          <button
            onClick={onCopy}
            className={`btn btn-secondary ${styles.projectorCopyBtn}`}
            title="Copier l'URL"
          >
            <Copy size={16} />
            {copied ? 'Copié !' : 'Copier'}
          </button>
        </div>
        <div className={styles.projectorModalActions}>
          <button onClick={onOpenNewTab} className="btn btn-primary">
            <ExternalLink size={16} />
            Ouvrir dans un nouvel onglet
          </button>
          <button onClick={onClose} className="btn btn-secondary">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

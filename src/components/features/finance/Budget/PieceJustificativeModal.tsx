'use client';

import { useEffect, useId } from 'react';
import {
  X,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  Hash,
} from 'lucide-react';
import {
  PieceJustificative,
  TYPES_PIECES_JUSTIFICATIVES,
  formaterTailleFichier,
  estImage,
  estPDF,
} from '@/types/models/piece-justificative';
import { PieceJustificativeViewer } from './PieceJustificativeViewer';
import styles from './PieceJustificativeModal.module.css';

interface PieceJustificativeModalProps {
  isOpen: boolean;
  piece: PieceJustificative | null;
  pieces?: PieceJustificative[]; // Pour navigation entre plusieurs PJ
  onClose: () => void;
  onTelecharger: (piece: PieceJustificative) => void;
  onOuvrirNouvelOnglet: (piece: PieceJustificative) => void;
  onChangePiece?: (piece: PieceJustificative) => void;
  peutTelecharger?: boolean;
}

/**
 * Formate une date
 */
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function PieceJustificativeModal({
  isOpen,
  piece,
  pieces = [],
  onClose,
  onTelecharger,
  onOuvrirNouvelOnglet,
  onChangePiece,
  peutTelecharger = true,
}: PieceJustificativeModalProps) {
  const titleId = useId();

  // Index courant si plusieurs pièces
  const currentIndex = pieces.findIndex((p) => p.id === piece?.id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < pieces.length - 1;

  // Fermer avec Escape et navigation avec flèches
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      }
      // Navigation avec flèches
      if (e.key === 'ArrowLeft' && hasPrevious && onChangePiece) {
        onChangePiece(pieces[currentIndex - 1]);
      }
      if (e.key === 'ArrowRight' && hasNext && onChangePiece) {
        onChangePiece(pieces[currentIndex + 1]);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, hasPrevious, hasNext, currentIndex, pieces, onChangePiece]);

  // Bloquer le scroll du body
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !piece) return null;

  const typeConfig = TYPES_PIECES_JUSTIFICATIVES[piece.type];
  const isImageFile = estImage(piece.format);
  const isPDFFile = estPDF(piece.format);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            {isPDFFile ? (
              <FileText size={20} className={styles.headerIcon} aria-hidden="true" />
            ) : isImageFile ? (
              <ImageIcon size={20} className={styles.headerIcon} aria-hidden="true" />
            ) : (
              <FileText size={20} className={styles.headerIcon} aria-hidden="true" />
            )}
            <div>
              <h2 id={titleId} className={styles.title}>
                {piece.nomFichier}
              </h2>
              <p className={styles.subtitle}>
                {typeConfig.label} • {formaterTailleFichier(piece.tailleFichier)}
              </p>
            </div>
          </div>

          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Fermer"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        {/* Navigation si plusieurs pièces */}
        {pieces.length > 1 && (
          <div className={styles.navigation}>
            <button
              type="button"
              className={styles.navBtn}
              onClick={() => onChangePiece?.(pieces[currentIndex - 1])}
              disabled={!hasPrevious}
              aria-label="Pièce précédente"
            >
              <ChevronLeft size={20} aria-hidden="true" />
            </button>

            <span className={styles.navIndicator}>
              {currentIndex + 1} / {pieces.length}
            </span>

            <button
              type="button"
              className={styles.navBtn}
              onClick={() => onChangePiece?.(pieces[currentIndex + 1])}
              disabled={!hasNext}
              aria-label="Pièce suivante"
            >
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Contenu - Viewer */}
        <div className={styles.content}>
          <PieceJustificativeViewer piece={piece} />
        </div>

        {/* Métadonnées */}
        <div className={styles.metadata}>
          {piece.reference && (
            <div className={styles.metaItem}>
              <Hash size={14} aria-hidden="true" />
              <span>Réf : {piece.reference}</span>
            </div>
          )}
          {piece.dateDocument && (
            <div className={styles.metaItem}>
              <Calendar size={14} aria-hidden="true" />
              <span>Date doc : {formatDate(piece.dateDocument)}</span>
            </div>
          )}
          {piece.uploadeParNom && (
            <div className={styles.metaItem}>
              <User size={14} aria-hidden="true" />
              <span>Ajouté par {piece.uploadeParNom}</span>
            </div>
          )}
        </div>

        {/* Footer - Actions */}
        <footer className={styles.footer}>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => onOuvrirNouvelOnglet(piece)}
          >
            <ExternalLink size={16} aria-hidden="true" />
            <span>Ouvrir dans un nouvel onglet</span>
          </button>

          {peutTelecharger && (
            <button
              type="button"
              className={styles.downloadBtn}
              onClick={() => onTelecharger(piece)}
            >
              <Download size={16} aria-hidden="true" />
              <span>Télécharger</span>
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

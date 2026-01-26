'use client';

import { useState } from 'react';
import { FileText, Image as ImageIcon, AlertCircle, Loader2 } from 'lucide-react';
import { PieceJustificative, estImage, estPDF } from '@/types/models/piece-justificative';
import { piecesJustificativesService } from '@/lib/services/pieces-justificatives.service';
import styles from './PieceJustificativeViewer.module.css';

interface PieceJustificativeViewerProps {
  piece: PieceJustificative;
}

export function PieceJustificativeViewer({ piece }: PieceJustificativeViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const url = piecesJustificativesService.getUrlVisualisation(piece);
  const isImageFile = estImage(piece.format);
  const isPDFFile = estPDF(piece.format);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  // Erreur de chargement
  if (hasError) {
    return (
      <div className={styles.error}>
        <AlertCircle size={48} aria-hidden="true" />
        <h3>Impossible de charger le fichier</h3>
        <p>Le fichier &quot;{piece.nomFichier}&quot; n&apos;a pas pu être affiché.</p>
        <p className={styles.errorHint}>
          Essayez de le télécharger ou de l&apos;ouvrir dans un nouvel onglet.
        </p>
      </div>
    );
  }

  // PDF
  if (isPDFFile) {
    return (
      <div className={styles.pdfContainer}>
        {isLoading && (
          <div className={styles.loading}>
            <Loader2 size={32} className={styles.spinner} aria-hidden="true" />
            <p>Chargement du PDF...</p>
          </div>
        )}
        <iframe
          src={`${url}#view=FitH`}
          className={styles.pdfViewer}
          title={piece.nomFichier}
          onLoad={handleLoad}
          onError={handleError}
          style={{ opacity: isLoading ? 0 : 1 }}
        />
      </div>
    );
  }

  // Image
  if (isImageFile) {
    return (
      <div className={styles.imageContainer}>
        {isLoading && (
          <div className={styles.loading}>
            <Loader2 size={32} className={styles.spinner} aria-hidden="true" />
            <p>Chargement de l&apos;image...</p>
          </div>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={piece.description || piece.nomFichier}
          className={styles.imageViewer}
          onLoad={handleLoad}
          onError={handleError}
          style={{ opacity: isLoading ? 0 : 1 }}
        />
      </div>
    );
  }

  // Autre type de fichier (non prévisualisable)
  return (
    <div className={styles.unsupported}>
      <FileText size={64} aria-hidden="true" />
      <h3>{piece.nomFichier}</h3>
      <p>Ce type de fichier ne peut pas être prévisualisé.</p>
      <p className={styles.unsupportedHint}>
        Téléchargez-le pour le consulter avec l&apos;application appropriée.
      </p>
    </div>
  );
}

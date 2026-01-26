'use client';

import { useState, useCallback } from 'react';
import {
  Eye, Download, RefreshCw, AlertCircle, Maximize2, Minimize2,
  FileText, Mail, Loader2, Printer,
} from 'lucide-react';
import type { PreviewStatus, PreviewMode } from '@/hooks/modules/useConvocationPreview';
import styles from './ConvocationPreview.module.css';

interface ConvocationPreviewProps {
  status: PreviewStatus;
  pdfUrl: string | null;
  error: string | null;
  previewMode: PreviewMode;
  version: number;
  onRegenerate: () => void;
  onDownload: () => void;
  onModeChange: (mode: PreviewMode) => void;
}

export function ConvocationPreview({
  status,
  pdfUrl,
  error,
  previewMode,
  version,
  onRegenerate,
  onDownload,
  onModeChange,
}: ConvocationPreviewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  const handlePrint = useCallback(() => {
    if (pdfUrl) {
      const printWindow = window.open(pdfUrl, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    }
  }, [pdfUrl]);

  return (
    <div className={`${styles.previewContainer} ${isFullscreen ? styles.fullscreen : ''}`}>
      {/* Header */}
      <div className={styles.previewHeader}>
        <div className={styles.headerLeft}>
          <h3 className={styles.previewTitle}>
            <Eye size={18} aria-hidden="true" />
            Prévisualisation
          </h3>
          <span className={styles.versionBadge}>v{version}</span>
        </div>

        <div className={styles.headerActions}>
          {/* Toggle mode */}
          <div className={styles.modeToggle}>
            <button
              type="button"
              onClick={() => onModeChange('print')}
              className={`${styles.modeBtn} ${previewMode === 'print' ? styles.modeBtnActive : ''}`}
              title="Aperçu impression (A4)"
            >
              <Printer size={14} aria-hidden="true" />
              Impression
            </button>
            <button
              type="button"
              onClick={() => onModeChange('email')}
              className={`${styles.modeBtn} ${previewMode === 'email' ? styles.modeBtnActive : ''}`}
              title="Aperçu email"
            >
              <Mail size={14} aria-hidden="true" />
              Email
            </button>
          </div>

          {/* Actions */}
          <button
            type="button"
            onClick={onRegenerate}
            className={styles.actionBtn}
            disabled={status === 'generating'}
            title="Régénérer l'aperçu"
          >
            <RefreshCw size={14} className={status === 'generating' ? styles.spinning : ''} aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className={styles.actionBtn}
            disabled={!pdfUrl}
            title="Imprimer"
          >
            <Printer size={14} aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={onDownload}
            className={styles.actionBtn}
            disabled={!pdfUrl}
            title="Télécharger PDF"
          >
            <Download size={14} aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className={styles.actionBtn}
            title={isFullscreen ? 'Réduire' : 'Plein écran'}
          >
            {isFullscreen ? <Minimize2 size={14} aria-hidden="true" /> : <Maximize2 size={14} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={styles.previewContent}>
        {status === 'generating' && (
          <div className={styles.loadingState}>
            <Loader2 size={32} className={styles.spinner} aria-hidden="true" />
            <p>Génération du PDF en cours...</p>
          </div>
        )}

        {status === 'error' && (
          <div className={styles.errorState}>
            <AlertCircle size={32} aria-hidden="true" />
            <p className={styles.errorTitle}>Erreur de génération</p>
            <p className={styles.errorMessage}>{error}</p>
            <button type="button" onClick={onRegenerate} className={styles.retryBtn}>
              <RefreshCw size={14} aria-hidden="true" />
              Réessayer
            </button>
          </div>
        )}

        {status === 'idle' && !pdfUrl && (
          <div className={styles.emptyState}>
            <FileText size={48} aria-hidden="true" />
            <p>Aucun aperçu disponible</p>
            <p className={styles.emptyHint}>
              L&apos;aperçu sera généré automatiquement lorsque les données seront disponibles.
            </p>
          </div>
        )}

        {(status === 'ready' || pdfUrl) && pdfUrl && (
          <div className={styles.pdfViewer}>
            {previewMode === 'print' ? (
              <iframe
                src={`${pdfUrl}#toolbar=0&navpanes=0`}
                title="Prévisualisation de la convocation"
                className={styles.pdfIframe}
              />
            ) : (
              <div className={styles.emailPreview}>
                <div className={styles.emailHeader}>
                  <div className={styles.emailField}>
                    <span className={styles.emailLabel}>De :</span>
                    <span>syndic@coproflex.fr</span>
                  </div>
                  <div className={styles.emailField}>
                    <span className={styles.emailLabel}>Objet :</span>
                    <span>Convocation à l&apos;Assemblée Générale</span>
                  </div>
                  <div className={styles.emailField}>
                    <span className={styles.emailLabel}>Pièce jointe :</span>
                    <span className={styles.attachment}>
                      <FileText size={14} aria-hidden="true" />
                      convocation_ag_v{version}.pdf
                    </span>
                  </div>
                </div>
                <div className={styles.emailBody}>
                  <p>Madame, Monsieur,</p>
                  <p>
                    Veuillez trouver ci-joint la convocation à l&apos;Assemblée Générale
                    de votre copropriété.
                  </p>
                  <p>
                    Nous vous prions de bien vouloir prendre connaissance de l&apos;ordre
                    du jour et des documents annexés.
                  </p>
                  <p>Cordialement,<br />Le Syndic</p>
                </div>
                <div className={styles.emailAttachmentPreview}>
                  <iframe
                    src={`${pdfUrl}#toolbar=0&navpanes=0&view=FitH`}
                    title="Aperçu de la pièce jointe"
                    className={styles.emailPdfPreview}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer avec info */}
      {pdfUrl && (
        <div className={styles.previewFooter}>
          <span className={styles.footerInfo}>
            Format A4 • Généré le {new Date().toLocaleDateString('fr-FR')}
          </span>
        </div>
      )}

      {/* Overlay fullscreen close */}
      {isFullscreen && (
        <button
          type="button"
          onClick={toggleFullscreen}
          className={styles.closeFullscreen}
          aria-label="Fermer le plein écran"
        >
          ×
        </button>
      )}
    </div>
  );
}

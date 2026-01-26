'use client';

import { FileText, Eye, FileDown, RefreshCw, AlertCircle, X } from 'lucide-react';
import styles from '../../../../app/(dashboard)/ag/[id]/pv/pv.module.css';

interface PDFSectionProps {
  pdfUrl: string | null;
  isGeneratingPdf: boolean;
  pdfError: string | null;
  onPreview: () => void;
  onDownload: () => void;
  onClosePdf: () => void;
  onDismissError: () => void;
}

export function PDFSection({
  pdfUrl,
  isGeneratingPdf,
  pdfError,
  onPreview,
  onDownload,
  onClosePdf,
  onDismissError,
}: PDFSectionProps) {
  return (
    <div className="card">
      <div className={styles.pvHeader}>
        <h2 className={styles.sectionTitle}>
          <FileText size={24} aria-hidden="true" />
          Procès-verbal officiel
        </h2>
        <div className={styles.pvActions}>
          <button onClick={onPreview} className="btn btn-secondary" disabled={isGeneratingPdf} aria-busy={isGeneratingPdf}>
            {isGeneratingPdf ? (
              <RefreshCw size={16} className={styles.spinning} aria-hidden="true" />
            ) : (
              <Eye size={16} aria-hidden="true" />
            )}
            {isGeneratingPdf ? 'Génération...' : 'Aperçu PDF'}
          </button>
          <button onClick={onDownload} className="btn btn-primary" disabled={isGeneratingPdf} aria-busy={isGeneratingPdf}>
            {isGeneratingPdf ? (
              <RefreshCw size={16} className={styles.spinning} aria-hidden="true" />
            ) : (
              <FileDown size={16} aria-hidden="true" />
            )}
            {isGeneratingPdf ? 'Génération...' : 'Télécharger PDF'}
          </button>
        </div>
      </div>

      {pdfError && (
        <div className={styles.pdfErrorBanner}>
          <AlertCircle size={18} aria-hidden="true" />
          <span>{pdfError}</span>
          <button onClick={onDismissError} className={styles.dismissErrorBtn} aria-label="Fermer le message d'erreur">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      {pdfUrl ? (
        <div className={styles.pdfPreviewContainer}>
          <iframe src={pdfUrl} className={styles.pdfIframe} title="Aperçu du procès-verbal" />
          <button onClick={onClosePdf} className={styles.closePdfButton}>
            <X size={16} aria-hidden="true" />
            Fermer l'aperçu
          </button>
        </div>
      ) : (
        <div className={styles.pdfPlaceholder}>
          <FileText size={48} aria-hidden="true" />
          <p>Cliquez sur "Aperçu PDF" pour visualiser le procès-verbal</p>
          <p className={styles.pdfPlaceholderHint}>Le PDF contient : présences, résolutions votées, résultats et signatures</p>
        </div>
      )}
    </div>
  );
}

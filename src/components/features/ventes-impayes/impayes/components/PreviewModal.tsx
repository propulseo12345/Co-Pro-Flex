'use client';

import { X, FileText, ZoomIn, ZoomOut, Download } from 'lucide-react';
import styles from '../../../../../app/(dashboard)/ventes-impayes/impayes/impayes.module.css';

interface PreviewModalProps {
  isOpen: boolean;
  previewUrl: string | null;
  zoom: number;
  onClose: () => void;
  onZoomChange: (zoom: number) => void;
  onDownload: () => void;
}

export function PreviewModal({ isOpen, previewUrl, zoom, onClose, onZoomChange, onDownload }: PreviewModalProps) {
  if (!isOpen || !previewUrl) return null;

  return (
    <div className={styles.previewOverlay} onClick={onClose}>
      <div className={styles.previewModal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={styles.previewHeader}>
          <div className={styles.previewTitle}>
            <FileText size={20} aria-hidden="true" />
            <h3>Aperçu du document</h3>
          </div>
          <div className={styles.previewActions}>
            <div className={styles.zoomControls}>
              <button onClick={() => onZoomChange(Math.max(50, zoom - 25))} className={styles.zoomBtn} aria-label="Zoom arrière">
                <ZoomOut size={16} aria-hidden="true" />
              </button>
              <span className={styles.zoomValue}>{zoom}%</span>
              <button onClick={() => onZoomChange(Math.min(200, zoom + 25))} className={styles.zoomBtn} aria-label="Zoom avant">
                <ZoomIn size={16} aria-hidden="true" />
              </button>
            </div>
            <button className="btn btn-primary btn-sm" onClick={onDownload}>
              <Download size={14} aria-hidden="true" />
              Télécharger
            </button>
            <button onClick={onClose} className={styles.closeBtn} aria-label="Fermer">
              <X size={20} aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className={styles.previewContent}>
          <iframe
            src={previewUrl}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top center',
            }}
            title="Aperçu du document PDF"
          />
        </div>
      </div>
    </div>
  );
}

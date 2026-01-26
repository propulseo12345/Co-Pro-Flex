'use client';

import { Eye, Download } from 'lucide-react';
import styles from '../../../../app/(dashboard)/ag/[id]/pv/pv.module.css';

interface TextPreviewSectionProps {
  pvText: string;
  isPreviewMode: boolean;
  onTogglePreview: () => void;
  onDownloadPDF: () => void;
}

export function TextPreviewSection({ pvText, isPreviewMode, onTogglePreview, onDownloadPDF }: TextPreviewSectionProps) {
  return (
    <div className="card">
      <div className={styles.pvHeader}>
        <h2 className={styles.sectionTitle}>Aperçu texte (ancien format)</h2>
        <div className={styles.pvActions}>
          <button onClick={onTogglePreview} className="btn btn-secondary">
            <Eye size={16} aria-hidden="true" />
            {isPreviewMode ? 'Masquer' : 'Afficher'}
          </button>
          <button onClick={onDownloadPDF} className="btn btn-secondary">
            <Download size={16} aria-hidden="true" />
            Télécharger PDF
          </button>
        </div>
      </div>

      {isPreviewMode && (
        <div className={styles.pvPreview}>
          <pre className={styles.pvText}>{pvText}</pre>
        </div>
      )}
    </div>
  );
}

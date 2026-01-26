'use client';

import { AlertCircle } from 'lucide-react';
import styles from '@/app/(dashboard)/settings/templates/[id]/editor.module.css';

interface PreviewPanelProps {
  html: string;
  errors: string[];
  onRefresh: () => void;
}

export function PreviewPanel({ html, errors, onRefresh }: PreviewPanelProps) {
  return (
    <div className={styles.previewPanel}>
      <div className={styles.previewHeader}>
        <h3>Aperçu (données de test)</h3>
        <button onClick={onRefresh}>Rafraîchir</button>
      </div>
      {errors.length > 0 && (
        <div className={styles.previewErrors}>
          {errors.map((err, i) => (
            <div key={i} className={styles.previewError}><AlertCircle size={14} />{err}</div>
          ))}
        </div>
      )}
      <div className={styles.previewContent}>
        <iframe srcDoc={html} title="Aperçu du PV" className={styles.previewIframe} />
      </div>
    </div>
  );
}

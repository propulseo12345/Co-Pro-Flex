'use client';

import { XCircle, Monitor, Download } from 'lucide-react';
import styles from '../../../../app/(dashboard)/ag/[id]/session/session.module.css';

interface SessionFooterProps {
  onCancel: () => void;
  onSave: () => void;
  onOpenProjector: () => void;
  onExportCSV: () => void;
}

export function SessionFooter({ onCancel, onSave, onOpenProjector, onExportCSV }: SessionFooterProps) {
  return (
    <div className={styles.footer}>
      <div className={styles.footerLeft}>
        <button onClick={onCancel} className="btn btn-danger">
          <XCircle size={16} aria-hidden="true" />
          Annuler le déroulé
        </button>
      </div>
      <div className={styles.footerRight}>
        <button onClick={onOpenProjector} className="btn btn-secondary">
          <Monitor size={16} aria-hidden="true" />
          Mode projecteur
        </button>
        <button onClick={onExportCSV} className="btn btn-secondary">
          <Download size={16} aria-hidden="true" />
          Exporter CSV
        </button>
      </div>
    </div>
  );
}

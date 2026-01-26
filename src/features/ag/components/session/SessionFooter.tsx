'use client';

import { Pause, Monitor, Download } from 'lucide-react';
import styles from '../../../../app/(dashboard)/ag/[id]/session/session.module.css';

interface SessionFooterProps {
  onPause: () => void;
  onSave: () => void;
  onOpenProjector: () => void;
  onExportCSV: () => void;
}

export function SessionFooter({ onPause, onSave, onOpenProjector, onExportCSV }: SessionFooterProps) {
  return (
    <div className={styles.footer}>
      <div className={styles.footerLeft}>
        <button onClick={onPause} className="btn btn-secondary">
          <Pause size={16} aria-hidden="true" />
          Mettre en pause
        </button>
        <button onClick={onSave} className="btn btn-secondary">
          Sauvegarder la session
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

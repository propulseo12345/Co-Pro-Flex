'use client';

import {
  CheckCircle2,
  FolderInput,
  Archive,
  Download,
  Trash2,
} from 'lucide-react';
import type { TabType } from './MailTabs';
import styles from './mail-components.module.css';

interface BulkActionsBarProps {
  selectedCount: number;
  selectedTab: TabType;
  onMarkAsRead?: () => void;
  onMoveToFolder: () => void;
  onArchive: () => void;
  onExportPDF: () => void;
  onDelete: () => void;
  onRestore?: () => void;
  onPermanentDelete?: () => void;
}

export function BulkActionsBar({
  selectedCount,
  selectedTab,
  onMarkAsRead,
  onMoveToFolder,
  onArchive,
  onExportPDF,
  onDelete,
  onRestore,
  onPermanentDelete,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className={styles.bulkActions}>
      <span>{selectedCount} mail(s) sélectionné(s)</span>
      <div className={styles.bulkButtons}>
        {selectedTab === 'trash' ? (
          <>
            <button className="btn btn-secondary btn-sm" onClick={onRestore}>
              <Archive size={14} style={{ marginRight: 6 }} aria-hidden="true" />
              Restaurer
            </button>
            <button className="btn btn-danger btn-sm" onClick={onPermanentDelete}>
              <Trash2 size={14} style={{ marginRight: 6 }} aria-hidden="true" />
              Supprimer définitivement
            </button>
          </>
        ) : (
          <>
            {selectedTab === 'inbox' && onMarkAsRead && (
              <button className="btn btn-secondary btn-sm" onClick={onMarkAsRead}>
                <CheckCircle2 size={14} style={{ marginRight: 6 }} aria-hidden="true" />
                Marquer comme lu
              </button>
            )}
            <button className="btn btn-secondary btn-sm" onClick={onMoveToFolder}>
              <FolderInput size={14} style={{ marginRight: 6 }} aria-hidden="true" />
              Déplacer
            </button>
            <button className="btn btn-secondary btn-sm" onClick={onArchive}>
              <Archive size={14} style={{ marginRight: 6 }} aria-hidden="true" />
              {selectedTab === 'archived' ? 'Désarchiver' : 'Archiver'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={onExportPDF}>
              <Download size={14} style={{ marginRight: 6 }} aria-hidden="true" />
              Exporter PDF
            </button>
            <button className="btn btn-danger btn-sm" onClick={onDelete}>
              <Trash2 size={14} style={{ marginRight: 6 }} aria-hidden="true" />
              Supprimer
            </button>
          </>
        )}
      </div>
    </div>
  );
}

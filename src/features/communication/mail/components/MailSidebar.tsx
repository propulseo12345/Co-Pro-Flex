'use client';

import {
  Inbox, Send, FileEdit, Archive, Trash2, ShieldAlert,
  Star, Plus, FolderOpen,
} from 'lucide-react';
import type { IMailFolder, IMailLabel } from '@/features/communication/mail/domain/types';
import styles from './MailSidebar.module.css';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

interface MailSidebarProps {
  folders: IMailFolder[];
  labels: IMailLabel[];
  currentFolder: string;
  unreadCount: number;
  onFolderChange: (folder: string) => void;
  onCompose: () => void;
}

// ----------------------------------------------------------------------------
// Icon map
// ----------------------------------------------------------------------------

const ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  Inbox,
  Send,
  FileEdit,
  Archive,
  Trash2,
  ShieldAlert,
  Folder: FolderOpen,
};

function FolderIcon({ icon, size = 16 }: { icon: string; size?: number }) {
  const IconComponent = ICON_MAP[icon] ?? Inbox;
  return <IconComponent size={size} />;
}

// ----------------------------------------------------------------------------
// Composant
// ----------------------------------------------------------------------------

export function MailSidebar({
  folders,
  labels,
  currentFolder,
  unreadCount,
  onFolderChange,
  onCompose,
}: MailSidebarProps) {
  const systemFolders = folders.filter((f) => f.isSystem);
  const customFolders = folders.filter((f) => !f.isSystem);

  return (
    <aside className={styles.sidebar}>
      {/* Bouton Composer */}
      <button className={styles.composeButton} onClick={onCompose} type="button">
        <FileEdit size={16} />
        Nouveau message
      </button>

      {/* Dossiers système */}
      <div className={styles.section}>
        {systemFolders.map((folder) => (
          <button
            key={folder.id}
            type="button"
            className={`${styles.folderItem} ${
              currentFolder === folder.folderType ? styles.folderItemActive : ''
            }`}
            onClick={() => onFolderChange(folder.folderType)}
          >
            <FolderIcon icon={folder.icon} />
            <span className={styles.folderName}>{folder.name}</span>
            {folder.folderType === 'inbox' && unreadCount > 0 && (
              <span className={styles.folderBadge}>{unreadCount}</span>
            )}
          </button>
        ))}

        {/* Favoris (pas un dossier système, un filtre) */}
        <button
          type="button"
          className={`${styles.folderItem} ${
            currentFolder === 'starred' ? styles.folderItemActive : ''
          }`}
          onClick={() => onFolderChange('starred')}
        >
          <Star size={16} />
          <span className={styles.folderName}>Favoris</span>
        </button>
      </div>

      <div className={styles.divider} />

      {/* Labels */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>LABELS</div>
        {labels.map((label) => (
          <button
            key={label.id}
            type="button"
            className={styles.labelItem}
          >
            <span
              className={styles.labelDot}
              style={{ backgroundColor: label.color }}
            />
            <span className={styles.folderName}>{label.name}</span>
          </button>
        ))}
        <button type="button" className={styles.addLabelButton}>
          <Plus size={14} />
          Ajouter un label
        </button>
      </div>

      {/* Dossiers personnalisés */}
      {customFolders.length > 0 && (
        <>
          <div className={styles.divider} />
          <div className={styles.section}>
            <div className={styles.sectionHeader}>DOSSIERS</div>
            {customFolders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                className={styles.folderItem}
                onClick={() => onFolderChange(folder.id)}
              >
                <FolderIcon icon={folder.icon} />
                <span className={styles.folderName}>{folder.name}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Info bas */}
      <div className={styles.bottomInfo}>
        <div className={styles.emailInfo}>copro.haussmann@coproflex.fr</div>
        <div className={styles.storageBar}>
          <div className={styles.storageBarFill} style={{ width: '23%' }} />
        </div>
        <div className={styles.storageText}>0,23 Go sur 1 Go utilisés</div>
      </div>
    </aside>
  );
}

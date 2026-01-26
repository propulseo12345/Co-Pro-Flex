'use client';

import { Mail, Folder, FolderPlus, MoreVertical, Edit3, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import type { MailFolder } from '@/data/mock/mail.mock';
import styles from './mail-components.module.css';

interface MailFolderSidebarProps {
  folders: MailFolder[];
  selectedFolder: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: () => void;
  onRenameFolder: (folder: MailFolder) => void;
  onDeleteFolder: (folder: MailFolder) => void;
  getEmailCountForFolder: (folderId: string) => number;
  folderMenuOpen: string | null;
  onToggleFolderMenu: (folderId: string | null, e: React.MouseEvent) => void;
}

export function MailFolderSidebar({
  folders,
  selectedFolder,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  getEmailCountForFolder,
  folderMenuOpen,
  onToggleFolderMenu,
}: MailFolderSidebarProps) {
  return (
    <aside className={styles.folderSidebar}>
      <div className={styles.folderHeader}>
        <h3>Dossiers</h3>
        <button
          className={styles.addFolderBtn}
          onClick={onCreateFolder}
          title="Créer un dossier"
        >
          <FolderPlus size={18} aria-hidden="true" />
        </button>
      </div>

      <div className={styles.folderList}>
        <button
          className={clsx(styles.folderItem, !selectedFolder && styles.folderItemActive)}
          onClick={() => onSelectFolder(null)}
        >
          <Mail size={16} aria-hidden="true" />
          <span>Tous les mails</span>
        </button>

        {folders.map(folder => (
          <div key={folder.id} className={styles.folderItemWrapper}>
            <button
              className={clsx(
                styles.folderItem,
                selectedFolder === folder.id && styles.folderItemActive
              )}
              onClick={() => onSelectFolder(folder.id)}
            >
              <Folder size={16} style={{ color: folder.color }} aria-hidden="true" />
              <span>{folder.name}</span>
              <span className={styles.folderCount}>
                {getEmailCountForFolder(folder.id)}
              </span>
            </button>

            <button
              className={styles.folderMenuBtn}
              onClick={(e) => onToggleFolderMenu(folder.id, e)}
              title="Options du dossier"
            >
              <MoreVertical size={14} aria-hidden="true" />
            </button>

            {folderMenuOpen === folder.id && (
              <div className={styles.folderMenu}>
                <button onClick={() => onRenameFolder(folder)}>
                  <Edit3 size={14} aria-hidden="true" />
                  Renommer
                </button>
                <button
                  className={styles.deleteOption}
                  onClick={() => onDeleteFolder(folder)}
                >
                  <Trash2 size={14} aria-hidden="true" />
                  Supprimer
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}

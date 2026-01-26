'use client';

import { Folder, FolderTree, ChevronRight } from 'lucide-react';
import type { GEDFolder } from '@/data/mock/documents-ged';
import { getSubFolders, countDocumentsInFolderRecursive } from '@/data/mock/documents-ged';
import { getFolderIcon } from '../domain/utils';
import styles from '../../../../../app/(dashboard)/documents/ged/ged.module.css';

interface FolderGridProps {
  folders: GEDFolder[];
  title: string;
  icon?: 'folder' | 'tree';
  onFolderClick: (folderId: string) => void;
}

export function FolderGrid({ folders, title, icon = 'folder', onFolderClick }: FolderGridProps) {
  if (folders.length === 0) return null;

  return (
    <>
      <div className={styles.sectionTitle}>
        {icon === 'tree' ? <FolderTree size={18} aria-hidden="true" /> : <Folder size={18} aria-hidden="true" />}
        {title}
      </div>
      <div className={styles.foldersGrid}>
        {folders.map((folder) => {
          const docCount = countDocumentsInFolderRecursive(folder.id);
          const subFolderCount = getSubFolders(folder.id).length;
          return (
            <button
              key={folder.id}
              className={styles.folderCard}
              onClick={() => onFolderClick(folder.id)}
              style={{ '--folder-color': folder.color || '#6B7280' } as React.CSSProperties}
            >
              <div className={styles.folderIconWrapper}>{getFolderIcon(folder.icon, 28)}</div>
              <div className={styles.folderInfo}>
                <span className={styles.folderName}>{folder.nom}</span>
                <span className={styles.folderMeta}>
                  {subFolderCount > 0 && `${subFolderCount} sous-dossier${subFolderCount > 1 ? 's' : ''} • `}
                  {docCount} document{docCount > 1 ? 's' : ''}
                </span>
              </div>
              <ChevronRight size={18} className={styles.folderArrow} aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </>
  );
}

'use client';

import { Home, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import type { GEDFolder } from '../domain/types';
import styles from '../../../../../app/(dashboard)/documents/ged/ged.module.css';

interface BreadcrumbProps {
  currentFolderId: string | null;
  breadcrumb: GEDFolder[];
  onNavigate: (folderId: string | null) => void;
}

export function Breadcrumb({ currentFolderId, breadcrumb, onNavigate }: BreadcrumbProps) {
  return (
    <div className={styles.breadcrumb}>
      <button
        className={clsx(styles.breadcrumbItem, !currentFolderId && styles.breadcrumbActive)}
        onClick={() => onNavigate(null)}
      >
        <Home size={16} aria-hidden="true" />
        <span>Racine</span>
      </button>
      {breadcrumb.map((folder, index) => (
        <span key={folder.id} className={styles.breadcrumbPath}>
          <ChevronRight size={14} className={styles.breadcrumbSeparator} aria-hidden="true" />
          <button
            className={clsx(
              styles.breadcrumbItem,
              index === breadcrumb.length - 1 && styles.breadcrumbActive
            )}
            onClick={() => onNavigate(folder.id)}
          >
            {folder.nom}
          </button>
        </span>
      ))}
    </div>
  );
}

'use client';

import { Upload } from 'lucide-react';
import clsx from 'clsx';
import type { GEDFolder } from '@/data/mock/documents-ged';
import styles from '../../../../../app/(dashboard)/documents/ged/ged.module.css';

interface DropZoneProps {
  isDragOver: boolean;
  currentFolder: GEDFolder | null;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

export function DropZone({ isDragOver, currentFolder, onDragOver, onDragLeave, onDrop }: DropZoneProps) {
  return (
    <div
      className={clsx(styles.dropZone, isDragOver && styles.dropZoneActive)}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <Upload size={32} aria-hidden="true" />
      <p>Glissez-déposez vos fichiers ici</p>
      <span>
        {currentFolder
          ? `Les fichiers seront ajoutés dans "${currentFolder.nom}"`
          : 'ou cliquez sur "Importer" pour sélectionner des fichiers'}
      </span>
    </div>
  );
}

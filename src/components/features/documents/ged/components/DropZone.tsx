'use client';

import { useRef, useCallback } from 'react';
import { Upload, FolderPlus } from 'lucide-react';
import clsx from 'clsx';
import type { GEDFolder } from '../domain/types';
import styles from '../../../../../app/(dashboard)/documents/ged/ged.module.css';

interface DropZoneProps {
  isDragOver: boolean;
  currentFolder: GEDFolder | null;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFilesSelected?: (files: FileList) => void;
}

export function DropZone({ isDragOver, currentFolder, onDragOver, onDragLeave, onDrop, onFilesSelected }: DropZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && onFilesSelected) {
      onFilesSelected(files);
    }
    // Reset pour permettre de resélectionner le même fichier
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onFilesSelected]);

  return (
    <div
      className={clsx(styles.dropZone, isDragOver && styles.dropZoneActive)}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      style={{ cursor: 'pointer' }}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileChange}
        style={{ display: 'none' }}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt,.csv"
      />
      <Upload size={32} aria-hidden="true" />
      <p>Glissez-déposez vos fichiers ici</p>
      <span>
        {currentFolder
          ? `Les fichiers seront ajoutés dans "${currentFolder.nom}"`
          : 'ou cliquez pour sélectionner des fichiers'}
      </span>
      <button
        type="button"
        className={styles.uploadButton}
        onClick={(e) => {
          e.stopPropagation();
          handleClick();
        }}
        style={{
          marginTop: '12px',
          padding: '8px 16px',
          backgroundColor: 'var(--color-primary-600, #2563eb)',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          fontWeight: '500',
        }}
      >
        <FolderPlus size={18} />
        Importer des fichiers
      </button>
    </div>
  );
}

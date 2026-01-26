'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, File, AlertCircle } from 'lucide-react';
import { validateFile, formatFileSize, UPLOAD_CONFIG } from '../types';
import styles from './UploadZone.module.css';

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  multiple?: boolean;
  error?: string | null;
}

/**
 * Zone de drag & drop pour l'upload de fichiers
 */
export function UploadZone({
  onFilesSelected,
  disabled = false,
  multiple = true,
  error: externalError,
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayError = externalError || error;

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const processFiles = useCallback(
    (files: FileList | File[]) => {
      setError(null);
      const fileArray = Array.from(files);

      if (!multiple && fileArray.length > 1) {
        setError('Un seul fichier autorisé');
        return;
      }

      const validFiles: File[] = [];
      const errors: string[] = [];

      fileArray.forEach((file) => {
        const validation = validateFile(file);
        if (validation.valid) {
          validFiles.push(file);
        } else {
          errors.push(`${file.name}: ${validation.error}`);
        }
      });

      if (errors.length > 0) {
        setError(errors.join('\n'));
      }

      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
    },
    [multiple, onFilesSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const { files } = e.dataTransfer;
      if (files && files.length > 0) {
        processFiles(files);
      }
    },
    [disabled, processFiles]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { files } = e.target;
      if (files && files.length > 0) {
        processFiles(files);
      }
      // Reset input pour permettre de sélectionner le même fichier
      e.target.value = '';
    },
    [processFiles]
  );

  const handleClick = useCallback(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  }, [disabled]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
        e.preventDefault();
        inputRef.current?.click();
      }
    },
    [disabled]
  );

  return (
    <div className={styles.container}>
      <div
        className={`${styles.dropzone} ${isDragging ? styles.dragging : ''} ${disabled ? styles.disabled : ''} ${displayError ? styles.hasError : ''}`}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Zone de dépôt de fichiers"
        aria-disabled={disabled}
      >
        <input
          ref={inputRef}
          type="file"
          accept={UPLOAD_CONFIG.acceptedExtensions.join(',')}
          multiple={multiple}
          onChange={handleInputChange}
          className={styles.input}
          disabled={disabled}
          aria-hidden="true"
        />

        <div className={styles.content}>
          {isDragging ? (
            <>
              <File className={styles.iconActive} size={40} aria-hidden="true" />
              <p className={styles.textActive}>Déposez les fichiers ici</p>
            </>
          ) : (
            <>
              <Upload className={styles.icon} size={32} aria-hidden="true" />
              <p className={styles.text}>
                Glissez-déposez vos fichiers ici
                <br />
                <span className={styles.textSecondary}>ou cliquez pour sélectionner</span>
              </p>
              <p className={styles.formats}>
                PDF, JPG, PNG, WebP • Max {formatFileSize(UPLOAD_CONFIG.maxSize)}
              </p>
            </>
          )}
        </div>
      </div>

      {displayError && (
        <div className={styles.error}>
          <AlertCircle size={14} aria-hidden="true" />
          <span>{displayError}</span>
        </div>
      )}
    </div>
  );
}

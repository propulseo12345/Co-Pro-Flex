'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, FileText, X, Eye, Link2 } from 'lucide-react';
import { PieceJointeDepense, TypePieceJointe } from '../types';
import styles from './InvoiceUploadSection.module.css';

interface InvoiceUploadSectionProps {
  pieceJointe?: PieceJointeDepense;
  onUpload: (pieceJointe: PieceJointeDepense) => void;
  onRemove: () => void;
  onLinkExisting: () => void;
  onViewDocument?: (url: string) => void;
  required?: boolean;
  disabled?: boolean;
}

const TYPE_OPTIONS: { value: TypePieceJointe; label: string }[] = [
  { value: 'FACTURE', label: 'Facture' },
  { value: 'AVOIR', label: 'Avoir' },
  { value: 'NOTE_CREDIT', label: 'Note de crédit' },
  { value: 'AUTRE', label: 'Autre justificatif' },
];

export function InvoiceUploadSection({
  pieceJointe,
  onUpload,
  onRemove,
  onLinkExisting,
  onViewDocument,
  required = false,
  disabled = false,
}: InvoiceUploadSectionProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedType, setSelectedType] = useState<TypePieceJointe>('FACTURE');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFile = useCallback((file: File) => {
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      alert('Format non supporté. Veuillez utiliser PDF, JPG ou PNG.');
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert('Le fichier est trop volumineux. Taille maximale: 10 Mo.');
      return;
    }

    // Create a fake URL for the uploaded file (in real app, would upload to server)
    const fakeUrl = URL.createObjectURL(file);

    const newPieceJointe: PieceJointeDepense = {
      id: `pj-${Date.now()}`,
      type: selectedType,
      fichierUrl: fakeUrl,
      fichierNom: file.name,
      dateAjout: new Date().toISOString(),
    };

    onUpload(newPieceJointe);
  }, [selectedType, onUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [disabled, handleFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    // Reset input to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFile]);

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  if (pieceJointe) {
    return (
      <div className={styles.attachedDocument}>
        <div className={styles.documentInfo}>
          <FileText size={24} className={styles.documentIcon} aria-hidden="true" />
          <div className={styles.documentDetails}>
            <span className={styles.documentName}>{pieceJointe.fichierNom}</span>
            <span className={styles.documentType}>
              {TYPE_OPTIONS.find(t => t.value === pieceJointe.type)?.label}
              {pieceJointe.reference && ` - Réf: ${pieceJointe.reference}`}
            </span>
            <span className={styles.documentDate}>
              Ajouté le {new Date(pieceJointe.dateAjout).toLocaleDateString('fr-FR')}
            </span>
          </div>
        </div>
        <div className={styles.documentActions}>
          {pieceJointe.fichierUrl && onViewDocument && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onViewDocument(pieceJointe.fichierUrl!)}
              aria-label="Voir le document"
            >
              <Eye size={14} aria-hidden="true" />
              Voir
            </button>
          )}
          {!disabled && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onRemove}
              aria-label="Supprimer la pièce jointe"
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.uploadSection}>
      <div className={styles.typeSelector}>
        <label htmlFor="piece-type" className={styles.typeLabel}>Type de justificatif</label>
        <select
          id="piece-type"
          className={styles.typeSelect}
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value as TypePieceJointe)}
          disabled={disabled}
        >
          {TYPE_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div
        className={`${styles.uploadZone} ${isDragOver ? styles.dragOver : ''} ${required ? styles.required : ''} ${disabled ? styles.disabled : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={!disabled ? handleBrowseClick : undefined}
        role={!disabled ? 'button' : undefined}
        tabIndex={!disabled ? 0 : undefined}
        onKeyDown={!disabled ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleBrowseClick();
          }
        } : undefined}
        aria-label={!disabled ? 'Zone d\'upload de fichier. Cliquez ou glissez-déposez un fichier.' : undefined}
      >
        <Upload size={32} className={styles.uploadIcon} aria-hidden="true" />
        <p className={styles.uploadText}>
          {required ? 'Glissez-déposez le fichier ici (obligatoire)' : 'Glissez-déposez le fichier ici'}
        </p>
        <p className={styles.uploadSubtext}>
          PDF, JPG ou PNG (max 10 Mo)
        </p>

        <div className={styles.uploadActions} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleBrowseClick}
            disabled={disabled}
            aria-label="Parcourir les fichiers de l'ordinateur"
          >
            <Upload size={16} aria-hidden="true" />
            Importer depuis l'ordinateur
          </button>
          <span className={styles.orDivider}>ou</span>
          <button
            type="button"
            className="btn btn-outline"
            onClick={onLinkExisting}
            disabled={disabled}
            aria-label="Lier une facture existante"
          >
            <Link2 size={14} aria-hidden="true" />
            Lier une facture existante
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className={styles.fileInput}
          onChange={handleFileSelect}
          disabled={disabled}
          aria-label="Sélectionner un fichier depuis l'ordinateur"
          required={required}
        />
      </div>

      {required && (
        <p className={styles.requiredText}>
          * Une pièce justificative est obligatoire pour valider cette dépense
        </p>
      )}
    </div>
  );
}

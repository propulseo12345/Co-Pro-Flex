'use client';

import { useCallback, useRef, useState } from 'react';
import {
  Paperclip, FileText, Calculator, FileCheck,
  ClipboardList, AlertTriangle, CheckCircle2,
  Upload, X, File, Loader2, Image as ImageIcon,
} from 'lucide-react';
import type { UseConvocationDocumentsReturn } from '../hooks/useConvocationDocuments';
import styles from './ConvocationAnnexesSection.module.css';

export interface AnnexeItem {
  id: string;
  label: string;
  description: string;
  obligatoire: boolean;
  included: boolean;
  category: 'legal' | 'comptable' | 'contextuel';
}

interface ConvocationAnnexesSectionProps {
  annexes: AnnexeItem[];
  onToggle: (id: string) => void;
  agType: 'ORDINAIRE' | 'EXTRAORDINAIRE' | 'URGENTE';
  uploadedDocs?: UseConvocationDocumentsReturn;
}

const CATEGORY_LABELS: Record<AnnexeItem['category'], string> = {
  legal: 'Documents obligatoires',
  comptable: 'Annexes comptables',
  contextuel: 'Documents complementaires',
};

const CATEGORY_ICONS: Record<AnnexeItem['category'], typeof FileText> = {
  legal: FileCheck,
  comptable: Calculator,
  contextuel: ClipboardList,
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function getFileIcon(mimeType: string) {
  if (mimeType === 'application/pdf') return File;
  if (mimeType.startsWith('image/')) return ImageIcon;
  return FileText;
}

export function ConvocationAnnexesSection({
  annexes,
  onToggle,
  agType,
  uploadedDocs,
}: ConvocationAnnexesSectionProps) {
  const includedCount = annexes.filter((a) => a.included).length;
  const uploadedCount = uploadedDocs?.documents.length ?? 0;
  const totalCount = includedCount + uploadedCount;
  const obligatoiresManquantes = annexes.filter((a) => a.obligatoire && !a.included);

  const groupedByCategory = annexes.reduce<Record<string, AnnexeItem[]>>((acc, annexe) => {
    if (!acc[annexe.category]) acc[annexe.category] = [];
    acc[annexe.category].push(annexe);
    return acc;
  }, {});

  const categoryOrder: AnnexeItem['category'][] = ['legal', 'comptable', 'contextuel'];

  const handleToggle = useCallback((id: string, obligatoire: boolean) => {
    if (obligatoire) return;
    onToggle(id);
  }, [onToggle]);

  // Upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || !uploadedDocs) return;
    for (let i = 0; i < files.length; i++) {
      await uploadedDocs.uploadFile(files[i]);
    }
  }, [uploadedDocs]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleRemove = useCallback(async (docId: string) => {
    if (!uploadedDocs) return;
    await uploadedDocs.removeFile(docId);
  }, [uploadedDocs]);

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          <Paperclip size={22} aria-hidden="true" />
          Documents annexes
        </h2>
        <span className={styles.count}>
          {totalCount} document{totalCount > 1 ? 's' : ''} joint{totalCount > 1 ? 's' : ''}
        </span>
      </div>

      {obligatoiresManquantes.length > 0 && (
        <div className={styles.alertBanner}>
          <AlertTriangle size={16} aria-hidden="true" />
          <span>
            {obligatoiresManquantes.length} document{obligatoiresManquantes.length > 1 ? 's' : ''} obligatoire{obligatoiresManquantes.length > 1 ? 's' : ''} non inclus
          </span>
        </div>
      )}

      {categoryOrder.map((category) => {
        const items = groupedByCategory[category];
        if (!items || items.length === 0) return null;

        const CategoryIcon = CATEGORY_ICONS[category];
        return (
          <div key={category} className={styles.categoryGroup}>
            <h3 className={styles.categoryTitle}>
              <CategoryIcon size={16} aria-hidden="true" />
              {CATEGORY_LABELS[category]}
            </h3>
            <div className={styles.annexeList}>
              {items.map((annexe) => (
                <button
                  key={annexe.id}
                  type="button"
                  className={`${styles.annexeItem} ${annexe.included ? styles.annexeItemIncluded : ''} ${annexe.obligatoire ? styles.annexeItemObligatoire : ''}`}
                  onClick={() => handleToggle(annexe.id, annexe.obligatoire)}
                  disabled={annexe.obligatoire}
                  title={annexe.obligatoire ? 'Document obligatoire (ne peut pas etre retire)' : annexe.description}
                >
                  <div className={styles.annexeCheck}>
                    {annexe.included ? (
                      <CheckCircle2 size={18} aria-hidden="true" />
                    ) : (
                      <div className={styles.uncheckedCircle} />
                    )}
                  </div>
                  <div className={styles.annexeInfo}>
                    <span className={styles.annexeLabel}>{annexe.label}</span>
                    <span className={styles.annexeDesc}>{annexe.description}</span>
                  </div>
                  {annexe.obligatoire && (
                    <span className={styles.obligatoireBadge}>Obligatoire</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {/* Section Upload Documents */}
      {uploadedDocs && (
        <div className={styles.categoryGroup}>
          <h3 className={styles.categoryTitle}>
            <Upload size={16} aria-hidden="true" />
            Pieces jointes supplementaires
          </h3>

          {/* Liste des documents uploades */}
          {uploadedDocs.documents.length > 0 && (
            <div className={styles.uploadedList}>
              {uploadedDocs.documents.map((doc) => {
                const FileIcon = getFileIcon(doc.mimeType);
                return (
                  <div key={doc.id} className={styles.uploadedItem}>
                    <FileIcon size={18} className={styles.uploadedIcon} />
                    <div className={styles.uploadedInfo}>
                      <span className={styles.uploadedName}>{doc.name}</span>
                      <span className={styles.uploadedMeta}>{formatFileSize(doc.size)}</span>
                    </div>
                    <button
                      type="button"
                      className={styles.removeBtn}
                      onClick={() => handleRemove(doc.id)}
                      title="Retirer ce document"
                    >
                      <X size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Zone de drop */}
          <div
            className={`${styles.dropZone} ${isDragOver ? styles.dropZoneActive : ''} ${uploadedDocs.isUploading ? styles.dropZoneUploading : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              multiple
              className={styles.fileInput}
              onChange={(e) => handleFileSelect(e.target.files)}
            />
            {uploadedDocs.isUploading ? (
              <>
                <Loader2 size={24} className={styles.spinner} />
                <span>Upload en cours...</span>
              </>
            ) : (
              <>
                <Upload size={24} />
                <span>Deposer des fichiers ou cliquer pour parcourir</span>
                <span className={styles.dropZoneHint}>PDF, PNG, JPG — max 20 Mo par fichier</span>
              </>
            )}
          </div>

          {uploadedDocs.error && (
            <div className={styles.uploadError}>
              <AlertTriangle size={14} />
              {uploadedDocs.error}
            </div>
          )}

          {uploadedDocs.isRendering && (
            <div className={styles.renderingNotice}>
              <Loader2 size={14} className={styles.spinner} />
              Preparation des documents pour le PDF...
            </div>
          )}
        </div>
      )}

      <p className={styles.legalNote}>
        Art. 11 du decret du 17 mars 1967 — La convocation doit etre accompagnee des documents
        necessaires a l&apos;information des coproprietaires.
      </p>
    </div>
  );
}

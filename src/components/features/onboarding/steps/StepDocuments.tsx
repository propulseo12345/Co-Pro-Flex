'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, FileText, Trash2 } from 'lucide-react';
import { StepHeader } from '../shared/StepHeader';
import { uploadDocument, type DocumentCategory } from '@/lib/documents/api';
import styles from './StepDocuments.module.css';

interface StepDocumentsProps {
  coproId: string;
  onClose: () => void;
}

interface UploadedDoc {
  id: string;
  fileName: string;
  category: string;
  categoryLabel: string;
  size: string;
}

const DOCUMENT_CATEGORIES: { value: DocumentCategory; label: string }[] = [
  { value: 'reglement', label: 'Règlement de copropriété' },
  { value: 'pv_ag', label: 'PV dernière AG' },
  { value: 'diagnostic', label: 'Diagnostic technique (DPE, amiante...)' },
  { value: 'assurance', label: 'Attestation assurance MRI' },
  { value: 'contrat', label: 'Contrat de syndic' },
  { value: 'budget', label: 'Budget prévisionnel' },
  { value: 'plan', label: 'Plans de la copropriété' },
  { value: 'autre', label: 'Autre document' },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function StepDocuments({ coproId, onClose }: StepDocumentsProps) {
  const [documents, setDocuments] = useState<UploadedDoc[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [category, setCategory] = useState<DocumentCategory>('reglement');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFile || !category) return;
    setIsUploading(true);

    try {
      const doc = await uploadDocument(selectedFile, coproId, category, {
        title: selectedFile.name,
        sourceModule: 'manual',
      });

      const catLabel = DOCUMENT_CATEGORIES.find(c => c.value === category)?.label ?? category;

      setDocuments(prev => [
        ...prev,
        {
          id: doc.id,
          fileName: selectedFile.name,
          category,
          categoryLabel: catLabel,
          size: formatFileSize(selectedFile.size),
        },
      ]);

      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (_err) {
      alert('Erreur lors du téléversement du document');
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, category, coproId]);

  const handleDelete = useCallback((id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  }, []);

  const handleDropZoneClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className={styles.container}>
      <StepHeader
        title="Documents initiaux"
        description="Téléversez les documents fondateurs de votre copropriété (règlement, PV, diagnostics...). Cette étape est facultative, vous pourrez les ajouter plus tard depuis la GED."
      />

      {/* Upload form */}
      <div className={styles.form}>
        <div className={styles.formTitle}>
          <FileText size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} aria-hidden="true" />
          Ajouter un document
        </div>

        <div className={styles.fields}>
          <div className={styles.field}>
            <label className={styles.label}>Catégorie *</label>
            <select
              className={styles.select}
              value={category}
              onChange={e => setCategory(e.target.value as DocumentCategory)}
            >
              {DOCUMENT_CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Fichier *</label>
            <input
              ref={fileInputRef}
              className={styles.input}
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={handleFileChange}
            />
          </div>
        </div>

        <button
          className={styles.btnUpload}
          onClick={handleUpload}
          disabled={!selectedFile || isUploading}
        >
          {isUploading ? 'Téléversement...' : 'Téléverser ce document'}
        </button>
      </div>

      {/* Drop zone hint */}
      <div
        className={styles.uploadZone}
        onClick={handleDropZoneClick}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter') handleDropZoneClick(); }}
      >
        <Upload size={24} className={styles.uploadIcon} />
        <p className={styles.uploadText}>Cliquez ou glissez-déposez vos fichiers ici</p>
        <p className={styles.uploadHint}>PDF, Word, images — 10 Mo max</p>
      </div>

      {/* Uploaded documents list */}
      {documents.length > 0 ? (
        <div className={styles.list}>
          {documents.map(d => (
            <div key={d.id} className={styles.listItem}>
              <div className={styles.listItemInfo}>
                <span className={styles.listItemTitle}>{d.fileName}</span>
                <span className={styles.listItemMeta}>{d.categoryLabel}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className={styles.listItemSize}>{d.size}</span>
                <button
                  className={styles.btnDelete}
                  onClick={() => handleDelete(d.id)}
                >
                  <Trash2 size={12} aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          Aucun document téléversé pour le moment.
        </div>
      )}

      {/* Footer */}
      <div className={styles.footer}>
        <button className={styles.btnClose} onClick={onClose}>
          Fermer
        </button>
        <button className={styles.btnDone} onClick={onClose}>
          {documents.length > 0 ? `Terminé (${documents.length} document${documents.length > 1 ? 's' : ''})` : 'Passer'}
        </button>
      </div>
      <p className={styles.skipNote}>
        Cette étape est optionnelle. Vous pouvez ajouter des documents plus tard dans la GED.
      </p>
    </div>
  );
}

'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { Upload, X, FileText, Image, File, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import type { GEDFolder } from '../domain/types';
import type { DocumentCategory, DocumentConfidentiality } from '@/lib/documents/api';
import { detectCategory } from '@/lib/documents/detect-category';
import { FolderTreeSelect } from './FolderTreeSelect';
import { CATEGORY_LABELS } from '../domain/constants';
import styles from './UploadDocumentModal.module.css';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 Mo

const CONFIDENTIALITY_OPTIONS: { value: DocumentConfidentiality; label: string }[] = [
  { value: 'public', label: 'Public' },
  { value: 'council', label: 'Conseil syndical' },
  { value: 'manager', label: 'Gestionnaire' },
  { value: 'restricted', label: 'Restreint' },
];

const CATEGORY_OPTIONS: { value: DocumentCategory; label: string }[] = [
  { value: 'pv_ag', label: 'PV d\'AG' },
  { value: 'convocation', label: 'Convocation' },
  { value: 'contrat', label: 'Contrat' },
  { value: 'facture', label: 'Facture' },
  { value: 'devis', label: 'Devis' },
  { value: 'diagnostic', label: 'Diagnostic' },
  { value: 'assurance', label: 'Assurance' },
  { value: 'budget', label: 'Budget' },
  { value: 'appel_fonds', label: 'Appel de fonds' },
  { value: 'releve_charges', label: 'Relevé de charges' },
  { value: 'courrier', label: 'Courrier' },
  { value: 'correspondance', label: 'Correspondance' },
  { value: 'ordre_service', label: 'Ordre de service' },
  { value: 'photo', label: 'Photo' },
  { value: 'plan', label: 'Plan' },
  { value: 'reglement', label: 'Règlement' },
  { value: 'etat_date', label: 'État daté' },
  { value: 'autre', label: 'Autre' },
];

interface FileEntry {
  file: File;
  title: string;
  error?: string;
}

interface UploadDocumentModalProps {
  folders: GEDFolder[];
  onUpload: (file: File, options: {
    folderId?: string;
    title?: string;
    description?: string;
    tags?: string[];
    confidentiality?: DocumentConfidentiality;
    category: DocumentCategory;
  }) => Promise<void>;
  onCreateFolder: (name: string, parentId: string | null) => Promise<void>;
  onClose: () => void;
}

export function UploadDocumentModal({
  folders,
  onUpload,
  onCreateFolder,
  onClose,
}: UploadDocumentModalProps) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [category, setCategory] = useState<DocumentCategory>('autre');
  const [confidentiality, setConfidentiality] = useState<DocumentConfidentiality>('public');
  const [tags, setTags] = useState('');
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get folder's category_default for auto-detection
  const folderCategoryDefault = useMemo(() => {
    if (!folderId) return null;
    const folder = folders.find(f => f.id === folderId);
    return folder?.categoryDefault || null;
  }, [folderId, folders]);

  // Auto-set category when folder changes
  const handleFolderChange = useCallback((newFolderId: string | null) => {
    setFolderId(newFolderId);
    if (newFolderId) {
      const folder = folders.find(f => f.id === newFolderId);
      if (folder?.categoryDefault) {
        setCategory(folder.categoryDefault as DocumentCategory);
      }
    }
  }, [folders]);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const entries: FileEntry[] = Array.from(newFiles).map(file => {
      const error = file.size > MAX_FILE_SIZE ? 'Fichier trop volumineux (max 25 Mo)' : undefined;
      const title = file.name.replace(/\.[^.]+$/, '');
      return { file, title, error };
    });
    setFiles(prev => [...prev, ...entries]);

    // Auto-detect category from first valid file
    const firstValid = entries.find(e => !e.error);
    if (firstValid && category === 'autre') {
      const detected = detectCategory(firstValid.file.name, folderCategoryDefault as DocumentCategory | null);
      setCategory(detected);
    }
  }, [category, folderCategoryDefault]);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleUpload = async () => {
    const validFiles = files.filter(f => !f.error);
    if (validFiles.length === 0) return;

    setIsUploading(true);
    const parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean);

    try {
      for (const entry of validFiles) {
        await onUpload(entry.file, {
          folderId: folderId || undefined,
          title: entry.title,
          description: description || undefined,
          tags: parsedTags.length > 0 ? parsedTags : undefined,
          confidentiality,
          category,
        });
      }
      onClose();
    } catch {
      // Error handled by parent (toast)
    } finally {
      setIsUploading(false);
    }
  };

  const validCount = files.filter(f => !f.error).length;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h3 className={styles.title}><Upload size={18} /> Ajouter un document</h3>
          <button className={styles.closeBtn} onClick={onClose}><X size={16} /></button>
        </div>

        <div className={styles.body}>
          {/* Drop zone */}
          <div
            className={clsx(styles.dropZone, isDragOver && styles.dropZoneActive)}
            onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={e => { e.preventDefault(); setIsDragOver(false); }}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={28} className={styles.dropIcon} />
            <span className={styles.dropText}>Glisser des fichiers ou cliquer pour importer</span>
            <span className={styles.dropHint}>PDF, Images, Word — max 25 Mo par fichier</span>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              onChange={e => { if (e.target.files) addFiles(e.target.files); }}
            />
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className={styles.fileList}>
              {files.map((entry, i) => (
                <div key={i} className={clsx(styles.fileRow, entry.error && styles.fileRowError)}>
                  <FileIcon type={entry.file.type} />
                  <div className={styles.fileInfo}>
                    <input
                      className={styles.fileTitleInput}
                      value={entry.title}
                      onChange={e => {
                        const newFiles = [...files];
                        newFiles[i] = { ...entry, title: e.target.value };
                        setFiles(newFiles);
                      }}
                    />
                    <span className={styles.fileSize}>
                      {entry.error || `${(entry.file.size / (1024 * 1024)).toFixed(2)} Mo`}
                    </span>
                  </div>
                  <button className={styles.fileRemove} onClick={() => removeFile(i)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Dossier cible */}
          <div className={styles.field}>
            <label className={styles.label}>Dossier cible</label>
            <FolderTreeSelect
              folders={folders}
              value={folderId}
              onChange={handleFolderChange}
              onCreateFolder={onCreateFolder}
            />
          </div>

          {/* Catégorie */}
          <div className={styles.field}>
            <label className={styles.label}>Catégorie</label>
            <select
              className={styles.select}
              value={category}
              onChange={e => setCategory(e.target.value as DocumentCategory)}
            >
              {CATEGORY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Confidentialité + Tags */}
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Confidentialité</label>
              <select
                className={styles.select}
                value={confidentiality}
                onChange={e => setConfidentiality(e.target.value as DocumentConfidentiality)}
              >
                {CONFIDENTIALITY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Tags</label>
              <input
                className={styles.input}
                placeholder="Séparés par des virgules..."
                value={tags}
                onChange={e => setTags(e.target.value)}
              />
            </div>
          </div>

          {/* Description */}
          <div className={styles.field}>
            <label className={styles.label}>Description</label>
            <textarea
              className={styles.textarea}
              placeholder="Description optionnelle..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button className={styles.btnSecondary} onClick={onClose} disabled={isUploading}>
            Annuler
          </button>
          <button
            className={styles.btnPrimary}
            onClick={handleUpload}
            disabled={validCount === 0 || isUploading}
          >
            {isUploading ? 'Ajout en cours...' : `Ajouter ${validCount > 1 ? `(${validCount})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function FileIcon({ type }: { type: string }) {
  if (type.includes('pdf')) return <FileText size={16} style={{ color: '#EF4444' }} />;
  if (type.includes('image')) return <Image size={16} style={{ color: '#84CC16' }} />;
  return <File size={16} style={{ color: '#6B7280' }} />;
}

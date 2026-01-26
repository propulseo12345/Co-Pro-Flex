'use client';

import { useState } from 'react';
import { Upload, FileText, Image, X, Paperclip } from 'lucide-react';
import { PieceJointeOS } from '@/types';
import { simulateFileUpload } from '@/lib/utils/service-order';
import styles from './AttachmentUpload.module.css';

interface AttachmentUploadProps {
  attachments: PieceJointeOS[];
  onAttachmentsChange: (attachments: PieceJointeOS[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  disabled?: boolean;
}

export default function AttachmentUpload({
  attachments,
  onAttachmentsChange,
  maxFiles = 10,
  maxSizeMB = 25,
  disabled = false
}: AttachmentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await handleFiles(files);
    e.target.value = ''; // Reset input
  };

  const handleFiles = async (files: File[]) => {
    if (disabled) return;

    // Validate number of files
    if (attachments.length + files.length > maxFiles) {
      alert(`Vous ne pouvez pas ajouter plus de ${maxFiles} fichiers.`);
      return;
    }

    // Validate file sizes
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    const oversizedFiles = files.filter((file) => file.size > maxSizeBytes);
    if (oversizedFiles.length > 0) {
      alert(
        `Certains fichiers dépassent la taille maximale de ${maxSizeMB} Mo:\n` +
          oversizedFiles.map((f) => f.name).join('\n')
      );
      return;
    }

    setIsUploading(true);

    try {
      const uploadPromises = files.map((file) => simulateFileUpload(file));
      const newAttachments = await Promise.all(uploadPromises);
      onAttachmentsChange([...attachments, ...newAttachments]);
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error);
      alert('Une erreur est survenue lors de l\'upload des fichiers.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = (id: string) => {
    onAttachmentsChange(attachments.filter((att) => att.id !== id));
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const getFileIcon = (type: string) => {
    if (type === 'IMAGE') return <Image size={16} aria-hidden="true" />;
    return <FileText size={16} aria-hidden="true" />;
  };

  const totalSize = attachments.reduce((sum, att) => {
    const sizeInMB = parseFloat(att.taille.replace(' Mo', ''));
    return sum + sizeInMB;
  }, 0);

  return (
    <div className={styles.container}>
      {/* Upload zone */}
      <div
        className={`${styles.uploadZone} ${dragActive ? styles.dragActive : ''} ${
          disabled ? styles.disabled : ''
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-upload"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.docx,.doc"
          onChange={handleFileChange}
          className={styles.fileInput}
          disabled={disabled || isUploading}
        />
        <label htmlFor="file-upload" className={styles.uploadLabel}>
          {isUploading ? (
            <>
              <div className={styles.spinner} />
              <p>Upload en cours...</p>
            </>
          ) : (
            <>
              <Upload size={32} aria-hidden="true" />
              <p className={styles.uploadText}>
                <strong>Cliquez pour parcourir</strong> ou glissez-déposez vos fichiers
              </p>
              <p className={styles.uploadHint}>
                PDF, JPG, PNG, DOCX • Max {maxFiles} fichiers • Max {maxSizeMB} Mo par fichier
              </p>
            </>
          )}
        </label>
      </div>

      {/* Attachments list */}
      {attachments.length > 0 && (
        <div className={styles.attachmentsList}>
          <div className={styles.listHeader}>
            <div className={styles.listTitle}>
              <Paperclip size={16} aria-hidden="true" />
              <span>
                {attachments.length} fichier{attachments.length > 1 ? 's' : ''} ({totalSize.toFixed(2)} Mo)
              </span>
            </div>
          </div>

          {attachments.map((attachment) => (
            <div key={attachment.id} className={styles.attachmentItem}>
              <div className={styles.attachmentIcon}>
                {getFileIcon(attachment.type)}
              </div>
              <div className={styles.attachmentInfo}>
                <p className={styles.attachmentName}>{attachment.nom}</p>
                <p className={styles.attachmentMeta}>
                  {attachment.taille} • Ajouté le{' '}
                  {new Date(attachment.dateAjout).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <button
                onClick={() => handleRemove(attachment.id)}
                className={styles.removeButton}
                disabled={disabled}
                aria-label={`Supprimer ${attachment.nom}`}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

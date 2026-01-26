'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, Trash2, Eye, AlertCircle, CheckCircle } from 'lucide-react';
import type { JustificatifVote } from '@/types/models/ag';
import styles from './VotesCorrespondance.module.css';

interface UploadJustificatifProps {
    justificatif: JustificatifVote | null;
    onUpload: (file: File) => Promise<void>;
    onRemove: () => void;
    disabled?: boolean;
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' o';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' Ko';
    return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
}

function formatDate(isoDate: string): string {
    return new Date(isoDate).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function UploadJustificatif({
    justificatif,
    onUpload,
    onRemove,
    disabled = false,
}: UploadJustificatifProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError(null);
        setIsUploading(true);

        try {
            await onUpload(file);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur lors de l\'upload');
        } finally {
            setIsUploading(false);
            // Reset input pour permettre de re-uploader le même fichier
            if (inputRef.current) {
                inputRef.current.value = '';
            }
        }
    };

    const handleRemove = () => {
        setError(null);
        onRemove();
    };

    const handlePreview = () => {
        if (justificatif?.dataUrl) {
            setShowPreview(true);
        }
    };

    const closePreview = () => {
        setShowPreview(false);
    };

    return (
        <div className={styles.uploadSection}>
            <div className={styles.uploadHeader}>
                <FileText size={18} aria-hidden="true" />
                <span className={styles.uploadTitle}>Justificatif scanné</span>
                {justificatif && (
                    <span className={styles.uploadBadge}>
                        <CheckCircle size={12} aria-hidden="true" />
                        Reçu
                    </span>
                )}
            </div>

            {error && (
                <div className={styles.uploadError}>
                    <AlertCircle size={16} aria-hidden="true" />
                    <span>{error}</span>
                </div>
            )}

            {justificatif ? (
                <div className={styles.uploadedFile}>
                    <div className={styles.uploadedFileInfo}>
                        <FileText size={32} className={styles.uploadedFileIcon} aria-hidden="true" />
                        <div className={styles.uploadedFileDetails}>
                            <span className={styles.uploadedFileName}>{justificatif.fileName}</span>
                            <span className={styles.uploadedFileMeta}>
                                {formatFileSize(justificatif.size)} • {formatDate(justificatif.uploadedAt)}
                            </span>
                        </div>
                    </div>
                    <div className={styles.uploadedFileActions}>
                        {justificatif.dataUrl && (
                            <button
                                onClick={handlePreview}
                                className={styles.uploadedFileButton}
                                title="Voir le justificatif"
                            >
                                <Eye size={18} aria-hidden="true" />
                            </button>
                        )}
                        <button
                            onClick={handleRemove}
                            className={`${styles.uploadedFileButton} ${styles.uploadedFileButtonDanger}`}
                            title="Supprimer le justificatif"
                            disabled={disabled}
                        >
                            <Trash2 size={18} aria-hidden="true" />
                        </button>
                    </div>
                </div>
            ) : (
                <label className={`${styles.uploadDropzone} ${isUploading ? styles.uploadDropzoneUploading : ''} ${disabled ? styles.uploadDropzoneDisabled : ''}`}>
                    <input
                        ref={inputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileChange}
                        disabled={disabled || isUploading}
                        className={styles.uploadInput}
                    />
                    <Upload size={32} className={styles.uploadIcon} aria-hidden="true" />
                    <span className={styles.uploadText}>
                        {isUploading ? 'Upload en cours...' : 'Cliquez ou déposez un fichier'}
                    </span>
                    <span className={styles.uploadHint}>
                        PDF, JPG ou PNG • Max 10 Mo
                    </span>
                </label>
            )}

            {/* Modal de prévisualisation */}
            {showPreview && justificatif?.dataUrl && (
                <div className={styles.previewOverlay} onClick={closePreview}>
                    <div className={styles.previewModal} onClick={e => e.stopPropagation()}>
                        <div className={styles.previewHeader}>
                            <span className={styles.previewTitle}>{justificatif.fileName}</span>
                            <button onClick={closePreview} className={styles.previewClose}>
                                &times;
                            </button>
                        </div>
                        <div className={styles.previewContent}>
                            {justificatif.mimeType === 'application/pdf' ? (
                                <iframe
                                    src={justificatif.dataUrl}
                                    className={styles.previewIframe}
                                    title="Prévisualisation du justificatif"
                                />
                            ) : (
                                <img
                                    src={justificatif.dataUrl}
                                    alt="Justificatif"
                                    className={styles.previewImage}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default UploadJustificatif;

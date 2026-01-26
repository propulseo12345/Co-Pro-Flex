/**
 * Composant de progression pour la génération du PV
 *
 * Affiche :
 * - Barre de progression avec pourcentage
 * - Étape en cours avec description
 * - Statut (queued/running/succeeded/failed)
 * - Actions (retry, télécharger, archiver)
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import {
    Loader2,
    CheckCircle,
    AlertCircle,
    Download,
    RefreshCw,
    Archive,
    Send,
    Eye,
    FileText,
    Clock,
    X,
} from 'lucide-react';
import type { PVJobProgress, PVJobStatus, PVDocumentStatus } from '@/lib/services/pv-generation.service';
import styles from './PVGenerationProgress.module.css';

interface PVGenerationProgressProps {
    progress: PVJobProgress | null;
    status: PVJobStatus | null;
    documentStatus: PVDocumentStatus | null;
    error: string | null;
    isGenerating: boolean;
    isCompleted: boolean;
    isFailed: boolean;
    pdfUrl?: string | null;
    onRetry?: () => void;
    onDownload?: () => void;
    onPreview?: () => void;
    onArchive?: () => Promise<void>;
    onSendToCoproprietaires?: () => Promise<void>;
    onClose?: () => void;
}

export function PVGenerationProgress({
    progress,
    status,
    documentStatus,
    error,
    isGenerating,
    isCompleted,
    isFailed,
    pdfUrl,
    onRetry,
    onDownload,
    onPreview,
    onArchive,
    onSendToCoproprietaires,
    onClose,
}: PVGenerationProgressProps) {
    const [isArchiving, setIsArchiving] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [archiveSuccess, setArchiveSuccess] = useState(false);
    const [sendSuccess, setSendSuccess] = useState(false);

    // Label du statut
    const statusLabel = useMemo(() => {
        switch (status) {
            case 'queued':
                return 'En attente';
            case 'running':
                return 'Génération en cours';
            case 'succeeded':
                return 'Terminé';
            case 'failed':
                return 'Échec';
            case 'cancelled':
                return 'Annulé';
            default:
                return 'Inconnu';
        }
    }, [status]);

    // Icône du statut
    const StatusIcon = useMemo(() => {
        switch (status) {
            case 'queued':
                return Clock;
            case 'running':
                return Loader2;
            case 'succeeded':
                return CheckCircle;
            case 'failed':
                return AlertCircle;
            default:
                return FileText;
        }
    }, [status]);

    // Classe CSS du statut
    const statusClass = useMemo(() => {
        switch (status) {
            case 'queued':
                return styles.statusQueued;
            case 'running':
                return styles.statusRunning;
            case 'succeeded':
                return styles.statusSucceeded;
            case 'failed':
                return styles.statusFailed;
            default:
                return '';
        }
    }, [status]);

    // Handlers
    const handleArchive = useCallback(async () => {
        if (!onArchive) return;
        setIsArchiving(true);
        try {
            await onArchive();
            setArchiveSuccess(true);
        } finally {
            setIsArchiving(false);
        }
    }, [onArchive]);

    const handleSend = useCallback(async () => {
        if (!onSendToCoproprietaires) return;
        setIsSending(true);
        try {
            await onSendToCoproprietaires();
            setSendSuccess(true);
        } finally {
            setIsSending(false);
        }
    }, [onSendToCoproprietaires]);

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <StatusIcon
                        size={24}
                        className={`${styles.statusIcon} ${statusClass} ${status === 'running' ? styles.spinning : ''}`}
                    />
                    <div className={styles.headerText}>
                        <h3 className={styles.title}>Génération du Procès-Verbal</h3>
                        <span className={`${styles.statusBadge} ${statusClass}`}>
                            {statusLabel}
                        </span>
                    </div>
                </div>
                {onClose && (
                    <button onClick={onClose} className={styles.closeButton} aria-label="Fermer">
                        <X size={20} />
                    </button>
                )}
            </div>

            {/* Progress bar */}
            {isGenerating && progress && (
                <div className={styles.progressSection}>
                    <div className={styles.progressInfo}>
                        <span className={styles.progressStep}>
                            Étape {progress.stepNumber}/{progress.totalSteps} : {progress.step}
                        </span>
                        <span className={styles.progressPercent}>{progress.percentage}%</span>
                    </div>
                    <div className={styles.progressBarContainer}>
                        <div
                            className={styles.progressBar}
                            style={{ width: `${progress.percentage}%` }}
                        />
                    </div>
                    <p className={styles.progressMessage}>{progress.message}</p>
                </div>
            )}

            {/* Error message */}
            {isFailed && error && (
                <div className={styles.errorSection}>
                    <AlertCircle size={20} />
                    <div className={styles.errorContent}>
                        <strong>Erreur lors de la génération</strong>
                        <p>{error}</p>
                    </div>
                </div>
            )}

            {/* Success section */}
            {isCompleted && (
                <div className={styles.successSection}>
                    <CheckCircle size={24} className={styles.successIcon} />
                    <div className={styles.successContent}>
                        <strong>Procès-verbal généré avec succès</strong>
                        <p>
                            Le document est prêt. Vous pouvez le prévisualiser, le télécharger,
                            l'archiver dans la GED ou l'envoyer aux copropriétaires.
                        </p>
                    </div>
                </div>
            )}

            {/* Document status */}
            {documentStatus && documentStatus !== 'generated' && (
                <div className={styles.documentStatus}>
                    <span className={styles.documentStatusLabel}>Statut du document :</span>
                    <span className={styles.documentStatusValue}>
                        {documentStatus === 'ready_to_sign' && 'Prêt pour signature'}
                        {documentStatus === 'signing' && 'En cours de signature'}
                        {documentStatus === 'signed' && 'Signé'}
                        {documentStatus === 'archived' && 'Archivé'}
                        {documentStatus === 'sent' && 'Envoyé'}
                    </span>
                </div>
            )}

            {/* Actions */}
            <div className={styles.actions}>
                {/* Retry button (if failed) */}
                {isFailed && onRetry && (
                    <button onClick={onRetry} className={`${styles.actionButton} ${styles.retryButton}`}>
                        <RefreshCw size={16} />
                        Réessayer
                    </button>
                )}

                {/* Preview button (if completed) */}
                {isCompleted && onPreview && (
                    <button onClick={onPreview} className={`${styles.actionButton} ${styles.previewButton}`}>
                        <Eye size={16} />
                        Aperçu
                    </button>
                )}

                {/* Download button (if completed) */}
                {isCompleted && onDownload && (
                    <button onClick={onDownload} className={`${styles.actionButton} ${styles.downloadButton}`}>
                        <Download size={16} />
                        Télécharger PDF
                    </button>
                )}

                {/* Archive button (if completed and not yet archived) */}
                {isCompleted && onArchive && documentStatus !== 'archived' && documentStatus !== 'sent' && (
                    <button
                        onClick={handleArchive}
                        className={`${styles.actionButton} ${styles.archiveButton}`}
                        disabled={isArchiving || archiveSuccess}
                    >
                        {isArchiving ? (
                            <Loader2 size={16} className={styles.spinning} />
                        ) : archiveSuccess ? (
                            <CheckCircle size={16} />
                        ) : (
                            <Archive size={16} />
                        )}
                        {archiveSuccess ? 'Archivé' : 'Archiver GED'}
                    </button>
                )}

                {/* Send button (if completed/archived and not yet sent) */}
                {isCompleted && onSendToCoproprietaires && documentStatus !== 'sent' && (
                    <button
                        onClick={handleSend}
                        className={`${styles.actionButton} ${styles.sendButton}`}
                        disabled={isSending || sendSuccess}
                    >
                        {isSending ? (
                            <Loader2 size={16} className={styles.spinning} />
                        ) : sendSuccess ? (
                            <CheckCircle size={16} />
                        ) : (
                            <Send size={16} />
                        )}
                        {sendSuccess ? 'Envoyé' : 'Envoyer aux copropriétaires'}
                    </button>
                )}
            </div>

            {/* PDF Preview iframe */}
            {pdfUrl && isCompleted && (
                <div className={styles.previewSection}>
                    <iframe
                        src={pdfUrl}
                        className={styles.pdfPreview}
                        title="Aperçu du procès-verbal"
                    />
                </div>
            )}
        </div>
    );
}

export default PVGenerationProgress;

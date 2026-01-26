'use client';

import { useState, useCallback } from 'react';
import { FileText, Download, RefreshCw, CheckCircle, AlertCircle, Clock, Eye, Archive } from 'lucide-react';
import { useGenerateAgDocument, useDownloadAgDocument, useAgDocuments } from '@/hooks/modules/useAgData';
import type { AgDocumentType, AgDocument } from '@/lib/ag/types';
import styles from './AgDocumentActions.module.css';

// ============================================================================
// TYPES
// ============================================================================

interface AgDocumentActionsProps {
  agId: string;
  docType: AgDocumentType;
  agStatus?: string;
  title?: string;
  description?: string;
  showHistory?: boolean;
  onGenerated?: (response: { success: boolean; signed_url?: string; document_id?: string }) => void;
  className?: string;
}

const DOC_TYPE_LABELS: Record<AgDocumentType, string> = {
  convocation: 'Convocation',
  attendance_sheet: 'Feuille de présence',
  pv: 'Procès-verbal',
};

const DOC_TYPE_ICONS: Record<AgDocumentType, typeof FileText> = {
  convocation: FileText,
  attendance_sheet: FileText,
  pv: Archive,
};

// ============================================================================
// COMPONENT
// ============================================================================

export function AgDocumentActions({
  agId,
  docType,
  agStatus,
  title,
  description,
  showHistory = false,
  onGenerated,
  className,
}: AgDocumentActionsProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { documents, isLoading: isLoadingDocs, refresh: refreshDocs, getDocumentByType } = useAgDocuments(agId);
  const { execute: generateDoc, isLoading: isGenerating, error: generateError, progress } = useGenerateAgDocument();
  const { downloadViaSignedUrl, getPreviewUrl, isLoading: isDownloading, error: downloadError } = useDownloadAgDocument();

  // Get the latest document of this type
  const latestDoc = getDocumentByType(docType);

  // Handle document generation
  const handleGenerate = useCallback(async () => {
    const result = await generateDoc(agId, docType);

    if (result.success) {
      refreshDocs();
      if (result.signed_url) {
        setPreviewUrl(result.signed_url);
      }
      onGenerated?.(result);
    }
  }, [agId, docType, generateDoc, refreshDocs, onGenerated]);

  // Handle document download
  const handleDownload = useCallback(async () => {
    if (latestDoc?.storage_path) {
      await downloadViaSignedUrl(latestDoc.storage_path, latestDoc.file_name);
    }
  }, [latestDoc, downloadViaSignedUrl]);

  // Handle document preview
  const handlePreview = useCallback(async () => {
    if (latestDoc?.storage_path) {
      const result = await getPreviewUrl(latestDoc.storage_path);
      if (result.success && result.url) {
        setPreviewUrl(result.url);
      }
    }
  }, [latestDoc, getPreviewUrl]);

  // Format date for display
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const Icon = DOC_TYPE_ICONS[docType];
  const label = title || DOC_TYPE_LABELS[docType];

  return (
    <div className={`${styles.container} ${className || ''}`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <Icon className={styles.icon} size={20} />
          <h3 className={styles.title}>{label}</h3>
          {latestDoc && (
            <span className={styles.badge}>
              <CheckCircle size={14} />
              v{latestDoc.version}
            </span>
          )}
        </div>
        {description && <p className={styles.description}>{description}</p>}
      </div>

      {/* Status */}
      {latestDoc && (
        <div className={styles.status}>
          <div className={styles.statusInfo}>
            <Clock size={14} />
            <span>Généré le {formatDate(latestDoc.generated_at)}</span>
          </div>
          {latestDoc.generated_by_name && (
            <span className={styles.statusBy}>par {latestDoc.generated_by_name}</span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className={styles.actions}>
        {latestDoc ? (
          <>
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className={styles.btnPrimary}
            >
              {isDownloading ? (
                <RefreshCw size={16} className={styles.spinning} />
              ) : (
                <Download size={16} />
              )}
              Télécharger PDF
            </button>
            <button
              onClick={handlePreview}
              disabled={isDownloading}
              className={styles.btnSecondary}
            >
              <Eye size={16} />
              Prévisualiser
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className={styles.btnOutline}
              title="Régénérer le document avec les données actuelles"
            >
              {isGenerating ? (
                <RefreshCw size={16} className={styles.spinning} />
              ) : (
                <RefreshCw size={16} />
              )}
              Régénérer
            </button>
          </>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className={styles.btnPrimary}
          >
            {isGenerating ? (
              <>
                <RefreshCw size={16} className={styles.spinning} />
                Génération...
              </>
            ) : (
              <>
                <FileText size={16} />
                Générer {label}
              </>
            )}
          </button>
        )}
      </div>

      {/* Progress/Error */}
      {progress && !generateError && (
        <div className={styles.progress}>
          <RefreshCw size={14} className={styles.spinning} />
          {progress}
        </div>
      )}

      {(generateError || downloadError) && (
        <div className={styles.error}>
          <AlertCircle size={14} />
          {generateError || downloadError}
        </div>
      )}

      {/* History */}
      {showHistory && documents.filter(d => d.doc_type === docType).length > 1 && (
        <div className={styles.history}>
          <h4 className={styles.historyTitle}>Historique des versions</h4>
          <div className={styles.historyList}>
            {documents
              .filter(d => d.doc_type === docType)
              .sort((a, b) => b.version - a.version)
              .slice(0, 5)
              .map((doc) => (
                <div key={doc.id} className={styles.historyItem}>
                  <span className={styles.historyVersion}>v{doc.version}</span>
                  <span className={styles.historyDate}>{formatDate(doc.generated_at)}</span>
                  <button
                    onClick={() => downloadViaSignedUrl(doc.storage_path, doc.file_name)}
                    className={styles.historyDownload}
                    title="Télécharger cette version"
                  >
                    <Download size={14} />
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewUrl && (
        <div className={styles.previewOverlay} onClick={() => setPreviewUrl(null)}>
          <div className={styles.previewModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.previewHeader}>
              <h3>{label}</h3>
              <button onClick={() => setPreviewUrl(null)} className={styles.closeBtn}>
                &times;
              </button>
            </div>
            <iframe
              src={previewUrl}
              className={styles.previewFrame}
              title={`Prévisualisation ${label}`}
            />
            <div className={styles.previewFooter}>
              <button onClick={() => window.open(previewUrl, '_blank')} className={styles.btnSecondary}>
                Ouvrir dans un nouvel onglet
              </button>
              <button onClick={() => setPreviewUrl(null)} className={styles.btnPrimary}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// QUICK ACTIONS VARIANT
// ============================================================================

interface AgDocumentQuickActionsProps {
  agId: string;
  agStatus?: string;
  compact?: boolean;
  className?: string;
}

export function AgDocumentQuickActions({
  agId,
  agStatus,
  compact = false,
  className,
}: AgDocumentQuickActionsProps) {
  const { documents, isLoading, refresh } = useAgDocuments(agId);
  const { execute: generateDoc, isLoading: isGenerating } = useGenerateAgDocument();
  const { downloadViaSignedUrl, isLoading: isDownloading } = useDownloadAgDocument();

  const hasConvocation = documents.some(d => d.doc_type === 'convocation');
  const hasAttendance = documents.some(d => d.doc_type === 'attendance_sheet');
  const hasPv = documents.some(d => d.doc_type === 'pv');

  const getLatestDoc = (type: AgDocumentType) => {
    return documents
      .filter(d => d.doc_type === type)
      .sort((a, b) => b.version - a.version)[0];
  };

  const handleAction = async (type: AgDocumentType) => {
    const doc = getLatestDoc(type);
    if (doc) {
      await downloadViaSignedUrl(doc.storage_path, doc.file_name);
    } else {
      const result = await generateDoc(agId, type);
      if (result.success) {
        refresh();
        if (result.signed_url) {
          window.open(result.signed_url, '_blank');
        }
      }
    }
  };

  if (compact) {
    return (
      <div className={`${styles.quickActionsCompact} ${className || ''}`}>
        <button
          onClick={() => handleAction('convocation')}
          disabled={isGenerating || isDownloading}
          className={`${styles.quickBtn} ${hasConvocation ? styles.quickBtnGenerated : ''}`}
          title={hasConvocation ? 'Télécharger la convocation' : 'Générer la convocation'}
        >
          <FileText size={16} />
          {hasConvocation ? <CheckCircle size={12} className={styles.checkIcon} /> : null}
        </button>
        <button
          onClick={() => handleAction('attendance_sheet')}
          disabled={isGenerating || isDownloading}
          className={`${styles.quickBtn} ${hasAttendance ? styles.quickBtnGenerated : ''}`}
          title={hasAttendance ? 'Télécharger la feuille de présence' : 'Générer la feuille de présence'}
        >
          <FileText size={16} />
          {hasAttendance ? <CheckCircle size={12} className={styles.checkIcon} /> : null}
        </button>
        <button
          onClick={() => handleAction('pv')}
          disabled={isGenerating || isDownloading}
          className={`${styles.quickBtn} ${hasPv ? styles.quickBtnGenerated : ''}`}
          title={hasPv ? 'Télécharger le PV' : 'Générer le PV'}
        >
          <Archive size={16} />
          {hasPv ? <CheckCircle size={12} className={styles.checkIcon} /> : null}
        </button>
      </div>
    );
  }

  return (
    <div className={`${styles.quickActions} ${className || ''}`}>
      <h4 className={styles.quickActionsTitle}>Documents AG</h4>
      <div className={styles.quickActionsList}>
        <button
          onClick={() => handleAction('convocation')}
          disabled={isGenerating || isDownloading}
          className={`${styles.quickAction} ${hasConvocation ? styles.quickActionGenerated : ''}`}
        >
          <FileText size={18} />
          <span>Convocation</span>
          {hasConvocation && <CheckCircle size={14} className={styles.checkIcon} />}
        </button>
        <button
          onClick={() => handleAction('attendance_sheet')}
          disabled={isGenerating || isDownloading}
          className={`${styles.quickAction} ${hasAttendance ? styles.quickActionGenerated : ''}`}
        >
          <FileText size={18} />
          <span>Feuille présence</span>
          {hasAttendance && <CheckCircle size={14} className={styles.checkIcon} />}
        </button>
        <button
          onClick={() => handleAction('pv')}
          disabled={isGenerating || isDownloading}
          className={`${styles.quickAction} ${hasPv ? styles.quickActionGenerated : ''}`}
        >
          <Archive size={18} />
          <span>Procès-verbal</span>
          {hasPv && <CheckCircle size={14} className={styles.checkIcon} />}
        </button>
      </div>
    </div>
  );
}

export default AgDocumentActions;

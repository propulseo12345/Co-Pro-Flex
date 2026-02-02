'use client';

import { FileText, ClipboardCheck } from 'lucide-react';
import { ConvocationPreview } from '@/components/features/ag/Convocation';
import type { PreviewStatus, PreviewMode } from '@/hooks/modules/useConvocationPreview';
import styles from '@/app/(dashboard)/ag/[id]/convocation/convocation.module.css';

interface ConvocationPreviewColumnProps {
  status: PreviewStatus;
  pdfUrl: string | null;
  error: string | null;
  previewMode: PreviewMode;
  currentVersion: number;
  canSend: boolean;
  onRegenerate: () => Promise<void>;
  onDownload: () => void;
  onModeChange: (mode: PreviewMode) => void;
  onToggleReviewMode: () => void;
}

export function ConvocationPreviewColumn({
  status,
  pdfUrl,
  error,
  previewMode,
  currentVersion,
  canSend,
  onRegenerate,
  onDownload,
  onModeChange,
  onToggleReviewMode,
}: ConvocationPreviewColumnProps) {
  return (
    <div className={styles.previewColumn}>
      <h2 className={styles.previewColumnTitle}>
        <FileText size={24} aria-hidden="true" />
        Prévisualisation
      </h2>
      <ConvocationPreview
        status={status}
        pdfUrl={pdfUrl}
        error={error}
        previewMode={previewMode}
        version={currentVersion}
        onRegenerate={onRegenerate}
        onDownload={onDownload}
        onModeChange={onModeChange}
      />
      <button
        onClick={onToggleReviewMode}
        className={`${styles.reviewBtn} ${canSend ? styles.reviewBtnValidated : ''}`}
      >
        <ClipboardCheck size={16} aria-hidden="true" />
        {canSend ? 'Relecture validée' : 'Mode relecture obligatoire'}
      </button>
    </div>
  );
}

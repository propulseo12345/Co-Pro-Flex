'use client';

import { Send, Download } from 'lucide-react';
import type { RelancePhaseConfig } from '../services/relance-templates';
import styles from '../styles/RelanceModal.module.css';

interface RelancePreviewProps {
  phase: RelancePhaseConfig;
  content: string;
  onContentChange: (content: string) => void;
  channel: string;
  onChannelChange: (channel: string) => void;
  onSend: () => void;
  onDownloadPdf?: () => void;
  isSending: boolean;
}

export function RelancePreview({
  phase, content, onContentChange,
  channel, onChannelChange,
  onSend, onDownloadPdf, isSending,
}: RelancePreviewProps) {
  return (
    <div className={styles.preview}>
      <div className={styles.previewTitle}>
        {phase.label} — Apercu du courrier
      </div>

      <textarea
        className={styles.previewTextarea}
        value={content}
        onChange={e => onContentChange(e.target.value)}
        rows={12}
      />

      <div className={styles.channelRow}>
        <span className={styles.channelLabel}>Canal d'envoi :</span>
        <select
          className={styles.channelSelect}
          value={channel}
          onChange={e => onChannelChange(e.target.value)}
        >
          <option value="email">Email</option>
          <option value="courrier">Courrier</option>
          <option value="both">Email + Courrier</option>
        </select>
      </div>

      <div className={styles.previewActions}>
        {phase.type === 'mise_en_demeure' && onDownloadPdf && (
          <button className={styles.downloadBtn} onClick={onDownloadPdf}>
            <Download size={14} /> Telecharger PDF
          </button>
        )}
        <button
          className={styles.sendBtn}
          onClick={onSend}
          disabled={isSending || !content.trim()}
        >
          <Send size={14} /> {isSending ? 'Envoi...' : 'Envoyer la relance'}
        </button>
      </div>
    </div>
  );
}

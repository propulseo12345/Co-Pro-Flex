'use client';

import { useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import type { CallLineDetailed, CallForFundsOverview } from '@/lib/finance/api';
import { useRelance } from '../hooks/useRelance';
import { formatEuros } from '../utils';
import { RelanceStepper } from './RelanceStepper';
import { RelancePreview } from './RelancePreview';
import styles from '../styles/RelanceModal.module.css';

interface RelanceModalProps {
  line: CallLineDetailed;
  call: CallForFundsOverview;
  coproName: string;
  syndicName: string;
  onClose: () => void;
}

export function RelanceModal({ line, call, coproName, syndicName, onClose }: RelanceModalProps) {
  const [showPreview, setShowPreview] = useState(false);

  const {
    phases, currentPhase, previewContent, setPreviewContent,
    selectedChannel, setSelectedChannel, sendReminder,
    isLoading, isSending, error, allPhasesSent,
  } = useRelance(line, call, coproName, syndicName);

  const handlePreview = () => {
    setShowPreview(true);
  };

  const handleSend = async () => {
    await sendReminder();
    setShowPreview(false);
  };

  const impaye = line.amount_due - line.amount_paid;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerInfo}>
            <div className={styles.headerTitle}>{line.owner_name ?? 'Coproprietaire'}</div>
            <div className={styles.headerMeta}>
              Lot {line.lot_ref} — {call.label}
            </div>
          </div>
          <div>
            <div className={styles.headerAmountLabel}>Impaye</div>
            <div className={styles.headerAmount}>{formatEuros(impaye)}</div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {isLoading ? (
            <div>Chargement...</div>
          ) : allPhasesSent ? (
            <div className={styles.allDone}>
              <CheckCircle2 size={32} />
              <div style={{ marginTop: 8 }}>Toutes les phases de relance ont ete envoyees.</div>
              <div style={{ marginTop: 4, color: 'var(--text-tertiary)', fontSize: 12 }}>
                Ce dossier peut etre transmis au contentieux.
              </div>
            </div>
          ) : (
            <>
              <RelanceStepper phases={phases} onPreview={handlePreview} />

              {showPreview && currentPhase && (
                <RelancePreview
                  phase={currentPhase}
                  content={previewContent}
                  onContentChange={setPreviewContent}
                  channel={selectedChannel}
                  onChannelChange={setSelectedChannel}
                  onSend={handleSend}
                  isSending={isSending}
                />
              )}
            </>
          )}

          {error && <div className={styles.error}>{error}</div>}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button className={styles.footerBtn} onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
}

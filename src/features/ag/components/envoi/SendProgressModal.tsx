'use client';

import { CheckCircle, XCircle, Circle, Loader2, Download, ArrowRight } from 'lucide-react';
import type { SendProgress, DispatchResult } from '@/features/ag/types/envoi-dispatch';
import { SENDING_METHOD_LABELS } from '@/lib/services/convocation-dispatch.service';
import styles from './SendProgressModal.module.css';

interface SendProgressModalProps {
  progress: SendProgress;
  onCancel: () => void;
  onDownloadZip: () => void;
  onContinue: () => void;
}

export function SendProgressModal({
  progress,
  onCancel,
  onDownloadZip,
  onContinue,
}: SendProgressModalProps) {
  if (!progress.isActive) return null;

  const isDone = progress.currentStep === 'done' || progress.currentStep === 'cancelled';
  const percent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  const emailsSent = progress.results.filter(r => r.method === 'EMAIL' && r.status === 'sent').length;
  const postalQueued = progress.results.filter(r =>
    ['RECOMMANDE', 'LETTRE_SIMPLE', 'REMISE_MAIN_PROPRE'].includes(r.method) && r.status === 'queued'
  ).length;
  const errors = progress.results.filter(r => r.status === 'error').length;
  const totalArchived = progress.results.filter(r => r.status !== 'error').length;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal} role="dialog" aria-modal="true">
        <div className={styles.header}>
          <h2 className={styles.title}>
            {isDone
              ? (progress.cancelled ? 'Envoi interrompu' : 'Envoi termine !')
              : 'Envoi des convocations en cours...'}
          </h2>
          {!isDone && (
            <p className={styles.subtitle}>
              {progress.currentName} — {progress.current}/{progress.total}
            </p>
          )}
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${percent}%` }} />
          </div>
        </div>

        <div className={styles.body}>
          {isDone ? (
            <div className={styles.recap}>
              {emailsSent > 0 && (
                <div className={`${styles.recapItem} ${styles.success}`}>
                  <CheckCircle size={16} /> {emailsSent} email(s) envoye(s)
                </div>
              )}
              {postalQueued > 0 && (
                <div className={`${styles.recapItem} ${styles.postal}`}>
                  <Download size={16} /> {postalQueued} courrier(s) pret(s) a telecharger
                </div>
              )}
              {totalArchived > 0 && (
                <div className={`${styles.recapItem} ${styles.success}`}>
                  <CheckCircle size={16} /> {totalArchived} document(s) archive(s) dans la GED
                </div>
              )}
              {errors > 0 && (
                <div className={`${styles.recapItem} ${styles.error}`}>
                  <XCircle size={16} /> {errors} erreur(s)
                </div>
              )}
            </div>
          ) : (
            <div className={styles.resultsList}>
              {progress.results.map((r) => (
                <ResultItem key={`${r.coproprietaireId}-${r.method}`} result={r} />
              ))}
              {!isDone && progress.currentName && (
                <div className={`${styles.resultItem} ${styles.active}`}>
                  <Loader2 size={14} className={styles.spinner} />
                  {progress.currentName}
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          {isDone ? (
            <>
              {postalQueued > 0 && progress.zipUrl && (
                <button className="btn btn-secondary" onClick={onDownloadZip}>
                  <Download size={16} /> Telecharger les courriers (ZIP)
                </button>
              )}
              <button className="btn btn-primary" onClick={onContinue}>
                Continuer <ArrowRight size={16} />
              </button>
            </>
          ) : (
            <button className="btn btn-secondary" onClick={onCancel}>
              Annuler
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultItem({ result }: { result: DispatchResult }) {
  const methodLabel = SENDING_METHOD_LABELS[result.method] || result.method;
  const icon = result.status === 'sent'
    ? <CheckCircle size={14} />
    : result.status === 'error'
      ? <XCircle size={14} />
      : <Circle size={14} />;
  const cls = result.status === 'sent' ? styles.success
    : result.status === 'error' ? styles.error
    : styles.pending;

  return (
    <div className={`${styles.resultItem} ${cls}`}>
      {icon}
      <span>{methodLabel}</span>
      {result.error && <span className={styles.errorDetail}>— {result.error}</span>}
    </div>
  );
}

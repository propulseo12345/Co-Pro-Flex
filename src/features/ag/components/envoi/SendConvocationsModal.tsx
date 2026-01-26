'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Send,
  AlertTriangle,
  CheckCircle,
  Clock,
  Mail,
  Users,
  FileText,
  Loader,
} from 'lucide-react';
import type { SendConvocationsResponse, RecipientWithStatus } from '../../types/notifications';
import styles from './SendConvocationsModal.module.css';

// ============================================================================
// Types
// ============================================================================

interface SendConvocationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipients: RecipientWithStatus[];
  onSend: (params: {
    send_to: 'all' | 'missing_only' | 'selected';
    coproprietaire_ids?: string[];
    dry_run?: boolean;
  }) => Promise<SendConvocationsResponse>;
  onValidateDelay: () => Promise<{ valid: boolean; daysRemaining: number; message: string }>;
}

type SendMode = 'all' | 'missing_only' | 'selected';
type Step = 'validate' | 'configure' | 'preview' | 'sending' | 'result';

// ============================================================================
// Component
// ============================================================================

export function SendConvocationsModal({
  isOpen,
  onClose,
  recipients,
  onSend,
  onValidateDelay,
}: SendConvocationsModalProps) {
  const [step, setStep] = useState<Step>('validate');
  const [sendMode, setSendMode] = useState<SendMode>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [delayValidation, setDelayValidation] = useState<{
    valid: boolean;
    daysRemaining: number;
    message: string;
  } | null>(null);
  const [previewResult, setPreviewResult] = useState<SendConvocationsResponse | null>(null);
  const [sendResult, setSendResult] = useState<SendConvocationsResponse | null>(null);

  // Computed values
  const recipientsWithEmail = recipients.filter(r => r.email);
  const missingConvocations = recipientsWithEmail.filter(r => !r.hasConvocation);
  const selectedRecipients = recipientsWithEmail.filter(r => selectedIds.includes(r.id));

  // Get recipients to send to based on mode
  const getTargetRecipients = () => {
    switch (sendMode) {
      case 'all':
        return recipientsWithEmail;
      case 'missing_only':
        return missingConvocations;
      case 'selected':
        return selectedRecipients;
      default:
        return [];
    }
  };

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setStep('validate');
      setSendMode('all');
      setSelectedIds([]);
      setPreviewResult(null);
      setSendResult(null);
      validateDelay();
    }
  }, [isOpen]);

  // Validate delay
  const validateDelay = async () => {
    setIsLoading(true);
    const result = await onValidateDelay();
    setDelayValidation(result);
    setIsLoading(false);
  };

  // Run dry-run preview
  const runPreview = async () => {
    setIsLoading(true);
    const result = await onSend({
      send_to: sendMode,
      coproprietaire_ids: sendMode === 'selected' ? selectedIds : undefined,
      dry_run: true,
    });
    setPreviewResult(result);
    setIsLoading(false);
    setStep('preview');
  };

  // Send convocations
  const sendConvocations = async () => {
    setStep('sending');
    setIsLoading(true);
    const result = await onSend({
      send_to: sendMode,
      coproprietaire_ids: sendMode === 'selected' ? selectedIds : undefined,
      dry_run: false,
    });
    setSendResult(result);
    setIsLoading(false);
    setStep('result');
  };

  // Toggle selection
  const toggleSelection = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Select all
  const selectAll = () => {
    setSelectedIds(recipientsWithEmail.map(r => r.id));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedIds([]);
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>
            <Send size={20} />
            Envoi des convocations
          </h2>
          <button onClick={onClose} className={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>

        {/* Step: Validate */}
        {step === 'validate' && (
          <div className={styles.content}>
            <div className={styles.stepTitle}>Verification du delai legal</div>

            {isLoading ? (
              <div className={styles.loadingState}>
                <Loader size={24} className={styles.spinner} />
                <span>Verification en cours...</span>
              </div>
            ) : delayValidation ? (
              <div className={`${styles.validationBox} ${delayValidation.valid ? styles.validationSuccess : styles.validationError}`}>
                {delayValidation.valid ? (
                  <CheckCircle size={24} className={styles.iconSuccess} />
                ) : (
                  <AlertTriangle size={24} className={styles.iconWarning} />
                )}
                <div className={styles.validationContent}>
                  <strong>
                    {delayValidation.valid
                      ? `J-${delayValidation.daysRemaining} avant l'AG`
                      : 'Attention: Delai insuffisant'}
                  </strong>
                  <p>{delayValidation.message}</p>
                  {!delayValidation.valid && (
                    <p className={styles.legalNote}>
                      Art. 64 decret 67-223: La convocation doit etre envoyee au minimum 21 jours avant l'AG.
                    </p>
                  )}
                </div>
              </div>
            ) : null}

            <div className={styles.statsBox}>
              <div className={styles.statRow}>
                <Users size={16} />
                <span>{recipientsWithEmail.length} coproprietaires avec email</span>
              </div>
              <div className={styles.statRow}>
                <Mail size={16} />
                <span>{missingConvocations.length} n'ont pas encore recu la convocation</span>
              </div>
            </div>

            <div className={styles.actions}>
              <button onClick={onClose} className={styles.btnSecondary}>
                Annuler
              </button>
              <button
                onClick={() => setStep('configure')}
                className={styles.btnPrimary}
                disabled={!delayValidation}
              >
                Continuer
              </button>
            </div>
          </div>
        )}

        {/* Step: Configure */}
        {step === 'configure' && (
          <div className={styles.content}>
            <div className={styles.stepTitle}>Configuration de l'envoi</div>

            {!delayValidation?.valid && (
              <div className={styles.warningBanner}>
                <AlertTriangle size={16} />
                <span>Le delai legal n'est pas respecte. L'envoi est deconseille.</span>
              </div>
            )}

            <div className={styles.modeSelection}>
              <label className={`${styles.modeOption} ${sendMode === 'all' ? styles.modeOptionActive : ''}`}>
                <input
                  type="radio"
                  name="sendMode"
                  value="all"
                  checked={sendMode === 'all'}
                  onChange={() => setSendMode('all')}
                />
                <div className={styles.modeContent}>
                  <strong>Tous les coproprietaires</strong>
                  <span>{recipientsWithEmail.length} destinataires</span>
                </div>
              </label>

              <label className={`${styles.modeOption} ${sendMode === 'missing_only' ? styles.modeOptionActive : ''}`}>
                <input
                  type="radio"
                  name="sendMode"
                  value="missing_only"
                  checked={sendMode === 'missing_only'}
                  onChange={() => setSendMode('missing_only')}
                />
                <div className={styles.modeContent}>
                  <strong>Uniquement ceux non envoyes</strong>
                  <span>{missingConvocations.length} destinataires</span>
                </div>
              </label>

              <label className={`${styles.modeOption} ${sendMode === 'selected' ? styles.modeOptionActive : ''}`}>
                <input
                  type="radio"
                  name="sendMode"
                  value="selected"
                  checked={sendMode === 'selected'}
                  onChange={() => setSendMode('selected')}
                />
                <div className={styles.modeContent}>
                  <strong>Selection manuelle</strong>
                  <span>{selectedIds.length} selectionne(s)</span>
                </div>
              </label>
            </div>

            {sendMode === 'selected' && (
              <div className={styles.selectionPanel}>
                <div className={styles.selectionHeader}>
                  <button onClick={selectAll} className={styles.selectionBtn}>
                    Tout selectionner
                  </button>
                  <button onClick={clearSelection} className={styles.selectionBtn}>
                    Effacer
                  </button>
                </div>
                <div className={styles.selectionList}>
                  {recipientsWithEmail.map(r => (
                    <label key={r.id} className={styles.selectionItem}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(r.id)}
                        onChange={() => toggleSelection(r.id)}
                      />
                      <span>{r.prenom} {r.nom}</span>
                      <span className={styles.selectionMeta}>{r.email}</span>
                      {r.hasConvocation && (
                        <span className={styles.alreadySentBadge}>Deja envoye</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.actions}>
              <button onClick={() => setStep('validate')} className={styles.btnSecondary}>
                Retour
              </button>
              <button
                onClick={runPreview}
                className={styles.btnPrimary}
                disabled={sendMode === 'selected' && selectedIds.length === 0}
              >
                Apercu avant envoi
              </button>
            </div>
          </div>
        )}

        {/* Step: Preview */}
        {step === 'preview' && (
          <div className={styles.content}>
            <div className={styles.stepTitle}>Apercu de l'envoi</div>

            {isLoading ? (
              <div className={styles.loadingState}>
                <Loader size={24} className={styles.spinner} />
                <span>Preparation de l'apercu...</span>
              </div>
            ) : previewResult ? (
              <>
                {previewResult.validation && (
                  <div className={styles.previewValidation}>
                    <div className={styles.previewRow}>
                      <Clock size={16} />
                      <span>Date de convocation: {new Date().toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div className={styles.previewRow}>
                      <FileText size={16} />
                      <span>J-{previewResult.validation.days_until_meeting} avant l'AG</span>
                    </div>
                  </div>
                )}

                <div className={styles.previewSummary}>
                  <div className={styles.previewStat}>
                    <span className={styles.previewStatValue}>{previewResult.summary?.total || 0}</span>
                    <span className={styles.previewStatLabel}>Total</span>
                  </div>
                  <div className={styles.previewStat}>
                    <span className={`${styles.previewStatValue} ${styles.valueSuccess}`}>
                      {(previewResult.summary?.total || 0) - (previewResult.summary?.skipped || 0)}
                    </span>
                    <span className={styles.previewStatLabel}>A envoyer</span>
                  </div>
                  <div className={styles.previewStat}>
                    <span className={`${styles.previewStatValue} ${styles.valueWarning}`}>
                      {previewResult.summary?.skipped || 0}
                    </span>
                    <span className={styles.previewStatLabel}>Ignores</span>
                  </div>
                </div>

                {previewResult.details && previewResult.details.length > 0 && (
                  <div className={styles.previewList}>
                    {previewResult.details.slice(0, 10).map(d => (
                      <div key={d.coproprietaire_id} className={styles.previewItem}>
                        <span>{d.name}</span>
                        <span className={styles.previewEmail}>{d.email}</span>
                        {d.status === 'skipped' && (
                          <span className={styles.skippedBadge}>Ignore</span>
                        )}
                      </div>
                    ))}
                    {previewResult.details.length > 10 && (
                      <div className={styles.previewMore}>
                        + {previewResult.details.length - 10} autres...
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : null}

            <div className={styles.actions}>
              <button onClick={() => setStep('configure')} className={styles.btnSecondary}>
                Retour
              </button>
              <button onClick={sendConvocations} className={styles.btnPrimary}>
                <Send size={16} />
                Envoyer les convocations
              </button>
            </div>
          </div>
        )}

        {/* Step: Sending */}
        {step === 'sending' && (
          <div className={styles.content}>
            <div className={styles.sendingState}>
              <Loader size={48} className={styles.spinner} />
              <h3>Envoi en cours...</h3>
              <p>Merci de patienter, l'envoi des convocations est en cours.</p>
            </div>
          </div>
        )}

        {/* Step: Result */}
        {step === 'result' && sendResult && (
          <div className={styles.content}>
            <div className={styles.stepTitle}>Resultat de l'envoi</div>

            {sendResult.success ? (
              <div className={styles.resultSuccess}>
                <CheckCircle size={48} className={styles.iconSuccess} />
                <h3>Envoi termine</h3>
              </div>
            ) : (
              <div className={styles.resultError}>
                <AlertTriangle size={48} className={styles.iconWarning} />
                <h3>Erreur lors de l'envoi</h3>
                <p>{sendResult.error}</p>
              </div>
            )}

            {sendResult.summary && (
              <div className={styles.resultSummary}>
                <div className={styles.resultStat}>
                  <span className={styles.resultStatValue}>{sendResult.summary.total}</span>
                  <span className={styles.resultStatLabel}>Total</span>
                </div>
                <div className={styles.resultStat}>
                  <span className={`${styles.resultStatValue} ${styles.valueSuccess}`}>
                    {sendResult.summary.sent}
                  </span>
                  <span className={styles.resultStatLabel}>Envoyes</span>
                </div>
                <div className={styles.resultStat}>
                  <span className={`${styles.resultStatValue} ${styles.valueError}`}>
                    {sendResult.summary.failed}
                  </span>
                  <span className={styles.resultStatLabel}>Echecs</span>
                </div>
              </div>
            )}

            <div className={styles.actions}>
              <button onClick={onClose} className={styles.btnPrimary}>
                Fermer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

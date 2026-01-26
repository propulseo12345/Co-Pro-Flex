'use client';

import { X, Mail, Send, FileText, Gavel, Eye, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import type { Impaye } from '../domain/types';
import { WORKFLOW_STEPS } from '../domain/constants';
import { getWorkflowIndex } from '../domain/utils';
import styles from '../../../../../app/(dashboard)/ventes-impayes/impayes/impayes.module.css';

interface RelanceModalProps {
  isOpen: boolean;
  impaye: Impaye | null;
  relanceType: string;
  isProcessing: boolean;
  onClose: () => void;
  onRelanceTypeChange: (type: string) => void;
  onPreviewPDF: (type: string) => void;
  onSendRelance: () => void;
}

export function RelanceModal({
  isOpen,
  impaye,
  relanceType,
  isProcessing,
  onClose,
  onRelanceTypeChange,
  onPreviewPDF,
  onSendRelance,
}: RelanceModalProps) {
  if (!isOpen || !impaye) return null;

  const currentIndex = getWorkflowIndex(impaye.statut);

  return (
    <div className={styles.modalOverlay} aria-hidden="true" onClick={() => !isProcessing && onClose()}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={styles.modalHeader}>
          <h2>Envoyer une relance</h2>
          <button className={styles.closeBtn} onClick={onClose} disabled={isProcessing}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.modalContent}>
          <div className={styles.relancePreview}>
            <div className={styles.relanceInfo}>
              <h4>Destinataire</h4>
              <p>{impaye.coproprietaire.nom}</p>
              <p className={styles.subInfo}>
                {impaye.lot} - {impaye.batiment}
              </p>
            </div>

            <div className={styles.relanceInfo}>
              <h4>Montant réclamé</h4>
              <p className={styles.montantRelance}>{impaye.montant.toLocaleString('fr-FR')} €</p>
            </div>

            <div className={styles.relanceInfo}>
              <h4>Type de relance</h4>
              <div className={styles.relanceTypeSelector}>
                {WORKFLOW_STEPS.filter((s) => {
                  const stepIndex = WORKFLOW_STEPS.findIndex((ws) => ws.id === s.id);
                  return stepIndex > currentIndex;
                }).map((step) => {
                  const Icon = step.icon;
                  return (
                    <button
                      key={step.id}
                      className={clsx(styles.relanceTypeBtn, relanceType === step.id && styles.selected)}
                      onClick={() => onRelanceTypeChange(step.id)}
                      style={{
                        borderColor: relanceType === step.id ? step.color : undefined,
                        background: relanceType === step.id ? `${step.color}10` : undefined,
                      }}
                    >
                      <Icon size={18} style={{ color: step.color }} aria-hidden="true" />
                      <span>{step.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.relanceInfo}>
              <h4>Mode d'envoi</h4>
              <p>
                {relanceType === 'relance_amiable_1' && (
                  <>
                    <Mail size={14} aria-hidden="true" /> Email à {impaye.coproprietaire.email}
                  </>
                )}
                {relanceType === 'relance_amiable_2' && (
                  <>
                    <Send size={14} aria-hidden="true" /> Courrier recommandé à {impaye.coproprietaire.adresse}
                  </>
                )}
                {relanceType === 'mise_en_demeure' && (
                  <>
                    <FileText size={14} aria-hidden="true" /> Envoi par huissier à {impaye.coproprietaire.adresse}
                  </>
                )}
                {relanceType === 'contentieux' && (
                  <>
                    <Gavel size={14} aria-hidden="true" /> Transmission du dossier à l'avocat
                  </>
                )}
              </p>
            </div>

            {relanceType && relanceType !== 'contentieux' && (
              <div className={styles.previewButtonContainer}>
                <button className={styles.previewRelanceBtn} onClick={() => onPreviewPDF(relanceType)} disabled={isProcessing}>
                  <Eye size={16} aria-hidden="true" />
                  Prévisualiser le contenu avant envoi
                </button>
              </div>
            )}

            <div className={styles.warningBox}>
              <AlertCircle size={16} aria-hidden="true" />
              <p>
                Cette action sera enregistrée dans l'historique de l'impayé et ne pourra pas être annulée.
                <strong> Vérifiez le contenu avant d'envoyer.</strong>
              </p>
            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className="btn btn-secondary" onClick={onClose} disabled={isProcessing}>
            Annuler
          </button>
          <button className="btn btn-primary" onClick={onSendRelance} disabled={!relanceType || isProcessing}>
            {isProcessing ? (
              <>
                <span className={styles.spinner} />
                Envoi en cours...
              </>
            ) : (
              <>
                <Send size={16} aria-hidden="true" />
                Confirmer l'envoi
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

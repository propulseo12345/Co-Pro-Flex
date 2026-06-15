'use client';

import { FileText, FileCheck, Pen, CheckCircle2, XCircle, Send } from 'lucide-react';
import styles from '@/app/(dashboard)/ventes-impayes/ventes/[id]/detail-vente.module.css';

interface AvailableActions {
  canGeneratePreEtat: boolean;
  canGenerateFinalEtat: boolean;
  canSendToNotary: boolean;
  canMarkAsSigned: boolean;
  canValidate: boolean;
  canCancel: boolean;
}

interface MutationActionsProps {
  availableActions: AvailableActions;
  isProcessing: boolean;
  onGeneratePreEtat: () => void;
  onGenerateFinalEtat: () => void;
  onSendToNotary: () => void;
  onMarkAsSigned: () => void;
  onValidate: () => void;
  onCancel: () => void;
}

export function MutationActions({
  availableActions,
  isProcessing,
  onGeneratePreEtat,
  onGenerateFinalEtat,
  onSendToNotary,
  onMarkAsSigned,
  onValidate,
  onCancel,
}: MutationActionsProps) {
  return (
    <div className={`${styles.sidebarCard} ${styles.actionsCard}`}>
      <h3 className={styles.cardTitle}>Actions</h3>
      <div className={styles.actionsList}>
        {availableActions.canGeneratePreEtat && (
          <button
            className={`${styles.actionBtn} ${styles.actionPrimary}`}
            onClick={onGeneratePreEtat}
            disabled={isProcessing}
          >
            <FileText size={18} />
            Générer le pré-état daté
          </button>
        )}

        {availableActions.canGenerateFinalEtat && (
          <button
            className={`${styles.actionBtn} ${styles.actionPrimary}`}
            onClick={onGenerateFinalEtat}
            disabled={isProcessing}
          >
            <FileCheck size={18} />
            Générer l&apos;état daté final
          </button>
        )}

        {availableActions.canSendToNotary && (
          <button
            className={`${styles.actionBtn} ${styles.actionPrimary}`}
            onClick={onSendToNotary}
            disabled={isProcessing}
          >
            <Send size={18} />
            Envoyer au notaire
          </button>
        )}

        {availableActions.canMarkAsSigned && (
          <button
            className={`${styles.actionBtn} ${styles.actionSecondary}`}
            onClick={onMarkAsSigned}
            disabled={isProcessing}
          >
            <Pen size={18} />
            Marquer acte signé
          </button>
        )}

        {availableActions.canValidate && (
          <button
            className={`${styles.actionBtn} ${styles.actionSuccess}`}
            onClick={onValidate}
            disabled={isProcessing}
          >
            <CheckCircle2 size={18} />
            Valider la mutation
          </button>
        )}

        {availableActions.canCancel && (
          <button
            className={`${styles.actionBtn} ${styles.actionDanger}`}
            onClick={onCancel}
            disabled={isProcessing}
          >
            <XCircle size={18} />
            Annuler
          </button>
        )}
      </div>
    </div>
  );
}

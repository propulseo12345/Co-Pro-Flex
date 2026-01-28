'use client';

import { useState } from 'react';
import { Send, X, Eye, AlertTriangle, RefreshCw } from 'lucide-react';
import type { UnpaidWithReminder } from '@/hooks/modules/useFinanceData';
import styles from './Reminders.module.css';

export interface ManualPreviewResult {
  success: boolean;
  would_send: boolean;
  delay_level: number;
}

interface ManualReminderModalProps {
  lot: UnpaidWithReminder;
  onClose: () => void;
  onConfirm: (dryRun: boolean) => Promise<void>;
  isLoading: boolean;
  previewResult: ManualPreviewResult | null;
}

export function ManualReminderModal({
  lot,
  onClose,
  onConfirm,
  isLoading,
  previewResult
}: ManualReminderModalProps) {
  const [dryRun, setDryRun] = useState(true);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>
            <Send size={18} />
            Envoyer une relance
          </h3>
          <button className={styles.modalCloseBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.modalContent}>
          <div className={styles.reminderDetails}>
            <div className={styles.reminderDetailRow}>
              <span className={styles.reminderDetailLabel}>Lot</span>
              <span className={styles.reminderDetailValue}>{lot.lot_ref}</span>
            </div>
            <div className={styles.reminderDetailRow}>
              <span className={styles.reminderDetailLabel}>Proprietaire</span>
              <span className={styles.reminderDetailValue}>{lot.owner_name || 'Non renseigne'}</span>
            </div>
            <div className={styles.reminderDetailRow}>
              <span className={styles.reminderDetailLabel}>Email</span>
              <span className={styles.reminderDetailValue}>{lot.owner_email || 'Non renseigne'}</span>
            </div>
            <div className={styles.reminderDetailRow}>
              <span className={styles.reminderDetailLabel}>Montant impaye</span>
              <span className={`${styles.reminderDetailValue} ${styles.reminderDetailValueError}`}>
                {Number(lot.total_unpaid).toLocaleString('fr-FR')} EUR
              </span>
            </div>
            <div className={styles.reminderDetailRow}>
              <span className={styles.reminderDetailLabel}>Jours de retard</span>
              <span className={styles.reminderDetailValue}>{lot.days_overdue} jours</span>
            </div>
            {lot.total_reminders_sent > 0 && (
              <div className={styles.reminderDetailRow}>
                <span className={styles.reminderDetailLabel}>Relances deja envoyees</span>
                <span className={styles.reminderDetailValue}>{lot.total_reminders_sent}</span>
              </div>
            )}
          </div>

          <div className={styles.dryRunToggle}>
            <label>
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
              />
              <span>Mode simulation</span>
            </label>
            <div className={styles.dryRunDescription}>
              {dryRun
                ? "Aucun email ne sera envoye. Previsualisation uniquement."
                : "L'email sera reellement envoye au proprietaire."}
            </div>
          </div>

          {previewResult && (
            <div className={styles.previewResults}>
              <div className={styles.previewTitle}>
                <Eye size={16} />
                Resultat de la simulation
              </div>
              <div className={styles.previewItem}>
                <span className={styles.previewItemLabel}>Niveau de relance</span>
                <span className={styles.previewItemValue}>J+{previewResult.delay_level}</span>
              </div>
              <div className={styles.previewItem}>
                <span className={styles.previewItemLabel}>Envoi prevu</span>
                <span className={styles.previewItemValue}>
                  {previewResult.would_send ? 'Oui' : 'Non (deja relance a ce niveau)'}
                </span>
              </div>
            </div>
          )}

          {!dryRun && (
            <div className={styles.warningBox}>
              <AlertTriangle size={20} />
              <div className={styles.warningContent}>
                <p>
                  Un email sera envoye a <strong>{lot.owner_email}</strong>.
                  Cette action est irreversible.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className={styles.modalActions}>
          <button className="btn btn-secondary" onClick={onClose} disabled={isLoading}>
            Annuler
          </button>
          <button
            className="btn btn-primary"
            onClick={() => onConfirm(dryRun)}
            disabled={isLoading || !lot.owner_email}
          >
            {isLoading ? (
              <>
                <RefreshCw size={16} className="spinning" />
                {dryRun ? 'Simulation...' : 'Envoi...'}
              </>
            ) : dryRun ? (
              <>
                <Eye size={16} />
                Simuler
              </>
            ) : (
              <>
                <Send size={16} />
                Envoyer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Send, X, Eye, AlertTriangle, RefreshCw } from 'lucide-react';
import styles from './Reminders.module.css';

export interface BulkPreviewResult {
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
}

interface BulkReminderModalProps {
  unpaidCount: number;
  eligibleCount: number;
  totalAmount: number;
  onClose: () => void;
  onConfirm: (dryRun: boolean) => Promise<void>;
  isLoading: boolean;
  previewResult: BulkPreviewResult | null;
}

export function BulkReminderModal({
  unpaidCount,
  eligibleCount,
  totalAmount,
  onClose,
  onConfirm,
  isLoading,
  previewResult
}: BulkReminderModalProps) {
  const [dryRun, setDryRun] = useState(true);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>
            <Send size={18} />
            Executer les relances automatiques
          </h3>
          <button className={styles.modalCloseBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.modalContent}>
          <div className={styles.bulkStats}>
            <div className={styles.bulkStatItem}>
              <div className={styles.bulkStatValue}>{unpaidCount}</div>
              <div className={styles.bulkStatLabel}>Lots en retard</div>
            </div>
            <div className={styles.bulkStatItem}>
              <div className={styles.bulkStatValue}>{eligibleCount}</div>
              <div className={styles.bulkStatLabel}>Eligibles</div>
            </div>
            <div className={styles.bulkStatItem}>
              <div className={styles.bulkStatValue} style={{ color: 'var(--error)' }}>
                {totalAmount.toLocaleString('fr-FR')} EUR
              </div>
              <div className={styles.bulkStatLabel}>Total impaye</div>
            </div>
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
                ? "Aucun email ne sera envoye. Previsualisation du nombre de relances."
                : "Les emails seront reellement envoyes aux proprietaires."}
            </div>
          </div>

          {previewResult && (
            <div className={styles.previewResults}>
              <div className={styles.previewTitle}>
                <Eye size={16} />
                {dryRun ? 'Resultat de la simulation' : 'Resultat de l\'execution'}
              </div>
              <div className={styles.previewItem}>
                <span className={styles.previewItemLabel}>Traites</span>
                <span className={styles.previewItemValue}>{previewResult.processed}</span>
              </div>
              <div className={styles.previewItem}>
                <span className={styles.previewItemLabel}>Envoyes</span>
                <span className={styles.previewItemValue} style={{ color: 'var(--success)' }}>
                  {previewResult.sent}
                </span>
              </div>
              <div className={styles.previewItem}>
                <span className={styles.previewItemLabel}>Ignores (deja relances)</span>
                <span className={styles.previewItemValue}>{previewResult.skipped}</span>
              </div>
              {previewResult.failed > 0 && (
                <div className={styles.previewItem}>
                  <span className={styles.previewItemLabel}>Echoues</span>
                  <span className={styles.previewItemValue} style={{ color: 'var(--error)' }}>
                    {previewResult.failed}
                  </span>
                </div>
              )}
            </div>
          )}

          {!dryRun && !previewResult && (
            <div className={styles.warningBox}>
              <AlertTriangle size={20} />
              <div className={styles.warningContent}>
                <p>
                  Des emails de relance seront envoyes a tous les proprietaires
                  eligibles. Cette action est irreversible.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className={styles.modalActions}>
          <button className="btn btn-secondary" onClick={onClose} disabled={isLoading}>
            {previewResult && !dryRun ? 'Fermer' : 'Annuler'}
          </button>
          {(!previewResult || dryRun) && (
            <button
              className="btn btn-primary"
              onClick={() => onConfirm(dryRun)}
              disabled={isLoading || eligibleCount === 0}
            >
              {isLoading ? (
                <>
                  <RefreshCw size={16} className="spinning" />
                  {dryRun ? 'Simulation...' : 'Execution...'}
                </>
              ) : dryRun ? (
                <>
                  <Eye size={16} />
                  Simuler
                </>
              ) : (
                <>
                  <Send size={16} />
                  Executer
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

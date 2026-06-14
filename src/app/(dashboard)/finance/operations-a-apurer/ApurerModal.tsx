'use client';

import { X, Layers, AlertTriangle, Loader2 } from 'lucide-react';
import type { WorksPendingSettlement } from '@/lib/finance/api';
import styles from './styles.module.css';

const eur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

interface ApurerModalProps {
  row: WorksPendingSettlement;
  isLoading: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

export function ApurerModal({ row, isLoading, error, onConfirm, onClose }: ApurerModalProps) {
  const isCall = row.works_balance > 0; // solde débiteur -> appel ; créditeur -> remboursement
  const amount = Math.abs(row.works_balance);

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            <Layers size={20} className={styles.modalTitleIcon} />
            Apurer le solde travaux
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Fermer" disabled={isLoading}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.recap}>
            <div className={styles.recapRow}>
              <span className={styles.recapLabel}>Exercice</span>
              <span className={styles.recapValue}>{row.period_name}</span>
            </div>
            <div className={styles.recapRow}>
              <span className={styles.recapLabel}>Solde travaux (compte 12)</span>
              <span className={`${styles.recapValue} ${styles.recapValueWarn}`}>{eur(amount)}</span>
            </div>
            <div className={styles.recapRow}>
              <span className={styles.recapLabel}>Écriture passée</span>
              <span className={styles.recapValue}>{isCall ? 'C 12 / D 450-2' : 'D 12 / C 450-2'}</span>
            </div>
            <div className={styles.recapRow}>
              <span className={styles.recapLabel}>Effet</span>
              <span className={styles.recapValue}>
                {isCall ? 'Appel aux copropriétaires' : 'Remboursement aux copropriétaires'}
              </span>
            </div>
          </div>

          <div className={styles.warningBox}>
            <AlertTriangle size={16} className={styles.warnIcon} />
            <span>
              Cette affectation déverse le solde travaux vers les copropriétaires (450-2) par quote-part et
              est <strong>définitive</strong>. À ne déclencher qu&apos;à la <strong>clôture définitive de
              l&apos;opération de travaux</strong>.
            </span>
          </div>

          {error && <div className={styles.mutationError}>{error}</div>}
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={isLoading}>
            Annuler
          </button>
          <button className={styles.confirmBtn} onClick={onConfirm} disabled={isLoading}>
            {isLoading && <Loader2 size={16} className={styles.spin} />}
            Affecter aux copropriétaires
          </button>
        </div>
      </div>
    </div>
  );
}

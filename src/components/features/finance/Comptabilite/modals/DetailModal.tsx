'use client';

import { Link as LinkIcon } from 'lucide-react';
import { OperationComptable, Depense } from '../types';
import { TYPE_DEPENSE_LABELS } from '../data';
import { formatCurrency, formatDate } from '../utils';
import styles from '../Comptabilite.module.css';

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedOperation: OperationComptable | null;
  selectedDepense: Depense | null;
}

export function DetailModal({
  isOpen,
  onClose,
  selectedOperation,
  selectedDepense
}: DetailModalProps) {
  if (!isOpen || (!selectedOperation && !selectedDepense)) return null;

  return (
    <div className={styles.modalOverlay} aria-hidden="true" onClick={onClose}>
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Détails de l'opération</h2>
        </div>

        <div className={styles.modalBody}>
          {selectedOperation && (
            <>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Date</span>
                <span className={styles.detailValue}>
                  {formatDate(selectedOperation.date)}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Compte</span>
                <span className={styles.detailValue}>
                  {selectedOperation.compte} - {selectedOperation.compteLabel}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Libellé</span>
                <span className={styles.detailValue}>{selectedOperation.libelle}</span>
              </div>
              {selectedOperation.debit > 0 && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Débit</span>
                  <span className={`${styles.detailValue} ${styles.debit}`}>
                    {formatCurrency(selectedOperation.debit)}
                  </span>
                </div>
              )}
              {selectedOperation.credit > 0 && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Crédit</span>
                  <span className={`${styles.detailValue} ${styles.credit}`}>
                    {formatCurrency(selectedOperation.credit)}
                  </span>
                </div>
              )}
              {selectedOperation.solde !== undefined && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Solde</span>
                  <span className={styles.detailValue}>
                    {formatCurrency(selectedOperation.solde)}
                  </span>
                </div>
              )}
              {selectedOperation.factureLiee && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Facture liée</span>
                  <span className={styles.detailValue}>
                    <LinkIcon size={14} /> {selectedOperation.factureLiee}
                  </span>
                </div>
              )}
              {selectedOperation.mouvementBancaireLie && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Mouvement bancaire</span>
                  <span className={styles.detailValue}>
                    <LinkIcon size={14} /> {selectedOperation.mouvementBancaireLie}
                  </span>
                </div>
              )}
            </>
          )}

          {selectedDepense && (
            <>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Date</span>
                <span className={styles.detailValue}>
                  {formatDate(selectedDepense.date)}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Libellé</span>
                <span className={styles.detailValue}>{selectedDepense.libelle}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Fournisseur</span>
                <span className={styles.detailValue}>{selectedDepense.fournisseur}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Type de dépense</span>
                <span className={styles.detailValue}>
                  {TYPE_DEPENSE_LABELS[selectedDepense.typeDepense]}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Montant</span>
                <span className={`${styles.detailValue} ${styles.montant}`}>
                  {formatCurrency(selectedDepense.montant)}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Budget prévu</span>
                <span className={styles.detailValue}>
                  {formatCurrency(selectedDepense.budgetPrevu || 0)}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Compte comptable</span>
                <span className={styles.detailValue}>
                  {selectedDepense.compte} - {selectedDepense.compteLabel}
                </span>
              </div>
              {selectedDepense.factureLiee && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Facture liée</span>
                  <span className={styles.detailValue}>
                    <LinkIcon size={14} /> {selectedDepense.factureLiee}
                  </span>
                </div>
              )}
              {selectedDepense.mouvementBancaireLie && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Mouvement bancaire</span>
                  <span className={styles.detailValue}>
                    <LinkIcon size={14} /> {selectedDepense.mouvementBancaireLie}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.closeButton} onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

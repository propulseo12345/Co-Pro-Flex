'use client';

import { useState } from 'react';
import { Link as LinkIcon, RotateCcw } from 'lucide-react';
import { OperationComptable, Depense } from '../types';
import { TYPE_DEPENSE_LABELS } from '../data';
import { formatCurrency, formatDate } from '../utils';
import styles from '../Comptabilite.module.css';

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedOperation: OperationComptable | null;
  selectedDepense: Depense | null;
  // Contre-passation (0071) — optionnel (non passé dans les contextes lecture seule).
  canReverse?: boolean;
  isReversing?: boolean;
  reverseError?: string | null;
  onReverse?: (reason: string) => void;
}

export function DetailModal({
  isOpen,
  onClose,
  selectedOperation,
  selectedDepense,
  canReverse = false,
  isReversing = false,
  reverseError = null,
  onReverse,
}: DetailModalProps) {
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);

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
              {selectedOperation.isReversed && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Statut</span>
                  <span className={styles.reversedBadge}>Écriture contre-passée</span>
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

        {/* Contre-passation : disponible sur une écriture postée non régénérable, pas déjà extournée,
            tant qu'une période ouverte existe (gate calculé en amont dans le hook). */}
        {selectedOperation && canReverse && onReverse && (
          <div className={styles.reverseSection}>
            {!confirming ? (
              <button
                type="button"
                className={styles.reverseButton}
                onClick={() => setConfirming(true)}
              >
                <RotateCcw size={14} /> Contre-passer cette écriture
              </button>
            ) : (
              <>
                <span className={styles.reverseHint}>
                  Une écriture inverse sera créée dans la période ouverte (le grand livre est immuable,
                  l&apos;écriture d&apos;origine est conservée). Motif :
                </span>
                <textarea
                  className={styles.reverseTextarea}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Motif de la contre-passation (ex. erreur de saisie)"
                />
                {reverseError && <span className={styles.reverseError}>{reverseError}</span>}
                <button
                  type="button"
                  className={styles.reverseButton}
                  disabled={isReversing || reason.trim().length === 0}
                  onClick={() => onReverse(reason.trim())}
                >
                  {isReversing ? 'Contre-passation…' : 'Confirmer la contre-passation'}
                </button>
              </>
            )}
          </div>
        )}

        <div className={styles.modalFooter}>
          <button className={styles.closeButton} onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

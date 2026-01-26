'use client';

import { useId } from 'react';
import { X, History, CreditCard, Calendar, FileText, CheckCircle } from 'lucide-react';
import type { CoproprietaireAppel } from '../types';
import { formatCurrency } from '../utils';
import styles from '../appels-fonds.module.css';

export interface PaiementHistorique {
  id: string;
  montant: number;
  datePaiement: string;
  modePaiement: string;
  reference?: string;
  commentaire?: string;
}

interface HistoriquePaiementsModalProps {
  coproprietaire: CoproprietaireAppel;
  paiements: PaiementHistorique[];
  onClose: () => void;
}

const getModePaiementLabel = (mode: string): string => {
  const labels: Record<string, string> = {
    VIREMENT: 'Virement bancaire',
    CHEQUE: 'Chèque',
    PRELEVEMENT: 'Prélèvement',
    CB: 'Carte bancaire',
    ESPECES: 'Espèces',
  };
  return labels[mode] || mode;
};

export function HistoriquePaiementsModal({
  coproprietaire,
  paiements,
  onClose,
}: HistoriquePaiementsModalProps) {
  const titleId = useId();
  const totalPaye = paiements.reduce((sum, p) => sum + p.montant, 0);
  const resteADu = coproprietaire.montantIndividuel - totalPaye;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className={styles.modalHeader}>
          <div>
            <h2 id={titleId} className={styles.modalTitle}>
              <History size={20} aria-hidden="true" style={{ marginRight: 8 }} />
              Historique des paiements
            </h2>
            <p className={styles.modalSubtitle}>{coproprietaire.nom} - Lot {coproprietaire.lot}</p>
          </div>
          <button
            className={styles.modalClose}
            onClick={onClose}
            aria-label="Fermer"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Récapitulatif */}
          <div className={styles.paiementRecap}>
            <div className={styles.paiementRecapItem}>
              <span className={styles.paiementRecapLabel}>Montant appelé</span>
              <span className={styles.paiementRecapValue}>
                {formatCurrency(coproprietaire.montantIndividuel)}
              </span>
            </div>
            <div className={styles.paiementRecapItem}>
              <span className={styles.paiementRecapLabel}>Total payé</span>
              <span className={styles.paiementRecapValue} style={{ color: 'var(--success)' }}>
                {formatCurrency(totalPaye)}
              </span>
            </div>
            <div className={styles.paiementRecapItem}>
              <span className={styles.paiementRecapLabel}>
                {resteADu > 0 ? 'Reste à payer' : 'Statut'}
              </span>
              <span className={styles.paiementRecapValue} style={{ color: resteADu > 0 ? 'var(--warning)' : 'var(--success)' }}>
                {resteADu > 0 ? formatCurrency(resteADu) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle size={16} aria-hidden="true" />
                    Soldé
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Liste des paiements */}
          {paiements.length === 0 ? (
            <div className={styles.emptyState}>
              <History size={48} aria-hidden="true" />
              <p>Aucun paiement enregistré</p>
            </div>
          ) : (
            <div className={styles.paiementsList}>
              {paiements.map((paiement, index) => (
                <div key={paiement.id} className={styles.paiementItem}>
                  <div className={styles.paiementItemHeader}>
                    <span className={styles.paiementItemIndex}>
                      Paiement #{index + 1}
                    </span>
                    <span className={styles.paiementItemMontant}>
                      {formatCurrency(paiement.montant)}
                    </span>
                  </div>
                  <div className={styles.paiementItemDetails}>
                    <div className={styles.paiementItemDetail}>
                      <Calendar size={14} aria-hidden="true" />
                      <span>
                        {new Date(paiement.datePaiement).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className={styles.paiementItemDetail}>
                      <CreditCard size={14} aria-hidden="true" />
                      <span>{getModePaiementLabel(paiement.modePaiement)}</span>
                    </div>
                    {paiement.reference && (
                      <div className={styles.paiementItemDetail}>
                        <FileText size={14} aria-hidden="true" />
                        <span>Réf: {paiement.reference}</span>
                      </div>
                    )}
                  </div>
                  {paiement.commentaire && (
                    <p className={styles.paiementItemCommentaire}>
                      {paiement.commentaire}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

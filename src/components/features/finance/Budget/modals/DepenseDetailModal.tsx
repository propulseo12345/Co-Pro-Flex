'use client';

import { useState } from 'react';
import { X, Paperclip, Eye, Edit2, Send, CheckCircle, XCircle } from 'lucide-react';
import type { DepenseEtendue } from '@/types/models/finance';
import { PosteBudgetData } from '../types';
import styles from './DepenseDetailModal.module.css';

interface DepenseDetailModalProps {
  selectedDepense: DepenseEtendue;
  postesBudget: PosteBudgetData[];
  onClose: () => void;
  onViewDocument: (documentName: string) => void;
  onEdit?: (depense: DepenseEtendue) => void;
  onSubmitForValidation?: (depenseId: string) => void;
  onValidate?: (depenseId: string) => void;
  onReject?: (depenseId: string, commentaire: string) => void;
  isValidator?: boolean;
}

function getStatusBadge(statut?: string) {
  if (!statut) return null;
  const map: Record<string, { label: string; className: string }> = {
    VALIDEE: { label: 'Validée', className: styles.statusValidee },
    BROUILLON: { label: 'Brouillon', className: styles.statusBrouillon },
    EN_ATTENTE_VALIDATION: { label: 'En attente', className: styles.statusEnAttente },
    REJETEE: { label: 'Rejetée', className: styles.statusRejetee },
  };
  const config = map[statut];
  if (!config) return null;
  return <span className={`${styles.statusBadge} ${config.className}`}>{config.label}</span>;
}

export function DepenseDetailModal({
  selectedDepense,
  postesBudget,
  onClose,
  onViewDocument,
  onEdit,
  onSubmitForValidation,
  onValidate,
  onReject,
  isValidator = false,
}: DepenseDetailModalProps) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectComment, setRejectComment] = useState('');

  const isEditable = selectedDepense.statut === 'BROUILLON' || selectedDepense.statut === 'REJETEE';
  const canSubmit = !!(
    (selectedDepense.pieceJointe || selectedDepense.pieceJointeDetails) &&
    selectedDepense.statut === 'BROUILLON'
  );
  const canValidate = isValidator && selectedDepense.statut === 'EN_ATTENTE_VALIDATION';
  const posteLabel = selectedDepense.poste
    ? postesBudget.find((p) => p.poste === selectedDepense.poste)?.label || 'Non classé'
    : 'Non classé';

  const handleReject = () => {
    if (rejectComment.trim() && onReject) {
      onReject(selectedDepense.id, rejectComment);
      setShowRejectForm(false);
      setRejectComment('');
      onClose();
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h2 className={styles.title}>Détail de la dépense</h2>
            {getStatusBadge(selectedDepense.statut)}
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {/* Amount hero */}
          <div className={styles.amountCard}>
            <div className={styles.amountLabel}>Montant</div>
            <div className={styles.amountValue}>-{selectedDepense.montant.toLocaleString('fr-FR')} €</div>
          </div>

          {/* Reject banner */}
          {selectedDepense.statut === 'REJETEE' && selectedDepense.commentaireRejet && (
            <div className={styles.rejectBanner}>
              <div className={styles.rejectTitle}>Motif du rejet :</div>
              <p className={styles.rejectText}>{selectedDepense.commentaireRejet}</p>
            </div>
          )}

          {/* Date + Poste */}
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Date</span>
              <span className={styles.infoValue}>
                {new Date(selectedDepense.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Poste budgétaire</span>
              <span className={styles.infoValue}>{posteLabel}</span>
            </div>
          </div>

          {/* Libellé */}
          <div className={styles.infoFull}>
            <span className={styles.infoLabel}>Libellé</span>
            <span className={styles.infoValue}>{selectedDepense.libelle}</span>
          </div>

          {/* Fournisseur */}
          <div className={styles.infoFull}>
            <span className={styles.infoLabel}>Fournisseur</span>
            <span className={styles.infoValue}>{selectedDepense.fournisseur}</span>
          </div>

          {/* Accounting info */}
          <div className={styles.accountingGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Compte</span>
              <span className={styles.infoValue}>{selectedDepense.compteId}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Récupérable</span>
              <span className={`${styles.infoValue} ${styles.infoValueSuccess}`}>
                {selectedDepense.recuperable.toLocaleString('fr-FR')} €
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Déductible</span>
              <span className={`${styles.infoValue} ${styles.infoValueInfo}`}>
                {selectedDepense.deductible.toLocaleString('fr-FR')} €
              </span>
            </div>
          </div>

          {/* TVA info if available */}
          {selectedDepense.montantHT !== undefined && (
            <div className={styles.accountingGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Montant HT</span>
                <span className={styles.infoValue}>{selectedDepense.montantHT.toLocaleString('fr-FR')} €</span>
              </div>
              {selectedDepense.tauxTVA !== undefined && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>TVA ({selectedDepense.tauxTVA}%)</span>
                  <span className={styles.infoValue}>{(selectedDepense.montantTVA ?? 0).toLocaleString('fr-FR')} €</span>
                </div>
              )}
            </div>
          )}

          {/* Attachment */}
          {(selectedDepense.pieceJointe || selectedDepense.pieceJointeDetails) ? (
            <div className={`${styles.attachmentCard} ${styles.attachmentPresent}`}>
              <Paperclip size={16} color="#4ade80" />
              <div className={styles.attachmentInfo}>
                <div className={styles.attachmentTitle} style={{ color: 'var(--success)' }}>Pièce justificative attachée</div>
                <div className={styles.attachmentSub}>
                  {selectedDepense.pieceJointeDetails?.fichierNom || selectedDepense.pieceJointe}
                </div>
              </div>
            </div>
          ) : (
            <div className={`${styles.attachmentCard} ${styles.attachmentMissing}`}>
              <Paperclip size={16} color="#fbbf24" />
              <div className={styles.attachmentInfo}>
                <div className={styles.attachmentTitle} style={{ color: 'var(--warning)' }}>Aucune pièce justificative</div>
                <div className={styles.attachmentSub}>Une facture est obligatoire pour valider cette dépense.</div>
              </div>
            </div>
          )}

          {/* Reject form */}
          {showRejectForm && (
            <div className={styles.rejectForm}>
              <label className={styles.rejectFormLabel}>Motif du rejet *</label>
              <textarea
                className={styles.rejectTextarea}
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                placeholder="Indiquez le motif du rejet..."
              />
              <div className={styles.rejectActions}>
                <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setShowRejectForm(false)}>
                  Annuler
                </button>
                <button
                  className={`${styles.btn} ${styles.btnDanger} ${!rejectComment.trim() ? styles.btnDisabled : ''}`}
                  onClick={handleReject}
                  disabled={!rejectComment.trim()}
                >
                  Confirmer le rejet
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <div className={styles.footerLeft}>
            {canValidate && !showRejectForm && (
              <>
                <button className={`${styles.btn} ${styles.btnSuccess}`} onClick={() => { onValidate?.(selectedDepense.id); onClose(); }}>
                  <CheckCircle size={14} /> Valider
                </button>
                <button className={`${styles.btn} ${styles.btnDanger}`} onClick={() => setShowRejectForm(true)}>
                  <XCircle size={14} /> Rejeter
                </button>
              </>
            )}
          </div>
          <div className={styles.footerRight}>
            <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={onClose}>Fermer</button>
            {isEditable && onEdit && (
              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => { onEdit(selectedDepense); onClose(); }}>
                <Edit2 size={14} /> Modifier
              </button>
            )}
            {canSubmit && onSubmitForValidation && (
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => { onSubmitForValidation(selectedDepense.id); onClose(); }}>
                <Send size={14} /> Soumettre
              </button>
            )}
            {(selectedDepense.pieceJointe || selectedDepense.pieceJointeDetails) && (
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => onViewDocument(selectedDepense.pieceJointeDetails?.fichierNom || selectedDepense.pieceJointe || '')}>
                <Eye size={14} /> Voir la pièce
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

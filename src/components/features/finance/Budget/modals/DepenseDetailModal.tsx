'use client';

import { X, Paperclip, Eye, Edit2, Send, CheckCircle, XCircle } from 'lucide-react';
import { useState } from 'react';
import { DepenseEtendue } from '@/data/mock';
import { PosteBudgetData } from '../types';
import { DepenseStatusBadge } from '../DepenseStatusBadge';
import styles from '../Budget.module.css';

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

  const handleReject = () => {
    if (rejectComment.trim() && onReject) {
      onReject(selectedDepense.id, rejectComment);
      setShowRejectForm(false);
      setRejectComment('');
      onClose();
    }
  };

  return (
    <div className={styles.modalOverlay} aria-hidden="true" onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--space-xl)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <h2 className={styles.modalTitle}>Détail de la dépense</h2>
            {selectedDepense.statut && (
              <DepenseStatusBadge statut={selectedDepense.statut} />
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 'var(--space-sm)',
            }}
           aria-label="Fermer"><X size={24} aria-hidden="true" /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          {/* Montant principal */}
          <div
            style={{
              padding: 'var(--space-xl)',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--text-secondary)',
                marginBottom: 'var(--space-xs)',
              }}
            >
              Montant
            </div>
            <div style={{ fontSize: 'var(--text-3xl)', fontWeight: '700', color: 'var(--danger)' }}>
              -{selectedDepense.montant.toLocaleString()} €
            </div>
          </div>

          {/* Commentaire de rejet si présent */}
          {selectedDepense.statut === 'REJETEE' && selectedDepense.commentaireRejet && (
            <div
              style={{
                padding: 'var(--space-md)',
                background: 'var(--danger-light)',
                border: '1px solid var(--danger)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <strong style={{ color: 'var(--danger)', display: 'block', marginBottom: 'var(--space-xs)' }}>
                Motif du rejet :
              </strong>
              <p style={{ margin: 0, color: 'var(--text-main)' }}>
                {selectedDepense.commentaireRejet}
              </p>
            </div>
          )}

          {/* Informations de base */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-md)' }}>
            <div>
              <label
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-secondary)',
                  display: 'block',
                  marginBottom: 'var(--space-xs)',
                }}
              >
                Date
              </label>
              <div style={{ fontSize: 'var(--text-md)', fontWeight: '600', color: 'var(--text-main)' }}>
                {new Date(selectedDepense.date).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </div>
            </div>
            <div>
              <label
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-secondary)',
                  display: 'block',
                  marginBottom: 'var(--space-xs)',
                }}
              >
                Poste budgétaire
              </label>
              <div style={{ fontSize: 'var(--text-md)', fontWeight: '600', color: 'var(--text-main)' }}>
                {selectedDepense.poste
                  ? postesBudget.find((p) => p.poste === selectedDepense.poste)?.label
                  : 'Non classé'}
              </div>
            </div>
          </div>

          {/* Libellé et fournisseur */}
          <div>
            <label
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--text-secondary)',
                display: 'block',
                marginBottom: 'var(--space-xs)',
              }}
            >
              Libellé
            </label>
            <div style={{ fontSize: 'var(--text-md)', color: 'var(--text-main)' }}>
              {selectedDepense.libelle}
            </div>
          </div>

          <div>
            <label
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--text-secondary)',
                display: 'block',
                marginBottom: 'var(--space-xs)',
              }}
            >
              Fournisseur
            </label>
            <div style={{ fontSize: 'var(--text-md)', color: 'var(--text-main)' }}>
              {selectedDepense.fournisseur}
            </div>
          </div>

          {/* Informations comptables */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-md)' }}>
            <div>
              <label
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-secondary)',
                  display: 'block',
                  marginBottom: 'var(--space-xs)',
                }}
              >
                Compte
              </label>
              <div style={{ fontSize: 'var(--text-md)', fontWeight: '600', color: 'var(--text-main)' }}>
                {selectedDepense.compteId}
              </div>
            </div>
            <div>
              <label
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-secondary)',
                  display: 'block',
                  marginBottom: 'var(--space-xs)',
                }}
              >
                Récupérable
              </label>
              <div style={{ fontSize: 'var(--text-md)', fontWeight: '600', color: 'var(--success)' }}>
                {selectedDepense.recuperable.toLocaleString()} €
              </div>
            </div>
            <div>
              <label
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-secondary)',
                  display: 'block',
                  marginBottom: 'var(--space-xs)',
                }}
              >
                Déductible
              </label>
              <div style={{ fontSize: 'var(--text-md)', fontWeight: '600', color: 'var(--info)' }}>
                {selectedDepense.deductible.toLocaleString()} €
              </div>
            </div>
          </div>

          {/* Pièce jointe */}
          {(selectedDepense.pieceJointe || selectedDepense.pieceJointeDetails) ? (
            <div
              style={{
                padding: 'var(--space-md)',
                background: 'var(--success-light)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--success)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <Paperclip size={16} color="var(--success)" aria-hidden="true" />
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--success)', fontWeight: '600' }}>
                  Pièce justificative attachée
                </span>
              </div>
              <div
                style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--text-main)',
                  marginTop: 'var(--space-xs)',
                  marginLeft: 'calc(16px + var(--space-sm))',
                }}
              >
                {selectedDepense.pieceJointeDetails?.fichierNom || selectedDepense.pieceJointe}
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: 'var(--space-md)',
                background: 'var(--warning-light)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--warning)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <Paperclip size={16} color="var(--warning)" aria-hidden="true" />
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--warning)', fontWeight: '600' }}>
                  Aucune pièce justificative
                </span>
              </div>
              <div
                style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--text-secondary)',
                  marginTop: 'var(--space-xs)',
                  marginLeft: 'calc(16px + var(--space-sm))',
                }}
              >
                Une facture est obligatoire pour valider cette dépense.
              </div>
            </div>
          )}

          {/* Formulaire de rejet */}
          {showRejectForm && (
            <div
              style={{
                padding: 'var(--space-md)',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
              }}
            >
              <label
                style={{
                  fontSize: 'var(--text-sm)',
                  fontWeight: '600',
                  display: 'block',
                  marginBottom: 'var(--space-sm)',
                }}
              >
                Motif du rejet *
              </label>
              <textarea
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                placeholder="Indiquez le motif du rejet..."
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: 'var(--space-sm)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  resize: 'vertical',
                }}
              />
              <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowRejectForm(false)}
                >
                  Annuler
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={handleReject}
                  disabled={!rejectComment.trim()}
                >
                  Confirmer le rejet
                </button>
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: 'var(--space-xl)',
            display: 'flex',
            justifyContent: 'space-between',
            gap: 'var(--space-md)',
          }}
        >
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            {/* Actions de validation (pour les validateurs) */}
            {canValidate && !showRejectForm && (
              <>
                <button
                  className="btn btn-success"
                  onClick={() => {
                    if (onValidate) {
                      onValidate(selectedDepense.id);
                      onClose();
                    }
                  }}
                >
                  <CheckCircle size={16} aria-hidden="true" />
                  Valider
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => setShowRejectForm(true)}
                >
                  <XCircle size={16} aria-hidden="true" />
                  Rejeter
                </button>
              </>
            )}
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
            <button onClick={onClose} className="btn btn-secondary">
              Fermer
            </button>

            {/* Boutons d'action utilisateur */}
            {isEditable && onEdit && (
              <button
                className="btn btn-outline"
                onClick={() => {
                  onEdit(selectedDepense);
                  onClose();
                }}
              >
                <Edit2 size={16} aria-hidden="true" />
                Modifier
              </button>
            )}

            {canSubmit && onSubmitForValidation && (
              <button
                className="btn btn-primary"
                onClick={() => {
                  onSubmitForValidation(selectedDepense.id);
                  onClose();
                }}
              >
                <Send size={16} aria-hidden="true" />
                Soumettre à validation
              </button>
            )}

            {(selectedDepense.pieceJointe || selectedDepense.pieceJointeDetails) && (
              <button
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}
                onClick={() => onViewDocument(selectedDepense.pieceJointeDetails?.fichierNom || selectedDepense.pieceJointe || '')}
              >
                <Eye size={16} aria-hidden="true" />
                Consulter la pièce jointe
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

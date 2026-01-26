'use client';

import { X, Link2, Vote, CheckCircle, AlertTriangle } from 'lucide-react';
import { useState, useId } from 'react';
import { ResolutionAG } from '../types';
import { BudgetStatusBadge } from '../BudgetStatusBadge';
import { BudgetStatut } from '@/types/enums/statuts';
import styles from '../Budget.module.css';

interface BudgetToLink {
  id: string;
  nom?: string;
  type: 'fonctionnement' | 'travaux';
  annee: number;
  montantTotal: number;
  statut: BudgetStatut;
}

interface LinkToAGModalProps {
  budget: BudgetToLink;
  availableResolutions: ResolutionAG[];
  onLink: (budgetId: string, resolutionId: string) => void;
  onClose: () => void;
}

export function LinkToAGModal({
  budget,
  availableResolutions,
  onLink,
  onClose,
}: LinkToAGModalProps) {
  const titleId = useId();
  const [selectedResolutionId, setSelectedResolutionId] = useState<string | null>(null);

  // Filtrer les resolutions disponibles (EN_ATTENTE ou qui correspondent au type de budget)
  const filteredResolutions = availableResolutions.filter(
    (r) =>
      r.statut === 'EN_ATTENTE' &&
      !r.budgetId &&
      ((budget.type === 'fonctionnement' && r.type === 'BUDGET_FONCTIONNEMENT') ||
        (budget.type === 'travaux' && r.type === 'BUDGET_TRAVAUX'))
  );

  const handleSubmit = () => {
    if (!selectedResolutionId) return;
    onLink(budget.id, selectedResolutionId);
    onClose();
  };

  const canLink = budget.statut === BudgetStatut.BROUILLON;

  return (
    <div className={styles.modalOverlay} aria-hidden="true" onClick={onClose}>
      <div
        className={styles.modalContentLarge}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--space-xl)',
          }}
        >
          <h2 id={titleId} className={styles.modalTitle}>
            Lier a une Assemblee Generale
          </h2>
          <button
            onClick={onClose}
            aria-label="Fermer"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 'var(--space-sm)',
            }}
          >
            <X size={24} aria-hidden="true" />
          </button>
        </div>

        {/* Resume du budget */}
        <div
          style={{
            padding: 'var(--space-lg)',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-xl)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 'var(--text-lg)',
                  fontWeight: '600',
                  color: 'var(--text-main)',
                  marginBottom: 'var(--space-xs)',
                }}
              >
                {budget.nom ||
                  (budget.type === 'fonctionnement'
                    ? `Budget previsionnel ${budget.annee}`
                    : `Budget travaux ${budget.annee}`)}
              </div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                {budget.type === 'fonctionnement' ? 'Budget de fonctionnement' : 'Budget travaux'} -{' '}
                {budget.annee}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <BudgetStatusBadge statut={budget.statut} />
              <div
                style={{
                  fontSize: 'var(--text-xl)',
                  fontWeight: '700',
                  color: 'var(--primary)',
                  marginTop: 'var(--space-sm)',
                }}
              >
                {budget.montantTotal.toLocaleString()} EUR
              </div>
            </div>
          </div>
        </div>

        {!canLink && (
          <div
            style={{
              padding: 'var(--space-lg)',
              background: 'var(--warning-light)',
              borderRadius: 'var(--radius-md)',
              borderLeft: '4px solid var(--warning)',
              marginBottom: 'var(--space-xl)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-md)',
            }}
          >
            <AlertTriangle size={24} color="var(--warning)" aria-hidden="true" />
            <div>
              <div style={{ fontWeight: '600', color: 'var(--warning)', marginBottom: 'var(--space-xs)' }}>
                Budget non modifiable
              </div>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                Seuls les budgets en statut &quot;Brouillon&quot; peuvent etre lies a une AG.
              </p>
            </div>
          </div>
        )}

        {canLink && (
          <>
            {/* Selection de la resolution */}
            <div style={{ marginBottom: 'var(--space-xl)' }}>
              <h3
                style={{
                  fontSize: 'var(--text-md)',
                  fontWeight: '600',
                  marginBottom: 'var(--space-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-sm)',
                }}
              >
                <Vote size={18} aria-hidden="true" />
                Resolutions disponibles
              </h3>
              <p
                style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--text-secondary)',
                  marginBottom: 'var(--space-lg)',
                }}
              >
                Selectionnez la resolution d&apos;AG a laquelle lier ce budget. Apres le vote en AG, le
                budget sera automatiquement approuve ou rejete.
              </p>

              {filteredResolutions.length === 0 ? (
                <div
                  style={{
                    padding: 'var(--space-xl)',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'center',
                  }}
                >
                  <Vote size={48} color="var(--text-tertiary)" aria-hidden="true" />
                  <p
                    style={{
                      fontSize: 'var(--text-sm)',
                      color: 'var(--text-secondary)',
                      marginTop: 'var(--space-md)',
                    }}
                  >
                    Aucune resolution disponible pour ce type de budget.
                    <br />
                    Creez d&apos;abord une resolution dans une AG a venir.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                  {filteredResolutions.map((resolution) => (
                    <div
                      key={resolution.id}
                      style={{
                        padding: 'var(--space-md)',
                        background:
                          selectedResolutionId === resolution.id
                            ? 'var(--primary-light)'
                            : 'var(--surface)',
                        border:
                          selectedResolutionId === resolution.id
                            ? '2px solid var(--primary)'
                            : '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        transition: 'all var(--transition-base)',
                      }}
                      onClick={() => setSelectedResolutionId(resolution.id)}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontWeight: '600',
                              color: 'var(--text-main)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 'var(--space-sm)',
                            }}
                          >
                            <span
                              style={{
                                fontSize: 'var(--text-xs)',
                                padding: '2px 6px',
                                background: 'var(--bg-secondary)',
                                borderRadius: 'var(--radius-sm)',
                                fontFamily: 'monospace',
                              }}
                            >
                              {resolution.numero}
                            </span>
                            {resolution.titre}
                          </div>
                          <div
                            style={{
                              fontSize: 'var(--text-sm)',
                              color: 'var(--text-secondary)',
                              marginTop: 'var(--space-xs)',
                            }}
                          >
                            AG du {new Date(resolution.dateAG).toLocaleDateString('fr-FR')} -{' '}
                            {resolution.majorite}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div
                            style={{
                              fontSize: 'var(--text-lg)',
                              fontWeight: '700',
                              color: 'var(--primary)',
                            }}
                          >
                            {resolution.montantVote.toLocaleString()} EUR
                          </div>
                          <span
                            style={{
                              fontSize: 'var(--text-xs)',
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-sm)',
                              background: 'var(--warning-light)',
                              color: 'var(--warning)',
                            }}
                          >
                            En attente de vote
                          </span>
                        </div>
                      </div>
                      {selectedResolutionId === resolution.id && (
                        <div
                          style={{
                            marginTop: 'var(--space-md)',
                            padding: 'var(--space-sm)',
                            background: 'var(--success-light)',
                            borderRadius: 'var(--radius-sm)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-sm)',
                          }}
                        >
                          <CheckCircle size={14} color="var(--success)" aria-hidden="true" />
                          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--success)' }}>
                            Resolution selectionnee
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Info sur le workflow */}
            <div
              style={{
                padding: 'var(--space-md)',
                background: 'var(--info-light)',
                borderRadius: 'var(--radius-sm)',
                borderLeft: '4px solid var(--info)',
                marginBottom: 'var(--space-xl)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-sm)',
                  color: 'var(--info)',
                  fontWeight: '600',
                  fontSize: 'var(--text-sm)',
                  marginBottom: 'var(--space-xs)',
                }}
              >
                <Link2 size={16} aria-hidden="true" />
                Workflow automatique
              </div>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                Une fois lie, le budget passera en statut &quot;En attente d&apos;approbation&quot;. Apres le
                vote en AG, il sera automatiquement mis a jour selon le resultat de la resolution.
              </p>
            </div>
          </>
        )}

        <div className={styles.modalActions}>
          <button onClick={onClose} className="btn btn-secondary">
            Annuler
          </button>
          <button
            className="btn btn-primary"
            disabled={!canLink || !selectedResolutionId}
            onClick={handleSubmit}
          >
            <Link2 size={16} aria-hidden="true" />
            Lier a cette resolution
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { X, PlayCircle, Link2, AlertTriangle, XCircle } from 'lucide-react';
import { BudgetStatut } from '@/types/enums/statuts';
import { BudgetStatusBadge } from '../BudgetStatusBadge';
import styles from '../Budget.module.css';

interface BudgetForTransform {
  id: string;
  nom?: string;
  type: 'fonctionnement' | 'travaux';
  annee: number;
  montantTotal: number;
  statut: BudgetStatut;
}

interface TransformBudgetModalProps {
  budget: BudgetForTransform;
  onClose: () => void;
  onTransform: () => void;
}

export function TransformBudgetModal({ budget, onClose, onTransform }: TransformBudgetModalProps) {
  const canTransform = budget.statut === BudgetStatut.APPROUVE;

  const renderBlockedMessage = () => {
    if (budget.statut === BudgetStatut.BROUILLON) {
      return (
        <div
          style={{
            padding: 'var(--space-xl)',
            background: 'var(--warning-light)',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center',
            marginBottom: 'var(--space-xl)',
          }}
        >
          <AlertTriangle size={48} color="var(--warning)" style={{ marginBottom: 'var(--space-md)' }} aria-hidden="true" />
          <h3
            style={{
              fontSize: 'var(--text-lg)',
              fontWeight: '600',
              color: 'var(--warning)',
              marginBottom: 'var(--space-sm)',
            }}
          >
            Budget en brouillon
          </h3>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
            Ce budget doit d&apos;abord etre lie a une Assemblee Generale et approuve par vote avant de pouvoir generer les appels de fonds.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-md)' }}>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Statut actuel :</span>
            <BudgetStatusBadge statut={budget.statut} />
          </div>
        </div>
      );
    }

    if (budget.statut === BudgetStatut.EN_ATTENTE_APPROBATION) {
      return (
        <div
          style={{
            padding: 'var(--space-xl)',
            background: 'var(--info-light)',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center',
            marginBottom: 'var(--space-xl)',
          }}
        >
          <AlertTriangle size={48} color="var(--info)" style={{ marginBottom: 'var(--space-md)' }} aria-hidden="true" />
          <h3
            style={{
              fontSize: 'var(--text-lg)',
              fontWeight: '600',
              color: 'var(--info)',
              marginBottom: 'var(--space-sm)',
            }}
          >
            En attente d&apos;approbation
          </h3>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
            Ce budget est lie a une resolution d&apos;AG et en attente de vote. Les appels de fonds pourront etre generes une fois le budget approuve.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-md)' }}>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Statut actuel :</span>
            <BudgetStatusBadge statut={budget.statut} />
          </div>
        </div>
      );
    }

    if (budget.statut === BudgetStatut.REJETE) {
      return (
        <div
          style={{
            padding: 'var(--space-xl)',
            background: 'var(--danger-light)',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center',
            marginBottom: 'var(--space-xl)',
          }}
        >
          <XCircle size={48} color="var(--danger)" style={{ marginBottom: 'var(--space-md)' }} aria-hidden="true" />
          <h3
            style={{
              fontSize: 'var(--text-lg)',
              fontWeight: '600',
              color: 'var(--danger)',
              marginBottom: 'var(--space-sm)',
            }}
          >
            Budget rejete
          </h3>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
            Ce budget a ete rejete lors du vote en AG. Vous pouvez le modifier et le resoumettre a une prochaine AG.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-md)' }}>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Statut actuel :</span>
            <BudgetStatusBadge statut={budget.statut} />
          </div>
        </div>
      );
    }

    return null;
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
          <h2 className={styles.modalTitle}>Generer les appels de fonds</h2>
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

        {/* Resume du budget */}
        <div
          style={{
            padding: 'var(--space-md)',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-xl)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>
              {budget.nom ||
                (budget.type === 'fonctionnement'
                  ? `Budget previsionnel ${budget.annee}`
                  : `Budget travaux ${budget.annee}`)}
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              Montant: {budget.montantTotal.toLocaleString()} EUR
            </div>
          </div>
          <BudgetStatusBadge statut={budget.statut} />
        </div>

        {!canTransform ? (
          renderBlockedMessage()
        ) : (
          <>
            <div
              style={{
                padding: 'var(--space-xl)',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                textAlign: 'center',
                marginBottom: 'var(--space-xl)',
              }}
            >
              <PlayCircle size={48} color="var(--primary)" style={{ marginBottom: 'var(--space-md)' }} aria-hidden="true" />
              <h3
                style={{
                  fontSize: 'var(--text-lg)',
                  fontWeight: '600',
                  marginBottom: 'var(--space-sm)',
                }}
              >
                Budget approuve - Appels de fonds
              </h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                Cette action va generer automatiquement les appels de fonds pour chaque coproprietaire
                selon leurs tantiemes.
              </p>
            </div>

            <div style={{ marginBottom: 'var(--space-xl)' }}>
              <h4
                style={{
                  fontSize: 'var(--text-md)',
                  fontWeight: '600',
                  marginBottom: 'var(--space-md)',
                }}
              >
                Configuration des appels
              </h4>
              <div className={styles.formGroup}>
                <label className={styles.label}>Periodicite</label>
                <select className={styles.input} defaultValue="trimestriel" aria-label="Trier par">
                  <option value="trimestriel">Trimestriel (4 appels)</option>
                  <option value="semestriel">Semestriel (2 appels)</option>
                  <option value="annuel">Annuel (1 appel)</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Premier appel</label>
                <input type="date" className={styles.input} defaultValue="2025-01-15" aria-label="Selectionner une date"/>
              </div>
            </div>

            <div
              style={{
                padding: 'var(--space-md)',
                background: 'var(--info-light)',
                borderRadius: 'var(--radius-md)',
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
                }}
              >
                <Link2 size={16} aria-hidden="true" />
                Lien automatique avec la comptabilite
              </div>
              <p
                style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--text-secondary)',
                  marginTop: 'var(--space-xs)',
                }}
              >
                Les paiements recus seront automatiquement lies au budget et a la comptabilite.
              </p>
            </div>
          </>
        )}

        <div className={styles.modalActions}>
          <button onClick={onClose} className="btn btn-secondary">
            {canTransform ? 'Annuler' : 'Fermer'}
          </button>
          {canTransform && (
            <button className="btn btn-primary" onClick={onTransform}>
              <PlayCircle size={16} aria-hidden="true" />
              Generer les appels de fonds
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

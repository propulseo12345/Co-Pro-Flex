'use client';

import { X, Paperclip } from 'lucide-react';
import { DepenseEtendue, MOCK_DEPENSES_BUDGETS } from '@/data/mock';
import { PosteBudget, PosteBudgetData, getProgressColor, getProgressPercentage } from '../types';
import styles from '../Budget.module.css';

interface PosteDetailModalProps {
  selectedPoste: PosteBudget;
  postesBudget: PosteBudgetData[];
  onClose: () => void;
  onSelectDepense: (depense: DepenseEtendue) => void;
}

export function PosteDetailModal({
  selectedPoste,
  postesBudget,
  onClose,
  onSelectDepense,
}: PosteDetailModalProps) {
  const posteData = postesBudget.find((p) => p.poste === selectedPoste);
  const depensesPoste = MOCK_DEPENSES_BUDGETS.filter((d) => d.poste === selectedPoste);
  const percentage = posteData ? getProgressPercentage(posteData.consomme, posteData.budgetVote) : 0;
  const color = posteData ? getProgressColor(posteData.consomme, posteData.budgetVote) : 'var(--success)';

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
          <h2 className={styles.modalTitle}>
            Détail du poste : {postesBudget.find((p) => p.poste === selectedPoste)?.label}
          </h2>
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

        {/* Résumé du poste */}
        <div
          style={{
            marginBottom: 'var(--space-xl)',
            padding: 'var(--space-lg)',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 'var(--space-lg)',
              marginBottom: 'var(--space-md)',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-secondary)',
                  marginBottom: 'var(--space-xs)',
                }}
              >
                Budget voté
              </div>
              <div
                style={{
                  fontSize: 'var(--text-xl)',
                  fontWeight: '700',
                  color: 'var(--text-main)',
                }}
              >
                {posteData?.budgetVote.toLocaleString()} €
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-secondary)',
                  marginBottom: 'var(--space-xs)',
                }}
              >
                Consommé
              </div>
              <div style={{ fontSize: 'var(--text-xl)', fontWeight: '700', color }}>
                {posteData?.consomme.toLocaleString()} €
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-secondary)',
                  marginBottom: 'var(--space-xs)',
                }}
              >
                Restant
              </div>
              <div
                style={{
                  fontSize: 'var(--text-xl)',
                  fontWeight: '700',
                  color: 'var(--success)',
                }}
              >
                {posteData ? (posteData.budgetVote - posteData.consomme).toLocaleString() : 0} €
              </div>
            </div>
          </div>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${percentage}%`, backgroundColor: color }}
            />
          </div>
          <div
            style={{
              marginTop: 'var(--space-xs)',
              textAlign: 'right',
              fontSize: 'var(--text-sm)',
              color,
              fontWeight: '600',
            }}
          >
            {percentage.toFixed(1)}%
          </div>
        </div>

        {/* Liste des transactions */}
        <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: '600', marginBottom: 'var(--space-md)' }}>
          Transactions ({depensesPoste.length})
        </h3>
        {depensesPoste.length > 0 ? (
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {depensesPoste
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((depense) => (
                <div
                  key={depense.id}
                  onClick={() => {
                    onClose();
                    onSelectDepense(depense);
                  }}
                  style={{
                    padding: 'var(--space-md)',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--space-sm)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-base)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 'var(--space-xs)',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 'var(--text-sm)',
                        fontWeight: '600',
                        color: 'var(--text-main)',
                      }}
                    >
                      {depense.libelle}
                    </span>
                    <span
                      style={{
                        fontSize: 'var(--text-md)',
                        fontWeight: '700',
                        color: 'var(--danger)',
                      }}
                    >
                      -{depense.montant.toLocaleString()} €
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 'var(--space-lg)',
                      fontSize: 'var(--text-xs)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <span>{new Date(depense.date).toLocaleDateString('fr-FR')}</span>
                    <span>{depense.fournisseur}</span>
                    <span>Compte: {depense.compteId}</span>
                    {depense.pieceJointe && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                        <Paperclip size={12} aria-hidden="true" />
                        {depense.pieceJointe}
                      </span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <p
            style={{
              textAlign: 'center',
              color: 'var(--text-secondary)',
              padding: 'var(--space-xl)',
            }}
          >
            Aucune transaction pour ce poste
          </p>
        )}

        <div style={{ marginTop: 'var(--space-xl)', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn-secondary">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

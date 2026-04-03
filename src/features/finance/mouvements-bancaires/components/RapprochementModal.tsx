'use client';

import { useState } from 'react';
import { ArrowLeftRight, CheckCircle, Sparkles, Send } from 'lucide-react';
import type {
  MouvementBancaire,
  SuggestionRapprochement,
} from '../domain/types';
import styles from '../../../../app/(dashboard)/finance/mouvements-bancaires/mouvements-bancaires.module.css';

interface RapprochementModalProps {
  isOpen: boolean;
  mouvement: MouvementBancaire | null;
  suggestions: SuggestionRapprochement[];
  onClose: () => void;
  onRapprocher: (targetId: string, targetType?: string) => void;
  isMutating: boolean;
}

export function RapprochementModal({
  isOpen,
  mouvement,
  suggestions,
  onClose,
  onRapprocher,
  isMutating,
}: RapprochementModalProps) {
  const [selectedTargetId, setSelectedTargetId] = useState('');

  if (!isOpen || !mouvement) return null;

  const formatMontant = (n: number) =>
    n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

  const bestSuggestion = suggestions.length > 0 ? suggestions[0] : null;
  const activeTargetId = selectedTargetId || bestSuggestion?.targetId || '';
  const activeSuggestion = suggestions.find(s => s.targetId === activeTargetId);

  const handleValidate = () => {
    if (activeTargetId) {
      onRapprocher(activeTargetId, activeSuggestion?.targetType);
      setSelectedTargetId('');
    }
  };

  const handleClose = () => {
    setSelectedTargetId('');
    onClose();
  };

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Rapprochement bancaire</h2>
        </div>

        <div className={styles.modalBody}>
          {/* Mouvement info */}
          <div className={styles.mouvementInfo}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Date</span>
              <span className={styles.infoValue}>
                {new Date(mouvement.date).toLocaleDateString('fr-FR')}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Libellé</span>
              <span className={styles.infoValue}>{mouvement.libelle}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Montant</span>
              <span className={`${styles.infoValue} ${mouvement.type === 'ENTREE' ? styles.montantEntree : styles.montantSortie}`}>
                {mouvement.type === 'ENTREE' ? '+' : ''}{formatMontant(mouvement.montant)}
              </span>
            </div>
          </div>

          {/* Suggestions du moteur */}
          {suggestions.length > 0 && (
            <div className={styles.suggestionsSection}>
              <div className={styles.suggestionsSectionHeader}>
                <Sparkles size={18} className={styles.suggestionsIcon} />
                <h3>Correspondances détectées</h3>
              </div>
              <div className={styles.suggestionsList}>
                {suggestions.map(suggestion => {
                  const isSelected = activeTargetId === suggestion.targetId;

                  return (
                    <div
                      key={suggestion.targetId}
                      className={`${styles.suggestionCard} ${isSelected ? styles.suggestionCardSelected : ''}`}
                      onClick={() => setSelectedTargetId(suggestion.targetId)}
                    >
                      <div className={styles.suggestionCardHeader}>
                        <span className={styles.suggestionCompte}>
                          <ArrowLeftRight size={12} />
                          {suggestion.label}
                        </span>
                        <span className={`${styles.badge} ${suggestion.confiance === 'haute' ? styles.badgeSuccess : styles.badgeWarning}`}>
                          {suggestion.confiance}
                        </span>
                      </div>
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Montant</span>
                        <span className={styles.infoValue}>
                          {formatMontant(suggestion.montant)}
                        </span>
                      </div>
                      {suggestion.ecart > 0.01 && (
                        <div className={styles.infoRow}>
                          <span className={styles.infoLabel}>Écart</span>
                          <span style={{ color: 'var(--warning)', fontSize: '13px', fontWeight: 600 }}>
                            {formatMontant(suggestion.ecart)}
                          </span>
                        </div>
                      )}
                      {isSelected && (
                        <div className={styles.suggestionSelected}>
                          <CheckCircle size={16} /> Sélectionné
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {suggestions.length === 0 && (
            <div className={styles.mouvementInfo}>
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
                Aucune correspondance automatique trouvée pour ce mouvement.
              </p>
            </div>
          )}

          {/* Résumé */}
          {activeSuggestion && (
            <div className={styles.mouvementInfo}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Rapprochement</span>
                <span className={styles.infoValue}>
                  <ArrowLeftRight size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                  {activeSuggestion.label}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={handleClose}>
            Annuler
          </button>
          <button
            className={styles.saveButton}
            onClick={handleValidate}
            disabled={!activeTargetId || isMutating}
          >
            <Send size={18} />
            {isMutating ? 'Validation...' : 'Valider le rapprochement'}
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useMemo } from 'react';
import { ArrowLeftRight, CheckCircle, Sparkles, ChevronDown, Send } from 'lucide-react';
import type {
  MouvementBancaire,
  SuggestionRapprochement,
  EcritureComptable,
} from '../domain/types';
import styles from '../../../../app/(dashboard)/finance/mouvements-bancaires/mouvements-bancaires.module.css';

interface RapprochementModalProps {
  isOpen: boolean;
  mouvement: MouvementBancaire | null;
  suggestions: SuggestionRapprochement[];
  ecritures: EcritureComptable[];
  onClose: () => void;
  onRapprocher: (ecritureId: string) => void;
  isMutating: boolean;
}

export function RapprochementModal({
  isOpen,
  mouvement,
  suggestions,
  ecritures,
  onClose,
  onRapprocher,
  isMutating,
}: RapprochementModalProps) {
  const [selectedEcritureId, setSelectedEcritureId] = useState('');

  const ecrituresNonRapprochees = useMemo(() => {
    return ecritures.filter(ec => !ec.rapproche);
  }, [ecritures]);

  if (!isOpen || !mouvement) return null;

  const formatMontant = (n: number) =>
    n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

  const bestSuggestion = suggestions.length > 0 ? suggestions[0] : null;
  const ecritureSelectionnee = selectedEcritureId
    ? ecritures.find(ec => ec.id === selectedEcritureId)
    : bestSuggestion
      ? ecritures.find(ec => ec.id === bestSuggestion.ecritureId)
      : null;

  const activeEcritureId = selectedEcritureId || bestSuggestion?.ecritureId || '';

  const handleValidate = () => {
    if (activeEcritureId) {
      onRapprocher(activeEcritureId);
      setSelectedEcritureId('');
    }
  };

  const handleClose = () => {
    setSelectedEcritureId('');
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
            {mouvement.compteComptable && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Catégorie</span>
                <span className={styles.infoValue}>{mouvement.compteComptable}</span>
              </div>
            )}
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
                  const ecriture = ecritures.find(ec => ec.id === suggestion.ecritureId);
                  if (!ecriture) return null;
                  const isSelected = activeEcritureId === suggestion.ecritureId;

                  return (
                    <div
                      key={suggestion.ecritureId}
                      className={`${styles.suggestionCard} ${isSelected ? styles.suggestionCardSelected : ''}`}
                      onClick={() => setSelectedEcritureId(suggestion.ecritureId)}
                    >
                      <div className={styles.suggestionCardHeader}>
                        <span className={styles.suggestionCompte}>
                          <ArrowLeftRight size={12} />
                          {ecriture.compte} — {ecriture.piece}
                        </span>
                      </div>
                      <div className={styles.suggestionRaison}>
                        {suggestion.raison}
                      </div>
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Montant écriture</span>
                        <span className={styles.infoValue}>
                          {formatMontant(ecriture.debit > 0 ? ecriture.debit : ecriture.credit)}
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

          {/* Sélection manuelle */}
          <div className={styles.formGroup}>
            <label>
              {suggestions.length > 0
                ? 'Ou sélectionner manuellement une écriture'
                : 'Sélectionner une écriture comptable'}
            </label>
            <select
              value={selectedEcritureId}
              onChange={(e) => setSelectedEcritureId(e.target.value)}
            >
              <option value="">
                {bestSuggestion ? 'Utiliser la suggestion ci-dessus' : 'Choisir une écriture...'}
              </option>
              {ecrituresNonRapprochees.map(ec => (
                <option key={ec.id} value={ec.id}>
                  {ec.date} — {ec.compte} — {ec.libelle} ({formatMontant(ec.debit > 0 ? ec.debit : ec.credit)})
                </option>
              ))}
            </select>
          </div>

          {/* Résumé du rapprochement */}
          {ecritureSelectionnee && (
            <div className={styles.mouvementInfo}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Rapprochement</span>
                <span className={styles.infoValue}>
                  <ArrowLeftRight size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                  {ecritureSelectionnee.compte} — {ecritureSelectionnee.piece}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Écriture</span>
                <span className={styles.infoValue}>{ecritureSelectionnee.libelle}</span>
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
            disabled={!activeEcritureId || isMutating}
          >
            <Send size={18} />
            {isMutating ? 'Validation...' : 'Valider le rapprochement'}
          </button>
        </div>
      </div>
    </div>
  );
}

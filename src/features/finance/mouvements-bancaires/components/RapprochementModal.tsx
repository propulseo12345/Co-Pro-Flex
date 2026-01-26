'use client';

import {
  Link as LinkIcon,
  X,
  Sparkles,
  CheckCircle2,
  Lightbulb,
  AlertCircle,
} from 'lucide-react';
import type { MouvementBancaire, EcritureComptable, SuggestionRapprochement } from '../domain/types';
import styles from '../../../../app/(dashboard)/finance/mouvements-bancaires/mouvements-bancaires.module.css';

interface RapprochementModalProps {
  isOpen: boolean;
  selectedMouvement: MouvementBancaire | null;
  suggestions: SuggestionRapprochement[];
  ecrituresComptables: EcritureComptable[];
  onClose: () => void;
  onRapprocher: (ecritureId: string) => void;
}

export function RapprochementModal({
  isOpen,
  selectedMouvement,
  suggestions,
  ecrituresComptables,
  onClose,
  onRapprocher,
}: RapprochementModalProps) {
  if (!isOpen || !selectedMouvement) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            <LinkIcon size={24} />
            Rapprocher le mouvement
          </h2>
          <button className={styles.closeModalButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.mouvementInfo}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Date</span>
              <span className={styles.infoValue}>{new Date(selectedMouvement.date).toLocaleDateString('fr-FR')}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Libellé</span>
              <span className={styles.infoValue}>{selectedMouvement.libelle}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Montant</span>
              <span className={`${styles.infoValue} ${selectedMouvement.type === 'ENTREE' ? styles.montantEntree : styles.montantSortie}`}>
                {selectedMouvement.type === 'ENTREE' ? '+' : ''}{selectedMouvement.montant.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </span>
            </div>
          </div>

          {suggestions.length > 0 && (
            <div className={styles.suggestionsSection}>
              <div className={styles.suggestionsSectionHeader}>
                <Sparkles size={18} className={styles.suggestionsIcon} />
                <h3>Suggestions de rapprochement</h3>
              </div>
              <div className={styles.suggestionsList}>
                {suggestions.map(sugg => {
                  const ecriture = ecrituresComptables.find(e => e.id === sugg.ecritureId);
                  if (!ecriture) return null;
                  return (
                    <div
                      key={sugg.ecritureId}
                      className={`${styles.suggestionCard} ${styles[`suggestionCard${sugg.confiance.charAt(0).toUpperCase() + sugg.confiance.slice(1)}`]}`}
                      onClick={() => onRapprocher(sugg.ecritureId)}
                    >
                      <div className={styles.suggestionCardHeader}>
                        <span className={`${styles.suggestionConfiance} ${styles[`suggestionConfiance${sugg.confiance.charAt(0).toUpperCase() + sugg.confiance.slice(1)}`]}`}>
                          {sugg.confiance === 'haute' ? <><CheckCircle2 size={12} /> Confiance haute</> :
                           sugg.confiance === 'moyenne' ? <><Lightbulb size={12} /> Confiance moyenne</> :
                           <><AlertCircle size={12} /> Confiance basse</>}
                        </span>
                      </div>
                      <div className={styles.suggestionCompte}>{ecriture.piece} - {ecriture.libelle}</div>
                      <div className={styles.suggestionRaison}>{sugg.raison}</div>
                      <div className={styles.suggestionEntite}>
                        <span>{(ecriture.credit || ecriture.debit).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
                        <span>{new Date(ecriture.date).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className={styles.manualCategorisation}>
            <h3 className={styles.manualTitle}>Écritures disponibles</h3>
            <div className={styles.ecrituresListe}>
              {ecrituresComptables.filter(e => !e.rapproche).map(ec => (
                <div key={ec.id} className={styles.ecritureOption} onClick={() => onRapprocher(ec.id)}>
                  <div className={styles.ecritureOptionHeader}>
                    <span>{ec.piece}</span>
                    <span className={ec.credit > 0 ? styles.montantEntree : styles.montantSortie}>
                      {(ec.credit || ec.debit).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                    </span>
                  </div>
                  <div className={styles.ecritureOptionLibelle}>{ec.libelle}</div>
                  <div className={styles.ecritureOptionMeta}>
                    {new Date(ec.date).toLocaleDateString('fr-FR')} • {ec.compte} • {ec.journal}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={onClose}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

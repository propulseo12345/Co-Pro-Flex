'use client';

import {
  Sparkles,
  CheckCircle,
  CheckCircle2,
  Lightbulb,
  AlertCircle,
  FileText,
  User,
  History,
  Search,
  FileCheck,
  Send,
} from 'lucide-react';
import type {
  MouvementBancaire,
  SuggestionCategorie,
  CategorieComptable,
} from '../domain/types';
import { COMPTES_CHARGE, COMPTES_PRODUIT } from '../domain/constants';
import styles from '../../../../app/(dashboard)/finance/mouvements-bancaires/mouvements-bancaires.module.css';

interface CategorisationModalProps {
  isOpen: boolean;
  selectedMouvement: MouvementBancaire | null;
  suggestions: SuggestionCategorie[];
  selectedSuggestion: SuggestionCategorie | null;
  selectedCategorie: CategorieComptable;
  selectedCompte: string;
  onClose: () => void;
  onApplySuggestion: (suggestion: SuggestionCategorie) => void;
  onCategorieChange: (categorie: CategorieComptable) => void;
  onCompteChange: (compte: string) => void;
  onSave: () => void;
}

export function CategorisationModal({
  isOpen,
  selectedMouvement,
  suggestions,
  selectedSuggestion,
  selectedCategorie,
  selectedCompte,
  onClose,
  onApplySuggestion,
  onCategorieChange,
  onCompteChange,
  onSave,
}: CategorisationModalProps) {
  if (!isOpen || !selectedMouvement) return null;

  return (
    <div className={styles.modalOverlay} aria-hidden="true" onClick={onClose}>
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Catégorisation comptable</h2>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.mouvementInfo}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Date</span>
              <span className={styles.infoValue}>
                {new Date(selectedMouvement.date).toLocaleDateString('fr-FR')}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Libellé</span>
              <span className={styles.infoValue}>{selectedMouvement.libelle}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Montant</span>
              <span className={`${styles.infoValue} ${selectedMouvement.type === 'ENTREE' ? styles.montantEntree : styles.montantSortie}`}>
                {selectedMouvement.type === 'ENTREE' ? '+' : ''}
                {selectedMouvement.montant.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </span>
            </div>
          </div>

          {suggestions.length > 0 && (
            <div className={styles.suggestionsSection}>
              <div className={styles.suggestionsSectionHeader}>
                <Sparkles size={18} className={styles.suggestionsIcon} />
                <h3>Suggestions intelligentes</h3>
              </div>
              <div className={styles.suggestionsList}>
                {suggestions.map(suggestion => (
                  <div
                    key={suggestion.id}
                    className={`${styles.suggestionCard} ${selectedSuggestion?.id === suggestion.id ? styles.suggestionCardSelected : ''} ${styles[`suggestionCard${suggestion.confiance.charAt(0).toUpperCase() + suggestion.confiance.slice(1)}`]}`}
                    onClick={() => onApplySuggestion(suggestion)}
                  >
                    <div className={styles.suggestionCardHeader}>
                      <span className={`${styles.suggestionConfiance} ${styles[`suggestionConfiance${suggestion.confiance.charAt(0).toUpperCase() + suggestion.confiance.slice(1)}`]}`}>
                        {suggestion.confiance === 'haute' ? (
                          <><CheckCircle2 size={12} /> Confiance haute</>
                        ) : suggestion.confiance === 'moyenne' ? (
                          <><Lightbulb size={12} /> Confiance moyenne</>
                        ) : (
                          <><AlertCircle size={12} /> Confiance basse</>
                        )}
                      </span>
                      <span className={styles.suggestionType}>
                        {suggestion.type === 'appel_fonds' && <><FileText size={12} /> Appel de fonds</>}
                        {suggestion.type === 'fournisseur' && <><User size={12} /> Facture</>}
                        {suggestion.type === 'historique' && <><History size={12} /> Historique</>}
                        {suggestion.type === 'libelle' && <><Search size={12} /> Mots-clés</>}
                      </span>
                    </div>
                    <div className={styles.suggestionCompte}>
                      {suggestion.compte} - {suggestion.compteLabel}
                    </div>
                    <div className={styles.suggestionRaison}>
                      {suggestion.raison}
                    </div>
                    {suggestion.entiteReference && (
                      <div className={styles.suggestionEntite}>
                        <FileCheck size={12} />
                        <span>
                          {suggestion.entiteReference.type === 'appel_fonds' && `Appel: ${suggestion.entiteReference.nom}`}
                          {suggestion.entiteReference.type === 'facture' && `Facture: ${suggestion.entiteReference.nom}`}
                          {suggestion.entiteReference.type === 'fournisseur' && `Fournisseur: ${suggestion.entiteReference.nom}`}
                          {suggestion.entiteReference.montant && ` - ${suggestion.entiteReference.montant.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`}
                        </span>
                      </div>
                    )}
                    {selectedSuggestion?.id === suggestion.id && (
                      <div className={styles.suggestionSelected}>
                        <CheckCircle size={16} /> Sélectionné
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={styles.manualCategorisation}>
            <h3 className={styles.manualTitle}>Catégorisation manuelle</h3>

            <div className={styles.formGroup}>
              <label>Type de compte</label>
              <select
                value={selectedCategorie}
                onChange={(e) => {
                  onCategorieChange(e.target.value as CategorieComptable);
                  onCompteChange('');
                }}
              >
                <option value="">Sélectionner un type...</option>
                <option value="charge">Compte de charge</option>
                <option value="produit">Compte de produit</option>
              </select>
            </div>

            {selectedCategorie && (
              <div className={styles.formGroup}>
                <label>Compte comptable</label>
                <select
                  value={selectedCompte}
                  onChange={(e) => onCompteChange(e.target.value)}
                >
                  <option value="">Sélectionner un compte...</option>
                  {(selectedCategorie === 'charge' ? COMPTES_CHARGE : COMPTES_PRODUIT).map((compte) => (
                    <option key={compte.code} value={compte.code}>
                      {compte.code} - {compte.label}
                    </option>
                  ))}
                </select>
                {selectedSuggestion && selectedCompte === selectedSuggestion.compte && (
                  <p className={styles.aiDetection}>
                    <Sparkles size={14} aria-hidden="true" />
                    Suggestion IA appliquée : {selectedSuggestion.raison}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={onClose}>
            Annuler
          </button>
          <button
            className={styles.saveButton}
            onClick={onSave}
            disabled={!selectedCompte}
          >
            <Send size={18} aria-hidden="true" />
            Enregistrer en comptabilité
          </button>
        </div>
      </div>
    </div>
  );
}

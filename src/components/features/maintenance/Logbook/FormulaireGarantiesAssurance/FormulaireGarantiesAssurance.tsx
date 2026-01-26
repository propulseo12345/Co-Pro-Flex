'use client';

import { useState, useCallback } from 'react';
import { Plus, Trash2, Check, ChevronDown, ChevronUp } from 'lucide-react';
import {
  GARANTIES_STANDARDS,
  CATEGORIES_GARANTIES_LABELS,
  getGarantiesParCategorie,
  type GarantieStandard,
} from '@/lib/constants/types-assurance';
import styles from './FormulaireGarantiesAssurance.module.css';

interface FormulaireGarantiesAssuranceProps {
  garanties: string[];
  onChange: (garanties: string[]) => void;
  disabled?: boolean;
}

export function FormulaireGarantiesAssurance({
  garanties,
  onChange,
  disabled = false,
}: FormulaireGarantiesAssuranceProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['dommages', 'responsabilite', 'protection']);
  const [nouvelleGarantie, setNouvelleGarantie] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);

  const garantiesParCategorie = getGarantiesParCategorie();

  // Vérifier si une garantie est sélectionnée
  const isGarantieSelected = useCallback(
    (garantie: GarantieStandard) => garanties.includes(garantie.nom),
    [garanties]
  );

  // Toggle une garantie standard
  const toggleGarantie = useCallback(
    (garantie: GarantieStandard) => {
      if (disabled) return;

      const isSelected = garanties.includes(garantie.nom);
      if (isSelected) {
        onChange(garanties.filter(g => g !== garantie.nom));
      } else {
        onChange([...garanties, garantie.nom]);
      }
    },
    [garanties, onChange, disabled]
  );

  // Toggle une catégorie
  const toggleCategorie = useCallback((categorie: string) => {
    setExpandedCategories(prev =>
      prev.includes(categorie)
        ? prev.filter(c => c !== categorie)
        : [...prev, categorie]
    );
  }, []);

  // Ajouter une garantie personnalisée
  const ajouterGarantiePersonnalisee = useCallback(() => {
    const nom = nouvelleGarantie.trim();
    if (!nom || garanties.includes(nom)) return;

    onChange([...garanties, nom]);
    setNouvelleGarantie('');
    setShowCustomForm(false);
  }, [nouvelleGarantie, garanties, onChange]);

  // Supprimer une garantie personnalisée
  const supprimerGarantie = useCallback(
    (nom: string) => {
      if (disabled) return;
      onChange(garanties.filter(g => g !== nom));
    },
    [garanties, onChange, disabled]
  );

  // Identifier les garanties personnalisées (non standards)
  const garantiesPersonnalisees = garanties.filter(
    g => !GARANTIES_STANDARDS.some(gs => gs.nom === g)
  );

  // Compter les garanties sélectionnées
  const nombreSelectionnes = garanties.length;

  return (
    <div className={styles.container}>
      {/* Résumé */}
      <div className={styles.resume}>
        <span className={styles.resumeCount}>{nombreSelectionnes}</span>
        <span className={styles.resumeLabel}>
          {nombreSelectionnes > 1 ? 'garanties sélectionnées' : 'garantie sélectionnée'}
        </span>
      </div>

      {/* Garanties standards par catégorie */}
      {Object.entries(garantiesParCategorie).map(([categorie, listeGaranties]) => (
        <div key={categorie} className={styles.categorie}>
          <button
            type="button"
            className={styles.categorieHeader}
            onClick={() => toggleCategorie(categorie)}
          >
            <span className={styles.categorieTitre}>
              {CATEGORIES_GARANTIES_LABELS[categorie] || categorie}
            </span>
            <span className={styles.categorieCount}>
              {listeGaranties.filter(g => isGarantieSelected(g)).length}/{listeGaranties.length}
            </span>
            {expandedCategories.includes(categorie) ? (
              <ChevronUp size={16} aria-hidden="true" />
            ) : (
              <ChevronDown size={16} aria-hidden="true" />
            )}
          </button>

          {expandedCategories.includes(categorie) && (
            <div className={styles.garantiesListe}>
              {listeGaranties.map(garantie => {
                const selected = isGarantieSelected(garantie);
                return (
                  <button
                    key={garantie.id}
                    type="button"
                    className={`${styles.garantieChip} ${selected ? styles.garantieChipActive : ''}`}
                    onClick={() => toggleGarantie(garantie)}
                    disabled={disabled}
                    title={garantie.description}
                  >
                    {selected && <Check size={14} aria-hidden="true" />}
                    <span>{garantie.nom}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {/* Garanties personnalisées */}
      {garantiesPersonnalisees.length > 0 && (
        <div className={styles.categorie}>
          <div className={styles.categorieHeader}>
            <span className={styles.categorieTitre}>Garanties personnalisées</span>
            <span className={styles.categorieCount}>{garantiesPersonnalisees.length}</span>
          </div>
          <div className={styles.garantiesListe}>
            {garantiesPersonnalisees.map(nom => (
              <div key={nom} className={`${styles.garantieChip} ${styles.garantieChipActive} ${styles.garantiePersonnalisee}`}>
                <span>{nom}</span>
                {!disabled && (
                  <button
                    type="button"
                    className={styles.btnSupprimer}
                    onClick={() => supprimerGarantie(nom)}
                    aria-label={`Supprimer ${nom}`}
                  >
                    <Trash2 size={12} aria-hidden="true" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ajouter garantie personnalisée */}
      {!disabled && (
        <div className={styles.ajoutPersonnalisee}>
          {showCustomForm ? (
            <div className={styles.formulaireAjout}>
              <input
                type="text"
                value={nouvelleGarantie}
                onChange={(e) => setNouvelleGarantie(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    ajouterGarantiePersonnalisee();
                  }
                  if (e.key === 'Escape') {
                    setShowCustomForm(false);
                    setNouvelleGarantie('');
                  }
                }}
                placeholder="Nom de la garantie"
                className={styles.inputAjout}
                autoFocus
              />
              <button
                type="button"
                className={styles.btnValider}
                onClick={ajouterGarantiePersonnalisee}
                disabled={!nouvelleGarantie.trim()}
              >
                <Check size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={styles.btnAnnuler}
                onClick={() => {
                  setShowCustomForm(false);
                  setNouvelleGarantie('');
                }}
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={styles.btnAjouterPersonnalisee}
              onClick={() => setShowCustomForm(true)}
            >
              <Plus size={16} aria-hidden="true" />
              Ajouter une garantie personnalisée
            </button>
          )}
        </div>
      )}
    </div>
  );
}

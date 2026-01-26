'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, AlertTriangle, Loader2 } from 'lucide-react';
import { StatutFacture, StatutSelectProps, TransitionStatut } from '../types';
import { STATUTS_FACTURE, getTransitionsAutorisees } from '../utils';
import { StatutBadge } from '../StatutBadge';
import styles from './StatutSelect.module.css';

/**
 * Selecteur de statut avec transitions autorisees uniquement
 * Gere les confirmations pour les annulations
 */
export function StatutSelect({
  statutActuel,
  onChangement,
  disabled = false,
  afficherAnnulations = true,
  className = '',
}: StatutSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transitionEnCours, setTransitionEnCours] = useState<TransitionStatut | null>(null);
  const [motifAnnulation, setMotifAnnulation] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Transitions autorisees
  const transitions = getTransitionsAutorisees(statutActuel, afficherAnnulations);

  // Fermer le dropdown au clic exterieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Gestion de la selection d'une transition
  const handleTransitionClick = (transition: TransitionStatut) => {
    if (transition.requiertConfirmation) {
      setTransitionEnCours(transition);
      setIsOpen(false);
    } else {
      executerTransition(transition);
    }
  };

  // Execution de la transition
  const executerTransition = async (transition: TransitionStatut, motif?: string) => {
    setIsLoading(true);
    setIsOpen(false);

    try {
      await onChangement(transition.vers, motif);
    } finally {
      setIsLoading(false);
      setTransitionEnCours(null);
      setMotifAnnulation('');
    }
  };

  // Configuration du statut actuel
  const configActuel = STATUTS_FACTURE[statutActuel];

  // Pas de transitions disponibles
  if (transitions.length === 0) {
    return (
      <div className={`${styles.container} ${className}`}>
        <StatutBadge statut={statutActuel} />
        <span className={styles.finWorkflow}>Workflow termine</span>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${className}`} ref={dropdownRef}>
      {/* Bouton principal */}
      <button
        type="button"
        onClick={() => !disabled && !isLoading && setIsOpen(!isOpen)}
        disabled={disabled || isLoading}
        className={`${styles.trigger} ${disabled ? styles.disabled : ''}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Statut actuel : ${configActuel.libelle}. Cliquer pour changer.`}
      >
        <StatutBadge statut={statutActuel} taille="md" />

        {isLoading ? (
          <Loader2 size={16} className={styles.iconLoading} />
        ) : (
          <ChevronDown
            size={16}
            className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
          />
        )}
      </button>

      {/* Dropdown des transitions */}
      {isOpen && (
        <ul className={styles.dropdown} role="listbox" aria-label="Transitions disponibles">
          {transitions.map((transition) => {
            const configCible = STATUTS_FACTURE[transition.vers];

            return (
              <li key={transition.vers} role="option">
                <button
                  type="button"
                  onClick={() => handleTransitionClick(transition)}
                  className={`${styles.option} ${
                    transition.estAnnulation ? styles.optionAnnulation : ''
                  }`}
                >
                  <div className={styles.optionContent}>
                    {transition.estAnnulation && (
                      <AlertTriangle size={14} className={styles.iconWarning} />
                    )}
                    <div className={styles.optionTextes}>
                      <span className={styles.optionAction}>{transition.action}</span>
                      <span className={styles.optionCible}>→ {configCible.libelle}</span>
                    </div>
                  </div>
                  {transition.condition && (
                    <span className={styles.optionCondition}>{transition.condition}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Modal de confirmation pour les annulations */}
      {transitionEnCours && (
        <div className={styles.modalOverlay} onClick={() => setTransitionEnCours(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Confirmer l&apos;annulation</h3>
              <button
                className={styles.modalClose}
                onClick={() => setTransitionEnCours(null)}
                aria-label="Fermer"
              >
                &times;
              </button>
            </div>

            <div className={styles.modalBody}>
              <p className={styles.modalTexte}>
                Vous etes sur le point d&apos;effectuer l&apos;action :
                <strong> {transitionEnCours.action}</strong>
              </p>

              {transitionEnCours.condition && (
                <p className={styles.modalWarning}>
                  <AlertTriangle size={16} />
                  {transitionEnCours.condition}
                </p>
              )}

              <label className={styles.modalLabel}>
                Motif (optionnel) :
                <textarea
                  value={motifAnnulation}
                  onChange={(e) => setMotifAnnulation(e.target.value)}
                  placeholder="Precisez la raison de cette annulation..."
                  className={styles.modalTextarea}
                  rows={3}
                />
              </label>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.cancelButton}
                onClick={() => {
                  setTransitionEnCours(null);
                  setMotifAnnulation('');
                }}
              >
                Annuler
              </button>
              <button
                className={styles.confirmButton}
                onClick={() => executerTransition(transitionEnCours, motifAnnulation)}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 size={16} className={styles.iconLoading} /> : null}
                Confirmer l&apos;annulation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StatutSelect;

'use client';

import { useCallback, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './ResolutionNavBar.module.css';

type ResolutionStatut = 'a_voter' | 'en_cours' | 'adoptee' | 'rejetee' | 'ajournee' | 'vote';

interface Resolution {
  id: string;
  titre: string;
  resultat?: 'ADOPTEE' | 'REJETEE' | 'AJOURNEE';
}

interface ResolutionNavBarProps {
  resolutions: Resolution[];
  currentIndex: number;
  completedResolutions: string[];
  onNavigate: (index: number) => void;
  disabled?: boolean;
}

export function ResolutionNavBar({
  resolutions,
  currentIndex,
  completedResolutions,
  onNavigate,
  disabled = false,
}: ResolutionNavBarProps) {
  const navRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  // Scroll automatique vers l'élément actif
  useEffect(() => {
    const currentItem = itemRefs.current.get(currentIndex);
    if (currentItem && navRef.current) {
      const navRect = navRef.current.getBoundingClientRect();
      const itemRect = currentItem.getBoundingClientRect();

      // Si l'élément n'est pas visible, scroller
      if (itemRect.left < navRect.left || itemRect.right > navRect.right) {
        currentItem.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
  }, [currentIndex]);

  // Navigation clavier
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorer si on est dans un input ou textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Flèches gauche/droite
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        e.preventDefault();
        onNavigate(currentIndex - 1);
      } else if (e.key === 'ArrowRight' && currentIndex < resolutions.length - 1) {
        e.preventDefault();
        onNavigate(currentIndex + 1);
      }

      // Touches numériques 1-9 pour accès rapide
      const num = parseInt(e.key, 10);
      if (!isNaN(num) && num >= 1 && num <= Math.min(9, resolutions.length)) {
        e.preventDefault();
        onNavigate(num - 1);
      }

      // Home/End
      if (e.key === 'Home') {
        e.preventDefault();
        onNavigate(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        onNavigate(resolutions.length - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, resolutions.length, onNavigate, disabled]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0 && !disabled) {
      onNavigate(currentIndex - 1);
    }
  }, [currentIndex, onNavigate, disabled]);

  const goToNext = useCallback(() => {
    if (currentIndex < resolutions.length - 1 && !disabled) {
      onNavigate(currentIndex + 1);
    }
  }, [currentIndex, resolutions.length, onNavigate, disabled]);

  const getResolutionStatus = (resolution: Resolution, index: number): ResolutionStatut => {
    // Résolution avec résultat (votée) — couleur selon le résultat
    if (resolution.resultat) {
      if (resolution.resultat === 'ADOPTEE') return 'adoptee';
      if (resolution.resultat === 'REJETEE') return 'rejetee';
      if (resolution.resultat === 'AJOURNEE') return 'ajournee';
    }
    // Fallback: completed sans resultat (ex: résolution d'information)
    if (completedResolutions.includes(resolution.id)) {
      return 'vote';
    }
    if (index === currentIndex) {
      return 'en_cours';
    }
    return 'a_voter';
  };

  return (
    <nav className={styles.container} aria-label="Navigation des résolutions">
      {/* Bouton précédent */}
      <button
        type="button"
        className={styles.arrowBtn}
        onClick={goToPrevious}
        disabled={currentIndex === 0 || disabled}
        aria-label="Résolution précédente"
        title="Résolution précédente (←)"
      >
        <ChevronLeft size={20} aria-hidden="true" />
      </button>

      {/* Barre de numéros */}
      <div className={styles.navBar} ref={navRef} role="tablist">
        {resolutions.map((resolution, index) => {
          const isActive = index === currentIndex;
          const status = getResolutionStatus(resolution, index);

          return (
            <button
              key={resolution.id}
              ref={(el) => {
                if (el) itemRefs.current.set(index, el);
              }}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={`Résolution ${index + 1}: ${resolution.titre}`}
              title={resolution.titre}
              className={`${styles.navItem} ${isActive ? styles.active : ''} ${styles[status]}`}
              onClick={() => !disabled && onNavigate(index)}
              disabled={disabled}
            >
              <span className={styles.numero}>{index + 1}</span>
              {/* Indicateur de statut */}
              <span className={styles.statusDot} aria-hidden="true" />
            </button>
          );
        })}
      </div>

      {/* Bouton suivant */}
      <button
        type="button"
        className={styles.arrowBtn}
        onClick={goToNext}
        disabled={currentIndex === resolutions.length - 1 || disabled}
        aria-label="Résolution suivante"
        title="Résolution suivante (→)"
      >
        <ChevronRight size={20} aria-hidden="true" />
      </button>

      {/* Indicateur de position */}
      <div className={styles.positionIndicator}>
        <span>{currentIndex + 1}</span>
        <span className={styles.separator}>/</span>
        <span>{resolutions.length}</span>
      </div>

      {/* Aide raccourcis clavier */}
      <div className={styles.keyboardHint}>
        <kbd>←</kbd><kbd>→</kbd> <span>Navigation</span>
        <kbd>1</kbd>-<kbd>9</kbd> <span>Accès direct</span>
      </div>
    </nav>
  );
}

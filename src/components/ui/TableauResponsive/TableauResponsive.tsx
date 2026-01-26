'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './TableauResponsive.module.css';

interface TableauResponsiveProps {
  children: React.ReactNode;
  /** Afficher les indicateurs de scroll */
  afficherIndicateurs?: boolean;
  className?: string;
}

/**
 * Wrapper pour tableaux avec scroll horizontal
 * Gère les indicateurs de défilement
 * Note: Pour figer des colonnes, ajouter les styles sticky dans le CSS du tableau
 */
export function TableauResponsive({
  children,
  afficherIndicateurs = true,
  className = '',
}: TableauResponsiveProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Détection des possibilités de scroll
  const checkScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    checkScroll();
    el.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);

    // Observer pour détecter les changements de contenu
    const resizeObserver = new ResizeObserver(checkScroll);
    resizeObserver.observe(el);

    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
      resizeObserver.disconnect();
    };
  }, [checkScroll]);

  // Scroll programmatique
  const scroll = useCallback((direction: 'left' | 'right') => {
    const el = containerRef.current;
    if (!el) return;

    const scrollAmount = el.clientWidth * 0.5;
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  }, []);

  return (
    <div className={`${styles.wrapper} ${className}`}>
      {/* Indicateur scroll gauche */}
      {afficherIndicateurs && canScrollLeft && (
        <button
          type="button"
          onClick={() => scroll('left')}
          className={`${styles.indicateur} ${styles.indicateurGauche}`}
          aria-label="Défiler vers la gauche"
        >
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
      )}

      {/* Container scrollable */}
      <div ref={containerRef} className={styles.container}>
        {children}
      </div>

      {/* Indicateur scroll droite */}
      {afficherIndicateurs && canScrollRight && (
        <button
          type="button"
          onClick={() => scroll('right')}
          className={`${styles.indicateur} ${styles.indicateurDroite}`}
          aria-label="Défiler vers la droite"
        >
          <ChevronRight size={20} aria-hidden="true" />
        </button>
      )}

      {/* Ombres indicatrices de scroll */}
      {canScrollRight && <div className={styles.ombreDroite} aria-hidden="true" />}
      {canScrollLeft && <div className={styles.ombreGauche} aria-hidden="true" />}
    </div>
  );
}

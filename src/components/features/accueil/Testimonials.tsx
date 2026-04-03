'use client';

import { useState, useEffect, useRef } from 'react';
import { Play } from 'lucide-react';
import styles from './Testimonials.module.css';

interface Testimonial {
  quote: string;
  author: string;
  role: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote: "CoProFlex a révolutionné notre gestion. Tout est centralisé, transparent et accessible.",
    author: "Pierre Martin",
    role: "Syndic professionnel",
  },
  {
    quote: "Les AG en ligne sont un vrai gain de temps. Plus besoin de courir après les mandats.",
    author: "Claire Dubois",
    role: "Gestionnaire copropriété",
  },
  {
    quote: "Enfin un outil pensé pour les copropriétaires. Je comprends enfin mes charges.",
    author: "Jean-Paul Moreau",
    role: "Copropriétaire",
  },
  {
    quote: "Le tableau de bord financier nous donne une visibilité totale sur notre budget.",
    author: "Isabelle Roux",
    role: "Présidente du CS",
  },
];

const ROTATION_INTERVAL = 5000;

export function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const prefersReducedMotion = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      prefersReducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
  }, []);

  useEffect(() => {
    if (isPaused || prefersReducedMotion.current) return;

    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % TESTIMONIALS.length);
    }, ROTATION_INTERVAL);

    return () => clearInterval(timer);
  }, [isPaused]);

  const active = TESTIMONIALS[activeIndex];

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        {/* Left: Video placeholder */}
        <div className={styles.videoPlaceholder}>
          <button className={styles.playBtn} aria-label="Lire la vidéo">
            <Play size={28} fill="white" color="white" />
          </button>
        </div>

        {/* Right: Testimonials */}
        <div
          className={styles.quotesCol}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <h2 className={styles.title}>Ce que nos clients en disent</h2>

          <div
            className={styles.quoteContainer}
            aria-live="polite"
            aria-atomic="true"
          >
            <blockquote className={styles.quote}>
              &ldquo;{active.quote}&rdquo;
            </blockquote>
            <div className={styles.author}>
              <span className={styles.authorName}>{active.author}</span>
              <span className={styles.authorRole}>{active.role}</span>
            </div>
          </div>

          <div className={styles.authorsBar}>
            {TESTIMONIALS.map((t, index) => (
              <button
                key={index}
                className={`${styles.authorBtn} ${index === activeIndex ? styles.authorBtnActive : ''}`}
                onClick={() => setActiveIndex(index)}
                aria-label={`Témoignage de ${t.author}`}
              >
                {t.author.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

'use client';

import { Unlock, BookOpen, ShieldCheck, Headphones } from 'lucide-react';
import styles from './CtaSection.module.css';

const CARDS = [
  {
    Icon: Unlock,
    title: 'Sans engagement',
    description: 'Testez sans risque, résiliez quand vous voulez',
  },
  {
    Icon: BookOpen,
    title: 'Onboarding inclus',
    description: 'Formation et migration de données incluses',
  },
  {
    Icon: ShieldCheck,
    title: 'Données sécurisées',
    description: 'Hébergement en France, chiffrement bout-en-bout',
  },
  {
    Icon: Headphones,
    title: 'Support dédié',
    description: "Une équipe d'experts à votre écoute",
  },
] as const;

export function CtaSection() {
  return (
    <section className={styles.outer}>
      {/* Inner wrapper — cream card */}
      <div className={styles.inner}>
        <h2 className={styles.title}>Demander une démo gratuite</h2>
        <p className={styles.description}>
          Découvrez CoProFlex en 30 minutes avec un expert dédié
        </p>
        <button className={styles.ctaButton}>Demander une démo</button>
      </div>

      {/* Feature cards below */}
      <div className={styles.cards}>
        {CARDS.map(({ Icon, title, description }) => (
          <div key={title} className={styles.card}>
            <Icon size={28} className={styles.cardIcon} />
            <span className={styles.cardTitle}>{title}</span>
            <span className={styles.cardDescription}>{description}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

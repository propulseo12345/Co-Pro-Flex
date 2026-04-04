import type { Metadata } from 'next';
import { Check } from 'lucide-react';
import { PageHero } from '@/components/features/marketing/PageHero';
import { CtaBanner } from '@/components/features/marketing/CtaBanner';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Comment ça marche',
  description:
    'Migrer vers CoProFlex en 3 étapes : migration de vos données, formation personnalisée, gestion en autonomie. Opérationnel en 5 jours.',
};

/* ── Data ── */

interface Step {
  number: string;
  title: string;
  description: string;
  bullets: string[];
}

const steps: Step[] = [
  {
    number: '01',
    title: 'Migration de vos données',
    description:
      'Nous récupérons vos données et les intégrons dans CoProFlex. Pas de ressaisie.',
    bullets: [
      'Import copropriétés / lots / tantièmes',
      'Import copropriétaires',
      'Reprise comptable',
      'Transfert documentaire',
    ],
  },
  {
    number: '02',
    title: 'Formation personnalisée',
    description: 'Une heure suffit pour maîtriser CoProFlex.',
    bullets: [
      'Session 1h en visio',
      'Guides et tutoriels vidéo',
      'Support renforcé 90 jours',
      'Webinaires mensuels',
    ],
  },
  {
    number: '03',
    title: 'Gestion en autonomie',
    description:
      "Vous êtes opérationnel. CoProFlex continue d'évoluer avec vous.",
    bullets: [
      'Support continu',
      'Mises à jour automatiques',
      "Communauté d'utilisateurs",
      'Roadmap ouverte',
    ],
  },
];

interface ComparisonRow {
  before: string;
  after: string;
}

const comparisonRows: ComparisonRow[] = [
  {
    before: 'PV rédigés à la main, erreurs de comptage',
    after: 'Votes calculés en temps réel, PV automatique',
  },
  {
    before: 'Appels de fonds sous Excel, envoyés un par un',
    after: 'Générés en un clic, paiements suivis automatiquement',
  },
  {
    before: 'Relances oubliées',
    after: 'Automatiques à J+15, J+30, J+60, J+90',
  },
  {
    before: 'Documents éparpillés',
    after: 'GED sécurisée, accessibles en 3 secondes',
  },
  {
    before: 'Copropriétaires qui appellent pour chaque info',
    after: 'Espace personnel 24h/24',
  },
  {
    before: 'Passation chaotique au changement de gestionnaire',
    after: 'Historique complet dans la plateforme',
  },
];

/* ── Component ── */

export default function CommentCaMarchePage() {
  return (
    <div className={styles.page}>
      <PageHero
        badge="Comment ça marche"
        title="Opérationnel en 5 jours, pas en 5 mois"
        subtitle="Migrer vers CoProFlex ne bouleverse pas votre quotidien. En trois étapes, votre gestion passe du papier à une plateforme moderne."
      />

      {/* Steps */}
      <section className={styles.stepsSection}>
        <div className={styles.stepsGrid}>
          {steps.map((step) => (
            <div key={step.number} className={styles.stepCard}>
              <span className={styles.stepNumber}>{step.number}</span>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepDescription}>{step.description}</p>
              <ul className={styles.stepBullets}>
                {step.bullets.map((bullet) => (
                  <li key={bullet} className={styles.stepBullet}>
                    <Check size={14} className={styles.bulletCheck} />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Before / After */}
      <section className={styles.comparisonSection}>
        <h2 className={styles.comparisonTitle}>Avant / Après</h2>
        <div className={styles.comparisonGrid}>
          {/* Headers */}
          <div className={`${styles.comparisonHeader} ${styles.comparisonHeaderBefore}`}>
            Avant CoProFlex
          </div>
          <div className={`${styles.comparisonHeader} ${styles.comparisonHeaderAfter}`}>
            Avec CoProFlex
          </div>

          {/* Rows */}
          {comparisonRows.map((row) => (
            <div key={row.before} className={styles.comparisonRow}>
              <div className={`${styles.comparisonCell} ${styles.cellBefore}`}>
                {row.before}
              </div>
              <div className={`${styles.comparisonCell} ${styles.cellAfter}`}>
                {row.after}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonial */}
      <section className={styles.testimonialSection}>
        <blockquote className={styles.testimonial}>
          <p className={styles.testimonialQuote}>
            &laquo; Nous gérions 35 copropriétés sur un logiciel vieillissant. La migration vers CoProFlex a pris 8 jours. Dès le premier mois, nous avons réduit de 40 % le temps passé sur les tâches administratives. &raquo;
          </p>
          <footer className={styles.testimonialFooter}>
            <div className={styles.testimonialAuthor}>
              <strong>Laurent Martin</strong>
              <span>Directeur de gestion, Cabinet Martin & Associés</span>
            </div>
            <div className={styles.testimonialResult}>
              <span className={styles.resultValue}>12 heures</span>
              <span className={styles.resultLabel}>économisées par semaine</span>
            </div>
          </footer>
        </blockquote>
      </section>

      <CtaBanner
        text="Prêt à simplifier votre gestion de copropriété ?"
        buttonText="Démarrer l'essai gratuit"
        secondaryText="Planifier une démo"
        secondaryHref="/contact"
      />
    </div>
  );
}

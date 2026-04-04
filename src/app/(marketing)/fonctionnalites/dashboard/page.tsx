import type { Metadata } from 'next';
import { PageHero } from '@/components/features/marketing/PageHero';
import { SectionHeader } from '@/components/features/marketing/SectionHeader';
import { CtaBanner } from '@/components/features/marketing/CtaBanner';
import { DemoSection } from '../DemoSection';
import { DemoDashboard } from '@/components/features/accueil/demos/DemoDashboard';
import styles from '../feature-detail.module.css';

export const metadata: Metadata = {
  title: 'Tableau de bord',
};

const beforeItems = [
  'Jongler entre Excel, emails et classeurs',
  'Problèmes détectés trop tard',
  'Impossible de prioriser',
  'Chaque copropriété gérée séparément',
];

const afterItems = [
  'Un seul écran avec tous les indicateurs',
  'Alertes proactives',
  'Hiérarchisation automatique',
  'Vue multi-copropriétés en un clic',
];

const features = [
  { title: 'KPIs en temps réel', desc: 'Solde de trésorerie, impayés, prochaine AG, interventions en cours : tout en un coup d\'oeil.' },
  { title: 'Alertes critiques', desc: 'Les problèmes remontent automatiquement : impayés, contrats à renouveler, échéances proches.' },
  { title: 'Vue multi-copropriétés', desc: 'Gérez plusieurs copropriétés depuis un seul tableau de bord consolidé.' },
  { title: 'Raccourcis actions rapides', desc: 'Accédez aux actions les plus fréquentes en un clic : créer un appel, envoyer une relance.' },
  { title: 'Historique et tendances', desc: 'Suivez l\'évolution de vos indicateurs dans le temps pour anticiper les problèmes.' },
  { title: 'Personnalisation', desc: 'Choisissez les KPIs et alertes qui comptent le plus pour votre activité.' },
];

export default function DashboardPage() {
  return (
    <div className={styles.page}>
      <PageHero
        badge="Tableau de bord"
        badgeColor="#3079FF"
        title="Votre copropriété en un coup d'œil"
        subtitle="Vision consolidée : finances, impayés, travaux, échéances. Les problèmes remontent avant qu'ils ne deviennent critiques."
      />

      <div className={styles.beforeAfter}>
        <div className={styles.beforeColumn}>
          <p className={styles.beforeTitle}>Avant CoProFlex</p>
          <ul className={styles.beforeList}>
            {beforeItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className={styles.afterColumn}>
          <p className={styles.afterTitle}>Avec CoProFlex</p>
          <ul className={styles.afterList}>
            {afterItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className={styles.demoSection}>
        <DemoSection>
          <DemoDashboard />
        </DemoSection>
      </div>

      <section className={styles.features}>
        <SectionHeader
          label="Fonctionnalités"
          labelColor="#3079FF"
          title="Pilotez en toute clarté"
          centered
        />
        <div className={styles.featuresGrid}>
          {features.map((f) => (
            <div key={f.title} className={styles.featureItem}>
              <h3 className={styles.featureTitle}>{f.title}</h3>
              <p className={styles.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <blockquote className={styles.testimonial}>
        <p className={styles.quoteText}>
          &ldquo;Je gère 5 copropriétés. Chaque matin, j&apos;ouvre mon dashboard et je sais exactement ce qui nécessite mon attention.&rdquo;
        </p>
        <p className={styles.quoteAuthor}>Marc Lefèbvre</p>
        <p className={styles.quoteRole}>Gestionnaire indépendant (210 lots)</p>
      </blockquote>

      <CtaBanner
        text="Pilotez vos copropriétés en toute clarté"
        buttonText="Voir le tableau de bord"
      />
    </div>
  );
}

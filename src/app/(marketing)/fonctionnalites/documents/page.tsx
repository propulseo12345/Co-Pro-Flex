import type { Metadata } from 'next';
import { PageHero } from '@/components/features/marketing/PageHero';
import { SectionHeader } from '@/components/features/marketing/SectionHeader';
import { CtaBanner } from '@/components/features/marketing/CtaBanner';
import { DemoSection } from '../DemoSection';
import { DemoDocuments } from '@/components/features/accueil/demos/DemoDocuments';
import styles from '../feature-detail.module.css';

export const metadata: Metadata = {
  title: 'Documents (GED)',
};

const beforeItems = [
  'Documents éparpillés entre emails et clés USB',
  'Copropriétaires qui redemandent sans cesse',
  'Recherche d\'un PV de 2019 ? Bonne chance',
  'Transmission chaotique au changement de syndic',
];

const afterItems = [
  'Tous centralisés, classés par catégorie',
  'Accès libre-service, consultation 24h/24',
  'Recherche instantanée par mot-clé',
  'Archivage structuré, transmission en un clic',
];

const features = [
  { title: 'Classement par catégories', desc: 'PV, règlements, contrats, diagnostics : chaque document dans la bonne catégorie.' },
  { title: 'Upload simple', desc: 'Glissez-déposez vos fichiers ou importez-les depuis votre ordinateur en un clic.' },
  { title: 'Prévisualisation intégrée', desc: 'Consultez vos PDF, images et documents directement dans l\'application.' },
  { title: 'Partage avec copropriétaires', desc: 'Rendez les documents accessibles aux copropriétaires selon leurs droits.' },
  { title: 'Recherche avancée', desc: 'Retrouvez n\'importe quel document par mot-clé, date ou catégorie.' },
  { title: 'Archivage et historique', desc: 'Conservez toutes les versions et l\'historique complet de chaque document.' },
];

export default function DocumentsPage() {
  return (
    <div className={styles.page}>
      <PageHero
        badge="Documents"
        badgeColor="#0081F1"
        title="Tous vos documents, un seul endroit"
        subtitle="PV, règlements, contrats, diagnostics : stockez, classez et partagez. Fini les recherches interminables."
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
          <DemoDocuments />
        </DemoSection>
      </div>

      <section className={styles.features}>
        <SectionHeader
          label="Fonctionnalités"
          labelColor="#0081F1"
          title="Une GED pensée pour la copropriété"
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
          &ldquo;Un copropriétaire m&apos;a demandé le PV de 2021. En 10 secondes, retrouvé et partagé. Avant, ça prenait une demi-heure.&rdquo;
        </p>
        <p className={styles.quoteAuthor}>Thomas Bernard</p>
        <p className={styles.quoteRole}>Gestionnaire, Cabinet ImmoGest (120 lots)</p>
      </blockquote>

      <CtaBanner
        text="Vos documents accessibles en un instant"
        buttonText="Organiser mes documents"
      />
    </div>
  );
}

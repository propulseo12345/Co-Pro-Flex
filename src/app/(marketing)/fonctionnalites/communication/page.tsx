import type { Metadata } from 'next';
import { PageHero } from '@/components/features/marketing/PageHero';
import { SectionHeader } from '@/components/features/marketing/SectionHeader';
import { CtaBanner } from '@/components/features/marketing/CtaBanner';
import { DemoSection } from '../DemoSection';
import { DemoCommunication } from '@/components/features/accueil/demos/DemoCommunication';
import styles from '../feature-detail.module.css';

export const metadata: Metadata = {
  title: 'Communication',
};

const beforeItems = [
  'Communication fragmentée entre emails et courriers',
  'Informations qui se perdent dans les boîtes mail',
  'Copropriétaires non informés',
  'Aucune trace des échanges',
];

const afterItems = [
  'Canal unique pour toutes les communications',
  'Mur d\'annonces visible par tous avec notifications',
  'Chaque décision communiquée en temps réel',
  'Historique complet horodaté',
];

const features = [
  { title: 'Messagerie privée', desc: 'Échangez directement avec un copropriétaire ou un prestataire en toute confidentialité.' },
  { title: 'Mur communautaire', desc: 'Publiez des annonces visibles par tous les copropriétaires de la résidence.' },
  { title: 'Événements', desc: 'Créez et partagez des événements : AG, travaux, réunions du conseil syndical.' },
  { title: 'Notifications intelligentes', desc: 'Chaque copropriétaire est notifié selon ses préférences : email, push ou in-app.' },
  { title: 'Historique complet', desc: 'Retrouvez chaque échange, horodaté et archivé, pour une traçabilité totale.' },
  { title: 'Préférences de communication', desc: 'Chaque copropriétaire choisit son canal préféré et sa fréquence de notifications.' },
];

export default function CommunicationPage() {
  return (
    <div className={styles.page}>
      <PageHero
        badge="Communication"
        badgeColor="#3079FF"
        title="Informez, échangez, fédérez vos copros"
        subtitle="Messagerie privée, annonces collectives, événements : communication fluide sans email perdu."
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
          <DemoCommunication />
        </DemoSection>
      </div>

      <section className={styles.features}>
        <SectionHeader
          label="Fonctionnalités"
          labelColor="#3079FF"
          title="Une communication fluide et tracée"
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
          &ldquo;Depuis le mur communautaire, les copropriétaires sont informés en temps réel. Moins d&apos;appels, ambiance plus apaisée en AG.&rdquo;
        </p>
        <p className={styles.quoteAuthor}>Isabelle Moreau</p>
        <p className={styles.quoteRole}>Syndic bénévole (28 lots)</p>
      </blockquote>

      <CtaBanner
        text="Renforcez le lien avec vos copropriétaires"
        buttonText="Améliorer la communication"
      />
    </div>
  );
}

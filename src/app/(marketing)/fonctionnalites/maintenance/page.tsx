import type { Metadata } from 'next';
import { PageHero } from '@/components/features/marketing/PageHero';
import { SectionHeader } from '@/components/features/marketing/SectionHeader';
import { CtaBanner } from '@/components/features/marketing/CtaBanner';
import { DemoSection } from '../DemoSection';
import { DemoMaintenance } from '@/components/features/accueil/demos/DemoMaintenance';
import styles from '../feature-detail.module.css';

export const metadata: Metadata = {
  title: 'Maintenance',
};

const beforeItems = [
  'Interventions non tracées, historique perdu',
  'Contrats oubliés, renouvelés par défaut',
  'Ordres de service par email, sans suivi',
  'Impossible de savoir quel prestataire a fait quoi',
];

const afterItems = [
  'Carnet d\'entretien numérique complet',
  'Alertes automatiques avant chaque échéance',
  'Workflow complet du brouillon à la clôture',
  'Fiche prestataire avec historique',
];

const features = [
  { title: 'Carnet d\'entretien numérique', desc: 'Centralisez tout l\'historique des interventions, classé par date, type et prestataire.' },
  { title: 'Ordres de service', desc: 'Créez, envoyez et suivez chaque ordre de service du brouillon à la clôture.' },
  { title: 'Gestion des contrats', desc: 'Stockez tous vos contrats prestataires avec dates, montants et conditions.' },
  { title: 'Alertes de renouvellement', desc: 'Recevez une alerte avant chaque échéance pour éviter les reconductions tacites.' },
  { title: 'Annuaire prestataires', desc: 'Fiches prestataires complètes avec coordonnées, spécialités et historique d\'interventions.' },
  { title: 'Planification des travaux', desc: 'Anticipez les travaux à venir et suivez leur avancement étape par étape.' },
];

export default function MaintenancePage() {
  return (
    <div className={styles.page}>
      <PageHero
        badge="Maintenance"
        badgeColor="#0081F1"
        title="Chaque intervention tracée, rien n'est oublié"
        subtitle="Carnet d'entretien numérique, ordres de service, contrats prestataires sous contrôle."
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
          <DemoMaintenance />
        </DemoSection>
      </div>

      <section className={styles.features}>
        <SectionHeader
          label="Fonctionnalités"
          labelColor="#0081F1"
          title="Un suivi technique complet et serein"
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
          &ldquo;On a découvert qu&apos;un contrat ascenseur était renouvelé depuis 4 ans sans qu&apos;on le sache. Avec les alertes, on a économisé 2 400 &euro; par an.&rdquo;
        </p>
        <p className={styles.quoteAuthor}>Sophie Laurent</p>
        <p className={styles.quoteRole}>Conseillère syndicale (54 lots)</p>
      </blockquote>

      <CtaBanner
        text="Gardez le contrôle sur l'entretien de votre immeuble"
        buttonText="Découvrir la maintenance"
      />
    </div>
  );
}

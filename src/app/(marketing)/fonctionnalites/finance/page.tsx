import type { Metadata } from 'next';
import { PageHero } from '@/components/features/marketing/PageHero';
import { SectionHeader } from '@/components/features/marketing/SectionHeader';
import { CtaBanner } from '@/components/features/marketing/CtaBanner';
import { DemoSection } from '../DemoSection';
import { DemoFinance } from '@/components/features/accueil/demos/DemoFinance';
import styles from '../feature-detail.module.css';

export const metadata: Metadata = {
  title: 'Finance & Comptabilité',
};

const beforeItems = [
  'Suivi sur tableur, formules cassées',
  'Erreurs de saisie, rapprochements laborieux',
  'Copropriétaires qui appellent pour leur solde',
  'Relances oubliées, trésorerie fragilisée',
];

const afterItems = [
  'Comptabilité centralisée, données fiables',
  'Écritures automatisées, grand livre en un clic',
  'Espace copropriétaire avec solde en temps réel',
  'Relances automatiques J+15 à J+90',
];

const features = [
  { title: 'Budgets prévisionnels', desc: 'Créez et comparez vos budgets prévisionnels, travaux et ALUR année par année.' },
  { title: 'Appels de fonds intelligents', desc: 'Génération automatique des échéanciers : trimestriel, semestriel ou personnalisé.' },
  { title: 'Suivi des paiements', desc: 'Visualisez en temps réel qui a payé, qui est en retard, et le montant restant dû.' },
  { title: 'Relances automatiques', desc: 'Relances programmées à J+15, J+30, J+60 et J+90 avec modèles personnalisables.' },
  { title: 'Grand livre & Balance', desc: 'Consultez le grand livre et la balance comptable en un clic, filtrés par exercice.' },
  { title: 'Gestion des factures', desc: 'Créez, validez et suivez le paiement de chaque facture fournisseur.' },
  { title: 'Tableaux de bord financiers', desc: 'KPIs clés : trésorerie, taux de recouvrement, budget consommé, impayés.' },
  { title: 'Export comptable', desc: 'Exportez vos données au format standard pour votre expert-comptable.' },
];

export default function FinancePage() {
  return (
    <div className={styles.page}>
      <PageHero
        badge="Finance & Comptabilité"
        badgeColor="#55AC63"
        title="La comptabilité copro, enfin limpide"
        subtitle="Budgets, appels de fonds, suivi des paiements et relances automatiques dans un seul outil."
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
          <DemoFinance />
        </DemoSection>
      </div>

      <section className={styles.features}>
        <SectionHeader
          label="Fonctionnalités"
          labelColor="#55AC63"
          title="Une gestion financière sans angle mort"
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
          &ldquo;Je gérais trois copropriétés sur Excel. Avec CoProFlex, les échéanciers se génèrent en un clic. J&apos;ai récupéré mes week-ends.&rdquo;
        </p>
        <p className={styles.quoteAuthor}>Jean-Pierre Martin</p>
        <p className={styles.quoteRole}>Président du conseil syndical (78 lots)</p>
      </blockquote>

      <CtaBanner
        text="Reprenez le contrôle de vos finances"
        buttonText="Essayer gratuitement"
      />
    </div>
  );
}

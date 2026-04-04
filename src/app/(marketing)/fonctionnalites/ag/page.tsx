import type { Metadata } from 'next';
import { PageHero } from '@/components/features/marketing/PageHero';
import { SectionHeader } from '@/components/features/marketing/SectionHeader';
import { CtaBanner } from '@/components/features/marketing/CtaBanner';
import { DemoSection } from '../DemoSection';
import { DemoAgVotes } from '@/components/features/accueil/demos/DemoAgVotes';
import styles from '../feature-detail.module.css';

export const metadata: Metadata = {
  title: 'Assemblées Générales',
};

const beforeItems = [
  'Comptage des voix à la main',
  'PV rédigé des semaines après',
  'Copropriétaires absents non représentés',
  'Conformité juridique incertaine',
];

const afterItems = [
  'Calcul automatique des majorités (art. 24, 25, 25-1, 26, 26-1)',
  'PV généré automatiquement en fin de séance',
  'Vote par correspondance intégré',
  'Résolutions pré-rédigées conformes',
];

const features = [
  { title: 'Convocation automatique', desc: 'Générez et envoyez les convocations conformes en un clic, avec ordre du jour et documents annexes.' },
  { title: 'Feuille de présence numérique', desc: 'Enregistrez les présents, représentés et absents directement sur tablette ou ordinateur.' },
  { title: 'Vote en temps réel', desc: 'Chaque résolution est votée en direct avec décompte instantané des voix.' },
  { title: 'Calcul automatique des majorités', desc: 'Articles 24, 25, 25-1, 26 et 26-1 calculés automatiquement selon les tantièmes.' },
  { title: 'Vote par correspondance', desc: 'Les copropriétaires absents peuvent voter avant l\'AG, leurs voix sont intégrées au décompte.' },
  { title: 'Résolutions pré-rédigées', desc: '14 résolutions types conformes à la loi, personnalisables selon vos besoins.' },
  { title: 'Signature électronique', desc: 'Feuille de présence signée numériquement par chaque participant.' },
  { title: 'Génération PDF instantanée', desc: 'PV, convocations et feuilles de présence exportés en PDF professionnel.' },
];

export default function AgPage() {
  return (
    <div className={styles.page}>
      <PageHero
        badge="Assemblées Générales"
        badgeColor="#FC5F35"
        title="Vos AG, enfin simples et conformes"
        subtitle="De la convocation au procès-verbal, CoProFlex automatise chaque étape de vos assemblées générales."
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
          <DemoAgVotes />
        </DemoSection>
      </div>

      <section className={styles.features}>
        <SectionHeader
          label="Fonctionnalités"
          labelColor="#FC5F35"
          title="Tout ce qu'il faut pour des AG sereines"
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
          &ldquo;Avant CoProFlex, je passais deux soirées à rédiger le PV. Maintenant, il est généré en fin de séance.&rdquo;
        </p>
        <p className={styles.quoteAuthor}>Marie Dupont</p>
        <p className={styles.quoteRole}>Syndic bénévole, Résidence Les Oliviers (32 lots)</p>
      </blockquote>

      <CtaBanner
        text="Organisez votre prochaine AG en toute sérénité"
        buttonText="Démarrer gratuitement"
      />
    </div>
  );
}

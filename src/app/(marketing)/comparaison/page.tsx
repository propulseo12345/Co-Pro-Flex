import type { Metadata } from 'next';
import { Check, X, Minus } from 'lucide-react';
import { PageHero } from '@/components/features/marketing/PageHero';
import { CtaBanner } from '@/components/features/marketing/CtaBanner';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Comparaison',
  description:
    'Comparez objectivement CoProFlex avec les logiciels traditionnels et la gestion manuelle. Interface, AG, comptabilité, sécurité.',
};

/* ── Data ── */

type CellValue = 'check' | 'partial' | 'cross' | 'na';

interface ComparisonRow {
  feature: string;
  coproflex: CellValue;
  traditional: CellValue;
  manual: CellValue;
}

const rows: ComparisonRow[] = [
  { feature: 'Interface moderne', coproflex: 'check', traditional: 'partial', manual: 'cross' },
  { feature: 'AG dématérialisées', coproflex: 'check', traditional: 'partial', manual: 'cross' },
  { feature: 'Calcul automatique majorités', coproflex: 'check', traditional: 'partial', manual: 'cross' },
  { feature: 'Votes par correspondance', coproflex: 'check', traditional: 'cross', manual: 'cross' },
  { feature: 'Comptabilité temps réel', coproflex: 'check', traditional: 'check', manual: 'cross' },
  { feature: 'Appels de fonds automatisés', coproflex: 'check', traditional: 'partial', manual: 'cross' },
  { feature: 'Relances impayés automatiques', coproflex: 'check', traditional: 'cross', manual: 'cross' },
  { feature: 'GED avec partage copropriétaires', coproflex: 'check', traditional: 'partial', manual: 'cross' },
  { feature: 'Espace copropriétaire 24/7', coproflex: 'check', traditional: 'cross', manual: 'cross' },
  { feature: 'Communication intégrée', coproflex: 'check', traditional: 'cross', manual: 'cross' },
  { feature: "Carnet d'entretien digital", coproflex: 'check', traditional: 'partial', manual: 'cross' },
  { feature: 'Multi-copropriétés natif', coproflex: 'check', traditional: 'check', manual: 'partial' },
  { feature: 'Accès mobile', coproflex: 'check', traditional: 'partial', manual: 'cross' },
  { feature: 'Conforme RGPD', coproflex: 'check', traditional: 'partial', manual: 'cross' },
  { feature: 'Hébergement France', coproflex: 'check', traditional: 'partial', manual: 'cross' },
  { feature: 'Support réactif (< 2h)', coproflex: 'check', traditional: 'partial', manual: 'cross' },
  { feature: 'Migration accompagnée', coproflex: 'check', traditional: 'cross', manual: 'na' },
  { feature: 'Mises à jour incluses', coproflex: 'check', traditional: 'partial', manual: 'na' },
  { feature: 'Tarification transparente', coproflex: 'check', traditional: 'cross', manual: 'check' },
];

const advantages = [
  {
    title: 'Tout-en-un, vraiment',
    description:
      "CoProFlex réunit ce qui nécessite habituellement 3 à 5 outils distincts. Un seul abonnement, une seule interface.",
  },
  {
    title: 'Conçu pour la loi française',
    description:
      "Majorités de la loi de 1965, appels de fonds conformes, comptabilité copropriété, obligations ALUR. La conformité est le cœur du produit.",
  },
  {
    title: 'Opérationnel en jours, pas en mois',
    description:
      "Migration en moins d'une semaine, formation une heure, autonomie dès le premier jour.",
  },
];

/* ── Helpers ── */

function CellIcon({ value }: { value: CellValue }) {
  switch (value) {
    case 'check':
      return <Check size={16} className={styles.iconCheck} />;
    case 'partial':
      return <span className={styles.iconPartial}>~</span>;
    case 'cross':
      return <X size={16} className={styles.iconCross} />;
    case 'na':
      return <Minus size={16} className={styles.iconNa} />;
  }
}

/* ── Component ── */

export default function ComparaisonPage() {
  return (
    <div className={styles.page}>
      <PageHero
        title="CoProFlex face aux alternatives"
        subtitle="Comparez objectivement CoProFlex avec les logiciels traditionnels et la gestion manuelle."
      />

      {/* Comparison Table */}
      <section className={styles.tableSection}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.thFeature}>Fonctionnalité</th>
                <th className={`${styles.thPlan} ${styles.thHighlighted}`}>CoProFlex</th>
                <th className={styles.thPlan}>Logiciel traditionnel</th>
                <th className={styles.thPlan}>Gestion manuelle</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.feature} className={idx % 2 === 0 ? styles.rowEven : ''}>
                  <td className={styles.tdFeature}>{row.feature}</td>
                  <td className={`${styles.tdValue} ${styles.tdHighlighted}`}>
                    <CellIcon value={row.coproflex} />
                  </td>
                  <td className={styles.tdValue}>
                    <CellIcon value={row.traditional} />
                  </td>
                  <td className={styles.tdValue}>
                    <CellIcon value={row.manual} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <Check size={14} className={styles.iconCheck} /> Inclus
          </span>
          <span className={styles.legendItem}>
            <span className={styles.iconPartial}>~</span> Partiel ou en option
          </span>
          <span className={styles.legendItem}>
            <X size={14} className={styles.iconCross} /> Non disponible
          </span>
          <span className={styles.legendItem}>
            <Minus size={14} className={styles.iconNa} /> Non applicable
          </span>
        </div>
      </section>

      {/* Advantage Cards */}
      <section className={styles.advantagesSection}>
        <div className={styles.advantagesGrid}>
          {advantages.map((adv) => (
            <div key={adv.title} className={styles.advantageCard}>
              <h3 className={styles.advantageTitle}>{adv.title}</h3>
              <p className={styles.advantageDescription}>{adv.description}</p>
            </div>
          ))}
        </div>
      </section>

      <CtaBanner
        text="Faites le bon choix pour vos copropriétés"
        buttonText="Essayer gratuitement"
        secondaryText="Demander une démo"
        secondaryHref="/contact"
      />
    </div>
  );
}

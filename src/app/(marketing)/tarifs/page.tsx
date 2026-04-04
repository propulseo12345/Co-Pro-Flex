import type { Metadata } from 'next';
import { PageHero } from '@/components/features/marketing/PageHero';
import { CtaBanner } from '@/components/features/marketing/CtaBanner';
import { PricingContent } from './PricingContent';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Tarifs',
  description:
    'Découvrez les tarifs de CoProFlex. Un prix clair par lot, sans frais cachés. Essai gratuit 30 jours, sans carte bancaire.',
};

export default function TarifsPage() {
  return (
    <div className={styles.page}>
      <PageHero
        badge="Tarification transparente"
        title="Un prix clair, sans surprise"
        subtitle="Choisissez la formule adaptée à votre activité. Pas de frais cachés, pas d'engagement longue durée."
      />

      <PricingContent />

      <CtaBanner
        text="30 jours d'essai gratuit, sans carte bancaire"
        buttonText="Démarrer mon essai gratuit"
      />
    </div>
  );
}

import type { Metadata } from 'next';
import { PageHero } from '@/components/features/marketing/PageHero';
import { CtaBanner } from '@/components/features/marketing/CtaBanner';
import { FaqContent } from './FaqContent';
import { categories } from './data';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Toutes les réponses à vos questions sur CoProFlex.',
};

/* ── Structured data for SEO (server-rendered in initial HTML) ── */

function buildFaqJsonLd() {
  const allItems = categories.flatMap((cat) => cat.items);
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: allItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

export default function FaqPage() {
  return (
    <div className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildFaqJsonLd()) }}
      />

      <PageHero
        title="Questions fréquentes"
        subtitle="Tout ce que vous devez savoir sur CoProFlex. Vous ne trouvez pas votre réponse ? Notre équipe vous répond en moins de 2 heures."
      />

      <FaqContent />

      <CtaBanner
        text="Vous avez d'autres questions ?"
        buttonText="Contactez-nous"
        buttonHref="/contact"
      />
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, X } from 'lucide-react';
import { plans, comparisonRows, faqItems } from './data';
import { FaqAccordion } from '@/components/features/marketing/FaqAccordion';
import styles from './page.module.css';

function getCardClass(slug: string, highlighted: boolean): string {
  if (highlighted) return `${styles.pricingCard} ${styles.pricingCardHighlighted}`;
  if (slug === 'entreprise') return `${styles.pricingCard} ${styles.pricingCardEntreprise}`;
  return styles.pricingCard;
}

export function PricingContent() {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <>
      {/* Billing toggle */}
      <div className={styles.toggleWrapper}>
        <button
          type="button"
          className={`${styles.toggleOption} ${!isAnnual ? styles.toggleActive : ''}`}
          onClick={() => setIsAnnual(false)}
        >
          Mensuel
        </button>
        <button
          type="button"
          className={`${styles.toggleOption} ${isAnnual ? styles.toggleActive : ''}`}
          onClick={() => setIsAnnual(true)}
        >
          Annuel
          <span className={styles.toggleBadge}>-17%</span>
        </button>
      </div>
      {isAnnual && <p className={styles.toggleHint}>2 mois offerts avec la facturation annuelle</p>}

      {/* Pricing cards */}
      <section className={styles.pricingSection}>
        <div className={styles.pricingGrid}>
          {plans.map((plan) => {
            const price = isAnnual ? plan.annual : plan.monthly;
            const isCustom = price === 'Sur devis';
            return (
              <div key={plan.slug} className={getCardClass(plan.slug, plan.highlighted)}>
                {plan.highlighted && <span className={styles.recommendedBadge}>Recommandé</span>}
                <h3 className={styles.planName}>{plan.name}</h3>
                <p className={styles.planTagline}>{plan.tagline}</p>
                <div className={styles.priceBlock}>
                  {isCustom ? (
                    <span className={styles.priceCustom}>{price}</span>
                  ) : (
                    <>
                      <span className={styles.priceValue}>{price}&euro;</span>
                      <span className={styles.priceUnit}>{plan.unit}</span>
                    </>
                  )}
                </div>
                {!isCustom && isAnnual && (
                  <p className={styles.priceSavings}>
                    au lieu de {plan.monthly}&euro;{plan.unit}
                  </p>
                )}
                <Link
                  href={plan.ctaHref}
                  className={`${styles.planCta} ${plan.highlighted ? styles.planCtaPrimary : styles.planCtaSecondary}`}
                >
                  {plan.cta}
                </Link>
                <hr className={styles.divider} />
                <ul className={styles.featureList}>
                  {plan.features.map((feat) => (
                    <li key={feat} className={styles.featureItem}>
                      <Check size={14} className={styles.featureCheck} />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* Comparison table */}
      <section className={styles.comparisonSection}>
        <h2 className={styles.comparisonTitle}>Comparatif détaillé des offres</h2>
        <div className={styles.tableWrapper}>
          <table className={styles.comparisonTable}>
            <thead className={styles.tableHead}>
              <tr className={styles.headerRow}>
                <th className={styles.thFeature}>Fonctionnalité</th>
                <th className={styles.thPlan}>
                  <span className={styles.thPlanName}>Essentiel</span>
                  <Link href="/contact" className={`${styles.thPlanCta} ${styles.thCtaSecondary}`}>
                    Essai gratuit
                  </Link>
                </th>
                <th className={`${styles.thPlan} ${styles.thHighlighted}`}>
                  <span className={styles.thPlanName}>Professionnel</span>
                  <Link href="/contact" className={`${styles.thPlanCta} ${styles.thCtaPrimary}`}>
                    Essai gratuit
                  </Link>
                </th>
                <th className={styles.thPlan}>
                  <span className={styles.thPlanName}>Entreprise</span>
                  <Link href="/contact" className={`${styles.thPlanCta} ${styles.thCtaSecondary}`}>
                    Nous contacter
                  </Link>
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row, idx) => (
                <tr key={row.feature} className={idx % 2 === 0 ? styles.rowEven : ''}>
                  <td className={styles.tdFeature}>{row.feature}</td>
                  {(['essentiel', 'professionnel', 'entreprise'] as const).map((plan) => {
                    const val = row[plan];
                    return (
                      <td
                        key={plan}
                        className={`${styles.tdValue} ${plan === 'professionnel' ? styles.tdHighlighted : ''}`}
                      >
                        {val === true ? (
                          <Check size={18} className={styles.checkIcon} />
                        ) : val === false ? (
                          <X size={18} className={styles.crossIcon} />
                        ) : (
                          <span className={styles.textValue}>{val}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <FaqAccordion items={faqItems} title="Questions fréquentes" />
    </>
  );
}

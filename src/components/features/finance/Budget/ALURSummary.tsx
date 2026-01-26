'use client';

import { FondsALUR, CoproprietaireALUR } from './types';
import styles from './Budget.module.css';

interface ALURSummaryProps {
  fondsALUR: FondsALUR;
  coproprietairesALUR: CoproprietaireALUR[];
  budgetAnnuelVote: number;
}

export function ALURSummary({
  fondsALUR,
  coproprietairesALUR,
  budgetAnnuelVote,
}: ALURSummaryProps) {
  const totalContributions = coproprietairesALUR.reduce(
    (sum, c) => sum + c.totalContributions,
    0
  );

  return (
    <div className={styles.alurSummary}>
      <div className={`${styles.alurCard} card`}>
        <h3 className={styles.alurCardTitle}>Solde actuel du fonds</h3>
        <div className={styles.alurCardValue}>{fondsALUR.soldeActuel.toLocaleString()} €</div>
      </div>
      <div className={`${styles.alurCard} card`}>
        <h3 className={styles.alurCardTitle}>Cotisation annuelle</h3>
        <div className={styles.alurCardValue}>
          {fondsALUR.cotisationAnnuelle.toLocaleString()} €
        </div>
        <p className={styles.alurCardSubtext}>
          {fondsALUR.pourcentageBudget}% du budget de {budgetAnnuelVote.toLocaleString()} €
        </p>
      </div>
      <div className={`${styles.alurCard} card`}>
        <h3 className={styles.alurCardTitle}>Total cumulé (tous lots)</h3>
        <div className={styles.alurCardValue}>{totalContributions.toLocaleString()} €</div>
        <p className={styles.alurCardSubtext}>Depuis la création du fonds</p>
      </div>
    </div>
  );
}

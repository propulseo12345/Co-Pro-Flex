'use client';

import { FondsALUR, CoproprietaireALUR } from './types';
import styles from './ALURSummary.module.css';

interface ALURSummaryProps {
  fondsALUR: FondsALUR;
  coproprietairesALUR: CoproprietaireALUR[];
  budgetAnnuelVote: number;
}

export function ALURSummary({ fondsALUR, coproprietairesALUR, budgetAnnuelVote }: ALURSummaryProps) {
  const totalContributions = coproprietairesALUR.reduce((sum, c) => sum + c.totalContributions, 0);

  return (
    <div className={styles.strip}>
      <div className={styles.card}>
        <div className={styles.label}>Solde actuel du fonds</div>
        <div className={`${styles.value} ${styles.blue}`}>{fondsALUR.soldeActuel.toLocaleString('fr-FR')} €</div>
      </div>
      <div className={styles.card}>
        <div className={styles.label}>Cotisation annuelle</div>
        <div className={`${styles.value} ${styles.green}`}>{fondsALUR.cotisationAnnuelle.toLocaleString('fr-FR')} €</div>
        <div className={styles.sub}>{fondsALUR.pourcentageBudget}% du budget de {budgetAnnuelVote.toLocaleString('fr-FR')} €</div>
      </div>
      <div className={styles.card}>
        <div className={styles.label}>Total cumulé (tous lots)</div>
        <div className={`${styles.value} ${styles.orange}`}>{totalContributions.toLocaleString('fr-FR')} €</div>
        <div className={styles.sub}>Depuis la création du fonds</div>
      </div>
    </div>
  );
}

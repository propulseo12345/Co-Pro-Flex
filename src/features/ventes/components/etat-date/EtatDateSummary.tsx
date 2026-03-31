'use client';

import styles from './etat-date.module.css';

const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

interface EtatDateSummaryProps {
  partie1Total: number;
  partie2Total: number;
  partie3Total: number;
}

export function EtatDateSummary({ partie1Total, partie2Total, partie3Total }: EtatDateSummaryProps) {
  const soldeNet = partie2Total - partie1Total;

  return (
    <div className={styles.summaryGrid}>
      <div className={styles.summaryCard}>
        <span className={styles.summaryLabel}>Vendeur doit</span>
        <span className={styles.summaryValueDanger}>{fmt(partie1Total)}</span>
      </div>
      <div className={styles.summaryCard}>
        <span className={styles.summaryLabel}>Syndicat doit</span>
        <span className={styles.summaryValueSuccess}>{fmt(partie2Total)}</span>
      </div>
      <div className={styles.summaryCard}>
        <span className={styles.summaryLabel}>Acquéreur doit</span>
        <span className={styles.summaryValuePrimary}>{fmt(partie3Total)}</span>
      </div>
      <div className={styles.summaryNet}>
        <span className={styles.summaryLabel}>Solde net vendeur</span>
        <span className={soldeNet >= 0 ? styles.summaryValueSuccess : styles.summaryValueDanger}>
          {fmt(soldeNet)}
        </span>
      </div>
    </div>
  );
}

'use client';

import styles from '@/app/(dashboard)/finance/tantiemes/tantiemes.module.css';

export function TantiemesInfoSection() {
  return (
    <div className={styles.infoSection}>
      <h2 className={styles.sectionTitle}>A — Tantièmes et clés de répartition</h2>
      <p className={styles.description}>
        Les tantièmes correspondent à la quote-part de chaque copropriétaire dans la
        copropriété. Ils servent à répartir les charges et à pondérer les votes en AG.
      </p>

      <div className={styles.twoColumns}>
        <div className={styles.infoCard}>
          <h3 className={styles.cardTitle}>1 — Répartition des charges</h3>
          <p className={styles.cardText}>
            Chaque copropriétaire paie ses charges en fonction de ses tantièmes.
          </p>
          <p className={styles.cardHighlight}>
            Les tantièmes sont enregistrés sur chaque lot pour permettre au logiciel de calculer automatiquement
            les appels de fonds, les soldes et la comptabilité.
          </p>
        </div>

        <div className={styles.infoCard}>
          <h3 className={styles.cardTitle}>2 — Pondération des votes en AG</h3>
          <p className={styles.cardText}>
            En Assemblée Générale, le poids du vote dépend des tantièmes (et pas du
            nombre de personnes).
          </p>
          <p className={styles.cardHighlight}>
            Le système calcule automatiquement les résultats selon la
            majorité applicable (24, 25, 25-1, 26, unanimité).
          </p>
        </div>
      </div>
    </div>
  );
}

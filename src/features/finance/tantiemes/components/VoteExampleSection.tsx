'use client';

import styles from '@/app/(dashboard)/finance/tantiemes/tantiemes.module.css';

export function VoteExampleSection() {
  return (
    <div className={styles.exampleSection}>
      <h2 className={styles.sectionTitle}>Exemple concret de vote en AG</h2>
      <div className={styles.exampleCard}>
        <p className={styles.exampleText}>
          Une résolution demande la <strong>majorité de l'article 25</strong> (majorité absolue).
        </p>

        <div className={styles.voteExample}>
          <div className={styles.voteItem}>
            <span className={styles.voteName}>Copropriétaire A :</span>
            <span className={styles.voteChoice}>
              <span className={styles.votePour}>POUR</span> (400 tantièmes)
            </span>
          </div>
          <div className={styles.voteItem}>
            <span className={styles.voteName}>Copropriétaire B :</span>
            <span className={styles.voteChoice}>
              <span className={styles.voteContre}>CONTRE</span> (350 tantièmes)
            </span>
          </div>
          <div className={styles.voteItem}>
            <span className={styles.voteName}>Copropriétaire C :</span>
            <span className={styles.voteChoice}>
              <span className={styles.votePour}>POUR</span> (250 tantièmes)
            </span>
          </div>
        </div>

        <div className={styles.calculation}>
          <h4>Calcul automatique :</h4>
          <p>POUR = 400 + 250 = <strong>650 tantièmes</strong></p>
          <p>CONTRE = <strong>350 tantièmes</strong></p>
        </div>

        <div className={styles.result}>
          <h4>Résultat :</h4>
          <p className={styles.resultText}>
            650 / 1000 = <strong className={styles.adopted}>Résolution adoptée</strong>
          </p>
          <p className={styles.resultDetail}>
            (car 50% + 1 copropriétaire = majorité atteinte)
          </p>
        </div>
      </div>
    </div>
  );
}

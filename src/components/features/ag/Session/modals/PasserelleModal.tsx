'use client';

import { AlertCircle } from 'lucide-react';
import { Resolution, PasserelleVoteInitial } from '../types';
import styles from '../Session.module.css';

interface PasserelleModalProps {
  resolution: Resolution;
  voteInitial: PasserelleVoteInitial;
  onClose: () => void;
  onSecondVote: () => void;
  onAjournement: () => void;
}

export function PasserelleModal({
  resolution,
  voteInitial,
  onClose,
  onSecondVote,
  onAjournement
}: PasserelleModalProps) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.passerelleAlert}>
          <AlertCircle size={32} color="var(--warning)" aria-hidden="true" />
          <h2 className={styles.modalTitle}>Passerelle Article 25-1 applicable</h2>
        </div>

        <div className={styles.modalResolutionInfo}>
          <h3>{resolution.titre}</h3>
        </div>

        <div className={styles.passerelleExplanation}>
          <p>
            Cette résolution n'a pas obtenu la majorité de l'article 25 requise
            (50% + 1 des tantièmes) mais a dépassé le seuil de 1/3 des tantièmes.
          </p>
          <p>
            Conformément à l'article 25-1 de la loi du 10 juillet 1965, vous pouvez :
          </p>
          <ul>
            <li>Procéder immédiatement à un second vote à la majorité de l'article 24
              (majorité simple des voix exprimées)</li>
            <li>Ou ajourner cette résolution à une nouvelle AG dans les 3 mois</li>
          </ul>
        </div>

        <div className={styles.modalStats}>
          <div className={styles.modalStatItem}>
            <span>Tantièmes POUR :</span>
            <strong>{voteInitial.stats.pour}</strong>
          </div>
          <div className={styles.modalStatItem}>
            <span>Seuil Article 25 :</span>
            <strong>{Math.floor(voteInitial.result.passerelle251Data!.totalTantiemes / 2) + 1}</strong>
          </div>
          <div className={styles.modalStatItem}>
            <span>Seuil 1/3 :</span>
            <strong>{voteInitial.result.passerelle251Data!.seuilUntiers}</strong>
          </div>
          <div className={styles.modalStatItem}>
            <span>Total tantièmes :</span>
            <strong>{voteInitial.result.passerelle251Data!.totalTantiemes}</strong>
          </div>
        </div>

        <div className={styles.modalActions}>
          <button onClick={onAjournement} className="btn btn-secondary">
            Ajourner à nouvelle AG
          </button>
          <button onClick={onSecondVote} className="btn btn-primary">
            Procéder au second vote (Art. 24)
          </button>
        </div>
      </div>
    </div>
  );
}

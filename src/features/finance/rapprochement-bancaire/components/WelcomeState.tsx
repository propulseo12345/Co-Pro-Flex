'use client';

import { ArrowLeftRight, FileUp } from 'lucide-react';
import styles from '../../../../app/(dashboard)/finance/rapprochement-bancaire/rapprochement-bancaire.module.css';

interface WelcomeStateProps {
  onStart: () => void;
}

export function WelcomeState({ onStart }: WelcomeStateProps) {
  return (
    <div className={styles.welcomeState}>
      <div className={styles.welcomeIcon}>
        <ArrowLeftRight size={64} />
      </div>
      <h2>Commencer un rapprochement bancaire</h2>
      <p>
        Importez votre relevé bancaire pour comparer automatiquement les mouvements
        avec ceux enregistrés dans CoProFlex.
      </p>
      <div className={styles.welcomeSteps}>
        <div className={styles.welcomeStep}>
          <span className={styles.stepNumber}>1</span>
          <span>Sélectionnez le mois à rapprocher</span>
        </div>
        <div className={styles.welcomeStep}>
          <span className={styles.stepNumber}>2</span>
          <span>Importez le relevé bancaire (CSV)</span>
        </div>
        <div className={styles.welcomeStep}>
          <span className={styles.stepNumber}>3</span>
          <span>Vérifiez et validez les écarts</span>
        </div>
        <div className={styles.welcomeStep}>
          <span className={styles.stepNumber}>4</span>
          <span>Certifiez le rapprochement</span>
        </div>
      </div>
      <button className={styles.primaryButton} onClick={onStart}>
        <FileUp size={18} />
        Démarrer le rapprochement
      </button>
    </div>
  );
}

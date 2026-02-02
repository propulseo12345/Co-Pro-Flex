'use client';

import { Zap } from 'lucide-react';
import styles from '@/app/(dashboard)/finance/calls/calls.module.css';

interface CallsAutomationCardProps {
  onOpenAutomationModal: () => void;
  onOpenRulesModal: () => void;
  onOpenPaymentInfoModal: () => void;
}

export function CallsAutomationCard({
  onOpenAutomationModal,
  onOpenRulesModal,
  onOpenPaymentInfoModal,
}: CallsAutomationCardProps) {
  return (
    <div className={styles.automationCard}>
      <div className={styles.automationIcon}><Zap size={24} aria-hidden="true" /></div>
      <div className={styles.automationContent}>
        <h3>Gagnez du temps et gardez l'esprit léger</h3>
        <p>CoProFlex génère et envoie automatiquement vos appels de fonds en temps et en heure !</p>
        <div className={styles.automationLinks}>
          <button
            className={styles.linkBtn}
            onClick={onOpenAutomationModal}
          >
            Découvrir l'automatisation des appels de fonds
          </button>
          <span className={styles.separator}>|</span>
          <button
            className={styles.linkBtn}
            onClick={onOpenRulesModal}
          >
            Modifier les règles d'automatisation
          </button>
          <span className={styles.separator}>|</span>
          <button
            className={styles.linkBtn}
            onClick={onOpenPaymentInfoModal}
          >
            Modifier les informations de paiement
          </button>
        </div>
      </div>
    </div>
  );
}

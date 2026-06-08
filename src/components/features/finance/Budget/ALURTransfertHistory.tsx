'use client';

import { ArrowRightLeft } from 'lucide-react';
import { FondsALUR } from './types';
import styles from './ALURTransfertHistory.module.css';

interface ALURTransfertHistoryProps {
  fondsALUR: FondsALUR;
  onOpenTransferModal: () => void;
}

export function ALURTransfertHistory({ fondsALUR, onOpenTransferModal }: ALURTransfertHistoryProps) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Transfert de fonds</h3>
        <button className={styles.btnPrimary} onClick={onOpenTransferModal}>
          <ArrowRightLeft size={14} /> Nouveau transfert
        </button>
      </div>
      <p className={styles.info}>
        Le fonds ALUR est affecté à un budget travaux voté (écriture 105 → 705). Le virement de trésorerie
        (Livret A → compte courant) est régularisé séparément une fois l&apos;affectation décidée.
      </p>

      <div className={styles.historySection}>
        <h4 className={styles.historyTitle}>Historique des affectations</h4>
        {fondsALUR.historiqueTransferts.length > 0 ? (
          <div className={styles.list}>
            {fondsALUR.historiqueTransferts.map((transfert) => (
              <div key={transfert.id} className={styles.row}>
                <span className={styles.rowDate}>
                  {transfert.date ? new Date(transfert.date).toLocaleDateString('fr-FR') : '—'}
                </span>
                <span className={styles.rowDesc}>{transfert.description || 'Affectation au budget travaux'}</span>
                <span className={styles.rowAmount}>-{transfert.montant.toLocaleString('fr-FR')} €</span>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>Aucun transfert effectué</div>
        )}
      </div>
    </div>
  );
}

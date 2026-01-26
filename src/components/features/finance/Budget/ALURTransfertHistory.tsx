'use client';

import { ArrowRightLeft } from 'lucide-react';
import { FondsALUR } from './types';
import styles from './Budget.module.css';

interface ALURTransfertHistoryProps {
  fondsALUR: FondsALUR;
  onOpenTransferModal: () => void;
}

export function ALURTransfertHistory({
  fondsALUR,
  onOpenTransferModal,
}: ALURTransfertHistoryProps) {
  return (
    <>
      <div className="card">
        <div className={styles.alurTransferHeader}>
          <h3 className={styles.sectionTitle}>Transfert de fonds</h3>
          <button onClick={onOpenTransferModal} className="btn btn-primary">
            <ArrowRightLeft size={16} />
            Nouveau transfert
          </button>
        </div>
        <p className={styles.alurInfo}>
          Les fonds ALUR peuvent être transférés vers le compte courant pour financer des travaux
          votés en AG ou directement vers un budget travaux spécifique.
        </p>
      </div>

      <div className="card">
        <h3 className={styles.sectionTitle}>Historique des transferts</h3>
        {fondsALUR.historiqueTransferts.length > 0 ? (
          <div className={styles.transfertsList}>
            {fondsALUR.historiqueTransferts.map((transfert) => (
              <div key={transfert.id} className={styles.transfertItem}>
                <div className={styles.transfertDate}>
                  {new Date(transfert.date).toLocaleDateString('fr-FR')}
                </div>
                <div className={styles.transfertDescription}>{transfert.description}</div>
                <div className={styles.transfertMontant}>-{transfert.montant.toLocaleString()} €</div>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.noTransferts}>Aucun transfert effectué</p>
        )}
      </div>
    </>
  );
}

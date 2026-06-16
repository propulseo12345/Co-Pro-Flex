'use client';

import styles from '@/app/(dashboard)/ventes-impayes/ventes/[id]/detail-vente.module.css';

interface BuyerInfo {
  buyer_first_name: string;
  buyer_last_name: string;
  buyer_email: string;
  buyer_is_company: boolean;
}

interface ValidationModalProps {
  buyerInfo: BuyerInfo;
  onBuyerInfoChange: (info: BuyerInfo) => void;
  onConfirm: () => void;
  onClose: () => void;
  isProcessing: boolean;
  showBuyerForm: boolean;
  /** Solde réel du vendeur (45x). >0 = débiteur, <0 = créditeur, null = inconnu. Avertit, ne bloque pas. */
  sellerBalance?: number | null;
}

const fmtEuro = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

export function ValidationModal({
  buyerInfo,
  onBuyerInfoChange,
  onConfirm,
  onClose,
  isProcessing,
  showBuyerForm,
  sellerBalance,
}: ValidationModalProps) {
  const balance = typeof sellerBalance === 'number' ? sellerBalance : 0;
  const hasBalance = Math.abs(balance) >= 0.005;
  const isDebtor = balance > 0;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3>Valider la mutation</h3>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
          Cette action va transférer la propriété du lot à l&apos;acquéreur.
        </p>

        {hasBalance && (
          <div className={isDebtor ? styles.balanceWarning : styles.balanceInfo}>
            {isDebtor
              ? `Attention : le vendeur a un solde débiteur de ${fmtEuro(balance)} (il doit cette somme à la copropriété). Assurez-vous que ce montant sera réglé — retenue par le notaire, reprise par l'acquéreur… — avant ou lors de la signature. La validation reste possible.`
              : `Note : la copropriété doit ${fmtEuro(Math.abs(balance))} au vendeur (avances / trop-perçu). Pensez au remboursement ou au transfert à l'acquéreur. La validation reste possible.`}
          </div>
        )}

        {showBuyerForm && (
          <>
            <div className={styles.modalField}>
              <label htmlFor="buyerFirstName">Prénom de l&apos;acquéreur</label>
              <input
                id="buyerFirstName"
                type="text"
                value={buyerInfo.buyer_first_name}
                onChange={(e) =>
                  onBuyerInfoChange({
                    ...buyerInfo,
                    buyer_first_name: e.target.value,
                  })
                }
              />
            </div>
            <div className={styles.modalField}>
              <label htmlFor="buyerLastName">Nom de l&apos;acquéreur</label>
              <input
                id="buyerLastName"
                type="text"
                value={buyerInfo.buyer_last_name}
                onChange={(e) =>
                  onBuyerInfoChange({
                    ...buyerInfo,
                    buyer_last_name: e.target.value,
                  })
                }
              />
            </div>
            <div className={styles.modalField}>
              <label htmlFor="buyerEmail">Email</label>
              <input
                id="buyerEmail"
                type="email"
                value={buyerInfo.buyer_email}
                onChange={(e) =>
                  onBuyerInfoChange({
                    ...buyerInfo,
                    buyer_email: e.target.value,
                  })
                }
              />
            </div>
          </>
        )}

        <div className={styles.modalActions}>
          <button className="btn btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button
            className="btn btn-primary"
            onClick={onConfirm}
            disabled={isProcessing}
          >
            Valider le transfert
          </button>
        </div>
      </div>
    </div>
  );
}

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
}

export function ValidationModal({
  buyerInfo,
  onBuyerInfoChange,
  onConfirm,
  onClose,
  isProcessing,
  showBuyerForm,
}: ValidationModalProps) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3>Valider la mutation</h3>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
          Cette action va transférer la propriété du lot à l&apos;acquéreur.
        </p>

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

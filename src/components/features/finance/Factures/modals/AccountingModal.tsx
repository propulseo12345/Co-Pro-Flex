'use client';

import { useState, useEffect } from 'react';
import { X, CheckCircle, Edit2 } from 'lucide-react';
import { Facture, TypeDepense } from '../types';
import { formatCurrency } from '../utils';
import { TYPE_DEPENSE_LABELS, COMPTES_CHARGE } from '../data';
import styles from '../Factures.module.css';

interface AccountingModalProps {
  facture: Facture;
  selectedTypeDepense: TypeDepense;
  onTypeDepenseChange: (type: TypeDepense) => void;
  onClose: () => void;
  onSend: (compteCharge?: string) => void;
}

// Liste complète des comptes de charge disponibles (plan comptable général)
const ALL_COMPTES_CHARGE = [
  { code: '602001', label: '602001 - Eau' },
  { code: '602002', label: '602002 - Électricité' },
  { code: '605', label: '605 - Travaux' },
  { code: '606', label: '606 - Électricité' },
  { code: '606', label: '606 - Eau' },
  { code: '614', label: '614 - Charges de personnel extérieur' },
  { code: '614001', label: '614001 - Ménage' },
  { code: '614003', label: '614003 - Espaces verts' },
  { code: '615', label: '615 - Entretien et réparations' },
  { code: '615001', label: '615001 - Ascenseur' },
  { code: '616', label: '616 - Primes d\'assurance' },
  { code: '618', label: '618 - Divers' },
  { code: '621', label: '621 - Personnel extérieur à l\'entreprise' },
  { code: '622', label: '622 - Autres services extérieurs' },
  { code: '623', label: '623 - Publicité, publications, relations publiques' },
  { code: '624', label: '624 - Transports de biens et transports collectifs du personnel' },
  { code: '625', label: '625 - Déplacements, missions et réceptions' },
  { code: '626', label: '626 - Services bancaires et assimilés' },
  { code: '627', label: '627 - Services et conseils informatiques' },
  { code: '628', label: '628 - Autres services extérieurs' },
];

// Créer une liste unique basée sur les labels pour éviter les doublons
const UNIQUE_COMPTES_CHARGE = Array.from(
  new Map(ALL_COMPTES_CHARGE.map(item => [item.label, item])).values()
).sort((a, b) => a.label.localeCompare(b.label));

export function AccountingModal({
  facture,
  selectedTypeDepense,
  onTypeDepenseChange,
  onClose,
  onSend
}: AccountingModalProps) {
  const [useManualAccount, setUseManualAccount] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string>(
    COMPTES_CHARGE[selectedTypeDepense]
  );

  // Synchroniser le compte sélectionné avec le compte automatique quand le type change
  useEffect(() => {
    if (!useManualAccount) {
      setSelectedAccount(COMPTES_CHARGE[selectedTypeDepense]);
    }
  }, [selectedTypeDepense, useManualAccount]);

  // Mettre à jour le compte automatique quand le type de dépense change
  const handleTypeDepenseChange = (type: TypeDepense) => {
    onTypeDepenseChange(type);
  };

  const handleToggleManual = () => {
    if (!useManualAccount) {
      // Passer en mode manuel : initialiser avec le compte automatique actuel
      setSelectedAccount(COMPTES_CHARGE[selectedTypeDepense]);
    }
    setUseManualAccount(!useManualAccount);
  };

  const currentAccount = useManualAccount ? selectedAccount : COMPTES_CHARGE[selectedTypeDepense];

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="accounting-modal-title"
      >
        <div className={styles.modalHeader}>
          <h2 id="accounting-modal-title" className={styles.modalTitle}>Catégorisation comptable</h2>
          <button className={styles.modalClose} onClick={onClose} aria-label="Fermer">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.modalBody}>
          <p className={styles.accountingInfo}>
            Affectez un poste budgétaire et un compte de charge avant de valider le paiement.
          </p>

          <div className={styles.formGroup}>
            <label htmlFor="type-depense-select">Type de dépense</label>
            <select
              id="type-depense-select"
              value={selectedTypeDepense}
              onChange={(e) => handleTypeDepenseChange(e.target.value as TypeDepense)}
            >
              {Object.entries(TYPE_DEPENSE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.accountInfo}>
            <div className={styles.accountHeader}>
              <p className={styles.accountLabel}>
                {useManualAccount ? 'Compte de charge sélectionné' : 'Compte de charge automatique'}
              </p>
              <button
                type="button"
                onClick={handleToggleManual}
                className={styles.accountToggleButton}
              >
                <Edit2 size={12} aria-hidden="true" />
                {useManualAccount ? 'Utiliser automatique' : 'Choisir manuellement'}
              </button>
            </div>
            
            {useManualAccount ? (
              <select
                id="compte-charge-select"
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className={styles.accountSelect}
              >
                {UNIQUE_COMPTES_CHARGE.map((compte) => (
                  <option key={compte.code + compte.label} value={compte.label}>
                    {compte.label}
                  </option>
                ))}
              </select>
            ) : (
              <>
                <p className={styles.accountNumber}>{COMPTES_CHARGE[selectedTypeDepense]}</p>
                <p className={styles.aiDetection}>
                  <CheckCircle size={14} aria-hidden="true" />
                  Compte détecté automatiquement selon le fournisseur
                </p>
              </>
            )}
          </div>

          <div className={styles.invoiceSummary}>
            <div className={styles.summaryRow}>
              <span>Fournisseur</span>
              <span>{facture.fournisseur}</span>
            </div>
            <div className={styles.summaryRow}>
              <span>Référence</span>
              <span>{facture.reference}</span>
            </div>
            <div className={styles.summaryRow}>
              <span>Montant</span>
              <span className={styles.summaryAmount}>{formatCurrency(facture.montant)}</span>
            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={onClose}>
            Annuler
          </button>
          <button className={styles.sendButton} onClick={() => onSend(currentAccount)}>
            <CheckCircle size={20} aria-hidden="true" />
            Valider et passer à « À payer »
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import {
  X, FileText, ExternalLink, Download, Wallet, Building2,
  CheckCircle, CreditCard, Info, Mail, Phone, MapPin
} from 'lucide-react';
import { Facture } from '../types';
import { formatCurrency, formatDate, detectFournisseurId } from '../utils';
import { MOCK_FOURNISSEURS, MOCK_COMPTES } from '../data';
import styles from '../Factures.module.css';

interface PaymentModalProps {
  facture: Facture;
  onClose: () => void;
  onPaymentComplete: (compteId: string, fournisseurId: string) => void;
}

export function PaymentModal({ facture, onClose, onPaymentComplete }: PaymentModalProps) {
  const [selectedFournisseur, setSelectedFournisseur] = useState<string>(detectFournisseurId(facture) || '');
  const [selectedCompte, setSelectedCompte] = useState<string>('compte-courant');
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleShowConfirmation = () => {
    if (!selectedFournisseur || !selectedCompte) return;
    setShowConfirmation(true);
  };

  const handlePayment = async () => {
    if (!selectedFournisseur || !selectedCompte) return;

    setPaymentProcessing(true);

    setTimeout(() => {
      setPaymentProcessing(false);
      setPaymentSuccess(true);

      setTimeout(() => {
        onPaymentComplete(selectedCompte, selectedFournisseur);
      }, 2000);
    }, 3000);
  };

  const fournisseur = MOCK_FOURNISSEURS.find(f => f.id === selectedFournisseur);

  if (paymentSuccess) {
    return (
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={`${styles.modalContent} ${styles.modalContentLarge}`} onClick={(e) => e.stopPropagation()}>
          <div className={styles.successContent}>
            <div className={styles.successIcon}>
              <CheckCircle size={64} aria-hidden="true" />
            </div>
            <h3 className={styles.successTitle}>Paiement effectué avec succès !</h3>
            <p className={styles.successText}>
              La facture a été payée depuis le compte {MOCK_COMPTES.find(c => c.id === selectedCompte)?.nom}.
              <br />
              La facture est maintenant entièrement traitée.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.modalOverlay} onClick={() => !paymentProcessing && onClose()}>
      <div
        className={`${styles.modalContent} ${styles.modalContentLarge}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-modal-title"
      >
        <div className={styles.modalHeader}>
          <h2 id="payment-modal-title" className={styles.modalTitle}>Paiement de la facture</h2>
          <button
            className={styles.modalClose}
            onClick={() => {
              onClose();
              setShowConfirmation(false);
            }}
            disabled={paymentProcessing}
            aria-label="Fermer"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.modalBody}>
          {facture.fichier && (
            <div className={styles.pdfViewerSection}>
              <div className={styles.pdfViewerHeader}>
                <div className={styles.pdfViewerTitle}>
                  <FileText size={20} aria-hidden="true" />
                  <span>Aperçu de la facture</span>
                </div>
                <div className={styles.pdfViewerActions}>
                  <button
                    className={styles.actionButton}
                    onClick={() => window.open(facture.fichier, '_blank')}
                    title="Ouvrir dans un nouvel onglet"
                    aria-label="Ouvrir dans un nouvel onglet"
                  >
                    <ExternalLink size={16} aria-hidden="true" />
                  </button>
                  <button className={styles.actionButton} title="Télécharger" aria-label="Télécharger">
                    <Download size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>
              <iframe src={facture.fichier} className={styles.pdfFrame} title="Aperçu facture" />
            </div>
          )}

          {!facture.fichier && (
            <div className={styles.invoicePreview}>
              <FileText size={48} aria-hidden="true" />
              <div>
                <p className={styles.invoiceRef}>{facture.reference}</p>
                <p className={styles.invoiceDate}>{formatDate(facture.date)}</p>
              </div>
            </div>
          )}

          <div className={styles.paymentInfo}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Référence</span>
              <span className={styles.infoValue}>{facture.reference}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Date de la facture</span>
              <span className={styles.infoValue}>{formatDate(facture.date)}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Montant à payer</span>
              <span className={styles.infoValue}>{formatCurrency(facture.montant)}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Fournisseur</span>
              <span className={styles.infoValue}>{facture.fournisseur}</span>
            </div>
          </div>

          <div className={styles.compteDebitSection}>
            <div className={styles.compteDebitHeader}>
              <Wallet size={20} aria-hidden="true" />
              <h4>Compte à débiter</h4>
            </div>
            <div className={styles.comptesList}>
              {MOCK_COMPTES.map((compte) => (
                <div
                  key={compte.id}
                  className={`${styles.compteCard} ${selectedCompte === compte.id ? styles.compteCardSelected : ''}`}
                  onClick={() => !paymentProcessing && setSelectedCompte(compte.id)}
                >
                  <div className={styles.compteIcon}>
                    {compte.type === 'courant' ? <Wallet size={24} aria-hidden="true" /> : <Building2 size={24} aria-hidden="true" />}
                  </div>
                  <div className={styles.compteInfo}>
                    <div className={styles.compteNom}>{compte.nom}</div>
                    <div className={styles.compteSolde}>
                      Solde disponible: <span className={styles.compteSoldeValue}>{formatCurrency(compte.solde)}</span>
                    </div>
                  </div>
                  {selectedCompte === compte.id && <CheckCircle size={20} color="var(--primary)" aria-hidden="true" />}
                </div>
              ))}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="fournisseur-select">Bénéficiaire du virement</label>
            <select
              id="fournisseur-select"
              value={selectedFournisseur}
              onChange={(e) => setSelectedFournisseur(e.target.value)}
              disabled={paymentProcessing}
            >
              <option value="">Sélectionner un fournisseur...</option>
              {MOCK_FOURNISSEURS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nom} - {f.services.join(', ')}
                </option>
              ))}
            </select>
            {selectedFournisseur && (
              <p className={styles.aiDetection}>
                <CheckCircle size={14} aria-hidden="true" />
                Fournisseur détecté automatiquement par IA
              </p>
            )}
          </div>

          {fournisseur && (
            <div className={styles.supplierDetails}>
              <div className={styles.supplierHeader}>
                <Building2 size={20} aria-hidden="true" />
                <h3>Coordonnées bancaires du bénéficiaire</h3>
              </div>
              <div className={styles.bankDetails}>
                <div className={styles.bankRow}>
                  <span className={styles.bankLabel}>IBAN du bénéficiaire</span>
                  <span className={styles.bankIban}>{fournisseur.iban}</span>
                </div>
                <div className={styles.bankRow}>
                  <span className={styles.bankLabel}>BIC</span>
                  <span className={styles.bankBic}>{fournisseur.bic}</span>
                </div>
              </div>
              <div className={styles.supplierInfo}>
                <div className={styles.supplierInfoRow}>
                  <Mail size={16} aria-hidden="true" />
                  <div>
                    <span className={styles.supplierLabel}>Email</span>
                    <span className={styles.supplierValue}>{fournisseur.email}</span>
                  </div>
                </div>
                <div className={styles.supplierInfoRow}>
                  <Phone size={16} aria-hidden="true" />
                  <div>
                    <span className={styles.supplierLabel}>Téléphone</span>
                    <span className={styles.supplierValue}>{fournisseur.telephone}</span>
                  </div>
                </div>
                <div className={styles.supplierInfoRow}>
                  <MapPin size={16} aria-hidden="true" />
                  <div>
                    <span className={styles.supplierLabel}>Adresse</span>
                    <span className={styles.supplierValue}>{fournisseur.adresse}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showConfirmation && selectedFournisseur && selectedCompte && (
            <div className={styles.confirmSection}>
              <div className={styles.confirmTitle}>
                <Info size={20} aria-hidden="true" />
                <span>Confirmation du paiement</span>
              </div>
              <div className={styles.confirmDetails}>
                <div className={styles.confirmRow}>
                  <span className={styles.confirmLabel}>Compte débité</span>
                  <span className={styles.confirmValue}>
                    {MOCK_COMPTES.find(c => c.id === selectedCompte)?.nom}
                  </span>
                </div>
                <div className={styles.confirmRow}>
                  <span className={styles.confirmLabel}>Bénéficiaire</span>
                  <span className={styles.confirmValue}>
                    {MOCK_FOURNISSEURS.find(f => f.id === selectedFournisseur)?.nom}
                  </span>
                </div>
                <div className={styles.confirmRow}>
                  <span className={styles.confirmLabel}>Montant</span>
                  <span className={`${styles.confirmValue} ${styles.confirmAmount}`}>
                    -{formatCurrency(facture.montant)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button
            className={styles.cancelButton}
            onClick={() => {
              if (showConfirmation) {
                setShowConfirmation(false);
              } else {
                onClose();
              }
            }}
            disabled={paymentProcessing}
          >
            {showConfirmation ? 'Retour' : 'Annuler'}
          </button>
          {!showConfirmation ? (
            <button
              className={styles.payButton}
              onClick={handleShowConfirmation}
              disabled={!selectedFournisseur || !selectedCompte || paymentProcessing}
            >
              <CreditCard size={20} aria-hidden="true" />
              Vérifier et confirmer
            </button>
          ) : (
            <button
              className={styles.payButton}
              onClick={handlePayment}
              disabled={paymentProcessing}
            >
              {paymentProcessing ? (
                <>
                  <div className={styles.spinner} />
                  Paiement en cours...
                </>
              ) : (
                <>
                  <CheckCircle size={20} aria-hidden="true" />
                  Confirmer le paiement
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

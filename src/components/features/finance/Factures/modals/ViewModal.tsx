'use client';

import Link from 'next/link';
import { X, FileText, ExternalLink, Download, FileEdit, ClipboardCheck, CheckCircle2, Clock, CheckCircle, FolderOpen, Link2 } from 'lucide-react';
import { Facture, StatutFacture } from '../types';
import { getStatutBadgeClass, getStatutLabel, formatCurrency, formatDate } from '../utils';
import { MOCK_COMPTES, TYPE_DEPENSE_LABELS } from '../data';
import { getEntityDocuments } from '@/lib/services/document-linking.service';
import styles from '../Factures.module.css';

interface ViewModalProps {
  facture: Facture;
  onClose: () => void;
}

function getStatutIcon(statut: StatutFacture) {
  switch (statut) {
    case 'BROUILLON':
      return <FileEdit size={14} aria-hidden="true" />;
    case 'A_VALIDER':
      return <ClipboardCheck size={14} aria-hidden="true" />;
    case 'VALIDEE':
      return <CheckCircle2 size={14} aria-hidden="true" />;
    case 'A_PAYER':
      return <Clock size={14} aria-hidden="true" />;
    case 'PAYEE':
      return <CheckCircle size={14} aria-hidden="true" />;
  }
}

export function ViewModal({ facture, onClose }: ViewModalProps) {
  const badgeClassName = getStatutBadgeClass(facture.statut);

  // Récupérer les documents GED liés à cette facture
  const linkedDocuments = getEntityDocuments('FACTURE', facture.id);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={`${styles.modalContent} ${styles.modalContentLarge}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="view-modal-title"
      >
        <div className={styles.modalHeader}>
          <h2 id="view-modal-title" className={styles.modalTitle}>Détails de la facture</h2>
          <button className={styles.modalClose} onClick={onClose} aria-label="Fermer">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.modalBody}>
          {facture.fichier && (
            <div className={styles.pdfViewerSection}>
              <div className={styles.pdfViewerHeader}>
                <div className={styles.pdfViewerTitle}>
                  <FileText size={20} aria-hidden="true" />
                  <span>Document de la facture</span>
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

          <div className={styles.detailGrid}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Référence</span>
              <span className={styles.detailValue}>{facture.reference}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Date</span>
              <span className={styles.detailValue}>{formatDate(facture.date)}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Fournisseur</span>
              <span className={styles.detailValue}>{facture.fournisseur}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Montant</span>
              <span className={styles.detailValue}>{formatCurrency(facture.montant)}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Statut</span>
              <span className={styles.detailValue}>
                <span className={`${styles.statutBadge} ${styles[badgeClassName]}`}>
                  {getStatutIcon(facture.statut)}
                  {getStatutLabel(facture.statut)}
                </span>
              </span>
            </div>
            {facture.datePaiement && (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Date de paiement</span>
                <span className={styles.detailValue}>{formatDate(facture.datePaiement)}</span>
              </div>
            )}
            {facture.compteDebite && (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Compte débité</span>
                <span className={styles.detailValue}>
                  {MOCK_COMPTES.find(c => c.id === facture.compteDebite)?.nom || facture.compteDebite}
                </span>
              </div>
            )}
            {facture.typeDepense && (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Type de dépense</span>
                <span className={styles.detailValue}>{TYPE_DEPENSE_LABELS[facture.typeDepense]}</span>
              </div>
            )}
          </div>

          {/* Documents GED liés */}
          {linkedDocuments.length > 0 && (
            <div className={styles.linkedDocsSection}>
              <div className={styles.linkedDocsHeader}>
                <FolderOpen size={18} aria-hidden="true" />
                <h3>Documents liés (GED)</h3>
              </div>
              <div className={styles.linkedDocsList}>
                {linkedDocuments.map((link) => (
                  <div key={link.documentId} className={styles.linkedDocItem}>
                    <FileText size={16} aria-hidden="true" />
                    <span className={styles.linkedDocName}>Document #{link.documentId.slice(0, 8)}</span>
                    <Link
                      href={`/documents/ged?doc=${link.documentId}`}
                      className={styles.linkedDocLink}
                    >
                      Voir dans la GED
                      <ExternalLink size={12} aria-hidden="true" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Message si aucun document lié */}
          {linkedDocuments.length === 0 && (
            <div className={styles.noLinkedDocs}>
              <Link2 size={16} aria-hidden="true" />
              <span>Aucun document GED lié à cette facture</span>
              <Link href="/documents/ged" className={styles.linkToGed}>
                Aller à la GED
              </Link>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

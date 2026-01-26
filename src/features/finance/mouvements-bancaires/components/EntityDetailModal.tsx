'use client';

import {
  X,
  CreditCard,
  Link as LinkIcon,
  Receipt,
  FileText,
  User,
  Building2,
  ExternalLink,
  Home,
  Mail,
  Phone,
} from 'lucide-react';
import type { MouvementBancaire, EntiteLiee } from '../domain/types';
import styles from '../../../../app/(dashboard)/finance/mouvements-bancaires/mouvements-bancaires.module.css';

interface SelectedEntiteData {
  mouvement: MouvementBancaire;
  entite: EntiteLiee;
}

interface EntityDetailModalProps {
  isOpen: boolean;
  selectedEntite: SelectedEntiteData | null;
  onClose: () => void;
  onNavigate: (entite: EntiteLiee) => void;
}

export function EntityDetailModal({
  isOpen,
  selectedEntite,
  onClose,
  onNavigate,
}: EntityDetailModalProps) {
  if (!isOpen || !selectedEntite) return null;

  return (
    <div className={styles.modalOverlay} aria-hidden="true" onClick={onClose}>
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {selectedEntite.entite.type === 'facture' && 'Facture liée'}
            {selectedEntite.entite.type === 'appel_fonds' && 'Appel de fonds lié'}
            {selectedEntite.entite.type === 'coproprietaire' && 'Copropriétaire'}
            {selectedEntite.entite.type === 'fournisseur' && 'Fournisseur'}
          </h2>
          <button
            className={styles.closeModalButton}
            onClick={onClose}
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Infos du mouvement bancaire */}
          <div className={styles.entitySection}>
            <h3 className={styles.entitySectionTitle}>
              <CreditCard size={18} />
              Mouvement bancaire
            </h3>
            <div className={styles.entityDetails}>
              <div className={styles.entityRow}>
                <span className={styles.entityLabel}>Date</span>
                <span className={styles.entityValue}>
                  {new Date(selectedEntite.mouvement.date).toLocaleDateString('fr-FR')}
                </span>
              </div>
              <div className={styles.entityRow}>
                <span className={styles.entityLabel}>Libellé</span>
                <span className={styles.entityValue}>{selectedEntite.mouvement.libelle}</span>
              </div>
              <div className={styles.entityRow}>
                <span className={styles.entityLabel}>Montant</span>
                <span className={`${styles.entityValue} ${selectedEntite.mouvement.type === 'ENTREE' ? styles.montantEntree : styles.montantSortie}`}>
                  {selectedEntite.mouvement.type === 'ENTREE' ? '+' : ''}
                  {selectedEntite.mouvement.montant.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </span>
              </div>
            </div>
          </div>

          {/* Lien visuel entre mouvement et entité */}
          <div className={styles.entityLinkIndicator}>
            <div className={styles.entityLinkLine}></div>
            <div className={styles.entityLinkIcon}>
              <LinkIcon size={16} />
            </div>
            <div className={styles.entityLinkLine}></div>
          </div>

          {/* Détails de l'entité liée */}
          <div className={styles.entitySection}>
            <h3 className={styles.entitySectionTitle}>
              {selectedEntite.entite.type === 'facture' && <Receipt size={18} />}
              {selectedEntite.entite.type === 'appel_fonds' && <FileText size={18} />}
              {selectedEntite.entite.type === 'coproprietaire' && <User size={18} />}
              {selectedEntite.entite.type === 'fournisseur' && <Building2 size={18} />}
              {selectedEntite.entite.type === 'facture' && 'Détails de la facture'}
              {selectedEntite.entite.type === 'appel_fonds' && 'Détails de l\'appel de fonds'}
              {selectedEntite.entite.type === 'coproprietaire' && 'Informations copropriétaire'}
              {selectedEntite.entite.type === 'fournisseur' && 'Informations fournisseur'}
            </h3>

            <div className={styles.entityDetails}>
              {/* Informations communes */}
              <div className={styles.entityRow}>
                <span className={styles.entityLabel}>
                  {selectedEntite.entite.type === 'facture' ? 'Fournisseur' :
                   selectedEntite.entite.type === 'appel_fonds' ? 'Copropriétaire' : 'Nom'}
                </span>
                <span className={styles.entityValue}>{selectedEntite.entite.nom}</span>
              </div>

              {selectedEntite.entite.reference && (
                <div className={styles.entityRow}>
                  <span className={styles.entityLabel}>Référence</span>
                  <span className={styles.entityValueCode}>{selectedEntite.entite.reference}</span>
                </div>
              )}

              {selectedEntite.entite.montant && (
                <div className={styles.entityRow}>
                  <span className={styles.entityLabel}>Montant</span>
                  <span className={styles.entityValue}>
                    {selectedEntite.entite.montant.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </span>
                </div>
              )}

              {/* Détails spécifiques - Facture */}
              {selectedEntite.entite.type === 'facture' && selectedEntite.entite.details && (
                <>
                  {selectedEntite.entite.details.dateEcheance && (
                    <div className={styles.entityRow}>
                      <span className={styles.entityLabel}>Date d&apos;échéance</span>
                      <span className={styles.entityValue}>
                        {new Date(selectedEntite.entite.details.dateEcheance).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  )}
                  {selectedEntite.entite.details.statut && (
                    <div className={styles.entityRow}>
                      <span className={styles.entityLabel}>Statut</span>
                      <span className={`${styles.entityBadge} ${selectedEntite.entite.details.statut === 'PAYEE' ? styles.entityBadgeSuccess : styles.entityBadgeWarning}`}>
                        {selectedEntite.entite.details.statut === 'PAYEE' ? 'Payée' :
                         selectedEntite.entite.details.statut === 'A_PAYER' ? 'À payer' :
                         selectedEntite.entite.details.statut}
                      </span>
                    </div>
                  )}
                </>
              )}

              {/* Détails spécifiques - Appel de fonds */}
              {selectedEntite.entite.type === 'appel_fonds' && selectedEntite.entite.details && (
                <>
                  {selectedEntite.entite.details.periode && (
                    <div className={styles.entityRow}>
                      <span className={styles.entityLabel}>Période</span>
                      <span className={styles.entityValue}>{selectedEntite.entite.details.periode}</span>
                    </div>
                  )}
                  {selectedEntite.entite.details.lot && (
                    <div className={styles.entityRow}>
                      <span className={styles.entityLabel}>
                        <Home size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        Lot
                      </span>
                      <span className={styles.entityValue}>{selectedEntite.entite.details.lot}</span>
                    </div>
                  )}
                  {selectedEntite.entite.details.tantiemes && (
                    <div className={styles.entityRow}>
                      <span className={styles.entityLabel}>Tantièmes</span>
                      <span className={styles.entityValue}>{selectedEntite.entite.details.tantiemes} / 1000</span>
                    </div>
                  )}
                  {selectedEntite.entite.details.email && (
                    <div className={styles.entityRow}>
                      <span className={styles.entityLabel}>
                        <Mail size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        Email
                      </span>
                      <a href={`mailto:${selectedEntite.entite.details.email}`} className={styles.entityLink}>
                        {selectedEntite.entite.details.email}
                      </a>
                    </div>
                  )}
                  {selectedEntite.entite.details.telephone && (
                    <div className={styles.entityRow}>
                      <span className={styles.entityLabel}>
                        <Phone size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        Téléphone
                      </span>
                      <a href={`tel:${selectedEntite.entite.details.telephone}`} className={styles.entityLink}>
                        {selectedEntite.entite.details.telephone}
                      </a>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={onClose}>
            Fermer
          </button>
          <button
            className={styles.navigateButton}
            onClick={() => onNavigate(selectedEntite.entite)}
          >
            <ExternalLink size={18} />
            {selectedEntite.entite.type === 'facture' && 'Voir la facture'}
            {selectedEntite.entite.type === 'appel_fonds' && "Voir l'appel de fonds"}
            {selectedEntite.entite.type === 'coproprietaire' && 'Voir le copropriétaire'}
            {selectedEntite.entite.type === 'fournisseur' && 'Voir le fournisseur'}
          </button>
        </div>
      </div>
    </div>
  );
}

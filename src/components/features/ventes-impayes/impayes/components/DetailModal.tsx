'use client';

import { X, User, Mail, Phone, MapPin, Euro, History, FileText, Eye, Send } from 'lucide-react';
import clsx from 'clsx';
import type { Impaye, HistoriqueItem } from '../domain/types';
import { STATUT_CONFIG, HISTORIQUE_ICONS } from '../domain/constants';
import { getNextStep } from '../domain/utils';
import styles from '../../../../../app/(dashboard)/ventes-impayes/impayes/impayes.module.css';

interface DetailModalProps {
  isOpen: boolean;
  impaye: Impaye | null;
  onClose: () => void;
  onOpenHistoriqueDetail: (item: HistoriqueItem, impaye: Impaye) => void;
  onOpenRelance: (impaye: Impaye) => void;
}

export function DetailModal({ isOpen, impaye, onClose, onOpenHistoriqueDetail, onOpenRelance }: DetailModalProps) {
  if (!isOpen || !impaye) return null;

  const nextStep = getNextStep(impaye.statut);

  return (
    <div className={styles.modalOverlay} aria-hidden="true" onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={styles.modalHeader}>
          <h2>Détails de l'impayé</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.modalContent}>
          <div className={styles.modalSection}>
            <h3>
              <User size={16} aria-hidden="true" />
              Copropriétaire
            </h3>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Nom</span>
                <span className={styles.infoValue}>{impaye.coproprietaire.nom}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Lot</span>
                <span className={styles.infoValue}>
                  {impaye.lot} - {impaye.batiment}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>
                  <Mail size={12} aria-hidden="true" /> Email
                </span>
                <span className={styles.infoValue}>{impaye.coproprietaire.email}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>
                  <Phone size={12} aria-hidden="true" /> Téléphone
                </span>
                <span className={styles.infoValue}>{impaye.coproprietaire.telephone}</span>
              </div>
              <div className={styles.infoItem} style={{ gridColumn: '1 / -1' }}>
                <span className={styles.infoLabel}>
                  <MapPin size={12} aria-hidden="true" /> Adresse
                </span>
                <span className={styles.infoValue}>{impaye.coproprietaire.adresse}</span>
              </div>
            </div>
          </div>

          <div className={styles.modalSection}>
            <h3>
              <Euro size={16} aria-hidden="true" />
              Détails de l'impayé
            </h3>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Montant restant dû</span>
                <span className={clsx(styles.infoValue, styles.montantValue)}>
                  {impaye.montant.toLocaleString('fr-FR')} €
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Montant initial</span>
                <span className={styles.infoValue}>{impaye.montantInitial.toLocaleString('fr-FR')} €</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Période</span>
                <span className={styles.infoValue}>{impaye.periode}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Type</span>
                <span className={styles.infoValue} style={{ textTransform: 'capitalize' }}>
                  {impaye.type}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Date d'échéance</span>
                <span className={styles.infoValue}>{new Date(impaye.dateEcheance).toLocaleDateString('fr-FR')}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Statut actuel</span>
                <span
                  className={styles.statutBadgeSmall}
                  style={{ background: STATUT_CONFIG[impaye.statut].bg, color: STATUT_CONFIG[impaye.statut].color }}
                >
                  {STATUT_CONFIG[impaye.statut].label}
                </span>
              </div>
            </div>
          </div>

          <div className={styles.modalSection}>
            <h3>
              <History size={16} aria-hidden="true" />
              Historique complet
              <span className={styles.historiqueHint}>Cliquez sur une action pour voir les détails</span>
            </h3>
            <div className={styles.timeline}>
              {impaye.historique.map((item, index) => {
                const Icon = HISTORIQUE_ICONS[item.type] || FileText;
                const hasContent = !!item.contenu;
                return (
                  <div
                    key={item.id}
                    className={clsx(styles.timelineItem, hasContent && styles.timelineItemClickable)}
                    onClick={() => hasContent && onOpenHistoriqueDetail(item, impaye)}
                    role={hasContent ? 'button' : undefined}
                    tabIndex={hasContent ? 0 : undefined}
                    onKeyDown={(e) => hasContent && e.key === 'Enter' && onOpenHistoriqueDetail(item, impaye)}
                  >
                    <div className={styles.timelineIcon}>
                      <Icon size={14} aria-hidden="true" />
                    </div>
                    <div className={styles.timelineContent}>
                      <div className={styles.timelineHeader}>
                        <span className={styles.timelineDate}>
                          {new Date(item.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </span>
                        {hasContent && (
                          <span className={styles.timelineViewDetail}>
                            <Eye size={12} aria-hidden="true" />
                            Voir détails
                          </span>
                        )}
                      </div>
                      <p className={styles.timelineDesc}>{item.description}</p>
                      {item.destinataire && <span className={styles.timelineMeta}>Destinataire : {item.destinataire}</span>}
                      {item.montant && <span className={styles.timelineMontant}>{item.montant.toLocaleString('fr-FR')} €</span>}
                    </div>
                    {index < impaye.historique.length - 1 && <div className={styles.timelineConnector} />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className="btn btn-secondary" onClick={onClose}>
            Fermer
          </button>
          {nextStep && (
            <button
              className="btn btn-primary"
              onClick={() => {
                onClose();
                onOpenRelance(impaye);
              }}
            >
              <Send size={16} aria-hidden="true" />
              Passer à l'étape suivante
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

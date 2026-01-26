'use client';

import {
  X,
  History,
  Flag,
  Building2,
  FileText,
  Vote,
  FileCheck,
  Hammer,
  CheckCircle,
  Receipt,
  DollarSign,
  Clock,
  AlertTriangle,
  Calendar,
  Users,
  Phone,
  Mail,
  Paperclip,
  Image,
  MapPin,
  ExternalLink,
  Download,
} from 'lucide-react';
import { BudgetTravaux, EvenementHistorique, EtapeTravaux, DocumentTravaux } from '../types';
import styles from '../Budget.module.css';

type DetailTab = 'historique' | 'etapes' | 'prestataires' | 'documents';

interface TravauxDetailModalProps {
  travaux: BudgetTravaux;
  activeTab: DetailTab;
  onTabChange: (tab: DetailTab) => void;
  onClose: () => void;
}

export function TravauxDetailModal({
  travaux,
  activeTab,
  onTabChange,
  onClose,
}: TravauxDetailModalProps) {
  const getEventIcon = (type: EvenementHistorique['type']) => {
    switch (type) {
      case 'VOTE_AG':
        return <Vote size={18} aria-hidden="true" />;
      case 'DEVIS_ACCEPTE':
        return <FileCheck size={18} aria-hidden="true" />;
      case 'DEBUT_TRAVAUX':
        return <Hammer size={18} aria-hidden="true" />;
      case 'ETAPE_TERMINEE':
        return <CheckCircle size={18} aria-hidden="true" />;
      case 'FACTURE_RECUE':
        return <Receipt size={18} aria-hidden="true" />;
      case 'PAIEMENT':
        return <DollarSign size={18} aria-hidden="true" />;
      case 'FIN_TRAVAUX':
        return <Flag size={18} aria-hidden="true" />;
      case 'PV_RECEPTION':
        return <FileText size={18} aria-hidden="true" />;
      default:
        return <Clock size={18} aria-hidden="true" />;
    }
  };

  const getEventColor = (type: EvenementHistorique['type']) => {
    switch (type) {
      case 'VOTE_AG':
        return 'var(--primary)';
      case 'DEVIS_ACCEPTE':
        return 'var(--info)';
      case 'DEBUT_TRAVAUX':
        return 'var(--warning)';
      case 'ETAPE_TERMINEE':
        return 'var(--success)';
      case 'FACTURE_RECUE':
        return '#F59E0B';
      case 'PAIEMENT':
        return 'var(--success)';
      case 'FIN_TRAVAUX':
        return 'var(--success)';
      case 'PV_RECEPTION':
        return 'var(--info)';
      default:
        return 'var(--text-secondary)';
    }
  };

  const getEtapeStatusBadge = (statut: EtapeTravaux['statut']) => {
    switch (statut) {
      case 'TERMINE':
        return (
          <span className={styles.etapeBadgeTermine}>
            <CheckCircle size={14} aria-hidden="true" /> Terminé
          </span>
        );
      case 'EN_COURS':
        return (
          <span className={styles.etapeBadgeEnCours}>
            <Clock size={14} aria-hidden="true" /> En cours
          </span>
        );
      case 'EN_RETARD':
        return (
          <span className={styles.etapeBadgeEnRetard}>
            <AlertTriangle size={14} aria-hidden="true" /> En retard
          </span>
        );
      default:
        return (
          <span className={styles.etapeBadgeAFaire}>
            <Calendar size={14} aria-hidden="true" /> À faire
          </span>
        );
    }
  };

  const getDocIcon = (type: DocumentTravaux['type']) => {
    switch (type) {
      case 'DEVIS':
        return <FileText size={20} aria-hidden="true" />;
      case 'FACTURE':
        return <Receipt size={20} aria-hidden="true" />;
      case 'CONTRAT':
        return <FileCheck size={20} aria-hidden="true" />;
      case 'PV_RECEPTION':
        return <FileText size={20} aria-hidden="true" />;
      case 'PHOTO':
        return <Image size={20} aria-hidden="true" />;
      case 'PLAN':
        return <MapPin size={20} aria-hidden="true" />;
      default:
        return <Paperclip size={20} aria-hidden="true" />;
    }
  };

  const getDocTypeLabel = (type: DocumentTravaux['type']) => {
    switch (type) {
      case 'DEVIS':
        return 'Devis';
      case 'FACTURE':
        return 'Facture';
      case 'CONTRAT':
        return 'Contrat';
      case 'PV_RECEPTION':
        return 'PV Réception';
      case 'PHOTO':
        return 'Photo';
      case 'PLAN':
        return 'Plan';
      default:
        return 'Autre';
    }
  };

  return (
    <div className={styles.modalOverlay} aria-hidden="true" onClick={onClose}>
      <div className={styles.modalContentXLarge} onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>{travaux.titre}</h2>
            <p className={styles.modalSubtitle}>{travaux.description}</p>
          </div>
          <button className={styles.modalClose} onClick={onClose} aria-label="Fermer"><X size={24} aria-hidden="true" /></button>
        </div>

        {/* Tabs */}
        <div className={styles.detailTabs}>
          <button
            className={`${styles.detailTab} ${activeTab === 'historique' ? styles.detailTabActive : ''}`}
            onClick={() => onTabChange('historique')}
          >
            <History size={16} aria-hidden="true" />
            Historique
          </button>
          <button
            className={`${styles.detailTab} ${activeTab === 'etapes' ? styles.detailTabActive : ''}`}
            onClick={() => onTabChange('etapes')}
          >
            <Flag size={16} aria-hidden="true" />
            Étapes ({travaux.etapes?.length || 0})
          </button>
          <button
            className={`${styles.detailTab} ${activeTab === 'prestataires' ? styles.detailTabActive : ''}`}
            onClick={() => onTabChange('prestataires')}
          >
            <Building2 size={16} aria-hidden="true" />
            Prestataires ({travaux.prestataires?.length || 0})
          </button>
          <button
            className={`${styles.detailTab} ${activeTab === 'documents' ? styles.detailTabActive : ''}`}
            onClick={() => onTabChange('documents')}
          >
            <FileText size={16} aria-hidden="true" />
            Documents ({travaux.documents?.length || 0})
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Tab Historique */}
          {activeTab === 'historique' && (
            <div className={styles.historiqueTimeline}>
              {travaux.historique
                ?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((event) => (
                  <div key={event.id} className={styles.timelineItem}>
                    <div
                      className={styles.timelineIcon}
                      style={{ backgroundColor: getEventColor(event.type), color: 'white' }}
                    >
                      {getEventIcon(event.type)}
                    </div>
                    <div className={styles.timelineContent}>
                      <div className={styles.timelineHeader}>
                        <span className={styles.timelineDate}>
                          {new Date(event.date).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </span>
                        {event.montant && (
                          <span className={styles.timelineMontant}>
                            {event.montant.toLocaleString('fr-FR')} €
                          </span>
                        )}
                      </div>
                      <h4 className={styles.timelineTitle}>{event.titre}</h4>
                      <p className={styles.timelineDescription}>{event.description}</p>
                      {event.documentId && (
                        <button
                          className={styles.timelineDocLink}
                          onClick={() => {
                            const doc = travaux.documents?.find((d) => d.id === event.documentId);
                            if (doc) window.open(doc.url, '_blank');
                          }}
                        >
                          <Paperclip size={14} aria-hidden="true" />
                          Voir le document
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Tab Étapes */}
          {activeTab === 'etapes' && (
            <div className={styles.etapesContainer}>
              {travaux.etapes?.sort((a, b) => a.ordre - b.ordre).map((etape) => {
                const prestataire = travaux.prestataires?.find(
                  (p) => p.id === etape.prestataireId
                );

                return (
                  <div key={etape.id} className={styles.etapeCard}>
                    <div className={styles.etapeHeader}>
                      <div className={styles.etapeOrdre}>{etape.ordre}</div>
                      <div className={styles.etapeInfo}>
                        <h4 className={styles.etapeTitre}>{etape.titre}</h4>
                        <p className={styles.etapeDescription}>{etape.description}</p>
                      </div>
                      {getEtapeStatusBadge(etape.statut)}
                    </div>
                    <div className={styles.etapeDetails}>
                      <div className={styles.etapeDetail}>
                        <Calendar size={14} aria-hidden="true" />
                        <span>
                          Prévu: {new Date(etape.dateDebutPrevue).toLocaleDateString('fr-FR')} -{' '}
                          {new Date(etape.dateFinPrevue).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      {etape.dateDebutReelle && (
                        <div className={styles.etapeDetail}>
                          <CheckCircle size={14} aria-hidden="true" />
                          <span>
                            Réel: {new Date(etape.dateDebutReelle).toLocaleDateString('fr-FR')}{' '}
                            {etape.dateFinReelle
                              ? `- ${new Date(etape.dateFinReelle).toLocaleDateString('fr-FR')}`
                              : '- En cours'}
                          </span>
                        </div>
                      )}
                      {prestataire && (
                        <div className={styles.etapeDetail}>
                          <Building2 size={14} aria-hidden="true" />
                          <span>{prestataire.nom}</span>
                        </div>
                      )}
                      <div className={styles.etapeDetail}>
                        <DollarSign size={14} aria-hidden="true" />
                        <span>
                          Budget: {etape.montantPrevu.toLocaleString('fr-FR')} €
                          {etape.montantReel !== undefined && (
                            <span
                              style={{
                                color:
                                  etape.montantReel <= etape.montantPrevu
                                    ? 'var(--success)'
                                    : 'var(--danger)',
                              }}
                            >
                              {' '}
                              (Réel: {etape.montantReel.toLocaleString('fr-FR')} €)
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab Prestataires */}
          {activeTab === 'prestataires' && (
            <div className={styles.prestatairesContainer}>
              {travaux.prestataires?.map((prestataire) => (
                <div key={prestataire.id} className={styles.prestataireCard}>
                  <div className={styles.prestataireHeader}>
                    <div className={styles.prestataireIcon}>
                      <Building2 size={24} aria-hidden="true" />
                    </div>
                    <div>
                      <h4 className={styles.prestataireNom}>{prestataire.nom}</h4>
                      <span className={styles.prestataireMetier}>{prestataire.metier}</span>
                    </div>
                  </div>
                  <div className={styles.prestataireDetails}>
                    <div className={styles.prestataireRow}>
                      <Users size={14} aria-hidden="true" />
                      <span>Contact: {prestataire.contact}</span>
                    </div>
                    <div className={styles.prestataireRow}>
                      <Phone size={14} aria-hidden="true" />
                      <span>{prestataire.telephone}</span>
                    </div>
                    <div className={styles.prestataireRow}>
                      <Mail size={14} aria-hidden="true" />
                      <a href={`mailto:${prestataire.email}`}>{prestataire.email}</a>
                    </div>
                    <div className={styles.prestataireRow}>
                      <FileText size={14} aria-hidden="true" />
                      <span>SIRET: {prestataire.siret}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab Documents */}
          {activeTab === 'documents' && (
            <div className={styles.documentsContainer}>
              {travaux.documents
                ?.sort((a, b) => new Date(b.dateAjout).getTime() - new Date(a.dateAjout).getTime())
                .map((doc) => (
                  <div key={doc.id} className={styles.documentCard}>
                    <div className={styles.documentIcon}>{getDocIcon(doc.type)}</div>
                    <div className={styles.documentInfo}>
                      <h4 className={styles.documentNom}>{doc.nom}</h4>
                      <div className={styles.documentMeta}>
                        <span className={styles.documentType}>{getDocTypeLabel(doc.type)}</span>
                        <span className={styles.documentDate}>
                          {new Date(doc.dateAjout).toLocaleDateString('fr-FR')}
                        </span>
                        {doc.taille && (
                          <span className={styles.documentTaille}>{doc.taille}</span>
                        )}
                      </div>
                    </div>
                    <div className={styles.documentActions}>
                      <button
                        className={styles.documentButton}
                        onClick={() => window.open(doc.url, '_blank')}
                        title="Ouvrir"
                      >
                        <ExternalLink size={16} aria-hidden="true" />
                      </button>
                      <button className={styles.documentButton} title="Télécharger" aria-label="Télécharger"><Download size={16} aria-hidden="true" /></button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button className="btn btn-secondary" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

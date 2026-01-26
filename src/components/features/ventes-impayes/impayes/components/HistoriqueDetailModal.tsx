'use client';

import { X, Mail, Phone, Calendar, Eye, Download } from 'lucide-react';
import type { Impaye, HistoriqueItem } from '../domain/types';
import styles from '../../../../../app/(dashboard)/ventes-impayes/impayes/impayes.module.css';

interface HistoriqueDetailModalProps {
  isOpen: boolean;
  item: HistoriqueItem | null;
  impaye: Impaye | null;
  onClose: () => void;
  onPreviewPDF: (type: string) => void;
  onDownloadPDF: (type: string) => void;
}

export function HistoriqueDetailModal({ isOpen, item, impaye, onClose, onPreviewPDF, onDownloadPDF }: HistoriqueDetailModalProps) {
  if (!isOpen || !item || !impaye) return null;

  const getTitle = () => {
    switch (item.contenu?.type) {
      case 'email': return "Détail de l'email envoyé";
      case 'courrier': return 'Détail du courrier envoyé';
      case 'telephone': return "Détail de l'appel téléphonique";
      case 'note': return 'Note';
      default: return "Détail de l'action";
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={styles.modalHeader}>
          <h2>{getTitle()}</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.modalContent}>
          {item.contenu?.type === 'email' && item.contenu.email && (
            <div className={styles.emailDetail}>
              <div className={styles.emailHeader}>
                <div className={styles.emailMeta}>
                  <span className={styles.emailLabel}>De :</span>
                  <span>Copro Manager &lt;syndic@copromanager.fr&gt;</span>
                </div>
                <div className={styles.emailMeta}>
                  <span className={styles.emailLabel}>À :</span>
                  <span>{item.contenu.email.destinataire}</span>
                </div>
                <div className={styles.emailMeta}>
                  <span className={styles.emailLabel}>Date :</span>
                  <span>{new Date(item.contenu.email.dateEnvoi).toLocaleString('fr-FR')}</span>
                </div>
                <div className={styles.emailMeta}>
                  <span className={styles.emailLabel}>Objet :</span>
                  <span className={styles.emailObjet}>{item.contenu.email.objet}</span>
                </div>
              </div>
              <div className={styles.emailBody}>
                <pre className={styles.emailContent}>{item.contenu.email.corps}</pre>
              </div>
            </div>
          )}

          {item.contenu?.type === 'courrier' && item.contenu.courrier && (
            <div className={styles.courrierDetail}>
              <div className={styles.courrierHeader}>
                <div className={styles.courrierMeta}>
                  <span className={styles.courrierLabel}>Destinataire :</span>
                  <span>{item.contenu.courrier.destinataire}</span>
                </div>
                <div className={styles.courrierMeta}>
                  <span className={styles.courrierLabel}>Adresse :</span>
                  <span>{item.contenu.courrier.adresse}</span>
                </div>
                <div className={styles.courrierMeta}>
                  <span className={styles.courrierLabel}>Date d'envoi :</span>
                  <span>{new Date(item.contenu.courrier.dateEnvoi).toLocaleDateString('fr-FR')}</span>
                </div>
                {item.contenu.courrier.recommande && (
                  <div className={styles.courrierMeta}>
                    <span className={styles.courrierBadge}>
                      <Mail size={12} aria-hidden="true" />
                      Courrier recommandé
                    </span>
                    {item.contenu.courrier.numeroSuivi && (
                      <span className={styles.courrierSuivi}>N° suivi : {item.contenu.courrier.numeroSuivi}</span>
                    )}
                  </div>
                )}
              </div>

              {item.contenu.pdfGenere && (
                <div className={styles.courrierActions}>
                  <button className="btn btn-primary" onClick={() => onPreviewPDF(item.type)}>
                    <Eye size={16} aria-hidden="true" />
                    Voir le courrier PDF
                  </button>
                  <button className="btn btn-secondary" onClick={() => onDownloadPDF(item.type)}>
                    <Download size={16} aria-hidden="true" />
                    Télécharger
                  </button>
                </div>
              )}
            </div>
          )}

          {item.contenu?.type === 'telephone' && item.contenu.telephone && (
            <div className={styles.telephoneDetail}>
              <div className={styles.telephoneHeader}>
                <div className={styles.telephoneMeta}>
                  <Phone size={16} aria-hidden="true" />
                  <span>Appel avec {item.contenu.telephone.interlocuteur}</span>
                </div>
                <div className={styles.telephoneMeta}>
                  <span className={styles.telephoneLabel}>Numéro :</span>
                  <span>{item.contenu.telephone.telephone}</span>
                </div>
                <div className={styles.telephoneMeta}>
                  <span className={styles.telephoneLabel}>Date :</span>
                  <span>{new Date(item.contenu.telephone.dateAppel).toLocaleString('fr-FR')}</span>
                </div>
                {item.contenu.telephone.duree && (
                  <div className={styles.telephoneMeta}>
                    <span className={styles.telephoneLabel}>Durée :</span>
                    <span>{item.contenu.telephone.duree}</span>
                  </div>
                )}
              </div>

              <div className={styles.telephoneBody}>
                <h4>Résumé de l'échange</h4>
                <p>{item.contenu.telephone.resumeEchange}</p>

                {item.contenu.telephone.engagementsPris && (
                  <>
                    <h4>Engagements pris</h4>
                    <p className={styles.engagements}>{item.contenu.telephone.engagementsPris}</p>
                  </>
                )}

                {item.contenu.telephone.prochainContact && (
                  <div className={styles.prochainContact}>
                    <Calendar size={14} aria-hidden="true" />
                    <span>Prochain contact prévu : {item.contenu.telephone.prochainContact}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {item.contenu?.type === 'note' && item.contenu.note && (
            <div className={styles.noteDetail}>
              <p>{item.contenu.note}</p>
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

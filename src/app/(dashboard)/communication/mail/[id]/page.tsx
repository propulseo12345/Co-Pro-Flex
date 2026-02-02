'use client';

import { use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Mail, Users, Calendar, Paperclip, Download,
  Reply, Trash2, FileText, AlertTriangle, RotateCcw, Clock
} from 'lucide-react';
import { ConfirmModal, Toast } from '@/components/features/communication/mail';
import {
  useMailDetailPage,
  getStatusIcon,
  getStatusLabel,
  getFileIcon,
} from '@/features/communication/mail-detail';
import { formatTailleFichier, joursRestantsCorbeille } from '@/types/models/mail';
import styles from './mail-detail.module.css';

export default function MailDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: mailId } = use(params);
  const page = useMailDetailPage(mailId);

  if (page.loading) {
    return (
      <div className="container">
        <div className={styles.notFound}><p>Chargement...</p></div>
      </div>
    );
  }

  if (!page.mail) {
    return (
      <div className="container">
        <div className={styles.notFound}>
          <Mail size={64} aria-hidden="true" />
          <h2>Mail non trouvé</h2>
          <p>Ce mail n'existe pas ou a été supprimé.</p>
          <Link href="/communication/mail" className="btn btn-primary">Retour à la boîte mail</Link>
        </div>
      </div>
    );
  }

  const { mail } = page;

  return (
    <div className="container">
      <div className={styles.header}>
        <button onClick={page.goBack} className={styles.backButton}>
          <ArrowLeft size={20} aria-hidden="true" /> Retour
        </button>
        <div className={styles.headerActions}>
          {page.isDeleted ? (
            <>
              <button className="btn btn-secondary" onClick={page.handleRestore}>
                <RotateCcw size={16} style={{ marginRight: 8 }} aria-hidden="true" />Restaurer
              </button>
              <button className="btn btn-danger" onClick={() => page.setShowPermanentDeleteModal(true)} title="Supprimer définitivement">
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </>
          ) : (
            <>
              {page.isDraft && (
                <Link href={`/communication/mail/nouveau?draft=${mail.id}`} className="btn btn-primary">
                  <FileText size={16} style={{ marginRight: 8 }} aria-hidden="true" />Modifier
                </Link>
              )}
              {page.isIncoming && (
                <Link href={`/communication/mail/nouveau?reply=${mail.id}`} className="btn btn-primary">
                  <Reply size={16} style={{ marginRight: 8 }} aria-hidden="true" />Répondre
                </Link>
              )}
              <button className="btn btn-danger" onClick={() => page.setShowDeleteModal(true)} title="Supprimer">
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </div>

      {page.isDeleted && mail.dateSuppression && (
        <div className={styles.trashBanner}>
          <Trash2 size={18} aria-hidden="true" />
          <span>Ce mail sera supprimé définitivement dans <strong>{joursRestantsCorbeille(mail.dateSuppression)} jours</strong></span>
        </div>
      )}

      <div className={styles.emailContainer}>
        <div className={styles.emailHeader}>
          <h1 className={styles.subject}>{mail.subject}</h1>
          {mail.template && (
            <span className={styles.templateBadge}>
              <FileText size={14} aria-hidden="true" />Modèle : {mail.template}
            </span>
          )}
        </div>

        <div className={styles.emailMeta}>
          <div className={styles.metaRow}>
            <div className={styles.metaItem}>
              <Users size={16} aria-hidden="true" />
              <div>
                <span className={styles.metaLabel}>{page.isIncoming && mail.sender ? 'De :' : 'À :'}</span>
                <span className={styles.metaValue}>
                  {page.isIncoming && mail.sender ? mail.sender.nom : mail.recipients.map(r => r.nom).join(', ')}
                </span>
              </div>
            </div>
          </div>
          <div className={styles.metaRow}>
            <div className={styles.metaItem}>
              <Calendar size={16} aria-hidden="true" />
              <div>
                <span className={styles.metaLabel}>Date :</span>
                <span className={styles.metaValue}>
                  {new Date(mail.dateEnvoi || mail.dateCreation).toLocaleDateString('fr-FR', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          </div>
          <div className={styles.statusRow}>
            <span className={`${styles.statusBadge} ${styles[mail.statut]}`}>
              {getStatusIcon(mail.statut)}{getStatusLabel(mail.statut)}
            </span>
            {mail.stats && (
              <div className={styles.statsRow}>
                <span className={styles.stat}>{getStatusIcon('sent')}{mail.stats.sent} envoyés</span>
                <span className={styles.stat}>{getStatusIcon('opened')}{mail.stats.opened} ouverts</span>
                <span className={styles.stat}>{getStatusIcon('received')}{mail.stats.received} confirmés</span>
              </div>
            )}
          </div>
        </div>

        <div className={styles.emailBody}>
          {mail.body.split('\n').map((line, i) => <p key={i}>{line || '\u00A0'}</p>)}
        </div>

        {mail.piecesJointes?.length > 0 && (
          <div className={styles.attachments}>
            <h3 className={styles.attachmentsTitle}>
              <Paperclip size={18} aria-hidden="true" />Pièces jointes ({mail.piecesJointes.length})
            </h3>
            <div className={styles.attachmentsList}>
              {mail.piecesJointes.map((pj) => (
                <div key={pj.id} className={styles.attachmentItem}>
                  <div className={styles.attachmentIcon}>{getFileIcon(pj.mimeType)}</div>
                  <div className={styles.attachmentInfo}>
                    <span className={styles.attachmentName}>{pj.nom}</span>
                    <span className={styles.attachmentMeta}>
                      {formatTailleFichier(pj.taille)}
                      {pj.dateAjout && (
                        <> <Clock size={12} aria-hidden="true" />{new Date(pj.dateAjout).toLocaleDateString('fr-FR')}</>
                      )}
                    </span>
                  </div>
                  <button className={styles.downloadButton} onClick={() => page.telechargerPJ(pj)} title={`Télécharger ${pj.nom}`}>
                    <Download size={18} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
            {mail.piecesJointes.length > 1 && (
              <button className={styles.downloadAllButton} onClick={() => page.telechargerToutesPJ(mail)}>
                <Download size={16} aria-hidden="true" />Télécharger toutes les pièces jointes
              </button>
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={page.showDeleteModal}
        onClose={() => page.setShowDeleteModal(false)}
        onConfirm={page.handleMoveToTrash}
        title="Déplacer vers la corbeille ?"
        message="Ce mail sera conservé 30 jours dans la corbeille avant d'être supprimé définitivement."
        confirmLabel="Mettre à la corbeille"
      />
      <ConfirmModal
        isOpen={page.showPermanentDeleteModal}
        onClose={() => page.setShowPermanentDeleteModal(false)}
        onConfirm={page.handlePermanentDelete}
        title="Supprimer définitivement ?"
        message={<><strong>Cette action est irréversible.</strong><br />Le mail et ses pièces jointes seront supprimés de façon permanente.</>}
        confirmLabel="Supprimer définitivement"
        icon={<AlertTriangle size={48} aria-hidden="true" />}
      />
      <Toast isVisible={page.showSuccessToast} message={page.toastMessage} />
    </div>
  );
}

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Mail, Users, Calendar, Paperclip, Download,
  Reply, Trash2, CheckCircle2, Eye, Send, FileText,
  AlertTriangle, X, RotateCcw, Image, Clock
} from 'lucide-react';
import styles from './mail-detail.module.css';
import { mailSupabaseService } from '@/lib/services/mail-supabase.service';
import { ConfirmModal, Toast } from '@/components/features/communication/mail';
import {
  Mail as MailType,
  PieceJointeMail,
  formatTailleFichier,
  joursRestantsCorbeille,
} from '@/types/models/mail';

export default function MailDetailPage() {
  const params = useParams();
  const router = useRouter();
  const mailId = params.id as string;

  const [mail, setMail] = useState<MailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPermanentDeleteModal, setShowPermanentDeleteModal] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Load mail from Supabase
  useEffect(() => {
    const loadMail = async () => {
      setLoading(true);
      try {
        const foundMail = await mailSupabaseService.getMailById(mailId);
        setMail(foundMail);
        if (foundMail?.statut === 'received' && !foundMail.isRead) {
          await mailSupabaseService.markAsRead(mailId);
        }
      } catch (err) {
        console.error('Error loading mail:', err);
      } finally {
        setLoading(false);
      }
    };
    loadMail();
  }, [mailId]);

  // Download attachment
  const telechargerPJ = useCallback((pj: PieceJointeMail) => {
    if (pj.url) {
      window.open(pj.url, '_blank');
    }
  }, []);

  // Download all attachments
  const telechargerToutesPJ = useCallback((mailData: MailType) => {
    mailData.piecesJointes?.forEach(pj => {
      if (pj.url) window.open(pj.url, '_blank');
    });
  }, []);

  if (loading) return <div className="container"><div className={styles.notFound}><p>Chargement...</p></div></div>;
  if (!mail) return (
    <div className="container">
      <div className={styles.notFound}>
        <Mail size={64} aria-hidden="true" />
        <h2>Mail non trouvé</h2>
        <p>Ce mail n'existe pas ou a été supprimé.</p>
        <Link href="/communication/mail" className="btn btn-primary">Retour à la boîte mail</Link>
      </div>
    </div>
  );

  const isIncoming = mail.statut === 'received';
  const isDeleted = mail.statut === 'deleted';
  const isDraft = mail.statut === 'draft';

  const handleMoveToTrash = async () => {
    try {
      await mailSupabaseService.moveToTrash(mailId);
      setShowDeleteModal(false);
      setToastMessage('Mail déplacé vers la corbeille');
      setShowSuccessToast(true);
      setTimeout(() => router.push('/communication/mail'), 1500);
    } catch (err) {
      console.error('Error moving to trash:', err);
    }
  };

  const handleRestore = async () => {
    try {
      await mailSupabaseService.restore(mailId);
      setToastMessage('Mail restauré avec succès');
      setShowSuccessToast(true);
      setTimeout(() => router.push('/communication/mail'), 1500);
    } catch (err) {
      console.error('Error restoring:', err);
    }
  };

  const handlePermanentDelete = async () => {
    try {
      await mailSupabaseService.permanentDelete(mailId);
      setShowPermanentDeleteModal(false);
      setToastMessage('Mail supprimé définitivement');
      setShowSuccessToast(true);
      setTimeout(() => router.push('/communication/mail?tab=trash'), 1500);
    } catch (err) {
      console.error('Error permanently deleting:', err);
    }
  };

  const getStatusIcon = (s: string) => {
    const icons: Record<string, React.ReactNode> = {
      sent: <Send size={14} aria-hidden="true" />,
      opened: <Eye size={14} aria-hidden="true" />,
      received: <CheckCircle2 size={14} aria-hidden="true" />,
      draft: <FileText size={14} aria-hidden="true" />,
      deleted: <Trash2 size={14} aria-hidden="true" />
    };
    return icons[s] || <Mail size={14} aria-hidden="true" />;
  };

  const getStatusLabel = (s: string) => ({ sent: 'Envoyé', opened: 'Lu par les destinataires', received: 'Reçu', draft: 'Brouillon', deleted: 'Dans la corbeille' }[s] || 'Inconnu');
  const getFileIcon = (mimeType: string) => mimeType.startsWith('image/') ? <Image size={24} aria-hidden="true" /> : <FileText size={24} aria-hidden="true" />;

  return (
    <div className="container">
      <div className={styles.header}>
        <button onClick={() => router.back()} className={styles.backButton}>
          <ArrowLeft size={20} aria-hidden="true" /> Retour
        </button>
        <div className={styles.headerActions}>
          {isDeleted ? (
            <>
              <button className="btn btn-secondary" onClick={handleRestore}><RotateCcw size={16} style={{ marginRight: 8 }} aria-hidden="true" />Restaurer</button>
              <button className="btn btn-danger" onClick={() => setShowPermanentDeleteModal(true)} title="Supprimer définitivement"><Trash2 size={16} aria-hidden="true" /></button>
            </>
          ) : (
            <>
              {isDraft && <Link href={`/communication/mail/nouveau?draft=${mail.id}`} className="btn btn-primary"><FileText size={16} style={{ marginRight: 8 }} aria-hidden="true" />Modifier</Link>}
              {isIncoming && <Link href={`/communication/mail/nouveau?reply=${mail.id}`} className="btn btn-primary"><Reply size={16} style={{ marginRight: 8 }} aria-hidden="true" />Répondre</Link>}
              <button className="btn btn-danger" onClick={() => setShowDeleteModal(true)} title="Supprimer"><Trash2 size={16} aria-hidden="true" /></button>
            </>
          )}
        </div>
      </div>

      {isDeleted && mail.dateSuppression && (
        <div className={styles.trashBanner}><Trash2 size={18} aria-hidden="true" /><span>Ce mail sera supprimé définitivement dans <strong>{joursRestantsCorbeille(mail.dateSuppression)} jours</strong></span></div>
      )}

      <div className={styles.emailContainer}>
        <div className={styles.emailHeader}>
          <h1 className={styles.subject}>{mail.subject}</h1>
          {mail.template && <span className={styles.templateBadge}><FileText size={14} aria-hidden="true" />Modèle : {mail.template}</span>}
        </div>

        <div className={styles.emailMeta}>
          <div className={styles.metaRow}>
            <div className={styles.metaItem}>
              <Users size={16} aria-hidden="true" />
              <div>
                <span className={styles.metaLabel}>{isIncoming && mail.sender ? 'De :' : 'À :'}</span>
                <span className={styles.metaValue}>{isIncoming && mail.sender ? mail.sender.nom : mail.recipients.map(r => r.nom).join(', ')}</span>
              </div>
            </div>
          </div>
          <div className={styles.metaRow}>
            <div className={styles.metaItem}>
              <Calendar size={16} aria-hidden="true" />
              <div>
                <span className={styles.metaLabel}>Date :</span>
                <span className={styles.metaValue}>{new Date(mail.dateEnvoi || mail.dateCreation).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>
          <div className={styles.statusRow}>
            <span className={`${styles.statusBadge} ${styles[mail.statut]}`}>{getStatusIcon(mail.statut)}{getStatusLabel(mail.statut)}</span>
            {mail.stats && (
              <div className={styles.statsRow}>
                <span className={styles.stat}><Send size={14} aria-hidden="true" />{mail.stats.sent} envoyés</span>
                <span className={styles.stat}><Eye size={14} aria-hidden="true" />{mail.stats.opened} ouverts</span>
                <span className={styles.stat}><CheckCircle2 size={14} aria-hidden="true" />{mail.stats.received} confirmés</span>
              </div>
            )}
          </div>
        </div>

        <div className={styles.emailBody}>{mail.body.split('\n').map((line, i) => <p key={i}>{line || '\u00A0'}</p>)}</div>

        {mail.piecesJointes?.length > 0 && (
          <div className={styles.attachments}>
            <h3 className={styles.attachmentsTitle}><Paperclip size={18} aria-hidden="true" />Pièces jointes ({mail.piecesJointes.length})</h3>
            <div className={styles.attachmentsList}>
              {mail.piecesJointes.map((pj) => (
                <div key={pj.id} className={styles.attachmentItem}>
                  <div className={styles.attachmentIcon}>{getFileIcon(pj.mimeType)}</div>
                  <div className={styles.attachmentInfo}>
                    <span className={styles.attachmentName}>{pj.nom}</span>
                    <span className={styles.attachmentMeta}>{formatTailleFichier(pj.taille)}{pj.dateAjout && <> <Clock size={12} aria-hidden="true" />{new Date(pj.dateAjout).toLocaleDateString('fr-FR')}</>}</span>
                  </div>
                  <button className={styles.downloadButton} onClick={() => telechargerPJ(pj)} title={`Télécharger ${pj.nom}`}><Download size={18} aria-hidden="true" /></button>
                </div>
              ))}
            </div>
            {mail.piecesJointes.length > 1 && <button className={styles.downloadAllButton} onClick={() => telechargerToutesPJ(mail)}><Download size={16} aria-hidden="true" />Télécharger toutes les pièces jointes</button>}
          </div>
        )}
      </div>

      <ConfirmModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={handleMoveToTrash} title="Déplacer vers la corbeille ?" message="Ce mail sera conservé 30 jours dans la corbeille avant d'être supprimé définitivement." confirmLabel="Mettre à la corbeille" />
      <ConfirmModal isOpen={showPermanentDeleteModal} onClose={() => setShowPermanentDeleteModal(false)} onConfirm={handlePermanentDelete} title="Supprimer définitivement ?" message={<><strong>Cette action est irréversible.</strong><br />Le mail et ses pièces jointes seront supprimés de façon permanente.</>} confirmLabel="Supprimer définitivement" icon={<AlertTriangle size={48} aria-hidden="true" />} />
      <Toast isVisible={showSuccessToast} message={toastMessage} />
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Mail, Users, Calendar, Paperclip, Download,
  Reply, Trash2, CheckCircle2, Eye, Send, FileText,
  AlertTriangle, X, RotateCcw, Image, Clock
} from 'lucide-react';
import styles from './mail-detail.module.css';
import { useMail } from '@/hooks/modules/useMail';
import { ConfirmModal, Toast } from '@/components/features/communication/mail';
import {
  Mail as MailType,
  PieceJointeMail,
  formatTailleFichier,
  joursRestantsCorbeille,
} from '@/types/models/mail';
import { findMockEmailById, getAllMockEmails } from '@/data/mock/mail.mock';

function convertOldEmailToMail(oldEmail: any): MailType {
  const parseSize = (sizeStr: string): number => {
    if (!sizeStr) return 0;
    const match = sizeStr.match(/(\d+(?:\.\d+)?)\s*(KB|MB|Ko|Mo)/i);
    if (!match) return 0;
    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    if (unit.includes('MB') || unit.includes('MO')) return value * 1024 * 1024;
    if (unit.includes('KB') || unit.includes('KO')) return value * 1024;
    return value;
  };

  const getMimeType = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'application/pdf';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return 'image/jpeg';
    return 'application/octet-stream';
  };

  return {
    id: `mail-${oldEmail.id}`,
    coproprieteId: 'copro-1',
    subject: oldEmail.subject || '',
    body: oldEmail.body || oldEmail.preview || '',
    preview: oldEmail.preview || oldEmail.body?.substring(0, 100) || '',
    sender: oldEmail.sender ? { id: 'unknown', nom: oldEmail.sender, type: 'coproprietaire' as const }
      : { id: 'syndic-1', nom: 'Syndic', type: 'syndic' as const },
    recipients: oldEmail.recipients?.map((r: string) => ({ id: 'unknown', nom: r, type: 'groupe' as const })) || [],
    recipientType: oldEmail.recipientType || 'all',
    piecesJointes: oldEmail.attachments?.map((a: any, idx: number) => ({
      id: `pj-${oldEmail.id}-${idx}`,
      nom: a.name || 'fichier',
      taille: parseSize(a.size) || 0,
      mimeType: getMimeType(a.name || ''),
      url: '',
      dateAjout: oldEmail.date || new Date().toISOString()
    })) || [],
    statut: oldEmail.status as MailType['statut'],
    isRead: oldEmail.isRead !== false,
    hasAttachment: oldEmail.hasAttachment || false,
    dateCreation: oldEmail.date || new Date().toISOString(),
    template: oldEmail.template
  };
}

export default function MailDetailPage() {
  const params = useParams();
  const router = useRouter();
  const mailId = params.id as string;

  const { getMailById, supprimerMail, restaurerMail, supprimerDefinitivement, telechargerPJ, telechargerToutesPJ, marquerCommeLu } = useMail();

  const [mail, setMail] = useState<MailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPermanentDeleteModal, setShowPermanentDeleteModal] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    let foundMail = getMailById(mailId);
    if (!foundMail) {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('mail-copro-data') : null;
      if (stored) {
        try {
          const data = JSON.parse(stored);
          const allOldEmails = [...(data.sent || []), ...(data.inbox || []), ...(data.drafts || []), ...(data.archived || []), ...Object.values(data.emails || {})];
          const oldEmail = allOldEmails.find((e: any) => e.id === Number(mailId) || String(e.id) === mailId);
          if (oldEmail) foundMail = convertOldEmailToMail(oldEmail);
        } catch { /* ignore */ }
      }
      if (!foundMail) {
        const mockEmail = findMockEmailById(mailId);
        if (mockEmail) foundMail = convertOldEmailToMail(mockEmail);
      }
    }
    setMail(foundMail);
    setLoading(false);
    if (foundMail?.statut === 'received' && !foundMail.isRead) marquerCommeLu(foundMail.id);
  }, [mailId, getMailById, marquerCommeLu]);

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
    if (await supprimerMail(mailId)) {
      setShowDeleteModal(false);
      setToastMessage('Mail déplacé vers la corbeille');
      setShowSuccessToast(true);
      setTimeout(() => router.push('/communication/mail'), 1500);
    }
  };

  const handleRestore = async () => {
    if (await restaurerMail(mailId)) {
      setToastMessage('Mail restauré avec succès');
      setShowSuccessToast(true);
      setTimeout(() => router.push('/communication/mail'), 1500);
    }
  };

  const handlePermanentDelete = async () => {
    if (await supprimerDefinitivement(mailId)) {
      setShowPermanentDeleteModal(false);
      setToastMessage('Mail supprimé définitivement');
      setShowSuccessToast(true);
      setTimeout(() => router.push('/communication/mail?tab=trash'), 1500);
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

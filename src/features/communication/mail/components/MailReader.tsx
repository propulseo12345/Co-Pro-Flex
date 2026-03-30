'use client';

import {
  Reply, Forward, Archive, Trash2, Star, Download,
  FileText, Image, FileSpreadsheet, File, Mail,
} from 'lucide-react';
import type { IMail, IMailAttachment } from '@/features/communication/mail/domain/types';
import { getInitials, getAvatarColor } from '@/features/communication/shared/utils';
import styles from './MailReader.module.css';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

interface MailReaderProps {
  mail: IMail | null;
  onReply: (mail: IMail) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleStar: (id: string) => void;
}

function formatFullDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const ATTACHMENT_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  pdf: FileText,
  image: Image,
  spreadsheet: FileSpreadsheet,
  document: File,
};

function AttachmentIcon({ type, size = 16 }: { type: IMailAttachment['type']; size?: number }) {
  const Icon = ATTACHMENT_ICONS[type] ?? File;
  return <Icon size={size} />;
}

// ----------------------------------------------------------------------------
// Composant
// ----------------------------------------------------------------------------

export function MailReader({
  mail,
  onReply,
  onArchive,
  onDelete,
  onToggleStar,
}: MailReaderProps) {
  if (!mail) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <Mail size={48} className={styles.emptyIcon} />
          <div className={styles.emptyTitle}>Sélectionnez un message</div>
          <div className={styles.emptyText}>
            Choisissez un message dans la liste pour le lire ici.
          </div>
        </div>
      </div>
    );
  }

  const recipientsList = mail.to.map((r) => r.name || r.email).join(', ');
  const ccList = mail.cc?.map((r) => r.name || r.email).join(', ');

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <h2 className={styles.subject}>{mail.subject}</h2>
          <div className={styles.headerActions}>
            <button
              type="button"
              className={`${styles.actionButton} ${
                mail.isStarred ? styles.actionButtonStarActive : styles.actionButtonStar
              }`}
              onClick={() => onToggleStar(mail.id)}
              aria-label={mail.isStarred ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            >
              <Star size={16} fill={mail.isStarred ? '#f59e0b' : 'none'} />
            </button>
            <button
              type="button"
              className={styles.actionButton}
              onClick={() => onArchive(mail.id)}
              aria-label="Archiver"
            >
              <Archive size={16} />
            </button>
            <button
              type="button"
              className={`${styles.actionButton} ${styles.actionButtonDanger}`}
              onClick={() => onDelete(mail.id)}
              aria-label="Supprimer"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Sender */}
        <div className={styles.senderRow}>
          <div
            className={styles.senderAvatar}
            style={{ '--avatar-bg': getAvatarColor(mail.from.name) } as React.CSSProperties}
          >
            {getInitials(mail.from.name)}
          </div>
          <div className={styles.senderInfo}>
            <div className={styles.senderName}>{mail.from.name}</div>
            <div className={styles.senderEmail}>{mail.from.email}</div>
          </div>
          <div className={styles.senderDate}>
            {formatFullDate(mail.sentAt || mail.createdAt)}
          </div>
        </div>

        {/* Recipients */}
        <div className={styles.recipients}>
          <span>A: {recipientsList}</span>
          {ccList && <span> | CC: {ccList}</span>}
        </div>
      </div>

      {/* Body */}
      <div className={styles.body}>
        {mail.body.split('\n').map((paragraph, index) => (
          paragraph.trim() === ''
            ? <br key={index} />
            : <p key={index} className={styles.bodyParagraph}>{paragraph}</p>
        ))}
      </div>

      {/* Attachments */}
      {mail.hasAttachments && mail.attachments.length > 0 && (
        <div className={styles.attachments}>
          <div className={styles.attachmentsTitle}>
            {mail.attachments.length} pièce{mail.attachments.length > 1 ? 's' : ''} jointe{mail.attachments.length > 1 ? 's' : ''}
          </div>
          <div className={styles.attachmentsList}>
            {mail.attachments.map((att) => (
              <div key={att.id} className={styles.attachmentCard}>
                <span className={styles.attachmentIcon}>
                  <AttachmentIcon type={att.type} />
                </span>
                <div className={styles.attachmentInfo}>
                  <span className={styles.attachmentName}>{att.name}</span>
                  <span className={styles.attachmentSize}>{att.size}</span>
                </div>
                <button
                  type="button"
                  className={styles.attachmentDownload}
                  aria-label={`Télécharger ${att.name}`}
                >
                  <Download size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div className={styles.footer}>
        <button
          type="button"
          className={`${styles.replyButton} ${styles.replyButtonPrimary}`}
          onClick={() => onReply(mail)}
        >
          <Reply size={14} />
          Répondre
        </button>
        <button type="button" className={styles.replyButton}>
          <Forward size={14} />
          Transférer
        </button>
      </div>
    </div>
  );
}

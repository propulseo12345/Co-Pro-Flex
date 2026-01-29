'use client';

import Link from 'next/link';
import {
  Send,
  Eye,
  CheckCircle2,
  FileText,
  Mail,
  Paperclip,
  Users,
  Download,
} from 'lucide-react';
import clsx from 'clsx';
import type { LegacyEmailMessage } from '@/hooks/modules/useMailListPage';
import type { TabType } from './MailTabs';
import styles from './mail-components.module.css';

interface MailListItemProps {
  email: LegacyEmailMessage;
  isSelected: boolean;
  onToggleSelect: (id: number) => void;
  selectedTab: TabType;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'sent':
      return <Send size={14} aria-hidden="true" />;
    case 'opened':
      return <Eye size={14} aria-hidden="true" />;
    case 'received':
      return <CheckCircle2 size={14} aria-hidden="true" />;
    case 'draft':
      return <FileText size={14} aria-hidden="true" />;
    default:
      return <Mail size={14} aria-hidden="true" />;
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'sent':
      return 'Envoyé';
    case 'opened':
      return 'Ouvert';
    case 'received':
      return 'Reçu';
    case 'draft':
      return 'Brouillon';
    default:
      return 'Inconnu';
  }
};

export function MailListItem({
  email,
  isSelected,
  onToggleSelect,
  selectedTab,
}: MailListItemProps) {
  // Use originalId for navigation (Supabase UUID)
  const mailId = email.originalId || email.id;
  const linkHref =
    selectedTab === 'drafts'
      ? `/communication/mail/nouveau?draft=${mailId}`
      : `/communication/mail/${mailId}`;

  return (
    <div
      className={clsx(
        styles.emailItem,
        isSelected && styles.selected,
        email.isRead === false && styles.unread
      )}
    >
      <input
        type="checkbox"
        className={styles.checkbox}
        checked={isSelected}
        onChange={() => onToggleSelect(email.id)}
      />

      <Link href={linkHref} className={styles.emailContent}>
        <div className={styles.emailHeader}>
          <h3 className={styles.emailSubject}>
            {email.isRead === false && <span className={styles.unreadDot} />}
            {email.subject}
            {email.hasAttachment && (
              <Paperclip size={14} className={styles.attachmentIcon} aria-hidden="true" />
            )}
          </h3>
          <span className={styles.emailDate}>
            {new Date(email.date).toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        <div className={styles.emailMeta}>
          {selectedTab === 'inbox' && email.sender ? (
            <div className={styles.recipients}>
              <Users size={14} aria-hidden="true" />
              De : {email.sender}
            </div>
          ) : (
            <div className={styles.recipients}>
              <Users size={14} aria-hidden="true" />
              À : {email.recipients.join(', ')}
            </div>
          )}
          {email.template && (
            <span className={styles.templateBadge}>
              <FileText size={12} aria-hidden="true" />
              {email.template}
            </span>
          )}
        </div>

        <p className={styles.emailPreview}>{email.preview}</p>

        {selectedTab !== 'drafts' && (
          <div className={styles.emailFooter}>
            <span className={clsx(styles.statusBadge, styles[email.status])}>
              {getStatusIcon(email.status)}
              {getStatusLabel(email.status)}
            </span>
          </div>
        )}
      </Link>

      <div className={styles.emailActions}>
        {selectedTab === 'drafts' ? (
          <Link
            href={`/communication/mail/nouveau?draft=${email.id}`}
            className={styles.editBtn}
            title="Modifier"
          >
            <FileText size={16} aria-hidden="true" />
          </Link>
        ) : (
          <button
            className={styles.downloadBtn}
            title="Exporter en PDF"
            aria-label="Télécharger"
          >
            <Download size={16} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

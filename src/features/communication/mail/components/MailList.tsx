'use client';

import { Search, Paperclip, Star, Inbox } from 'lucide-react';
import type { IMail } from '@/features/communication/mail/domain/types';
import { getInitials, getAvatarColor, formatRelativeDate } from '@/features/communication/shared/utils';
import styles from './MailList.module.css';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

interface MailListProps {
  mails: IMail[];
  selectedMailId: string | null;
  searchTerm: string;
  onSelectMail: (id: string) => void;
  onSearchChange: (term: string) => void;
  onToggleStar: (id: string) => void;
}

// ----------------------------------------------------------------------------
// Composant
// ----------------------------------------------------------------------------

export function MailList({
  mails,
  selectedMailId,
  searchTerm,
  onSelectMail,
  onSearchChange,
  onToggleStar,
}: MailListProps) {
  return (
    <div className={styles.container}>
      {/* Barre de recherche */}
      <div className={styles.searchBar}>
        <div className={styles.searchWrapper}>
          <Search size={14} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Rechercher des messages..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      {/* Liste */}
      <div className={styles.list}>
        {mails.length === 0 ? (
          <div className={styles.emptyState}>
            <Inbox size={40} className={styles.emptyIcon} />
            <div className={styles.emptyTitle}>Aucun message</div>
            <div className={styles.emptyText}>
              {searchTerm
                ? 'Aucun résultat pour cette recherche.'
                : 'Ce dossier est vide.'}
            </div>
          </div>
        ) : (
          mails.map((mail) => {
            const isUnread = !mail.isRead;
            const isSelected = mail.id === selectedMailId;

            return (
              <div
                key={mail.id}
                className={`${styles.mailItem} ${isSelected ? styles.mailItemSelected : ''} ${
                  isUnread ? styles.mailItemUnread : ''
                }`}
                onClick={() => onSelectMail(mail.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectMail(mail.id);
                  }
                }}
              >
                {/* Avatar */}
                <div
                  className={styles.avatar}
                  style={{ '--avatar-bg': getAvatarColor(mail.from.name) } as React.CSSProperties}
                >
                  {getInitials(mail.from.name)}
                </div>

                {/* Contenu */}
                <div className={styles.mailContent}>
                  <div className={styles.mailHeader}>
                    <span
                      className={`${styles.mailFrom} ${isUnread ? styles.mailFromUnread : ''}`}
                    >
                      {mail.from.name}
                    </span>
                    <div className={styles.mailMeta}>
                      {mail.hasAttachments && (
                        <Paperclip size={12} className={styles.attachmentIcon} />
                      )}
                      <span className={styles.mailDate}>
                        {formatRelativeDate(mail.sentAt ?? mail.createdAt)}
                      </span>
                    </div>
                  </div>
                  <p
                    className={`${styles.mailSubject} ${isUnread ? styles.mailSubjectUnread : ''}`}
                  >
                    {mail.subject}
                  </p>
                  <p className={styles.mailPreview}>{mail.bodyPreview}</p>
                </div>

                {/* Star */}
                <button
                  type="button"
                  className={`${styles.starButton} ${
                    mail.isStarred ? styles.starButtonActive : ''
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleStar(mail.id);
                  }}
                  aria-label={mail.isStarred ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                >
                  <Star size={14} fill={mail.isStarred ? '#f59e0b' : 'none'} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

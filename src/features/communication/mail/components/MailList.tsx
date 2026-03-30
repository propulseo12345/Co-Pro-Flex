'use client';

import { Search, Paperclip, Star, Inbox } from 'lucide-react';
import type { IMail } from '@/features/communication/mail/domain/types';
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
// Helpers
// ----------------------------------------------------------------------------

/** Couleur d'avatar déterministe à partir du nom */
function getAvatarColor(name: string): string {
  const colors = [
    '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
    '#22c55e', '#06b6d4', '#ef4444', '#6366f1',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

/** Initiales depuis un nom */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/** Formatage de date relative */
function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) {
    return date.toLocaleDateString('fr-FR', { weekday: 'short' });
  }
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
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
            const isUnread = mail.status === 'unread';
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
                  style={{ backgroundColor: getAvatarColor(mail.from.name) }}
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
                        {formatRelativeDate(mail.sentAt || mail.createdAt)}
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

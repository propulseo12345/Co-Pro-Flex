'use client';

import { Search, MessageSquare } from 'lucide-react';
import clsx from 'clsx';

import type {
  IConversationPreview,
  ConversationFilter,
} from '@/features/communication/messagerie/domain/types';
import { ROLE_COLORS } from '@/features/communication/messagerie/domain/constants';
import { getInitials } from '@/features/communication/shared/utils';
import styles from './ConversationList.module.css';

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "A l'instant";
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}j`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

const TAG_LABELS: Record<IConversationPreview['type'], string> = {
  direct: 'Direct',
  group: 'Groupe',
  prestataire: 'Prestataire',
};

const TAG_STYLES: Record<IConversationPreview['type'], string> = {
  direct: styles.tagDirect,
  group: styles.tagGroup,
  prestataire: styles.tagPrestataire,
};

// Avatar color: use first role color based on conversation type
function getAvatarColor(type: IConversationPreview['type']): string {
  if (type === 'group') return ROLE_COLORS.conseil;
  if (type === 'prestataire') return ROLE_COLORS.prestataire;
  return ROLE_COLORS.copro;
}

// ----------------------------------------------------------------------------
// Filter config
// ----------------------------------------------------------------------------

interface FilterDef {
  value: ConversationFilter;
  label: string;
}

const FILTERS: FilterDef[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'unread', label: 'Non lues' },
  { value: 'archived', label: 'Archivees' },
  { value: 'direct', label: 'Direct' },
  { value: 'group', label: 'Groupes' },
  { value: 'prestataire', label: 'Prestas' },
];

// ----------------------------------------------------------------------------
// Props
// ----------------------------------------------------------------------------

interface ConversationListProps {
  conversations: IConversationPreview[];
  activeConversationId: string | null;
  searchTerm: string;
  filter: ConversationFilter;
  totalUnread: number;
  onSelectConversation: (id: string) => void;
  onSearchChange: (term: string) => void;
  onFilterChange: (filter: ConversationFilter) => void;
}

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------

export function ConversationList({
  conversations,
  activeConversationId,
  searchTerm,
  filter,
  totalUnread,
  onSelectConversation,
  onSearchChange,
  onFilterChange,
}: ConversationListProps) {
  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <h2 className={styles.title}>Messages</h2>
          {totalUnread > 0 && (
            <span className={styles.unreadBadge}>{totalUnread}</span>
          )}
        </div>

        {/* Search */}
        <div className={styles.searchWrapper}>
          <Search size={16} className={styles.searchIcon} aria-hidden="true" />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Rechercher une conversation..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Filter tabs */}
        <div className={styles.filterTabs}>
          {FILTERS.map((f) => (
            <button
              key={f.value}
              className={clsx(styles.filterTab, filter === f.value && styles.filterTabActive)}
              onClick={() => onFilterChange(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className={styles.list}>
        {conversations.length === 0 ? (
          <div className={styles.empty}>
            <MessageSquare size={32} className={styles.emptyIcon} aria-hidden="true" />
            <p className={styles.emptyText}>Aucune conversation</p>
          </div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={clsx(styles.item, conv.id === activeConversationId && styles.itemActive)}
              onClick={() => onSelectConversation(conv.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectConversation(conv.id);
                }
              }}
            >
              {/* Avatar */}
              <div
                className={styles.avatar}
                style={{ '--avatar-bg': getAvatarColor(conv.type) } as React.CSSProperties}
              >
                {getInitials(conv.title)}
              </div>

              {/* Content */}
              <div className={styles.content}>
                <div className={styles.topRow}>
                  <span className={styles.name}>{conv.title}</span>
                  <span className={clsx(styles.time, conv.unreadCount > 0 && styles.timeUnread)}>
                    {formatRelativeTime(conv.lastMessageAt)}
                  </span>
                </div>

                <p className={clsx(styles.preview, conv.unreadCount > 0 && styles.previewUnread)}>
                  {conv.lastSenderName ? `${conv.lastSenderName}: ` : ''}
                  {conv.lastMessage}
                </p>

                <div className={styles.bottomRow}>
                  <span className={clsx(styles.tag, TAG_STYLES[conv.type])}>
                    {TAG_LABELS[conv.type]}
                  </span>
                  {conv.unreadCount > 0 && (
                    <span className={styles.itemUnreadBadge}>{conv.unreadCount}</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

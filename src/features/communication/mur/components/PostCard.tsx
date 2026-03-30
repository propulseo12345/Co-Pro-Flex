'use client';

import { Heart, MessageCircle, Pin, Paperclip, Clock } from 'lucide-react';
import clsx from 'clsx';
import type { IWallPost } from '@/features/communication/mur/domain/types';
import { CATEGORY_CONFIG, ROLE_BADGE } from '@/features/communication/mur/domain/constants';
import { getInitials } from '@/features/communication/shared/utils';
import styles from './PostCard.module.css';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

interface PostCardProps {
  post: IWallPost;
  isSelected?: boolean;
  onSelect: (id: string) => void;
  onToggleLike: (id: string) => void;
  onTogglePin: (id: string) => void;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------

export function PostCard({ post, isSelected, onSelect, onToggleLike, onTogglePin }: PostCardProps) {
  const catConfig = CATEGORY_CONFIG[post.category];
  const roleBadge = ROLE_BADGE[post.authorRole];

  return (
    <div
      className={clsx(
        styles.card,
        post.isPinned && styles.pinned,
        isSelected && styles.selected
      )}
      onClick={() => onSelect(post.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(post.id);
        }
      }}
    >
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.authorInfo}>
          <div className={styles.avatar}>{getInitials(post.authorName)}</div>
          <div className={styles.authorMeta}>
            <div className={styles.authorName}>
              {post.authorName}
              <span
                className={styles.roleBadge}
                style={{
                  '--badge-bg': `${roleBadge.color}18`,
                  '--badge-color': roleBadge.color,
                } as React.CSSProperties}
              >
                {roleBadge.label}
              </span>
            </div>
            <div className={styles.metaRow}>
              <Clock size={12} />
              {formatDate(post.createdAt)}
              <span
                className={styles.categoryBadge}
                style={{
                  '--badge-bg': `${catConfig.color}18`,
                  '--badge-color': catConfig.color,
                } as React.CSSProperties}
              >
                {catConfig.label}
              </span>
            </div>
          </div>
        </div>
        <div className={styles.headerActions}>
          {post.isPinned && <Pin size={14} className={styles.pinIcon} />}
        </div>
      </div>

      {/* Content */}
      <h3 className={styles.title}>{post.title}</h3>
      <p className={styles.content}>{post.content}</p>

      {/* Attachments */}
      {post.attachments.length > 0 && (
        <div className={styles.attachments}>
          {post.attachments.map((att) => (
            <span key={att.id} className={styles.attachment}>
              <Paperclip size={12} />
              {att.name} ({att.size})
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className={styles.footer}>
        <button
          className={clsx(styles.interactionBtn, post.isLikedByMe && styles.liked)}
          onClick={(e) => {
            e.stopPropagation();
            onToggleLike(post.id);
          }}
        >
          <Heart size={14} />
          {post.likesCount}
        </button>
        <button
          className={styles.interactionBtn}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(post.id);
          }}
        >
          <MessageCircle size={14} />
          {post.commentsCount}
        </button>
        <button
          className={styles.interactionBtn}
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin(post.id);
          }}
          title={post.isPinned ? 'Désépingler' : 'Épingler'}
        >
          <Pin size={14} />
        </button>
      </div>
    </div>
  );
}

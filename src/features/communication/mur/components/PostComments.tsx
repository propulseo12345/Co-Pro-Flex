'use client';

import { useState, useCallback } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import clsx from 'clsx';
import type { IWallComment } from '@/features/communication/mur/domain/types';
import { ROLE_BADGE } from '@/features/communication/mur/domain/constants';
import styles from './PostComments.module.css';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

interface PostCommentsProps {
  comments: IWallComment[];
  postId: string;
  onAddComment: (postId: string, content: string) => void;
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------

export function PostComments({ comments, postId, onAddComment }: PostCommentsProps) {
  const [newComment, setNewComment] = useState('');

  const handleSubmit = useCallback(() => {
    if (!newComment.trim()) return;
    onAddComment(postId, newComment.trim());
    setNewComment('');
  }, [newComment, postId, onAddComment]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <div className={styles.comments}>
      <h4 className={styles.commentsHeader}>
        <MessageCircle size={16} />
        {comments.length} commentaire{comments.length !== 1 ? 's' : ''}
      </h4>

      {comments.length > 0 && (
        <div className={styles.commentsList}>
          {comments.map((comment) => {
            const roleBadge = ROLE_BADGE[comment.authorRole];
            return (
              <div
                key={comment.id}
                className={clsx(styles.comment, comment.parentId && styles.reply)}
              >
                <div className={styles.commentAvatar}>
                  {getInitials(comment.authorName)}
                </div>
                <div className={styles.commentBody}>
                  <div className={styles.commentMeta}>
                    <span className={styles.commentAuthor}>{comment.authorName}</span>
                    <span
                      className={styles.commentRole}
                      style={{
                        background: `${roleBadge.color}18`,
                        color: roleBadge.color,
                      }}
                    >
                      {roleBadge.label}
                    </span>
                    <span className={styles.commentDate}>{formatDate(comment.createdAt)}</span>
                  </div>
                  <p className={styles.commentText}>{comment.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New comment form */}
      <div className={styles.newCommentForm}>
        <textarea
          className={styles.newCommentInput}
          placeholder="Ecrire un commentaire..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <button
          className={styles.sendBtn}
          onClick={handleSubmit}
          disabled={!newComment.trim()}
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}

'use client';

import { useState, type ReactNode } from 'react';
import { Loader2, Pencil, Check, X } from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';
import styles from './agDashboard.shared.module.css';

export interface AgListItemAction {
  icon: ReactNode;
  label?: string;
  href?: string;
  onClick?: () => void;
  title: string;
  variant?: 'default' | 'danger';
  disabled?: boolean;
  isLoading?: boolean;
}

interface AgListItemProps {
  icon: ReactNode;
  title: string;
  meta: string;
  actions: AgListItemAction[];
  variant?: 'history' | 'draft';
  /** Enables inline rename mode */
  editable?: boolean;
  onRename?: (newTitle: string) => Promise<void>;
  isRenaming?: boolean;
}

export function AgListItem({
  icon,
  title,
  meta,
  actions,
  variant = 'history',
  editable = false,
  onRename,
  isRenaming = false,
}: AgListItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);

  const isDraft = variant === 'draft';

  const handleStartEdit = () => {
    setEditTitle(title);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditTitle(title);
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    const trimmedTitle = editTitle.trim();
    if (trimmedTitle && trimmedTitle !== title && onRename) {
      await onRename(trimmedTitle);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <div className={clsx(styles.listItem, isDraft && styles.listItemDraft)}>
      <div className={clsx(styles.listIcon, isDraft && styles.listIconDraft)}>
        {icon}
      </div>

      <div className={styles.listContent}>
        {isEditing ? (
          <div className={styles.editRow}>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSaveEdit}
              className={styles.editInput}
              autoFocus
              disabled={isRenaming}
            />
            <button
              onClick={handleSaveEdit}
              className={styles.editBtn}
              title="Valider"
              disabled={isRenaming}
            >
              {isRenaming ? (
                <Loader2 size={14} className={styles.spinning} />
              ) : (
                <Check size={14} />
              )}
            </button>
            <button
              onClick={handleCancelEdit}
              className={styles.editBtnCancel}
              title="Annuler"
              disabled={isRenaming}
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className={styles.editRow}>
            <div className={clsx(styles.listTitle, isDraft && styles.listTitleTruncate)}>
              {title}
            </div>
            {editable && (
              <button
                onClick={handleStartEdit}
                className={styles.renameBtn}
                title="Renommer"
              >
                <Pencil size={14} />
              </button>
            )}
          </div>
        )}
        <div className={styles.listMeta}>{meta}</div>
      </div>

      <div className={styles.listActions}>
        {actions.map((action) => {
          const isDanger = action.variant === 'danger';
          const linkClass = clsx(
            isDanger ? styles.listLinkDanger : styles.listLink,
            isDraft && !isDanger && styles.listLinkDraft
          );

          if (action.href) {
            return (
              <Link key={action.title} href={action.href} className={linkClass} title={action.title}>
                {action.icon}
                {action.label && <span className={styles.listLinkText}>{action.label}</span>}
              </Link>
            );
          }

          return (
            <button
              key={action.title}
              onClick={action.onClick}
              className={linkClass}
              title={action.title}
              disabled={action.disabled}
            >
              {action.isLoading ? (
                <Loader2 size={16} className={styles.spinning} aria-hidden="true" />
              ) : (
                action.icon
              )}
              {action.label && !isDanger && <span>{action.label}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

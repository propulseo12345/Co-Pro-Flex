'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Clock, Tag, Pin, Lock, MoreVertical, PinOff, Edit, Trash2, ThumbsUp, MessageCircle, Paperclip } from 'lucide-react';
import clsx from 'clsx';
import type { Publication, RoleBadge } from '../../types';
import styles from '../../../../app/(dashboard)/communication/mur/mur.module.css';

interface PublicationCardProps {
  publication: Publication;
  getCategoryColor: (cat: string) => string;
  getRoleBadge: (role: string) => RoleBadge;
  onDelete: (id: string) => void;
  onLike: (id: string) => void;
  onTogglePin: (id: string) => void;
}

export function PublicationCard({ publication, getCategoryColor, getRoleBadge, onDelete, onLike, onTogglePin }: PublicationCardProps) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [localLikes, setLocalLikes] = useState(publication.likes);
  const roleBadge = getRoleBadge(publication.authorRole);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!showMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current && buttonRef.current && !menuRef.current.contains(target) && !buttonRef.current.contains(target)) {
        setShowMenu(false);
      }
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const handleLike = () => {
    setIsLiked(!isLiked);
    const newLikes = isLiked ? localLikes - 1 : localLikes + 1;
    setLocalLikes(newLikes);
    onLike(publication.id);
  };

  const handleEdit = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    setShowMenu(false);
    router.push(`/communication/mur/nouveau?edit=${publication.id}`);
  }, [publication.id, router]);

  return (
    <div className={styles.publicationCard}>
      <div className={styles.pubHeader}>
        <div className={styles.authorInfo}>
          <div className={styles.avatar}><User size={20} aria-hidden="true" /></div>
          <div>
            <div className={styles.authorName}>
              {publication.author}
              <span className={styles.roleBadge} style={{ background: `${roleBadge.color}20`, color: roleBadge.color }}>{roleBadge.label}</span>
            </div>
            <div className={styles.pubMeta}>
              <Clock size={12} aria-hidden="true" />
              {new Date(publication.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              <span className={styles.categoryBadge} style={{ background: `${getCategoryColor(publication.category)}20`, color: getCategoryColor(publication.category) }}>
                <Tag size={12} aria-hidden="true" />{publication.category}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.pubActions}>
          {publication.isPinned && <Pin size={16} className={styles.pinnedIcon} aria-hidden="true" />}
          {publication.isLocked && <Lock size={16} className={styles.lockedIcon} aria-hidden="true" />}
          <div className={styles.menuWrapper} ref={menuRef}>
            <button ref={buttonRef} type="button" className={styles.actionBtn} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMenu((prev) => !prev); }} onMouseDown={(e) => e.stopPropagation()} aria-expanded={showMenu} aria-haspopup="true">
              <MoreVertical size={16} aria-hidden="true" />
            </button>
            {showMenu && (
              <div className={styles.dropdownMenu} onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                <button className={styles.menuItem} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTogglePin(publication.id); setShowMenu(false); }}>
                  {publication.isPinned ? (<><PinOff size={14} aria-hidden="true" />Désépingler</>) : (<><Pin size={14} aria-hidden="true" />Épingler</>)}
                </button>
                <button type="button" className={styles.menuItem} onClick={handleEdit} onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }} onMouseUp={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                  <Edit size={14} aria-hidden="true" />Modifier le message
                </button>
                <button className={clsx(styles.menuItem, styles.deleteItem)} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(publication.id); setShowMenu(false); }}>
                  <Trash2 size={14} aria-hidden="true" />Supprimer le message
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Link href={`/communication/mur/${publication.id}`} className={styles.pubContent}>
        <h3 className={styles.pubTitle}>{publication.title}</h3>
        <p className={styles.pubText}>{publication.content}</p>

        {publication.tags && publication.tags.length > 0 && (
          <div className={styles.pubTags}>
            {publication.tags.map((tag, index) => (
              <span key={index} className={styles.tag}>#{tag}</span>
            ))}
          </div>
        )}

        {publication.hasAttachment && (
          <div className={styles.attachment}>
            <Paperclip size={14} aria-hidden="true" />
            <span>Pièce jointe disponible</span>
          </div>
        )}
      </Link>

      <div className={styles.pubFooter}>
        <button className={clsx(styles.interactionBtn, isLiked && styles.liked)} onClick={handleLike}>
          <ThumbsUp size={16} aria-hidden="true" />{localLikes} J'aime
        </button>
        <Link href={`/communication/mur/${publication.id}`} className={styles.interactionBtn}>
          <MessageCircle size={16} aria-hidden="true" />{publication.comments} Commentaires
        </Link>
      </div>
    </div>
  );
}

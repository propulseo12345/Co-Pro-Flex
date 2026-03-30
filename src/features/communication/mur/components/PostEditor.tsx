'use client';

import { useState, useCallback } from 'react';
import { X, Pin } from 'lucide-react';
import type { INewPostData, PostCategory } from '@/features/communication/mur/domain/types';
import { CATEGORY_CONFIG } from '@/features/communication/mur/domain/constants';
import styles from './PostEditor.module.css';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

interface PostEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: INewPostData) => void;
}

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------

export function PostEditor({ isOpen, onClose, onSubmit }: PostEditorProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<PostCategory>('information');
  const [isPinned, setIsPinned] = useState(false);

  const canSubmit = title.trim().length > 0 && content.trim().length > 0;

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    onSubmit({
      title: title.trim(),
      content: content.trim(),
      category,
      isPinned,
    });
    // Reset form
    setTitle('');
    setContent('');
    setCategory('information');
    setIsPinned(false);
  }, [title, content, category, isPinned, canSubmit, onSubmit]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Nouvelle publication">
        {/* Header */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Nouvelle publication</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.modalBody}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="post-title">
              Titre
            </label>
            <input
              id="post-title"
              type="text"
              className={styles.input}
              placeholder="Titre de votre publication"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="post-content">
              Contenu
            </label>
            <textarea
              id="post-content"
              className={styles.textarea}
              placeholder="Ecrivez votre message..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="post-category">
              Categorie
            </label>
            <select
              id="post-category"
              className={styles.select}
              value={category}
              onChange={(e) => setCategory(e.target.value as PostCategory)}
            >
              {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.checkboxRow}>
            <input
              type="checkbox"
              id="post-pin"
              className={styles.checkbox}
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
            />
            <label htmlFor="post-pin" className={styles.checkboxLabel}>
              <Pin size={14} /> Epingler cette publication
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onClose}>
            Annuler
          </button>
          <button
            className={styles.submitBtn}
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            Publier
          </button>
        </div>
      </div>
    </div>
  );
}

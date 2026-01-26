'use client';

import { X, Save, AlertCircle } from 'lucide-react';
import { useState, useCallback, useId, useMemo } from 'react';
import { PosteEditor, type PosteEditorData } from '../PosteEditor';
import { AddPosteDropdown } from '../AddPosteDropdown';
import styles from './BudgetEditorModal.module.css';

interface BudgetEditorModalProps {
  year: number;
  initialPostes?: PosteEditorData[];
  onSave: (postes: PosteEditorData[], total: number) => void;
  onClose: () => void;
}

export function BudgetEditorModal({
  year,
  initialPostes = [],
  onSave,
  onClose,
}: BudgetEditorModalProps) {
  const titleId = useId();
  const [postes, setPostes] = useState<PosteEditorData[]>(initialPostes);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const total = useMemo(() => {
    return postes.reduce((sum, p) => sum + p.montant, 0);
  }, [postes]);

  const existingPosteIds = useMemo(() => {
    return postes.map((p) => p.posteId).filter(Boolean) as string[];
  }, [postes]);

  const handleAddPoste = useCallback((libelle: string, posteId?: string) => {
    const newPoste: PosteEditorData = {
      id: `poste-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      libelle,
      montant: 0,
      posteId,
    };
    setPostes((prev) => [...prev, newPoste]);
  }, []);

  const handleUpdatePoste = useCallback((index: number, updated: PosteEditorData) => {
    setPostes((prev) => {
      const newPostes = [...prev];
      newPostes[index] = updated;
      return newPostes;
    });
  }, []);

  const handleDeletePoste = useCallback((index: number) => {
    setPostes((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback((index: number) => {
    setDragOverIndex(index);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      setPostes((prev) => {
        const newPostes = [...prev];
        const [removed] = newPostes.splice(dragIndex, 1);
        newPostes.splice(dragOverIndex, 0, removed);
        return newPostes;
      });
    }
    setDragIndex(null);
    setDragOverIndex(null);
  }, [dragIndex, dragOverIndex]);

  const handleSave = useCallback(() => {
    onSave(postes, total);
  }, [postes, total, onSave]);

  const isValid = postes.length > 0 && postes.every((p) => p.libelle.trim());

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className={styles.modalHeader}>
          <h2 id={titleId} className={styles.modalTitle}>
            Budget de fonctionnement {year}
          </h2>
          <button
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Fermer"
          >
            <X size={24} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.modalBody}>
          {postes.length === 0 ? (
            <div className={styles.emptyState}>
              <AlertCircle size={32} className={styles.emptyIcon} aria-hidden="true" />
              <p className={styles.emptyText}>
                Aucun poste de dépense. Ajoutez des postes pour créer votre budget.
              </p>
            </div>
          ) : (
            <div className={styles.postesList}>
              {postes.map((poste, index) => (
                <PosteEditor
                  key={poste.id}
                  poste={poste}
                  index={index}
                  onChange={(updated) => handleUpdatePoste(index, updated)}
                  onDelete={() => handleDeletePoste(index)}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                  isDragging={dragIndex === index}
                  isDragOver={dragOverIndex === index && dragIndex !== index}
                />
              ))}
            </div>
          )}

          <div className={styles.addPosteWrapper}>
            <AddPosteDropdown
              onAddPoste={handleAddPoste}
              existingPosteIds={existingPosteIds}
            />
          </div>
        </div>

        <div className={styles.modalFooter}>
          <div className={styles.totalSection}>
            <span className={styles.totalLabel}>Total budget</span>
            <span className={styles.totalAmount}>
              {total.toLocaleString('fr-FR')} €
            </span>
          </div>
          <div className={styles.actions}>
            <button onClick={onClose} className="btn btn-secondary">
              Annuler
            </button>
            <button
              onClick={handleSave}
              className="btn btn-primary"
              disabled={!isValid}
            >
              <Save size={16} aria-hidden="true" />
              Enregistrer le budget
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

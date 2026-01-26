'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { AlertCircle, Calculator } from 'lucide-react';
import { PosteEditor, type PosteEditorData } from './PosteEditor';
import { AddPosteDropdown } from '../AddPosteDropdown';
import { clesRepartitionApi } from '@/shared/services';
import type { MockCleRepartition } from '@/shared/mock/finance';
import styles from './PosteEditor.module.css';

interface PostesListEditorProps {
  postes: PosteEditorData[];
  onPostesChange: (postes: PosteEditorData[]) => void;
  year?: number;
  onSimulateRepartition?: () => void;
}

export function PostesListEditor({
  postes,
  onPostesChange,
  year,
  onSimulateRepartition,
}: PostesListEditorProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [clesRepartition, setClesRepartition] = useState<MockCleRepartition[]>([]);

  // Load clés de répartition
  useEffect(() => {
    const loadCles = async () => {
      const result = await clesRepartitionApi.list({ pageSize: 100 });
      if (result.success && result.data) {
        setClesRepartition(result.data.data);
      }
    };
    loadCles();
  }, []);

  const existingPosteIds = useMemo(() => {
    return postes.map((p) => p.posteId).filter(Boolean) as string[];
  }, [postes]);

  const total = useMemo(() => {
    return postes.reduce((sum, p) => sum + p.montant, 0);
  }, [postes]);

  // Count postes exceeding 10%
  const postesExceeding10Percent = useMemo(() => {
    if (total === 0) return 0;
    return postes.filter(p => (p.montant / total) * 100 > 10).length;
  }, [postes, total]);

  const handleAddPoste = useCallback((libelle: string, posteId?: string) => {
    const newPoste: PosteEditorData = {
      id: `poste-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      libelle,
      montant: 0,
      posteId,
    };
    onPostesChange([...postes, newPoste]);
  }, [postes, onPostesChange]);

  const handleUpdatePoste = useCallback((index: number, updated: PosteEditorData) => {
    const newPostes = [...postes];
    newPostes[index] = updated;
    onPostesChange(newPostes);
  }, [postes, onPostesChange]);

  const handleDeletePoste = useCallback((index: number) => {
    onPostesChange(postes.filter((_, i) => i !== index));
  }, [postes, onPostesChange]);

  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback((index: number) => {
    setDragOverIndex(index);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      const newPostes = [...postes];
      const [removed] = newPostes.splice(dragIndex, 1);
      newPostes.splice(dragOverIndex, 0, removed);
      onPostesChange(newPostes);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  }, [dragIndex, dragOverIndex, postes, onPostesChange]);

  return (
    <div className={styles.listEditorContainer}>
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
              budgetTotal={total}
              clesRepartition={clesRepartition}
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

      {postes.length > 0 && (
        <>
          {postesExceeding10Percent > 0 && (
            <div className={styles.alertBanner}>
              <AlertCircle size={16} />
              <span>{postesExceeding10Percent} poste(s) dépasse(nt) 10% du budget total</span>
            </div>
          )}
          <div className={styles.totalSection}>
            <span className={styles.totalLabel}>Total budget {year}</span>
            <div className={styles.totalActions}>
              {onSimulateRepartition && (
                <button
                  type="button"
                  className={styles.simulateButton}
                  onClick={onSimulateRepartition}
                >
                  <Calculator size={16} />
                  Simuler la répartition
                </button>
              )}
              <span className={styles.totalAmount}>
                {total.toLocaleString('fr-FR')} €
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

'use client';

import { GripVertical, Trash2, AlertTriangle } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import styles from './PosteEditor.module.css';

export interface PosteEditorData {
  id: string;
  libelle: string;
  montant: number;
  posteId?: string;
  cleRepartitionId?: string;
}

// Type compatible avec le mapper de PostesListEditor
interface CleRepartitionUI {
  id: string;
  nom: string;
  code?: string;
  description?: string;
  totalTantiemes?: number;
  type?: string;
}

interface PosteEditorProps {
  poste: PosteEditorData;
  index: number;
  onChange: (poste: PosteEditorData) => void;
  onDelete: () => void;
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDragEnd: () => void;
  isDragging?: boolean;
  isDragOver?: boolean;
  budgetTotal?: number;
  clesRepartition?: CleRepartitionUI[];
}

export function PosteEditor({
  poste,
  index,
  onChange,
  onDelete,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging = false,
  isDragOver = false,
  budgetTotal = 0,
  clesRepartition = [],
}: PosteEditorProps) {
  const [localMontant, setLocalMontant] = useState(formatMontant(poste.montant));
  const inputRef = useRef<HTMLInputElement>(null);

  // Check if poste exceeds 10% of budget
  const percentageOfBudget = budgetTotal > 0 ? (poste.montant / budgetTotal) * 100 : 0;
  const exceeds10Percent = percentageOfBudget > 10;

  const handleLibelleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...poste, libelle: e.target.value });
    },
    [poste, onChange]
  );

  const handleMontantChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d,.\s]/g, '');
    setLocalMontant(value);
  }, []);

  const handleMontantBlur = useCallback(() => {
    const numericValue = parseMontant(localMontant);
    onChange({ ...poste, montant: numericValue });
    setLocalMontant(formatMontant(numericValue));
  }, [localMontant, poste, onChange]);

  const handleCleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange({ ...poste, cleRepartitionId: e.target.value || undefined });
    },
    [poste, onChange]
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(index));
      onDragStart(index);
    },
    [index, onDragStart]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      onDragOver(index);
    },
    [index, onDragOver]
  );

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  return (
    <div
      className={`${styles.posteRow} ${isDragging ? styles.dragging : ''} ${isDragOver ? styles.dragOver : ''} ${exceeds10Percent ? styles.posteAlert : ''}`}
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={onDragEnd}
      onDrop={handleDrop}
    >
      <div className={styles.dragHandle} aria-label="Glisser pour réordonner">
        <GripVertical size={16} aria-hidden="true" />
      </div>
      <input
        type="text"
        className={styles.libelleInput}
        value={poste.libelle}
        onChange={handleLibelleChange}
        placeholder="Libellé du poste"
        aria-label="Libellé du poste"
      />
      <select
        className={styles.cleSelect}
        value={poste.cleRepartitionId || ''}
        onChange={handleCleChange}
        aria-label="Clé de répartition"
      >
        <option value="">Clé de répartition...</option>
        {clesRepartition.map(cle => (
          <option key={cle.id} value={cle.id}>{cle.nom}</option>
        ))}
      </select>
      <div className={styles.montantWrapper}>
        <input
          ref={inputRef}
          type="text"
          className={styles.montantInput}
          value={localMontant}
          onChange={handleMontantChange}
          onBlur={handleMontantBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              inputRef.current?.blur();
            }
          }}
          placeholder="0"
          aria-label="Montant en euros"
        />
        <span className={styles.euroSymbol}>€</span>
      </div>
      {exceeds10Percent && (
        <div className={styles.alertBadge} title={`Ce poste représente ${percentageOfBudget.toFixed(1)}% du budget`}>
          <AlertTriangle size={14} />
          <span>{percentageOfBudget.toFixed(0)}%</span>
        </div>
      )}
      <button
        type="button"
        className={styles.deleteButton}
        onClick={onDelete}
        aria-label="Supprimer ce poste"
      >
        <Trash2 size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

function formatMontant(value: number): string {
  if (value === 0) return '';
  return value.toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function parseMontant(value: string): number {
  if (!value.trim()) return 0;
  const cleaned = value.replace(/\s/g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100;
}

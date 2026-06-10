'use client';

import { Copy, Check, PlusCircle, Scale, Files, Pencil, Trash2 } from 'lucide-react';
import { MAJORITES, type ResolutionTemplate } from '@/lib/constants/resolutions';
import type { ResolutionTemplateRow } from '@/lib/ag/resolutionTemplates/types';
import styles from '../../../../app/(dashboard)/ag/resolutions/resolutions.module.css';

/** Dérive le niveau d'un modèle depuis ses dimensions de tenance. */
function getNiveau(row: ResolutionTemplateRow): 'Système' | 'Cabinet' | 'Cette copro' {
  if (row.cabinet_id == null) return 'Système';
  if (row.copro_id) return 'Cette copro';
  return 'Cabinet';
}

interface ResolutionCardProps {
  resolution: ResolutionTemplateRow;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
  onAddToAG?: (resolution: ResolutionTemplate) => void;
  hasAvailableAGs?: boolean;
  /** Déclenche la duplication du modèle vers le cabinet ou la copro. */
  onDuplicate?: (id: string) => void;
  /** Ouvre l'éditeur pour modifier (uniquement cabinet/copro). */
  onEdit?: (row: ResolutionTemplateRow) => void;
  /** Supprime le modèle (uniquement cabinet/copro). */
  onDelete?: (id: string) => void;
}

export function ResolutionCard({
  resolution,
  copiedId,
  onCopy,
  onAddToAG,
  hasAvailableAGs,
  onDuplicate,
  onEdit,
  onDelete,
}: ResolutionCardProps) {
  const majorite = MAJORITES[resolution.majorite];
  const niveau = getNiveau(resolution);
  const isEditable = resolution.cabinet_id != null;

  return (
    <div className={styles.resolutionCard}>
      <div className={styles.cardHeader}>
        <div className={styles.cardBadges}>
          <span className={styles.category}>{resolution.categorie}</span>
          {resolution.obligatoire_pour && resolution.obligatoire_pour.length > 0 && (
            <span className={styles.obligatoireBadge}>Obligatoire</span>
          )}
          {/* Badge de niveau */}
          <span
            className={
              niveau === 'Système'
                ? styles.badgeNiveauSystem
                : niveau === 'Cabinet'
                  ? styles.badgeNiveauCabinet
                  : styles.badgeNiveauCopro
            }
          >
            {niveau}
          </span>
        </div>
        <div className={styles.cardActions}>
          {onAddToAG && (
            <button
              className={styles.addToAGBtn}
              title={hasAvailableAGs ? 'Ajouter à une AG' : 'Aucune AG disponible'}
              onClick={() => onAddToAG(resolution)}
            >
              <PlusCircle size={16} />
            </button>
          )}
          {onDuplicate && (
            <button
              className={styles.copyBtn}
              title="Dupliquer ce modèle"
              onClick={() => onDuplicate(resolution.id)}
            >
              <Files size={16} />
            </button>
          )}
          {isEditable && onEdit && (
            <button
              className={styles.editBtn}
              title="Modifier ce modèle"
              onClick={() => onEdit(resolution)}
            >
              <Pencil size={16} />
            </button>
          )}
          {isEditable && onDelete && (
            <button
              className={styles.deleteBtn}
              title="Supprimer ce modèle"
              onClick={() => onDelete(resolution.id)}
            >
              <Trash2 size={16} />
            </button>
          )}
          <button
            className={styles.copyBtn}
            title="Copier le texte"
            onClick={() => onCopy(resolution.texte, resolution.id)}
          >
            {copiedId === resolution.id ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
      </div>

      <h3 className={styles.cardTitle}>{resolution.titre}</h3>
      <p className={styles.cardDesc}>{resolution.texte}</p>

      {resolution.tags && resolution.tags.length > 0 && (
        <div className={styles.cardTags}>
          {resolution.tags.slice(0, 3).map(tag => (
            <span key={tag} className={styles.cardTag}>{tag}</span>
          ))}
          {resolution.tags.length > 3 && (
            <span className={styles.cardTagMore}>+{resolution.tags.length - 3}</span>
          )}
        </div>
      )}

      <div className={styles.cardFooter}>
        <span className={styles.voteType}>
          {majorite?.nom || resolution.majorite}
        </span>
        {resolution.legalRef && (
          <span className={styles.legalRef} title={resolution.legalRef}>
            <Scale size={12} />
            {resolution.legalRef.split(' ').slice(0, 3).join(' ')}
          </span>
        )}
      </div>
    </div>
  );
}

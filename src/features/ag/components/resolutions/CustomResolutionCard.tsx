'use client';

import { Copy, Check, Trash2, Edit as EditIcon } from 'lucide-react';
import { MAJORITES } from '@/lib/constants/resolutions';
import type { ICustomResolution } from '@/types/models/custom-resolution';
import styles from '../../../../app/(dashboard)/ag/resolutions/resolutions.module.css';

interface CustomResolutionCardProps {
  resolution: ICustomResolution;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
  onEdit: (resolution: ICustomResolution) => void;
  onDelete: (id: string) => void;
}

const scopeLabels: Record<string, string> = {
  private: 'Privée',
  org: 'Organisation',
  shared: 'Partagée',
};

export function CustomResolutionCard({ resolution, copiedId, onCopy, onEdit, onDelete }: CustomResolutionCardProps) {
  const majorite = MAJORITES[resolution.majorite];

  return (
    <div className={`${styles.resolutionCard} ${styles.resolutionCardCustom}`}>
      <div className={styles.cardHeader}>
        <div className={styles.cardBadges}>
          <span className={styles.customBadge}>Personnalisée</span>
          <span className={styles.category}>{resolution.categorie}</span>
          {resolution.scope !== 'private' && (
            <span className={styles.scopeBadge}>{scopeLabels[resolution.scope]}</span>
          )}
        </div>
        <div className={styles.cardActions}>
          <button
            className={styles.editBtn}
            title="Modifier"
            onClick={() => onEdit(resolution)}
          >
            <EditIcon size={16} />
          </button>
          <button
            className={styles.copyBtn}
            title="Copier le texte"
            onClick={() => onCopy(resolution.texte, resolution.id)}
          >
            {copiedId === resolution.id ? <Check size={16} /> : <Copy size={16} />}
          </button>
          <button
            className={styles.deleteBtn}
            title="Supprimer"
            onClick={() => onDelete(resolution.id)}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <h3 className={styles.cardTitle}>{resolution.titre}</h3>
      <p className={styles.cardDesc}>{resolution.texte}</p>

      {resolution.variables && resolution.variables.length > 0 && (
        <div className={styles.variablesBadges}>
          {resolution.variables.slice(0, 3).map(v => (
            <span key={v.key} className={styles.variableBadge}>{'{' + v.key + '}'}</span>
          ))}
          {resolution.variables.length > 3 && (
            <span className={styles.cardTagMore}>+{resolution.variables.length - 3}</span>
          )}
        </div>
      )}

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
        {resolution.usageCount > 0 && (
          <span className={styles.usageCount}>
            Utilisée {resolution.usageCount} fois
          </span>
        )}
      </div>
    </div>
  );
}

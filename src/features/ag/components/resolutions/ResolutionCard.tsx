'use client';

import { Copy, Check, PlusCircle, Scale } from 'lucide-react';
import { MAJORITES, type ResolutionTemplate } from '@/lib/constants/resolutions';
import styles from '../../../../app/(dashboard)/ag/resolutions/resolutions.module.css';

interface ResolutionCardProps {
  resolution: ResolutionTemplate;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
  onAddToAG?: (resolution: ResolutionTemplate) => void;
  hasAvailableAGs?: boolean;
}

export function ResolutionCard({ resolution, copiedId, onCopy, onAddToAG, hasAvailableAGs }: ResolutionCardProps) {
  const majorite = MAJORITES[resolution.majorite];

  return (
    <div className={styles.resolutionCard}>
      <div className={styles.cardHeader}>
        <div className={styles.cardBadges}>
          <span className={styles.category}>{resolution.categorie}</span>
          {resolution.obligatoire_pour && resolution.obligatoire_pour.length > 0 && (
            <span className={styles.obligatoireBadge}>Obligatoire</span>
          )}
        </div>
        <div className={styles.cardActions}>
          {onAddToAG && (
            <button
              className={styles.addToAGBtn}
              title={hasAvailableAGs ? "Ajouter à une AG" : "Aucune AG disponible"}
              onClick={() => onAddToAG(resolution)}
            >
              <PlusCircle size={16} />
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

'use client';

import { useCallback } from 'react';
import {
  FileText,
  Image,
  Link as LinkIcon,
  Star,
  Eye,
  Download,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { PJFacture, formatFileSize } from '../types';
import styles from './PJList.module.css';

interface PJListProps {
  piecesJointes: PJFacture[];
  onVoir?: (pj: PJFacture) => void;
  onTelecharger?: (pj: PJFacture) => void;
  onSupprimer?: (pjId: string) => void;
  onDefinirPrincipale?: (pjId: string) => void;
  readOnly?: boolean;
}

/**
 * Affiche la liste des pièces jointes
 */
export function PJList({
  piecesJointes,
  onVoir,
  onTelecharger,
  onSupprimer,
  onDefinirPrincipale,
  readOnly = false,
}: PJListProps) {
  const getIcon = useCallback((pj: PJFacture) => {
    if (pj.type === 'LIEN_EXTERNE') {
      return <LinkIcon size={20} aria-hidden="true" />;
    }

    if (pj.mimeType?.startsWith('image/')) {
      return <Image size={20} aria-hidden="true" />;
    }

    return <FileText size={20} aria-hidden="true" />;
  }, []);

  const getTypeLabel = useCallback((pj: PJFacture): string => {
    if (pj.type === 'LIEN_EXTERNE') return 'Lien externe';
    if (pj.mimeType?.includes('pdf')) return 'PDF';
    if (pj.mimeType?.startsWith('image/')) return 'Image';
    return 'Fichier';
  }, []);

  const handleVoir = useCallback(
    (pj: PJFacture) => {
      if (onVoir) {
        onVoir(pj);
      } else if (pj.type === 'LIEN_EXTERNE') {
        window.open(pj.url, '_blank', 'noopener,noreferrer');
      } else {
        window.open(pj.url, '_blank');
      }
    },
    [onVoir]
  );

  const handleTelecharger = useCallback(
    (pj: PJFacture) => {
      if (onTelecharger) {
        onTelecharger(pj);
      } else {
        const link = document.createElement('a');
        link.href = pj.url;
        link.download = pj.nom;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    },
    [onTelecharger]
  );

  if (piecesJointes.length === 0) {
    return (
      <div className={styles.empty}>
        <FileText size={24} aria-hidden="true" />
        <p>Aucune pièce jointe</p>
      </div>
    );
  }

  return (
    <ul className={styles.list}>
      {piecesJointes.map((pj) => (
        <li key={pj.id} className={`${styles.item} ${pj.estPrincipale ? styles.principale : ''}`}>
          <div className={styles.iconWrapper}>{getIcon(pj)}</div>

          <div className={styles.info}>
            <div className={styles.nameRow}>
              <span className={styles.name} title={pj.nom}>
                {pj.nom}
              </span>
              {pj.estPrincipale && (
                <span className={styles.principalBadge}>
                  <Star size={12} aria-hidden="true" />
                  Principale
                </span>
              )}
            </div>
            <div className={styles.meta}>
              <span className={styles.type}>{getTypeLabel(pj)}</span>
              {pj.taille && (
                <>
                  <span className={styles.separator}>•</span>
                  <span>{formatFileSize(pj.taille)}</span>
                </>
              )}
              <span className={styles.separator}>•</span>
              <span>{new Date(pj.dateAjout).toLocaleDateString('fr-FR')}</span>
            </div>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.actionButton}
              onClick={() => handleVoir(pj)}
              title="Voir"
              aria-label={`Voir ${pj.nom}`}
            >
              {pj.type === 'LIEN_EXTERNE' ? (
                <ExternalLink size={16} aria-hidden="true" />
              ) : (
                <Eye size={16} aria-hidden="true" />
              )}
            </button>

            {pj.type === 'FICHIER' && (
              <button
                type="button"
                className={styles.actionButton}
                onClick={() => handleTelecharger(pj)}
                title="Télécharger"
                aria-label={`Télécharger ${pj.nom}`}
              >
                <Download size={16} aria-hidden="true" />
              </button>
            )}

            {!readOnly && onDefinirPrincipale && !pj.estPrincipale && (
              <button
                type="button"
                className={styles.actionButton}
                onClick={() => onDefinirPrincipale(pj.id)}
                title="Définir comme principale"
                aria-label={`Définir ${pj.nom} comme pièce jointe principale`}
              >
                <Star size={16} aria-hidden="true" />
              </button>
            )}

            {!readOnly && onSupprimer && (
              <button
                type="button"
                className={`${styles.actionButton} ${styles.deleteButton}`}
                onClick={() => onSupprimer(pj.id)}
                title="Supprimer"
                aria-label={`Supprimer ${pj.nom}`}
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

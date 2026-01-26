'use client';

import { FolderOpen } from 'lucide-react';
import styles from '../../../../../app/(dashboard)/documents/ged/ged.module.css';

interface EmptyStateProps {
  isSearch: boolean;
}

export function EmptyState({ isSearch }: EmptyStateProps) {
  return (
    <div className={styles.emptyState}>
      <FolderOpen size={48} aria-hidden="true" />
      <p>{isSearch ? 'Aucun document trouvé' : 'Ce dossier est vide'}</p>
      <span>
        {isSearch
          ? 'Essayez de modifier vos critères de recherche'
          : 'Glissez-déposez des fichiers pour les ajouter'}
      </span>
    </div>
  );
}

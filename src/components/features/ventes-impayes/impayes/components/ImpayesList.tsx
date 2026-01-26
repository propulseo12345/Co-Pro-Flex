'use client';

import { Archive, CheckCircle2 } from 'lucide-react';
import type { Impaye } from '../domain/types';
import { ImpayeCard } from './ImpayeCard';
import styles from '../../../../../app/(dashboard)/ventes-impayes/impayes/impayes.module.css';

interface ImpayesListProps {
  impayes: Impaye[];
  selectedIds: number[];
  selectedStatut: string;
  onToggleSelection: (id: number) => void;
  onOpenDetail: (impaye: Impaye) => void;
  onOpenRelance: (impaye: Impaye) => void;
  onOpenRegle: (impaye: Impaye) => void;
}

export function ImpayesList({
  impayes,
  selectedIds,
  selectedStatut,
  onToggleSelection,
  onOpenDetail,
  onOpenRelance,
  onOpenRegle,
}: ImpayesListProps) {
  if (impayes.length === 0) {
    return (
      <div className={styles.impayesList}>
        <div className={styles.emptyState}>
          {selectedStatut === 'clotures' ? (
            <>
              <Archive size={48} aria-hidden="true" />
              <p>Aucun dossier clôturé</p>
            </>
          ) : (
            <>
              <CheckCircle2 size={48} aria-hidden="true" />
              <p>Aucun impayé dans cette catégorie</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.impayesList}>
      {impayes.map((impaye) => (
        <ImpayeCard
          key={impaye.id}
          impaye={impaye}
          isSelected={selectedIds.includes(impaye.id)}
          onToggleSelection={onToggleSelection}
          onOpenDetail={onOpenDetail}
          onOpenRelance={onOpenRelance}
          onOpenRegle={onOpenRegle}
        />
      ))}
    </div>
  );
}

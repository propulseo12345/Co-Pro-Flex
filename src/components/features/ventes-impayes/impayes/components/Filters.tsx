'use client';

import { Archive } from 'lucide-react';
import clsx from 'clsx';
import type { Impaye } from '../domain/types';
import { WORKFLOW_STEPS } from '../domain/constants';
import styles from '../../../../../app/(dashboard)/ventes-impayes/impayes/impayes.module.css';

interface FiltersProps {
  selectedStatut: string;
  impayes: Impaye[];
  nbClotures: number;
  onStatutChange: (statut: string) => void;
}

export function Filters({ selectedStatut, impayes, nbClotures, onStatutChange }: FiltersProps) {
  const activeCount = impayes.filter((i) => i.statut !== 'regle').length;

  return (
    <div className="card" style={{ marginBottom: '2rem' }}>
      <div className={styles.filters}>
        <button
          className={clsx(styles.filterBtn, selectedStatut === 'tous' && styles.active)}
          onClick={() => onStatutChange('tous')}
        >
          Tous ({activeCount})
        </button>
        {WORKFLOW_STEPS.map((step) => (
          <button
            key={step.id}
            className={clsx(styles.filterBtn, selectedStatut === step.id && styles.active)}
            onClick={() => onStatutChange(step.id)}
          >
            {step.label} ({impayes.filter((i) => i.statut === step.id).length})
          </button>
        ))}
        <div className={styles.filterSeparator} />
        <button
          className={clsx(styles.filterBtn, styles.cloturesBtn, selectedStatut === 'clotures' && styles.active)}
          onClick={() => onStatutChange('clotures')}
        >
          <Archive size={14} aria-hidden="true" />
          Clôturés ({nbClotures})
        </button>
      </div>
    </div>
  );
}

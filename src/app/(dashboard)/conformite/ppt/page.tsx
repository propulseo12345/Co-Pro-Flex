'use client';

import { FinanceTopBar } from '@/components/layout/FinanceTopBar';
import { PPTGestionnaireGrid } from '@/components/features/conformite/ppt/PPTGestionnaireGrid';
import { usePPT, type PPTFilter } from '@/hooks/usePPT';
import styles from './ppt.module.css';

const FILTERS: { value: PPTFilter; label: string }[] = [
  { value: 'TOUTES', label: 'Toutes' },
  { value: 'A_JOUR', label: 'À jour' },
  { value: 'EN_RETARD', label: 'En retard' },
  { value: 'A_COMPLETER', label: 'À compléter' },
];

export default function PPTGestionnairePage() {
  const { coproprietes, filter, setFilter } = usePPT();

  return (
    <div className="container">
      <FinanceTopBar
        title="Plan Pluriannuel de Travaux"
        subtitle="Suivi des PPT sur l'ensemble de votre portefeuille"
        actions={
          <div className={styles.filters}>
            {FILTERS.map(f => (
              <button
                key={f.value}
                className={filter === f.value ? styles.filterActive : styles.filter}
                onClick={() => setFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
        }
      />
      <PPTGestionnaireGrid coproprietes={coproprietes} />
    </div>
  );
}

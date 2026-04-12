'use client';

import { FinanceTopBar } from '@/components/layout/FinanceTopBar';
import { PPTGestionnaireGrid } from '@/components/features/conformite/ppt/PPTGestionnaireGrid';
import { PPTYearSelector } from '@/components/features/conformite/ppt/PPTYearSelector';
import { PPTKanban } from '@/components/features/conformite/ppt/PPTKanban';
import { PPTCardDetail } from '@/components/features/conformite/ppt/PPTCardDetail';
import { usePPT, type PPTFilter } from '@/hooks/usePPT';
import { useCopro } from '@/providers/CoproContext';
import styles from './ppt.module.css';

const FILTERS: { value: PPTFilter; label: string }[] = [
  { value: 'TOUTES', label: 'Toutes' },
  { value: 'A_JOUR', label: 'À jour' },
  { value: 'EN_RETARD', label: 'En retard' },
  { value: 'A_COMPLETER', label: 'À compléter' },
];

export default function PPTGestionnairePage() {
  const { currentCoproId } = useCopro();

  const {
    coproprietes,
    filter,
    setFilter,
    selectedCopro,
    travauxByStatut,
    selectedYear,
    setYear,
    years,
    selectedTravail,
    openTravailDetail,
    closeTravailDetail,
  } = usePPT({ coproprieteId: currentCoproId ?? undefined });

  // Vue copropriété spécifique (CoproContext actif)
  if (currentCoproId && selectedCopro) {
    return (
      <div className="container">
        <FinanceTopBar
          title="Plan Pluriannuel de Travaux"
          subtitle={`${selectedCopro.nom} · ${selectedCopro.nbLots} lots · ${selectedCopro.travaux.length} travaux planifiés`}
        />
        <div className={styles.yearRow}>
          <span className={styles.yearLabel}>Filtrer par année :</span>
          <PPTYearSelector years={years} selectedYear={selectedYear} onSelect={setYear} />
        </div>
        <PPTKanban travauxByStatut={travauxByStatut} onCardClick={openTravailDetail} />
        {selectedTravail && (
          <PPTCardDetail travail={selectedTravail} onClose={closeTravailDetail} />
        )}
      </div>
    );
  }

  // Vue gestionnaire (toutes copropriétés)
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
                type="button"
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

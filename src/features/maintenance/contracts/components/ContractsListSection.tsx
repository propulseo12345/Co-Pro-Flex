'use client';

import { ContratDetaille, StatutContrat, TypeContrat } from '@/types';
import type { CategorieContrat } from '@/data/mock';
import { ContractsFiltersBar, ContractsTable } from '@/components/features/maintenance/Contracts';
import styles from '@/app/(dashboard)/maintenance/contracts/contracts.module.css';

interface ContractsListSectionProps {
  filteredContrats: ContratDetaille[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statutFilter: StatutContrat | 'TOUS';
  onStatutChange: (value: StatutContrat | 'TOUS') => void;
  categorieFilter: CategorieContrat | 'TOUS';
  onCategorieChange: (value: CategorieContrat | 'TOUS') => void;
  typeFilter: TypeContrat | 'TOUS';
  onTypeChange: (value: TypeContrat | 'TOUS') => void;
  prestataireFilter: string;
  onPrestataireChange: (value: string) => void;
  uniquePrestataires: string[];
  onVoirDetails: (contrat: { id: string }) => void;
  onModifier: (contrat: ContratDetaille) => void;
  onResilier: (contrat: ContratDetaille) => void;
  onTelecharger: (contrat: ContratDetaille) => void;
}

export function ContractsListSection({
  filteredContrats,
  searchTerm,
  onSearchChange,
  statutFilter,
  onStatutChange,
  categorieFilter,
  onCategorieChange,
  typeFilter,
  onTypeChange,
  prestataireFilter,
  onPrestataireChange,
  uniquePrestataires,
  onVoirDetails,
  onModifier,
  onResilier,
  onTelecharger,
}: ContractsListSectionProps) {
  return (
    <section className={styles.contractsSection}>
      <h2 className={styles.sectionTitle}>Autres contrats</h2>

      <ContractsFiltersBar
        searchTerm={searchTerm}
        onSearchChange={onSearchChange}
        statutFilter={statutFilter}
        onStatutChange={onStatutChange}
        categorieFilter={categorieFilter}
        onCategorieChange={onCategorieChange}
        typeFilter={typeFilter}
        onTypeChange={onTypeChange}
        prestataireFilter={prestataireFilter}
        onPrestataireChange={onPrestataireChange}
        uniquePrestataires={uniquePrestataires}
      />

      <ContractsTable
        contrats={filteredContrats}
        onVoirDetails={onVoirDetails}
        onModifier={onModifier}
        onResilier={onResilier}
        onTelecharger={onTelecharger}
      />
    </section>
  );
}

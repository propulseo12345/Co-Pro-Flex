'use client';

import { Plus } from 'lucide-react';
import type { Lot, Coproprietaire, CleRepartition } from '../hooks/useInfoCoproPage';
import { LotEditForm } from './LotEditForm';
import { LotsTable } from './LotsTable';
import styles from '@/app/(dashboard)/settings/info/info.module.css';

interface LotsSectionProps {
  lots: Lot[];
  coproprietaires: Coproprietaire[];
  clesRepartition: CleRepartition[];
  showAddLot: boolean;
  lotEnEdition: Lot | null;
  getCoproprietaireNom: (id: string) => string;
  onAjouterLot: () => void;
  onModifierLot: (lot: Lot) => void;
  onSupprimerLot: (id: string) => void;
  onSauvegarderLot: (lot: Lot) => void;
  onAnnulerEdition: () => void;
  onLotEnEditionChange: (lot: Lot) => void;
}

export function LotsSection({
  lots,
  coproprietaires,
  clesRepartition,
  showAddLot,
  lotEnEdition,
  getCoproprietaireNom,
  onAjouterLot,
  onModifierLot,
  onSupprimerLot,
  onSauvegarderLot,
  onAnnulerEdition,
  onLotEnEditionChange,
}: LotsSectionProps) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Liste des lots</h2>
        <button onClick={onAjouterLot} className="btn btn-primary">
          <Plus size={16} aria-hidden="true" />
          Ajouter un lot
        </button>
      </div>

      {showAddLot && lotEnEdition && (
        <LotEditForm
          lotEnEdition={lotEnEdition}
          coproprietaires={coproprietaires}
          clesRepartition={clesRepartition}
          onLotChange={onLotEnEditionChange}
          onSave={onSauvegarderLot}
          onCancel={onAnnulerEdition}
        />
      )}

      <LotsTable
        lots={lots}
        clesRepartition={clesRepartition}
        getCoproprietaireNom={getCoproprietaireNom}
        onModifier={onModifierLot}
        onSupprimer={onSupprimerLot}
      />
    </section>
  );
}

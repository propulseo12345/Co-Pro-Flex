'use client';

import { Plus } from 'lucide-react';
import { TravauxOverview, TravauxCard } from '@/components/features/finance/Budget';
import styles from '@/app/(dashboard)/finance/budgets/budgets.module.css';

interface TravauxTabProps {
  budgetsTravaux: any[];
  onOpenTravauxDetail: (travaux: any) => void;
  onOpenNewAppelFonds: (travaux: any) => void;
  onCreateBudget: () => void;
}

export function TravauxTab({
  budgetsTravaux,
  onOpenTravauxDetail,
  onOpenNewAppelFonds,
  onCreateBudget,
}: TravauxTabProps) {
  return (
    <div className={styles.content}>
      <TravauxOverview budgetsTravaux={budgetsTravaux} />

      <div className={styles.travauxHeader}>
        <h2 className={styles.sectionTitle}>Projets de travaux</h2>
        <button className="btn btn-primary" onClick={onCreateBudget}>
          <Plus size={16} aria-hidden="true" />
          Nouveau budget travaux
        </button>
      </div>

      <div className={styles.travauxGrid}>
        {budgetsTravaux.map((travaux) => (
          <TravauxCard
            key={travaux.id}
            travaux={travaux}
            onOpenDetail={onOpenTravauxDetail}
            onNewAppelFonds={onOpenNewAppelFonds}
          />
        ))}
      </div>
    </div>
  );
}

'use client';

import { useMemo } from 'react';
import { Plus, FileEdit, Hammer, CheckCircle } from 'lucide-react';
import { TravauxOverview, TravauxCard } from '@/components/features/finance/Budget';
import type { BudgetTravaux } from '@/components/features/finance/Budget/types';
import styles from './TravauxTab.module.css';

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
  const grouped = useMemo(() => {
    const brouillons = budgetsTravaux.filter((t: BudgetTravaux) => t.statut === 'A_VENIR');
    const enCours = budgetsTravaux.filter((t: BudgetTravaux) => t.statut === 'EN_COURS');
    const termines = budgetsTravaux.filter((t: BudgetTravaux) => t.statut === 'TERMINE');
    return { brouillons, enCours, termines };
  }, [budgetsTravaux]);

  const sections = [
    { key: 'en-cours', label: 'Travaux en cours', icon: <Hammer size={14} />, items: grouped.enCours, color: '#3b82f6' },
    { key: 'brouillons', label: 'Brouillons', icon: <FileEdit size={14} />, items: grouped.brouillons, color: '#94a3b8' },
    { key: 'termines', label: 'Travaux finalisés', icon: <CheckCircle size={14} />, items: grouped.termines, color: '#22c55e' },
  ];

  return (
    <div>
      <TravauxOverview budgetsTravaux={budgetsTravaux} />

      <div className={styles.headerRow}>
        <h2 className={styles.pageTitle}>Projets de travaux</h2>
        <button className={styles.btnCreate} onClick={onCreateBudget}>
          <Plus size={14} /> Nouveau budget travaux
        </button>
      </div>

      {budgetsTravaux.length === 0 && (
        <div className={styles.empty}>
          <p>Aucun projet de travaux</p>
          <button className={styles.btnCreate} onClick={onCreateBudget}>
            <Plus size={14} /> Créer un budget travaux
          </button>
        </div>
      )}

      {sections.map(({ key, label, icon, items, color }) =>
        items.length > 0 ? (
          <div key={key} className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon} style={{ color }}>{icon}</span>
              <span className={styles.sectionTitle} style={{ color }}>{label}</span>
              <span className={styles.sectionCount}>{items.length}</span>
            </div>
            <div className={styles.sectionList}>
              {items.map((travaux: BudgetTravaux) => (
                <TravauxCard
                  key={travaux.id}
                  travaux={travaux}
                  onOpenDetail={onOpenTravauxDetail}
                  onNewAppelFonds={onOpenNewAppelFonds}
                />
              ))}
            </div>
          </div>
        ) : null
      )}
    </div>
  );
}

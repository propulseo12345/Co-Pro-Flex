'use client';

import { useMemo, useState } from 'react';
import { Plus, Filter, ChevronDown, FileText } from 'lucide-react';
import { BudgetStatut } from '@/types/enums/statuts';
import { BudgetCard, BudgetCardData } from './BudgetCard';
import styles from './Budget.module.css';

interface BudgetsListProps {
  budgets: BudgetCardData[];
  selectedYear?: number;
  filterType?: 'fonctionnement' | 'travaux' | 'all';
  onEdit?: (budget: BudgetCardData) => void;
  onLinkToAG?: (budget: BudgetCardData) => void;
  onTransform?: (budget: BudgetCardData) => void;
  onDelete?: (budget: BudgetCardData) => void;
  onSelect?: (budget: BudgetCardData) => void;
  onCreateBudget?: () => void;
}

export function BudgetsList({
  budgets,
  selectedYear,
  filterType = 'all',
  onEdit,
  onLinkToAG,
  onTransform,
  onDelete,
  onSelect,
  onCreateBudget,
}: BudgetsListProps) {
  const [filterStatut, setFilterStatut] = useState<BudgetStatut | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Filtrer les budgets
  const filteredBudgets = useMemo(() => {
    return budgets.filter((b) => {
      // Filtre par annee
      if (selectedYear && b.annee !== selectedYear) return false;
      // Filtre par type
      if (filterType !== 'all' && b.type !== filterType) return false;
      // Filtre par statut
      if (filterStatut !== 'all' && b.statut !== filterStatut) return false;
      return true;
    });
  }, [budgets, selectedYear, filterType, filterStatut]);

  // Grouper par annee
  const budgetsByYear = useMemo(() => {
    const grouped: Record<number, BudgetCardData[]> = {};
    filteredBudgets.forEach((b) => {
      if (!grouped[b.annee]) {
        grouped[b.annee] = [];
      }
      grouped[b.annee].push(b);
    });
    // Trier par annee decroissante
    return Object.entries(grouped)
      .sort(([a], [b]) => Number(b) - Number(a))
      .map(([year, items]) => ({ year: Number(year), budgets: items }));
  }, [filteredBudgets]);

  // Stats pour les filtres
  const stats = useMemo(() => {
    const typeFiltered = filterType === 'all'
      ? budgets
      : budgets.filter(b => b.type === filterType);

    const yearFiltered = selectedYear
      ? typeFiltered.filter(b => b.annee === selectedYear)
      : typeFiltered;

    return {
      total: yearFiltered.length,
      brouillons: yearFiltered.filter(b => b.statut === BudgetStatut.BROUILLON).length,
      enAttente: yearFiltered.filter(b => b.statut === BudgetStatut.EN_ATTENTE_APPROBATION).length,
      approuves: yearFiltered.filter(b => b.statut === BudgetStatut.APPROUVE).length,
    };
  }, [budgets, selectedYear, filterType]);

  if (budgets.length === 0) {
    return (
      <div className={styles.budgetsListEmpty}>
        <div className={styles.budgetsListEmptyIcon}>
          <FileText size={48} aria-hidden="true" />
        </div>
        <h3 className={styles.budgetsListEmptyTitle}>Aucun budget</h3>
        <p className={styles.budgetsListEmptyText}>
          Commencez par creer votre premier budget previsionnel.
        </p>
        {onCreateBudget && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={onCreateBudget}
          >
            <Plus size={16} aria-hidden="true" />
            Creer un budget
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={styles.budgetsList}>
      {/* En-tete avec filtres */}
      <div className={styles.budgetsListHeader}>
        <div className={styles.budgetsListTitle}>
          <h2>Budgets {selectedYear || ''}</h2>
          <span className={styles.budgetsListCount}>
            {filteredBudgets.length} budget{filteredBudgets.length > 1 ? 's' : ''}
          </span>
        </div>

        <div className={styles.budgetsListActions}>
          {/* Bouton filtres */}
          <button
            type="button"
            className={`btn btn-secondary ${showFilters ? styles.active : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} aria-hidden="true" />
            Filtres
            {filterStatut !== 'all' && (
              <span className={styles.filterBadge}>1</span>
            )}
            <ChevronDown size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Panneau de filtres */}
      {showFilters && (
        <div className={styles.budgetsListFilters}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Statut</label>
            <div className={styles.filterChips}>
              <button
                type="button"
                className={`${styles.filterChip} ${filterStatut === 'all' ? styles.active : ''}`}
                onClick={() => setFilterStatut('all')}
              >
                Tous ({stats.total})
              </button>
              <button
                type="button"
                className={`${styles.filterChip} ${filterStatut === BudgetStatut.BROUILLON ? styles.active : ''}`}
                onClick={() => setFilterStatut(BudgetStatut.BROUILLON)}
              >
                Brouillons ({stats.brouillons})
              </button>
              <button
                type="button"
                className={`${styles.filterChip} ${filterStatut === BudgetStatut.EN_ATTENTE_APPROBATION ? styles.active : ''}`}
                onClick={() => setFilterStatut(BudgetStatut.EN_ATTENTE_APPROBATION)}
              >
                En attente ({stats.enAttente})
              </button>
              <button
                type="button"
                className={`${styles.filterChip} ${filterStatut === BudgetStatut.APPROUVE ? styles.active : ''}`}
                onClick={() => setFilterStatut(BudgetStatut.APPROUVE)}
              >
                Approuves ({stats.approuves})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Liste des budgets groupes par annee */}
      {filteredBudgets.length === 0 ? (
        <div className={styles.budgetsListNoResults}>
          <p>Aucun budget ne correspond aux filtres selectionnes.</p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setFilterStatut('all')}
          >
            Reinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className={styles.budgetsListContent}>
          {budgetsByYear.map(({ year, budgets: yearBudgets }) => (
            <div key={year} className={styles.budgetsYearGroup}>
              {!selectedYear && (
                <h3 className={styles.budgetsYearTitle}>
                  Exercice {year}
                  <span className={styles.budgetsYearCount}>
                    {yearBudgets.length} budget{yearBudgets.length > 1 ? 's' : ''}
                  </span>
                </h3>
              )}
              <div className={styles.budgetsGrid}>
                {yearBudgets.map((budget) => (
                  <BudgetCard
                    key={budget.id}
                    budget={budget}
                    onEdit={onEdit}
                    onLinkToAG={onLinkToAG}
                    onTransform={onTransform}
                    onDelete={onDelete}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

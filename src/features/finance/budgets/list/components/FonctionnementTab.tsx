'use client';

import {
  BudgetAlerts,
  BudgetSummaryCards,
  BudgetChart,
  BudgetProjection,
  BudgetPostesGrid,
  BudgetDepensesTable,
  BudgetsList,
} from '@/components/features/finance/Budget';
import type { PosteBudget } from '@/components/features/finance/Budget/types';
import styles from '@/app/(dashboard)/finance/budgets/budgets.module.css';

interface FonctionnementTabProps {
  budgets: any[];
  selectedYear: number;
  budgetAnnuelVote: number;
  postesBudget: any[];
  totals: any;
  postesEnAlerte: any[];
  posteActifChart: PosteBudget | null;
  depensesFiltrees: any[];
  onEditBudget: (budget: any) => void;
  onLinkToAG: (budget: any) => void;
  onTransformBudget: (budget: any) => void;
  onDeleteBudget: (budget: any) => void;
  onSelectBudget: (budget: any) => void;
  onCreateBudget: () => void;
  onSelectPoste: (poste: PosteBudget | null) => void;
  onSelectDepense: (depense: any | null) => void;
  onPosteChartSelect: (poste: PosteBudget | null) => void;
}

export function FonctionnementTab({
  budgets,
  selectedYear,
  budgetAnnuelVote,
  postesBudget,
  totals,
  postesEnAlerte,
  posteActifChart,
  depensesFiltrees,
  onEditBudget,
  onLinkToAG,
  onTransformBudget,
  onDeleteBudget,
  onSelectBudget,
  onCreateBudget,
  onSelectPoste,
  onSelectDepense,
  onPosteChartSelect,
}: FonctionnementTabProps) {
  return (
    <div className={styles.content}>
      <BudgetsList
        budgets={budgets}
        selectedYear={selectedYear}
        filterType="fonctionnement"
        onEdit={onEditBudget}
        onLinkToAG={onLinkToAG}
        onTransform={onTransformBudget}
        onDelete={onDeleteBudget}
        onSelect={onSelectBudget}
        onCreateBudget={onCreateBudget}
      />

      <BudgetAlerts postesEnAlerte={postesEnAlerte} />

      <BudgetSummaryCards
        budgetAnnuelVote={budgetAnnuelVote}
        totalConsomme={totals.totalConsomme}
        budgetRestant={totals.budgetRestant}
      />

      <div className={styles.chartAndProjection}>
        <BudgetChart
          postesBudget={postesBudget}
          budgetAnnuelVote={budgetAnnuelVote}
          totalConsomme={totals.totalConsomme}
          budgetRestant={totals.budgetRestant}
          posteActif={posteActifChart}
          onPosteSelect={onPosteChartSelect}
        />
        <BudgetProjection
          budgetAnnuelVote={budgetAnnuelVote}
          totalConsomme={totals.totalConsomme}
          projectedYearEnd={totals.projectedYearEnd}
          projectedDifference={totals.projectedDifference}
          monthsElapsed={totals.monthsElapsed}
          monthsRemaining={totals.monthsRemaining}
          avgMonthlyConsumption={totals.avgMonthlyConsumption}
          projectionMin={totals.projectionMin}
          projectionMax={totals.projectionMax}
          fiabiliteNiveau={totals.fiabiliteNiveau}
        />
      </div>

      <BudgetPostesGrid postesBudget={postesBudget} onSelectPoste={onSelectPoste} />

      <BudgetDepensesTable
        depenses={depensesFiltrees}
        postesBudget={postesBudget}
        onSelectDepense={onSelectDepense}
      />
    </div>
  );
}

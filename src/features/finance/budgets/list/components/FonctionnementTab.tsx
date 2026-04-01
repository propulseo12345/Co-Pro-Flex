'use client';

import {
  BudgetOverviewHero,
  BudgetProjectionCard,
  BudgetPostesList,
  BudgetDepensesTable,
} from '@/components/features/finance/Budget';
import { getExercicesList } from '@/lib/dates';
import type { PosteBudget, PosteBudgetData } from '@/components/features/finance/Budget/types';
import type { BudgetWithStatus } from '@/hooks/modules/useBudget';
import type { DepenseEtendue } from '@/types/models/finance';
import styles from './FonctionnementTab.module.css';

const AVAILABLE_YEARS = getExercicesList(4).map(y => parseInt(y));

interface BudgetTotals {
  totalConsomme: number;
  budgetRestant: number;
  projectedYearEnd: number;
  projectedDifference: number;
  monthsElapsed: number;
  monthsRemaining: number;
  avgMonthlyConsumption: number;
  fiabiliteNiveau: 'faible' | 'moyenne' | 'bonne';
}

interface FonctionnementTabProps {
  budgets: BudgetWithStatus[];
  selectedYear: number;
  onYearChange: (year: number) => void;
  budgetAnnuelVote: number;
  postesBudget: PosteBudgetData[];
  totals: BudgetTotals;
  postesEnAlerte: PosteBudgetData[];
  posteActifChart: PosteBudget | null;
  depensesFiltrees: DepenseEtendue[];
  onEditBudget: (budget: BudgetWithStatus) => void;
  onLinkToAG: (budget: BudgetWithStatus) => void;
  onTransformBudget: (budget: BudgetWithStatus) => void;
  onDeleteBudget: (budget: BudgetWithStatus) => void;
  onSelectBudget: (budget: BudgetWithStatus) => void;
  onCreateBudget: () => void;
  onSelectPoste: (poste: PosteBudget | null) => void;
  onSelectDepense: (depense: DepenseEtendue | null) => void;
  onPosteChartSelect: (poste: PosteBudget | null) => void;
}

export function FonctionnementTab({
  budgets,
  selectedYear,
  onYearChange,
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
    <div>
      <div className={styles.exerciceBar}>
        <div className={styles.yearPill}>
          <span className={styles.dot} />
          Exercice {selectedYear}
        </div>
        <select
          className={styles.yearSelect}
          value={selectedYear}
          onChange={(e) => onYearChange(Number(e.target.value))}
        >
          {AVAILABLE_YEARS.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      <BudgetOverviewHero
        budgetAnnuelVote={budgetAnnuelVote}
        totalConsomme={totals.totalConsomme}
        budgetRestant={totals.budgetRestant}
        postesEnAlerte={postesEnAlerte.length}
        postesEnAlerteLabels={postesEnAlerte.map((p: PosteBudgetData) => p.label).join(', ')}
        postesBudget={postesBudget}
      />

      <BudgetProjectionCard
        budgetAnnuelVote={budgetAnnuelVote}
        totalConsomme={totals.totalConsomme}
        projectedYearEnd={totals.projectedYearEnd}
        projectedDifference={totals.projectedDifference}
        monthsElapsed={totals.monthsElapsed}
        monthsRemaining={totals.monthsRemaining}
        avgMonthlyConsumption={totals.avgMonthlyConsumption}
        fiabiliteNiveau={totals.fiabiliteNiveau}
      />

      <BudgetPostesList
        postesBudget={postesBudget}
        depenses={depensesFiltrees.map((d: DepenseEtendue) => ({
          id: d.id,
          libelle: d.libelle,
          date: d.date,
          montant: d.montant,
          poste: d.poste as PosteBudget | undefined,
          compteCharge: d.compteId || '',
          fournisseur: d.fournisseur || '',
          statut: d.statut || '',
          pieceJointe: d.pieceJointe || d.pieceJointeDetails?.fichierNom || '',
          montantHT: d.montantHT,
          tauxTVA: d.tauxTVA,
          montantTVA: d.montantTVA,
        }))}
        onSelectDepense={(dep) => {
          const original = depensesFiltrees.find((d: DepenseEtendue) => d.id === dep.id);
          if (original) onSelectDepense(original);
        }}
      />

      <BudgetDepensesTable
        depenses={depensesFiltrees}
        postesBudget={postesBudget}
        onSelectDepense={onSelectDepense}
      />
    </div>
  );
}

'use client';

import {
  BudgetOverviewHero,
  BudgetProjectionCard,
  BudgetPostesList,
  BudgetDepensesTable,
} from '@/components/features/finance/Budget';
import type { PosteBudget } from '@/components/features/finance/Budget/types';

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
    <div>
      <BudgetOverviewHero
        budgetAnnuelVote={budgetAnnuelVote}
        totalConsomme={totals.totalConsomme}
        budgetRestant={totals.budgetRestant}
        postesEnAlerte={postesEnAlerte.length}
        postesEnAlerteLabels={postesEnAlerte.map((p: any) => p.label).join(', ')}
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
        depenses={depensesFiltrees.map((d: any) => ({
          id: d.id,
          libelle: d.libelle,
          date: d.date,
          montant: d.montant,
          poste: d.poste,
          compteCharge: d.compteCharge || d.compteId || '',
          fournisseur: d.fournisseur || '',
          statut: d.statut || '',
          pieceJointe: d.pieceJointe || d.pieceJointeDetails?.fichierNom || '',
          montantHT: d.montantHT,
          tauxTVA: d.tauxTVA,
          montantTVA: d.montantTVA,
        }))}
        onSelectDepense={(dep) => {
          const original = depensesFiltrees.find((d: any) => d.id === dep.id);
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

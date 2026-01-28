'use client';

/**
 * Hook principal pour la gestion des budgets
 * Source de vérité: Supabase uniquement
 *
 * Ce hook orchestre useBudgetData et useBudgetMutations
 * et adapte les données DB aux types frontend.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { getCurrentBusinessYear } from '@/lib/time/period';
import { useBudgetData } from './useBudgetData';
import { useBudgetMutations } from './useBudgetMutations';
import type { BudgetOverview, BudgetLineOverview, ExpenseDetail, BudgetType } from '@/lib/budget/api';
import { mapBudgetStatusFromDb, mapExpenseStatusFromDb } from '@/lib/budget/api';
import {
  BudgetTab,
  PosteBudget,
  PosteBudgetData,
  BudgetTravaux,
  NouveauBudgetForm,
  CoproprietaireALUR,
  getProgressColor,
  getProgressPercentage,
  POSTE_LABELS,
} from '@/components/features/finance/Budget/types';
import type { PosteEditorData } from '@/components/features/finance/Budget/PosteEditor';
import { BudgetStatut, DepenseStatut } from '@/types/enums/statuts';
import type { DepenseEtendue } from '@/data/mock';

// ============================================================================
// Types
// ============================================================================

export interface BudgetN1Data {
  year: number;
  postes: PosteEditorData[];
  total: number;
}

export interface BudgetWithStatus {
  id: string;
  annee: number;
  type: 'fonctionnement' | 'travaux';
  nom?: string;
  statut: BudgetStatut;
  montantTotal: number;
  resolutionId?: string;
  postes?: PosteEditorData[];
  createdAt?: string;
}

// ============================================================================
// Mappers: DB → Frontend
// ============================================================================

function mapBudgetTypeToFrontend(type: BudgetType): 'fonctionnement' | 'travaux' {
  switch (type) {
    case 'current':
      return 'fonctionnement';
    case 'works':
    case 'alur':
      return 'travaux';
    default:
      return 'fonctionnement';
  }
}

function mapBudgetToFrontend(budget: BudgetOverview): BudgetWithStatus {
  return {
    id: budget.id,
    annee: budget.period_year,
    type: mapBudgetTypeToFrontend(budget.budget_type),
    nom: budget.name,
    statut: mapBudgetStatusFromDb(budget.status),
    montantTotal: Number(budget.total_planned),
    createdAt: budget.created_at,
  };
}

function mapLineToPosteData(line: BudgetLineOverview): PosteBudgetData {
  const code = (line.code || 'divers') as PosteBudget;
  return {
    poste: code,
    label: line.label || POSTE_LABELS[code] || code,
    budgetVote: Number(line.planned_amount),
    consomme: Number(line.validated_spent),
  };
}

function mapExpenseToDepense(expense: ExpenseDetail): DepenseEtendue {
  return {
    id: expense.id,
    date: expense.tx_date,
    libelle: expense.label,
    fournisseur: expense.fournisseur || '',
    montant: Number(expense.amount),
    compteId: '',
    recuperable: 0,
    deductible: 0,
    poste: (expense.line_code || 'divers') as PosteBudget,
    montantHT: expense.montant_ht ? Number(expense.montant_ht) : undefined,
    tauxTVA: expense.taux_tva ? Number(expense.taux_tva) as 0 | 5.5 | 10 | 20 : undefined,
    montantTVA: expense.montant_ht && expense.taux_tva
      ? Number(expense.amount) - Number(expense.montant_ht)
      : undefined,
    pieceJointe: expense.piece_jointe || undefined,
    statut: mapExpenseStatusFromDb(expense.status),
    dateCreation: expense.created_at,
    dateDerniereModification: expense.updated_at,
    dateValidation: expense.validated_at || undefined,
    commentaireRejet: expense.rejection_comment || undefined,
  };
}

// ============================================================================
// Hook principal
// ============================================================================

export function useBudget() {
  // ============================================================================
  // Data from Supabase
  // ============================================================================
  const [selectedYear, setSelectedYear] = useState(getCurrentBusinessYear());

  const {
    budgets: rawBudgets,
    lines: rawLines,
    expenses: rawExpenses,
    isLoading,
    error,
    refresh,
    loadBudgetLines,
    loadBudgetExpenses,
    getAccountingPeriod,
  } = useBudgetData({ periodYear: selectedYear });

  const mutations = useBudgetMutations({ onSuccess: refresh });

  // ============================================================================
  // UI State
  // ============================================================================
  const [activeTab, setActiveTab] = useState<BudgetTab>('fonctionnement');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedBudgetTravaux, setSelectedBudgetTravaux] = useState<BudgetTravaux | null>(null);
  const [selectedPoste, setSelectedPoste] = useState<PosteBudget | null>(null);
  const [selectedDepense, setSelectedDepense] = useState<DepenseEtendue | null>(null);
  const [viewingDocument, setViewingDocument] = useState<string | null>(null);
  const [showTravauxDetailModal, setShowTravauxDetailModal] = useState(false);
  const [selectedTravauxDetail, setSelectedTravauxDetail] = useState<BudgetTravaux | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'historique' | 'etapes' | 'prestataires' | 'documents'>('historique');
  const [selectedCoproprietaireALUR, setSelectedCoproprietaireALUR] = useState<CoproprietaireALUR | null>(null);
  const [showCreateBudgetModal, setShowCreateBudgetModal] = useState(false);
  const [showTransformBudgetModal, setShowTransformBudgetModal] = useState(false);
  const [newBudgetForm, setNewBudgetForm] = useState<Partial<NouveauBudgetForm>>({});
  const [showLinkToAGModal, setShowLinkToAGModal] = useState(false);
  const [selectedBudgetForLink, setSelectedBudgetForLink] = useState<BudgetWithStatus | null>(null);
  const [selectedBudgetForTransform, setSelectedBudgetForTransform] = useState<BudgetWithStatus | null>(null);
  const [showNewAppelFondsModal, setShowNewAppelFondsModal] = useState(false);
  const [selectedTravauxForAppel, setSelectedTravauxForAppel] = useState<BudgetTravaux | null>(null);
  const [showDepenseEditorModal, setShowDepenseEditorModal] = useState(false);
  const [showInvoicePickerModal, setShowInvoicePickerModal] = useState(false);
  const [editingDepense, setEditingDepense] = useState<DepenseEtendue | null>(null);
  const [depenseEditorMode, setDepenseEditorMode] = useState<'create' | 'edit'>('create');
  const [posteActifChart, setPosteActifChart] = useState<PosteBudget | null>(null);

  // ============================================================================
  // Mapped Data
  // ============================================================================

  // Budgets mapped to frontend format
  const budgets = useMemo((): BudgetWithStatus[] => {
    return rawBudgets.map(mapBudgetToFrontend);
  }, [rawBudgets]);

  // Current fonctionnement budget for selected year
  const budgetFonctionnementAnnee = useMemo(() => {
    return rawBudgets.find(b => b.budget_type === 'current' && b.period_year === selectedYear);
  }, [rawBudgets, selectedYear]);

  const budgetAnnuelVote = budgetFonctionnementAnnee?.total_planned
    ? Number(budgetFonctionnementAnnee.total_planned)
    : 0;

  // Postes budget mapped to frontend format
  const postesBudget = useMemo((): PosteBudgetData[] => {
    return rawLines.map(mapLineToPosteData);
  }, [rawLines]);

  // Dépenses mapped to frontend format
  const depenses = useMemo((): DepenseEtendue[] => {
    return rawExpenses.map(mapExpenseToDepense);
  }, [rawExpenses]);

  // Travaux budgets (from raw budgets of type 'works')
  const budgetsTravaux = useMemo((): BudgetTravaux[] => {
    return rawBudgets
      .filter(b => b.budget_type === 'works')
      .map(b => ({
        id: b.id,
        titre: b.name,
        description: b.notes || '',
        budgetVote: Number(b.total_planned),
        devisAssocie: 0,
        consomme: Number(b.validated_spent),
        statut: b.status === 'validated' ? 'EN_COURS' : 'A_VENIR',
        dateVote: b.validated_at || b.created_at,
        cleRepartitionId: '1',
        appelsDeFonds: [],
      })) as BudgetTravaux[];
  }, [rawBudgets]);

  // ============================================================================
  // Computed Values
  // ============================================================================

  const totals = useMemo(() => {
    const totalConsomme = postesBudget.reduce((sum, p) => sum + p.consomme, 0);
    const budgetRestant = budgetAnnuelVote - totalConsomme;
    const totalBudget = budgetAnnuelVote;

    // Projection
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const monthsElapsed = currentMonth;
    const monthsRemaining = 12 - monthsElapsed;
    const avgMonthlyConsumption = monthsElapsed > 0 ? totalConsomme / monthsElapsed : 0;

    // Projection simple
    const projectionBrute = totalConsomme + (avgMonthlyConsumption * monthsRemaining);

    // Coefficient de fiabilité
    const fiabilite = Math.min(1, monthsElapsed / 6);
    const fiabiliteNiveau: 'faible' | 'moyenne' | 'bonne' =
      fiabilite < 0.33 ? 'faible' :
      fiabilite < 0.66 ? 'moyenne' : 'bonne';

    // Projection pondérée
    const projectedYearEnd = Math.round(
      fiabilite * projectionBrute + (1 - fiabilite) * budgetAnnuelVote
    );
    const projectedDifference = projectedYearEnd - budgetAnnuelVote;

    // Marge d'erreur
    const margeErreur = (1 - fiabilite) * 0.30;
    const projectionMin = Math.round(projectedYearEnd * (1 - margeErreur));
    const projectionMax = Math.round(projectedYearEnd * (1 + margeErreur));

    return {
      totalConsomme,
      budgetRestant,
      totalBudget,
      projectedYearEnd,
      projectedDifference,
      monthsElapsed,
      monthsRemaining,
      avgMonthlyConsumption,
      projectionMin,
      projectionMax,
      fiabilite,
      fiabiliteNiveau,
    };
  }, [postesBudget, budgetAnnuelVote]);

  const postesEnAlerte = useMemo(() =>
    postesBudget.filter(p => p.budgetVote > 0 && (p.consomme / p.budgetVote) * 100 >= 90),
    [postesBudget]
  );

  const dernieresDepenses = useMemo(() =>
    [...depenses]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10),
    [depenses]
  );

  const depensesFiltrees = useMemo(() => {
    if (!posteActifChart) return dernieresDepenses;
    return depenses
      .filter(d => d.poste === posteActifChart)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [depenses, dernieresDepenses, posteActifChart]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handlePosteChartSelect = useCallback((posteId: PosteBudget | null) => {
    setPosteActifChart(posteId);
  }, []);

  const handleOpenTravauxDetail = useCallback((travaux: BudgetTravaux) => {
    setSelectedTravauxDetail(travaux);
    setActiveDetailTab('historique');
    setShowTravauxDetailModal(true);
  }, []);

  const handleTransferALUR = useCallback((_montant: number, destination: 'COMPTE_COURANT' | 'BUDGET_TRAVAUX', _budgetId?: string) => {
    // TODO: Implement with Supabase
    alert(`Transfert ALUR vers ${destination === 'COMPTE_COURANT' ? 'Compte courant' : 'Budget travaux'}`);
    setShowTransferModal(false);
  }, []);

  const checkBudgetExists = useCallback((annee: number, type: 'fonctionnement' | 'travaux', excludeId?: string): BudgetWithStatus | undefined => {
    return budgets.find(b =>
      b.annee === annee &&
      b.type === type &&
      b.id !== excludeId &&
      b.statut !== BudgetStatut.REJETE
    );
  }, [budgets]);

  const handleCreateBudget = useCallback(async (form: NouveauBudgetForm): Promise<boolean> => {
    // Get accounting period for the year
    const period = await getAccountingPeriod(form.annee);
    if (!period) {
      console.error('No accounting period found for year:', form.annee);
      return false;
    }

    const budgetType: BudgetType = form.type === 'fonctionnement' ? 'current' : 'works';

    const id = await mutations.createBudget({
      period_id: period.id,
      budget_type: budgetType,
      name: form.nom || `Budget ${form.type} ${form.annee}`,
      notes: form.description,
    });

    if (id) {
      setShowCreateBudgetModal(false);
      return true;
    }
    return false;
  }, [getAccountingPeriod, mutations]);

  const handleUpdateBudget = useCallback(async (budgetId: string, updates: Partial<BudgetWithStatus>) => {
    const success = await mutations.updateBudget(budgetId, {
      name: updates.nom,
    });
    return success;
  }, [mutations]);

  const handleDeleteBudget = useCallback(async (budgetId: string) => {
    return mutations.deleteBudget(budgetId);
  }, [mutations]);

  const handleLinkToAG = useCallback(async (budgetId: string, _resolutionId: string) => {
    const success = await mutations.updateBudgetStatus(budgetId, BudgetStatut.EN_ATTENTE_APPROBATION);
    if (success) {
      setShowLinkToAGModal(false);
    }
    return success;
  }, [mutations]);

  const handleOpenLinkToAG = useCallback((budget: BudgetWithStatus) => {
    setSelectedBudgetForLink(budget);
    setShowLinkToAGModal(true);
  }, []);

  const handleOpenTransformModal = useCallback((budget: BudgetWithStatus) => {
    setSelectedBudgetForTransform(budget);
    setShowTransformBudgetModal(true);
  }, []);

  const canGenerateFundCalls = useCallback((budget: BudgetWithStatus): boolean => {
    return budget.statut === BudgetStatut.APPROUVE;
  }, []);

  const handleCreateBudgetFromResolution = useCallback(() => {
    // TODO: Implement
    setShowCreateBudgetModal(true);
  }, []);

  const handleTransformToAppele = useCallback(() => {
    // TODO: Implement fund calls generation
    alert('Budget transformé en appels de fonds !');
    setShowTransformBudgetModal(false);
  }, []);

  const handleOpenNewAppelFonds = useCallback((travaux: BudgetTravaux) => {
    setSelectedTravauxForAppel(travaux);
    setShowNewAppelFondsModal(true);
  }, []);

  const handleGenerateProchainAppel = useCallback(() => {
    // TODO: Implement
    setShowNewAppelFondsModal(false);
  }, []);

  const getBudgetN1 = useCallback((): BudgetN1Data => {
    // Return previous year budget data
    const postesN1: PosteEditorData[] = postesBudget.map(p => ({
      id: p.poste,
      libelle: p.label,
      montant: p.budgetVote,
      cleRepartitionId: '1',
    }));

    return {
      year: selectedYear - 1,
      postes: postesN1,
      total: postesN1.reduce((sum, p) => sum + p.montant, 0),
    };
  }, [postesBudget, selectedYear]);

  const calculatePendingByPoste = useCallback((poste: PosteBudget): number => {
    return depenses
      .filter(d => d.poste === poste && d.statut === DepenseStatut.EN_ATTENTE_VALIDATION)
      .reduce((sum, d) => sum + d.montant, 0);
  }, [depenses]);

  // Dépenses handlers
  const handleCreateDepense = useCallback(() => {
    setEditingDepense(null);
    setDepenseEditorMode('create');
    setShowDepenseEditorModal(true);
  }, []);

  const handleEditDepense = useCallback((depense: DepenseEtendue) => {
    setEditingDepense(depense);
    setDepenseEditorMode('edit');
    setShowDepenseEditorModal(true);
  }, []);

  const handleSaveDepense = useCallback(async (depense: DepenseEtendue) => {
    // Find the budget line for this poste
    const line = rawLines.find(l => l.code === depense.poste);
    if (!line || !budgetFonctionnementAnnee) {
      console.error('Cannot find budget line for poste:', depense.poste);
      return;
    }

    if (depenseEditorMode === 'create') {
      await mutations.createExpense({
        budget_id: budgetFonctionnementAnnee.id,
        budget_line_id: line.id,
        label: depense.libelle,
        amount: depense.montant,
        tx_date: depense.date,
        fournisseur: depense.fournisseur,
        montant_ht: depense.montantHT,
        taux_tva: depense.tauxTVA,
      });
    } else if (editingDepense) {
      await mutations.updateExpense(editingDepense.id, {
        label: depense.libelle,
        amount: depense.montant,
        tx_date: depense.date,
        fournisseur: depense.fournisseur,
        montant_ht: depense.montantHT,
        taux_tva: depense.tauxTVA,
      });
    }

    setShowDepenseEditorModal(false);
    setEditingDepense(null);
  }, [rawLines, budgetFonctionnementAnnee, depenseEditorMode, editingDepense, mutations]);

  const handleSubmitForValidation = useCallback(async (depenseId: string) => {
    await mutations.submitExpenseForValidation(depenseId);
  }, [mutations]);

  const handleValidateDepense = useCallback(async (depenseId: string) => {
    await mutations.validateExpense(depenseId);
  }, [mutations]);

  const handleRejectDepense = useCallback(async (depenseId: string, comment: string) => {
    await mutations.rejectExpense(depenseId, comment);
  }, [mutations]);

  // Auto-load budget lines for fonctionnement budget on initial load
  useEffect(() => {
    const fonctionnementBudget = rawBudgets.find(b => b.budget_type === 'current');
    if (fonctionnementBudget && !isLoading) {
      // Load lines and expenses for the default tab (fonctionnement)
      loadBudgetLines(fonctionnementBudget.id);
      loadBudgetExpenses(fonctionnementBudget.id);
    }
  }, [rawBudgets, isLoading, loadBudgetLines, loadBudgetExpenses]);

  // Load budget details when tab changes
  const handleSetActiveTab = useCallback(async (tab: BudgetTab) => {
    setActiveTab(tab);

    // Load lines for the appropriate budget
    const budget = rawBudgets.find(b => {
      if (tab === 'fonctionnement') return b.budget_type === 'current';
      if (tab === 'travaux') return b.budget_type === 'works';
      if (tab === 'alur') return b.budget_type === 'alur';
      return false;
    });

    if (budget) {
      await Promise.all([
        loadBudgetLines(budget.id),
        loadBudgetExpenses(budget.id),
      ]);
    }
  }, [rawBudgets, loadBudgetLines, loadBudgetExpenses]);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // Loading state
    isLoading,
    error,
    refresh,

    // UI State
    activeTab,
    setActiveTab: handleSetActiveTab,
    selectedYear,
    setSelectedYear,
    showTransferModal,
    setShowTransferModal,
    selectedBudgetTravaux,
    setSelectedBudgetTravaux,
    selectedPoste,
    setSelectedPoste,
    selectedDepense,
    setSelectedDepense,
    viewingDocument,
    setViewingDocument,
    showTravauxDetailModal,
    setShowTravauxDetailModal,
    selectedTravauxDetail,
    setSelectedTravauxDetail,
    activeDetailTab,
    setActiveDetailTab,
    selectedCoproprietaireALUR,
    setSelectedCoproprietaireALUR,
    showCreateBudgetModal,
    setShowCreateBudgetModal,
    showTransformBudgetModal,
    setShowTransformBudgetModal,
    newBudgetForm,
    setNewBudgetForm,

    // Data (from Supabase)
    budgetAnnuelVote,
    postesBudget,
    budgetsTravaux,
    setBudgetsTravaux: () => {}, // No-op, data comes from Supabase
    fondsALUR: { soldeActuel: 0, cotisationAnnuelle: 0, pourcentageBudget: 0, historiqueTransferts: [] }, // TODO: Implement ALUR funds
    coproprietairesALUR: [],
    resolutionsAG: [],
    dernieresDepenses,

    // Computed
    totals,
    postesEnAlerte,

    // Utilities
    getProgressColor,
    getProgressPercentage,

    // Budget handlers
    handleOpenTravauxDetail,
    handleTransferALUR,
    handleCreateBudgetFromResolution,
    handleTransformToAppele,
    handleCreateBudget,
    handleLinkToAG,
    handleOpenLinkToAG,
    handleOpenTransformModal,
    canGenerateFundCalls,
    getBudgetN1,

    // Budget list
    budgets,
    setBudgets: () => {}, // No-op, data comes from Supabase
    handleUpdateBudget,
    handleDeleteBudget,
    checkBudgetExists,
    showLinkToAGModal,
    setShowLinkToAGModal,
    selectedBudgetForLink,
    setSelectedBudgetForLink,
    selectedBudgetForTransform,
    setSelectedBudgetForTransform,

    // Appel de fonds travaux
    showNewAppelFondsModal,
    setShowNewAppelFondsModal,
    selectedTravauxForAppel,
    setSelectedTravauxForAppel,
    handleOpenNewAppelFonds,
    handleGenerateProchainAppel,

    // Dépenses
    depenses,
    setDepenses: () => {}, // No-op, data comes from Supabase
    showDepenseEditorModal,
    setShowDepenseEditorModal,
    showInvoicePickerModal,
    setShowInvoicePickerModal,
    editingDepense,
    setEditingDepense,
    depenseEditorMode,
    setDepenseEditorMode,
    calculatePendingByPoste,

    // Dépenses handlers
    handleCreateDepense,
    handleEditDepense,
    handleSaveDepense,
    handleSubmitForValidation,
    handleValidateDepense,
    handleRejectDepense,

    // Chart filtering
    posteActifChart,
    setPosteActifChart,
    depensesFiltrees,
    handlePosteChartSelect,

    // Mutation state
    isSaving: mutations.isSaving,
  };
}

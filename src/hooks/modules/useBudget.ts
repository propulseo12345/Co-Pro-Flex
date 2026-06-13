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
import * as financeApi from '@/lib/finance/api';
import { uploadDocument } from '@/lib/documents/api';
import { useCopro } from '@/providers/CoproContext';
import { createClient } from '@/lib/supabase/client';
import type { BudgetOverview, BudgetLineOverview, ExpenseDetail, BudgetType } from '@/lib/budget/api';
import { mapBudgetStatusFromDb, mapExpenseStatusFromDb } from '@/lib/budget/api';
import {
  BudgetTab,
  PosteBudget,
  PosteBudgetData,
  BudgetTravaux,
  NouveauBudgetForm,
  CoproprietaireALUR,
  FondsALUR,
  TransfertALUR,
  getProgressColor,
  getProgressPercentage,
  POSTE_LABELS,
  inferPosteCode,
} from '@/components/features/finance/Budget/types';
import type { PosteEditorData } from '@/components/features/finance/Budget/PosteEditor';
import { BudgetStatut, DepenseStatut } from '@/types/enums/statuts';
import type { DepenseEtendue } from '@/types/models/finance';
import * as scheduleApi from '@/lib/budget/payment-schedules.api';
import { computeAmounts, applyRetention, RETENTION_DURATION_MONTHS } from '@/lib/constants/payment-schedule-templates';

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
  const code = (line.code as PosteBudget) || inferPosteCode(line.label || '');
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createUntypedClient = () => createClient() as any;

export function useBudget() {
  // ============================================================================
  // Context
  // ============================================================================
  const { currentCoproId } = useCopro();

  // ============================================================================
  // Data from Supabase
  // ============================================================================
  const [selectedYear, setSelectedYear] = useState(getCurrentBusinessYear());
  const [coproprietairesALUR, setCoproprietairesALUR] = useState<CoproprietaireALUR[]>([]);
  const [travauxCalls, setTravauxCalls] = useState<financeApi.CallForFundsOverview[]>([]);
  const [allWorksRaw, setAllWorksRaw] = useState<import('@/lib/budget/api').BudgetOverview[]>([]);
  // ALUR (migration 0037) : rappels de virement, solde 105 cumulé (source unique), historique
  const [pendingAlurCash, setPendingAlurCash] = useState<import('@/lib/budget/api').PendingAlurCash[]>([]);
  const [alurFundBalance, setAlurFundBalance] = useState(0);
  const [alurHistory, setAlurHistory] = useState<import('@/lib/budget/api').AlurTransferHistoryRow[]>([]);

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
  // Load ALUR Copropriétaires
  // ============================================================================
  const loadCoproprietairesALUR = useCallback(async () => {
    if (!currentCoproId) {
      setCoproprietairesALUR([]);
      return;
    }

    const supabase = createUntypedClient();

    try {
      const { data, error: queryError } = await supabase
        .from('v_alur_lot_contributions')
        .select('*')
        .eq('copro_id', currentCoproId)
        .order('lot_ref', { ascending: true });

      if (queryError) {
        console.error('[useBudget] Error loading ALUR copropriétaires:', queryError);
        setCoproprietairesALUR([]);
        return;
      }

      // Map to CoproprietaireALUR type
      const mapped: CoproprietaireALUR[] = (data || []).map((row: Record<string, unknown>) => {
        const cotisation = Number(row.lot_cotisation_annuelle) || 0;
        const solde = Number(row.lot_solde_alur) || 0;
        const year = Number(row.period_year) || new Date().getFullYear();

        // Determine status based on balance vs expected contribution
        // If solde >= cotisation, payment is up to date
        const statut: 'PAYEE' | 'EN_ATTENTE' | 'EN_RETARD' =
          solde >= cotisation ? 'PAYEE' :
          solde > 0 ? 'EN_ATTENTE' : 'EN_RETARD';

        return {
          id: row.lot_id as string,
          nom: row.owner_name as string || 'Non assigné',
          lot: row.lot_ref as string,
          tantiemes: Number(row.tantiemes_generaux) || 0,
          cotisationAnnuelle: cotisation,
          totalContributions: solde,
          historiqueContributions: [{
            id: `${row.lot_id}-${year}`,
            date: new Date().toISOString().split('T')[0],
            montant: cotisation,
            periode: `${year}`,
            statut,
          }],
          historiqueProprietaires: [{
            proprietaire: row.owner_name as string || 'Non assigné',
            dateDebut: '2024-01-01',
            contributionsCumulees: solde,
          }],
        };
      });

      setCoproprietairesALUR(mapped);
    } catch (err) {
      console.error('[useBudget] Error loading ALUR copropriétaires:', err);
      setCoproprietairesALUR([]);
    }
  }, [currentCoproId]);

  // Load ALL works budgets (all years — travaux live by status, not by year)
  const loadAllWorks = useCallback(async () => {
    if (!currentCoproId) return;
    try {
      const { listBudgets } = await import('@/lib/budget/api');
      const all = await listBudgets(currentCoproId);
      setAllWorksRaw(all.filter(b => b.budget_type === 'works'));
    } catch {
      setAllWorksRaw([]);
    }
  }, [currentCoproId]);

  useEffect(() => { loadAllWorks(); }, [loadAllWorks]);

  // Load calls linked to works budgets
  const loadTravauxCalls = useCallback(async () => {
    if (!currentCoproId) return;
    try {
      const result = await financeApi.listCalls(currentCoproId);
      if (result.data) {
        setTravauxCalls(result.data.filter(c => c.budget_id !== null));
      }
    } catch {
      setTravauxCalls([]);
    }
  }, [currentCoproId]);

  useEffect(() => { loadTravauxCalls(); }, [loadTravauxCalls]);

  // Charge les extras ALUR (rappels virement + solde 105 cumulé + historique des affectations)
  const loadAlurExtras = useCallback(async () => {
    if (!currentCoproId) { setPendingAlurCash([]); setAlurFundBalance(0); setAlurHistory([]); return; }
    try {
      const api = await import('@/lib/budget/api');
      const [pending, balance, history] = await Promise.all([
        api.listPendingAlurCash(currentCoproId),
        api.getAlurFundBalance(currentCoproId),
        api.listAlurTransfersHistory(currentCoproId),
      ]);
      setPendingAlurCash(pending);
      setAlurFundBalance(balance);
      setAlurHistory(history);
    } catch (err) {
      console.error('[useBudget] Error loading ALUR extras:', err);
    }
  }, [currentCoproId]);

  useEffect(() => { loadAlurExtras(); }, [loadAlurExtras]);

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
  const [activeDetailTab, setActiveDetailTab] = useState<'echeancier' | 'documents' | 'historique'>('echeancier');
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

  // Current fonctionnement budget for selected year (latest version if multiple)
  const budgetFonctionnementAnnee = useMemo(() => {
    return rawBudgets
      .filter(b => b.budget_type === 'current' && b.period_year === selectedYear)
      .sort((a, b) => (b.version ?? 1) - (a.version ?? 1))[0] ?? undefined;
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

  // Travaux budgets (ALL years, grouped by status) enriched with real calls
  const budgetsTravaux = useMemo((): BudgetTravaux[] => {
    return allWorksRaw.map(b => {
      const linkedCalls = travauxCalls.filter(c => c.budget_id === b.id);
      // Map DB status to frontend: draft → A_VENIR, validated → EN_COURS, closed → TERMINE
      const statut = b.status === 'closed' ? 'TERMINE' as const
        : b.status === 'validated' ? 'EN_COURS' as const
        : 'A_VENIR' as const;
      return {
        id: b.id,
        titre: b.name,
        description: b.notes || '',
        budgetVote: Number(b.total_planned),
        devisAssocie: 0,
        consomme: Number(b.validated_spent),
        statut,
        dateVote: b.validated_at || b.created_at,
        cleRepartitionId: '1',
        sourceAG: (b as unknown as Record<string, unknown>).source_ag_id ? true : false,
        appelsDeFonds: linkedCalls.map(c => ({
          id: c.id,
          numero: c.trimester ?? 0,
          montant: Number(c.total_amount),
          date: c.issue_date,
          statut: c.status === 'paid' ? 'PAYE' as const
            : c.status === 'issued' || c.status === 'partially_paid' ? 'ENVOYE' as const
            : 'EN_ATTENTE' as const,
          totalPaid: Number(c.total_paid),
          totalUnpaid: Number(c.total_unpaid),
          label: c.label,
          callStatus: c.status,
        })),
      };
    }) as BudgetTravaux[];
  }, [allWorksRaw, travauxCalls]);

  // ALUR funds : soldeActuel = solde CUMULÉ du compte 105 (source unique, cf. v_alur_fund_balance) ;
  // cotisationAnnuelle/% restent indicatifs depuis le budget ALUR de l'exercice ;
  // historiqueTransferts dérivé des affectations réelles (v_alur_transfers_history).
  const fondsALUR = useMemo((): FondsALUR => {
    const alurBudget = rawBudgets.find(b => b.budget_type === 'alur');
    const cotisation = alurBudget ? Number(alurBudget.total_planned) : 0;
    const pourcentage = alurBudget && budgetAnnuelVote > 0 ? (cotisation / budgetAnnuelVote) * 100 : 0;
    const historiqueTransferts: TransfertALUR[] = alurHistory.map(h => ({
      id: h.id,
      montant: Number(h.amount),
      date: h.transfer_date ?? '',
      destination: h.destination === 'operating' ? 'COMPTE_COURANT' : 'BUDGET_TRAVAUX',
      budgetTravauxId: h.budget_id ?? undefined,
      description: h.notes ?? '',
    }));
    return {
      soldeActuel: alurFundBalance,
      cotisationAnnuelle: cotisation,
      pourcentageBudget: Math.round(pourcentage * 10) / 10,
      historiqueTransferts,
    };
  }, [rawBudgets, budgetAnnuelVote, alurFundBalance, alurHistory]);

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
    setActiveDetailTab('echeancier');
    setShowTravauxDetailModal(true);
  }, []);

  // Affectation du fonds ALUR à un budget travaux voté (D105/C705 via post_alur_transfer).
  const handleTransferALUR = useCallback(async (
    montant: number,
    _destination: 'COMPTE_COURANT' | 'BUDGET_TRAVAUX',
    budgetId?: string
  ) => {
    if (!currentCoproId) { alert('Aucune copropriété sélectionnée.'); return; }
    if (!budgetId) { alert('Veuillez sélectionner un budget travaux voté comme destination.'); return; }
    try {
      const { postAlurTransfer } = await import('@/lib/budget/api');
      await postAlurTransfer(currentCoproId, budgetId, montant, new Date().toISOString().split('T')[0]);
      setShowTransferModal(false);
      // Pas de refresh() : l'affectation D105/C705 ne touche ni lignes ni dépenses du budget courant.
      await Promise.all([loadAllWorks(), loadAlurExtras()]);
    } catch (err) {
      alert(`Affectation impossible : ${err instanceof Error ? err.message : 'erreur inconnue'}`);
    }
  }, [currentCoproId, loadAllWorks, loadAlurExtras]);

  // Marque le virement de trésorerie réel (Livret A → courant) comme effectué (D512/C502).
  const handleSettleAlurCash = useCallback(async (transferId: string) => {
    try {
      const { settleAlurTransferCash } = await import('@/lib/budget/api');
      await settleAlurTransferCash(transferId, new Date().toISOString().split('T')[0]);
      await loadAlurExtras();
    } catch (err) {
      alert(`Règlement impossible : ${err instanceof Error ? err.message : 'erreur inconnue'}`);
    }
  }, [loadAlurExtras]);

  const checkBudgetExists = useCallback((annee: number, type: 'fonctionnement' | 'travaux', excludeId?: string): BudgetWithStatus | undefined => {
    return budgets.find(b =>
      b.annee === annee &&
      b.type === type &&
      b.id !== excludeId &&
      b.statut !== BudgetStatut.REJETE
    );
  }, [budgets]);

  const handleCreateBudget = useCallback(async (form: NouveauBudgetForm): Promise<boolean> => {
    if (!currentCoproId) return false;
    try {
      const period = await getAccountingPeriod(form.annee);
      if (!period) {
        alert(`Aucune période comptable trouvée pour l'année ${form.annee}`);
        return false;
      }

      const budgetType: BudgetType = form.type === 'fonctionnement' ? 'current' : 'works';
      const budgetName = form.nom || `Budget ${form.type} ${form.annee}`;

      // 1. Create budget via proven mutations path
      const id = await mutations.createBudget({
        period_id: period.id,
        budget_type: budgetType,
        name: budgetName,
        notes: form.description,
      });

      if (!id) {
        alert('Erreur lors de la création du budget');
        return false;
      }

      // 2. Create budget line with total amount if > 0
      if (form.montantTotal > 0) {
        const supabase = createUntypedClient();
        const accountCode = budgetType === 'works' ? '672' : '701';

        const { data: acc } = await supabase
          .from('accounts')
          .select('id')
          .eq('copro_id', currentCoproId)
          .eq('code', accountCode)
          .maybeSingle();

        const { data: repKey } = await supabase
          .from('repartition_keys')
          .select('id')
          .eq('copro_id', currentCoproId)
          .limit(1)
          .maybeSingle();

        if (acc && repKey) {
          await mutations.createLine({
            budget_id: id,
            account_id: acc.id,
            repartition_key_id: repKey.id,
            label: budgetName,
            amount: form.montantTotal,
          });
        }
      }

      // 3. Upload devis documents to Supabase Storage + GED
      if (form.devisDocuments && form.devisDocuments.length > 0) {
        for (const devis of form.devisDocuments) {
          if (!devis.file) continue;
          try {
            const doc = await uploadDocument(devis.file, currentCoproId, 'devis', {
              sourceModule: 'finance',
              title: devis.nom,
              description: `Devis ${devis.montant.toLocaleString('fr-FR')} € — ${form.nom || 'Budget travaux'}`,
              year: form.annee,
              tags: ['budget-travaux', id],
            });
            // Link document to budget
            if (doc && (doc as any).id) {
              const supabase = createUntypedClient();
              await supabase.from('documents').update({ budget_id: id }).eq('id', (doc as any).id);
            }
          } catch (uploadErr) {
            // Non-bloquant : le budget est créé, on log l'erreur upload
            // Non-bloquant: erreur upload devis
          }
        }
      }

      // 4. Create payment schedule if configured
      if (form.paymentScheduleConfig && form.paymentScheduleConfig.phases.length > 0) {
        try {
          let phasesConfig = form.paymentScheduleConfig.phases.map(p => ({
            label: p.label,
            percentage: p.percentage,
          }));

          if (form.paymentScheduleConfig.withRetention) {
            phasesConfig = applyRetention(phasesConfig);
          }

          const amounts = computeAmounts(phasesConfig, form.montantTotal);

          // Find last non-retention due date for retention release calculation
          const lastDueDate = form.paymentScheduleConfig.phases
            .filter(p => p.dueDate)
            .map(p => p.dueDate!)
            .sort()
            .pop();

          const inputs = phasesConfig.map((phase, i) => {
            const isRetention = phase.label === 'Retenue de garantie';
            let retentionReleaseDate: string | undefined;
            if (isRetention && lastDueDate) {
              const d = new Date(lastDueDate);
              d.setMonth(d.getMonth() + RETENTION_DURATION_MONTHS);
              retentionReleaseDate = d.toISOString().split('T')[0];
            }
            // Get due_date from original phases (not retention)
            const originalPhase = form.paymentScheduleConfig!.phases[i];
            return {
              copro_id: currentCoproId,
              budget_id: id,
              phase_number: i + 1,
              label: phase.label,
              percentage: phase.percentage,
              amount: amounts[i] ?? 0,
              due_date: isRetention ? undefined : originalPhase?.dueDate,
              is_retention: isRetention,
              retention_release_date: retentionReleaseDate,
            };
          });

          await scheduleApi.createPaymentPhases(inputs);
        } catch (schedErr) {
          console.error('[useBudget] Erreur création échéancier:', schedErr);
        }
      }

      // 5. Refresh all data
      setShowCreateBudgetModal(false);
      await refresh();
      await loadAllWorks();
      return true;
    } catch (err) {
      alert(`Erreur: ${err instanceof Error ? err.message : 'inconnu'}`);
      return false;
    }
  }, [getAccountingPeriod, mutations, currentCoproId, refresh, loadAllWorks]);

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
    // La génération d'appels de fonds depuis le budget (RPC post_budget_call_for_funds
    // + écritures D450/C701 + échéancier) est un chantier finance dédié (J9, wizard G3).
    // On NE simule PAS un succès (audit 2026-06-12 : un faux succès est pire qu'un bouton
    // mort) : message honnête tant que le câblage réel n'est pas livré.
    alert('La génération des appels de fonds depuis le budget sera disponible prochainement.');
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

  // Auto-load budget lines for fonctionnement budget on initial load (latest version)
  useEffect(() => {
    const fonctionnementBudget = rawBudgets
      .filter(b => b.budget_type === 'current')
      .sort((a, b) => (b.version ?? 1) - (a.version ?? 1))[0];
    if (fonctionnementBudget && !isLoading) {
      // Load lines and expenses for the default tab (fonctionnement)
      loadBudgetLines(fonctionnementBudget.id);
      loadBudgetExpenses(fonctionnementBudget.id);
    }
  }, [rawBudgets, isLoading, loadBudgetLines, loadBudgetExpenses]);

  // Load budget details when tab changes
  const handleSetActiveTab = useCallback(async (tab: BudgetTab) => {
    setActiveTab(tab);

    // Rafraîchir les données ALUR (copropriétaires + solde 105 + rappels + historique) à l'ouverture
    // de l'onglet, pour que la borne de saisie de la modale ne soit pas périmée.
    if (tab === 'alur') {
      await Promise.all([loadCoproprietairesALUR(), loadAlurExtras()]);
    }

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
  }, [rawBudgets, loadBudgetLines, loadBudgetExpenses, loadCoproprietairesALUR, loadAlurExtras]);

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
    fondsALUR,
    coproprietairesALUR,
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
    handleSettleAlurCash,
    pendingAlurCash,
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

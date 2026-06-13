'use client';

import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { BudgetStatut } from '@/types/enums/statuts';
import { useBudget } from '@/hooks/modules/useBudget';
import { useBudgetData } from '@/hooks/modules/useBudgetData';
import { useBudgetMutations } from '@/hooks/modules/useBudgetMutations';
import { useNotifications, NotificationHelpers } from '@/hooks/modules/useNotifications';
import { mapBudgetStatusFromDb } from '@/lib/budget/api';
import type { PosteEditorData } from '@/components/features/finance/Budget';
import type { BudgetType, BudgetOverview, BudgetLineOverview } from '@/lib/budget/api';

export interface BudgetWithStatus {
  id: string;
  nom?: string;
  type: 'fonctionnement' | 'travaux';
  annee: number;
  montantTotal: number;
  statut: BudgetStatut;
  resolutionId?: string;
  lignesBudget?: Array<{
    poste: string;
    montantN: number;
    montantN1: number;
    evolution: number;
  }>;
}

// Extended PosteEditorData with sortOrder for internal use
interface PosteWithSortOrder extends PosteEditorData {
  sortOrder?: number;
}

// Helper: Map BudgetType to frontend type
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

// Helper: Map BudgetOverview to BudgetWithStatus
function mapBudgetToFrontend(budget: BudgetOverview): BudgetWithStatus {
  return {
    id: budget.id,
    annee: budget.period_year,
    type: mapBudgetTypeToFrontend(budget.budget_type),
    nom: budget.name,
    statut: mapBudgetStatusFromDb(budget.status),
    montantTotal: Number(budget.total_planned),
  };
}

interface UseBudgetDetailPageProps {
  budgetId: string;
}

export function useBudgetDetailPage({ budgetId }: UseBudgetDetailPageProps) {
  const router = useRouter();
  const { resolutionsAG } = useBudget();
  const { createNotificationWithMail } = useNotifications();

  // Load budget data from Supabase
  const {
    currentBudget: rawBudget,
    lines: rawLines,
    isLoading: dataLoading,
    refresh,
  } = useBudgetData({ budgetId });

  // Mutations for Supabase
  const mutations = useBudgetMutations({ onSuccess: refresh });

  // Store raw lines reference for accessing account_id and repartition_key_id
  const rawLinesRef = useRef<BudgetLineOverview[]>([]);
  useEffect(() => {
    rawLinesRef.current = rawLines;
  }, [rawLines]);

  // Map raw budget to frontend format
  const budget = useMemo<BudgetWithStatus | null>(() => {
    if (!rawBudget) return null;
    return mapBudgetToFrontend(rawBudget);
  }, [rawBudget]);

  // Map raw lines to PosteEditorData format
  const initialPostes = useMemo<PosteEditorData[]>(() => {
    return rawLines.map((line, index) => ({
      id: line.id,
      libelle: line.label,
      montant: Number(line.planned_amount),
      cleRepartitionId: line.repartition_key_id,
      sortOrder: line.sort_order ?? index,
    }));
  }, [rawLines]);

  // Store initial postes snapshot when entering edit mode
  const initialPostesSnapshot = useRef<PosteEditorData[]>([]);

  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [postes, setPostes] = useState<PosteEditorData[]>([]);
  const [showLinkToAGModal, setShowLinkToAGModal] = useState(false);
  const [showTransformModal, setShowTransformModal] = useState(false);
  const [showSimulationModal, setShowSimulationModal] = useState(false);
  const [showMailToast, setShowMailToast] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isLoading = dataLoading;

  // Sync postes from initialPostes when not editing
  useEffect(() => {
    if (!isEditing) {
      setPostes(initialPostes);
    }
  }, [initialPostes, isEditing]);

  const isBrouillon = budget?.statut === BudgetStatut.BROUILLON;
  const isApprouve = budget?.statut === BudgetStatut.APPROUVE;
  const canEdit = true;
  const canLinkToAG = isBrouillon && postes.length > 0;
  const canTransform = isApprouve;
  const canDelete = isBrouillon;

  const montantTotal = postes.reduce((sum, p) => sum + p.montant, 0);

  const handleSave = useCallback(async () => {
    if (!budget) return;
    setIsSaving(true);
    try {
      const initialIds = new Set(initialPostesSnapshot.current.map(p => p.id));
      const currentIds = new Set(postes.map(p => p.id));

      // Identify changes
      const toUpdate: PosteWithSortOrder[] = [];
      const toCreate: PosteWithSortOrder[] = [];
      const toDelete: string[] = [];

      // Check for updates and creates
      for (let i = 0; i < postes.length; i++) {
        const poste = postes[i];
        if (initialIds.has(poste.id)) {
          // Check if changed
          const original = initialPostesSnapshot.current.find(p => p.id === poste.id);
          if (original && (
            original.libelle !== poste.libelle ||
            original.montant !== poste.montant ||
            original.cleRepartitionId !== poste.cleRepartitionId
          )) {
            toUpdate.push({ ...poste, sortOrder: i });
          } else if (original) {
            // Even if content unchanged, update sort_order if different
            const originalIndex = initialPostesSnapshot.current.findIndex(p => p.id === poste.id);
            if (originalIndex !== i) {
              toUpdate.push({ ...poste, sortOrder: i });
            }
          }
        } else {
          // New poste (ID not in initial set or is a temp ID)
          toCreate.push({ ...poste, sortOrder: i });
        }
      }

      // Check for deletes
      for (const initialPoste of initialPostesSnapshot.current) {
        if (!currentIds.has(initialPoste.id)) {
          toDelete.push(initialPoste.id);
        }
      }

      // Execute mutations
      // 1. Delete removed lines
      for (const lineId of toDelete) {
        await mutations.deleteLine(lineId);
      }

      // 2. Update existing lines
      for (const poste of toUpdate) {
        await mutations.updateLine(poste.id, {
          label: poste.libelle,
          amount: poste.montant,
          sort_order: poste.sortOrder,
        });
      }

      // 3. Create new lines
      for (const poste of toCreate) {
        // Get default account_id and repartition_key_id from existing lines
        const existingLine = rawLinesRef.current[0];
        const accountId = existingLine?.account_id || 'default-account';
        const repartitionKeyId = poste.cleRepartitionId || existingLine?.repartition_key_id || 'default-key';

        await mutations.createLine({
          budget_id: budgetId,
          account_id: accountId,
          repartition_key_id: repartitionKeyId,
          label: poste.libelle,
          amount: poste.montant,
          sort_order: poste.sortOrder,
        });
      }

      // Refresh data from Supabase
      await refresh();

      // Send notification
      const total = postes.reduce((sum, p) => sum + p.montant, 0);
      const budgetNom = budget.nom || `Budget ${budget.type} ${budget.annee}`;
      const notifParams = NotificationHelpers.budgetModifie(budgetNom, total);
      await createNotificationWithMail(notifParams);

      setShowMailToast(true);
      setTimeout(() => setShowMailToast(false), 5000);
      setHasChanges(false);
      setIsEditing(false);
    } catch (e) {
      console.error('Erreur lors de la sauvegarde:', e);
      alert('Erreur lors de la sauvegarde du budget.');
    } finally {
      setIsSaving(false);
    }
  }, [budget, budgetId, postes, mutations, createNotificationWithMail, refresh]);

  const handleDelete = useCallback(async () => {
    if (!budget) return;
    if (budget.statut !== BudgetStatut.BROUILLON) {
      alert('Seuls les budgets en brouillon peuvent être supprimés.');
      return;
    }
    const confirmer = window.confirm(
      `Êtes-vous sûr de vouloir supprimer le budget "${budget.nom || `Budget ${budget.type} ${budget.annee}`}" ?\n\nCette action est irréversible.`
    );
    if (!confirmer) return;
    try {
      const success = await mutations.deleteBudget(budgetId);
      if (success) {
        router.push('/finance/budgets');
      } else {
        alert('Erreur lors de la suppression du budget.');
      }
    } catch (e) {
      console.error('Erreur lors de la suppression:', e);
      alert('Erreur lors de la suppression du budget.');
    }
  }, [budget, budgetId, mutations, router]);

  const handlePostesChange = useCallback((newPostes: PosteEditorData[]) => {
    setPostes(newPostes);
    setHasChanges(true);
  }, []);

  const handleLinkToAG = useCallback(async (_resolutionId: string) => {
    if (!budget) return;
    try {
      // Update budget status to pending approval
      const success = await mutations.updateBudgetStatus(budgetId, BudgetStatut.EN_ATTENTE_APPROBATION);
      if (success) {
        await refresh();
        setShowLinkToAGModal(false);
      } else {
        alert('Erreur lors de la liaison à la résolution.');
      }
    } catch (e) {
      console.error('Erreur lors de la liaison:', e);
      alert('Erreur lors de la liaison à la résolution.');
    }
  }, [budget, budgetId, mutations, refresh]);

  const goBack = useCallback(() => router.push('/finance/budgets'), [router]);

  const startEditing = useCallback(() => {
    // Capture initial state when starting to edit
    initialPostesSnapshot.current = [...postes];
    setIsEditing(true);
  }, [postes]);

  const cancelEditing = useCallback(() => {
    // Restore postes to initial state
    setPostes(initialPostesSnapshot.current);
    setIsEditing(false);
    setHasChanges(false);
  }, []);
  const openLinkModal = useCallback(() => setShowLinkToAGModal(true), []);
  const closeLinkModal = useCallback(() => setShowLinkToAGModal(false), []);
  const openTransformModal = useCallback(() => setShowTransformModal(true), []);
  const closeTransformModal = useCallback(() => setShowTransformModal(false), []);
  const openSimulationModal = useCallback(() => setShowSimulationModal(true), []);
  const closeSimulationModal = useCallback(() => setShowSimulationModal(false), []);
  const closeMailToast = useCallback(() => setShowMailToast(false), []);

  return {
    budget,
    isLoading,
    isEditing,
    hasChanges,
    postes,
    isSaving,
    montantTotal,
    resolutionsAG,
    isBrouillon,
    isApprouve,
    canEdit,
    canLinkToAG,
    canTransform,
    canDelete,
    showLinkToAGModal,
    showTransformModal,
    showSimulationModal,
    showMailToast,
    handleSave,
    handleDelete,
    handlePostesChange,
    handleLinkToAG,
    goBack,
    startEditing,
    cancelEditing,
    openLinkModal,
    closeLinkModal,
    openTransformModal,
    closeTransformModal,
    openSimulationModal,
    closeSimulationModal,
    closeMailToast,
  };
}

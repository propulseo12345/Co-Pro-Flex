'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BudgetStatut } from '@/types/enums/statuts';
import { useBudget } from '@/hooks/modules/useBudget';
import { useNotifications, NotificationHelpers } from '@/hooks/modules/useNotifications';
import type { PosteEditorData } from '@/components/features/finance/Budget';

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

// NEUTRALIZED: No more mock data fallback - will be replaced by Supabase queries

interface UseBudgetDetailPageProps {
  budgetId: string;
}

export function useBudgetDetailPage({ budgetId }: UseBudgetDetailPageProps) {
  const router = useRouter();
  const { resolutionsAG } = useBudget();
  const { createNotificationWithMail } = useNotifications();

  const [budget, setBudget] = useState<BudgetWithStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [postes, setPostes] = useState<PosteEditorData[]>([]);
  const [showLinkToAGModal, setShowLinkToAGModal] = useState(false);
  const [showTransformModal, setShowTransformModal] = useState(false);
  const [showSimulationModal, setShowSimulationModal] = useState(false);
  const [showMailToast, setShowMailToast] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // NEUTRALIZED: Will be replaced by Supabase query
    // For now, just set loading to false - UI will show empty state
    setIsLoading(false);
    // TODO: Replace with Supabase query to v_budgets_summary
  }, [budgetId]);

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
      // NEUTRALIZED: Will be replaced by Supabase mutation
      // TODO: Replace with Supabase update to budgets + budget_lines
      const total = postes.reduce((sum, p) => sum + p.montant, 0);
      setBudget(prev => prev ? {
        ...prev,
        montantTotal: total,
        lignesBudget: postes.map(p => ({ poste: p.libelle, montantN: p.montant, montantN1: 0, evolution: 0 })),
      } : null);

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
  }, [budget, postes, createNotificationWithMail]);

  const handleDelete = useCallback(() => {
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
      // NEUTRALIZED: Will be replaced by Supabase delete
      // TODO: Replace with Supabase delete from budgets
      router.push('/finance/budgets');
    } catch (e) {
      console.error('Erreur lors de la suppression:', e);
      alert('Erreur lors de la suppression du budget.');
    }
  }, [budget, router]);

  const handlePostesChange = useCallback((newPostes: PosteEditorData[]) => {
    setPostes(newPostes);
    setHasChanges(true);
  }, []);

  const handleLinkToAG = useCallback((resolutionId: string) => {
    if (!budget) return;
    try {
      // NEUTRALIZED: Will be replaced by Supabase update
      // TODO: Replace with Supabase update to budgets.resolution_id
      setBudget(prev => prev ? { ...prev, statut: BudgetStatut.EN_ATTENTE_APPROBATION, resolutionId } : null);
      setShowLinkToAGModal(false);
    } catch (e) {
      console.error('Erreur lors de la liaison:', e);
      alert('Erreur lors de la liaison a la resolution.');
    }
  }, [budget]);

  const goBack = useCallback(() => router.push('/finance/budgets'), [router]);

  const startEditing = useCallback(() => setIsEditing(true), []);
  const cancelEditing = useCallback(() => { setIsEditing(false); setHasChanges(false); }, []);
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

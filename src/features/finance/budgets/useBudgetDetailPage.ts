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

const DEFAULT_BUDGETS: BudgetWithStatus[] = [
  {
    id: 'budget-2025-fonct',
    nom: 'Budget previsionnel 2025',
    type: 'fonctionnement',
    annee: 2025,
    montantTotal: 87500,
    statut: BudgetStatut.APPROUVE,
    resolutionId: 'res-1',
    lignesBudget: [
      { poste: 'Eau', montantN: 12000, montantN1: 11500, evolution: 4.3 },
      { poste: 'Électricité', montantN: 8500, montantN1: 8200, evolution: 3.7 },
      { poste: 'Assurance', montantN: 18500, montantN1: 18000, evolution: 2.8 },
      { poste: 'Ménage', montantN: 15000, montantN1: 14500, evolution: 3.4 },
      { poste: 'Ascenseur', montantN: 12000, montantN1: 11800, evolution: 1.7 },
      { poste: 'Espaces verts', montantN: 11000, montantN1: 10500, evolution: 4.8 },
      { poste: 'Divers', montantN: 10500, montantN1: 10000, evolution: 5.0 }
    ]
  },
  {
    id: 'budget-2025-travaux',
    nom: 'Ravalement facade',
    type: 'travaux',
    annee: 2025,
    montantTotal: 45000,
    statut: BudgetStatut.APPROUVE,
    resolutionId: 'res-2',
    lignesBudget: [
      { poste: 'Echafaudages', montantN: 8000, montantN1: 0, evolution: 0 },
      { poste: 'Nettoyage facade', montantN: 12000, montantN1: 0, evolution: 0 },
      { poste: 'Reparation fissures', montantN: 10000, montantN1: 0, evolution: 0 },
      { poste: 'Peinture', montantN: 15000, montantN1: 0, evolution: 0 }
    ]
  },
  {
    id: 'budget-2026-fonct',
    nom: 'Budget previsionnel 2026',
    type: 'fonctionnement',
    annee: 2026,
    montantTotal: 0,
    statut: BudgetStatut.BROUILLON,
    lignesBudget: []
  }
];

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
    const loadBudget = () => {
      try {
        let budgets: BudgetWithStatus[] = [];
        const saved = localStorage.getItem('coproflex-budgets');

        if (saved) {
          budgets = JSON.parse(saved);
          let needsUpdate = false;
          budgets = budgets.map(b => {
            const defaultBudget = DEFAULT_BUDGETS.find(db => db.id === b.id);
            if (defaultBudget && (!b.lignesBudget || b.lignesBudget.length === 0) && defaultBudget.lignesBudget) {
              needsUpdate = true;
              return { ...b, lignesBudget: defaultBudget.lignesBudget, montantTotal: defaultBudget.montantTotal };
            }
            return b;
          });
          if (needsUpdate) {
            localStorage.setItem('coproflex-budgets', JSON.stringify(budgets));
          }
        } else {
          budgets = DEFAULT_BUDGETS;
          localStorage.setItem('coproflex-budgets', JSON.stringify(budgets));
        }

        const found = budgets.find(b => b.id === budgetId);
        if (found) {
          setBudget(found);
          if (found.lignesBudget && found.lignesBudget.length > 0) {
            setPostes(found.lignesBudget.map((l, i) => ({
              id: `poste-${i}`,
              libelle: l.poste,
              montant: l.montantN,
              posteId: l.poste,
            })));
          }
        }
      } catch (e) {
        console.error('Erreur lors du chargement du budget:', e);
      }
      setIsLoading(false);
    };

    loadBudget();
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
      const saved = localStorage.getItem('coproflex-budgets');
      if (saved) {
        const budgets: BudgetWithStatus[] = JSON.parse(saved);
        const total = postes.reduce((sum, p) => sum + p.montant, 0);
        const updated = budgets.map(b => {
          if (b.id === budgetId) {
            return {
              ...b,
              montantTotal: total,
              lignesBudget: postes.map(p => ({ poste: p.libelle, montantN: p.montant, montantN1: 0, evolution: 0 })),
            };
          }
          return b;
        });
        localStorage.setItem('coproflex-budgets', JSON.stringify(updated));
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
      }
    } catch (e) {
      console.error('Erreur lors de la sauvegarde:', e);
      alert('Erreur lors de la sauvegarde du budget.');
    } finally {
      setIsSaving(false);
    }
  }, [budget, budgetId, postes, createNotificationWithMail]);

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
      const saved = localStorage.getItem('coproflex-budgets');
      if (saved) {
        const budgets: BudgetWithStatus[] = JSON.parse(saved);
        const updated = budgets.filter(b => b.id !== budgetId);
        localStorage.setItem('coproflex-budgets', JSON.stringify(updated));
        router.push('/finance/budgets');
      }
    } catch (e) {
      console.error('Erreur lors de la suppression:', e);
      alert('Erreur lors de la suppression du budget.');
    }
  }, [budget, budgetId, router]);

  const handlePostesChange = useCallback((newPostes: PosteEditorData[]) => {
    setPostes(newPostes);
    setHasChanges(true);
  }, []);

  const handleLinkToAG = useCallback((resolutionId: string) => {
    if (!budget) return;
    try {
      const saved = localStorage.getItem('coproflex-budgets');
      if (saved) {
        const budgets: BudgetWithStatus[] = JSON.parse(saved);
        const updated = budgets.map(b => {
          if (b.id === budgetId) {
            return { ...b, statut: BudgetStatut.EN_ATTENTE_APPROBATION, resolutionId };
          }
          return b;
        });
        localStorage.setItem('coproflex-budgets', JSON.stringify(updated));
        setBudget(prev => prev ? { ...prev, statut: BudgetStatut.EN_ATTENTE_APPROBATION, resolutionId } : null);
        setShowLinkToAGModal(false);
      }
    } catch (e) {
      console.error('Erreur lors de la liaison:', e);
      alert('Erreur lors de la liaison a la resolution.');
    }
  }, [budget, budgetId]);

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

'use client';

import { useMemo, useState, useCallback } from 'react';
import { Home, CheckCircle2, AlertTriangle, Euro } from 'lucide-react';
import { useVentesContext } from '@/providers/VentesProvider';
import type { StatCard, VenteRecente, RecentActivity } from '../domain/types';
import { IMPAYES_CRITIQUES, IMPAYES_BREAKDOWN } from '../domain/constants';
import { mapWorkflowStepToLabel } from '../domain/utils';

// ============================================================================
// Hook Return Type
// ============================================================================

interface UseVentesImpayesDashboardReturn {
  // Loading & Error
  isLoading: boolean;
  error: string | null;

  // Data
  stats: StatCard[];
  ventesRecentes: VenteRecente[];
  recentActivity: RecentActivity[];
  impayesCritiques: typeof IMPAYES_CRITIQUES;
  impayesBreakdown: typeof IMPAYES_BREAKDOWN;

  // Modal state
  showRelanceModal: boolean;
  selectedImpayes: number[];

  // Actions
  toggleImpayeSelection: (id: number) => void;
  handleRelanceGroupee: () => void;
  closeRelanceModal: () => void;
  openRelanceModal: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useVentesImpayesDashboard(): UseVentesImpayesDashboardReturn {
  const { ventes, isLoading, error } = useVentesContext();

  // Modal state
  const [showRelanceModal, setShowRelanceModal] = useState(false);
  const [selectedImpayes, setSelectedImpayes] = useState<number[]>([]);

  // Compute stats from real ventes data
  const stats = useMemo((): StatCard[] => {
    const enCours = ventes.filter(v => v.statut === 'EN_COURS').length;
    const finalisees = ventes.filter(v => v.statut === 'TERMINEE').length;
    const withMissingDocs = ventes.filter(v =>
      v.statut === 'EN_COURS' && v.documents.some(d => d.statut === 'EN_ATTENTE')
    ).length;

    return [
      {
        id: 'ventes-en-cours',
        label: 'Ventes en cours',
        value: enCours,
        icon: Home,
        color: '#4f46e5',
        link: '/ventes-impayes/ventes?statut=en_cours',
        subInfo: withMissingDocs > 0 ? `${withMissingDocs} avec documents manquants` : undefined
      },
      {
        id: 'ventes-finalisees',
        label: 'Ventes finalisées',
        value: finalisees,
        icon: CheckCircle2,
        color: '#10b981',
        link: '/ventes-impayes/ventes?statut=finalise',
        subInfo: undefined
      },
      {
        id: 'impayes-en-cours',
        label: 'Impayés en cours',
        value: IMPAYES_CRITIQUES.length,
        icon: AlertTriangle,
        color: '#ef4444',
        link: '/ventes-impayes/impayes',
        subInfo: '3 en contentieux'
      },
      {
        id: 'montant-impayes',
        label: 'Montant total impayés',
        value: '12 450 €',
        icon: Euro,
        color: '#f59e0b',
        link: '/ventes-impayes/impayes',
        subInfo: 'Retard moyen: 65 jours'
      }
    ];
  }, [ventes]);

  // Convert ventes to the format expected by VentesRecentesSection
  const ventesRecentes = useMemo((): VenteRecente[] => {
    return ventes.slice(0, 5).map(v => ({
      id: v.id,
      lot: v.lotTypes[0] ? `${v.lotTypes[0]} - Lot ${v.lotIds[0]?.slice(-4) || ''}` : 'Lot',
      vendeur: v.vendeur,
      acquereur: v.acquereur || 'Non défini',
      statut: v.statut === 'EN_COURS' ? 'en_cours' : v.statut === 'TERMINEE' ? 'finalise' : 'annule',
      etape: mapWorkflowStepToLabel(v.etapeWorkflow),
      dateCompromis: v.dateCompromis || '',
      documentsManquants: v.documents.filter(d => d.statut === 'EN_ATTENTE').length
    }));
  }, [ventes]);

  // Generate activity from recent ventes
  const recentActivity = useMemo((): RecentActivity[] => {
    return ventes.slice(0, 3).map(v => ({
      id: v.id,
      type: 'vente' as const,
      title: `Vente - ${v.lotTypes[0] || 'Lot'} ${v.lotIds[0]?.slice(-4) || ''}`,
      description: `Vendeur: ${v.vendeur} - Acquéreur: ${v.acquereur || 'Non défini'}`,
      date: v.dateModification,
      icon: v.statut === 'TERMINEE' ? CheckCircle2 : Home,
      color: v.statut === 'TERMINEE' ? '#10b981' : '#4f46e5',
      link: `/ventes-impayes/ventes/${v.id}`
    }));
  }, [ventes]);

  // Actions
  const toggleImpayeSelection = useCallback((id: number) => {
    setSelectedImpayes(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }, []);

  const handleRelanceGroupee = useCallback(() => {
    setShowRelanceModal(true);
  }, []);

  const closeRelanceModal = useCallback(() => {
    setShowRelanceModal(false);
  }, []);

  const openRelanceModal = useCallback(() => {
    setShowRelanceModal(true);
  }, []);

  return {
    // Loading & Error
    isLoading,
    error,

    // Data
    stats,
    ventesRecentes,
    recentActivity,
    impayesCritiques: IMPAYES_CRITIQUES,
    impayesBreakdown: IMPAYES_BREAKDOWN,

    // Modal state
    showRelanceModal,
    selectedImpayes,

    // Actions
    toggleImpayeSelection,
    handleRelanceGroupee,
    closeRelanceModal,
    openRelanceModal,
  };
}

'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { Home, CheckCircle2, AlertTriangle, Euro } from 'lucide-react';
import { useVentesContext } from '@/providers/VentesProvider';
import { useCopro } from '@/providers/CoproContext';
import type { StatCard, VenteRecente, RecentActivity, ImpayeCritique, ImpayeBreakdown } from '../domain/types';
import { IMPAYES_CRITIQUES, IMPAYES_BREAKDOWN } from '../domain/constants';
import { mapWorkflowStepToLabel } from '../domain/utils';
import * as impayesApi from '@/lib/impayes/api';
import type { UnpaidWithReminders } from '@/lib/impayes/api';

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
  const { currentCoproId } = useCopro();

  // Modal state
  const [showRelanceModal, setShowRelanceModal] = useState(false);
  const [selectedImpayes, setSelectedImpayes] = useState<number[]>([]);

  // Real impayés data from Supabase
  const [realImpayes, setRealImpayes] = useState<UnpaidWithReminders[]>([]);
  const [impayesLoaded, setImpayesLoaded] = useState(false);

  useEffect(() => {
    if (!currentCoproId) {
      setRealImpayes([]);
      setImpayesLoaded(false);
      return;
    }

    let cancelled = false;

    async function loadImpayes() {
      try {
        const data = await impayesApi.listUnpaidWithReminders(currentCoproId!);
        if (!cancelled) {
          setRealImpayes(data);
          setImpayesLoaded(true);
        }
      } catch (err) {
        console.error('Error loading impayés for dashboard:', err);
        if (!cancelled) {
          setImpayesLoaded(false);
        }
      }
    }

    loadImpayes();
    return () => { cancelled = true; };
  }, [currentCoproId]);

  // Derived impayés critiques (from real data or fallback)
  const impayesCritiquesData = useMemo((): ImpayeCritique[] => {
    if (!impayesLoaded || realImpayes.length === 0) return IMPAYES_CRITIQUES;

    return realImpayes.slice(0, 5).map((u, i) => ({
      id: i + 1,
      coproprietaire: u.owner_name || 'Inconnu',
      lot: u.lot_ref || 'Lot',
      montant: u.unpaid_amount,
      retard: u.days_overdue,
      statut: u.severity === 'CRITICAL' ? 'contentieux' :
              u.severity === 'HIGH' ? 'relance_2' :
              u.severity === 'MEDIUM' ? 'relance_1' : 'en_retard',
      type: `Retard ${u.days_overdue}j`,
    }));
  }, [impayesLoaded, realImpayes]);

  const impayesBreakdownData = useMemo((): ImpayeBreakdown[] => {
    if (!impayesLoaded || realImpayes.length === 0) return IMPAYES_BREAKDOWN;

    const minor = realImpayes.filter(u => u.severity === 'MINOR');
    const medium = realImpayes.filter(u => u.severity === 'MEDIUM');
    const high = realImpayes.filter(u => u.severity === 'HIGH');
    const critical = realImpayes.filter(u => u.severity === 'CRITICAL');

    const sumAmount = (items: UnpaidWithReminders[]) => items.reduce((s, i) => s + i.unpaid_amount, 0);

    return [
      { statut: 'en_retard', label: 'En retard', count: minor.length, montant: sumAmount(minor), color: '#fef3c7', textColor: '#92400e' },
      { statut: 'relance_1', label: 'Relance 1', count: medium.length, montant: sumAmount(medium), color: '#fed7aa', textColor: '#9a3412' },
      { statut: 'relance_2', label: 'Relance 2', count: high.length, montant: sumAmount(high), color: '#fecaca', textColor: '#991b1b' },
      { statut: 'contentieux', label: 'Contentieux', count: critical.length, montant: sumAmount(critical), color: '#fee2e2', textColor: '#7f1d1d' },
    ];
  }, [impayesLoaded, realImpayes]);

  // Compute stats from real data
  const totalImpayes = impayesLoaded && realImpayes.length > 0
    ? realImpayes.length
    : IMPAYES_CRITIQUES.length;
  const montantTotalImpayes = impayesLoaded && realImpayes.length > 0
    ? realImpayes.reduce((s, u) => s + u.unpaid_amount, 0)
    : 12450;
  const nbContentieux = impayesLoaded && realImpayes.length > 0
    ? realImpayes.filter(u => u.severity === 'CRITICAL').length
    : 3;
  const avgRetard = impayesLoaded && realImpayes.length > 0
    ? Math.round(realImpayes.reduce((s, u) => s + u.days_overdue, 0) / realImpayes.length)
    : 65;

  // Compute stats from real ventes data + real impayés
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
        value: totalImpayes,
        icon: AlertTriangle,
        color: '#ef4444',
        link: '/ventes-impayes/impayes',
        subInfo: nbContentieux > 0 ? `${nbContentieux} en contentieux` : undefined
      },
      {
        id: 'montant-impayes',
        label: 'Montant total impayés',
        value: montantTotalImpayes.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }),
        icon: Euro,
        color: '#f59e0b',
        link: '/ventes-impayes/impayes',
        subInfo: `Retard moyen: ${avgRetard} jours`
      }
    ];
  }, [ventes, totalImpayes, montantTotalImpayes, nbContentieux, avgRetard]);

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
    impayesCritiques: impayesCritiquesData,
    impayesBreakdown: impayesBreakdownData,

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

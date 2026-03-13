'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useProviders } from '@/hooks/modules/useMaintenanceData';
import { useToast } from '@/providers/ToastProvider';
import type { ProviderOverview, ProviderInsert, ProviderCategory, ProviderDomain } from '@/types/supabase';

// Domain labels for display - must match ProviderDomain enum
const DOMAIN_LABELS: Record<ProviderDomain, string> = {
  plomberie: 'Plomberie',
  electricite: 'Électricité',
  chauffage: 'Chauffage',
  ascenseur: 'Ascenseur',
  menage: 'Ménage',
  espaces_verts: 'Espaces verts',
  serrurerie: 'Serrurerie',
  peinture: 'Peinture',
  assurance: 'Assurance',
  juridique: 'Juridique',
  architecture: 'Architecture',
  toiture: 'Toiture',
  facade: 'Façade',
  climatisation: 'Climatisation',
  interphone: 'Interphone',
  portail: 'Portail',
  securite: 'Sécurité',
  autre: 'Autre',
};

// Adapter to legacy Prestataire format
// v_providers_overview now includes address, postal_code, contact_role
function adaptToLegacyFormat(provider: ProviderOverview) {
  return {
    id: provider.id,
    nom: provider.name,
    categorie: provider.category?.toUpperCase() as 'SYNDIC' | 'COPROPRIETE' | 'COPROFLEX' | undefined,
    domaines: provider.domains,
    contactNom: provider.contact_name,
    contactRole: provider.contact_role, // Now in view
    email: provider.email,
    telephone: provider.phone,
    telephoneUrgence: provider.phone_emergency,
    adresse: provider.address, // Now in view
    codePostal: provider.postal_code, // Now in view
    ville: provider.city,
    siret: provider.siret,
    noteMoyenne: provider.rating_avg,
    nombreAvis: provider.rating_count,
    certifications: null, // Not in view (only in base table)
    notesInternes: null, // Not in view (only in base table)
    labelCoproFlex: provider.coproflex_label,
    rayonIntervention: null, // Not in view (only in base table)
    tarifIndicatif: null, // Not in view (only in base table)
    description: null, // Not in view (only in base table)
    disponibilite: null, // Not in view (only in base table)
    tempsReponseMoyen: null, // Not in view (only in base table)
    anneeFondation: null, // Not in view (only in base table)
    nombreEmployes: null, // Not in view (only in base table)
    nombreInterventions: provider.interventions_count,
    derniereIntervention: provider.last_intervention_at,
    actif: provider.is_active,
    // Stats from view
    contractsCount: provider.active_contracts_count,
    openOrdersCount: provider.pending_orders_count,
    totalAmountYear: null, // Not in view (would need separate aggregation)
  };
}

export function useProvidersHubPage() {
  const router = useRouter();
  const { showToast } = useToast();

  // Supabase data hook
  const {
    providers,
    stats: supabaseStats,
    isLoading,
    error,
    fetchProviders,
    createProvider,
  } = useProviders();

  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Group providers by category
  const prestairesCopro = useMemo(() =>
    providers.filter(p => p.category === 'copropriete').map(adaptToLegacyFormat),
    [providers]
  );

  const prestairesSyndic = useMemo(() =>
    providers.filter(p => p.category === 'syndic').map(adaptToLegacyFormat),
    [providers]
  );

  const prestairesCoproFlex = useMemo(() =>
    providers.filter(p => p.category === 'coproflex').map(adaptToLegacyFormat),
    [providers]
  );

  // All providers for search
  const allPrestataires = useMemo(() =>
    providers.map(adaptToLegacyFormat),
    [providers]
  );

  // Search results
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return allPrestataires.filter(p =>
      p.nom?.toLowerCase().includes(term) ||
      (p.domaines ?? []).some(d => DOMAIN_LABELS[d as ProviderDomain]?.toLowerCase().includes(term)) ||
      p.ville?.toLowerCase().includes(term)
    ).slice(0, 5);
  }, [searchTerm, allPrestataires]);

  // Stats per category
  const statsCopro = useMemo(() => ({
    count: prestairesCopro.length,
    interventions: prestairesCopro.reduce((sum, p) => sum + (p.nombreInterventions ?? 0), 0),
    derniereIntervention: prestairesCopro.reduce((latest, p) => {
      if (!p.derniereIntervention) return latest;
      if (!latest) return p.derniereIntervention;
      return new Date(p.derniereIntervention) > new Date(latest) ? p.derniereIntervention : latest;
    }, null as string | null),
  }), [prestairesCopro]);

  const statsSyndic = useMemo(() => {
    const domainesCounts = new Map<string, number>();
    prestairesSyndic.forEach(p => {
      (p.domaines ?? []).forEach(d => {
        domainesCounts.set(d, (domainesCounts.get(d) || 0) + 1);
      });
    });
    const domaines = Array.from(domainesCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([d]) => DOMAIN_LABELS[d as ProviderDomain] || d);

    return {
      count: prestairesSyndic.length,
      interventions: prestairesSyndic.reduce((sum, p) => sum + (p.nombreInterventions ?? 0), 0),
      domaines,
    };
  }, [prestairesSyndic]);

  const statsCoproFlex = useMemo(() => {
    const withRating = prestairesCoproFlex.filter(p => p.noteMoyenne !== null);
    const avgRating = withRating.length > 0
      ? withRating.reduce((sum, p) => sum + (p.noteMoyenne || 0), 0) / withRating.length
      : 0;

    return {
      count: prestairesCoproFlex.length,
      noteMoyenne: Math.round(avgRating * 10) / 10,
      nombreAvis: prestairesCoproFlex.reduce((sum, p) => sum + (p.nombreAvis || 0), 0),
    };
  }, [prestairesCoproFlex]);

  const handleExport = useCallback(() => {
    // Generate CSV
    const headers = ['Nom', 'Catégorie', 'Domaines', 'Email', 'Téléphone', 'Ville', 'Note'];
    const rows = allPrestataires.map(p => [
      p.nom ?? '',
      p.categorie ?? '',
      (p.domaines ?? []).map(d => DOMAIN_LABELS[d as ProviderDomain] || d).join(', '),
      p.email || '',
      p.telephone || '',
      p.ville || '',
      p.noteMoyenne?.toString() || '',
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `prestataires_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    showToast({ type: 'success', message: 'Export généré avec succès' });
  }, [allPrestataires, showToast]);

  const handleAddPrestataire = useCallback(async (prestataireData: {
    nom: string;
    categorie: 'COPROPRIETE' | 'SYNDIC';
    domaines: string[];
    email?: string;
    telephone?: string;
    ville?: string;
  }) => {
    try {
      const providerInsert: ProviderInsert = {
        copro_id: '', // Will be set by hook
        name: prestataireData.nom,
        category: prestataireData.categorie.toLowerCase() as ProviderCategory,
        domains: prestataireData.domaines as ProviderDomain[],
        email: prestataireData.email || null,
        phone: prestataireData.telephone || null,
        city: prestataireData.ville || null,
        is_active: true,
      };

      await createProvider(providerInsert);
      showToast({ type: 'success', message: `Prestataire "${prestataireData.nom}" ajouté avec succès` });
      setIsAddModalOpen(false);
    } catch (err) {
      console.error('Error creating provider:', err);
      showToast({ type: 'error', message: 'Erreur lors de l\'ajout du prestataire' });
    }
  }, [createProvider, showToast]);

  const handleGoToPrestataire = useCallback((prestataire: { id: string }) => {
    router.push(`/maintenance/providers/${prestataire.id}`);
    setSearchTerm('');
  }, [router]);

  return {
    // Search
    searchTerm,
    setSearchTerm,
    searchResults,

    // Modal
    isAddModalOpen,
    setIsAddModalOpen,

    // Stats
    statsCopro,
    statsSyndic,
    statsCoproFlex,

    // Loading
    isLoading,
    error,

    // Legacy data for components
    prestairesCopro,
    prestairesSyndic,
    prestairesCoproFlex,

    // Actions
    handleExport,
    handleAddPrestataire,
    handleGoToPrestataire,

    // Refresh
    refresh: fetchProviders,
  };
}

'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useServiceOrders } from '@/hooks/modules/useMaintenanceData';
import { generatePdfDownload } from '@/lib/utils/service-order';
import type { ServiceOrderOverview, ServiceOrderStatus } from '@/types/supabase';

// Map Supabase status to legacy status for PDF generation compatibility
function mapStatusToLegacy(status: ServiceOrderStatus): string {
  const mapping: Record<ServiceOrderStatus, string> = {
    draft: 'BROUILLON',
    to_send: 'A_ENVOYER',
    sent: 'ENVOYE',
    accepted: 'EN_ATTENTE_PRESTATAIRE',
    refused: 'REFUSE',
    scheduled: 'INTERVENTION_PROGRAMMEE',
    in_progress: 'EN_COURS',
    completed: 'INTERVENTION_REALISEE',
    invoiced: 'FACTURE',
    paid: 'PAYE',
    closed: 'CLOTURE',
    cancelled: 'ANNULE',
  };
  return mapping[status] || status;
}

// Adapter pour convertir ServiceOrderOverview vers format legacy OrdreService
function adaptToLegacyFormat(order: ServiceOrderOverview) {
  return {
    id: order.id,
    numero: order.order_number,
    titre: order.subject,
    description: order.description || '',
    date: order.created_at,
    fournisseurId: order.provider_id,
    fournisseurNom: order.provider_name,
    typeOrdre: order.order_type === 'contractuel' ? 'CONTRACTUEL' : 'CLASSIQUE',
    statut: order.status ? mapStatusToLegacy(order.status) : 'BROUILLON',
    urgence: order.urgency === 'critical' || order.urgency === 'high' || order.urgency === 'urgent',
    montantEstime: order.estimated_amount,
    montantDevis: order.quoted_amount,
    montantReel: order.actual_amount,
    dateIntervention: order.planned_intervention_date,
    dateEnvoi: order.sent_at,
    dateAcceptation: order.accepted_at,
    dateCloture: order.closed_at,
    isArt18: order.is_art18_emergency,
    contratId: order.contract_id,
    // Additional fields for display
    providerEmail: order.provider_email,
    providerPhone: order.provider_phone,
    buildingName: order.building_name,
    lotRef: order.lot_ref,
    eventsCount: order.events_count,
    documentsCount: order.documents_count ?? 0, // Now available in view
  };
}

export function useServiceOrdersListPage() {
  const router = useRouter();

  // Supabase data hook
  const {
    orders,
    stats: supabaseStats,
    isLoading,
    error,
    fetchOrders,
    updateOrderStatus,
    sendOrderEmail,
    cancelOrder,
    deleteOrder,
  } = useServiceOrders();

  // Fusionner les ordres localStorage (fallback hors-ligne) avec Supabase
  const [localOrders, setLocalOrders] = useState<ServiceOrderOverview[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('newOrdresService');
      if (!stored) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsed: any[] = JSON.parse(stored);
      const adapted: ServiceOrderOverview[] = parsed.map(os => ({
        id: os.id,
        copro_id: null,
        order_number: os.numero || `OS-${os.id?.slice(-6)?.toUpperCase()}`,
        subject: os.titre,
        description: os.description || null,
        status: (os.statut === 'ENVOYE' ? 'sent' : 'draft') as ServiceOrderStatus,
        urgency: os.priorite === 'URGENT' ? 'urgent' : 'normal',
        order_type: os.typeOrdre === 'CONTRACTUEL' ? 'contractuel' : 'classique',
        origin: 'manual',
        provider_id: os.fournisseurId || null,
        provider_name: os.fournisseurNom || null,
        provider_email: os.fournisseurEmail || null,
        provider_phone: os.fournisseurTelephone || null,
        contract_id: os.contratId || null,
        estimated_amount: os.montantEstime || 0,
        quoted_amount: null,
        actual_amount: null,
        is_art18_emergency: false,
        planned_intervention_date: os.dateIntervention || null,
        sent_at: os.dateEnvoi || null,
        accepted_at: null,
        closed_at: null,
        created_at: os.dateCreation || os.date,
        building_name: null,
        lot_ref: null,
        events_count: 0,
        documents_count: 0,
      } as unknown as ServiceOrderOverview));
      // Ne garder que ceux non présents dans Supabase
      const supabaseIds = new Set(orders.map(o => o.id));
      setLocalOrders(adapted.filter(o => !supabaseIds.has(o.id)));
    } catch { setLocalOrders([]); }
  }, [orders]);

  // Tous les ordres = Supabase + localStorage
  const allOrders = useMemo(() => [...orders, ...localOrders], [orders, localOrders]);

  // Local filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statutFilter, setStatutFilter] = useState<ServiceOrderStatus | 'TOUS'>('TOUS');
  const [typeFilter, setTypeFilter] = useState<'classique' | 'contractuel' | 'TOUS'>('TOUS');
  const [fournisseurFilter, setFournisseurFilter] = useState('TOUS');
  const [emailPreviewOS, setEmailPreviewOS] = useState<ServiceOrderOverview | null>(null);

  // Filter orders locally (client-side for instant feedback)
  const filteredOS = useMemo(() => {
    return allOrders.filter((os) => {
      const matchesSearch =
        (os.subject ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (os.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (os.provider_name ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (os.order_number ?? '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatut = statutFilter === 'TOUS' || os.status === statutFilter;
      const matchesType = typeFilter === 'TOUS' || os.order_type === typeFilter;
      const matchesFournisseur = fournisseurFilter === 'TOUS' || os.provider_id === fournisseurFilter;

      return matchesSearch && matchesStatut && matchesType && matchesFournisseur;
    });
  }, [allOrders, searchTerm, statutFilter, typeFilter, fournisseurFilter]);

  // Sort by date descending
  const sortedOS = useMemo(() => {
    return [...filteredOS].sort((a, b) => {
      return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
    });
  }, [filteredOS]);

  // Convert to legacy format for compatibility with existing components
  const sortedOSLegacy = useMemo(() => {
    return sortedOS.map(adaptToLegacyFormat);
  }, [sortedOS]);

  // Stats - use Supabase stats
  const stats = useMemo(() => ({
    total: supabaseStats.total + localOrders.length,
    brouillons: supabaseStats.drafts + localOrders.filter(o => o.status === 'draft').length,
    enAttentePrestataire: supabaseStats.pending,
    interventionProgrammee: allOrders.filter(os => os.status === 'scheduled').length,
    interventionRealisee: allOrders.filter(os => os.status === 'completed').length,
    clotures: allOrders.filter(os => os.status === 'closed' || os.status === 'cancelled').length,
  }), [supabaseStats, allOrders]);

  // Get unique providers for filter dropdown
  const fournisseurs = useMemo(() => {
    const uniqueProviders = new Map<string, { id: string; nom: string }>();
    allOrders.forEach(os => {
      const providerId = os.provider_id ?? '';
      const providerName = os.provider_name ?? '';
      if (providerId && !uniqueProviders.has(providerId)) {
        uniqueProviders.set(providerId, { id: providerId, nom: providerName });
      }
    });
    return Array.from(uniqueProviders.values());
  }, [allOrders]);

  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setStatutFilter('TOUS');
    setTypeFilter('TOUS');
    setFournisseurFilter('TOUS');
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet ordre de service ? Cette action est irréversible.')) return;

    // Vérifier si c'est un OS localStorage (ID non-UUID)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    if (!isUUID) {
      // Supprimer du localStorage
      try {
        const stored = localStorage.getItem('newOrdresService');
        if (stored) {
          const parsed = JSON.parse(stored);
          const filtered = parsed.filter((os: { id: string }) => os.id !== id);
          localStorage.setItem('newOrdresService', JSON.stringify(filtered));
        }
      } catch { /* ignore */ }
      setLocalOrders(prev => prev.filter(o => o.id !== id));
      return;
    }

    // Supprimer de Supabase
    try {
      await deleteOrder(id);
    } catch (err) {
      console.error('Error deleting order:', err);
      alert('Erreur lors de la suppression');
    }
  }, [deleteOrder]);

  const handleViewPdf = useCallback((osId: string) => {
    const os = allOrders.find(o => o.id === osId);
    if (os) {
      const legacyOs = adaptToLegacyFormat(os);
      generatePdfDownload(legacyOs as never);
    }
  }, [allOrders]);

  const handleEmailPreview = useCallback((osId: string) => {
    const os = allOrders.find(o => o.id === osId);
    if (os) {
      setEmailPreviewOS(os);
    }
  }, [allOrders]);

  const handleEmailSend = useCallback(async () => {
    if (!emailPreviewOS || !emailPreviewOS.id) return;

    try {
      await sendOrderEmail(
        emailPreviewOS.id,
        emailPreviewOS.order_type === 'contractuel' ? 'contractuel' : 'classique'
      );
      alert('Email envoyé avec succès');
      setEmailPreviewOS(null);
    } catch (err) {
      console.error('Error sending email:', err);
      alert('Erreur lors de l\'envoi de l\'email');
    }
  }, [emailPreviewOS, sendOrderEmail]);

  const handleCloseEmailPreview = useCallback(() => {
    setEmailPreviewOS(null);
  }, []);

  const goToNew = useCallback(() => router.push('/maintenance/service-orders/new'), [router]);
  const goToDetail = useCallback((id: string) => router.push(`/maintenance/service-orders/${id}`), [router]);
  const goToEdit = useCallback((id: string) => router.push(`/maintenance/service-orders/${id}?edit=true`), [router]);

  const hasActiveFilters = searchTerm || statutFilter !== 'TOUS' || typeFilter !== 'TOUS' || fournisseurFilter !== 'TOUS';

  // Legacy-compatible email preview format
  const emailPreviewOSLegacy = emailPreviewOS ? adaptToLegacyFormat(emailPreviewOS) : null;

  return {
    // Data
    sortedOS: sortedOSLegacy,
    orders, // Raw Supabase orders
    stats,
    fournisseurs,

    // Loading state
    isLoading,
    error,

    // Filters
    searchTerm,
    setSearchTerm,
    statutFilter,
    setStatutFilter,
    typeFilter,
    setTypeFilter,
    fournisseurFilter,
    setFournisseurFilter,
    hasActiveFilters,
    handleClearFilters,

    // Email preview
    emailPreviewOS: emailPreviewOSLegacy,
    handleEmailPreview,
    handleEmailSend,
    handleCloseEmailPreview,

    // Actions
    handleDelete,
    handleViewPdf,
    goToNew,
    goToDetail,
    goToEdit,

    // Refetch
    refresh: fetchOrders,
  };
}

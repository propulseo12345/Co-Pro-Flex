'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { KPIFilterType } from '@/components/features/finance/Factures/FacturesKPI';
import type { SortColumn, SortDirection } from '@/components/features/finance/Factures/FacturesTable';
import { detectTypeDepense, TYPE_DEPENSE_TO_POSTE } from '@/components/features/finance/Factures/utils';
import {
  Facture,
  StatutFacture,
  TypeDepense,
  NewFactureForm,
  calculerDateEcheanceDefaut,
  MotifAvoir,
  calculerKPIFactures,
  isFactureEnRetard
} from '@/components/features/finance/Factures/types';
import { useCopro } from '@/providers/CoproContext';
import {
  useSupplierInvoices,
  useCreateSupplierInvoiceDirect,
  useOpenPeriod,
  useUpdateSupplierInvoice,
  useDeleteSupplierInvoice,
  useSuppliers
} from '@/hooks/modules/useFinanceData';

// Store original Supabase invoice IDs for mutations
const invoiceIdMap = new Map<string, string>(); // local ID -> supabase ID

type StatutFilterValue = 'TOUS' | StatutFacture;

// Map Supabase status to local status
function mapSupabaseStatus(status: string): StatutFacture {
  switch (status) {
    case 'draft': return 'BROUILLON';
    case 'approved': return 'VALIDEE';
    case 'posted': return 'A_PAYER';
    case 'paid': return 'PAYEE';
    case 'cancelled': return 'BROUILLON';
    default: return 'BROUILLON';
  }
}

export function useFacturesPage() {
  const { currentCoproId } = useCopro();
  const { data: supabaseInvoices, isLoading, error, refresh } = useSupplierInvoices();
  const { data: openPeriod } = useOpenPeriod();
  const createInvoiceMutation = useCreateSupplierInvoiceDirect();
  const updateInvoiceMutation = useUpdateSupplierInvoice();
  const deleteInvoiceMutation = useDeleteSupplierInvoice();
  const { data: suppliers } = useSuppliers();

  // Track last refresh time for UI indicator
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isMutating, setIsMutating] = useState(false);

  // Enhanced refresh that updates timestamp
  const refreshWithTimestamp = useCallback(async () => {
    await refresh();
    setLastRefresh(new Date());
  }, [refresh]);

  // Convert Supabase data to local format (NO MOCK FALLBACK)
  const supabaseFactures: Facture[] = useMemo(() => {
    if (!supabaseInvoices) return [];
    return supabaseInvoices.map(inv => {
      // Store mapping for mutations
      invoiceIdMap.set(inv.id, inv.id);
      return {
        id: inv.id,
        typeDocument: 'FACTURE' as const,
        date: inv.invoice_date,
        dateEcheance: inv.due_date || inv.invoice_date,
        fournisseur: inv.supplier_name,
        reference: inv.invoice_number || inv.label,
        montant: Number(inv.total_amount),
        statut: mapSupabaseStatus(inv.status),
        posteBudgetaire: undefined,
        datePaiement: inv.status === 'paid' ? inv.created_at.split('T')[0] : undefined,
      };
    });
  }, [supabaseInvoices]);

  // Use Supabase data only - no mock fallback
  const [factures, setFactures] = useState<Facture[]>([]);

  // Update factures when Supabase data changes
  useEffect(() => {
    setFactures(supabaseFactures);
  }, [supabaseFactures]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statutFilter, setStatutFilter] = useState<StatutFilterValue>('TOUS');
  const [sortOrder, setSortOrder] = useState<'DESC' | 'ASC'>('DESC');
  const [kpiFilter, setKpiFilter] = useState<KPIFilterType | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [fournisseurFilter, setFournisseurFilter] = useState<string>('');
  const [periodeFilter, setPeriodeFilter] = useState<{ debut: string; fin: string } | null>(null);

  const [selectedFacture, setSelectedFacture] = useState<Facture | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showAccountingModal, setShowAccountingModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showAvoirModal, setShowAvoirModal] = useState(false);
  const [selectedTypeDepense, setSelectedTypeDepense] = useState<TypeDepense>('divers');
  const [editForm, setEditForm] = useState<Partial<Facture>>({});

  const todayStr = new Date().toISOString().split('T')[0];
  const [newFactureForm, setNewFactureForm] = useState<NewFactureForm>({
    date: todayStr,
    dateEcheance: calculerDateEcheanceDefaut(todayStr),
    fournisseur: '',
    reference: '',
    montant: '',
    fichier: ''
  });

  const fournisseurs = useMemo(() => {
    const unique = [...new Set(factures.map(f => f.fournisseur))];
    return unique.sort();
  }, [factures]);

  const kpiData = useMemo(() => calculerKPIFactures(factures), [factures]);

  const filteredFactures = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const finSemaine = new Date(today);
    finSemaine.setDate(today.getDate() + (7 - today.getDay()));
    finSemaine.setHours(23, 59, 59, 999);

    return factures
      .filter(facture => {
        const matchesSearch =
          facture.fournisseur.toLowerCase().includes(searchTerm.toLowerCase()) ||
          facture.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
          facture.montant.toString().includes(searchTerm);
        let matchesStatut = statutFilter === 'TOUS' || facture.statut === statutFilter;
        const matchesFournisseur = !fournisseurFilter || facture.fournisseur === fournisseurFilter;
        let matchesPeriode = true;
        if (periodeFilter) {
          const factureDate = new Date(facture.date);
          if (periodeFilter.debut) matchesPeriode = matchesPeriode && factureDate >= new Date(periodeFilter.debut);
          if (periodeFilter.fin) matchesPeriode = matchesPeriode && factureDate <= new Date(periodeFilter.fin);
        }
        let matchesKPI = true;
        if (kpiFilter) {
          switch (kpiFilter) {
            case 'ECHUES':
              matchesKPI = facture.statut !== 'PAYEE' && isFactureEnRetard(facture);
              break;
            case 'SEMAINE':
              if (facture.statut === 'PAYEE') {
                matchesKPI = false;
              } else {
                const echeance = new Date(facture.dateEcheance);
                echeance.setHours(0, 0, 0, 0);
                matchesKPI = echeance >= today && echeance <= finSemaine;
              }
              break;
            case 'TOUS': matchesKPI = true; break;
            case 'PAYEE': matchesKPI = facture.statut === 'PAYEE'; break;
            case 'BROUILLON': matchesKPI = facture.statut === 'BROUILLON'; break;
            case 'A_VALIDER': matchesKPI = facture.statut === 'A_VALIDER'; break;
            case 'VALIDEE': matchesKPI = facture.statut === 'VALIDEE'; break;
            case 'A_PAYER': matchesKPI = facture.statut === 'A_PAYER'; break;
          }
        }
        return matchesSearch && matchesStatut && matchesFournisseur && matchesPeriode && matchesKPI;
      })
      .sort((a, b) => {
        let comparison = 0;
        switch (sortColumn) {
          case 'date': comparison = new Date(a.date).getTime() - new Date(b.date).getTime(); break;
          case 'dateEcheance': comparison = new Date(a.dateEcheance).getTime() - new Date(b.dateEcheance).getTime(); break;
          case 'fournisseur': comparison = a.fournisseur.localeCompare(b.fournisseur); break;
          case 'montant': comparison = a.montant - b.montant; break;
          case 'statut':
            const statutOrder = ['BROUILLON', 'A_VALIDER', 'VALIDEE', 'A_PAYER', 'PAYEE'];
            comparison = statutOrder.indexOf(a.statut) - statutOrder.indexOf(b.statut);
            break;
        }
        return sortDirection === 'desc' ? -comparison : comparison;
      });
  }, [factures, searchTerm, statutFilter, fournisseurFilter, periodeFilter, sortColumn, sortDirection, kpiFilter]);

  const handleSort = useCallback((column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  }, [sortColumn]);

  const handleKPIClick = useCallback((filter: KPIFilterType) => {
    if (kpiFilter === filter) {
      setKpiFilter(null);
    } else {
      setKpiFilter(filter);
      setStatutFilter('TOUS');
    }
  }, [kpiFilter]);

  const handleStatutFilterChange = useCallback((filter: StatutFilterValue) => {
    setStatutFilter(filter);
    setKpiFilter(null);
  }, []);

  const handleStatutClick = useCallback((facture: Facture) => {
    setSelectedFacture(facture);
    setShowPaymentModal(true);
  }, []);

  const handleCategorize = useCallback((facture: Facture) => {
    setSelectedFacture(facture);
    setSelectedTypeDepense(detectTypeDepense(facture));
    setShowAccountingModal(true);
  }, []);

  const handlePaymentComplete = useCallback(async (compteId: string) => {
    if (!selectedFacture) return;

    setIsMutating(true);

    try {
      // Update status to 'paid' directly via Supabase update
      // This bypasses the Edge Function that requires auth
      const result = await updateInvoiceMutation.mutate({
        invoice_id: selectedFacture.id,
        status: 'paid',
      });

      if (result.error) {
        console.error('Payment error:', result.error);
      }

      // Update local state optimistically
      setFactures(prev => prev.map(f =>
        f.id === selectedFacture.id
          ? { ...f, statut: 'PAYEE' as StatutFacture, datePaiement: new Date().toISOString().split('T')[0], compteDebite: compteId }
          : f
      ));

      // Refresh from Supabase to ensure consistency
      await refreshWithTimestamp();
    } finally {
      setIsMutating(false);
    }

    setShowPaymentModal(false);
  }, [selectedFacture, updateInvoiceMutation, refreshWithTimestamp]);

  const handleSendToAccounting = useCallback(async () => {
    if (!selectedFacture) return;

    setIsMutating(true);

    try {
      // Update status to 'posted' (A_PAYER) in Supabase
      const result = await updateInvoiceMutation.mutate({
        invoice_id: selectedFacture.id,
        status: 'posted',
      });

      if (result.error) {
        console.error('Send to accounting error:', result.error);
      }

      // Update local state optimistically
      const posteBudgetaire = TYPE_DEPENSE_TO_POSTE[selectedTypeDepense] || selectedFacture.posteBudgetaire;
      setFactures(prev => prev.map(f =>
        f.id === selectedFacture.id
          ? { ...f, typeDepense: selectedTypeDepense, posteBudgetaire, statut: 'A_PAYER' as StatutFacture }
          : f
      ));

      // Refresh from Supabase to ensure consistency
      await refreshWithTimestamp();
    } finally {
      setIsMutating(false);
    }

    setShowAccountingModal(false);
    setSelectedFacture(null);
  }, [selectedFacture, selectedTypeDepense, updateInvoiceMutation, refreshWithTimestamp]);

  const handleView = useCallback((facture: Facture) => {
    setSelectedFacture(facture);
    setShowViewModal(true);
  }, []);

  const handleEdit = useCallback((facture: Facture) => {
    setSelectedFacture(facture);
    setEditForm({
      date: facture.date,
      fournisseur: facture.fournisseur,
      reference: facture.reference,
      montant: facture.montant,
      fichier: facture.fichier,
      posteBudgetaire: facture.posteBudgetaire
    });
    setShowEditModal(true);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!selectedFacture) return;

    setIsMutating(true);

    try {
      // Update in Supabase
      const result = await updateInvoiceMutation.mutate({
        invoice_id: selectedFacture.id,
        invoice_date: editForm.date,
        invoice_number: editForm.reference,
        total_amount: editForm.montant ? Number(editForm.montant) : undefined,
      });

      if (result.error) {
        console.error('Update error:', result.error);
      }

      // Update local state optimistically
      setFactures(prev => prev.map(f =>
        f.id === selectedFacture.id
          ? {
              ...f,
              date: editForm.date || f.date,
              fournisseur: editForm.fournisseur || f.fournisseur,
              reference: editForm.reference || f.reference,
              montant: editForm.montant || f.montant,
              fichier: editForm.fichier || f.fichier,
              posteBudgetaire: editForm.posteBudgetaire || f.posteBudgetaire
            }
          : f
      ));

      // Refresh from Supabase to ensure consistency
      await refreshWithTimestamp();
    } finally {
      setIsMutating(false);
    }

    setShowEditModal(false);
    setSelectedFacture(null);
    setEditForm({});
  }, [selectedFacture, editForm, updateInvoiceMutation, refreshWithTimestamp]);

  const handleDelete = useCallback((facture: Facture) => {
    setSelectedFacture(facture);
    setShowDeleteModal(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!selectedFacture) return;

    setIsMutating(true);

    try {
      // Delete (cancel) in Supabase
      const result = await deleteInvoiceMutation.mutate(selectedFacture.id);

      if (result.error) {
        console.error('Delete error:', result.error);
      }

      // Update local state optimistically
      setFactures(prev => prev.filter(f => f.id !== selectedFacture.id));

      // Refresh from Supabase to ensure consistency
      await refreshWithTimestamp();
    } finally {
      setIsMutating(false);
    }

    setShowDeleteModal(false);
    setSelectedFacture(null);
  }, [selectedFacture, deleteInvoiceMutation, refreshWithTimestamp]);

  const handleNewFacture = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    setNewFactureForm({
      date: today,
      dateEcheance: calculerDateEcheanceDefaut(today),
      fournisseur: '',
      reference: '',
      montant: '',
      fichier: ''
    });
    setShowNewModal(true);
  }, []);

  // State for creation error message
  const [createError, setCreateError] = useState<string | null>(null);

  const handleCreateFacture = useCallback(async () => {
    if (!newFactureForm.fournisseur || !newFactureForm.reference || !newFactureForm.montant || !newFactureForm.dateEcheance) return;

    setIsMutating(true);
    setCreateError(null);

    try {
      // Validate required Supabase data
      if (!currentCoproId) {
        setCreateError('Aucune copropriété sélectionnée');
        return;
      }
      if (!openPeriod) {
        setCreateError('Aucune période comptable ouverte');
        return;
      }

      // Find supplier by name (case-insensitive)
      const supplier = suppliers?.find(
        s => s.name.toLowerCase() === newFactureForm.fournisseur.toLowerCase()
      );

      if (!supplier) {
        setCreateError(`Le fournisseur "${newFactureForm.fournisseur}" n'existe pas. Veuillez d'abord le créer dans la liste des fournisseurs ou sélectionner un fournisseur existant.`);
        return;
      }

      const montant = parseFloat(newFactureForm.montant);

      // Direct creation in Supabase (bypasses Edge Function auth issues)
      const result = await createInvoiceMutation.mutate({
        period_id: openPeriod.id,
        supplier_id: supplier.id,
        invoice_number: newFactureForm.reference,
        invoice_date: newFactureForm.date,
        due_date: newFactureForm.dateEcheance,
        label: newFactureForm.reference,
        total_amount: montant,
      });

      if (result.error) {
        setCreateError(`Erreur lors de la création: ${result.error}`);
        return;
      }

      // Refresh to get the new invoice from Supabase
      await refreshWithTimestamp();
      setShowNewModal(false);
    } finally {
      setIsMutating(false);
    }
  }, [newFactureForm, currentCoproId, openPeriod, suppliers, createInvoiceMutation, refreshWithTimestamp]);

  const handleCreateAvoir = useCallback((facture: Facture) => {
    setSelectedFacture(facture);
    setShowAvoirModal(true);
  }, []);

  const handleConfirmAvoir = useCallback(async (montant: number, motif: MotifAvoir, reference: string) => {
    if (!selectedFacture) return;

    setIsMutating(true);

    try {
      // Try to create avoir in Supabase
      if (currentCoproId && openPeriod && suppliers) {
        // Find supplier by name (same as original invoice)
        const supplier = suppliers.find(
          s => s.name.toLowerCase() === selectedFacture.fournisseur.toLowerCase()
        );

        if (supplier) {
          // Create as a credit note (negative amount) using direct insertion
          const result = await createInvoiceMutation.mutate({
            period_id: openPeriod.id,
            supplier_id: supplier.id,
            invoice_number: reference,
            invoice_date: new Date().toISOString().split('T')[0],
            due_date: new Date().toISOString().split('T')[0],
            label: `Avoir: ${motif} - ${reference}`,
            total_amount: -montant, // Negative for credit note
          });

          if (!result.error) {
            await refreshWithTimestamp();
            setShowAvoirModal(false);
            setSelectedFacture(null);
            return;
          } else {
            console.error('Create avoir error:', result.error);
          }
        }
      }

      // Fallback: Create locally (shouldn't happen if supplier exists)
      const nouvelAvoir: Facture = {
        id: String(Date.now()),
        typeDocument: 'AVOIR',
        date: new Date().toISOString().split('T')[0],
        dateEcheance: new Date().toISOString().split('T')[0],
        fournisseur: selectedFacture.fournisseur,
        reference,
        montant,
        statut: 'A_PAYER',
        posteBudgetaire: selectedFacture.posteBudgetaire,
        factureOrigineId: selectedFacture.id,
        motifAvoir: motif
      };
      setFactures(prev => [nouvelAvoir, ...prev]);
      setShowAvoirModal(false);
      setSelectedFacture(null);
    } finally {
      setIsMutating(false);
    }
  }, [selectedFacture, currentCoproId, openPeriod, suppliers, createInvoiceMutation, refreshWithTimestamp]);

  const closePaymentModal = useCallback(() => setShowPaymentModal(false), []);
  const closeAccountingModal = useCallback(() => { setShowAccountingModal(false); setSelectedFacture(null); }, []);
  const closeViewModal = useCallback(() => { setShowViewModal(false); setSelectedFacture(null); }, []);
  const closeEditModal = useCallback(() => { setShowEditModal(false); setSelectedFacture(null); setEditForm({}); }, []);
  const closeDeleteModal = useCallback(() => { setShowDeleteModal(false); setSelectedFacture(null); }, []);
  const closeNewModal = useCallback(() => setShowNewModal(false), []);
  const closeAvoirModal = useCallback(() => { setShowAvoirModal(false); setSelectedFacture(null); }, []);

  return {
    // Data loading state
    isLoading,
    isMutating,
    error,
    refresh: refreshWithTimestamp,
    lastRefresh,
    currentCoproId,
    hasData: factures.length > 0,

    // Data
    suppliers: suppliers || [],
    factures,
    filteredFactures,
    searchTerm,
    setSearchTerm,
    statutFilter,
    sortOrder,
    setSortOrder,
    kpiFilter,
    sortColumn,
    sortDirection,
    fournisseurFilter,
    setFournisseurFilter,
    periodeFilter,
    setPeriodeFilter,
    fournisseurs,
    kpiData,
    selectedFacture,
    selectedTypeDepense,
    setSelectedTypeDepense,
    editForm,
    setEditForm,
    newFactureForm,
    setNewFactureForm,
    showPaymentModal,
    showAccountingModal,
    showViewModal,
    showEditModal,
    showDeleteModal,
    showNewModal,
    showAvoirModal,
    handleSort,
    handleKPIClick,
    handleStatutFilterChange,
    handleStatutClick,
    handleCategorize,
    handlePaymentComplete,
    handleSendToAccounting,
    handleView,
    handleEdit,
    handleSaveEdit,
    handleDelete,
    handleConfirmDelete,
    handleNewFacture,
    handleCreateFacture,
    createError,
    clearCreateError: () => setCreateError(null),
    handleCreateAvoir,
    handleConfirmAvoir,
    closePaymentModal,
    closeAccountingModal,
    closeViewModal,
    closeEditModal,
    closeDeleteModal,
    closeNewModal,
    closeAvoirModal,
  };
}

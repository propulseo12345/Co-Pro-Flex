'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import type { KPIFilterType } from '@/components/features/finance/Factures/FacturesKPI';
import type { SortColumn, SortDirection } from '@/components/features/finance/Factures/FacturesTable';
import { MOCK_FACTURES } from '@/components/features/finance/Factures/data';
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
import { useSupplierInvoices, useCreateSupplierInvoice, usePaySupplierInvoice, useOpenPeriod } from '@/hooks/modules/useFinanceData';

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
  const createInvoiceMutation = useCreateSupplierInvoice();
  const payInvoiceMutation = usePaySupplierInvoice();

  // Convert Supabase data to local format
  const supabaseFactures: Facture[] = useMemo(() => {
    if (!supabaseInvoices) return [];
    return supabaseInvoices.map(inv => ({
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
    }));
  }, [supabaseInvoices]);

  // Use Supabase data if available, otherwise fall back to mock
  const initialFactures = currentCoproId && supabaseFactures.length > 0 ? supabaseFactures : MOCK_FACTURES;
  const [factures, setFactures] = useState<Facture[]>(initialFactures);

  // Update factures when Supabase data changes
  useEffect(() => {
    if (currentCoproId && supabaseFactures.length > 0) {
      setFactures(supabaseFactures);
    } else if (!currentCoproId) {
      setFactures(MOCK_FACTURES);
    }
  }, [currentCoproId, supabaseFactures]);
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

  const handlePaymentComplete = useCallback((compteId: string) => {
    if (!selectedFacture) return;
    setFactures(prev => prev.map(f =>
      f.id === selectedFacture.id
        ? { ...f, statut: 'PAYEE' as StatutFacture, datePaiement: new Date().toISOString().split('T')[0], compteDebite: compteId }
        : f
    ));
    setShowPaymentModal(false);
  }, [selectedFacture]);

  const handleSendToAccounting = useCallback(() => {
    if (!selectedFacture) return;
    const posteBudgetaire = TYPE_DEPENSE_TO_POSTE[selectedTypeDepense] || selectedFacture.posteBudgetaire;
    setFactures(prev => prev.map(f =>
      f.id === selectedFacture.id
        ? { ...f, typeDepense: selectedTypeDepense, posteBudgetaire, statut: 'A_PAYER' as StatutFacture }
        : f
    ));
    setShowAccountingModal(false);
    setSelectedFacture(null);
  }, [selectedFacture, selectedTypeDepense]);

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

  const handleSaveEdit = useCallback(() => {
    if (!selectedFacture) return;
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
    setShowEditModal(false);
    setSelectedFacture(null);
    setEditForm({});
  }, [selectedFacture, editForm]);

  const handleDelete = useCallback((facture: Facture) => {
    setSelectedFacture(facture);
    setShowDeleteModal(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!selectedFacture) return;
    setFactures(prev => prev.filter(f => f.id !== selectedFacture.id));
    setShowDeleteModal(false);
    setSelectedFacture(null);
  }, [selectedFacture]);

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

  const handleCreateFacture = useCallback(async () => {
    if (!newFactureForm.fournisseur || !newFactureForm.reference || !newFactureForm.montant || !newFactureForm.dateEcheance) return;

    // If connected to Supabase, use the Edge Function
    if (currentCoproId && openPeriod) {
      // Note: This requires supplier_id which we don't have yet in the form
      // For now, we'll create locally and refresh will sync later
      // TODO: Add supplier selection to the form
    }

    const newFacture: Facture = {
      id: String(factures.length + 1 + Date.now()),
      typeDocument: 'FACTURE',
      date: newFactureForm.date,
      dateEcheance: newFactureForm.dateEcheance,
      fournisseur: newFactureForm.fournisseur,
      reference: newFactureForm.reference,
      montant: parseFloat(newFactureForm.montant),
      statut: 'BROUILLON',
      fichier: newFactureForm.fichier || undefined,
      posteBudgetaire: newFactureForm.posteBudgetaire,
      historique: [{
        id: String(Date.now()),
        date: new Date().toISOString(),
        type: 'CREATION',
        utilisateur: 'Utilisateur courant',
        commentaire: 'Création de la facture'
      }]
    };
    setFactures(prev => [newFacture, ...prev]);
    setShowNewModal(false);
  }, [factures.length, newFactureForm, currentCoproId, openPeriod]);

  const handleCreateAvoir = useCallback((facture: Facture) => {
    setSelectedFacture(facture);
    setShowAvoirModal(true);
  }, []);

  const handleConfirmAvoir = useCallback((montant: number, motif: MotifAvoir, reference: string) => {
    if (!selectedFacture) return;
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
  }, [selectedFacture]);

  const closePaymentModal = useCallback(() => setShowPaymentModal(false), []);
  const closeAccountingModal = useCallback(() => { setShowAccountingModal(false); setSelectedFacture(null); }, []);
  const closeViewModal = useCallback(() => { setShowViewModal(false); setSelectedFacture(null); }, []);
  const closeEditModal = useCallback(() => { setShowEditModal(false); setSelectedFacture(null); setEditForm({}); }, []);
  const closeDeleteModal = useCallback(() => { setShowDeleteModal(false); setSelectedFacture(null); }, []);
  const closeNewModal = useCallback(() => setShowNewModal(false), []);
  const closeAvoirModal = useCallback(() => { setShowAvoirModal(false); setSelectedFacture(null); }, []);

  return {
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

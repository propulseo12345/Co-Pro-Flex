'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  useSupplierInvoices,
  useRepartitionKeys,
  useUpdateSupplierInvoice,
  useCreateSupplierCreditNote,
  useOpenPeriod
} from '@/hooks/modules/useFinanceData';
import { listSupplierInvoiceLines } from '@/lib/finance/api';
import type { SupplierInvoiceOverview, CreditNoteLinePayload } from '@/lib/finance/api';
import { prorateLines } from '@/lib/finance/credit-notes';
import {
  formatCurrency,
  formatDate,
  getStatutBadgeClass,
  getStatutLabel,
  getNextStatut,
  getJoursRetard,
  STATUTS_FACTURE
} from '@/components/features/finance/Factures/utils';
import type { Facture, StatutFacture, EvenementFacture } from '@/components/features/finance/Factures/types';

// Map local status to Supabase status.
// Enum cible supplier_invoice_status = 'draft' | 'posted' | 'paid' | 'cancelled'
// (pas de 'approved' : décision « validée = posted » = comptabilisée, cf. dossier 2026-06-10).
function mapStatusToSupabase(statut: StatutFacture): 'draft' | 'posted' | 'paid' | 'cancelled' {
  switch (statut) {
    case 'BROUILLON': return 'draft';
    case 'A_VALIDER': return 'draft';   // pas encore comptabilisée
    case 'VALIDEE': return 'posted';    // validée = comptabilisée (D6xx/C401)
    case 'A_PAYER': return 'posted';
    case 'PAYEE': return 'paid';
    default: return 'draft';
  }
}

// Map Supabase invoice (vue v_supplier_invoices_overview) to Facture type
function mapSupabaseToFacture(invoice: SupplierInvoiceOverview): Facture {
  return {
    id: invoice.id,
    reference: invoice.invoice_number || `FAC-${invoice.id.slice(0, 8)}`,
    fournisseur: invoice.supplier_name,
    date: invoice.invoice_date,
    dateEcheance: invoice.due_date || invoice.invoice_date,
    montant: Number(invoice.total_amount),
    statut: mapStatus(invoice.status),
    typeDocument: invoice.doc_kind === 'credit_note' ? 'AVOIR' : 'FACTURE',
    factureOrigineId: invoice.original_invoice_id ?? undefined,
    ventilation: [],
    historique: [],
  };
}

function mapStatus(status: string): StatutFacture {
  switch (status) {
    case 'paid': return 'PAYEE';
    case 'posted': return 'A_PAYER';   // comptabilisée, en attente de règlement
    case 'cancelled': return 'BROUILLON';
    case 'draft': return 'BROUILLON';
    default: return 'A_VALIDER';
  }
}

export interface CreateAvoirParams {
  montant: number;
  date: string;
  numero: string;
  libelle: string;
}

export function useFactureDetailPage(factureId: string) {
  const router = useRouter();
  const { data: invoices, isLoading, refresh } = useSupplierInvoices();
  const { data: repartitionKeys } = useRepartitionKeys();
  const updateInvoiceMutation = useUpdateSupplierInvoice();
  const creditNoteMutation = useCreateSupplierCreditNote();
  const openPeriod = useOpenPeriod();
  const [isMutating, setIsMutating] = useState(false);
  const [isAvoirModalOpen, setIsAvoirModalOpen] = useState(false);
  const [avoirError, setAvoirError] = useState<string | null>(null);

  // Ligne brute de la vue (porte tiers_id, doc_kind, remaining_to_pay… que Facture ne connaît pas)
  const rawInvoice = useMemo(
    () => invoices?.find(f => f.id === factureId) ?? null,
    [invoices, factureId]
  );

  const initialFacture = useMemo(
    () => (rawInvoice ? mapSupabaseToFacture(rawInvoice) : null),
    [rawInvoice]
  );

  const [facture, setFacture] = useState<Facture | null>(null);

  // Update local state when Supabase data changes
  useEffect(() => {
    if (initialFacture) {
      setFacture(initialFacture);
    }
  }, [initialFacture]);

  const cleRepartition = useMemo(() => {
    if (!facture?.cleRepartitionId || !repartitionKeys) return null;
    return repartitionKeys.find(c => c.id === facture.cleRepartitionId) || null;
  }, [facture?.cleRepartitionId, repartitionKeys]);

  const joursRetard = useMemo(() => {
    if (!facture || facture.statut === 'PAYEE') return 0;
    return getJoursRetard(facture.dateEcheance);
  }, [facture]);

  const nextStatut = facture ? getNextStatut(facture.statut) : null;
  const isAvoir = facture?.typeDocument === 'AVOIR';

  // Un avoir se crée sur une facture COMPTABILISÉE (posted/paid), jamais sur un avoir.
  const canCreateAvoir = !!rawInvoice
    && rawInvoice.doc_kind === 'invoice'
    && (rawInvoice.status === 'posted' || rawInvoice.status === 'paid');

  const avoirContext = useMemo(() => {
    if (!rawInvoice) return null;
    return {
      montantTotal: Number(rawInvoice.total_amount),
      resteAPayer: Number(rawInvoice.remaining_to_pay),
    };
  }, [rawInvoice]);

  const openAvoirModal = useCallback(() => {
    setAvoirError(null);
    setIsAvoirModalOpen(true);
  }, []);

  const closeAvoirModal = useCallback(() => setIsAvoirModalOpen(false), []);

  const handleCreateAvoir = useCallback(async (params: CreateAvoirParams): Promise<boolean> => {
    if (!rawInvoice) {
      setAvoirError('Facture introuvable.');
      return false;
    }
    if (!openPeriod.data) {
      setAvoirError("Aucune période comptable ouverte : impossible de comptabiliser l'avoir.");
      return false;
    }
    setAvoirError(null);

    // Avoir total → la RPC copie la ventilation d'origine ; partiel → lignes au prorata.
    const isTotal = Math.abs(params.montant - Number(rawInvoice.total_amount)) < 0.005;
    let lines: CreditNoteLinePayload[] | undefined;
    if (!isTotal) {
      const linesResult = await listSupplierInvoiceLines(rawInvoice.id);
      if (linesResult.error || !linesResult.data || linesResult.data.length === 0) {
        setAvoirError("Ventilation de la facture d'origine introuvable : avoir partiel impossible (un avoir total reste possible).");
        return false;
      }
      lines = prorateLines(linesResult.data, params.montant);
      if (lines.length === 0) {
        setAvoirError("Le montant demandé ne produit aucune ligne de ventilation valide.");
        return false;
      }
    }

    const result = await creditNoteMutation.mutate({
      period_id: openPeriod.data.id,
      supplier_id: rawInvoice.tiers_id,
      invoice_number: params.numero,
      invoice_date: params.date,
      label: params.libelle,
      original_invoice_id: rawInvoice.id,
      ...(lines ? { lines } : {}),
    });

    if (result.error) {
      setAvoirError(result.error);
      return false;
    }

    setIsAvoirModalOpen(false);
    await refresh();
    return true;
  }, [rawInvoice, openPeriod.data, creditNoteMutation, refresh]);

  const handleBack = useCallback(() => {
    router.push('/finance/factures');
  }, [router]);

  const handleChangeStatut = useCallback(async (nouveauStatut: StatutFacture) => {
    if (!facture) return;

    setIsMutating(true);

    try {
      // Update status in Supabase
      const supabaseStatus = mapStatusToSupabase(nouveauStatut);
      const result = await updateInvoiceMutation.mutate({
        invoice_id: facture.id,
        status: supabaseStatus,
      });

      if (result.error) {
        console.error('Status update error:', result.error);
        return;
      }

      // Update local state optimistically
      const nouvelEvenement: EvenementFacture = {
        id: `evt-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        type: nouveauStatut === 'PAYEE' ? 'PAIEMENT' : 'CHANGEMENT_STATUT',
        statutPrecedent: facture.statut,
        nouveauStatut,
        utilisateur: 'Utilisateur courant',
      };

      setFacture(prev => prev ? {
        ...prev,
        statut: nouveauStatut,
        historique: [...(prev.historique || []), nouvelEvenement],
        ...(nouveauStatut === 'VALIDEE' ? { dateValidation: new Date().toISOString().split('T')[0], validePar: 'Utilisateur courant' } : {}),
        ...(nouveauStatut === 'PAYEE' ? { datePaiement: new Date().toISOString().split('T')[0] } : {}),
      } : null);

      // Refresh from Supabase to ensure consistency
      await refresh();
    } finally {
      setIsMutating(false);
    }
  }, [facture, updateInvoiceMutation, refresh]);

  const getActionLabel = useCallback((statut: StatutFacture): string => {
    switch (statut) {
      case 'BROUILLON': return 'Soumettre pour validation';
      case 'A_VALIDER': return 'Valider la facture';
      case 'VALIDEE': return 'Mettre en paiement';
      case 'A_PAYER': return 'Marquer comme payée';
      default: return '';
    }
  }, []);

  return {
    facture,
    cleRepartition,
    joursRetard,
    nextStatut,
    isAvoir,
    isLoading,
    isMutating,
    canCreateAvoir,
    avoirContext,
    isAvoirModalOpen,
    isCreatingAvoir: creditNoteMutation.isLoading,
    avoirError,
    openAvoirModal,
    closeAvoirModal,
    handleCreateAvoir,
    handleBack,
    handleChangeStatut,
    getActionLabel,
    formatCurrency,
    formatDate,
    getStatutBadgeClass,
    getStatutLabel,
    STATUTS_FACTURE,
    repartitionKeys: repartitionKeys || [],
  };
}

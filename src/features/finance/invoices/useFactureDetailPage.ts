'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupplierInvoices, useRepartitionKeys, useUpdateSupplierInvoice } from '@/hooks/modules/useFinanceData';
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

// Map local status to Supabase status
function mapStatusToSupabase(statut: StatutFacture): 'draft' | 'approved' | 'posted' | 'paid' | 'cancelled' {
  switch (statut) {
    case 'BROUILLON': return 'draft';
    case 'A_VALIDER': return 'approved';
    case 'VALIDEE': return 'approved';
    case 'A_PAYER': return 'posted';
    case 'PAYEE': return 'paid';
    default: return 'draft';
  }
}

// Map Supabase invoice to Facture type
function mapSupabaseToFacture(invoice: any): Facture {
  return {
    id: invoice.id,
    reference: invoice.invoice_number || `FAC-${invoice.id.slice(0, 8)}`,
    fournisseur: invoice.supplier_name,
    date: invoice.invoice_date,
    dateEcheance: invoice.due_date || invoice.invoice_date,
    montant: Number(invoice.total_amount),
    statut: mapStatus(invoice.status),
    typeDocument: 'FACTURE',
    ventilation: [],
    historique: [],
  };
}

function mapStatus(status: string): StatutFacture {
  switch (status) {
    case 'paid': return 'PAYEE';
    case 'posted':
    case 'approved': return 'A_PAYER';
    case 'draft': return 'BROUILLON';
    default: return 'A_VALIDER';
  }
}

export function useFactureDetailPage(factureId: string) {
  const router = useRouter();
  const { data: invoices, isLoading, refresh } = useSupplierInvoices();
  const { data: repartitionKeys } = useRepartitionKeys();
  const updateInvoiceMutation = useUpdateSupplierInvoice();
  const [isMutating, setIsMutating] = useState(false);

  // Find and map the invoice from Supabase data
  const initialFacture = useMemo(() => {
    if (!invoices) return null;
    const invoice = invoices.find(f => f.id === factureId);
    return invoice ? mapSupabaseToFacture(invoice) : null;
  }, [invoices, factureId]);

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

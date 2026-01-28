'use client';

/**
 * VentesProvider - Context provider for sales/mutations
 * Source: Supabase (zero mock fallback)
 */

import { createContext, useContext, useState, useCallback, useMemo, useEffect, ReactNode } from 'react';
import { useCopro } from '@/providers/CoproContext';
import { useSalesList } from '@/hooks/modules/useSalesData';
import { useSalesMutations, type CreateSaleInput } from '@/hooks/modules/useSalesMutations';
import * as salesApi from '@/lib/sales/api';
import type {
  MutationOverview,
  MutationDetail,
  StepKey,
  DbMutationStatus,
} from '@/lib/sales/api';
import type {
  Vente,
  VenteDocument,
  VenteStatut,
  VenteEtapeWorkflow,
  CreateVenteData,
  UpdateVenteData,
} from '@/types/models/vente';

// ============================================================================
// Mappers: DB → Frontend
// ============================================================================

/**
 * Map DB mutation to frontend Vente format
 */
function mapMutationToVente(m: MutationOverview): Vente {
  return {
    id: m.id,
    lotIds: [m.lot_id],
    lotTypes: [m.lot_type || 'appartement'],
    vendeur: m.seller_name || 'Inconnu',
    vendeurId: m.seller_owner_id,
    acquereur: m.buyer_name || undefined,
    acquereurId: m.buyer_owner_id || undefined,
    notaire: m.notary_name || undefined,
    notaireEmail: m.notary_email || undefined,
    dateCompromis: m.requested_at?.split('T')[0],
    dateActeAuthentique: m.signature_date || undefined,
    dateNotificationArticle6: m.effective_date || undefined,
    statut: mapDbStatusToVenteStatut(m.status),
    etapeWorkflow: mapDbStatusToWorkflowStep(m.status, m.has_pre_etat, m.has_final_etat),
    documents: [],
    historique: [],
    observations: m.notes || undefined,
    dateCreation: m.created_at,
    dateModification: m.updated_at,
  };
}

/**
 * Map DB status to frontend VenteStatut
 */
function mapDbStatusToVenteStatut(status: DbMutationStatus): VenteStatut {
  switch (status) {
    case 'validated':
      return 'TERMINEE';
    case 'cancelled':
      return 'ANNULEE';
    default:
      return 'EN_COURS';
  }
}

/**
 * Map DB status + flags to workflow step
 */
function mapDbStatusToWorkflowStep(
  status: DbMutationStatus,
  hasPreEtat: boolean,
  hasFinalEtat: boolean
): VenteEtapeWorkflow {
  if (status === 'validated') return 'cloture_compte';
  if (status === 'signed') return 'signature_acte';
  if (status === 'sent_to_notary') return 'envoi_notaire';
  if (hasFinalEtat) return 'etat_date';
  if (hasPreEtat) return 'pre_etat_date';
  return 'demande';
}

/**
 * Map frontend VenteStatut to DB status
 */
function mapVenteStatutToDb(statut: VenteStatut): DbMutationStatus {
  switch (statut) {
    case 'TERMINEE':
      return 'validated';
    case 'ANNULEE':
      return 'cancelled';
    default:
      return 'draft';
  }
}

/**
 * Map frontend workflow step to DB step key
 */
function mapWorkflowStepToStepKey(step: VenteEtapeWorkflow): StepKey {
  // Map legacy steps to V2 steps
  switch (step) {
    case 'creation':
    case 'demande':
      return 'demande';
    case 'generation':
    case 'pre_etat_date':
      return 'pre_etat_date';
    case 'etat_date':
      return 'etat_date';
    case 'signature':
    case 'envoi_notaire':
      return 'envoi_notaire';
    case 'transmission':
    case 'signature_acte':
      return 'signature_acte';
    case 'notification':
    case 'cloture_compte':
      return 'cloture_compte';
    default:
      return 'demande';
  }
}

// ============================================================================
// Context Type
// ============================================================================

interface VentesContextType {
  // État
  ventes: Vente[];
  isLoading: boolean;
  error: string | null;

  // CRUD
  createVente: (data: CreateVenteData) => Promise<Vente | null>;
  updateVente: (id: string, data: UpdateVenteData) => Promise<void>;
  deleteVente: (id: string) => Promise<void>;
  getVenteById: (id: string) => Vente | undefined;

  // Documents
  addDocument: (venteId: string, document: Omit<VenteDocument, 'id'>) => void;
  updateDocumentStatus: (venteId: string, documentId: string, statut: VenteDocument['statut'], signePar?: string) => void;

  // Workflow
  advanceWorkflow: (venteId: string, nextStep: VenteEtapeWorkflow) => Promise<void>;
  updateStatut: (venteId: string, statut: VenteStatut) => Promise<void>;

  // Historique
  addHistorique: (venteId: string, action: string, utilisateur: string, details?: string) => void;

  // Refresh
  refresh: () => Promise<void>;
}

const VentesContext = createContext<VentesContextType | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

export function VentesProvider({ children }: { children: ReactNode }) {
  const { currentCoproId } = useCopro();

  // Supabase data hook
  const {
    mutations: rawMutations,
    isLoading,
    error,
    refresh: refreshData,
  } = useSalesList();

  // Supabase mutations hook
  const mutations = useSalesMutations({ onSuccess: refreshData });

  // Convert to frontend format
  const ventes = useMemo(() => {
    return rawMutations.map(mapMutationToVente);
  }, [rawMutations]);

  // ============================================
  // CRUD Operations
  // ============================================

  const createVente = useCallback(async (data: CreateVenteData): Promise<Vente | null> => {
    if (!currentCoproId) return null;

    // Map to API input
    const input: CreateSaleInput = {
      lot_id: data.lotIds[0],
      seller_owner_id: data.vendeurId,
      buyer_name: data.acquereur,
      notary_name: data.notaire,
      notes: data.observations,
    };

    const mutationId = await mutations.createSale(input);

    if (mutationId) {
      await refreshData();
      // Return the created vente
      const created = ventes.find((v) => v.id === mutationId);
      return created || null;
    }

    return null;
  }, [currentCoproId, mutations, refreshData, ventes]);

  const updateVente = useCallback(async (id: string, data: UpdateVenteData): Promise<void> => {
    await mutations.updateSale(id, {
      buyer_name: data.acquereur,
      notary_name: data.notaire,
      signature_date: data.dateActeAuthentique,
      effective_date: data.dateNotificationArticle6,
      notes: data.observations,
    });

    if (data.statut) {
      await mutations.updateSaleStatus(id, mapVenteStatutToDb(data.statut));
    }

    await refreshData();
  }, [mutations, refreshData]);

  const deleteVente = useCallback(async (id: string): Promise<void> => {
    await mutations.deleteSale(id);
    await refreshData();
  }, [mutations, refreshData]);

  const getVenteById = useCallback((id: string): Vente | undefined => {
    return ventes.find((v) => v.id === id);
  }, [ventes]);

  // ============================================
  // Document Operations (stored in step payload)
  // ============================================

  const addDocument = useCallback((venteId: string, document: Omit<VenteDocument, 'id'>) => {
    // Store document info in the appropriate step's payload
    const stepKey = document.type === 'PRE_ETAT_DATE' ? 'pre_etat_date' :
                    document.type === 'ETAT_DATE' ? 'etat_date' : 'demande';

    mutations.upsertStep(venteId, stepKey, undefined, {
      documents: [{
        id: `doc-${Date.now()}`,
        ...document,
      }],
    });
  }, [mutations]);

  const updateDocumentStatus = useCallback(
    (venteId: string, documentId: string, statut: VenteDocument['statut'], signePar?: string) => {
      // This would update the document in the step payload
      // For MVP, we just log this
      console.log('updateDocumentStatus:', { venteId, documentId, statut, signePar });
    },
    []
  );

  // ============================================
  // Workflow Operations
  // ============================================

  const advanceWorkflow = useCallback(async (venteId: string, nextStep: VenteEtapeWorkflow): Promise<void> => {
    const stepKey = mapWorkflowStepToStepKey(nextStep);

    // Mark the step as completed
    await mutations.completeStep(venteId, stepKey);

    // Update status if reaching final steps
    if (nextStep === 'notification' || nextStep === 'cloture_compte') {
      await mutations.validateSale(venteId, new Date().toISOString().split('T')[0]);
    } else if (nextStep === 'signature_acte' || nextStep === 'transmission') {
      await mutations.markAsSigned(venteId, new Date().toISOString().split('T')[0]);
    } else if (nextStep === 'envoi_notaire' || nextStep === 'signature') {
      await mutations.sendToNotary(venteId);
    }

    await refreshData();
  }, [mutations, refreshData]);

  const updateStatut = useCallback(async (venteId: string, statut: VenteStatut): Promise<void> => {
    const dbStatus = mapVenteStatutToDb(statut);
    await mutations.updateSaleStatus(venteId, dbStatus);
    await refreshData();
  }, [mutations, refreshData]);

  // ============================================
  // Historique (stored in step payload for MVP)
  // ============================================

  const addHistorique = useCallback(
    (venteId: string, action: string, utilisateur: string, details?: string) => {
      // For MVP, history is not persisted separately
      console.log('addHistorique:', { venteId, action, utilisateur, details });
    },
    []
  );

  // ============================================
  // Refresh
  // ============================================

  const refresh = useCallback(async () => {
    await refreshData();
  }, [refreshData]);

  // ============================================
  // Context Value
  // ============================================

  const value: VentesContextType = {
    ventes,
    isLoading,
    error,
    createVente,
    updateVente,
    deleteVente,
    getVenteById,
    addDocument,
    updateDocumentStatus,
    advanceWorkflow,
    updateStatut,
    addHistorique,
    refresh,
  };

  return <VentesContext.Provider value={value}>{children}</VentesContext.Provider>;
}

export function useVentesContext() {
  const context = useContext(VentesContext);
  if (context === undefined) {
    throw new Error('useVentesContext must be used within a VentesProvider');
  }
  return context;
}

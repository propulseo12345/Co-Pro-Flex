'use client';

/**
 * Sales Mutations Hook
 * All CRUD operations for sales/mutations
 */

import { useState, useCallback } from 'react';
import { useCopro } from '@/providers/CoproContext';
import * as salesApi from '@/lib/sales/api';
import { createClient } from '@/lib/supabase/client';

// Client non typé pour les RPC canoniques mutations/état daté (pas encore dans les types générés).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpcClient = () => createClient() as any;
import type {
  CreateMutationInput,
  DbMutationStatus,
  StepKey,
  SnapshotType,
} from '@/lib/sales/api';

// ============================================================================
// Types
// ============================================================================

export interface UseSalesMutationsOptions {
  /** Callback after successful mutation */
  onSuccess?: () => void;
}

export interface UseSalesMutationsResult {
  /** Saving state */
  isSaving: boolean;
  /** Error message */
  error: string | null;

  // Mutation CRUD
  createSale: (input: CreateSaleInput) => Promise<string | null>;
  updateSale: (mutationId: string, input: UpdateSaleInput) => Promise<boolean>;
  updateSaleStatus: (mutationId: string, status: DbMutationStatus) => Promise<boolean>;
  deleteSale: (mutationId: string) => Promise<boolean>;

  // Step operations
  upsertStep: (mutationId: string, stepKey: StepKey, status?: string, payload?: Record<string, unknown>) => Promise<boolean>;
  completeStep: (mutationId: string, stepKey: StepKey, payload?: Record<string, unknown>) => Promise<boolean>;
  startStep: (mutationId: string, stepKey: StepKey, payload?: Record<string, unknown>) => Promise<boolean>;

  // Etat date operations
  createEtatDate: (mutationId: string, snapshotType: SnapshotType, payload: Record<string, unknown>, documentId?: string) => Promise<string | null>;

  // Workflow helpers
  sendToNotary: (mutationId: string) => Promise<boolean>;
  markAsSigned: (mutationId: string, signatureDate: string) => Promise<boolean>;
  validateSale: (mutationId: string, effectiveDate: string) => Promise<boolean>;
  cancelSale: (mutationId: string) => Promise<boolean>;
}

/** Simplified input for creating a sale */
export interface CreateSaleInput {
  lot_id: string;
  seller_owner_id: string;
  buyer_name?: string;
  buyer_email?: string;
  buyer_is_company?: boolean;
  notary_name?: string;
  notary_email?: string;
  notary_reference?: string;
  notes?: string;
}

/** Simplified input for updating a sale */
export interface UpdateSaleInput {
  buyer_name?: string;
  buyer_email?: string;
  buyer_is_company?: boolean;
  buyer_owner_id?: string;
  notary_name?: string;
  notary_email?: string;
  notary_reference?: string;
  signature_date?: string;
  effective_date?: string;
  notes?: string;
}

// ============================================================================
// Hook
// ============================================================================

export function useSalesMutations(
  options: UseSalesMutationsOptions = {}
): UseSalesMutationsResult {
  const { currentCoproId } = useCopro();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Wrapper for async operations with error handling
   */
  const withSaving = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T | null> => {
      if (!currentCoproId) {
        setError('Aucune copropriété sélectionnée');
        return null;
      }

      setIsSaving(true);
      setError(null);

      try {
        const result = await fn();
        options.onSuccess?.();
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur lors de l\'opération';
        setError(message);
        console.error('useSalesMutations error:', err);
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [currentCoproId, options]
  );

  // ============================================
  // Mutation CRUD
  // ============================================

  const createSale = useCallback(
    async (input: CreateSaleInput): Promise<string | null> => {
      return withSaving(async () => {
        const apiInput: CreateMutationInput = {
          copro_id: currentCoproId!,
          ...input,
        };
        return salesApi.createMutation(apiInput);
      });
    },
    [currentCoproId, withSaving]
  );

  const updateSale = useCallback(
    async (mutationId: string, input: UpdateSaleInput): Promise<boolean> => {
      const result = await withSaving(async () => {
        await salesApi.updateMutation(mutationId, input);
        return true;
      });
      return result === true;
    },
    [withSaving]
  );

  const updateSaleStatus = useCallback(
    async (mutationId: string, status: DbMutationStatus): Promise<boolean> => {
      const result = await withSaving(async () => {
        await salesApi.updateMutationStatus(mutationId, status);
        return true;
      });
      return result === true;
    },
    [withSaving]
  );

  const deleteSale = useCallback(
    async (mutationId: string): Promise<boolean> => {
      const result = await withSaving(async () => {
        await salesApi.deleteMutation(mutationId);
        return true;
      });
      return result === true;
    },
    [withSaving]
  );

  // ============================================
  // Step operations
  // ============================================

  const upsertStep = useCallback(
    async (
      mutationId: string,
      stepKey: StepKey,
      status?: string,
      payload?: Record<string, unknown>
    ): Promise<boolean> => {
      const result = await withSaving(async () => {
        await salesApi.upsertMutationStep({
          mutation_id: mutationId,
          step_key: stepKey,
          status: status as salesApi.DbStepStatus | undefined,
          payload,
        });
        return true;
      });
      return result === true;
    },
    [withSaving]
  );

  const completeStep = useCallback(
    async (
      mutationId: string,
      stepKey: StepKey,
      payload?: Record<string, unknown>
    ): Promise<boolean> => {
      const result = await withSaving(async () => {
        await salesApi.completeStep(mutationId, stepKey, payload);
        return true;
      });
      return result === true;
    },
    [withSaving]
  );

  const startStep = useCallback(
    async (
      mutationId: string,
      stepKey: StepKey,
      payload?: Record<string, unknown>
    ): Promise<boolean> => {
      const result = await withSaving(async () => {
        await salesApi.startStep(mutationId, stepKey, payload);
        return true;
      });
      return result === true;
    },
    [withSaving]
  );

  // ============================================
  // Etat date operations
  // ============================================

  const createEtatDate = useCallback(
    async (
      mutationId: string,
      snapshotType: SnapshotType,
      payload: Record<string, unknown>,
      documentId?: string
    ): Promise<string | null> => {
      return withSaving(async () => {
        // Route canonique : create_etat_date_snapshot (RPC) — fige un snapshot IMMUABLE dont le payload
        // est calculé côté SQL (generate_etat_date_payload). Remplace l'INSERT client brut qui plantait
        // sur effective_date NOT NULL et contournait l'immutabilité. payload/documentId ignorés (le SQL
        // est la source de vérité). Cf. PLAN_J5 T5 #18/#19.
        void payload; void documentId;
        const { data, error } = await rpcClient().rpc('create_etat_date_snapshot', {
          p_copro_id: currentCoproId,
          p_mutation_id: mutationId,
          p_snapshot_type: snapshotType,
        });
        if (error) throw new Error(error.message);
        const res = (data ?? {}) as { success?: boolean; snapshot_id?: string; error?: string };
        if (!res.success || !res.snapshot_id) throw new Error(res.error ?? "Échec de la génération de l'état daté");
        return res.snapshot_id;
      });
    },
    [currentCoproId, withSaving]
  );

  // ============================================
  // Workflow helpers
  // ============================================

  const sendToNotary = useCallback(
    async (mutationId: string): Promise<boolean> => {
      const result = await withSaving(async () => {
        await salesApi.updateMutationStatus(mutationId, 'sent_to_notary');
        await salesApi.completeStep(mutationId, 'envoi_notaire', {
          sent_at: new Date().toISOString(),
        });
        return true;
      });
      return result === true;
    },
    [withSaving]
  );

  const markAsSigned = useCallback(
    async (mutationId: string, signatureDate: string): Promise<boolean> => {
      const result = await withSaving(async () => {
        await salesApi.updateMutation(mutationId, { signature_date: signatureDate });
        await salesApi.updateMutationStatus(mutationId, 'signed');
        await salesApi.completeStep(mutationId, 'signature_acte', {
          signature_date: signatureDate,
        });
        return true;
      });
      return result === true;
    },
    [withSaving]
  );

  const validateSale = useCallback(
    async (
      mutationId: string,
      effectiveDate: string,
      ledgerOptions?: {
        periodId: string;
        lotId: string;
        alurFundAmount?: number;
        sellerAccountId?: string;
        buyerAccountId?: string;
      }
    ): Promise<boolean> => {
      // Route canonique : validate_mutation (RPC) — bascule lot_owners (le lot change de propriétaire,
      // lot-centric) et NE POSTE AUCUN GL (le fonds ALUR 450-5 reste attaché au lot). L'ancien chemin
      // faisait un UPDATE status='validated' SANS basculer lot_owners ET postait une écriture ALUR
      // (double violation). ledgerOptions est désormais IGNORÉ. Cf. PLAN_J5 T5 #18 (BLOCKER).
      void ledgerOptions;
      const result = await withSaving(async () => {
        const { data, error } = await rpcClient().rpc('validate_mutation', {
          p_mutation_id: mutationId,
          p_signature_date: effectiveDate,
          p_effective_date: effectiveDate,
        });
        if (error) throw new Error(error.message);
        const res = (data ?? {}) as { success?: boolean; error?: string };
        if (!res.success) throw new Error(res.error ?? 'Échec de la validation de la mutation');
        return true;
      });
      return result === true;
    },
    [withSaving]
  );

  const cancelSale = useCallback(
    async (mutationId: string): Promise<boolean> => {
      const result = await withSaving(async () => {
        await salesApi.updateMutationStatus(mutationId, 'cancelled');
        return true;
      });
      return result === true;
    },
    [withSaving]
  );

  return {
    isSaving,
    error,
    createSale,
    updateSale,
    updateSaleStatus,
    deleteSale,
    upsertStep,
    completeStep,
    startStep,
    createEtatDate,
    sendToNotary,
    markAsSigned,
    validateSale,
    cancelSale,
  };
}

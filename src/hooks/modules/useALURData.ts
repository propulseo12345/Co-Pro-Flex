'use client';

/**
 * Hook for ALUR fund data management
 * Loads ALUR fund summary, lot contributions, and transfer history from Supabase
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useCopro } from '@/providers/CoproContext';
import { createClient } from '@/lib/supabase/client';
import { getCurrentBusinessYear } from '@/lib/time/period';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createUntypedClient = () => createClient() as any;

// ============================================================================
// Types
// ============================================================================

export interface ALURFundSummary {
  budgetId: string;
  periodYear: number;
  cotisationAnnuelle: number;
  totalTransferred: number;
  soldeActuel: number;
  pourcentageBudget: number;
  budgetFonctionnement: number;
}

export interface ALURLotContribution {
  lotId: string;
  lotRef: string;
  tantiemesGeneraux: number;
  ownerId: string | null;
  ownerName: string;
  sharePercent: number;
  lotSoldeAlur: number;
  lotCotisationAnnuelle: number;
}

export interface ALURTransfer {
  id: string;
  amount: number;
  transferDate: string;
  destination: 'compte_courant' | 'budget_travaux';
  destinationBudgetId: string | null;
  destinationBudgetName: string | null;
  description: string;
  periodYear: number;
}

export interface CreateTransferInput {
  amount: number;
  destination: 'compte_courant' | 'budget_travaux';
  destinationBudgetId?: string;
  description: string;
}

export interface UseALURDataReturn {
  // Data
  fundSummary: ALURFundSummary | null;
  lotContributions: ALURLotContribution[];
  transfers: ALURTransfer[];
  worksBudgets: Array<{ id: string; name: string; remaining: number }>;

  // State
  isLoading: boolean;
  error: string | null;
  selectedYear: number;

  // Actions
  setSelectedYear: (year: number) => void;
  createTransfer: (input: CreateTransferInput) => Promise<boolean>;
  refresh: () => Promise<void>;
}

// ============================================================================
// Hook
// ============================================================================

// Default copro ID for development (from seed data)
const DEV_COPRO_ID = '11111111-aaaa-bbbb-cccc-111111111111';

export function useALURData(): UseALURDataReturn {
  const { currentCoproId: contextCoproId } = useCopro();
  // Use context copro ID, fallback to dev ID if not available
  const currentCoproId = contextCoproId || DEV_COPRO_ID;
  const [selectedYear, setSelectedYear] = useState(getCurrentBusinessYear());

  const [fundSummary, setFundSummary] = useState<ALURFundSummary | null>(null);
  const [lotContributions, setLotContributions] = useState<ALURLotContribution[]>([]);
  const [transfers, setTransfers] = useState<ALURTransfer[]>([]);
  const [worksBudgets, setWorksBudgets] = useState<Array<{ id: string; name: string; remaining: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // Load ALUR fund summary
  // ============================================================================
  const loadFundSummary = useCallback(async () => {
    if (!currentCoproId) {
      setFundSummary(null);
      return;
    }

    const supabase = createUntypedClient();

    try {
      const { data, error: queryError } = await supabase
        .from('v_alur_fund_summary')
        .select('*')
        .eq('copro_id', currentCoproId)
        .eq('period_year', selectedYear)
        .single();

      if (queryError) {
        if (queryError.code === 'PGRST116') {
          // No ALUR budget for this year - return default values
          setFundSummary({
            budgetId: '',
            periodYear: selectedYear,
            cotisationAnnuelle: 0,
            totalTransferred: 0,
            soldeActuel: 0,
            pourcentageBudget: 5,
            budgetFonctionnement: 0,
          });
          return;
        }
        throw new Error(queryError.message);
      }

      setFundSummary({
        budgetId: data.budget_id,
        periodYear: data.period_year,
        cotisationAnnuelle: Number(data.cotisation_annuelle) || 0,
        totalTransferred: Number(data.total_transferred) || 0,
        soldeActuel: Number(data.solde_actuel) || 0,
        pourcentageBudget: Number(data.pourcentage_budget) || 5,
        budgetFonctionnement: Number(data.budget_fonctionnement) || 0,
      });
    } catch (err) {
      console.error('[useALURData] Error loading fund summary:', err);
      // Set default values on error
      setFundSummary({
        budgetId: '',
        periodYear: selectedYear,
        cotisationAnnuelle: 0,
        totalTransferred: 0,
        soldeActuel: 0,
        pourcentageBudget: 5,
        budgetFonctionnement: 0,
      });
    }
  }, [currentCoproId, selectedYear]);

  // ============================================================================
  // Load lot contributions
  // ============================================================================
  const loadLotContributions = useCallback(async () => {
    if (!currentCoproId) {
      setLotContributions([]);
      return;
    }

    const supabase = createUntypedClient();

    try {
      const { data, error: queryError } = await supabase
        .from('v_alur_lot_contributions')
        .select('*')
        .eq('copro_id', currentCoproId)
        .order('lot_ref', { ascending: true });

      if (queryError) {
        throw new Error(queryError.message);
      }

      setLotContributions((data || []).map((row: Record<string, unknown>) => ({
        lotId: row.lot_id as string,
        lotRef: row.lot_ref as string,
        tantiemesGeneraux: Number(row.tantiemes_generaux) || 0,
        ownerId: row.owner_id as string | null,
        ownerName: row.owner_name as string || 'Non assigné',
        sharePercent: Number(row.share_percent) || 0,
        lotSoldeAlur: Number(row.lot_solde_alur) || 0,
        lotCotisationAnnuelle: Number(row.lot_cotisation_annuelle) || 0,
      })));
    } catch (err) {
      console.error('[useALURData] Error loading lot contributions:', err);
      setLotContributions([]);
    }
  }, [currentCoproId]);

  // ============================================================================
  // Load transfer history
  // ============================================================================
  const loadTransfers = useCallback(async () => {
    if (!currentCoproId) {
      setTransfers([]);
      return;
    }

    const supabase = createUntypedClient();

    try {
      const { data, error: queryError } = await supabase
        .from('v_alur_transfers_history')
        .select('*')
        .eq('copro_id', currentCoproId)
        .order('transfer_date', { ascending: false });

      if (queryError) {
        throw new Error(queryError.message);
      }

      setTransfers((data || []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        amount: Number(row.amount) || 0,
        transferDate: row.transfer_date as string,
        destination: row.destination as 'compte_courant' | 'budget_travaux',
        destinationBudgetId: row.destination_budget_id as string | null,
        destinationBudgetName: row.destination_budget_name as string | null,
        description: row.description as string,
        periodYear: Number(row.period_year) || selectedYear,
      })));
    } catch (err) {
      console.error('[useALURData] Error loading transfers:', err);
      setTransfers([]);
    }
  }, [currentCoproId, selectedYear]);

  // ============================================================================
  // Load works budgets (for transfer destination selection)
  // ============================================================================
  const loadWorksBudgets = useCallback(async () => {
    if (!currentCoproId) {
      setWorksBudgets([]);
      return;
    }

    const supabase = createUntypedClient();

    try {
      const { data, error: queryError } = await supabase
        .from('v_budgets_overview')
        .select('id, name, remaining')
        .eq('copro_id', currentCoproId)
        .eq('budget_type', 'works')
        .in('status', ['draft', 'validated'])
        .order('period_year', { ascending: false });

      if (queryError) {
        throw new Error(queryError.message);
      }

      setWorksBudgets((data || []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        name: row.name as string,
        remaining: Number(row.remaining) || 0,
      })));
    } catch (err) {
      console.error('[useALURData] Error loading works budgets:', err);
      setWorksBudgets([]);
    }
  }, [currentCoproId]);

  // ============================================================================
  // Create transfer
  // ============================================================================
  const createTransfer = useCallback(async (input: CreateTransferInput): Promise<boolean> => {
    if (!currentCoproId || !fundSummary?.budgetId) {
      setError('Impossible de créer le transfert: données manquantes');
      return false;
    }

    if (input.amount > fundSummary.soldeActuel) {
      setError('Le montant du transfert dépasse le solde disponible');
      return false;
    }

    const supabase = createUntypedClient();

    try {
      const { error: insertError } = await supabase
        .from('alur_transfers')
        .insert({
          copro_id: currentCoproId,
          alur_budget_id: fundSummary.budgetId,
          amount: input.amount,
          destination: input.destination,
          destination_budget_id: input.destinationBudgetId || null,
          description: input.description,
        });

      if (insertError) {
        throw new Error(insertError.message);
      }

      // Refresh data after transfer
      await refresh();
      return true;
    } catch (err) {
      console.error('[useALURData] Error creating transfer:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la création du transfert');
      return false;
    }
  }, [currentCoproId, fundSummary]);

  // ============================================================================
  // Refresh all data
  // ============================================================================
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await Promise.all([
        loadFundSummary(),
        loadLotContributions(),
        loadTransfers(),
        loadWorksBudgets(),
      ]);
    } catch (err) {
      console.error('[useALURData] Error refreshing data:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des données');
    } finally {
      setIsLoading(false);
    }
  }, [loadFundSummary, loadLotContributions, loadTransfers, loadWorksBudgets]);

  // ============================================================================
  // Auto-load on mount and when dependencies change
  // ============================================================================
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    fundSummary,
    lotContributions,
    transfers,
    worksBudgets,
    isLoading,
    error,
    selectedYear,
    setSelectedYear,
    createTransfer,
    refresh,
  };
}


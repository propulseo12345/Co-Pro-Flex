/**
 * Hook pour charger les données comptables des annexes 1-5
 * dans le contexte de la page convocation.
 *
 * Charge les données uniquement pour les AG ordinaires (qui nécessitent
 * l'approbation des comptes et le vote du budget).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getActiveAccountingPeriod, getClosedPeriodForYear } from '@/lib/finance/accounting-period';
import type {
  AnnexeData1,
  AnnexeData2,
  AnnexeData3,
  AnnexeData4,
  AnnexeData5,
} from '@/components/features/finance/Comptabilite/types';
import type { AnnexeAccountingData } from '@/lib/pdf/annexe-pdf-tables';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createUntypedClient = () => createClient() as any;

interface UseConvocationAccountingDataOptions {
  coproId: string | null;
  coproName: string;
  agType: 'ORDINAIRE' | 'EXTRAORDINAIRE' | 'URGENTE' | null;
  exercice?: string;
}

export interface UseConvocationAccountingDataReturn {
  accountingData: AnnexeAccountingData | null;
  isLoading: boolean;
  error: string | null;
}

export function useConvocationAccountingData({
  coproId,
  coproName,
  agType,
  exercice,
}: UseConvocationAccountingDataOptions): UseConvocationAccountingDataReturn {
  const [accountingData, setAccountingData] = useState<AnnexeAccountingData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef(false);

  const loadData = useCallback(async () => {
    // Les annexes comptables ne sont requises que pour les AGO
    if (!coproId || agType !== 'ORDINAIRE') {
      setAccountingData(null);
      setIsLoading(false);
      return;
    }

    // Ne charger qu'une fois
    if (loadedRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      // 1. Récupérer la période comptable
      // Pour une AGO, les annexes concernent l'exercice CLOS (N-1), pas l'exercice en cours.
      // On cherche d'abord la période fermée, puis en fallback la période ouverte.
      let periodId: string | null = null;
      let ex = exercice || '';

      // Essayer la période fermée la plus récente (ou par année si exercice spécifié)
      const exerciceYear = exercice ? parseInt(exercice, 10) : undefined;
      const closedResult = await getClosedPeriodForYear(coproId, exerciceYear && !isNaN(exerciceYear) ? exerciceYear : undefined);
      if (closedResult.data) {
        periodId = closedResult.data.id;
        ex = ex || closedResult.data.label || String(closedResult.data.year);
      } else {
        // Fallback: période ouverte (exercice en cours)
        const openResult = await getActiveAccountingPeriod(coproId);
        if (openResult.data) {
          periodId = openResult.data.id;
          ex = ex || openResult.data.label || String(openResult.data.year);
        }
      }

      if (!periodId) {
        setError('Aucune période comptable disponible');
        setIsLoading(false);
        return;
      }

      const supabase = createUntypedClient();

      // 2. Charger toutes les annexes en parallèle
      const [r1, r2, r3, r4, r5] = await Promise.allSettled([
        supabase.rpc('fn_annexe_1', { p_copro_id: coproId, p_period_id: periodId }),
        supabase.rpc('fn_annexe_2', { p_copro_id: coproId, p_period_id: periodId, p_next_period_id: periodId }),
        supabase.rpc('fn_annexe_3', { p_copro_id: coproId, p_period_id: periodId, p_next_period_id: periodId }),
        supabase.rpc('fn_annexe_4', { p_copro_id: coproId, p_period_id: periodId }),
        supabase.rpc('fn_annexe_5', { p_copro_id: coproId, p_period_id: periodId }),
      ]);

      const getData = <T>(result: PromiseSettledResult<{ data: T; error: unknown }>): T | null => {
        if (result.status === 'fulfilled' && !result.value.error) {
          return result.value.data;
        }
        return null;
      };

      const data: AnnexeAccountingData = {
        annexe1: getData<AnnexeData1>(r1),
        annexe2: getData<AnnexeData2>(r2),
        annexe3: getData<AnnexeData3>(r3),
        annexe4: getData<AnnexeData4>(r4),
        annexe5: getData<AnnexeData5>(r5),
        exercice: ex,
        coproName,
      };

      // Vérifier qu'au moins une annexe a des données
      const hasData = data.annexe1 || data.annexe2 || data.annexe3 || data.annexe4 || data.annexe5;

      if (hasData) {
        setAccountingData(data);
        loadedRef.current = true;
      } else {
        setError('Aucune donnée comptable disponible');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    }

    setIsLoading(false);
  }, [coproId, agType, coproName, exercice]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { accountingData, isLoading, error };
}

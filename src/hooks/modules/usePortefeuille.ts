'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type {
  ICoproprietePortefeuille,
  IPortefeuilleKPIs,
} from '@/types/models/portefeuille';


// =============================================================================
// KPIs
// =============================================================================

function calculateKPIs(coproprietes: ICoproprietePortefeuille[]): IPortefeuilleKPIs {
  const totalCoproprietes = coproprietes.length;
  const totalLots = coproprietes.reduce((sum, c) => sum + c.nombreLots, 0);
  const totalImpayes = coproprietes.reduce((sum, c) => sum + c.totalImpayes, 0);
  const nombreCoproAvecImpayes = coproprietes.filter(c => c.totalImpayes > 0).length;
  const totalFacturesRetard = coproprietes.reduce((sum, c) => sum + c.facturesEnRetard, 0);
  const montantFacturesRetard = coproprietes.reduce((sum, c) => sum + c.montantFacturesRetard, 0);
  const budgetsARisque = coproprietes.filter(c => c.budgetAlerteRisque).length;
  const budgetGlobalTotal = coproprietes.reduce((sum, c) => sum + c.budgetTotal, 0);
  const budgetGlobalConsomme = coproprietes.reduce((sum, c) => sum + c.budgetConsomme, 0);
  const coproNonRapprochees = coproprietes.filter(c => c.mouvementsNonRapproches > 0).length;
  const mouvementsNonRapprochesTotal = coproprietes.reduce((sum, c) => sum + c.mouvementsNonRapproches, 0);

  const totalAppels = coproprietes.reduce((sum, c) => {
    const appelTotal = c.tauxRecouvrement < 100
      ? c.totalImpayes / (1 - c.tauxRecouvrement / 100)
      : 0;
    return sum + appelTotal;
  }, 0);
  const tauxRecouvrementGlobal = totalAppels > 0
    ? ((totalAppels - totalImpayes) / totalAppels) * 100
    : 100;

  const allAlertes = coproprietes.flatMap(c => c.alertes);
  const alertesCritiques = allAlertes.filter(a => a.severite === 'critique').length;
  const alertesWarning = allAlertes.filter(a => a.severite === 'warning').length;

  return {
    totalCoproprietes,
    totalLots,
    totalImpayes,
    nombreCoproAvecImpayes,
    tauxRecouvrementGlobal,
    totalFacturesRetard,
    montantFacturesRetard,
    budgetsARisque,
    budgetGlobalTotal,
    budgetGlobalConsomme,
    coproNonRapprochees,
    mouvementsNonRapprochesTotal,
    alertesCritiques,
    alertesWarning,
  };
}

// =============================================================================
// HOOK
// =============================================================================

export interface UsePortefeuilleReturn {
  coproprietes: ICoproprietePortefeuille[];
  filteredCoproprietes: ICoproprietePortefeuille[];
  kpis: IPortefeuilleKPIs;
  recherche: string;
  setRecherche: (value: string) => void;
  isLoading: boolean;
}

export function usePortefeuille(): UsePortefeuilleReturn {
  const [recherche, setRecherche] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [dbCopros, setDbCopros] = useState<ICoproprietePortefeuille[] | null>(null);

  // Charger les copros depuis Supabase
  useEffect(() => {
    async function fetchCopros() {
      try {
        const supabase = createClient();

        // Récupérer copros + KPIs en parallèle
        const [coprosResult, kpisResult] = await Promise.all([
          supabase
            .from('copros')
            .select('id, name, address, city, postal_code')
            // Ne lister que les copros finalisées : une copro encore en
            // onboarding (onboarding_step != null) n'a pas d'exercice comptable
            // et ouvrirait un dashboard vide. Sa reprise passe par /onboarding.
            .is('onboarding_step', null)
            .order('created_at', { ascending: true }),
          supabase
            .from('v_dashboard_kpis')
            .select('copro_id, current_balance, unpaid_total, unpaid_lots_count, next_ag_date'),
        ]);

        if (coprosResult.error || !coprosResult.data) {
          setDbCopros([]);
        } else {
          // Indexer les KPIs par copro_id pour lookup rapide
          const kpiMap = new Map<string, {
            current_balance: number | null;
            unpaid_total: number | null;
            unpaid_lots_count: number | null;
            next_ag_date: string | null;
          }>();
          if (kpisResult.data) {
            for (const k of kpisResult.data) {
              if (k.copro_id) kpiMap.set(k.copro_id, k);
            }
          }

          // Mapper les données Supabase vers le format portefeuille
          const mapped: ICoproprietePortefeuille[] = coprosResult.data.map((c) => {
            const kpi = kpiMap.get(c.id);
            return {
              id: c.id,
              nom: c.name,
              adresse: [c.address, c.city, c.postal_code].filter(Boolean).join(', ') || 'Adresse non renseignée',
              nombreLots: 0,
              exerciceCourant: new Date().getFullYear(),
              soldeDisponible: kpi?.current_balance ?? 0,
              totalImpayes: kpi?.unpaid_total ?? 0,
              nombreImpayes: kpi?.unpaid_lots_count ?? 0,
              tauxRecouvrement: 100,
              facturesEnRetard: 0,
              montantFacturesRetard: 0,
              budgetTotal: 0,
              budgetConsomme: 0,
              budgetRestant: 0,
              budgetAlerteRisque: false,
              mouvementsNonRapproches: 0,
              dernierRapprochement: undefined,
              prochaineAG: kpi?.next_ag_date ?? undefined,
              alertes: [],
              criticalityScore: 0,
            };
          });
          setDbCopros(mapped);
        }
      } catch {
        setDbCopros([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchCopros();
  }, []);

  const coproprietes = useMemo(() => {
    return dbCopros ?? [];
  }, [dbCopros]);

  const filteredCoproprietes = useMemo(() => {
    if (!recherche) return coproprietes;
    const search = recherche.toLowerCase();
    return coproprietes.filter(
      c => c.nom.toLowerCase().includes(search) || c.adresse.toLowerCase().includes(search)
    );
  }, [coproprietes, recherche]);

  const kpis = useMemo(() => calculateKPIs(coproprietes), [coproprietes]);

  return {
    coproprietes,
    filteredCoproprietes,
    kpis,
    recherche,
    setRecherche: useCallback((value: string) => setRecherche(value), []),
    isLoading,
  };
}

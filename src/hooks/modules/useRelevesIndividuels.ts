'use client';

/**
 * Hook pour les relevés individuels de copropriétaires
 * Agrège les données de lots, appels de fonds, paiements et impayés
 */

import { useMemo } from 'react';
import { useLotsWithOwners } from './useCoproData';
import { useUnpaid, useCalls, usePayments } from './useFinanceData';
import type { LotWithOwner } from '@/lib/owners/api';
import type {
  ReleveIndividuel,
  CoproprietaireReleve,
  LotReleve,
  LigneAppelFonds,
} from '@/components/features/finance/RelevesIndividuels';

interface UseRelevesIndividuelsReturn {
  releves: ReleveIndividuel[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useRelevesIndividuels(exercice: string): UseRelevesIndividuelsReturn {
  const { lots, isLoading: lotsLoading, error: lotsError, refresh: refreshLots } = useLotsWithOwners();
  const { data: unpaidData, isLoading: unpaidLoading, error: unpaidError, refresh: refreshUnpaid } = useUnpaid();
  const { data: callsData, isLoading: callsLoading, error: callsError, refresh: refreshCalls } = useCalls();
  const { data: paymentsData, isLoading: paymentsLoading, error: paymentsError, refresh: refreshPayments } = usePayments();

  const isLoading = lotsLoading || unpaidLoading || callsLoading || paymentsLoading;
  const error = lotsError || unpaidError || callsError || paymentsError;

  // Group lots by owner
  const ownerLotsMap = useMemo(() => {
    const map = new Map<string, LotWithOwner[]>();

    for (const lot of lots) {
      const ownerId = lot.coproprietaire_id;
      if (!ownerId) continue;

      if (!map.has(ownerId)) {
        map.set(ownerId, []);
      }
      map.get(ownerId)!.push(lot);
    }

    return map;
  }, [lots]);

  // Create unpaid map by lot
  const unpaidByLot = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();

    if (unpaidData) {
      for (const item of unpaidData) {
        map.set(item.lot_id, {
          total: item.total_unpaid,
          count: item.unpaid_lines_count,
        });
      }
    }

    return map;
  }, [unpaidData]);

  // Create payments map by lot
  const paymentsByLot = useMemo(() => {
    const map = new Map<string, number>();

    if (paymentsData) {
      for (const payment of paymentsData) {
        const current = map.get(payment.lot_id) || 0;
        map.set(payment.lot_id, current + payment.amount);
      }
    }

    return map;
  }, [paymentsData]);

  // Calculate calls total by lot from calls data
  const callsTotalByLot = useMemo(() => {
    const map = new Map<string, number>();

    // This is a simplification - ideally we'd need call lines detail
    // For now, we distribute call totals (this needs call_lines detail for accuracy)

    return map;
  }, []);

  // Build releves from aggregated data
  const releves = useMemo((): ReleveIndividuel[] => {
    const result: ReleveIndividuel[] = [];

    for (const [ownerId, ownerLots] of ownerLotsMap) {
      const firstLot = ownerLots[0];
      if (!firstLot) continue;

      // Build lots array
      const lotsReleve: LotReleve[] = ownerLots.map(lot => ({
        id: lot.id,
        numero: lot.ref,
        type: lot.type || 'appartement',
        tantiemesGeneraux: lot.tantiemes_generaux,
        tantiemesAscenseur: lot.tantiemes_ascenseur || undefined,
      }));

      const totalTantiemes = lotsReleve.reduce((sum, l) => sum + l.tantiemesGeneraux, 0);

      // Calculate totals from lot data
      let totalUnpaid = 0;
      let totalPaid = 0;

      for (const lot of ownerLots) {
        const unpaid = unpaidByLot.get(lot.id);
        if (unpaid) {
          totalUnpaid += unpaid.total;
        }

        const paid = paymentsByLot.get(lot.id);
        if (paid) {
          totalPaid += paid;
        }
      }

      // Estimate total called (paid + unpaid)
      const totalAppeles = totalPaid + totalUnpaid;
      const solde = totalPaid - totalAppeles; // Negative if owes money

      // Build coproprietaire object
      // Parse display name to extract first and last name
      const displayNameParts = (firstLot.owner_display_name || 'Inconnu').split(' ');
      const prenom = displayNameParts[0] || '';
      const nom = displayNameParts.slice(1).join(' ') || displayNameParts[0] || 'Inconnu';

      const coproprietaire: CoproprietaireReleve = {
        id: ownerId,
        nom,
        prenom,
        email: firstLot.owner_email || undefined,
        adresse: '', // Not available in current data
        lots: lotsReleve,
        totalTantiemes,
        soldeActuel: -totalUnpaid, // Negative if owes
      };

      // Build appels de fonds (simplified - would need call_lines detail for full data)
      const appelsFonds: LigneAppelFonds[] = [];

      const releve: ReleveIndividuel = {
        id: `releve-${ownerId}-${exercice}`,
        coproprietaireId: ownerId,
        coproprietaire,
        exercice,
        dateGeneration: new Date().toISOString(),
        totalCharges: totalAppeles,
        totalAppeles,
        totalPaye: totalPaid,
        solde: -totalUnpaid,
        detailParCle: [], // Would need detailed data
        appelsFonds,
        lignesCharges: [], // Would need detailed data
      };

      result.push(releve);
    }

    return result.sort((a, b) =>
      a.coproprietaire.nom.localeCompare(b.coproprietaire.nom)
    );
  }, [ownerLotsMap, unpaidByLot, paymentsByLot, exercice]);

  const refresh = async () => {
    await Promise.all([
      refreshLots(),
      refreshUnpaid(),
      refreshCalls(),
      refreshPayments(),
    ]);
  };

  return {
    releves,
    isLoading,
    error,
    refresh,
  };
}

export default useRelevesIndividuels;

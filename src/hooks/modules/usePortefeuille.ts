'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type {
  ICoproprietePortefeuille,
  IPortefeuilleKPIs,
} from '@/types/models/portefeuille';

// =============================================================================
// MOCK DATA (sera remplacé par Supabase)
// =============================================================================

const MOCK_COPROPRIETES: Omit<ICoproprietePortefeuille, 'criticalityScore'>[] = [
  {
    id: 'copro-1',
    nom: 'Résidence Les Lilas',
    adresse: '15 rue des Lilas, 75011 Paris',
    nombreLots: 24,
    exerciceCourant: 2025,
    soldeDisponible: 45230.50,
    totalImpayes: 3542.80,
    nombreImpayes: 4,
    tauxRecouvrement: 87.2,
    facturesEnRetard: 2,
    montantFacturesRetard: 1250.00,
    budgetTotal: 85000,
    budgetConsomme: 42500,
    budgetRestant: 42500,
    budgetAlerteRisque: false,
    mouvementsNonRapproches: 3,
    dernierRapprochement: '2025-01-15',
    prochaineAG: '2026-05-15',
    alertes: [
      { id: 'alert-1', type: 'IMPAYE', severite: 'critique', titre: 'Impayés critiques', description: '2 copropriétaires avec retard > 90 jours', montant: 2845.50, lien: '/finance/unpaid' },
      { id: 'alert-2', type: 'FACTURE', severite: 'warning', titre: 'Factures en attente', description: '2 factures à échéance dépassée', montant: 1250.00, lien: '/finance/factures' },
    ],
  },
  {
    id: 'copro-2',
    nom: 'Le Clos Saint-Martin',
    adresse: '8 avenue Saint-Martin, 75003 Paris',
    nombreLots: 42,
    exerciceCourant: 2025,
    soldeDisponible: 78450.00,
    totalImpayes: 0,
    nombreImpayes: 0,
    tauxRecouvrement: 100,
    facturesEnRetard: 0,
    montantFacturesRetard: 0,
    budgetTotal: 125000,
    budgetConsomme: 95000,
    budgetRestant: 30000,
    budgetAlerteRisque: true,
    mouvementsNonRapproches: 0,
    dernierRapprochement: '2025-01-20',
    alertes: [
      { id: 'alert-3', type: 'BUDGET', severite: 'warning', titre: 'Budget à risque', description: 'Consommation à 76% avec 5 mois restants', montant: 30000, lien: '/finance/budgets' },
    ],
  },
  {
    id: 'copro-3',
    nom: 'Domaine de la Forêt',
    adresse: '120 boulevard de la Forêt, 92400 Courbevoie',
    nombreLots: 68,
    exerciceCourant: 2025,
    soldeDisponible: 125800.00,
    totalImpayes: 8920.40,
    nombreImpayes: 7,
    tauxRecouvrement: 78.5,
    facturesEnRetard: 5,
    montantFacturesRetard: 4580.00,
    budgetTotal: 180000,
    budgetConsomme: 72000,
    budgetRestant: 108000,
    budgetAlerteRisque: false,
    mouvementsNonRapproches: 12,
    dernierRapprochement: '2024-12-28',
    prochaineAG: '2026-04-20',
    alertes: [
      { id: 'alert-4', type: 'IMPAYE', severite: 'critique', titre: 'Impayés importants', description: "7 copropriétaires en situation d'impayé", montant: 8920.40, lien: '/finance/unpaid' },
      { id: 'alert-5', type: 'RAPPROCHEMENT', severite: 'critique', titre: 'Rapprochement en retard', description: '12 mouvements non rapprochés depuis 24 jours', lien: '/finance/mouvements-bancaires' },
      { id: 'alert-6', type: 'FACTURE', severite: 'warning', titre: 'Factures en retard', description: '5 factures à traiter', montant: 4580.00, lien: '/finance/factures' },
    ],
  },
  {
    id: 'copro-4',
    nom: 'Résidence Haussmann',
    adresse: '45 boulevard Haussmann, 75009 Paris',
    nombreLots: 18,
    exerciceCourant: 2025,
    soldeDisponible: 32100.00,
    totalImpayes: 756.20,
    nombreImpayes: 1,
    tauxRecouvrement: 95.8,
    facturesEnRetard: 1,
    montantFacturesRetard: 890.00,
    budgetTotal: 52000,
    budgetConsomme: 18200,
    budgetRestant: 33800,
    budgetAlerteRisque: false,
    mouvementsNonRapproches: 1,
    dernierRapprochement: '2025-01-18',
    alertes: [
      { id: 'alert-7', type: 'CONTRAT', severite: 'warning', titre: 'Contrat à renouveler', description: 'Assurance MRH expire dans 30 jours', dateEcheance: '2025-02-21', lien: '/maintenance/contracts' },
    ],
  },
  {
    id: 'copro-5',
    nom: 'Les Jardins du Parc',
    adresse: '5 allée des Jardins, 94300 Vincennes',
    nombreLots: 35,
    exerciceCourant: 2025,
    soldeDisponible: 56780.00,
    totalImpayes: 0,
    nombreImpayes: 0,
    tauxRecouvrement: 100,
    facturesEnRetard: 0,
    montantFacturesRetard: 0,
    budgetTotal: 95000,
    budgetConsomme: 38000,
    budgetRestant: 57000,
    budgetAlerteRisque: false,
    mouvementsNonRapproches: 0,
    dernierRapprochement: '2025-01-21',
    alertes: [],
  },
];

// =============================================================================
// CRITICALITY SCORE
// =============================================================================

function calculateCriticalityScore(copro: Omit<ICoproprietePortefeuille, 'criticalityScore'>): number {
  let score = 0;

  if (copro.totalImpayes > 0) {
    score += 30;
    score += Math.min(copro.totalImpayes / 1000, 20);
  }

  if (copro.tauxRecouvrement < 90) {
    score += 20;
    score += (90 - copro.tauxRecouvrement) / 2;
  }

  if (copro.mouvementsNonRapproches > 0) {
    score += 15;
    score += Math.min(copro.mouvementsNonRapproches, 10);
  }

  if (copro.facturesEnRetard > 0) {
    score += 15;
    score += Math.min(copro.facturesEnRetard * 3, 10);
  }

  const budgetPct = copro.budgetTotal > 0
    ? (copro.budgetConsomme / copro.budgetTotal) * 100
    : 0;
  if (budgetPct > 80) {
    score += 10;
    score += Math.min((budgetPct - 80) / 2, 10);
  }

  return Math.round(score);
}

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
        const { data, error } = await supabase
          .from('copros')
          .select('id, name, address, city, postal_code')
          .order('created_at', { ascending: true });

        if (error || !data || data.length === 0) {
          // Fallback sur les mocks
          setDbCopros(null);
        } else {
          // Mapper les données Supabase vers le format portefeuille
          const mapped: ICoproprietePortefeuille[] = data.map((c) => ({
            id: c.id,
            nom: c.name,
            adresse: [c.address, c.city, c.postal_code].filter(Boolean).join(', ') || 'Adresse non renseignée',
            nombreLots: 0,
            exerciceCourant: new Date().getFullYear(),
            soldeDisponible: 0,
            totalImpayes: 0,
            nombreImpayes: 0,
            tauxRecouvrement: 100,
            facturesEnRetard: 0,
            montantFacturesRetard: 0,
            budgetTotal: 0,
            budgetConsomme: 0,
            budgetRestant: 0,
            budgetAlerteRisque: false,
            mouvementsNonRapproches: 0,
            dernierRapprochement: undefined,
            prochaineAG: undefined,
            alertes: [],
            criticalityScore: 0,
          }));
          setDbCopros(mapped);
        }
      } catch {
        setDbCopros(null);
      } finally {
        setIsLoading(false);
      }
    }
    fetchCopros();
  }, []);

  const coproprietes = useMemo(() => {
    if (dbCopros) return dbCopros;
    // Fallback sur les mocks
    const enriched = MOCK_COPROPRIETES.map(c => ({
      ...c,
      criticalityScore: calculateCriticalityScore(c),
    }));
    return enriched.sort((a, b) => b.criticalityScore - a.criticalityScore);
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

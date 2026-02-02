'use client';

import { useMemo, useState, useCallback } from 'react';
import { useCopro } from '@/providers/CoproContext';
import { useTrialBalance, useOpenPeriod } from '@/hooks/modules/useFinanceData';
import {
  filterBalance,
  calculateBalanceTotals,
  formatCurrency,
} from '@/components/features/finance/Comptabilite/utils';
import { getExerciceActuel } from '@/lib/dates';
import type { LigneBalance } from '@/components/features/finance/Comptabilite/types';
import type { TrialBalanceEntry } from '@/lib/finance/api';

// Map Supabase account_type to local TypeCompte
type TypeCompte = 'ACTIF' | 'PASSIF' | 'CHARGE' | 'PRODUIT';

function mapAccountType(accountType: string): TypeCompte {
  switch (accountType) {
    case 'asset': return 'ACTIF';
    case 'liability': return 'PASSIF';
    case 'equity': return 'PASSIF';
    case 'revenue': return 'PRODUIT';
    case 'expense': return 'CHARGE';
    default: return 'ACTIF';
  }
}

// Transform Supabase trial balance to local format
function transformToLigneBalance(entries: TrialBalanceEntry[]): LigneBalance[] {
  return entries.map(entry => ({
    compte: entry.account_code,
    compteLabel: entry.account_name,
    typeCompte: mapAccountType(entry.account_type),
    classe: entry.account_code.charAt(0),
    soldeOuvertureDebit: 0,
    soldeOuvertureCredit: 0,
    mouvementDebit: Number(entry.total_debit),
    mouvementCredit: Number(entry.total_credit),
    soldeClotureDebit: Number(entry.balance) > 0 ? Number(entry.balance) : 0,
    soldeClotureCredit: Number(entry.balance) < 0 ? -Number(entry.balance) : 0,
    variationPourcent: undefined,
  }));
}

export function useBalancePage() {
  const { currentCoproId } = useCopro();
  const { data: openPeriod, isLoading: periodLoading } = useOpenPeriod();
  const { data: trialBalanceData, isLoading, error, refresh } = useTrialBalance(openPeriod?.id || null);

  // Filters
  const [masquerSoldesNuls, setMasquerSoldesNuls] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [classeFilter, setClasseFilter] = useState('TOUTES');
  const [showComparison, setShowComparison] = useState(true);

  // Constants
  const anneeExercice = getExerciceActuel().toString();
  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  // Transform Supabase data to local format
  const balanceData = useMemo(() => {
    if (!trialBalanceData || trialBalanceData.length === 0) return [];
    return transformToLigneBalance(trialBalanceData);
  }, [trialBalanceData]);

  // Apply filters
  const filteredBalance = useMemo(() => {
    return filterBalance(balanceData, {
      masquerSoldesNuls,
      classeFilter,
      searchTerm
    });
  }, [balanceData, masquerSoldesNuls, classeFilter, searchTerm]);

  // Calculate totals
  const totaux = useMemo(() => {
    return calculateBalanceTotals(filteredBalance);
  }, [filteredBalance]);

  // Check balance equilibrium (0.01 EUR tolerance for rounding)
  const isEquilibre = Math.abs(totaux.totalClotureDebit - totaux.totalClotureCredit) < 0.01;
  const ecart = Math.abs(totaux.totalClotureDebit - totaux.totalClotureCredit);

  // Stats
  const comptesAvecSolde = balanceData.filter(l => l.soldeClotureDebit !== 0 || l.soldeClotureCredit !== 0).length;

  // Combined loading state
  const isLoadingCombined = !currentCoproId || isLoading || periodLoading;

  // Handlers
  const handleToggleSoldesNuls = useCallback(() => {
    setMasquerSoldesNuls(prev => !prev);
  }, []);

  const handleToggleComparison = useCallback(() => {
    setShowComparison(prev => !prev);
  }, []);

  return {
    // Data
    currentCoproId,
    openPeriod,
    balanceData,
    filteredBalance,
    totaux,

    // Stats
    comptesAvecSolde,
    isEquilibre,
    ecart,

    // Loading/error
    isLoading: isLoadingCombined,
    error,

    // Filters
    masquerSoldesNuls,
    searchTerm,
    classeFilter,
    showComparison,

    // Setters
    setSearchTerm,
    setClasseFilter,
    handleToggleSoldesNuls,
    handleToggleComparison,

    // Constants
    anneeExercice,
    today,

    // Actions
    refresh,

    // Utils
    formatCurrency,
  };
}

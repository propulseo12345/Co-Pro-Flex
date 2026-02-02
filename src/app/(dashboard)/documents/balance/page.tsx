'use client';

import { useBalancePage } from '@/features/finance/balance';
import {
  BalanceHeader,
  BalanceFilters,
  BalanceInfoBar,
  BalanceTable,
  BalanceLoadingState,
  BalanceNoPeriodState,
  BalanceErrorState,
  BalanceEmptyState,
} from '@/features/finance/balance';

export default function BalancePage() {
  const {
    // Data
    openPeriod,
    balanceData,
    filteredBalance,
    totaux,

    // Stats
    comptesAvecSolde,
    isEquilibre,
    ecart,

    // Loading/error
    isLoading,
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
  } = useBalancePage();

  // Loading state
  if (isLoading) {
    return <BalanceLoadingState />;
  }

  // No period found
  if (!openPeriod) {
    return <BalanceNoPeriodState anneeExercice={anneeExercice} today={today} />;
  }

  // Error state
  if (error) {
    return <BalanceErrorState error={error} onRefresh={refresh} />;
  }

  // Empty state
  if (balanceData.length === 0) {
    return <BalanceEmptyState anneeExercice={anneeExercice} today={today} onRefresh={refresh} />;
  }

  const periodName = openPeriod?.name || `Exercice ${anneeExercice}`;

  return (
    <div className="container">
      <BalanceHeader
        periodName={periodName}
        today={today}
        onRefresh={refresh}
      />

      <BalanceInfoBar
        filteredCount={filteredBalance.length}
        comptesAvecSolde={comptesAvecSolde}
        totalCount={balanceData.length}
      />

      <BalanceFilters
        searchTerm={searchTerm}
        classeFilter={classeFilter}
        masquerSoldesNuls={masquerSoldesNuls}
        showComparison={showComparison}
        onSearchChange={setSearchTerm}
        onClasseFilterChange={setClasseFilter}
        onToggleSoldesNuls={handleToggleSoldesNuls}
        onToggleComparison={handleToggleComparison}
      />

      <BalanceTable
        filteredBalance={filteredBalance}
        totaux={totaux}
        anneeExercice={anneeExercice}
        showComparison={showComparison}
        isEquilibre={isEquilibre}
        ecart={ecart}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}

'use client';

import {
  useVentesImpayesDashboard,
  StatsGrid,
  PageHeader,
  QuickActions,
  EmptyVentesState,
  LoadingState,
  ErrorState,
} from '@/features/ventes-impayes/dashboard';
import {
  VentesRecentesSection,
  ImpayesCritiquesSection,
  RelanceModal,
  ActivitySection,
} from '@/components/features/ventes-impayes';
import styles from './ventes-impayes.module.css';

export default function VentesImpayesPage() {
  const {
    isLoading,
    error,
    stats,
    ventesRecentes,
    recentActivity,
    impayesCritiques,
    impayesBreakdown,
    showRelanceModal,
    selectedImpayes,
    toggleImpayeSelection,
    handleRelanceGroupee,
    closeRelanceModal,
    openRelanceModal,
  } = useVentesImpayesDashboard();

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  return (
    <div className="container">
      <PageHeader />

      <StatsGrid stats={stats} />

      <div className={styles.twoColumnGrid}>
        {ventesRecentes.length > 0 ? (
          <VentesRecentesSection ventes={ventesRecentes} />
        ) : (
          <EmptyVentesState />
        )}
        <ImpayesCritiquesSection
          impayes={impayesCritiques}
          breakdown={impayesBreakdown}
          selectedImpayes={selectedImpayes}
          onToggleSelection={toggleImpayeSelection}
          onRelanceGroupee={handleRelanceGroupee}
        />
      </div>

      {recentActivity.length > 0 && (
        <ActivitySection activities={recentActivity} />
      )}

      <QuickActions onPlanifierRelances={openRelanceModal} />

      <RelanceModal
        isOpen={showRelanceModal}
        onClose={closeRelanceModal}
        selectedCount={selectedImpayes.length}
      />
    </div>
  );
}

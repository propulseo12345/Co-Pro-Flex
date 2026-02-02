'use client';

import { useCallsPage } from '@/features/finance/calls';
import {
  CallsHeader,
  CallsAutomationCard,
  CallsTable,
  CallsFooterActions,
  AutomationModal,
  RulesModal,
  PaymentInfoModal,
  CancelModal,
} from '@/features/finance/calls';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/DataState';

export default function FundCallsPage() {
  const {
    // Data
    callsList,
    periodName,
    periodStart,
    periodEnd,
    isManager,

    // Loading/error
    isLoading,
    error,

    // Automation state
    isAutomationEnabled,

    // Modal states
    showAutomationModal,
    showRulesModal,
    showPaymentInfoModal,
    showCancelModal,

    // Handlers
    handleToggleAutomation,
    handleCancelLastCall,
    confirmCancelLastCall,
    handleOpenAutomationModal,
    handleCloseAutomationModal,
    handleOpenRulesModal,
    handleCloseRulesModal,
    handleSaveRules,
    handleOpenPaymentInfoModal,
    handleClosePaymentInfoModal,
    handleSavePaymentInfo,
    handleCloseCancelModal,
    handleActivateFromModal,

    // Actions
    refresh,
  } = useCallsPage();

  // Loading state
  if (isLoading) {
    return <LoadingState message="Chargement des appels de fonds..." />;
  }

  // Error state
  if (error) {
    return <ErrorState message={error} onRetry={refresh} />;
  }

  return (
    <div className="container">
      <CallsHeader
        periodName={periodName}
        periodStart={periodStart}
        periodEnd={periodEnd}
        isManager={isManager}
        isAutomationEnabled={isAutomationEnabled}
        onToggleAutomation={handleToggleAutomation}
      />

      {isManager && (
        <CallsAutomationCard
          onOpenAutomationModal={handleOpenAutomationModal}
          onOpenRulesModal={handleOpenRulesModal}
          onOpenPaymentInfoModal={handleOpenPaymentInfoModal}
        />
      )}

      {callsList.length === 0 ? (
        <EmptyState
          title="Aucun appel de fonds"
          message="Aucun appel de fonds n'a été créé pour cette copropriété."
        />
      ) : (
        <CallsTable calls={callsList} />
      )}

      {isManager && callsList.length > 0 && (
        <CallsFooterActions onCancelLastCall={handleCancelLastCall} />
      )}

      {showAutomationModal && (
        <AutomationModal
          onClose={handleCloseAutomationModal}
          onActivate={handleActivateFromModal}
        />
      )}

      {showRulesModal && (
        <RulesModal
          onClose={handleCloseRulesModal}
          onSave={handleSaveRules}
        />
      )}

      {showPaymentInfoModal && (
        <PaymentInfoModal
          onClose={handleClosePaymentInfoModal}
          onSave={handleSavePaymentInfo}
        />
      )}

      {showCancelModal && (
        <CancelModal
          onClose={handleCloseCancelModal}
          onConfirm={confirmCancelLastCall}
        />
      )}
    </div>
  );
}

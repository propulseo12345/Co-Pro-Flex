'use client';

import { useState, useCallback } from 'react';
import { useCopro } from '@/providers/CoproContext';
import { useCalls, useOpenPeriod } from '@/hooks/modules/useFinanceData';

export function useCallsPage() {
  const { currentCoproId, isManager } = useCopro();
  const { data: calls, isLoading, error, refresh } = useCalls();
  const { data: openPeriod } = useOpenPeriod();

  // Modal states
  const [showAutomationModal, setShowAutomationModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showPaymentInfoModal, setShowPaymentInfoModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isAutomationEnabled, setIsAutomationEnabled] = useState(false);

  // Handlers
  const handleEnableAutomation = useCallback(() => {
    setIsAutomationEnabled(true);
    alert('Génération automatique des appels de fonds activée !');
  }, []);

  const handleDisableAutomation = useCallback(() => {
    setIsAutomationEnabled(false);
    alert('Génération automatique des appels de fonds désactivée !');
  }, []);

  const handleToggleAutomation = useCallback(() => {
    if (isAutomationEnabled) {
      handleDisableAutomation();
    } else {
      handleEnableAutomation();
    }
  }, [isAutomationEnabled, handleEnableAutomation, handleDisableAutomation]);

  const handleCancelLastCall = useCallback(() => {
    setShowCancelModal(true);
  }, []);

  const confirmCancelLastCall = useCallback(() => {
    alert('Dernier appel de fonds annulé avec succès !');
    setShowCancelModal(false);
  }, []);

  const handleOpenAutomationModal = useCallback(() => {
    setShowAutomationModal(true);
  }, []);

  const handleCloseAutomationModal = useCallback(() => {
    setShowAutomationModal(false);
  }, []);

  const handleOpenRulesModal = useCallback(() => {
    setShowRulesModal(true);
  }, []);

  const handleCloseRulesModal = useCallback(() => {
    setShowRulesModal(false);
  }, []);

  const handleSaveRules = useCallback(() => {
    alert('Règles mises à jour avec succès !');
    setShowRulesModal(false);
  }, []);

  const handleOpenPaymentInfoModal = useCallback(() => {
    setShowPaymentInfoModal(true);
  }, []);

  const handleClosePaymentInfoModal = useCallback(() => {
    setShowPaymentInfoModal(false);
  }, []);

  const handleSavePaymentInfo = useCallback(() => {
    alert('Informations de paiement mises à jour avec succès !');
    setShowPaymentInfoModal(false);
  }, []);

  const handleCloseCancelModal = useCallback(() => {
    setShowCancelModal(false);
  }, []);

  const handleActivateFromModal = useCallback(() => {
    setShowAutomationModal(false);
    handleEnableAutomation();
  }, [handleEnableAutomation]);

  // Derived data
  const callsList = calls || [];
  const periodName = openPeriod?.name || new Date().getFullYear().toString();
  const periodStart = openPeriod?.start_date;
  const periodEnd = openPeriod?.end_date;

  // Combined loading state
  const isLoadingCombined = !currentCoproId || isLoading;

  return {
    // Data
    currentCoproId,
    callsList,
    periodName,
    periodStart,
    periodEnd,
    isManager,

    // Loading/error
    isLoading: isLoadingCombined,
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
  };
}

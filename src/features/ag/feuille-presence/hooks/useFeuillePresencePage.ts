'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useFeuillePresence } from '@/hooks/modules/useFeuillePresence';
import type { AttendanceType } from '@/lib/ag/types';

export function useFeuillePresencePage() {
  const router = useRouter();
  const params = useParams();
  const agId = params.id as string;

  // DB-first hook
  const {
    coproprietaires,
    attendanceByCoprId,
    quorumStats,
    quorumThresholds,
    agInfo,
    isLoading,
    isSaving,
    error,
    togglePresence,
    setRepresentedBy,
    bulkSetPresence,
    saveSignature,
    refresh,
  } = useFeuillePresence({ agId });

  // Local UI state
  const [showSignatures, setShowSignatures] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [currentSignatureCoproId, setCurrentSignatureCoproId] = useState<string | null>(null);

  // Current copro for signature modal
  const currentCopro = useMemo(() => {
    if (!currentSignatureCoproId) return null;
    return coproprietaires.find(c => c.id === currentSignatureCoproId) ?? null;
  }, [currentSignatureCoproId, coproprietaires]);

  // Handlers
  const handlePresenceChange = useCallback(async (coproId: string, newValue: string) => {
    const presenceType = newValue as AttendanceType | 'absent';
    await togglePresence(coproId, presenceType);
  }, [togglePresence]);

  const handleRepresentantChange = useCallback(async (coproId: string, representantName: string) => {
    if (representantName.trim()) {
      await setRepresentedBy(coproId, representantName.trim());
    }
  }, [setRepresentedBy]);

  const handleBulkPresent = useCallback(async () => {
    await bulkSetPresence('present');
  }, [bulkSetPresence]);

  const handleBulkAbsent = useCallback(async () => {
    await bulkSetPresence('absent');
  }, [bulkSetPresence]);

  const handleOpenSignature = useCallback((coproId: string) => {
    setCurrentSignatureCoproId(coproId);
    setShowSignatureModal(true);
  }, []);

  const handleSaveSignature = useCallback(async (signatureData: string) => {
    if (currentSignatureCoproId) {
      await saveSignature(currentSignatureCoproId, signatureData);
    }
    setShowSignatureModal(false);
    setCurrentSignatureCoproId(null);
  }, [currentSignatureCoproId, saveSignature]);

  const handleCloseSignatureModal = useCallback(() => {
    setShowSignatureModal(false);
    setCurrentSignatureCoproId(null);
  }, []);

  const handleExportPDF = useCallback(() => {
    alert('Export PDF en cours de développement.');
  }, []);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleToggleSignatures = useCallback(() => {
    setShowSignatures(prev => !prev);
  }, []);

  return {
    // Navigation
    agId,
    handleBack,

    // Data
    coproprietaires,
    attendanceByCoprId,
    quorumStats,
    quorumThresholds,
    agInfo,

    // Loading states
    isLoading,
    isSaving,
    error,

    // UI state
    showSignatures,
    showSignatureModal,
    currentCopro,

    // Handlers
    handlePresenceChange,
    handleRepresentantChange,
    handleBulkPresent,
    handleBulkAbsent,
    handleOpenSignature,
    handleSaveSignature,
    handleCloseSignatureModal,
    handleExportPDF,
    handleToggleSignatures,
    refresh,
  };
}

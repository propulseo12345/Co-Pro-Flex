'use client';

import { useState, useCallback } from 'react';

export interface UseSessionModalsReturn {
  showResultModal: boolean;
  pendingNextResolution: boolean;
  showPasserelleModal: boolean;
  setShowResultModal: React.Dispatch<React.SetStateAction<boolean>>;
  setPendingNextResolution: React.Dispatch<React.SetStateAction<boolean>>;
  setShowPasserelleModal: React.Dispatch<React.SetStateAction<boolean>>;
  closeResultModal: () => void;
  confirmNextFromModal: (onNext: () => void) => void;
  openPasserelleModal: () => void;
  openResultModal: () => void;
}

export function useSessionModals(): UseSessionModalsReturn {
  const [showResultModal, setShowResultModal] = useState(false);
  const [pendingNextResolution, setPendingNextResolution] = useState(false);
  const [showPasserelleModal, setShowPasserelleModal] = useState(false);

  const closeResultModal = useCallback(() => {
    setShowResultModal(false);
    setPendingNextResolution(false);
  }, []);

  const confirmNextFromModal = useCallback((onNext: () => void) => {
    setShowResultModal(false);
    onNext();
    setPendingNextResolution(false);
  }, []);

  const openPasserelleModal = useCallback(() => {
    setShowPasserelleModal(true);
  }, []);

  const openResultModal = useCallback(() => {
    setShowResultModal(true);
  }, []);

  return {
    showResultModal,
    pendingNextResolution,
    showPasserelleModal,
    setShowResultModal,
    setPendingNextResolution,
    setShowPasserelleModal,
    closeResultModal,
    confirmNextFromModal,
    openPasserelleModal,
    openResultModal,
  };
}

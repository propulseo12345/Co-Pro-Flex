'use client';

import { useState, useCallback } from 'react';

export type DesignationCategorie = 'scrutateur' | 'conseil_syndical';

export interface UseSessionModalsReturn {
  showResultModal: boolean;
  pendingNextResolution: boolean;
  showPasserelleModal: boolean;
  showAjoutDesignationModal: boolean;
  designationCategorie: DesignationCategorie | null;
  designationNombreActuel: number;
  setShowResultModal: React.Dispatch<React.SetStateAction<boolean>>;
  setPendingNextResolution: React.Dispatch<React.SetStateAction<boolean>>;
  setShowPasserelleModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowAjoutDesignationModal: React.Dispatch<React.SetStateAction<boolean>>;
  setDesignationCategorie: React.Dispatch<React.SetStateAction<DesignationCategorie | null>>;
  setDesignationNombreActuel: React.Dispatch<React.SetStateAction<number>>;
  closeResultModal: () => void;
  confirmNextFromModal: (onNext: () => void) => void;
  openPasserelleModal: () => void;
  openResultModal: () => void;
}

export function useSessionModals(): UseSessionModalsReturn {
  const [showResultModal, setShowResultModal] = useState(false);
  const [pendingNextResolution, setPendingNextResolution] = useState(false);
  const [showPasserelleModal, setShowPasserelleModal] = useState(false);
  const [showAjoutDesignationModal, setShowAjoutDesignationModal] = useState(false);
  const [designationCategorie, setDesignationCategorie] = useState<DesignationCategorie | null>(null);
  const [designationNombreActuel, setDesignationNombreActuel] = useState(0);

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
    showAjoutDesignationModal,
    designationCategorie,
    designationNombreActuel,
    setShowResultModal,
    setPendingNextResolution,
    setShowPasserelleModal,
    setShowAjoutDesignationModal,
    setDesignationCategorie,
    setDesignationNombreActuel,
    closeResultModal,
    confirmNextFromModal,
    openPasserelleModal,
    openResultModal,
  };
}

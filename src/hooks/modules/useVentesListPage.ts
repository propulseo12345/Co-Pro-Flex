import { useState, useMemo, useCallback } from 'react';
import { useVentes } from './useVentes';
import type { Vente, VenteEtapeWorkflow } from '@/types/models/vente';

export interface ExportOptions {
  includeDetails: boolean;
  includeHistorique: boolean;
  onlyEnCours: boolean;
}

export const WORKFLOW_STEPS: { id: VenteEtapeWorkflow; label: string }[] = [
  { id: 'creation', label: 'Création' },
  { id: 'generation', label: 'Génération docs' },
  { id: 'signature', label: 'Signature' },
  { id: 'transmission', label: 'Transmission' },
  { id: 'notification', label: 'Notification Art.6' }
];

export function useVentesListPage() {
  const {
    filteredVentes,
    stats,
    lotTypes,
    filters,
    setSearch,
    setStatutFilter,
    setLotTypeFilter,
  } = useVentes();

  const [showExportModal, setShowExportModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedVenteHistory, setSelectedVenteHistory] = useState<Vente | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeDetails: true,
    includeHistorique: true,
    onlyEnCours: false,
  });

  const documentsManquantsTotal = useMemo(() => {
    return filteredVentes.reduce((sum, vente) => {
      const docsObligatoires = ['PRE_ETAT_DATE', 'ETAT_DATE', 'CERTIFICAT_ARTICLE_20'];
      const docsManquants = docsObligatoires.filter(
        type => !vente.documents.some(doc => doc.type === type && doc.statut === 'SIGNE')
      );
      return sum + docsManquants.length;
    }, 0);
  }, [filteredVentes]);

  const getWorkflowProgress = useCallback((etape: VenteEtapeWorkflow) => {
    const stepIndex = WORKFLOW_STEPS.findIndex(s => s.id === etape);
    return ((stepIndex + 1) / WORKFLOW_STEPS.length) * 100;
  }, []);

  const getDocsManquants = useCallback((vente: Vente): number => {
    const docsObligatoires = ['PRE_ETAT_DATE', 'ETAT_DATE', 'CERTIFICAT_ARTICLE_20'];
    return docsObligatoires.filter(
      type => !vente.documents.some(doc => doc.type === type && doc.statut === 'SIGNE')
    ).length;
  }, []);

  const showVenteHistory = useCallback((vente: Vente) => {
    setSelectedVenteHistory(vente);
    setShowHistoryModal(true);
  }, []);

  const closeHistoryModal = useCallback(() => {
    setShowHistoryModal(false);
    setSelectedVenteHistory(null);
  }, []);

  const clearExportSuccess = useCallback(() => {
    setExportSuccess(null);
    setShowExportModal(false);
  }, []);

  return {
    filteredVentes,
    stats,
    lotTypes,
    filters,
    setSearch,
    setStatutFilter,
    setLotTypeFilter,
    showExportModal,
    setShowExportModal,
    showHistoryModal,
    selectedVenteHistory,
    exportLoading,
    setExportLoading,
    exportSuccess,
    setExportSuccess,
    exportOptions,
    setExportOptions,
    documentsManquantsTotal,
    getWorkflowProgress,
    getDocsManquants,
    showVenteHistory,
    closeHistoryModal,
    clearExportSuccess,
  };
}

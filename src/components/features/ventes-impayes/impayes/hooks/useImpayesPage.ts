'use client';

import { useState, useCallback, useMemo } from 'react';
import type { HistoriqueContenu, HistoriqueItemEnrichi } from '@/types/models/impaye';
import {
  generateRelancePDF,
  previewRelancePDF,
  generateEmailContent,
  generateImpayesExportPDF,
  generateImpayesExportCSV,
} from '@/lib/pdf/generateRelancePDF';
import type { Impaye, HistoriqueItem, RelanceGroupeeStep } from '../domain/types';
import { MOCK_IMPAYES, WORKFLOW_STEPS } from '../domain/constants';
import {
  getNextStep,
  getWorkflowIndex,
  getRelanceDescription,
  calculateStats,
  filterImpayes,
  getEligibleImpayesForType,
} from '../domain/utils';

export function useImpayesPage() {
  // Main data
  const [impayes, setImpayes] = useState<Impaye[]>(MOCK_IMPAYES);
  const [selectedStatut, setSelectedStatut] = useState<string>('tous');
  const [selectedImpaye, setSelectedImpaye] = useState<Impaye | null>(null);

  // Modal states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRelanceModal, setShowRelanceModal] = useState(false);
  const [showRegleModal, setShowRegleModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showHistoriqueDetailModal, setShowHistoriqueDetailModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showRelancesGroupeesModal, setShowRelancesGroupeesModal] = useState(false);

  // Relance state
  const [relanceType, setRelanceType] = useState<string>('');
  const [selectedHistoriqueItem, setSelectedHistoriqueItem] = useState<HistoriqueItem | null>(null);

  // Preview state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewZoom, setPreviewZoom] = useState(100);

  // Selection for grouped actions
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [relanceGroupeeType, setRelanceGroupeeType] = useState<string>('');
  const [relanceGroupeeStep, setRelanceGroupeeStep] = useState<RelanceGroupeeStep>('select');

  // Loading states
  const [isProcessing, setIsProcessing] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Computed values
  const filteredImpayes = useMemo(
    () => filterImpayes(impayes, selectedStatut),
    [impayes, selectedStatut]
  );

  const stats = useMemo(() => calculateStats(impayes, filteredImpayes), [impayes, filteredImpayes]);

  const selectedImpayes = useMemo(
    () => impayes.filter((i) => selectedIds.includes(i.id)),
    [impayes, selectedIds]
  );

  // Modal handlers
  const openDetailModal = useCallback((impaye: Impaye) => {
    setSelectedImpaye(impaye);
    setShowDetailModal(true);
  }, []);

  const openRelanceModal = useCallback((impaye: Impaye, type?: string) => {
    setSelectedImpaye(impaye);
    setRelanceType(type || getNextStep(impaye.statut) || '');
    setShowRelanceModal(true);
  }, []);

  const openRegleModal = useCallback((impaye: Impaye) => {
    setSelectedImpaye(impaye);
    setShowRegleModal(true);
  }, []);

  const openHistoriqueDetail = useCallback((item: HistoriqueItem, impaye: Impaye) => {
    setSelectedHistoriqueItem(item);
    setSelectedImpaye(impaye);
    setShowHistoriqueDetailModal(true);
  }, []);

  const openRelancesGroupeesModal = useCallback(() => {
    if (selectedIds.length === 0) return;
    setRelanceGroupeeStep('select');
    setRelanceGroupeeType('');
    setShowRelancesGroupeesModal(true);
  }, [selectedIds.length]);

  // PDF handlers
  const handlePreviewPDF = useCallback(
    (type: string) => {
      if (!selectedImpaye) return;

      const url = previewRelancePDF({
        type: type as HistoriqueItem['type'],
        coproprietaire: selectedImpaye.coproprietaire,
        lot: selectedImpaye.lot,
        batiment: selectedImpaye.batiment,
        montant: selectedImpaye.montant,
        periode: selectedImpaye.periode,
        dateEcheance: selectedImpaye.dateEcheance,
        dateRelancePrecedente: selectedImpaye.historique.find((h) => h.type === 'relance_amiable_1')?.date,
      });

      setPreviewUrl(url);
      setPreviewZoom(100);
      setShowPreviewModal(true);
    },
    [selectedImpaye]
  );

  const handleDownloadPDF = useCallback(
    (type: string) => {
      if (!selectedImpaye) return;

      generateRelancePDF({
        type: type as HistoriqueItem['type'],
        coproprietaire: selectedImpaye.coproprietaire,
        lot: selectedImpaye.lot,
        batiment: selectedImpaye.batiment,
        montant: selectedImpaye.montant,
        periode: selectedImpaye.periode,
        dateEcheance: selectedImpaye.dateEcheance,
        dateRelancePrecedente: selectedImpaye.historique.find((h) => h.type === 'relance_amiable_1')?.date,
      });
    },
    [selectedImpaye]
  );

  const closePreview = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setShowPreviewModal(false);
  }, [previewUrl]);

  // Relance handler
  const handleSendRelance = useCallback(async () => {
    if (!selectedImpaye || !relanceType) return;

    setIsProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const emailContent = generateEmailContent({
      type: relanceType as HistoriqueItem['type'],
      coproprietaire: selectedImpaye.coproprietaire,
      lot: selectedImpaye.lot,
      batiment: selectedImpaye.batiment,
      montant: selectedImpaye.montant,
      periode: selectedImpaye.periode,
      dateEcheance: selectedImpaye.dateEcheance,
      dateRelancePrecedente: selectedImpaye.historique.find((h) => h.type === 'relance_amiable_1')?.date,
    });

    const isEmail = relanceType === 'relance_amiable_1';
    const isCourrier = relanceType === 'relance_amiable_2' || relanceType === 'mise_en_demeure';

    const contenu: HistoriqueContenu = isEmail
      ? {
          type: 'email',
          email: {
            objet: emailContent.objet,
            corps: emailContent.corps,
            destinataire: selectedImpaye.coproprietaire.email,
            dateEnvoi: new Date().toISOString(),
          },
        }
      : isCourrier
        ? {
            type: 'courrier',
            pdfGenere: true,
            courrier: {
              titre: emailContent.objet,
              corps: emailContent.corps,
              destinataire: selectedImpaye.coproprietaire.nom,
              adresse: selectedImpaye.coproprietaire.adresse,
              dateEnvoi: new Date().toISOString().split('T')[0],
              recommande: relanceType === 'mise_en_demeure',
            },
          }
        : { type: 'autre' };

    setImpayes((prev) =>
      prev.map((imp) => {
        if (imp.id === selectedImpaye.id) {
          const newHistorique: HistoriqueItem = {
            id: imp.historique.length + 1,
            date: new Date().toISOString().split('T')[0],
            type: relanceType as HistoriqueItem['type'],
            description: getRelanceDescription(relanceType),
            destinataire: isEmail ? imp.coproprietaire.email : imp.coproprietaire.adresse,
            canal: isEmail ? 'email' : isCourrier ? (relanceType === 'mise_en_demeure' ? 'courrier_recommande' : 'courrier') : undefined,
            contenu,
          };

          return {
            ...imp,
            statut: relanceType as Impaye['statut'],
            historique: [...imp.historique, newHistorique],
          };
        }
        return imp;
      })
    );

    setIsProcessing(false);
    setShowRelanceModal(false);
    setSelectedImpaye(null);
  }, [selectedImpaye, relanceType]);

  // Mark as paid handler
  const handleMarkAsRegle = useCallback(async () => {
    if (!selectedImpaye) return;

    setIsProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setImpayes((prev) =>
      prev.map((imp) => {
        if (imp.id === selectedImpaye.id) {
          return {
            ...imp,
            statut: 'regle' as const,
            montant: 0,
            historique: [
              ...imp.historique,
              {
                id: imp.historique.length + 1,
                date: new Date().toISOString().split('T')[0],
                type: 'paiement_partiel' as const,
                description: 'Impayé réglé intégralement',
                montant: imp.montant,
              },
            ],
          };
        }
        return imp;
      })
    );

    setIsProcessing(false);
    setShowRegleModal(false);
    setSelectedImpaye(null);
  }, [selectedImpaye]);

  // Selection handlers
  const toggleSelection = useCallback((id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }, []);

  const toggleSelectAll = useCallback(() => {
    const activeImpayes = filteredImpayes.filter((i) => i.statut !== 'regle');
    if (selectedIds.length === activeImpayes.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(activeImpayes.map((i) => i.id));
    }
  }, [filteredImpayes, selectedIds.length]);

  // Grouped relance handler
  const handleSendRelancesGroupees = useCallback(async () => {
    if (!relanceGroupeeType || selectedImpayes.length === 0) return;

    setIsProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const eligibleImpayes = getEligibleImpayesForType(selectedImpayes, relanceGroupeeType);
    const isEmail = relanceGroupeeType === 'relance_amiable_1';
    const isCourrier = relanceGroupeeType === 'relance_amiable_2' || relanceGroupeeType === 'mise_en_demeure';

    setImpayes((prev) =>
      prev.map((imp) => {
        if (eligibleImpayes.some((e) => e.id === imp.id)) {
          const emailContent = generateEmailContent({
            type: relanceGroupeeType as HistoriqueItem['type'],
            coproprietaire: imp.coproprietaire,
            lot: imp.lot,
            batiment: imp.batiment,
            montant: imp.montant,
            periode: imp.periode,
            dateEcheance: imp.dateEcheance,
            dateRelancePrecedente: imp.historique.find((h) => h.type === 'relance_amiable_1')?.date,
          });

          const contenu: HistoriqueContenu = isEmail
            ? {
                type: 'email',
                email: {
                  objet: emailContent.objet,
                  corps: emailContent.corps,
                  destinataire: imp.coproprietaire.email,
                  dateEnvoi: new Date().toISOString(),
                },
              }
            : isCourrier
              ? {
                  type: 'courrier',
                  pdfGenere: true,
                  courrier: {
                    titre: emailContent.objet,
                    corps: emailContent.corps,
                    destinataire: imp.coproprietaire.nom,
                    adresse: imp.coproprietaire.adresse,
                    dateEnvoi: new Date().toISOString().split('T')[0],
                    recommande: relanceGroupeeType === 'mise_en_demeure',
                  },
                }
              : { type: 'autre' };

          return {
            ...imp,
            statut: relanceGroupeeType as Impaye['statut'],
            historique: [
              ...imp.historique,
              {
                id: imp.historique.length + 1,
                date: new Date().toISOString().split('T')[0],
                type: relanceGroupeeType as HistoriqueItem['type'],
                description: getRelanceDescription(relanceGroupeeType) + ' (relance groupée)',
                destinataire: isEmail ? imp.coproprietaire.email : imp.coproprietaire.adresse,
                canal: isEmail ? 'email' : isCourrier ? (relanceGroupeeType === 'mise_en_demeure' ? 'courrier_recommande' : 'courrier') : undefined,
                contenu,
              },
            ],
          };
        }
        return imp;
      })
    );

    setIsProcessing(false);
    setRelanceGroupeeStep('success');
    setSelectedIds([]);
  }, [relanceGroupeeType, selectedImpayes]);

  // Export handler
  const handleExport = useCallback(
    async (format: 'pdf' | 'excel') => {
      setExportLoading(true);

      const impayesForExport = filteredImpayes.map((imp) => ({
        ...imp,
        coproprietaire: { ...imp.coproprietaire, id: undefined, prenom: undefined },
        historique: imp.historique as HistoriqueItemEnrichi[],
      }));

      try {
        if (format === 'pdf') {
          generateImpayesExportPDF(impayesForExport);
        } else {
          generateImpayesExportCSV(impayesForExport);
        }

        setExportSuccess(true);

        setTimeout(() => {
          setShowExportModal(false);
          setExportSuccess(false);
        }, 1500);
      } catch {
        setShowExportModal(false);
      } finally {
        setExportLoading(false);
      }
    },
    [filteredImpayes]
  );

  // Filter change handler
  const handleStatutChange = useCallback((statut: string) => {
    setSelectedStatut(statut);
    setSelectedIds([]);
  }, []);

  // Get eligible for type wrapper
  const getEligibleForType = useCallback(
    (type: string) => getEligibleImpayesForType(selectedImpayes, type),
    [selectedImpayes]
  );

  return {
    // Data
    impayes,
    filteredImpayes,
    selectedImpaye,
    selectedStatut,
    stats,

    // Selection
    selectedIds,
    selectedImpayes,

    // Modal states
    showDetailModal,
    showRelanceModal,
    showRegleModal,
    showExportModal,
    showHistoriqueDetailModal,
    showPreviewModal,
    showRelancesGroupeesModal,

    // Relance state
    relanceType,
    selectedHistoriqueItem,

    // Preview state
    previewUrl,
    previewZoom,

    // Grouped relance state
    relanceGroupeeType,
    relanceGroupeeStep,

    // Loading states
    isProcessing,
    exportLoading,
    exportSuccess,

    // Setters
    setSelectedStatut: handleStatutChange,
    setShowDetailModal,
    setShowRelanceModal,
    setShowRegleModal,
    setShowExportModal,
    setShowHistoriqueDetailModal,
    setShowPreviewModal,
    setShowRelancesGroupeesModal,
    setRelanceType,
    setPreviewZoom,
    setRelanceGroupeeType,
    setRelanceGroupeeStep,
    setSelectedIds,

    // Handlers
    openDetailModal,
    openRelanceModal,
    openRegleModal,
    openHistoriqueDetail,
    openRelancesGroupeesModal,
    handlePreviewPDF,
    handleDownloadPDF,
    closePreview,
    handleSendRelance,
    handleMarkAsRegle,
    toggleSelection,
    toggleSelectAll,
    handleSendRelancesGroupees,
    handleExport,

    // Utils
    getNextStep,
    getWorkflowIndex,
    getEligibleForType,
  };
}

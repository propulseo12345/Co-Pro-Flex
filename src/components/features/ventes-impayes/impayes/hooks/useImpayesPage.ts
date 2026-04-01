'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
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
import { useCopro } from '@/providers/CoproContext';
import { autoFileToGED } from '@/lib/services/auto-file-ged.service';
import * as impayesApi from '@/lib/impayes/api';
import type { UnpaidWithReminders, PaymentReminderOverview } from '@/lib/impayes/api';

// ============================================================================
// Mapper: Supabase data -> local Impaye type
// ============================================================================

function mapDelayLevelToStatut(
  daysOverdue: number,
  lastReminderLevel: number | null,
  totalRemindersSent: number
): Impaye['statut'] {
  // Map based on last reminder level and total reminders
  if (lastReminderLevel !== null) {
    if (lastReminderLevel >= 90) return 'contentieux';
    if (lastReminderLevel >= 60) return 'mise_en_demeure';
    if (lastReminderLevel >= 30) return 'relance_amiable_2';
    if (lastReminderLevel >= 15) return 'relance_amiable_1';
  }

  // Fallback based on days overdue
  if (daysOverdue >= 120) return 'contentieux';
  if (daysOverdue >= 90) return 'mise_en_demeure';
  if (daysOverdue >= 60) return 'relance_amiable_2';
  if (daysOverdue >= 30) return 'relance_amiable_1';
  return 'en_retard';
}

function mapUnpaidToImpaye(
  unpaid: UnpaidWithReminders,
  index: number,
  reminders: PaymentReminderOverview[]
): Impaye {
  const lotReminders = reminders.filter(r => r.lot_id === unpaid.lot_id);
  const statut = mapDelayLevelToStatut(
    unpaid.days_overdue,
    unpaid.last_reminder_level,
    unpaid.total_reminders_sent
  );

  // Build historique from reminders
  const historique: HistoriqueItem[] = [
    {
      id: 0,
      date: unpaid.oldest_due_date,
      type: 'creation',
      description: `Impayé détecté - ${unpaid.unpaid_amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} en retard`,
    },
    ...lotReminders.map((r, i): HistoriqueItem => {
      let type: HistoriqueItem['type'] = 'relance_amiable_1';
      if (r.delay_level >= 90) type = 'contentieux';
      else if (r.delay_level >= 60) type = 'mise_en_demeure';
      else if (r.delay_level >= 30) type = 'relance_amiable_2';
      else if (r.delay_level >= 15) type = 'relance_amiable_1';

      return {
        id: i + 1,
        date: r.sent_at || r.scheduled_at || r.created_at,
        type,
        description: `${r.rule_label || 'Relance'} - ${r.status === 'sent' ? 'Envoyée' : r.status}`,
        destinataire: r.recipient_email || undefined,
        canal: (r.channel === 'email' ? 'email' : 'courrier') as HistoriqueItem['canal'],
      };
    }),
  ];

  return {
    id: index + 1, // Numeric ID for backward compatibility
    coproprietaire: {
      nom: unpaid.owner_name || 'Inconnu',
      email: unpaid.owner_email || '',
      telephone: unpaid.owner_phone || '',
      adresse: '', // Not available in the view
    },
    lot: unpaid.lot_ref || `Lot ${unpaid.lot_id.slice(-4)}`,
    batiment: '', // Not available in the view
    montant: unpaid.unpaid_amount,
    montantInitial: unpaid.total_due,
    periode: `Retard ${unpaid.days_overdue}j`,
    type: 'charges',
    statut,
    dateEcheance: unpaid.oldest_due_date,
    dateCreation: unpaid.oldest_due_date,
    historique,
  };
}

export function useImpayesPage() {
  const { currentCoproId } = useCopro();

  // Main data - start empty, load from Supabase
  const [impayes, setImpayes] = useState<Impaye[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load data from Supabase
  useEffect(() => {
    if (!currentCoproId) {
      // Fallback to mock data when no copro is selected (dev mode)
      setImpayes(MOCK_IMPAYES);
      setIsLoadingData(false);
      return;
    }

    let cancelled = false;

    async function loadData() {
      setIsLoadingData(true);
      setLoadError(null);

      try {
        const [unpaidData, remindersData] = await Promise.all([
          impayesApi.listUnpaidWithReminders(currentCoproId!),
          impayesApi.listPaymentReminders(currentCoproId!),
        ]);

        if (cancelled) return;

        if (unpaidData.length === 0) {
          // Fall back to mock data if no real data
          setImpayes(MOCK_IMPAYES);
        } else {
          const mapped = unpaidData.map((u, i) => mapUnpaidToImpaye(u, i, remindersData));
          setImpayes(mapped);
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Error loading impayés from Supabase:', err);
        setLoadError(err instanceof Error ? err.message : 'Erreur de chargement');
        // Fallback to mock data on error
        setImpayes(MOCK_IMPAYES);
      } finally {
        if (!cancelled) {
          setIsLoadingData(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [currentCoproId]);
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

      const typeLabel: Record<string, string> = {
        relance_amiable_1: 'relance_1',
        relance_amiable_2: 'relance_2',
        mise_en_demeure: 'mise_en_demeure',
      };
      const doc = generateRelancePDF({
        type: type as HistoriqueItem['type'],
        coproprietaire: selectedImpaye.coproprietaire,
        lot: selectedImpaye.lot,
        batiment: selectedImpaye.batiment,
        montant: selectedImpaye.montant,
        periode: selectedImpaye.periode,
        dateEcheance: selectedImpaye.dateEcheance,
        dateRelancePrecedente: selectedImpaye.historique.find((h) => h.type === 'relance_amiable_1')?.date,
      });
      const fileName = `${typeLabel[type] || 'relance'}_${selectedImpaye.coproprietaire.nom.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      // Fire-and-forget: archive dans la GED
      if (currentCoproId) {
        const blob = doc.output('blob');
        autoFileToGED({
          blob,
          fileName,
          coproId: currentCoproId,
          category: 'courrier',
          sourceModule: 'finance',
          subFolderName: `Relances ${new Date().getFullYear()}`,
          year: new Date().getFullYear(),
        });
      }
    },
    [selectedImpaye, currentCoproId]
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
          const doc = generateImpayesExportPDF(impayesForExport);
          const exportFileName = `impayes_export_${new Date().toISOString().split('T')[0]}.pdf`;
          doc.save(exportFileName);

          // Fire-and-forget: archive dans la GED
          if (currentCoproId) {
            const blob = doc.output('blob');
            autoFileToGED({
              blob,
              fileName: exportFileName,
              coproId: currentCoproId,
              category: 'releve_charges',
              sourceModule: 'finance',
              subFolderName: `Exports ${new Date().getFullYear()}`,
              year: new Date().getFullYear(),
            });
          }
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
    [filteredImpayes, currentCoproId]
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

'use client';

import { useState, useMemo, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import type {
  AppelFonds,
  GroupedAppelFonds,
  CoproprietaireAppel,
  StatutAppel,
  TypeAppel,
  ModeEnvoi,
  NewAppelForm,
  AppelsFondsStats,
  StatutPaiement,
  StatutRecommande,
  AlerteDelai,
  StatsAlertes,
  RelanceAppel
} from '@/components/features/finance/AppelsFonds/types';
import type { NouveauPaiement, PaiementHistorique } from '@/components/features/finance/AppelsFonds/modals';
import {
  getDefaultNewAppelForm,
  calculerToutesAlertes,
  calculerStatsAlertes,
  genererDatesSuggerees
} from '@/components/features/finance/AppelsFonds/utils';
import {
  useCalls,
  useCallCampaigns,
  useCallLines,
  useCreateCall,
  useRecordPayment,
  useOpenPeriod,
  useRepartitionKeys,
} from '@/hooks/modules/useFinanceData';
import type { CallForFundsOverview, CallLineDetailed, CallCampaign } from '@/lib/finance/api';

// ============================================================================
// MAPPERS: Supabase → UI Types
// ============================================================================

function mapCallStatusToUI(status: CallForFundsOverview['status']): StatutAppel {
  switch (status) {
    case 'draft':
      return 'A_GENERER';
    case 'issued':
      return 'ENVOYE';
    case 'partially_paid':
      return 'ENVOYE'; // Keep as ENVOYE, payment status shown elsewhere
    case 'paid':
      return 'SOLDE';
    case 'cancelled':
      return 'ANNULE';
    default:
      return 'A_GENERER';
  }
}

function mapCallToAppelFonds(call: CallForFundsOverview): AppelFonds {
  // Extract year from period or issue_date
  const year = new Date(call.issue_date).getFullYear();
  const trimesterLabel = call.trimester ? `T${call.trimester} ${year}` : '';

  return {
    id: call.id,
    periodId: call.period_id,
    dateExigibilite: call.due_date,
    dateEmission: call.issue_date,
    dateLimiteReglement: call.due_date,
    statut: mapCallStatusToUI(call.status),
    montantTotal: Number(call.total_amount),
    montantEncaisse: Number(call.total_paid),
    description: call.label,
    periode: trimesterLabel || call.label,
    type: call.budget_id ? 'travaux' : 'fonctionnement',
    budgetTravauxId: call.budget_id || undefined,
    cleRepartitionId: call.repartition_key_id,
    historiqueRelances: [], // TODO: Load from separate table if needed
  };
}

function mapLineStatusToPayment(status: CallLineDetailed['status']): StatutPaiement {
  switch (status) {
    case 'paid':
      return 'PAYE';
    case 'partial':
      return 'PARTIELLEMENT_PAYE';
    case 'unpaid':
    default:
      return 'NON_PAYE';
  }
}

function mapCallLineToCoprprietaire(line: CallLineDetailed, callStatus: string): CoproprietaireAppel {
  const isIssued = callStatus !== 'draft';

  return {
    id: line.id, // Use line ID for unique identification
    nom: line.owner_name || 'Propriétaire inconnu',
    lot: line.lot_ref,
    tantiemes: 0, // Tantièmes would need separate lookup from repartition_key_lines
    montantIndividuel: Number(line.amount_due),
    modeEnvoiRecommande: 'email', // Default mode
    envoye: isIssued,
    paiement: {
      montantDu: Number(line.amount_due),
      montantPaye: Number(line.amount_paid),
      statutPaiement: mapLineStatusToPayment(line.status),
    },
  };
}

export function useAppelsFonds() {
  // ============================================================================
  // Supabase Data Hooks
  // ============================================================================
  const { data: callsData, isLoading: isLoadingCalls, refresh: refreshCalls } = useCalls();
  const { data: campaignsData, isLoading: isLoadingCampaigns, refresh: refreshCampaigns } = useCallCampaigns();
  const { data: openPeriod } = useOpenPeriod();
  const { data: repartitionKeys } = useRepartitionKeys();
  const createCallMutation = useCreateCall();
  const recordPaymentMutation = useRecordPayment();

  // ============================================================================
  // État principal - Now derived from Supabase data
  // ============================================================================
  const [selectedAppelId, setSelectedAppelId] = useState<string | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [sendingInProgress, setSendingInProgress] = useState(false);

  // Campaigns list
  const campaigns = useMemo<CallCampaign[]>(() => {
    return campaignsData || [];
  }, [campaignsData]);

  // Load call lines when an appel is selected
  const { data: callLinesData, isLoading: isLoadingLines, refresh: refreshLines } = useCallLines(selectedAppelId);

  // Map Supabase data to UI types
  const appels = useMemo<AppelFonds[]>(() => {
    if (!callsData) return [];
    return callsData.map(mapCallToAppelFonds);
  }, [callsData]);

  // Filter appels by selected campaign
  const campaignAppels = useMemo<AppelFonds[]>(() => {
    if (!selectedCampaignId) return appels;
    return appels.filter(a => a.periodId === selectedCampaignId);
  }, [appels, selectedCampaignId]);

  // Group appels by repartition key (filtered by campaign)
  const groupedAppels = useMemo<GroupedAppelFonds[]>(() => {
    const groups = new Map<string, GroupedAppelFonds>();
    for (const appel of campaignAppels) {
      const keyId = appel.cleRepartitionId || appel.id;
      const existing = groups.get(keyId);
      if (existing) {
        existing.montantAnnuel += appel.montantTotal;
        existing.montantEncaisse += appel.montantEncaisse || 0;
        existing.nbTrimestres += 1;
        existing.trimestres.push(appel);
        // Global status: worst status wins
        if (appel.statut === 'A_GENERER' || appel.statut === 'EN_PREPARATION') {
          existing.statutGlobal = appel.statut;
        }
      } else {
        // Extract key name from label: "Appel T1 - Charges générales" → "Charges générales"
        const keyName = appel.description.replace(/^Appel [TS]\d+ - /, '').replace(/^Appel annuel - /, '');
        const year = appel.dateEmission ? new Date(appel.dateEmission).getFullYear() : '';
        groups.set(keyId, {
          keyId,
          keyName: keyName || appel.description,
          montantAnnuel: appel.montantTotal,
          montantEncaisse: appel.montantEncaisse || 0,
          nbTrimestres: 1,
          statutGlobal: appel.statut,
          type: appel.type,
          periode: year ? `Exercice ${year}` : appel.periode,
          trimestres: [appel],
        });
      }
    }
    // Sort trimestres within each group
    for (const group of groups.values()) {
      group.trimestres.sort((a, b) => (a.dateEmission || '').localeCompare(b.dateEmission || ''));
    }
    return Array.from(groups.values());
  }, [campaignAppels]);

  // Find selected appel from mapped data
  const selectedAppel = useMemo<AppelFonds | null>(() => {
    if (!selectedAppelId) return null;
    return appels.find(a => a.id === selectedAppelId) || null;
  }, [appels, selectedAppelId]);

  // Map call lines to coproprietaires (base data from Supabase)
  const baseCoproprietaires = useMemo<CoproprietaireAppel[]>(() => {
    if (!callLinesData || !selectedAppel) return [];
    const callData = callsData?.find(c => c.id === selectedAppelId);
    const callStatus = callData?.status || 'draft';
    return callLinesData.map(line => mapCallLineToCoprprietaire(line, callStatus));
  }, [callLinesData, selectedAppel, callsData, selectedAppelId]);

  // Local UI modifications (modeEnvoiValide, envoye) - keyed by coproprietaire ID
  const [localModifications, setLocalModifications] = useState<Record<string, Partial<CoproprietaireAppel>>>({});

  // Merge base data with local modifications
  const coproprietaires = useMemo<CoproprietaireAppel[]>(() => {
    return baseCoproprietaires.map(copro => ({
      ...copro,
      ...localModifications[copro.id],
    }));
  }, [baseCoproprietaires, localModifications]);

  // Paiements historique - stored locally for now (could be loaded from Supabase payments)
  const [paiementsHistorique, setPaiementsHistorique] = useState<Record<string, PaiementHistorique[]>>({});

  // Filtres principaux
  const [searchTerm, setSearchTerm] = useState('');
  const [statutFilter, setStatutFilter] = useState<'TOUS' | StatutAppel>('TOUS');
  const [typeFilter, setTypeFilter] = useState<'TOUS' | TypeAppel>('TOUS');

  // États modals
  const [showGestionModal, setShowGestionModal] = useState(false);
  const [showMontantModal, setShowMontantModal] = useState(false);
  const [showNewAppelModal, setShowNewAppelModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPaiementModal, setShowPaiementModal] = useState(false);
  const [showHistoriqueModal, setShowHistoriqueModal] = useState(false);
  const [showRelancesModal, setShowRelancesModal] = useState(false);
  const [showExportAvisModal, setShowExportAvisModal] = useState(false);
  const [selectedCoproprietaire, setSelectedCoproprietaire] = useState<CoproprietaireAppel | null>(null);

  // Filtres modal gestion
  const [searchCopro, setSearchCopro] = useState('');
  const [paiementFilterModal, setPaiementFilterModal] = useState<'TOUS' | StatutPaiement>('TOUS');
  const [recommandeFilterModal, setRecommandeFilterModal] = useState<'TOUS' | StatutRecommande>('TOUS');

  // Formulaire
  const [newAppelForm, setNewAppelForm] = useState<NewAppelForm>(getDefaultNewAppelForm());

  // Calcul des statistiques
  const stats = useMemo<AppelsFondsStats>(() => {
    const totalAppels = appels.length;
    const montantTotal = appels.reduce((sum, a) => sum + a.montantTotal, 0);
    const montantEncaisse = appels.reduce((sum, a) => sum + (a.montantEncaisse || 0), 0);
    const tauxRecouvrement = montantTotal > 0 ? (montantEncaisse / montantTotal) * 100 : 0;
    return { totalAppels, montantTotal, montantEncaisse, tauxRecouvrement };
  }, [appels]);

  // Calcul des alertes de délais
  const alertes = useMemo<AlerteDelai[]>(() => {
    return calculerToutesAlertes(appels);
  }, [appels]);

  // Statistiques des alertes
  const statsAlertes = useMemo<StatsAlertes>(() => {
    return calculerStatsAlertes(alertes);
  }, [alertes]);

  // Appels filtrés
  const filteredAppels = useMemo(() => {
    return appels.filter(appel => {
      const matchesSearch =
        appel.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appel.periode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appel.montantTotal.toString().includes(searchTerm);

      const matchesStatut = statutFilter === 'TOUS' || appel.statut === statutFilter;
      const matchesType = typeFilter === 'TOUS' || appel.type === typeFilter;

      return matchesSearch && matchesStatut && matchesType;
    });
  }, [appels, searchTerm, statutFilter, typeFilter]);

  // Copropriétaires filtrés (modal gestion)
  const filteredCoproprietaires = useMemo(() => {
    return coproprietaires.filter(copro => {
      const matchesSearch = copro.nom.toLowerCase().includes(searchCopro.toLowerCase()) ||
        copro.lot.toLowerCase().includes(searchCopro.toLowerCase());

      const matchesPaiement = paiementFilterModal === 'TOUS' ||
        (copro.paiement?.statutPaiement === paiementFilterModal);

      const matchesRecommande = recommandeFilterModal === 'TOUS' ||
        (copro.recommande?.statut === recommandeFilterModal);

      return matchesSearch && matchesPaiement && matchesRecommande;
    });
  }, [coproprietaires, searchCopro, paiementFilterModal, recommandeFilterModal]);

  // Handlers
  const handleGestionClick = useCallback((appel: AppelFonds) => {
    setSelectedAppelId(appel.id);
    // Call lines will be loaded automatically via useCallLines hook
    setShowGestionModal(true);
  }, []);

  const handleMontantClick = useCallback((appel: AppelFonds) => {
    setSelectedAppelId(appel.id);
    // Call lines will be loaded automatically via useCallLines hook
    setShowMontantModal(true);
  }, []);

  const handleModeEnvoiChange = useCallback((coproId: string, mode: ModeEnvoi) => {
    setLocalModifications(prev => ({
      ...prev,
      [coproId]: { ...prev[coproId], modeEnvoiValide: mode },
    }));
  }, []);

  const handleEnvoyerAppel = useCallback(async (coproId: string) => {
    const copro = coproprietaires.find(c => c.id === coproId);
    if (!copro || !copro.modeEnvoiValide) return;

    setSendingInProgress(true);

    // TODO: Implement actual sending via Supabase Edge Function
    setTimeout(() => {
      setLocalModifications(prev => ({
        ...prev,
        [coproId]: { ...prev[coproId], envoye: true },
      }));
      setSendingInProgress(false);
    }, 1500);
  }, [coproprietaires]);

  const handleEnvoyerTous = useCallback(async () => {
    setSendingInProgress(true);

    // TODO: Implement actual sending via Supabase Edge Function
    setTimeout(async () => {
      // Mark all as sent with their validated or recommended mode
      const newMods: Record<string, Partial<CoproprietaireAppel>> = {};
      coproprietaires.forEach(c => {
        newMods[c.id] = {
          ...localModifications[c.id],
          envoye: true,
          modeEnvoiValide: c.modeEnvoiValide || c.modeEnvoiRecommande,
        };
      });
      setLocalModifications(newMods);
      setSendingInProgress(false);

      // Refresh data from Supabase after status change
      await refreshCalls();
    }, 2000);
  }, [coproprietaires, localModifications, refreshCalls]);

  const handleViewAppel = useCallback((appel: AppelFonds) => {
    setSelectedAppelId(appel.id);
    setShowDetailModal(true);
  }, []);

  const handleEditAppel = useCallback((appel: AppelFonds) => {
    setSelectedAppelId(appel.id);
    setNewAppelForm({
      description: appel.description,
      periode: appel.periode,
      dateExigibilite: appel.dateExigibilite,
      dateEmission: appel.dateEmission || new Date().toISOString().split('T')[0],
      dateLimiteReglement: appel.dateLimiteReglement || '',
      type: appel.type,
      montantTotal: appel.montantTotal.toString(),
      budgetTravauxId: appel.budgetTravauxId || '',
      projetNom: appel.projetNom || '',
      cleRepartitionId: appel.cleRepartitionId || ''
    });
    setShowEditModal(true);
  }, []);

  const handleDeleteAppel = useCallback(async (appel: AppelFonds) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer l'appel de fonds "${appel.description}" ?`)) {
      // TODO: Implement delete via Supabase
      // For now, just refresh to reflect any backend changes
      await refreshCalls();
    }
  }, [refreshCalls]);

  const handleUpdateAppel = useCallback(async () => {
    if (!selectedAppel) return;

    if (!newAppelForm.description || !newAppelForm.periode || !newAppelForm.dateExigibilite || !newAppelForm.dateEmission || !newAppelForm.dateLimiteReglement || !newAppelForm.montantTotal) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    // TODO: Implement update via Supabase
    // For now, just refresh data
    await refreshCalls();
    setNewAppelForm(getDefaultNewAppelForm());
    setShowEditModal(false);
    setSelectedAppelId(null);
  }, [selectedAppel, newAppelForm, refreshCalls]);

  const handleNewAppelSubmit = useCallback(async () => {
    if (!newAppelForm.description || !newAppelForm.periode || !newAppelForm.dateExigibilite || !newAppelForm.dateEmission || !newAppelForm.dateLimiteReglement || !newAppelForm.montantTotal) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (!openPeriod || !newAppelForm.cleRepartitionId) {
      alert('Période comptable ou clé de répartition manquante');
      return;
    }

    // Create call via Supabase
    const result = await createCallMutation.mutate({
      period_id: openPeriod.id,
      repartition_key_id: newAppelForm.cleRepartitionId,
      label: newAppelForm.description,
      issue_date: newAppelForm.dateEmission,
      due_date: newAppelForm.dateExigibilite,
      total_amount: parseFloat(newAppelForm.montantTotal),
    });

    if (result.error) {
      alert(`Erreur lors de la création: ${result.error}`);
      return;
    }

    // Refresh data from Supabase
    await refreshCalls();
    setNewAppelForm(getDefaultNewAppelForm());
    setShowNewAppelModal(false);
  }, [newAppelForm, openPeriod, createCallMutation, refreshCalls]);

  const handleNewAppelCancel = useCallback(() => {
    setShowNewAppelModal(false);
    setNewAppelForm(getDefaultNewAppelForm());
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setShowEditModal(false);
    setSelectedAppelId(null);
    setNewAppelForm(getDefaultNewAppelForm());
  }, []);

  // Handlers pour les paiements
  const handleEnregistrerPaiement = useCallback((coproId: string) => {
    const copro = coproprietaires.find(c => c.id === coproId);
    if (copro) {
      setSelectedCoproprietaire(copro);
      setShowPaiementModal(true);
    }
  }, [coproprietaires]);

  const handleVoirHistoriquePaiements = useCallback((coproId: string) => {
    const copro = coproprietaires.find(c => c.id === coproId);
    if (copro) {
      setSelectedCoproprietaire(copro);
      setShowHistoriqueModal(true);
    }
  }, [coproprietaires]);

  const handleSubmitPaiement = useCallback(async (coproId: string, paiement: NouveauPaiement) => {
    // Find the call line to get lot_id
    const callLine = callLinesData?.find(l => l.id === coproId);
    if (!callLine || !openPeriod) {
      alert('Données manquantes pour enregistrer le paiement');
      return;
    }

    // Record payment via Supabase
    const result = await recordPaymentMutation.mutate({
      period_id: openPeriod.id,
      lot_id: callLine.lot_id,
      amount: paiement.montant,
      payment_date: paiement.datePaiement,
      method: paiement.modePaiement,
      reference: paiement.reference,
      call_line_ids: [coproId], // Allocate to this specific call line
    });

    if (result.error) {
      alert(`Erreur lors de l'enregistrement du paiement: ${result.error}`);
      return;
    }

    // Keep local historique for UI display
    const nouveauPaiement: PaiementHistorique = {
      id: `p${Date.now()}`,
      montant: paiement.montant,
      datePaiement: paiement.datePaiement,
      modePaiement: paiement.modePaiement,
      reference: paiement.reference,
      commentaire: paiement.commentaire,
    };

    setPaiementsHistorique(prev => ({
      ...prev,
      [coproId]: [...(prev[coproId] || []), nouveauPaiement]
    }));

    // Refresh data from Supabase to get updated payment status
    await refreshCalls();
    await refreshLines();

    setShowPaiementModal(false);
    setSelectedCoproprietaire(null);
  }, [callLinesData, openPeriod, recordPaymentMutation, refreshCalls, refreshLines]);

  const handleClosePaiementModal = useCallback(() => {
    setShowPaiementModal(false);
    setSelectedCoproprietaire(null);
  }, []);

  const handleCloseHistoriqueModal = useCallback(() => {
    setShowHistoriqueModal(false);
    setSelectedCoproprietaire(null);
  }, []);

  // Récupérer l'historique des paiements d'un copropriétaire
  const getPaiementsForCoproprietaire = useCallback((coproId: string): PaiementHistorique[] => {
    return paiementsHistorique[coproId] || [];
  }, [paiementsHistorique]);

  // Handlers pour les modals relances et export
  const handleVoirRelances = useCallback((appel: AppelFonds) => {
    setSelectedAppelId(appel.id);
    setShowRelancesModal(true);
  }, []);

  const handleCloseRelancesModal = useCallback(() => {
    setShowRelancesModal(false);
    setSelectedAppelId(null);
  }, []);

  const handleNouvelleRelance = useCallback(async (relance: Omit<RelanceAppel, 'id'>) => {
    if (!selectedAppel) return;

    // TODO: Implement relance creation via Supabase (payment_reminders table)
    // For now, just refresh data
    void relance; // Placeholder until Supabase implementation

    // Refresh data from Supabase
    await refreshCalls();
  }, [selectedAppel, refreshCalls]);

  const handleVoirExportAvis = useCallback((appel: AppelFonds) => {
    setSelectedAppelId(appel.id);
    // Call lines will be loaded automatically via useCallLines hook
    setShowExportAvisModal(true);
  }, []);

  const handleCloseExportAvisModal = useCallback(() => {
    setShowExportAvisModal(false);
    setSelectedAppelId(null);
  }, []);

  // Handler pour les actions des alertes
  const handleAlerteAction = useCallback((alerte: AlerteDelai) => {
    const appel = appels.find(a => a.id === alerte.appelId);
    if (!appel) return;

    switch (alerte.action?.handler) {
      case 'handleGenererAppel':
        // Ouvrir la modal d'édition pour finaliser la génération
        handleEditAppel(appel);
        break;
      case 'handleEnvoyerAppel':
        // Ouvrir la modal de gestion des envois
        handleGestionClick(appel);
        break;
      case 'handleRelancerAppel':
        // Ouvrir la modal de gestion pour envoyer les relances
        handleGestionClick(appel);
        break;
      default:
        // Action par défaut : ouvrir les détails
        handleViewAppel(appel);
    }
  }, [appels, handleEditAppel, handleGestionClick, handleViewAppel]);

  // Obtenir les dates suggérées pour une échéance
  const getDatesSuggereesForEcheance = useCallback((dateEcheance: string) => {
    return genererDatesSuggerees(dateEcheance);
  }, []);

  // Export functions
  const exportToExcel = useCallback(() => {
    if (!selectedAppel) return;

    const exportData = coproprietaires;
    const headers = ['Copropriétaire', 'Lot', 'Tantièmes', 'Montant appelé', 'Montant payé', 'Reste à devoir', 'Statut'];
    const rows = exportData.map(copro => {
      const montantPaye = copro.paiement?.montantPaye || 0;
      const resteADevoir = copro.montantIndividuel - montantPaye;
      return [
        copro.nom,
        copro.lot,
        copro.tantiemes.toString(),
        copro.montantIndividuel.toFixed(2).replace('.', ','),
        montantPaye.toFixed(2).replace('.', ','),
        resteADevoir.toFixed(2).replace('.', ','),
        copro.paiement?.statutPaiement === 'PAYE' ? 'Soldé' :
          copro.paiement?.statutPaiement === 'PARTIELLEMENT_PAYE' ? 'Partiel' : 'Non payé'
      ];
    });

    // Ajouter une ligne de total
    const totalAppele = exportData.reduce((sum, c) => sum + c.montantIndividuel, 0);
    const totalPaye = exportData.reduce((sum, c) => sum + (c.paiement?.montantPaye || 0), 0);
    const totalReste = totalAppele - totalPaye;
    rows.push(['', '', '', '', '', '', '']);
    rows.push(['TOTAL', '', '', totalAppele.toFixed(2).replace('.', ','), totalPaye.toFixed(2).replace('.', ','), totalReste.toFixed(2).replace('.', ','), '']);

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `appel_fonds_${selectedAppel.id}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [selectedAppel, coproprietaires]);

  const exportToPDF = useCallback(() => {
    if (!selectedAppel) return;

    const exportData = coproprietaires;
    const doc = new jsPDF();
    let yPos = 20;
    const xPos = 14;

    // Titre
    doc.setFontSize(18);
    doc.text('Répartition détaillée - Appel de fonds', xPos, yPos);
    yPos += 10;

    // Informations de l'appel
    doc.setFontSize(12);
    doc.text(`Description: ${selectedAppel.description}`, xPos, yPos);
    yPos += 7;
    doc.text(`Période: ${selectedAppel.periode}`, xPos, yPos);
    yPos += 7;
    doc.text(`Date d'exigibilité: ${new Date(selectedAppel.dateExigibilite).toLocaleDateString('fr-FR')}`, xPos, yPos);
    yPos += 7;
    doc.text(`Montant total: ${selectedAppel.montantTotal.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`, xPos, yPos);
    yPos += 12;

    // Synthèse
    const totalAppele = exportData.reduce((sum, c) => sum + c.montantIndividuel, 0);
    const totalPaye = exportData.reduce((sum, c) => sum + (c.paiement?.montantPaye || 0), 0);
    const totalReste = totalAppele - totalPaye;
    const tauxRecouvrement = totalAppele > 0 ? ((totalPaye / totalAppele) * 100).toFixed(1) : '0';

    doc.setFillColor(230, 245, 255);
    doc.rect(xPos, yPos, 180, 20, 'F');
    doc.setFontSize(10);
    doc.text(`Encaissé: ${totalPaye.toLocaleString('fr-FR')} € (${tauxRecouvrement}%)`, xPos + 5, yPos + 8);
    doc.text(`Reste à percevoir: ${totalReste.toLocaleString('fr-FR')} €`, xPos + 5, yPos + 16);
    yPos += 28;

    // Tableau
    doc.setFontSize(9);
    const tableHeaders = ['Copropriétaire', 'Lot', 'Appelé', 'Payé', 'Reste dû', 'Statut'];
    const colWidths = [50, 15, 28, 28, 28, 30];

    doc.setFillColor(240, 240, 240);
    doc.rect(xPos, yPos, colWidths.reduce((a, b) => a + b, 0), 8, 'F');
    doc.setFont('helvetica', 'bold');
    let currentX = xPos;
    tableHeaders.forEach((header, i) => {
      doc.text(header, currentX + 2, yPos + 6);
      currentX += colWidths[i];
    });
    yPos += 8;

    doc.setFont('helvetica', 'normal');
    exportData.forEach(copro => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      const montantPaye = copro.paiement?.montantPaye || 0;
      const resteADu = copro.montantIndividuel - montantPaye;
      const statut = copro.paiement?.statutPaiement === 'PAYE' ? 'Soldé' :
        copro.paiement?.statutPaiement === 'PARTIELLEMENT_PAYE' ? 'Partiel' : 'Non payé';

      const row = [
        copro.nom.substring(0, 25),
        copro.lot,
        copro.montantIndividuel.toFixed(2) + ' €',
        montantPaye.toFixed(2) + ' €',
        resteADu.toFixed(2) + ' €',
        statut
      ];

      currentX = xPos;
      row.forEach((cell, i) => {
        doc.text(cell, currentX + 2, yPos + 5);
        currentX += colWidths[i];
      });
      yPos += 6;
    });

    // Total
    yPos += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(240, 240, 240);
    doc.rect(xPos, yPos, colWidths.reduce((a, b) => a + b, 0), 8, 'F');
    const totalRow = ['TOTAL', '', totalAppele.toFixed(2) + ' €', totalPaye.toFixed(2) + ' €', totalReste.toFixed(2) + ' €', ''];
    currentX = xPos;
    totalRow.forEach((cell, i) => {
      doc.text(cell, currentX + 2, yPos + 6);
      currentX += colWidths[i];
    });

    doc.save(`appel_fonds_${selectedAppel.id}_${new Date().toISOString().split('T')[0]}.pdf`);
  }, [selectedAppel, coproprietaires]);

  // Loading state
  const isLoading = isLoadingCalls || isLoadingLines;

  return {
    // Campaigns
    campaigns,
    selectedCampaignId,
    setSelectedCampaignId,
    isLoadingCampaigns,
    refreshCampaigns,

    // État - from Supabase
    appels,
    groupedAppels,
    setAppels: refreshCalls, // No-op setter, use refreshCalls instead
    filteredAppels,
    selectedAppel,
    coproprietaires,
    filteredCoproprietaires,
    sendingInProgress,
    stats,

    // Loading states
    isLoading,
    isLoadingCalls,
    isLoadingLines,
    refreshCalls,
    refreshLines,

    // Alertes de délais
    alertes,
    statsAlertes,

    // Filtres principaux
    searchTerm,
    setSearchTerm,
    statutFilter,
    setStatutFilter,
    typeFilter,
    setTypeFilter,

    // États modals
    showGestionModal,
    setShowGestionModal,
    showMontantModal,
    setShowMontantModal,
    showNewAppelModal,
    setShowNewAppelModal,
    showDetailModal,
    setShowDetailModal,
    showEditModal,
    showPaiementModal,
    showHistoriqueModal,
    showRelancesModal,
    showExportAvisModal,
    selectedCoproprietaire,

    // Filtres modal gestion
    searchCopro,
    setSearchCopro,
    paiementFilterModal,
    setPaiementFilterModal,
    recommandeFilterModal,
    setRecommandeFilterModal,

    // Formulaire
    newAppelForm,
    setNewAppelForm,
    repartitionKeys, // For dropdown in new appel form

    // Handlers
    handleGestionClick,
    handleMontantClick,
    handleModeEnvoiChange,
    handleEnvoyerAppel,
    handleEnvoyerTous,
    handleViewAppel,
    handleEditAppel,
    handleDeleteAppel,
    handleUpdateAppel,
    handleNewAppelSubmit,
    handleNewAppelCancel,
    handleCloseEditModal,

    // Handlers paiements
    handleEnregistrerPaiement,
    handleVoirHistoriquePaiements,
    handleSubmitPaiement,
    handleClosePaiementModal,
    handleCloseHistoriqueModal,
    getPaiementsForCoproprietaire,

    // Export
    exportToExcel,
    exportToPDF,

    // Alertes et calendrier
    handleAlerteAction,
    getDatesSuggereesForEcheance,

    // Relances et export avis
    handleVoirRelances,
    handleCloseRelancesModal,
    handleNouvelleRelance,
    handleVoirExportAvis,
    handleCloseExportAvisModal,

    // Mutation states
    isCreating: createCallMutation.isLoading,
    isRecordingPayment: recordPaymentMutation.isLoading,
  };
}

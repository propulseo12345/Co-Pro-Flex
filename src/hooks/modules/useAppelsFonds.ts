'use client';

import { useState, useMemo, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import type {
  AppelFonds,
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
import { MOCK_APPELS, MOCK_COPROPRIETAIRES_APPEL } from '@/components/features/finance/AppelsFonds/mock-data';
import {
  getDefaultNewAppelForm,
  calculerToutesAlertes,
  calculerStatsAlertes,
  genererDatesSuggerees
} from '@/components/features/finance/AppelsFonds/utils';

// Mock historique des paiements
const MOCK_PAIEMENTS_HISTORIQUE: Record<string, PaiementHistorique[]> = {
  '1': [
    { id: 'p1', montant: 1562.50, datePaiement: '2025-01-10', modePaiement: 'VIREMENT', reference: 'VIR-2025-001' }
  ],
  '2': [
    { id: 'p2', montant: 500, datePaiement: '2025-01-08', modePaiement: 'CHEQUE', reference: 'CHQ-12345' },
    { id: 'p3', montant: 300, datePaiement: '2025-01-12', modePaiement: 'VIREMENT', reference: 'VIR-2025-002' }
  ],
  '4': [
    { id: 'p4', montant: 1562.50, datePaiement: '2025-01-08', modePaiement: 'CHEQUE', reference: 'CHQ-67890' }
  ],
  '6': [
    { id: 'p5', montant: 1875.00, datePaiement: '2025-01-11', modePaiement: 'PRELEVEMENT' }
  ]
};

export function useAppelsFonds() {
  // État principal
  const [appels, setAppels] = useState<AppelFonds[]>(MOCK_APPELS);
  const [selectedAppel, setSelectedAppel] = useState<AppelFonds | null>(null);
  const [coproprietaires, setCoproprietaires] = useState<CoproprietaireAppel[]>(MOCK_COPROPRIETAIRES_APPEL);
  const [sendingInProgress, setSendingInProgress] = useState(false);

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

  // Historique des paiements (mock)
  const [paiementsHistorique, setPaiementsHistorique] = useState<Record<string, PaiementHistorique[]>>(MOCK_PAIEMENTS_HISTORIQUE);

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
    setSelectedAppel(appel);
    setCoproprietaires(MOCK_COPROPRIETAIRES_APPEL.map(c => ({ ...c, envoye: false })));
    setShowGestionModal(true);
  }, []);

  const handleMontantClick = useCallback((appel: AppelFonds) => {
    setSelectedAppel(appel);
    setCoproprietaires(MOCK_COPROPRIETAIRES_APPEL);
    setShowMontantModal(true);
  }, []);

  const handleModeEnvoiChange = useCallback((coproId: string, mode: ModeEnvoi) => {
    setCoproprietaires(prev =>
      prev.map(c => c.id === coproId ? { ...c, modeEnvoiValide: mode } : c)
    );
  }, []);

  const handleEnvoyerAppel = useCallback(async (coproId: string) => {
    const copro = coproprietaires.find(c => c.id === coproId);
    if (!copro || !copro.modeEnvoiValide) return;

    setSendingInProgress(true);

    setTimeout(() => {
      setCoproprietaires(prev =>
        prev.map(c => c.id === coproId ? { ...c, envoye: true } : c)
      );
      setSendingInProgress(false);
    }, 1500);
  }, [coproprietaires]);

  const handleEnvoyerTous = useCallback(async () => {
    setSendingInProgress(true);

    setTimeout(() => {
      setCoproprietaires(prev =>
        prev.map(c => ({ ...c, envoye: true, modeEnvoiValide: c.modeEnvoiValide || c.modeEnvoiRecommande }))
      );
      setSendingInProgress(false);

      if (selectedAppel) {
        setAppels(prev =>
          prev.map(a => a.id === selectedAppel.id ? { ...a, statut: 'ENVOYE' as StatutAppel } : a)
        );
      }
    }, 2000);
  }, [selectedAppel]);

  const handleViewAppel = useCallback((appel: AppelFonds) => {
    setSelectedAppel(appel);
    setShowDetailModal(true);
  }, []);

  const handleEditAppel = useCallback((appel: AppelFonds) => {
    setSelectedAppel(appel);
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

  const handleDeleteAppel = useCallback((appel: AppelFonds) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer l'appel de fonds "${appel.description}" ?`)) {
      setAppels(prev => prev.filter(a => a.id !== appel.id));
    }
  }, []);

  const handleUpdateAppel = useCallback(() => {
    if (!selectedAppel) return;

    if (!newAppelForm.description || !newAppelForm.periode || !newAppelForm.dateExigibilite || !newAppelForm.dateEmission || !newAppelForm.dateLimiteReglement || !newAppelForm.montantTotal) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const updatedAppel: AppelFonds = {
      ...selectedAppel,
      description: newAppelForm.description,
      periode: newAppelForm.periode,
      dateExigibilite: newAppelForm.dateExigibilite,
      dateEmission: newAppelForm.dateEmission,
      dateLimiteReglement: newAppelForm.dateLimiteReglement,
      type: newAppelForm.type,
      montantTotal: parseFloat(newAppelForm.montantTotal),
      cleRepartitionId: newAppelForm.cleRepartitionId || undefined,
      ...(newAppelForm.type === 'travaux' && {
        budgetTravauxId: newAppelForm.budgetTravauxId,
        projetNom: newAppelForm.projetNom
      })
    };

    setAppels(prev => prev.map(a => a.id === selectedAppel.id ? updatedAppel : a));
    setNewAppelForm(getDefaultNewAppelForm());
    setShowEditModal(false);
    setSelectedAppel(null);
  }, [selectedAppel, newAppelForm]);

  const handleNewAppelSubmit = useCallback(() => {
    if (!newAppelForm.description || !newAppelForm.periode || !newAppelForm.dateExigibilite || !newAppelForm.dateEmission || !newAppelForm.dateLimiteReglement || !newAppelForm.montantTotal) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const newAppel: AppelFonds = {
      id: String(appels.length + 1),
      dateExigibilite: newAppelForm.dateExigibilite,
      dateEmission: newAppelForm.dateEmission,
      dateLimiteReglement: newAppelForm.dateLimiteReglement,
      statut: 'A_GENERER',
      montantTotal: parseFloat(newAppelForm.montantTotal),
      montantEncaisse: 0,
      description: newAppelForm.description,
      periode: newAppelForm.periode,
      type: newAppelForm.type,
      cleRepartitionId: newAppelForm.cleRepartitionId || undefined,
      historiqueRelances: [],
      ...(newAppelForm.type === 'travaux' && {
        budgetTravauxId: newAppelForm.budgetTravauxId,
        projetNom: newAppelForm.projetNom
      })
    };

    setAppels([newAppel, ...appels]);
    setNewAppelForm(getDefaultNewAppelForm());
    setShowNewAppelModal(false);
  }, [appels, newAppelForm]);

  const handleNewAppelCancel = useCallback(() => {
    setShowNewAppelModal(false);
    setNewAppelForm(getDefaultNewAppelForm());
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setShowEditModal(false);
    setSelectedAppel(null);
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

  const handleSubmitPaiement = useCallback((coproId: string, paiement: NouveauPaiement) => {
    // Créer le nouveau paiement dans l'historique
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

    // Mettre à jour le copropriétaire
    setCoproprietaires(prev => prev.map(c => {
      if (c.id !== coproId) return c;

      const nouveauMontantPaye = (c.paiement?.montantPaye || 0) + paiement.montant;
      const resteADu = c.montantIndividuel - nouveauMontantPaye;

      let nouveauStatut: StatutPaiement = 'NON_PAYE';
      if (resteADu <= 0) {
        nouveauStatut = 'PAYE';
      } else if (nouveauMontantPaye > 0) {
        nouveauStatut = 'PARTIELLEMENT_PAYE';
      }

      return {
        ...c,
        paiement: {
          montantDu: c.montantIndividuel,
          montantPaye: nouveauMontantPaye,
          statutPaiement: nouveauStatut,
          datePaiement: paiement.datePaiement,
          modePaiement: paiement.modePaiement as 'VIREMENT' | 'CHEQUE' | 'PRELEVEMENT' | 'ESPECES',
        }
      };
    }));

    // Recalculer le montant encaissé de l'appel
    if (selectedAppel) {
      const totalEncaisse = coproprietaires.reduce((sum, c) => {
        if (c.id === coproId) {
          return sum + (c.paiement?.montantPaye || 0) + paiement.montant;
        }
        return sum + (c.paiement?.montantPaye || 0);
      }, 0);

      setAppels(prev => prev.map(a =>
        a.id === selectedAppel.id ? { ...a, montantEncaisse: totalEncaisse } : a
      ));
    }

    setShowPaiementModal(false);
    setSelectedCoproprietaire(null);
  }, [coproprietaires, selectedAppel]);

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
    setSelectedAppel(appel);
    setShowRelancesModal(true);
  }, []);

  const handleCloseRelancesModal = useCallback(() => {
    setShowRelancesModal(false);
    setSelectedAppel(null);
  }, []);

  const handleNouvelleRelance = useCallback((relance: Omit<RelanceAppel, 'id'>) => {
    if (!selectedAppel) return;

    const nouvelleRelance: RelanceAppel = {
      ...relance,
      id: `rel-${Date.now()}`,
    };

    setAppels(prev => prev.map(a => {
      if (a.id !== selectedAppel.id) return a;
      return {
        ...a,
        historiqueRelances: [...(a.historiqueRelances || []), nouvelleRelance]
      };
    }));

    // Mettre à jour l'appel sélectionné pour rafraîchir le modal
    setSelectedAppel(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        historiqueRelances: [...(prev.historiqueRelances || []), nouvelleRelance]
      };
    });
  }, [selectedAppel]);

  const handleVoirExportAvis = useCallback((appel: AppelFonds) => {
    setSelectedAppel(appel);
    setCoproprietaires(MOCK_COPROPRIETAIRES_APPEL);
    setShowExportAvisModal(true);
  }, []);

  const handleCloseExportAvisModal = useCallback(() => {
    setShowExportAvisModal(false);
    setSelectedAppel(null);
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

    const headers = ['Copropriétaire', 'Lot', 'Tantièmes', 'Montant appelé', 'Montant payé', 'Reste à devoir', 'Statut'];
    const rows = coproprietaires.map(copro => {
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
    const totalAppele = coproprietaires.reduce((sum, c) => sum + c.montantIndividuel, 0);
    const totalPaye = coproprietaires.reduce((sum, c) => sum + (c.paiement?.montantPaye || 0), 0);
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
    const totalAppele = coproprietaires.reduce((sum, c) => sum + c.montantIndividuel, 0);
    const totalPaye = coproprietaires.reduce((sum, c) => sum + (c.paiement?.montantPaye || 0), 0);
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
    coproprietaires.forEach(copro => {
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

  return {
    // État
    appels,
    setAppels,
    filteredAppels,
    selectedAppel,
    coproprietaires,
    filteredCoproprietaires,
    sendingInProgress,
    stats,

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
  };
}

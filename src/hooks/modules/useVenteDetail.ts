'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import type {
  Vente,
  VenteDocument,
  HistoriqueItem,
  OrdreService,
  ToastState,
  ActiveTab
} from '@/components/features/ventes/VenteDetail/types';
import {
  INITIAL_VENTE,
  MOCK_DOCUMENTS,
  INITIAL_HISTORIQUE,
  MOCK_ORDRES_SERVICE,
  WORKFLOW_STEPS
} from '@/components/features/ventes/VenteDetail/constants';
import { getWorkflowStepLabel } from '@/components/features/ventes/VenteDetail/utils';
import { generateVentePDF } from '@/lib/pdf/generateVentePDF';
import { useVentesContext } from '@/providers/VentesProvider';
import type { VenteEtapeWorkflow } from '@/types/models/vente';

interface UseVenteDetailOptions {
  venteId: string;
}

// Mapping des statuts local -> global
const mapStatutToGlobal = (statut: Vente['statut']): 'EN_COURS' | 'TERMINEE' | 'ANNULEE' => {
  switch (statut) {
    case 'en_cours': return 'EN_COURS';
    case 'finalise': return 'TERMINEE';
    case 'annule': return 'ANNULEE';
    default: return 'EN_COURS';
  }
};

export function useVenteDetail({ venteId }: UseVenteDetailOptions) {
  // Hook global pour synchronisation
  const globalContext = useVentesContext();

  // État principal
  const [vente, setVente] = useState<Vente>(() => {
    // Essayer de charger depuis le contexte global
    const globalVente = globalContext.getVenteById(venteId);
    if (globalVente) {
      // Adapter les données globales au format local
      // Extraire nom et prénom depuis une chaîne "Prénom NOM" ou "NOM Prénom"
      const parseNomComplet = (nomComplet: string | undefined) => {
        if (!nomComplet) return { nom: '', prenom: '' };
        const parts = nomComplet.trim().split(/\s+/);
        if (parts.length === 1) return { nom: parts[0], prenom: '' };
        // Convention: le dernier mot en majuscule est le nom de famille
        const nomIndex = parts.findIndex(p => p === p.toUpperCase() && p.length > 1);
        if (nomIndex >= 0) {
          const nom = parts[nomIndex];
          const prenom = parts.filter((_, i) => i !== nomIndex).join(' ');
          return { nom, prenom };
        }
        // Par défaut: premier = prénom, reste = nom
        return { nom: parts.slice(1).join(' '), prenom: parts[0] };
      };

      const vendeurParsed = parseNomComplet(globalVente.vendeur);
      const acquereurParsed = parseNomComplet(globalVente.acquereur);
      const notaireParsed = parseNomComplet(globalVente.notaire);

      return {
        ...INITIAL_VENTE,
        id: parseInt(globalVente.id) || INITIAL_VENTE.id,
        lotId: globalVente.lotIds.join(', ') || INITIAL_VENTE.lotId,
        lotType: globalVente.lotTypes[0]?.toLowerCase() as Vente['lotType'] || INITIAL_VENTE.lotType,
        statut: globalVente.statut === 'TERMINEE' ? 'finalise' : globalVente.statut === 'ANNULEE' ? 'annule' : 'en_cours',
        etapeWorkflow: globalVente.etapeWorkflow,
        vendeur: {
          nom: vendeurParsed.nom,
          prenom: vendeurParsed.prenom,
          email: INITIAL_VENTE.vendeur.email,
          telephone: INITIAL_VENTE.vendeur.telephone,
          impayes: 0
        },
        acquereur: {
          nom: acquereurParsed.nom,
          prenom: acquereurParsed.prenom,
          email: INITIAL_VENTE.acquereur.email,
          telephone: INITIAL_VENTE.acquereur.telephone
        },
        notaire: {
          nom: notaireParsed.nom,
          prenom: notaireParsed.prenom,
          email: INITIAL_VENTE.notaire.email,
          telephone: INITIAL_VENTE.notaire.telephone
        },
        dateCompromis: globalVente.dateCompromis || INITIAL_VENTE.dateCompromis,
        observations: globalVente.observations || '',
      };
    }
    return INITIAL_VENTE;
  });
  const [documents, setDocuments] = useState<VenteDocument[]>(MOCK_DOCUMENTS);
  const [historique, setHistorique] = useState<HistoriqueItem[]>(INITIAL_HISTORIQUE);
  const [activeTab, setActiveTab] = useState<ActiveTab>('workflow');

  // État des modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLinkOSModal, setShowLinkOSModal] = useState(false);
  const [showWorkflowModal, setShowWorkflowModal] = useState<string | null>(null);
  const [showSignModal, setShowSignModal] = useState(false);
  const [showSendNotaireModal, setShowSendNotaireModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<VenteDocument | null>(null);

  // État de traitement
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Données calculées
  const linkedOrdresService = useMemo(
    () => MOCK_ORDRES_SERVICE.filter(os => vente.ordresServiceIds.includes(os.id)),
    [vente.ordresServiceIds]
  );

  // Actions toast
  const showToast = useCallback((message: string, type: ToastState['type']) => {
    setToast({ message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  // Actions workflow
  const advanceWorkflow = useCallback(async (nextStep: string) => {
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const now = new Date().toISOString();

    // Mise à jour locale
    setVente(prev => ({
      ...prev,
      etapeWorkflow: nextStep as Vente['etapeWorkflow'],
      statut: nextStep === 'notification' ? 'finalise' : prev.statut,
      dateNotificationArt6: nextStep === 'notification' ? now : prev.dateNotificationArt6
    }));

    // Synchronisation avec le contexte global
    globalContext.advanceWorkflow(venteId, nextStep as VenteEtapeWorkflow);

    const stepLabel = getWorkflowStepLabel(nextStep);
    setHistorique(prev => [{
      id: Date.now(),
      type: 'workflow',
      description: `Passage à l'étape : ${stepLabel}`,
      date: now,
      auteur: 'Syndic - Jean MARTIN'
    }, ...prev]);

    setIsProcessing(false);
    setShowWorkflowModal(null);
    showToast(`Étape "${stepLabel}" validée avec succès`, 'success');
  }, [showToast, globalContext, venteId]);

  // Interface pour les infos du signataire
  interface SignataireInfo {
    nom: string;
    prenom: string;
    role: string;
    lieuSignature: string;
  }

  // Actions documents
  const handleSignDocument = useCallback((
    doc: VenteDocument,
    signatureData?: string,
    signataire?: SignataireInfo
  ) => {
    const now = new Date().toISOString();
    const signePar = signataire
      ? `${signataire.role} - ${signataire.prenom} ${signataire.nom}`
      : 'Syndic - Jean MARTIN';

    setDocuments(prev => prev.map(d =>
      d.id === doc.id
        ? {
            ...d,
            statut: 'signe' as const,
            dateSignature: now,
            signePar,
            signatureData: signatureData || undefined,
            signataireRole: signataire?.role || 'Syndic',
            lieuSignature: signataire?.lieuSignature || 'Paris'
          }
        : d
    ));

    setHistorique(prev => [{
      id: Date.now(),
      type: 'signature',
      description: `Signature du document : ${doc.nom}`,
      date: now,
      auteur: signePar
    }, ...prev]);

    setShowSignModal(false);
    setSelectedDoc(null);
    showToast(`Document "${doc.nom}" signé avec succès`, 'success');
  }, [showToast]);

  const openSignModal = useCallback((doc: VenteDocument) => {
    setSelectedDoc(doc);
    setShowSignModal(true);
  }, []);

  const closeSignModal = useCallback(() => {
    setShowSignModal(false);
    setSelectedDoc(null);
  }, []);

  // Actions vente
  const handleSaveVente = useCallback((data: Partial<Vente>) => {
    setVente(prev => ({ ...prev, ...data }));

    // Synchroniser avec le contexte global
    const globalUpdate: Record<string, unknown> = {};
    if (data.observations !== undefined) globalUpdate.observations = data.observations;
    if (data.statut !== undefined) globalUpdate.statut = mapStatutToGlobal(data.statut);
    if (data.etapeWorkflow !== undefined) globalUpdate.etapeWorkflow = data.etapeWorkflow;

    if (Object.keys(globalUpdate).length > 0) {
      globalContext.updateVente(venteId, globalUpdate);
    }

    const now = new Date().toISOString();
    setHistorique(prev => [{
      id: Date.now(),
      type: 'modification',
      description: 'Modification des informations de la vente',
      date: now,
      auteur: 'Syndic - Jean MARTIN'
    }, ...prev]);

    showToast('Modifications enregistrées avec succès', 'success');
  }, [showToast, globalContext, venteId]);

  // Actions ordres de service
  const handleLinkOS = useCallback((ids: string[]) => {
    setVente(prev => ({ ...prev, ordresServiceIds: ids }));

    const now = new Date().toISOString();
    setHistorique(prev => [{
      id: Date.now(),
      type: 'modification',
      description: `Mise à jour des ordres de service liés (${ids.length})`,
      date: now,
      auteur: 'Syndic - Jean MARTIN'
    }, ...prev]);

    showToast(`${ids.length} ordre(s) de service lié(s)`, 'success');
  }, [showToast]);

  // Actions PDF
  const handleExportPDF = useCallback(() => {
    const doc = generateVentePDF({
      vente,
      documents,
      historique,
      linkedOrdresService
    });
    const fileName = `vente_${vente.lotId.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    showToast('Fiche PDF générée avec succès', 'success');
  }, [vente, documents, historique, linkedOrdresService, showToast]);

  // Interface pour les données d'envoi au notaire
  interface EnvoiNotaireData {
    notaire: { nom: string; prenom?: string; email: string; telephone: string };
    documents: VenteDocument[];
    message: string;
    includeAllDocuments: boolean;
  }

  // Actions envoi au notaire
  const handleSendToNotaire = useCallback(async (data: EnvoiNotaireData): Promise<void> => {
    // Simuler l'envoi (en attendant l'intégration API)
    await new Promise(resolve => setTimeout(resolve, 2000));

    const now = new Date().toISOString();
    const documentNames = data.documents.map(d => d.nom).join(', ');
    const notaireName = `Me. ${data.notaire.prenom || ''} ${data.notaire.nom}`.trim();

    // Mettre à jour le statut des documents envoyés
    setDocuments(prev => prev.map(doc => {
      const wasIncluded = data.documents.some(d => d.id === doc.id);
      if (wasIncluded && doc.statut === 'signe') {
        return { ...doc, statut: 'signe' as const }; // On garde le statut signé
      }
      return doc;
    }));

    // Ajouter à l'historique
    setHistorique(prev => [{
      id: Date.now(),
      type: 'envoi' as const,
      description: `Envoi au notaire ${notaireName} : ${data.documents.length} document(s) - ${documentNames}`,
      date: now,
      auteur: 'Syndic - Jean MARTIN'
    }, ...prev]);

    // Note: En production, ici on appellerait l'API d'envoi d'email
    // await sendEmailToNotaire({
    //   to: data.notaire.email,
    //   subject: `Documents de vente - Lot ${vente.lotId}`,
    //   body: data.message,
    //   attachments: data.documents.map(d => d.url)
    // });

  }, []);

  // Actions workflow modal
  const openWorkflowModal = useCallback((step: string) => {
    setShowWorkflowModal(step);
  }, []);

  const closeWorkflowModal = useCallback(() => {
    setShowWorkflowModal(null);
  }, []);

  return {
    // État
    vente,
    documents,
    historique,
    activeTab,
    linkedOrdresService,
    allOrdresService: MOCK_ORDRES_SERVICE,

    // État modals
    showEditModal,
    showLinkOSModal,
    showWorkflowModal,
    showSignModal,
    showSendNotaireModal,
    selectedDoc,

    // État traitement
    isProcessing,
    toast,

    // Actions tabs
    setActiveTab,

    // Actions toast
    showToast,
    hideToast,

    // Actions modals
    setShowEditModal,
    setShowLinkOSModal,
    openWorkflowModal,
    closeWorkflowModal,
    openSignModal,
    closeSignModal,
    setShowSendNotaireModal,

    // Actions métier
    advanceWorkflow,
    handleSignDocument,
    handleSaveVente,
    handleLinkOS,
    handleExportPDF,
    handleSendToNotaire,
  };
}

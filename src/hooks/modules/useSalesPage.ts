import { useState, useCallback } from 'react';
import type { Sale, SaleDocument, DocumentType, DocumentStatut } from '@/types';
import { useVentesContext } from '@/providers/VentesProvider';

export interface NewSaleForm {
  lotIds: string[];
  lotTypes: string[];
  vendeurId: string;
  acquereur: string;
  notaire: string;
  dateCompromis: string;
  dateActeAuthentique: string;
  observations: string;
}

const INITIAL_NEW_SALE: NewSaleForm = {
  lotIds: [],
  lotTypes: [],
  vendeurId: '',
  acquereur: '',
  notaire: '',
  dateCompromis: '',
  dateActeAuthentique: '',
  observations: ''
};

export const MOCK_LOTS = [
  { id: 'A1', type: 'Appartement', coproprietaire: 'Marie LEBLANC' },
  { id: 'A2', type: 'Appartement', coproprietaire: 'Pierre MOREAU' },
  { id: 'B3', type: 'Appartement', coproprietaire: 'Sophie LAURENT' },
  { id: 'B4', type: 'Appartement', coproprietaire: 'Jean MARTIN' },
  { id: 'C5', type: 'Appartement', coproprietaire: 'Isabelle DUBOIS' },
  { id: 'Cave1', type: 'Cave', coproprietaire: 'Marie LEBLANC' },
  { id: 'Parking1', type: 'Parking', coproprietaire: 'Pierre MOREAU' },
];

export const DOCUMENT_NAMES: Record<DocumentType, string> = {
  'PRE_ETAT_DATE': 'Pré-état daté',
  'ETAT_DATE': 'État daté',
  'CERTIFICAT_ARTICLE_20': 'Certificat article 20-II',
  'DIAGNOSTIC': 'Diagnostic',
  'PV_AG': 'PV AG',
  'REGLEMENT': 'Règlement intérieur',
  'CARNET_ENTRETIEN': 'Carnet d\'entretien',
  'COMPROMIS': 'Compromis de vente',
  'AUTRE': 'Autre document'
};

export const STATUS_LABELS: Record<DocumentStatut, string> = {
  'DISPONIBLE': 'Disponible',
  'EN_ATTENTE': 'En attente de signature',
  'SIGNE': 'Signé',
  'ENVOYE': 'Envoyé au notaire',
  'EXPIRE': 'Expiré'
};

export function useSalesPage() {
  // Try to load from VentesContext (Supabase)
  let contextVentes: Sale[] = [];
  try {
    const ventesCtx = useVentesContext();
    contextVentes = ventesCtx.ventes.map(v => ({
      id: v.id,
      lotIds: v.lotIds,
      lotTypes: v.lotTypes,
      vendeur: v.vendeur,
      vendeurId: v.vendeurId || '',
      acquereur: v.acquereur,
      notaire: v.notaire,
      dateCompromis: v.dateCompromis,
      dateActeAuthentique: v.dateActeAuthentique,
      statut: v.statut,
      documents: v.documents.map(d => ({
        id: d.id || '',
        nom: d.nom || '',
        type: d.type as DocumentType,
        dateUpload: d.dateUpload || '',
        statut: (d.statut || 'DISPONIBLE') as DocumentStatut,
        url: '',
      })),
      historique: v.historique.map(h => ({
        id: h.id || '',
        date: h.date || '',
        action: h.action || '',
        utilisateur: h.utilisateur || '',
      })),
      observations: v.observations,
      dateCreation: v.dateCreation || '',
      dateModification: v.dateModification || '',
    }));
  } catch {
    // Not within VentesProvider - use mock data
    contextVentes = [];
  }

  const initialSales = contextVentes.length > 0 ? contextVentes : [] as Sale[];
  const [sales, setSales] = useState<Sale[]>(initialSales);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(sales[0] || null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [newSale, setNewSale] = useState<NewSaleForm>(INITIAL_NEW_SALE);

  const filteredSales = sales.filter(sale => {
    const matchesStatus = filterStatus === 'all' || sale.statut === filterStatus;
    const matchesSearch = searchTerm === '' ||
      sale.vendeur.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.acquereur?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.lotIds.some(lot => lot.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const handleCreateSale = useCallback(() => {
    if (!newSale.vendeurId || newSale.lotIds.length === 0) {
      alert('Veuillez remplir les champs obligatoires');
      return;
    }

    const vendeur = { nom: newSale.vendeurId }; // TODO: Lookup from Supabase
    const newSaleData: Sale = {
      id: 'sale-' + Date.now(),
      lotIds: newSale.lotIds,
      lotTypes: newSale.lotTypes,
      vendeur: vendeur?.nom || '',
      vendeurId: newSale.vendeurId,
      acquereur: newSale.acquereur,
      notaire: newSale.notaire,
      dateCompromis: newSale.dateCompromis,
      dateActeAuthentique: newSale.dateActeAuthentique,
      statut: 'EN_COURS',
      documents: [],
      historique: [{
        id: 'hist-1',
        date: new Date().toISOString(),
        action: 'Création de la vente',
        utilisateur: 'Syndic'
      }],
      observations: newSale.observations,
      dateCreation: new Date().toISOString(),
      dateModification: new Date().toISOString()
    };

    setSales(prev => [...prev, newSaleData]);
    setSelectedSale(newSaleData);
    setShowCreateModal(false);
    setNewSale(INITIAL_NEW_SALE);
  }, [newSale]);

  const generateDocument = useCallback((type: DocumentType) => {
    if (!selectedSale) return;

    const newDoc: SaleDocument = {
      id: 'doc-' + Date.now(),
      nom: DOCUMENT_NAMES[type],
      type,
      dateUpload: new Date().toISOString(),
      statut: type === 'ETAT_DATE' || type === 'CERTIFICAT_ARTICLE_20' ? 'EN_ATTENTE' : 'DISPONIBLE',
      url: '#'
    };

    const updatedSale = {
      ...selectedSale,
      documents: [...selectedSale.documents, newDoc],
      historique: [...selectedSale.historique, {
        id: 'hist-' + Date.now(),
        date: new Date().toISOString(),
        action: `Génération du document: ${DOCUMENT_NAMES[type]}`,
        utilisateur: 'Système'
      }]
    };

    setSelectedSale(updatedSale);
    setSales(prev => prev.map(s => s.id === selectedSale.id ? updatedSale : s));
  }, [selectedSale]);

  const signDocument = useCallback((docId: string) => {
    if (!selectedSale) return;

    const updatedSale = {
      ...selectedSale,
      documents: selectedSale.documents.map(doc =>
        doc.id === docId
          ? { ...doc, statut: 'SIGNE' as DocumentStatut, dateSignature: new Date().toISOString(), signePar: 'Syndic' }
          : doc
      ),
      historique: [...selectedSale.historique, {
        id: 'hist-' + Date.now(),
        date: new Date().toISOString(),
        action: `Signature du document: ${selectedSale.documents.find(d => d.id === docId)?.nom}`,
        utilisateur: 'Syndic'
      }]
    };

    setSelectedSale(updatedSale);
    setSales(prev => prev.map(s => s.id === selectedSale.id ? updatedSale : s));
  }, [selectedSale]);

  const sendToNotaire = useCallback(() => {
    if (!selectedSale) return;

    const updatedSale = {
      ...selectedSale,
      documents: selectedSale.documents.map(doc =>
        doc.statut === 'SIGNE' ? { ...doc, statut: 'ENVOYE' as DocumentStatut, dateEnvoi: new Date().toISOString() } : doc
      ),
      historique: [...selectedSale.historique, {
        id: 'hist-' + Date.now(),
        date: new Date().toISOString(),
        action: 'Envoi des documents au notaire',
        utilisateur: 'Syndic'
      }]
    };

    setSelectedSale(updatedSale);
    setSales(prev => prev.map(s => s.id === selectedSale.id ? updatedSale : s));
    alert('Documents envoyés au notaire avec succès');
  }, [selectedSale]);

  const updateNotificationDate = useCallback((date: string) => {
    if (!selectedSale) return;

    const updatedSale = {
      ...selectedSale,
      dateNotificationArticle6: date,
      historique: [...selectedSale.historique, {
        id: 'hist-' + Date.now(),
        date: new Date().toISOString(),
        action: 'Réception notification article 6',
        utilisateur: 'Syndic'
      }]
    };

    setSelectedSale(updatedSale);
    setSales(prev => prev.map(s => s.id === selectedSale.id ? updatedSale : s));
  }, [selectedSale]);

  const getMissingDocuments = useCallback((sale: Sale) => {
    const required: DocumentType[] = ['PRE_ETAT_DATE', 'ETAT_DATE', 'CERTIFICAT_ARTICLE_20'];
    const existing = sale.documents.map(d => d.type);
    return required.filter(type => !existing.includes(type));
  }, []);

  return {
    sales,
    filteredSales,
    selectedSale,
    setSelectedSale,
    showCreateModal,
    setShowCreateModal,
    showHistoryModal,
    setShowHistoryModal,
    filterStatus,
    setFilterStatus,
    searchTerm,
    setSearchTerm,
    newSale,
    setNewSale,
    handleCreateSale,
    generateDocument,
    signDocument,
    sendToNotaire,
    updateNotificationDate,
    getMissingDocuments,
  };
}

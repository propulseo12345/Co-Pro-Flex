'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useContracts, useProviders, useLogbook } from '@/hooks/modules/useMaintenanceData';
import type {
  ContractOverview,
  Contract,
  ProviderOverview,
  LogbookOverview,
  ContractType,
} from '@/types/supabase';

// Contract type labels - must match all values from ContractType enum
const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  maintenance: 'Maintenance',
  ascenseur: 'Ascenseur',
  chauffage: 'Chauffage',
  nettoyage: 'Nettoyage',
  menage: 'Ménage',
  espaces_verts: 'Espaces verts',
  securite: 'Sécurité',
  assurance: 'Assurance',
  syndic: 'Syndic',
  eau: 'Eau',
  electricite: 'Électricité',
  toiture: 'Toiture',
  facade: 'Façade',
  interphone: 'Interphone',
  portail: 'Portail',
  juridique: 'Juridique',
  autre: 'Autre',
};

export function getJoursAvantEcheance(dateFin: string | null): number {
  if (!dateFin) return 999;
  const today = new Date();
  const echeance = new Date(dateFin);
  const diffTime = echeance.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export interface DocumentContrat {
  id: string;
  nom: string;
  type: 'CONTRAT_PDF' | 'AVENANT' | 'FACTURE' | 'ATTESTATION' | 'AUTRE';
  url: string;
  dateUpload: string;
}

export const ATTACHMENT_TYPES: { value: DocumentContrat['type']; label: string }[] = [
  { value: 'CONTRAT_PDF', label: 'Contrat PDF' },
  { value: 'AVENANT', label: 'Avenant' },
  { value: 'FACTURE', label: 'Facture' },
  { value: 'ATTESTATION', label: 'Attestation' },
  { value: 'AUTRE', label: 'Autre' }
];

export interface ContractEditForm {
  nom: string;
  numeroContrat: string;
  type: ContractType | '';
  prestataireId: string;
  description: string;
  dateDebut: string;
  dateFin: string;
  taciteReconduction: boolean;
  delaiResiliation: number;
  coutAnnuel: string;
}

export function useContractDetailPage(id: string) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromLogbook = searchParams.get('from') === 'logbook';

  // Supabase hooks
  const { contracts, updateContract, terminateContract, isLoading: contractsLoading } = useContracts();
  const { providers } = useProviders();
  const { entries: logbookEntries } = useLogbook();

  // Find the contract
  const contract = useMemo(() => contracts.find(c => c.id === id), [contracts, id]);

  // Find provider
  const provider = useMemo(() =>
    providers.find(p => p.id === contract?.provider_id),
    [providers, contract?.provider_id]
  );

  // Find related logbook entries
  const interventions = useMemo(() =>
    logbookEntries.filter(e => e.contract_id === id),
    [logbookEntries, id]
  );

  // Local state
  const [showResiliationModal, setShowResiliationModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [pieceJointes, setPieceJointes] = useState<DocumentContrat[]>([]);
  const [showAddAttachment, setShowAddAttachment] = useState(false);
  const [newAttachment, setNewAttachment] = useState({
    nom: '',
    type: 'AUTRE' as DocumentContrat['type'],
    fichier: null as File | null
  });

  // Edit form state
  const [editForm, setEditForm] = useState<ContractEditForm>({
    nom: '',
    numeroContrat: '',
    type: '',
    prestataireId: '',
    description: '',
    dateDebut: '',
    dateFin: '',
    taciteReconduction: true,
    delaiResiliation: 60,
    coutAnnuel: '',
  });

  // Initialize form when contract loads
  useEffect(() => {
    if (contract) {
      setEditForm({
        nom: contract.title ?? '',
        numeroContrat: contract.contract_number || '',
        type: contract.contract_type ?? '',
        prestataireId: contract.provider_id ?? '',
        description: contract.description || '', // Now available in view
        dateDebut: contract.start_date ?? '',
        dateFin: contract.end_date || '',
        taciteReconduction: contract.tacit_renewal ?? false,
        delaiResiliation: contract.notice_months ? contract.notice_months * 30 : 60,
        coutAnnuel: contract.annual_amount?.toString() || '',
      });
    }
  }, [contract]);

  // Calculated values
  const joursRestants = useMemo(() =>
    contract ? getJoursAvantEcheance(contract.end_date) : 0,
    [contract]
  );

  const delaiAlerte = contract?.notice_months ? contract.notice_months * 30 : 60;
  const alerteRenouvellement = joursRestants > 0 && joursRestants <= delaiAlerte + 30;
  const alerteUrgente = joursRestants > 0 && joursRestants <= delaiAlerte;

  const typeLabel = useMemo(() =>
    CONTRACT_TYPE_LABELS[contract?.contract_type as ContractType] || contract?.contract_type || '',
    [contract?.contract_type]
  );

  // Format currency
  const formatMontant = useCallback((montant: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(montant);
  }, []);

  // Handlers
  const handleCancelEdit = useCallback(() => {
    if (!contract) return;
    setEditForm({
      nom: contract.title ?? '',
      numeroContrat: contract.contract_number || '',
      type: contract.contract_type ?? '',
      prestataireId: contract.provider_id ?? '',
      description: contract.description || '', // Now available in view
      dateDebut: contract.start_date ?? '',
      dateFin: contract.end_date || '',
      taciteReconduction: contract.tacit_renewal ?? false,
      delaiResiliation: contract.notice_months ? contract.notice_months * 30 : 60,
      coutAnnuel: contract.annual_amount?.toString() || '',
    });
    setIsEditing(false);
  }, [contract]);

  const handleSaveEdit = useCallback(async () => {
    if (!contract || !contract.id || !editForm.nom || !editForm.type || !editForm.dateDebut || !editForm.coutAnnuel) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      await updateContract(contract.id, {
        title: editForm.nom,
        contract_number: editForm.numeroContrat || undefined,
        contract_type: editForm.type as ContractType,
        provider_id: editForm.prestataireId,
        description: editForm.description || undefined,
        start_date: editForm.dateDebut,
        end_date: editForm.dateFin || undefined,
        tacit_renewal: editForm.taciteReconduction,
        notice_months: Math.round(editForm.delaiResiliation / 30),
        annual_amount: parseFloat(editForm.coutAnnuel),
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating contract:', err);
      alert('Erreur lors de la mise à jour');
    }
  }, [contract, editForm, updateContract]);

  const handleTerminate = useCallback(async (reason: string) => {
    if (!contract || !contract.id) return;
    try {
      await terminateContract(contract.id, reason);
      setShowResiliationModal(false);
    } catch (err) {
      console.error('Error terminating contract:', err);
      alert('Erreur lors de la résiliation');
    }
  }, [contract, terminateContract]);

  const handleAddAttachment = useCallback(() => {
    if (!newAttachment.nom || !newAttachment.type) return;
    const newDoc: DocumentContrat = {
      id: `doc-${Date.now()}`,
      nom: newAttachment.nom,
      type: newAttachment.type,
      url: newAttachment.fichier?.name || `${newAttachment.nom.replace(/\s+/g, '_').toLowerCase()}.pdf`,
      dateUpload: new Date().toISOString().split('T')[0]
    };
    setPieceJointes(prev => [...prev, newDoc]);
    setNewAttachment({ nom: '', type: 'AUTRE', fichier: null });
    setShowAddAttachment(false);
  }, [newAttachment]);

  const handleDeleteAttachment = useCallback((docId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette pièce jointe ?')) {
      setPieceJointes(prev => prev.filter(d => d.id !== docId));
    }
  }, []);

  // Adapted legacy format for components
  const contratLegacy = useMemo(() => {
    if (!contract) return null;
    return {
      id: contract.id,
      nom: contract.title,
      numeroContrat: contract.contract_number,
      type: contract.contract_type,
      prestataireId: contract.provider_id,
      fournisseur: provider?.name || '',
      description: contract.description, // Now available in view
      dateDebut: contract.start_date,
      dateFin: contract.end_date,
      taciteReconduction: contract.tacit_renewal,
      delaiResiliation: contract.notice_months ? contract.notice_months * 30 : null,
      coutAnnuel: contract.annual_amount || 0,
      statut: contract.status,
      estReglementaire: contract.is_regulatory,
      pieceJointes: pieceJointes,
      interventionIds: interventions.map(i => i.id),
      fichierPDF: null as string | null,
    };
  }, [contract, provider, pieceJointes, interventions]);

  const prestataireLegacy = useMemo(() => {
    if (!provider) return undefined;
    // Map ProviderCategory (lowercase) to CategoriePrestataire (uppercase)
    const categorieMap: Record<string, 'SYNDIC' | 'COPROPRIETE' | 'COPROFLEX'> = {
      syndic: 'SYNDIC',
      copropriete: 'COPROPRIETE',
      coproflex: 'COPROFLEX',
    };
    // Now v_providers_overview includes all required fields
    return {
      id: provider.id,
      nom: provider.name,
      categorie: (provider.category ? categorieMap[provider.category] : null) || 'COPROPRIETE',
      domaines: (provider.domains || []) as unknown as string[],
      email: provider.email || '',
      telephone: provider.phone || '',
      telephoneUrgence: provider.phone_emergency,
      adresse: provider.address || '', // Now available in view
      codePostal: provider.postal_code, // Now available in view
      ville: provider.city,
      contactReferent: provider.contact_name,
      fonctionContact: provider.contact_role, // Now available in view
      dateAjout: provider.created_at || new Date().toISOString(),
      nombreInterventions: interventions.length,
    };
  }, [provider, interventions.length]);

  const interventionsLegacy = useMemo(() => {
    return interventions.map(i => ({
      id: i.id,
      titre: i.title,
      date: i.happened_at || i.created_at,
      statut: i.status,
      cout: i.cost,
    }));
  }, [interventions]);

  // All providers for edit dropdown
  const allPrestataires = useMemo(() =>
    providers.map(p => ({
      id: p.id,
      nom: p.name,
    })),
    [providers]
  );

  return {
    // Data
    contrat: contratLegacy,
    contract, // Raw Supabase contract
    prestataire: prestataireLegacy,
    provider, // Raw Supabase provider
    allPrestataires,
    interventions: interventionsLegacy,
    pieceJointes,

    // Calculated
    joursRestants,
    alerteRenouvellement,
    alerteUrgente,
    typeLabel,
    fromLogbook,

    // Loading
    isLoading: contractsLoading,

    // Edit state
    isEditing,
    editForm,

    // Modals
    showResiliationModal,
    showContactModal,
    showAddAttachment,
    newAttachment,

    // Formatters
    formatMontant,

    // Setters
    setIsEditing,
    setEditForm,
    setShowResiliationModal,
    setShowContactModal,
    setShowAddAttachment,
    setNewAttachment,

    // Handlers
    handleCancelEdit,
    handleSaveEdit,
    handleTerminate,
    handleAddAttachment,
    handleDeleteAttachment,
  };
}

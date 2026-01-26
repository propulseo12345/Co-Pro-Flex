import { FileText, FileCheck, Send, PenTool, Wallet, ClipboardCheck, Edit2, CheckCircle2 } from 'lucide-react';
import type { Vente, VenteDocument, HistoriqueItem, OrdreService, WorkflowStep } from './types';
import type { VenteValidationRule, VenteEtapeWorkflowV2 } from '@/types/models/vente-workflow';

// ============================================
// NOUVEAU WORKFLOW V2 (6 étapes obligatoires)
// ============================================

export const WORKFLOW_STEPS_V2: WorkflowStep[] = [
  {
    id: 'demande',
    label: 'Demande de mutation',
    labelCourt: 'Demande',
    description: 'Création et enregistrement de la vente',
    icon: ClipboardCheck,
    obligatoire: true,
    validations: [
      { id: 'vendeur', label: 'Vendeur identifié', type: 'champ', champPath: 'vendeur', required: true },
      { id: 'lots', label: 'Lots renseignés', type: 'champ', champPath: 'lotId', required: true },
    ]
  },
  {
    id: 'pre_etat_date',
    label: 'Pré-état daté',
    labelCourt: 'Pré-état daté',
    description: 'Document obligatoire - toujours requis',
    icon: FileText,
    obligatoire: true,
    validations: [
      { id: 'doc_pre_etat_genere', label: 'Pré-état daté généré', type: 'document', documentType: 'PRE_ETAT_DATE', required: true },
      { id: 'doc_pre_etat_signe', label: 'Pré-état daté signé', type: 'document', documentType: 'PRE_ETAT_DATE', documentStatutRequis: 'SIGNE', required: true },
    ]
  },
  {
    id: 'etat_date',
    label: 'État daté',
    labelCourt: 'État daté',
    description: 'État daté complet avec toutes les annexes',
    icon: FileCheck,
    obligatoire: true,
    validations: [
      { id: 'doc_etat_genere', label: 'État daté généré', type: 'document', documentType: 'ETAT_DATE', required: true },
      { id: 'doc_etat_signe', label: 'État daté signé', type: 'document', documentType: 'ETAT_DATE', documentStatutRequis: 'SIGNE', required: true },
      { id: 'doc_art20', label: 'Certificat Art. 20-II', type: 'document', documentType: 'CERTIFICAT_ARTICLE_20', required: true },
    ]
  },
  {
    id: 'envoi_notaire',
    label: 'Envoi au notaire',
    labelCourt: 'Envoi notaire',
    description: 'Transmission de tous les documents au notaire',
    icon: Send,
    obligatoire: true,
    validations: [
      { id: 'notaire_email', label: 'Email notaire renseigné', type: 'champ', champPath: 'notaire.email', required: true },
      { id: 'docs_envoyes', label: 'Documents transmis au notaire', type: 'action_manuelle', required: true },
    ]
  },
  {
    id: 'signature_acte',
    label: 'Signature de l\'acte',
    labelCourt: 'Signature acte',
    description: 'Date de signature de l\'acte authentique chez le notaire',
    icon: PenTool,
    obligatoire: true,
    validations: [
      { id: 'date_acte', label: 'Date acte authentique renseignée', type: 'champ', champPath: 'dateActeAuthentique', required: true },
    ]
  },
  {
    id: 'cloture_compte',
    label: 'Clôture compte vendeur',
    labelCourt: 'Clôture compte',
    description: 'Vérification du solde et clôture du compte',
    icon: Wallet,
    obligatoire: true,
    validations: [
      { id: 'solde_zero', label: 'Solde vendeur = 0 €', type: 'solde', required: true },
      { id: 'cloture_confirmee', label: 'Clôture confirmée manuellement', type: 'action_manuelle', required: true },
    ]
  },
];

// Ordre des étapes pour navigation V2
export const WORKFLOW_STEP_ORDER_V2: VenteEtapeWorkflowV2[] = [
  'demande',
  'pre_etat_date',
  'etat_date',
  'envoi_notaire',
  'signature_acte',
  'cloture_compte',
];

// ============================================
// ANCIEN WORKFLOW (4 étapes - rétrocompatibilité)
// ============================================

export const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: 'generation',
    label: 'Génération automatique',
    description: 'Documents générés automatiquement',
    icon: FileText
  },
  {
    id: 'signature',
    label: 'Signature',
    description: 'État daté et certificat Art. 20-II',
    icon: Edit2
  },
  {
    id: 'transmission',
    label: 'Transmission',
    description: 'Envoi au notaire',
    icon: Send
  },
  {
    id: 'notification',
    label: 'Notification Art. 6',
    description: 'Réception et transfert légal',
    icon: CheckCircle2
  }
];

// ============================================
// Mapping entre anciennes et nouvelles étapes
// ============================================

export const LEGACY_TO_V2_STEP_MAPPING: Record<string, VenteEtapeWorkflowV2> = {
  'creation': 'demande',
  'generation': 'pre_etat_date',
  'signature': 'etat_date',
  'transmission': 'envoi_notaire',
  'notification': 'signature_acte', // ou cloture_compte selon le contexte
};

export const MOCK_ORDRES_SERVICE: OrdreService[] = [
  { id: '1', titre: 'Réparation toiture - Lot 15', date: '2025-10-15', statut: 'CLOTURE', fournisseur: 'Toiture Express' },
  { id: '2', titre: 'Plomberie salle de bain - Lot 15', date: '2025-09-20', statut: 'INTERVENTION_REALISEE', fournisseur: 'Plomberie Martin' },
  { id: '3', titre: 'Électricité tableau - Lot 10', date: '2025-08-10', statut: 'CLOTURE', fournisseur: 'Elec Pro' },
  { id: '4', titre: 'Serrure porte cave - Lot 12', date: '2025-11-05', statut: 'EN_ATTENTE_PRESTATAIRE', fournisseur: 'Serrurerie 2000' },
  { id: '5', titre: 'Peinture parties communes', date: '2025-11-20', statut: 'BROUILLON', fournisseur: 'Peintures Pro' }
];

export const INITIAL_VENTE: Vente = {
  id: 1,
  lotId: 'Lot 15',
  lotType: 'appartement',
  statut: 'en_cours',
  vendeur: {
    nom: 'DUPONT',
    prenom: 'Martin',
    email: 'martin.dupont@example.com',
    telephone: '06 12 34 56 78',
    impayes: 0
  },
  acquereur: {
    nom: 'LEBLANC',
    prenom: 'Sophie',
    email: 'sophie.leblanc@example.com',
    telephone: '06 98 76 54 32'
  },
  notaire: {
    nom: 'BERNARD',
    prenom: 'François',
    email: 'bernard@notaire.fr',
    telephone: '01 23 45 67 89'
  },
  dateCompromis: '2025-11-15',
  dateActeAuthentique: '2026-01-20',
  dateCreation: '2025-11-10',
  dateNotificationArt6: null,
  etapeWorkflow: 'etat_date', // Utilisation du nouveau workflow V2
  observations: 'Vente urgente - Priorité haute',
  ordresServiceIds: ['1', '2'],
  notesInternes: 'Vérifier état des charges avant signature',
  // Nouveaux champs V2
  workflowV2: true,
  datesEtapes: {
    demande: '2025-11-10T10:00:00',
    pre_etat_date: '2025-11-11T09:15:00',
  },
  clotureCompte: {
    soldeActuel: 0,
    estCloturable: true,
    clotureManuelleFaite: false,
  },
};

export const MOCK_DOCUMENTS: VenteDocument[] = [
  {
    id: 1,
    type: 'pre_etat_date',
    nom: 'Pré-état daté',
    statut: 'signe',
    dateGeneration: '2025-11-10T14:30:00',
    dateSignature: '2025-11-11T09:15:00',
    signePar: 'Syndic - Jean MARTIN',
    obligatoire: true
  },
  {
    id: 2,
    type: 'etat_date',
    nom: 'État daté',
    statut: 'en_attente',
    dateGeneration: '2025-11-12T10:00:00',
    obligatoire: true
  },
  {
    id: 3,
    type: 'certificat_art20',
    nom: 'Certificat article 20-II',
    statut: 'en_attente',
    dateGeneration: '2025-11-12T10:05:00',
    obligatoire: true
  },
  {
    id: 4,
    type: 'compromis',
    nom: 'Compromis de vente signé',
    statut: 'disponible',
    dateGeneration: '2025-11-15T16:00:00',
    obligatoire: false
  },
  {
    id: 5,
    type: 'diagnostic',
    nom: 'Diagnostics techniques (DPE, Amiante, Plomb)',
    statut: 'en_attente',
    obligatoire: true
  }
];

export const INITIAL_HISTORIQUE: HistoriqueItem[] = [
  {
    id: 1,
    type: 'creation',
    description: 'Création de la vente pour le Lot 15',
    date: '2025-11-10T14:00:00',
    auteur: 'Syndic - Jean MARTIN'
  },
  {
    id: 2,
    type: 'generation_doc',
    description: 'Génération automatique : Pré-état daté, État daté, Certificat Art. 20-II',
    date: '2025-11-10T14:30:00',
    auteur: 'Système'
  },
  {
    id: 3,
    type: 'signature',
    description: 'Signature du Pré-état daté',
    date: '2025-11-11T09:15:00',
    auteur: 'Syndic - Jean MARTIN'
  },
  {
    id: 4,
    type: 'generation_doc',
    description: 'Upload : Compromis de vente signé',
    date: '2025-11-15T16:00:00',
    auteur: 'Syndic - Jean MARTIN'
  }
];

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  pre_etat_date: 'Pré-état daté',
  etat_date: 'État daté',
  certificat_art20: 'Certificat article 20-II',
  compromis: 'Compromis de vente',
  diagnostic: 'Diagnostics techniques',
  pv_ag: 'PV AG',
  autre: 'Autre document'
};

export const STATUT_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  disponible: { bg: '#dbeafe', color: '#1e40af', label: 'Disponible' },
  en_attente: { bg: '#fef3c7', color: '#92400e', label: 'En attente signature' },
  signe: { bg: '#d1fae5', color: '#065f46', label: 'Signé' },
  expire: { bg: '#fee2e2', color: '#991b1b', label: 'Expiré' }
};

export const OS_STATUT_COLORS: Record<string, { bg: string; color: string }> = {
  'BROUILLON': { bg: '#f1f5f9', color: '#64748b' },
  'ENVOYE': { bg: '#dbeafe', color: '#1e40af' },
  'EN_ATTENTE_PRESTATAIRE': { bg: '#fef3c7', color: '#92400e' },
  'INTERVENTION_PROGRAMMEE': { bg: '#e0e7ff', color: '#4f46e5' },
  'INTERVENTION_REALISEE': { bg: '#d1fae5', color: '#065f46' },
  'CLOTURE': { bg: '#f3f4f6', color: '#374151' }
};

export const OS_STATUT_LABELS: Record<string, string> = {
  'BROUILLON': 'Brouillon',
  'ENVOYE': 'Envoyé',
  'EN_ATTENTE_PRESTATAIRE': 'En attente',
  'INTERVENTION_PROGRAMMEE': 'Programmée',
  'INTERVENTION_REALISEE': 'Réalisée',
  'CLOTURE': 'Clôturé'
};

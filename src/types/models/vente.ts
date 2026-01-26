/**
 * Types unifiés pour le module Ventes
 * Basé sur Sale (legacy.ts) avec ajout de l'étape workflow
 */

import type {
  VenteEtapeWorkflowV2,
  ClotureCompteVendeur,
  ConfirmationFinalisation,
  DatesEtapesWorkflow
} from './vente-workflow';

// Types de documents
export type VenteDocumentType =
  | 'PRE_ETAT_DATE'
  | 'ETAT_DATE'
  | 'CERTIFICAT_ARTICLE_20'
  | 'DIAGNOSTIC'
  | 'PV_AG'
  | 'REGLEMENT'
  | 'CARNET_ENTRETIEN'
  | 'COMPROMIS'
  | 'AUTRE';

export type VenteDocumentStatut =
  | 'DISPONIBLE'
  | 'EN_ATTENTE'
  | 'SIGNE'
  | 'ENVOYE'
  | 'EXPIRE';

export type VenteStatut = 'EN_COURS' | 'TERMINEE' | 'ANNULEE';

// Anciennes étapes workflow (legacy - pour rétrocompatibilité)
export type VenteEtapeWorkflowLegacy =
  | 'creation'
  | 'generation'
  | 'signature'
  | 'transmission'
  | 'notification';

// Nouvelles étapes workflow V2 (6 étapes obligatoires)
export type VenteEtapeWorkflow = VenteEtapeWorkflowV2 | VenteEtapeWorkflowLegacy;

// Ré-export pour commodité
export type { VenteEtapeWorkflowV2 } from './vente-workflow';

// Document de vente
export interface VenteDocument {
  id: string;
  nom: string;
  type: VenteDocumentType;
  dateUpload: string;
  dateSignature?: string;
  dateEnvoi?: string;
  statut: VenteDocumentStatut;
  url: string;
  signePar?: string;
  observations?: string;
  obligatoire?: boolean;
}

// Historique de vente
export interface VenteHistorique {
  id: string;
  date: string;
  action: string;
  utilisateur: string;
  details?: string;
}

// Interface principale Vente
export interface Vente {
  id: string;
  lotIds: string[];
  lotTypes: string[];
  vendeur: string;
  vendeurId: string;
  acquereur?: string;
  acquereurId?: string;
  notaire?: string;
  notaireEmail?: string; // Email du notaire pour l'envoi
  dateCompromis?: string;
  dateActeAuthentique?: string;
  dateNotificationArticle6?: string;
  statut: VenteStatut;
  etapeWorkflow: VenteEtapeWorkflow;
  documents: VenteDocument[];
  historique: VenteHistorique[];
  observations?: string;
  liensOrdresService?: string[];
  dateCreation: string;
  dateModification: string;

  // Nouveaux champs pour le workflow V2
  /** Suivi de la clôture du compte vendeur */
  clotureCompte?: ClotureCompteVendeur;
  /** Dates de complétion de chaque étape */
  datesEtapes?: DatesEtapesWorkflow;
  /** Confirmation de finalisation (si forcée malgré étapes manquantes) */
  confirmationFinalisation?: ConfirmationFinalisation;
  /** Indique si la vente a été migrée vers le workflow V2 */
  workflowV2?: boolean;
  /** Indique si les documents ont été transmis au notaire */
  documentsTransmisNotaire?: boolean;
  /** Date de transmission au notaire */
  dateTransmissionNotaire?: string;
}

// Données pour création de vente
export interface CreateVenteData {
  lotIds: string[];
  lotTypes: string[];
  vendeur: string;
  vendeurId: string;
  acquereur?: string;
  acquereurId?: string;
  notaire?: string;
  dateCompromis?: string;
  observations?: string;
}

// Données pour mise à jour de vente
export interface UpdateVenteData {
  acquereur?: string;
  acquereurId?: string;
  notaire?: string;
  dateCompromis?: string;
  dateActeAuthentique?: string;
  dateNotificationArticle6?: string;
  statut?: VenteStatut;
  etapeWorkflow?: VenteEtapeWorkflow;
  observations?: string;
}

// Statistiques des ventes
export interface VentesStats {
  total: number;
  enCours: number;
  terminees: number;
  annulees: number;
}

// Filtres des ventes
export interface VentesFilters {
  search: string;
  statut: VenteStatut | 'TOUS';
  lotType: string;
}

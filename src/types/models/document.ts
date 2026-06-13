import { BaseEntity, ID } from '../common';
import { DocumentCategorie, DocumentStatut, DocumentType, NiveauConfidentialite } from '../enums';

/**
 * TypeDocumentTechnique - String literal union (legacy compatible)
 */
export type TypeDocumentTechnique =
  | 'DTA'
  | 'DIAGNOSTIC_PLOMB'
  | 'DIAGNOSTIC_ELECTRICITE'
  | 'DIAGNOSTIC_GAZ'
  | 'DPE_COLLECTIF'
  | 'CONTROLE_ASCENSEUR'
  | 'CONTROLE_EXTINCTEURS'
  | 'CONTROLE_CHAUFFERIE'
  | 'GARANTIE_DECENNALE'
  | 'GARANTIE_PARFAIT_ACHEVEMENT'
  | 'RAPPORT_SECURITE'
  | 'AUTRE';

export interface IDocument extends BaseEntity {
  coproprieteId: ID;
  titre: string;
  categorie: DocumentCategorie;
  dateDocument: Date;
  fichierUrl: string;
  mimeType: string;
  taille: number;
  statut: DocumentStatut;
  tags: string[];
  confidentialite: NiveauConfidentialite | string;
  uploadParId: ID;
  dureeConservation?: number;
  dateExpiration?: Date;
}

/**
 * Legacy Document interface
 */
export interface Document {
  id: string;
  nom: string;
  type: 'PDF' | 'IMAGE' | 'AUTRE';
  categorie: DocumentCategorie | string;
  dateAjout: string;
  taille: string;
}

/**
 * Document technique
 */
export interface DocumentTechnique {
  id: string;
  nom: string;
  type: TypeDocumentTechnique;
  dateAjout: string;
  dateValidite?: string;
  url: string;
  observations?: string;
}

/**
 * Document de vente
 */
export interface SaleDocument {
  id: string;
  nom: string;
  type: DocumentType | string;
  dateUpload: string;
  dateSignature?: string;
  dateEnvoi?: string;
  statut: DocumentStatut | string;
  url: string;
  signePar?: string;
  observations?: string;
}

/**
 * Historique de vente
 */
export interface SaleHistory {
  id: string;
  date: string;
  action: string;
  utilisateur: string;
  details?: string;
}

/**
 * Vente
 */
export interface Sale {
  id: string;
  lotIds: string[];
  lotTypes: string[];
  vendeur: string;
  vendeurId: string;
  acquereur?: string;
  acquereurId?: string;
  notaire?: string;
  dateCompromis?: string;
  dateActeAuthentique?: string;
  dateNotificationArticle6?: string;
  statut: 'EN_COURS' | 'TERMINEE' | 'ANNULEE';
  documents: SaleDocument[];
  historique: SaleHistory[];
  observations?: string;
  liensOrdresService?: string[];
  dateCreation: string;
  dateModification: string;
}

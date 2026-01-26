import { BaseEntity, ID, Adresse } from '../common';
import { LotType, PreferenceCommunication, UserRole } from '../enums';

export interface ILot extends BaseEntity {
  coproprieteId: ID;
  proprietaireId: ID;
  numero: string;
  type: LotType;
  etage?: number;
  surface?: number;
  tantiemes: number;
  description?: string;
}

export interface ICoproprietaire extends BaseEntity {
  userId: ID;
  coproprieteId: ID;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  adressePostale?: Adresse;
  lots: ILot[];
  totalTantiemes: number;
  roleCS?: UserRole;
  preferenceCommunication: PreferenceCommunication;
  isResident: boolean;
}

/**
 * Legacy Lot interface
 */
export interface Lot {
  id: string;
  numero: string;
  type: LotType | string;
  estPrincipal: boolean;
  coproprietaireId: string;
  tantiemesGeneraux: number;
  tantiemesAscenseur?: number;
  tantiemesChauffage?: number;
  tantiemesBatiment?: number;
  autresCles?: Record<string, number>;
}

/**
 * Legacy Copropriétaire interface
 */
export interface Coproprietaire {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  adresse?: string;
}

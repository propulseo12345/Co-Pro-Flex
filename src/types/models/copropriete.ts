import { BaseEntity, ID, Adresse } from '../common';
import { UserRole, TypeTantieme } from '../enums';

export interface ICopropriete extends BaseEntity {
  nom: string;
  adresse: Adresse;
  nombreLots: number;
  totalTantiemes: number;
  siretSyndic?: string;
  dateCreation: Date;
  exerciceDebut: number;
  image?: string;
  anneeConstruction?: number;
  nombreBatiments?: number;
}

/**
 * Tantième configuration
 */
export interface Tantieme {
  lotId: string;
  valeur: number;
  type: TypeTantieme | string;
}

/**
 * Distribution key
 */
export interface CleRepartition {
  id: string;
  nom: string;
  type: string;
  description?: string;
}

/**
 * Custom distribution key
 */
export interface CleRepartitionPersonnalisee {
  id: string;
  nom: string;
  description?: string;
}

/**
 * Accounting account
 */
export interface CompteComptable {
  numero: string;
  libelle: string;
  type: 'ACTIF' | 'PASSIF' | 'CHARGE' | 'PRODUIT';
}

/**
 * Copropriété parameters
 */
export interface ParametresCopropriete {
  typesAcces: {
    invitations: import('./user').AccesInvitation[];
    niveauxAcces: import('./user').NiveauAcces[];
  };
  tableauBord: {
    informationsAffichees: string[];
    widgetsActifs: string[];
  };
  visibiliteInfos: {
    proprietesVisibles: string[];
    restrictionsParRole: Record<UserRole | string, string[]>;
  };
  informationsCopro: {
    nom: string;
    adresse: string;
    nombreLots: number;
    anneeConstruction: number;
  };
  finance: {
    tantiemes: Tantieme[];
    clesRepartition: CleRepartition[];
    planComptable: CompteComptable[];
  };
}

// Note: ContactBase, MembreConseilSyndical, PrestataireContact, ServiceUrgence,
// AssuranceContact et InformationsCopropriete sont définis dans legacy.ts
// pour la rétro-compatibilité. Les nouveaux types IXxx sont dans les fichiers models.

import { BaseEntity, ID } from '../common';

/**
 * Rôle d'un membre du Conseil Syndical
 */
export type RoleMembreCS = 'president' | 'secretaire' | 'tresorier' | 'membre';

/**
 * Statut d'un rapport d'activité
 */
export type StatutRapportCS =
  | 'brouillon'      // En cours de rédaction
  | 'en_revision'    // Soumis pour relecture aux autres membres
  | 'valide'         // Validé par le CS
  | 'publie'         // Lié à une AG, visible par tous
  | 'archive';       // AG terminée

/**
 * Type d'annexe du rapport
 */
export type TypeAnnexeRapport = 'document' | 'image' | 'tableau';

/**
 * Membre du Conseil Syndical
 */
export interface IMembreConseilSyndical extends BaseEntity {
  coproprieteId: ID;
  coproprietaireId: ID;

  // Infos du copropriétaire (dénormalisées pour affichage)
  coproprietaire: {
    id: ID;
    nom: string;
    prenom: string;
    email: string;
  };

  // Rôle dans le CS
  role: RoleMembreCS;

  // Mandat
  dateDebutMandat: Date;
  dateFinMandat?: Date;
  estActif: boolean;
}

/**
 * Conseil Syndical d'une copropriété
 */
export interface IConseilSyndical extends BaseEntity {
  coproprieteId: ID;

  // Composition
  membres: IMembreConseilSyndical[];
  nombreMembresStatutaire: number;  // Nombre prévu par le règlement

  // Mandat en cours
  dateDebutMandat: Date;
  dateFinMandat?: Date;
}

/**
 * Section du rapport (pour structuration)
 */
export interface ISectionRapportCS {
  id: ID;
  ordre: number;
  titre: string;
  contenu: string;  // HTML
}

/**
 * Annexe jointe au rapport
 */
export interface IAnnexeRapportCS extends BaseEntity {
  rapportId: ID;

  nom: string;
  description?: string;
  type: TypeAnnexeRapport;

  // Fichier
  fichierUrl?: string;
  fichierNom?: string;
  fichierTaille?: number;

  // Ou contenu intégré (tableau, etc.)
  contenuIntegre?: string;

  ordre: number;
}

/**
 * Rapport d'activité du Conseil Syndical
 */
export interface IRapportActiviteCS extends BaseEntity {
  conseilSyndicalId: ID;
  coproprieteId: ID;

  // Période concernée
  periodeDebut: Date;
  periodeFin: Date;

  // Contenu
  titre: string;
  introduction: string;           // Résumé / Introduction
  contenu: string;                // Contenu riche (HTML)
  contenuBrut: string;            // Version texte brut (pour recherche/preview)

  // Sections structurées (optionnel)
  sections: ISectionRapportCS[];

  // Annexes
  annexes: IAnnexeRapportCS[];

  // Statut
  statut: StatutRapportCS;

  // Lien avec l'AG
  agId?: ID;                      // AG à laquelle le rapport est lié
  resolutionId?: ID;              // Résolution correspondante

  // Validation
  validePar?: ID;                 // ID du membre qui a validé
  dateValidation?: Date;

  // Auteur principal
  auteurId: ID;                   // Membre du CS qui a créé le rapport
}

/**
 * Commentaire sur le rapport (pour la révision)
 */
export interface ICommentaireRapportCS extends BaseEntity {
  rapportId: ID;
  auteurId: ID;                   // Membre du CS

  contenu: string;

  // Référence optionnelle à une section
  sectionId?: ID;

  // Statut
  resolu: boolean;
}

// ============================================
// Types Legacy (compatibilité avec le reste de l'app)
// ============================================

/**
 * Membre du Conseil Syndical (legacy format)
 */
export interface MembreConseilSyndical {
  id: string;
  coproprieteId: string;
  coproprietaireId: string;
  coproprietaire: {
    id: string;
    nom: string;
    prenom: string;
    email: string;
  };
  role: RoleMembreCS;
  dateDebutMandat: string;
  dateFinMandat?: string;
  estActif: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Conseil Syndical (legacy format)
 */
export interface ConseilSyndical {
  id: string;
  coproprieteId: string;
  membres: MembreConseilSyndical[];
  nombreMembresStatutaire: number;
  dateDebutMandat: string;
  dateFinMandat?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Section du rapport (legacy format)
 */
export interface SectionRapportCS {
  id: string;
  ordre: number;
  titre: string;
  contenu: string;
}

/**
 * Annexe du rapport (legacy format)
 */
export interface AnnexeRapportCS {
  id: string;
  rapportId: string;
  nom: string;
  description?: string;
  type: TypeAnnexeRapport;
  fichierUrl?: string;
  fichierNom?: string;
  fichierTaille?: number;
  contenuIntegre?: string;
  ordre: number;
  createdAt?: string;
}

/**
 * Rapport d'activité du Conseil Syndical (legacy format)
 */
export interface RapportActiviteCS {
  id: string;
  conseilSyndicalId: string;
  coproprieteId: string;
  periodeDebut: Date;
  periodeFin: Date;
  titre: string;
  introduction: string;
  contenu: string;
  contenuBrut: string;
  sections: SectionRapportCS[];
  annexes: AnnexeRapportCS[];
  statut: StatutRapportCS;
  agId?: string;
  resolutionId?: string;
  validePar?: string;
  dateValidation?: Date;
  auteurId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Commentaire sur le rapport (legacy format)
 */
export interface CommentaireRapportCS {
  id: string;
  rapportId: string;
  auteurId: string;
  contenu: string;
  sectionId?: string;
  resolu: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Données pour créer un nouveau rapport
 */
export interface CreateRapportCSData {
  conseilSyndicalId: string;
  coproprieteId: string;
  auteurId: string;
  periodeDebut: Date;
  periodeFin: Date;
  titre: string;
}

/**
 * Données pour mettre à jour le contenu d'un rapport
 */
export interface UpdateRapportCSContenu {
  titre?: string;
  introduction?: string;
  contenu?: string;
}

/**
 * Données pour créer une section
 */
export interface CreateSectionData {
  titre: string;
  contenu: string;
  ordre: number;
}

/**
 * Données pour créer une annexe
 */
export interface CreateAnnexeData {
  nom: string;
  description?: string;
  type: TypeAnnexeRapport;
  fichierUrl?: string;
  fichierNom?: string;
  fichierTaille?: number;
  contenuIntegre?: string;
}

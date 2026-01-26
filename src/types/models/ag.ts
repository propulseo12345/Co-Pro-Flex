import { BaseEntity, ID } from '../common';
import {
  AGStatut,
  AGType,
  PresenceMode,
  ResolutionStatut,
  VoteValue,
  VotingArticle,
  TypeMajorite,
  TypePasserelle,
  ResultatVote,
  FeuillePresenceStatut,
  EcheancierMode,
  AGFormat,
} from '../enums';
import type { VisioProvider } from '../enums/ag-format';

export interface IAssembleeGenerale extends BaseEntity {
  coproprieteId: ID;
  type: AGType;
  numero?: string;
  date: Date;
  heure: string;
  lieu: string;
  statut: AGStatut;
  convocationEnvoyeeLe?: Date;
  quorum?: number;
  totalTantiemesPresents?: number;
  resolutions: IResolution[];
  participants: IParticipant[];
  documents: ID[];
  presidentSeanceId?: ID;
  secretaireId?: ID;
  scrutateursIds?: ID[];
  notes?: string;

  // Format de l'AG (présentiel, visio, mixte) - Loi ELAN 2018
  format?: AGFormat;

  // Adresse structurée pour le présentiel
  adresse?: {
    nomLieu?: string;
    rue: string;
    codePostal: string;
    ville: string;
  };
  adresseComplete?: string;

  // Visioconférence
  visioUrl?: string;
  visioProvider?: VisioProvider;
  visioInstructions?: string;

  // Participation mixte : comptage présents + distants
  participantsDistants?: number;
  tantiemesDistants?: number;
}

/**
 * Type de résolution
 */
export type TypeResolution =
  | 'standard'           // Résolution normale
  | 'designation'        // Désignation (scrutateur, CS, etc.)
  | 'budget'             // Approbation budget
  | 'travaux'            // Travaux
  | 'autre';

/**
 * Catégorie de désignation
 */
export type CategorieDesignation =
  | 'president_seance'
  | 'secretaire_seance'
  | 'scrutateur'
  | 'conseil_syndical'
  | 'syndic'
  | 'autre';

/**
 * Personne désignée pour une résolution
 */
export interface PersonneDesignee {
  id: string;
  type: 'coproprietaire' | 'gestionnaire' | 'tiers';
  nom: string;
  prenom: string;
  coproprietaireId?: string;
  societe?: string;
}

export interface IResolution extends BaseEntity {
  agId: ID;
  numero: number;
  titre: string;
  description: string;
  article: VotingArticle;
  statut: ResolutionStatut;
  votes: IVote[];
  tantiemesPour: number;
  tantiemesContre: number;
  tantiemesAbstention: number;
  resultat?: ResultatVote | string;
  passerelleUtilisee?: boolean;
  observations?: string;

  // Support des sous-résolutions
  sousNumero?: number;           // Sous-numéro optionnel (1, 2, 3... pour 3.1, 3.2, 3.3)
  numeroComplet?: string;        // "3" ou "3.1", "3.2"...
  type?: TypeResolution;
  categorieDesignation?: CategorieDesignation;
  personneDesignee?: PersonneDesignee;
  parentId?: ID;                 // ID de la résolution parente (pour sous-résolutions)
  estParente?: boolean;          // True si c'est une résolution parente pouvant avoir des sous-résolutions
  ordre?: number;                // Ordre d'affichage
}

export interface IVote extends BaseEntity {
  resolutionId: ID;
  coproprietaireId: ID;
  tantiemes: number;
  vote: VoteValue;
  parCorrespondance: boolean;
  mandataireId?: ID;
}

export interface IParticipant {
  coproprietaireId: ID;
  presence: PresenceMode;
  mandataireId?: ID;
  signature?: string;
  heureArrivee?: Date;
}

export interface IConvocation extends BaseEntity {
  agId: ID;
  coproprietaireId: ID;
  dateEnvoi: Date;
  modeEnvoi: 'EMAIL' | 'COURRIER' | 'RECOMMANDE';
  accuseReception?: Date;
}

/**
 * Legacy Assemblee interface
 */
export interface Assemblee {
  id: string;
  date: string;
  type: AGType | string;
  statut: 'PLANIFIEE' | 'CONVOQUEE' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE';
  lieu: string;
  ordreDuJour?: Resolution[];
  feuillePresence?: FeuillePresence;
  rolesDesignes?: RolesAG;

  // Format AG (loi ELAN) - défaut PRESENTIEL pour rétrocompatibilité
  format?: AGFormat | 'PRESENTIEL' | 'VISIO' | 'MIXTE';

  // Adresse structurée
  adresse?: {
    nomLieu?: string;
    rue: string;
    codePostal: string;
    ville: string;
  };
  adresseComplete?: string;

  // Visioconférence
  visioUrl?: string;
  visioProvider?: VisioProvider;
  visioInstructions?: string;
}

/**
 * Legacy Resolution interface
 */
export interface Resolution {
  id: string;
  titre: string;
  description: string;
  typeVote: TypeMajorite | string;
  resultat?: ResultatVote | string;
  pour?: number;
  contre?: number;
  abstention?: number;
  echeancier?: EcheancierAppelsFonds;
  estAppelFonds?: boolean;
  passerelle?: PasserelleMajorite;
  estSecondExamen?: boolean;

  // Support des sous-résolutions
  numero?: number;
  sousNumero?: number;
  numeroComplet?: string;
  type?: TypeResolution;
  categorieDesignation?: CategorieDesignation;
  personneDesignee?: PersonneDesignee;
  parentId?: string;
  estParente?: boolean;
  ordre?: number;
  statut?: 'a_voter' | 'en_cours' | 'votee' | 'reportee' | 'rejetee';
}

/**
 * Résolution avec ses sous-résolutions
 */
export interface ResolutionAvecSousResolutions extends Resolution {
  sousResolutions: Resolution[];
}

/**
 * Configuration pour les résolutions de désignation multiple
 */
export interface ConfigDesignationMultiple {
  categorie: CategorieDesignation;
  nombreMinimum: number;
  nombreMaximum?: number;    // undefined = illimité
  titreTemplate: string;     // Template : "Désignation du scrutateur n°{n}"
  questionAjout: string;     // "Un autre copropriétaire souhaite-t-il être scrutateur ?"
}

/**
 * Configurations par défaut pour les désignations multiples
 */
export const CONFIGS_DESIGNATION: Record<'scrutateur' | 'conseil_syndical', ConfigDesignationMultiple> = {
  scrutateur: {
    categorie: 'scrutateur',
    nombreMinimum: 2,
    nombreMaximum: undefined,
    titreTemplate: "Désignation du scrutateur n°{n}",
    questionAjout: "Un autre copropriétaire souhaite-t-il être scrutateur ?",
  },
  conseil_syndical: {
    categorie: 'conseil_syndical',
    nombreMinimum: 3,
    nombreMaximum: 5,
    titreTemplate: "Élection du membre du Conseil Syndical n°{n}",
    questionAjout: "Souhaitez-vous élire un autre membre du Conseil Syndical ?",
  },
}

/**
 * Échéance
 */
export interface Echeance {
  id: string;
  dateExigibilite: string;
  montantTotal: number;
  ordre: number;
  description?: string;
}

/**
 * Échéancier d'appels de fonds
 */
export interface EcheancierAppelsFonds {
  id: string;
  resolutionId?: string;
  budgetId?: string;
  modeEcheancier: EcheancierMode | string;
  montantTotal: number;
  dateDebut?: string;
  echeances: Echeance[];
  cleRepartitionId?: string;
}

/**
 * Passerelle de majorité
 */
export interface PasserelleMajorite {
  type: TypePasserelle | string;
  dateActivation: string;
  conditionRemplie: boolean;
  voteInitial: {
    pour: number;
    contre: number;
    abstention: number;
    majoriteRequise: string;
  };
  secondVote?: {
    pour: number;
    contre: number;
    abstention: number;
    majoriteRequise: string;
    resultat: ResultatVote | string;
    dateVote: string;
  };
  mentionPV: string;
}

/**
 * Presence status
 */
export type StatutPresence = 'PRESENT' | 'REPRESENTE' | 'ABSENT';

/**
 * Signature de présence
 */
export interface SignaturePresence {
  id: string;
  coproprietaireId: string;
  statut: StatutPresence;
  representant?: string;
  signatureData?: string;
  dateSignature?: string;
  ipAddress?: string;
}

/**
 * Feuille de présence
 */
export interface FeuillePresence {
  id: string;
  agId: string;
  dateCreation: string;
  dateOuverture?: string;
  dateCloture?: string;
  statut: FeuillePresenceStatut | string;
  signatures: SignaturePresence[];
  exportPdfUrl?: string;
}

/**
 * Type de personne pour les rôles en séance
 */
export type TypePersonneRole = 'coproprietaire' | 'gestionnaire' | 'autre';

/**
 * Personne désignée pour un rôle en séance
 */
export interface PersonneRole {
  id?: string;
  nom: string;
  prenom?: string;
  type: TypePersonneRole;
  /** Pour le gestionnaire : nom du syndic qu'il représente */
  representeSyndic?: string;
  email?: string;
  telephone?: string;
}

/**
 * Désignation d'un rôle
 */
export interface DesignationRole {
  personne: PersonneRole;
  dateDesignation: string;
}

/**
 * Rôles AG
 */
export interface RolesAG {
  presidentSeance?: {
    coproprietaireId?: string;
    nom: string;
    dateDesignation: string;
  };
  secretaireSeance?: {
    coproprietaireId?: string;
    nom: string;
    dateDesignation: string;
    /** Si secrétaire est gestionnaire */
    estGestionnaire?: boolean;
    representeSyndic?: string;
  };
  scrutateur?: {
    coproprietaireId?: string;
    nom: string;
    dateDesignation: string;
  };
  membresConseilSyndical?: Array<{
    coproprietaireId?: string;
    nom: string;
    type: 'TITULAIRE' | 'SUPPLEANT';
    dateDesignation: string;
  }>;
}

/**
 * Vote de résolution
 */
export interface VoteResolution {
  resolutionId: string;
  choix: VoteValue | string;
  dateVote: string;
}

/**
 * Justificatif scanné pour un vote par correspondance
 */
export interface JustificatifVote {
  fileName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  /** URL locale ou base64 pour aperçu (sans backend) */
  dataUrl?: string;
}

/**
 * Vote par correspondance
 */
export interface VoteCorrespondance {
  id: string;
  agId: string;
  coproprietaireId: string;
  votes: VoteResolution[];
  dateEnregistrement: string;
  dateModification?: string;
  statut: 'BROUILLON' | 'VALIDE';
  /** Tantièmes effectivement votés (peut différer du total si mandat partiel) */
  tantiemesVotes?: number;
  /** Justificatif scanné du formulaire de vote */
  justificatif?: JustificatifVote;
}

/**
 * Type pour les choix de vote dans l'interface
 */
export type VoteChoiceUI = 'POUR' | 'CONTRE' | 'ABSTENTION' | null;

/**
 * Statut de complétion d'un vote par correspondance
 */
export type VoteCompletionStatus = 'INCOMPLET' | 'COMPLET';

// ============================================================================
// POUVOIRS (MANDATS)
// ============================================================================

/**
 * Justificatif scanné pour un pouvoir
 */
export interface JustificatifPouvoir {
    fileName: string;
    mimeType: string;
    size: number;
    uploadedAt: string;
    /** URL locale ou base64 pour aperçu (sans backend) */
    dataUrl?: string;
}

/**
 * Pouvoir (mandat) donné par un copropriétaire à un autre
 */
export interface IPouvoir {
    id: string;
    agId: string;
    /** ID du copropriétaire qui donne le pouvoir (mandant) */
    mandantCoproId: string;
    /** ID du copropriétaire qui reçoit le pouvoir (mandataire) */
    mandataireCoproId: string;
    /** Date de signature du pouvoir */
    signedAt?: string;
    /** Justificatif scanné du formulaire de pouvoir */
    justificatif?: JustificatifPouvoir;
    createdAt: string;
    updatedAt: string;
}

/**
 * Erreur de validation d'un pouvoir
 */
export interface PouvoirValidationError {
    code: 'MANDANT_ALREADY_GAVE' | 'MANDATAIRE_LIMIT_EXCEEDED' | 'DUPLICATE' | 'SAME_PERSON';
    message: string;
}

/**
 * Résultat de validation d'un pouvoir
 */
export interface PouvoirValidationResult {
    ok: boolean;
    errors: PouvoirValidationError[];
}

/**
 * Statistiques des pouvoirs
 */
export interface PouvoirsStats {
    totalPouvoirs: number;
    mandatairesCount: number;
    mandatairesOverLimit: number;
    incohérences: number;
    justificatifsManquants: number;
}

/**
 * Quorum prévisionnel
 */
export interface QuorumPrevisionnel {
    /** Tantièmes représentés (votes correspondance + pouvoirs) */
    tantiemesRepresentes: number;
    /** Total des tantièmes de la copropriété */
    totalTantiemes: number;
    /** Pourcentage de tantièmes représentés */
    pourcentage: number;
    /** Nombre de copropriétaires représentés */
    nbCoproprietairesRepresentes: number;
    /** Total des copropriétaires */
    totalCoproprietaires: number;
    /** Détail par type de représentation */
    details: {
        /** Copropriétaires avec votes par correspondance complets */
        votesCorrespondance: {
            count: number;
            tantiemes: number;
        };
        /** Mandants représentés par pouvoir */
        mandantsRepresentes: {
            count: number;
            tantiemes: number;
        };
    };
}

/**
 * Participant pré-rempli pour la feuille de présence
 */
export interface ParticipantPreRempli {
    coproprietaireId: string;
    nom: string;
    lot: string;
    tantiemes: number;
    modeParticipation: 'VOTE_CORRESPONDANCE' | 'REPRESENTE' | 'NON_DETERMINE';
    mandataireId?: string;
    mandataireNom?: string;
    voteCorrespondanceComplet: boolean;
}

import { BaseEntity, ID } from '../common';
import {
  ContratStatut,
  ContratType,
  OrdreServiceStatut,
  UrgenceLevel,
  CategoriePrestataire,
  DomaineActivite,
  TypeOrdreService,
  TypeIntervention,
  CategorieIntervention,
  TypeTravauxPrevisionnel,
  TravauxPrevisionnelStatut,
  SousTypeAssurance,
  ContratSyndicStatut
} from '../enums';

/**
 * TypeContrat - String literal union for contract types (legacy compatible)
 */
export type TypeContrat =
  | 'ASCENSEUR'
  | 'MENAGE'
  | 'EAU'
  | 'ELECTRICITE'
  | 'ASSURANCE'
  | 'ESPACES_VERTS'
  | 'CHAUFFAGE'
  | 'TOITURE'
  | 'FACADE'
  | 'INTERPHONE'
  | 'PORTAIL'
  | 'JURIDIQUE'
  | 'AUTRE';

/**
 * StatutContrat - String literal union for contract status (legacy compatible)
 */
export type StatutContratLegacy = 'ACTIF' | 'RESILIE' | 'A_RENOUVELER' | 'BROUILLON' | 'EXPIRE' | 'ARCHIVE';

/**
 * StatutContratSyndic - String literal union for syndic contract status
 */
export type StatutContratSyndic = 'ACTIF' | 'A_RENOUVELER' | 'RESILIE';

/**
 * SousTypeAssurance - String literal union (legacy compatible)
 */
export type SousTypeAssuranceLiteral =
  | 'MRI'
  | 'RC_SYNDICAT'
  | 'DOMMAGES_OUVRAGE'
  | 'PROTECTION_JURIDIQUE'
  | 'AUTRE';

// Re-export as SousTypeAssurance for legacy compat
export type { SousTypeAssuranceLiteral as SousTypeAssuranceType };

export interface IPrestataire extends BaseEntity {
  nom: string;
  contact?: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  siret?: string;
  specialites: ContratType[];
  notation?: number;
  notes?: string;
  iban?: string;
  bic?: string;
}

export interface IContrat extends BaseEntity {
  coproprieteId: ID;
  prestataireId: ID;
  numero: string;
  type: ContratType;
  objet: string;
  dateDebut: Date;
  dateFin: Date;
  montantAnnuel: number;
  taciteReconduction: boolean;
  preavisResiliation: number;
  statut: ContratStatut;
  documents: ID[];
  notes?: string;
}

export interface IOrdreService extends BaseEntity {
  coproprieteId: ID;
  numero: string;
  objet: string;
  description: string;
  urgence: UrgenceLevel;
  prestataireId?: ID;
  contratId?: ID;
  statut: OrdreServiceStatut;
  dateCreation: Date;
  dateIntervention?: Date;
  dateCloture?: Date;
  montantDevis?: number;
  montantFacture?: number;
  documents: ID[];
  historique: IHistoriqueOS[];
  notes?: string;
}

export interface IHistoriqueOS {
  date: Date;
  statutPrecedent: OrdreServiceStatut;
  statutNouveau: OrdreServiceStatut;
  parUtilisateurId: ID;
  commentaire?: string;
}

/**
 * Legacy Fournisseur interface
 */
export interface Fournisseur {
  id: string;
  nom: string;
  metier: string;
  telephone: string;
  email: string;
  adresse: string;
  note?: number;
}

/**
 * Legacy Contrat interface
 */
export interface Contrat {
  id: string;
  nom: string;
  fournisseur: string;
  type: 'MAINTENANCE' | 'ASSURANCE' | 'AUTRE';
  dateDebut: string;
  dateFin: string;
  coutAnnuel: number;
  statut: ContratStatut | string;
}

/**
 * Legacy Intervention interface
 */
export interface Intervention {
  id: string;
  date: string;
  titre: string;
  description: string;
  intervenant: string;
  statut: 'PLANIFIEE' | 'TERMINEE' | 'EN_COURS';
  type: TypeIntervention | string;
}

/**
 * Prestataire extended
 */
export interface Prestataire {
  id: string;
  nom: string;
  categorie: CategoriePrestataire | string;
  domaines: DomaineActivite[] | string[];
  telephone: string;
  /** Téléphone urgence 24h/24 si différent */
  telephoneUrgence?: string;
  email: string;
  adresse: string;
  codePostal?: string;
  ville?: string;
  siren?: string;
  iban?: string;
  bic?: string;
  noteMoyenne?: number;
  nombreAvis?: number;
  certifications?: string[];
  dateAjout: string;
  derniereIntervention?: string;
  nombreInterventions: number;
  notesInternes?: string;
  /** Nom du contact référent */
  contactReferent?: string;
  /** Fonction du contact référent */
  fonctionContact?: string;
  // === Champs CoproFlex Marketplace ===
  /** Rayon d'intervention en km (ex: 30km autour du code postal) */
  rayonIntervention?: number;
  /** Tarif indicatif (ex: "50-80€/h" ou "Sur devis") */
  tarifIndicatif?: string;
  /** Description des services proposés */
  description?: string;
  /** Disponibilité (ex: "Lun-Ven 8h-18h", "7j/7 urgences") */
  disponibilite?: string;
  /** Label CoproFlex certifié (prestataire vérifié) */
  labelCoproFlex?: boolean;
  /** Délai d'intervention moyen (ex: "24-48h", "Immédiat urgences") */
  delaiIntervention?: string;
  /** Année de création de l'entreprise */
  anneeCreation?: number;
  /** Nombre de salariés */
  nombreSalaries?: number;
  /** Site web */
  siteWeb?: string;
}

/**
 * Avis prestataire
 */
export interface AvisPrestataire {
  id: string;
  prestataireId: string;
  coproprieteId: string;
  note: number;
  commentaire?: string;
  dateAvis: string;
  auteur: string;
}

/**
 * Document contrat
 */
export interface DocumentContrat {
  id: string;
  nom: string;
  type: 'CONTRAT_PDF' | 'AVENANT' | 'FACTURE' | 'ATTESTATION' | 'AUTRE';
  url: string;
  dateUpload: string;
}

/**
 * Type de document assurance
 */
export type TypeDocumentAssurance = 'CONTRAT' | 'CONDITIONS_PARTICULIERES' | 'ATTESTATION' | 'AVENANT' | 'AUTRE';

/**
 * Document assurance
 */
export interface DocumentAssurance {
  id: string;
  nom: string;
  type: TypeDocumentAssurance;
  url: string;
  dateUpload: string;
}

/**
 * Type de document syndic
 */
export type TypeDocumentSyndic = 'MANDAT' | 'AVENANT' | 'PV_DESIGNATION' | 'RAPPORT_GESTION' | 'RELEVE_CHARGES' | 'AUTRE';

/**
 * Document syndic
 */
export interface DocumentSyndic {
  id: string;
  nom: string;
  type: TypeDocumentSyndic;
  url: string;
  dateUpload: string;
}

/**
 * Fréquence des interventions planifiées
 */
export type FrequenceIntervention =
  | 'UNIQUE'
  | 'MENSUELLE'
  | 'BIMESTRIELLE'
  | 'TRIMESTRIELLE'
  | 'SEMESTRIELLE'
  | 'ANNUELLE';

/**
 * Labels des fréquences
 */
export const FREQUENCE_LABELS: Record<FrequenceIntervention, string> = {
  UNIQUE: 'Unique',
  MENSUELLE: 'Mensuelle (12/an)',
  BIMESTRIELLE: 'Bimestrielle (6/an)',
  TRIMESTRIELLE: 'Trimestrielle (4/an)',
  SEMESTRIELLE: 'Semestrielle (2/an)',
  ANNUELLE: 'Annuelle (1/an)',
};

/**
 * Nombre d'interventions par an selon la fréquence
 */
export const FREQUENCE_NB_INTERVENTIONS: Record<FrequenceIntervention, number> = {
  UNIQUE: 1,
  MENSUELLE: 12,
  BIMESTRIELLE: 6,
  TRIMESTRIELLE: 4,
  SEMESTRIELLE: 2,
  ANNUELLE: 1,
};

/**
 * Configuration de planification pour un contrat
 */
export interface PlanificationContrat {
  frequence: FrequenceIntervention;
  /** Jour du mois préféré pour les interventions (1-28) */
  jourPrefere?: number;
  /** Heure préférée (ex: "09:00") */
  heurePrefere?: string;
  /** Délai en jours avant la date pour générer l'ordre de service */
  delaiGenerationJours: number;
  /** Description standard de l'intervention */
  descriptionIntervention: string;
  /** Montant estimé par intervention */
  montantEstimeIntervention?: number;
  /** Activer la génération automatique */
  generationAutomatique: boolean;
  /** Date de la dernière génération */
  derniereGeneration?: string;
  /** Date de la prochaine intervention planifiée */
  prochaineIntervention?: string;
}

/**
 * Ordre de service planifié (à valider avant génération)
 */
export interface OrdreServicePlanifie {
  id: string;
  contratId: string;
  contratNom: string;
  prestataireNom: string;
  titre: string;
  description: string;
  datePrevisionnelle: string;
  montantEstime?: number;
  statut: 'A_VALIDER' | 'VALIDE' | 'GENERE' | 'ANNULE';
  dateGeneration?: string;
  ordreServiceId?: string;
}

/**
 * Contrat détaillé
 */
export interface ContratDetaille extends Omit<Contrat, 'type' | 'statut'> {
  prestataireId: string;
  type: TypeContrat;
  statut: StatutContratLegacy;
  description?: string;
  numeroContrat?: string;
  fichierPDF?: string;
  dateUploadPDF?: string;
  conditionsParticulieres?: string;
  taciteReconduction: boolean;
  delaiResiliation?: number;
  interventionIds: string[];
  pieceJointes: DocumentContrat[];
  dateAlerte?: string;
  equipementConcerne?: string;
  estReglementaire: boolean;
  /** Configuration de planification des interventions */
  planification?: PlanificationContrat;
}

/**
 * Pièce jointe OS
 */
export interface PieceJointeOS {
  id: string;
  nom: string;
  type: 'PDF' | 'IMAGE' | 'AUTRE';
  taille: string;
  url: string;
  dateAjout: string;
}

/**
 * Historique modification OS
 */
export interface ModificationHistoriqueOS {
  id: string;
  date: string;
  auteur: string;
  action: string;
  champModifie?: string;
  ancienneValeur?: string;
  nouvelleValeur?: string;
}

/**
 * Template email OS
 */
export interface EmailTemplateOS {
  id: string;
  type: TypeOrdreService | string;
  nom: string;
  objet: string;
  corps: string;
  variablesDisponibles: string[];
}

/**
 * Contact sur place pour accueillir l'intervenant
 */
export interface ContactSurPlace {
  id: string;
  nom: string;
  telephone?: string;
  email?: string;
  coproprietaireId?: string;
}

/**
 * Legacy OrdreService interface
 */
export interface OrdreService {
  id: string;
  date: string;
  dateCreation: string;
  dateModification: string;
  titre: string;
  description: string;
  typeOrdre: TypeOrdreService | string;
  fournisseurId?: string;
  fournisseurNom: string;
  fournisseurEmail?: string;
  fournisseurTelephone?: string;
  contratId?: string;
  contratNom?: string;
  statut: OrdreServiceStatut | string;
  dateEnvoi?: string;
  dateInterventionProgrammee?: string;
  dateInterventionRealisee?: string;
  dateCloture?: string;
  emailObjet: string;
  emailCorps: string;
  piecesJointes: PieceJointeOS[];
  montantEstime?: number;
  montantFinal?: number;
  devisRequis?: boolean;
  historique: ModificationHistoriqueOS[];
  archiveGedId?: string;
  archiveGedUrl?: string;
  /** Contact sur place pour accueillir l'intervenant */
  contactSurPlace?: ContactSurPlace;
}

/**
 * Intervention détaillée
 */
export interface InterventionDetaille extends Intervention {
  prestataireId: string;
  coproprieteId?: string;
  contratId?: string;
  ordreServiceId?: string;
  factureId?: string;
  montant?: number;
  domaine: DomaineActivite | string;
  pieceJointes?: string[];
  commentaires?: string;
}

/**
 * Poste budgétaire pour le suivi des dépenses maintenance
 */
export type PosteBudgetMaintenance =
  | 'eau'
  | 'electricite'
  | 'assurance'
  | 'menage'
  | 'ascenseur'
  | 'espaces_verts'
  | 'divers'
  | 'plomberie'
  | 'chauffage'
  | 'toiture'
  | 'parking'
  | 'securite'
  | 'parties_communes';

/**
 * Intervention carnet d'entretien
 */
export interface InterventionCarnet extends InterventionDetaille {
  categorie: CategorieIntervention | string;
  cout?: number;
  documentsAssocies?: string[];
  equipementConcerne?: string;
  // Liens financiers
  posteBudgetaire?: PosteBudgetMaintenance;
  // factureId est déjà dans InterventionDetaille
  // ordreServiceId est déjà dans InterventionDetaille
}

/**
 * Travaux prévisionnel
 */
export interface TravauxPrevisionnel {
  id: string;
  titre: string;
  description: string;
  type: TypeTravauxPrevisionnel | string;
  datePrevisionnelle: string;
  dateVote?: string;
  dateRealisation?: string;
  montantEstime: number;
  montantVote?: number;
  montantReel?: number;
  statut: TravauxPrevisionnelStatut | string;
  priorite: UrgenceLevel | string;
  issuPPT: boolean;
  observations?: string;
}

/**
 * Contrat assurance
 */
export interface ContratAssurance {
  id: string;
  type: 'ASSURANCE';
  sousType: SousTypeAssuranceLiteral;
  nom: string;
  assureur: string;
  numeroPolice: string;
  dateDebut: string;
  dateFin: string;
  primeAnnuelle: number;
  franchise?: number;
  garanties: string[];
  travauxConcernes?: string;
  dateReceptionTravaux?: string;
  observations?: string;
  documents?: DocumentAssurance[];
}

/**
 * Mode d'envoi de la résiliation
 */
export type ModeEnvoiResiliation = 'RECOMMANDE_POSTAL' | 'RECOMMANDE_ELECTRONIQUE' | 'NON_DEFINI';

/**
 * Statut de l'envoi de résiliation
 */
export type StatutEnvoiResiliation = 'NON_ENVOYE' | 'PREPARE' | 'EN_ATTENTE' | 'ENVOYE' | 'CONFIRME' | 'ECHEC';

/**
 * Template résiliation
 */
export interface TemplateResiliation {
  destinataire: string;
  adresse: string;
  numeroContrat: string;
  dateEffet: string;
  motif?: string;
  htmlContent: string;
  modeEnvoi?: ModeEnvoiResiliation;
  statutEnvoi?: StatutEnvoiResiliation;
  datePrepare?: string;
  dateEnvoi?: string;
  trackingId?: string;
  pdfUrl?: string;
}

/**
 * Contrat syndic
 */
export interface ContratSyndic {
  id: string;
  nomSyndic: string;
  cabinetNom?: string;
  numeroContrat: string;
  dateDebut: string;
  dateFin: string;
  montantAnnuel: number;
  statut: StatutContratSyndic;
  description?: string;
  fichierPDF?: string;
  dateUploadPDF?: string;
  taciteReconduction: boolean;
  delaiResiliation?: number;
  telephone?: string;
  email?: string;
  adresse?: string;
  documents?: DocumentSyndic[];
}

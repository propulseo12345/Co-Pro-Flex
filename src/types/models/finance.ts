import { BaseEntity, ID } from '../common';
import {
  BudgetStatut,
  EcheancierMode,
  ImpayeStatut,
  PaiementStatut,
  RecommandeStatut,
  ModeRecommande,
  ModePaiement,
  TypeCompte,
  ExerciceStatut,
  OrigineFondsALUR
} from '../enums';

export interface IBudget extends BaseEntity {
  coproprieteId: ID;
  annee: number;
  type: 'COURANT' | 'TRAVAUX';
  statut: BudgetStatut;
  montantTotal: number;
  categories: IBudgetCategorie[];
  resolutionId?: ID;
}

export interface IBudgetCategorie {
  id: ID;
  nom: string;
  postes: IBudgetPoste[];
  sousTotal: number;
}

export interface IBudgetPoste {
  id: ID;
  libelle: string;
  montantN1?: number;
  montantN: number;
  montantRealise?: number;
}

export interface IAppelFonds extends BaseEntity {
  budgetId: ID;
  coproprieteId: ID;
  numero: number;
  dateEcheance: Date;
  montantTotal: number;
  mode: EcheancierMode;
  lignes: ILigneAppel[];
  statut: 'GENERE' | 'ENVOYE' | 'PARTIELLEMENT_PAYE' | 'SOLDE';
}

export interface ILigneAppel {
  coproprietaireId: ID;
  montantDu: number;
  montantPaye: number;
  datePaiement?: Date;
}

export interface IImpaye extends BaseEntity {
  coproprietaireId: ID;
  appelFondsId: ID;
  montantDu: number;
  montantPaye: number;
  dateEcheance: Date;
  joursRetard: number;
  statut: ImpayeStatut;
  historiqueActions: IActionImpaye[];
}

export interface IActionImpaye {
  date: Date;
  type: 'EMAIL' | 'COURRIER' | 'APPEL' | 'MISE_EN_DEMEURE' | 'HUISSIER';
  details: string;
  parUtilisateurId: ID;
}

export interface IPaiement extends BaseEntity {
  coproprietaireId: ID;
  appelFondsId?: ID;
  montant: number;
  datePaiement: Date;
  modePaiement: ModePaiement | string;
  reference?: string;
  notes?: string;
}

/**
 * Legacy Budget interface
 */
export interface Budget {
  id: string;
  annee: number;
  poste: string;
  montantN1: number;
  montantN: number;
  montantN1_Prev: number;
}

/**
 * Budget travaux
 */
export interface BudgetTravaux {
  id: string;
  nom: string;
  description: string;
  montantVote: number;
  montantRealise: number;
  cleRepartitionId: string;
  statut: 'EN_COURS' | 'TERMINE' | 'A_VENIR';
  devisUrl?: string;
}

/**
 * Paiement copropriétaire
 */
export interface PaiementCoproprietaire {
  coproprietaireId: string;
  montantDu: number;
  montantPaye: number;
  statutPaiement: PaiementStatut | string;
  datePaiement?: string;
  modePaiement?: ModePaiement | string;
}

/**
 * Recommandé copropriétaire
 */
export interface RecommandeCoproprietaire {
  coproprietaireId: string;
  modeEnvoi: ModeRecommande | string;
  statut: RecommandeStatut | string;
  datePrepare?: string;
  dateEnvoi?: string;
  dateLivraison?: string;
  dateLecture?: string;
  numeroSuivi?: string;
}

/**
 * Legacy AppelFonds interface
 */
export interface AppelFonds {
  id: string;
  dateExigibilite: string;
  statut: 'ENVOYE' | 'EN_ATTENTE' | 'PAYE';
  montant: number;
  periode: string;
  budgetTravauxId?: string;
  devisUrl?: string;
  paiements?: PaiementCoproprietaire[];
  recommandes?: RecommandeCoproprietaire[];
}

/**
 * Plan comptable
 */
export interface PlanComptable {
  id: string;
  numero: string;
  libelle: string;
  type: TypeCompte | string;
  niveau: number;
  compteParentId?: string;
  solde: number;
  sousComptes?: PlanComptable[];
  // Champs pour balance comparative N-1
  soldeN1?: number;           // Solde au 31/12/N-1
  mouvementDebit?: number;    // Total des mouvements débit N
  mouvementCredit?: number;   // Total des mouvements crédit N
}

/**
 * Écriture comptable
 */
export interface EcritureComptable {
  id: string;
  date: string;
  libelle: string;
  numeroJournal: string;
  numeroPiece?: string;
  debit: number;
  credit: number;
  compteId: string;
  exerciceId: string;
}

/**
 * Exercice comptable
 */
export interface Exercice {
  id: string;
  annee: string;
  dateDebut: string;
  dateFin: string;
  statut: ExerciceStatut | string;
}

/**
 * Dépense
 */
export interface Depense {
  id: string;
  date: string;
  libelle: string;
  fournisseur: string;
  montant: number;
  compteId: string;
  recuperable: number;
  deductible: number;
}

/** Taux de TVA applicables en France */
export type TauxTVA = 20 | 10 | 5.5 | 2.1 | 0;

/**
 * Dépense étendue avec liaison aux postes budgétaires et détail TVA.
 * Anciennement définie dans @/data/mock — déplacée ici car c'est un type métier.
 */
export interface DepenseEtendue extends Depense {
  poste?: string;
  // Détail TVA
  montantHT?: number;
  tauxTVA?: TauxTVA;
  montantTVA?: number;
  tvaDeductible?: boolean;
  // Pièce justificative
  pieceJointe?: string;
  pieceJointeDetails?: {
    id: string;
    type: 'FACTURE' | 'AVOIR' | 'NOTE_CREDIT' | 'AUTRE';
    factureId?: string;
    fichierUrl?: string;
    fichierNom: string;
    dateAjout: string;
    reference?: string;
    montant?: number;
  };
  // Champs de validation
  statut?: 'BROUILLON' | 'EN_ATTENTE_VALIDATION' | 'VALIDEE' | 'REJETEE';
  budgetId?: string;
  dateValidation?: string;
  validateurId?: string;
  commentaireRejet?: string;
  dateCreation?: string;
  dateDerniereModification?: string;
}

/**
 * Mouvement bancaire
 */
export interface MouvementBancaire {
  id: string;
  date: string;
  libelle: string;
  montant: number;
  statut: 'A_CATEGORISER' | 'CATEGORISE';
  compteId?: string;
}

/**
 * Facture
 */
export interface Facture {
  id: string;
  date: string;
  fournisseur: string;
  montant: number;
  statut: 'A_PAYER' | 'PAYEE' | 'EN_ATTENTE_VALIDATION';
  iban?: string;
  bic?: string;
  reference?: string;
}

/**
 * Legacy Impaye interface
 */
export interface Impaye {
  id: string;
  lotId: string;
  proprietaire: string;
  montantDu: number;
  dateEcheance: string;
  retard: number;
  statut: ImpayeStatut | string;
  derniereRelance?: string;
}

/**
 * Versement fonds ALUR
 */
export interface VersementFondsALUR {
  id: string;
  lotId: string;
  coproprietaireId: string;
  montantVerse: number;
  dateVersement: string;
  annee: number;
  origine: OrigineFondsALUR | string;
}

/**
 * Solde fonds ALUR
 */
export interface SoldeFondsALUR {
  lotId: string;
  coproprietaireId: string;
  soldeActuel: number;
  versements: VersementFondsALUR[];
}

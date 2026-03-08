import { AppelFondsStatut } from '@/types/enums/statuts';

// Re-export pour compatibilité (deprecated, utiliser AppelFondsStatut)
// Note: 'SOLDE' and 'ANNULE' added for Supabase status mapping compatibility
export type StatutAppel = AppelFondsStatut | 'ENVOYE' | 'A_GENERER' | 'EN_PREPARATION' | 'SOLDE' | 'ANNULE';

export type ModeEnvoi = 'electronique' | 'email' | 'courrier';
export type StatutPaiement = 'NON_PAYE' | 'PARTIELLEMENT_PAYE' | 'PAYE';
export type StatutRecommande = 'NON_ENVOYE' | 'PREPARE' | 'ENVOYE' | 'LIVRE' | 'LU';
export type TypeAppel = 'fonctionnement' | 'travaux';

export interface AppelFonds {
  id: string;
  periodId?: string;
  dateExigibilite: string;
  dateEmission?: string;
  dateLimiteReglement: string;
  statut: StatutAppel | string;
  montantTotal: number;
  montantEncaisse?: number;
  description: string;
  periode: string;
  type: TypeAppel;
  budgetTravauxId?: string;
  devisUrl?: string;
  projetNom?: string;
  resolutionAGId?: string;
  resolutionAGNumero?: string;
  cleRepartitionId?: string;
  historiqueRelances?: RelanceAppel[];
}

export interface RelanceAppel {
  id: string;
  date: string;
  type: 'EMAIL' | 'COURRIER' | 'SMS';
  destinataires: string[];
  message?: string;
  statut: 'ENVOYEE' | 'EN_ATTENTE' | 'ECHEC';
}

export interface ResolutionAG {
  id: string;
  numero: string;
  titre: string;
  dateAG: string;
  montantVote: number;
  statut: 'ADOPTEE' | 'REJETEE';
}

export interface PaiementDetail {
  montantDu: number;
  montantPaye: number;
  statutPaiement: StatutPaiement;
  datePaiement?: string;
  modePaiement?: 'VIREMENT' | 'CHEQUE' | 'PRELEVEMENT' | 'ESPECES';
}

export interface RecommandeDetail {
  modeEnvoi: 'ELECTRONIQUE' | 'POSTAL';
  statut: StatutRecommande;
  datePrepare?: string;
  dateEnvoi?: string;
  dateLivraison?: string;
  dateLecture?: string;
  numeroSuivi?: string;
}

export interface CoproprietaireAppel {
  id: string;
  nom: string;
  lot: string;
  tantiemes: number;
  montantIndividuel: number;
  modeEnvoiRecommande: ModeEnvoi;
  modeEnvoiValide?: ModeEnvoi;
  envoye: boolean;
  email?: string;
  adresse?: string;
  paiement?: PaiementDetail;
  recommande?: RecommandeDetail;
}

export interface GroupedAppelFonds {
  keyId: string;
  keyName: string;
  montantAnnuel: number;
  montantEncaisse: number;
  nbTrimestres: number;
  statutGlobal: StatutAppel | string;
  type: TypeAppel;
  periode: string;
  trimestres: AppelFonds[];
}

export interface AppelsFondsStats {
  totalAppels: number;
  montantTotal: number;
  montantEncaisse: number;
  tauxRecouvrement: number;
}

export interface AppelsFondsFilters {
  searchTerm: string;
  statutFilter: 'TOUS' | StatutAppel;
  typeFilter: 'TOUS' | TypeAppel;
}

export interface NewAppelForm {
  description: string;
  periode: string;
  dateExigibilite: string;
  dateEmission: string;
  dateLimiteReglement: string;
  type: TypeAppel;
  montantTotal: string;
  budgetTravauxId: string;
  projetNom: string;
  cleRepartitionId: string;
}

export interface GestionModalFilters {
  searchCopro: string;
  paiementFilter: 'TOUS' | StatutPaiement;
  recommandeFilter: 'TOUS' | StatutRecommande;
}

// === RÈGLES DE MODIFICATION ===

/** Statut de génération d'un appel de fonds */
export type StatutGeneration = 'brouillon' | 'genere';

/** Actions autorisées selon le statut */
export type ActionAppel = 'modifier' | 'supprimer' | 'generer' | 'suivre' | 'relancer' | 'annuler';

/** Champs modifiables selon le statut */
export interface ReglesModification {
  /** L'appel peut-il être modifié ? */
  estModifiable: boolean;
  /** Raison si non modifiable */
  raison?: string;
  /** Champs spécifiques éditables (si partiellement modifiable) */
  champsEditables: string[];
  /** Actions autorisées */
  actionsAutorisees: ActionAppel[];
}

/** Extension du type AppelFonds avec statut de génération */
export interface AppelFondsAvecGeneration extends AppelFonds {
  statutGeneration: StatutGeneration;
  dateGeneration?: string;
}

// === CALENDRIER OPTIMAL ET ALERTES ===

/** Délais recommandés en jours avant échéance */
export const DELAIS_OPTIMAUX = {
  GENERATION: 45,      // J-45 : Génération de l'appel
  ENVOI: 40,           // J-40 : Envoi aux copropriétaires
  RELANCE_1: 15,       // J-15 : 1ère relance si non payé
  RELANCE_2: 5,        // J-5 : 2ème relance urgente
  DELAI_MINIMUM: 30,   // Délai minimum acceptable pour paiement
  DELAI_CRITIQUE: 15,  // Délai critique (urgence)
} as const;

/** Niveau de criticité d'une alerte */
export type NiveauAlerte = 'info' | 'warning' | 'critical';

/** Type d'alerte pour les appels de fonds */
export type TypeAlerteAppel =
  | 'GENERATION_EN_RETARD'    // Appel non généré alors qu'il devrait l'être
  | 'DELAI_INSUFFISANT'       // Délai < 30 jours entre émission et échéance
  | 'ENVOI_EN_RETARD'         // Appel généré mais non envoyé
  | 'RELANCE_1_DUE'           // Relance J-15 à faire
  | 'RELANCE_2_DUE'           // Relance J-5 à faire
  | 'ECHEANCE_IMMINENTE';     // Échéance dans moins de 7 jours

/** Alerte de délai pour un appel de fonds */
export interface AlerteDelai {
  id: string;
  appelId: string;
  appelDescription: string;
  type: TypeAlerteAppel;
  niveau: NiveauAlerte;
  message: string;
  dateEcheance: string;
  joursRestants: number;
  action?: {
    label: string;
    handler: string; // Nom de la fonction à appeler
  };
}

/** Calendrier optimal pour un appel de fonds */
export interface CalendrierAppel {
  appelId: string;
  dateEcheance: string;
  dates: {
    generationOptimale: string;    // J-45
    envoiOptimal: string;          // J-40
    relance1: string;              // J-15
    relance2: string;              // J-5
  };
  statuts: {
    generationFaite: boolean;
    dateGeneration?: string;
    envoiFait: boolean;
    dateEnvoi?: string;
    relance1Faite: boolean;
    dateRelance1?: string;
    relance2Faite: boolean;
    dateRelance2?: string;
  };
  alertes: AlerteDelai[];
}

/** Statistiques des alertes */
export interface StatsAlertes {
  total: number;
  critiques: number;
  warnings: number;
  infos: number;
}

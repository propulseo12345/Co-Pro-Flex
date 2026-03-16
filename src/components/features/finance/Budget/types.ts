import { BudgetStatut } from '@/types/enums/statuts';

export type BudgetTab = 'fonctionnement' | 'travaux' | 'alur';
export type PosteBudget =
  | 'eau'
  | 'electricite'
  | 'assurance'
  | 'menage'
  | 'ascenseur'
  | 'espaces_verts'
  | 'divers'
  // Postes spécifiques maintenance
  | 'plomberie'
  | 'chauffage'
  | 'toiture'
  | 'parking'
  | 'securite'
  | 'parties_communes';

// Couleurs pour le graphique
export const POSTE_COLORS: Record<PosteBudget, string> = {
  eau: '#3B82F6',
  electricite: '#F59E0B',
  assurance: '#10B981',
  menage: '#8B5CF6',
  ascenseur: '#EC4899',
  espaces_verts: '#14B8A6',
  divers: '#6B7280',
  // Couleurs pour postes maintenance
  plomberie: '#0EA5E9',
  chauffage: '#F97316',
  toiture: '#84CC16',
  parking: '#A855F7',
  securite: '#EF4444',
  parties_communes: '#64748B'
};

// Labels pour les postes budgétaires
export const POSTE_LABELS: Record<PosteBudget, string> = {
  eau: 'Eau',
  electricite: 'Électricité',
  assurance: 'Assurance',
  menage: 'Ménage',
  ascenseur: 'Ascenseur',
  espaces_verts: 'Espaces verts',
  divers: 'Divers',
  plomberie: 'Plomberie',
  chauffage: 'Chauffage',
  toiture: 'Toiture',
  parking: 'Parking',
  securite: 'Sécurité',
  parties_communes: 'Parties communes'
};

export interface DepenseBudget {
  id: string;
  libelle: string;
  date: string;
  montant: number;
  poste?: PosteBudget;
  compteCharge?: string;
  fournisseur?: string;
  statut?: string;
  pieceJointe?: string;
  montantHT?: number;
  tauxTVA?: number;
  montantTVA?: number;
}

/**
 * Types de pièces justificatives pour les dépenses
 */
export type TypePieceJointe = 'FACTURE' | 'AVOIR' | 'NOTE_CREDIT' | 'AUTRE';

/**
 * Pièce justificative attachée à une dépense
 */
export interface PieceJointeDepense {
  id: string;
  type: TypePieceJointe;
  factureId?: string;      // Si liée à une facture existante du module Factures
  fichierUrl?: string;     // Si upload direct
  fichierNom: string;
  dateAjout: string;
  reference?: string;
  montant?: number;
}

export interface PosteBudgetData {
  poste: PosteBudget;
  label: string;
  budgetVote: number;
  consomme: number;
}

/** Infer PosteBudget code from a label (case-insensitive, partial match) */
export function inferPosteCode(label: string): PosteBudget {
  const l = label.toLowerCase().trim();
  if (l.includes('eau'))         return 'eau';
  if (l.includes('électricité') || l.includes('electricit') || l.includes('éclairage')) return 'electricite';
  if (l.includes('assurance'))   return 'assurance';
  if (l.includes('ménage') || l.includes('menage') || l.includes('nettoyage') || l.includes('gardiennage')) return 'menage';
  if (l.includes('ascenseur'))   return 'ascenseur';
  if (l.includes('espaces verts') || l.includes('entretien')) return 'espaces_verts';
  if (l.includes('plomberie'))   return 'plomberie';
  if (l.includes('chauffage'))   return 'chauffage';
  if (l.includes('toiture'))     return 'toiture';
  if (l.includes('parking'))     return 'parking';
  if (l.includes('sécurité') || l.includes('securite') || l.includes('télésurveillance')) return 'securite';
  if (l.includes('parties communes')) return 'parties_communes';
  return 'divers';
}

export interface Prestataire {
  id: string;
  nom: string;
  siret: string;
  contact: string;
  telephone: string;
  email: string;
  metier: string;
}

export interface EtapeTravaux {
  id: string;
  ordre: number;
  titre: string;
  description: string;
  dateDebutPrevue: string;
  dateFinPrevue: string;
  dateDebutReelle?: string;
  dateFinReelle?: string;
  statut: 'A_FAIRE' | 'EN_COURS' | 'TERMINE' | 'EN_RETARD';
  prestataireId?: string;
  montantPrevu: number;
  montantReel?: number;
}

export interface DocumentTravaux {
  id: string;
  type: 'DEVIS' | 'FACTURE' | 'CONTRAT' | 'PV_RECEPTION' | 'PHOTO' | 'PLAN' | 'AUTRE';
  nom: string;
  dateAjout: string;
  url: string;
  taille?: string;
}

export interface EvenementHistorique {
  id: string;
  date: string;
  type: 'VOTE_AG' | 'DEVIS_ACCEPTE' | 'DEBUT_TRAVAUX' | 'ETAPE_TERMINEE' | 'FACTURE_RECUE' | 'PAIEMENT' | 'FIN_TRAVAUX' | 'PV_RECEPTION' | 'AUTRE';
  titre: string;
  description: string;
  montant?: number;
  documentId?: string;
}

export interface AppelFonds {
  id: string;
  numero: number;
  montant: number;
  date: string;
  dateEcheance?: string;
  description?: string;
  statut: 'ENVOYE' | 'PAYE' | 'EN_ATTENTE';
  totalPaid?: number;
  totalUnpaid?: number;
  label?: string;
  callStatus?: string;
}

/**
 * Mode d'échéancier pour les appels de fonds travaux
 */
export type ModeEcheancier = 'UNIQUE' | 'SEMESTRIEL' | 'TRIMESTRIEL' | 'PERSONNALISE';

/**
 * Échéance prévue dans l'échéancier
 */
export interface EcheancePrevue {
  numero: number;        // Numéro de l'appel (1, 2, 3...)
  montant: number;       // Montant prévu pour cet appel
  dateEcheance: string;  // Date d'échéance prévue
  description?: string;  // Ex: "1er trimestre", "Appel initial 50%"
}

/**
 * Échéancier des appels de fonds voté en AG
 */
export interface EcheancierTravaux {
  mode: ModeEcheancier;
  nombreAppels: number;           // Nombre total d'appels prévus
  echeancesPrevues: EcheancePrevue[];  // Liste des échéances
  dateDebutEcheancier: string;    // Date de début (souvent date du vote AG)
  resolutionAGId?: string;        // Référence à la résolution AG
}

export interface DevisDocument {
  id: string;
  nom: string;
  url: string;
  montant: number;
  dateAjout: string;
  prestataireId?: string;
  prestataireNom?: string;
  taille?: string;
  /** Fichier original (pour upload Supabase Storage) */
  file?: File;
}

export interface BudgetTravaux {
  id: string;
  titre: string;
  description: string;
  typeTravaux?: string;
  budgetVote: number;
  devisAssocie: number;
  consomme: number;
  statut: 'A_VENIR' | 'EN_COURS' | 'TERMINE';
  dateVote: string;
  cleRepartitionId: string;
  echeancier?: EcheancierTravaux;  // Échéancier voté en AG
  appelsDeFonds: AppelFonds[];
  devisDocuments?: DevisDocument[];
  prestataires?: Prestataire[];
  etapes?: EtapeTravaux[];
  documents?: DocumentTravaux[];
  historique?: EvenementHistorique[];
}

export interface TransfertALUR {
  id: string;
  montant: number;
  date: string;
  destination: 'COMPTE_COURANT' | 'BUDGET_TRAVAUX';
  budgetTravauxId?: string;
  description: string;
}

export interface FondsALUR {
  soldeActuel: number;
  cotisationAnnuelle: number;
  pourcentageBudget: number;
  historiqueTransferts: TransfertALUR[];
}

export interface ContributionALUR {
  id: string;
  date: string;
  montant: number;
  periode: string;
  statut: 'PAYEE' | 'EN_ATTENTE' | 'EN_RETARD';
}

export interface HistoriqueProprietaire {
  proprietaire: string;
  dateDebut: string;
  dateFin?: string;
  contributionsCumulees: number;
}

export interface CoproprietaireALUR {
  id: string;
  nom: string;
  lot: string;
  tantiemes: number;
  cotisationAnnuelle: number;
  totalContributions: number;
  historiqueContributions: ContributionALUR[];
  historiqueProprietaires: HistoriqueProprietaire[];
}

export interface ResolutionAG {
  id: string;
  numero: string;
  titre: string;
  dateAG: string;
  type: 'BUDGET_FONCTIONNEMENT' | 'BUDGET_TRAVAUX' | 'FONDS_ALUR';
  montantVote: number;
  majorite: string;
  statut: 'EN_ATTENTE' | 'ADOPTEE' | 'REJETEE' | 'REPORTEE';
  budgetId?: string;
}

export interface LigneBudget {
  poste: string;
  montantN: number;
  montantN1: number;
  evolution: number;
}

export interface NouveauBudgetForm {
  annee: number;
  type: 'fonctionnement' | 'travaux';
  nom?: string;
  resolutionId?: string;
  montantTotal: number;
  statut: BudgetStatut;
  lignesBudget: LigneBudget[];
  // Champs spécifiques aux budgets travaux
  typeTravaux?: string;
  description?: string;
  devisDocuments?: DevisDocument[];
  paymentScheduleConfig?: PaymentScheduleConfig;
}

export interface NouvelAppelFondsForm {
  montant: number;
  dateEcheance: string;
  description?: string;
}

// =============================================
// Types pour l'échéancier de paiement prestataire
// =============================================

export type PaymentPhaseStatus = 'pending' | 'awaiting_invoice' | 'paid';

export interface PaymentPhase {
  id: string;
  budgetId: string;
  phaseNumber: number;
  label: string;
  percentage: number;
  amount: number;
  dueDate?: string;
  status: PaymentPhaseStatus;
  paidDate?: string;
  invoiceRef?: string;
  documentId?: string;
  serviceOrderId?: string;
  isRetention: boolean;
  retentionReleaseDate?: string;
  notes?: string;
}

export interface PaymentScheduleConfig {
  templateId: string;
  withRetention: boolean;
  phases: {
    label: string;
    percentage: number;
    dueDate?: string;
  }[];
}

// Utilitaires
export const getProgressColor = (consomme: number, budget: number): string => {
  const percentage = (consomme / budget) * 100;
  if (percentage >= 100) return 'var(--danger)';
  if (percentage >= 90) return 'var(--warning)';
  if (percentage >= 70) return 'var(--info)';
  return 'var(--success)';
};

export const getProgressPercentage = (consomme: number, budget: number): number => {
  return Math.min((consomme / budget) * 100, 100);
};

// =============================================
// Types pour le graphique de répartition interactif
// =============================================

/**
 * Données pour un segment du graphique de répartition
 */
export interface DonneesRepartition {
  [key: string]: string | number;  // Index signature pour Recharts
  posteId: PosteBudget;
  poste: string;           // Label affiché
  montant: number;
  pourcentage: number;
  couleur: string;
  nombreDepenses: number;
}

/**
 * État du filtre par poste
 */
export interface FiltrePoste {
  posteId: PosteBudget | null;
  posteLabel: string | null;
  posteCouleur: string | null;
}

/**
 * Calcule le montant total appelé (appels envoyés ou payés)
 */
export const getBudgetAppele = (appelsDeFonds: AppelFonds[]): number => {
  return appelsDeFonds
    .filter(a => a.statut === 'ENVOYE' || a.statut === 'PAYE')
    .reduce((sum, a) => sum + a.montant, 0);
};

/**
 * Calcule le restant à appeler (budget voté - appelé)
 */
export const getRestantAAppeler = (budgetVote: number, appelsDeFonds: AppelFonds[]): number => {
  return budgetVote - getBudgetAppele(appelsDeFonds);
};

/**
 * Récupère le prochain appel prévu selon l'échéancier
 * Retourne null si tous les appels ont été générés ou si pas d'échéancier
 */
export const getProchainAppelPrevu = (travaux: BudgetTravaux): EcheancePrevue | null => {
  if (!travaux.echeancier) return null;

  const appelsGeneres = travaux.appelsDeFonds.length;
  const prochainNumero = appelsGeneres + 1;

  // Trouver l'échéance correspondante au prochain numéro
  const prochaineEcheance = travaux.echeancier.echeancesPrevues.find(
    e => e.numero === prochainNumero
  );

  return prochaineEcheance || null;
};

/**
 * Vérifie si tous les appels prévus ont été générés
 */
export const tousAppelsGeneres = (travaux: BudgetTravaux): boolean => {
  if (!travaux.echeancier) return true;
  return travaux.appelsDeFonds.length >= travaux.echeancier.nombreAppels;
};

/**
 * Récupère le libellé du mode d'échéancier
 */
export const getModeEcheancierLabel = (mode: ModeEcheancier): string => {
  const labels: Record<ModeEcheancier, string> = {
    UNIQUE: 'Appel unique',
    SEMESTRIEL: 'Semestriel (2 appels)',
    TRIMESTRIEL: 'Trimestriel (4 appels)',
    PERSONNALISE: 'Personnalisé',
  };
  return labels[mode];
};

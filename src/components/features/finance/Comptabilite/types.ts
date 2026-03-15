export type TabCompta = 'grand-livre' | 'livre-comptable' | 'balance' | 'compte-gestion' | 'annexe-1' | 'annexe-2' | 'annexe-3' | 'annexe-4' | 'annexe-5';

export interface AccountWithBalance {
  code: string;
  name: string;
  accountType: string;
  debit: number;
  credit: number;
}
export type TypeOperation = 'DEBIT' | 'CREDIT';
export type TypeDepense = 'eau' | 'electricite' | 'entretien' | 'assurance' | 'travaux' | 'menage' | 'ascenseur' | 'divers';

/**
 * Type de compte comptable selon le PCG Copropriété
 * - ACTIF: Débit = augmentation, Crédit = diminution (comptes 2, 3, 5, charges 6)
 * - PASSIF: Crédit = augmentation, Débit = diminution (comptes 1, 4 fournisseurs)
 * - CHARGE: Débit = augmentation, Crédit = diminution (comptes 6)
 * - PRODUIT: Crédit = augmentation, Débit = diminution (comptes 7)
 */
export type TypeCompte = 'ACTIF' | 'PASSIF' | 'CHARGE' | 'PRODUIT';

export interface OperationComptable {
  id: string;
  date: string;
  libelle: string;
  compte: string;
  compteLabel: string;
  typeCompte: TypeCompte;
  debit: number;
  credit: number;
  solde?: number; // Calculé dynamiquement, optionnel
  factureLiee?: string;
  mouvementBancaireLie?: string;
  reference?: string;
  numeroPiece?: string; // Numéro de pièce comptable (AF, FAC, REG, OD, AN...)
}

export interface Depense {
  id: string;
  date: string;
  libelle: string;
  fournisseur: string;
  montant: number;
  typeDepense: TypeDepense;
  compte: string;
  compteLabel: string;
  factureLiee?: string;
  mouvementBancaireLie?: string;
  budgetPrevu?: number;
  budgetLie?: string;
  appelFondsLie?: string;
}

export interface HistoriqueModification {
  id: string;
  date: string;
  utilisateur: string;
  action: 'CREATION' | 'MODIFICATION' | 'SUPPRESSION' | 'VALIDATION' | 'CATEGORISATION';
  elementType: 'OPERATION' | 'DEPENSE';
  elementId: string;
  description: string;
  ancienneValeur?: string;
  nouvelleValeur?: string;
}

export interface MouvementNonCategorise {
  id: string;
  date: string;
  libelle: string;
  montant: number;
  type: 'ENTREE' | 'SORTIE';
}

export type ApprovalStatus = 'open' | 'closed' | 'approved' | 'rejected';

export interface EtatCloture {
  annee: number;
  estCloturee: boolean;
  approvalStatus: ApprovalStatus;
  dateValidation?: string;
  validePar?: string;
  mouvementsNonCategorises: number;
  alertes: string[];
}

/**
 * Ligne de balance comptable
 * Affiche pour chaque compte : solde ouverture, mouvements période, solde clôture
 */
export interface LigneBalance {
  compte: string;
  compteLabel: string;
  typeCompte: TypeCompte;
  classe: string; // Classe comptable (1-7)
  soldeOuvertureDebit: number;
  soldeOuvertureCredit: number;
  mouvementDebit: number;
  mouvementCredit: number;
  soldeClotureDebit: number;
  soldeClotureCredit: number;
  // Comparaison N-1 (optionnel)
  soldeN1Debit?: number;
  soldeN1Credit?: number;
  variationPourcent?: number;
}

// ============================================================================
// ANNEXES COMPTABLES - Format légal (Décret n°2005-240)
// Types alignés sur le format Matera / réglementaire
// ============================================================================

// Shared types for annexe data
export interface LigneCompte {
  compte: string;
  libelle: string;
  exercice_precedent: number;
  exercice_clos: number;
}

export interface TotalSection {
  exercice_precedent: number;
  exercice_clos: number;
}

/**
 * Annexe 1 - État financier après répartition
 * Section I : Trésorerie (50, 51) + Provisions (12, 105, 1031)
 * Section II : Créances / Dettes (40, 47, 450)
 */
export interface AnnexeData1 {
  section_i: {
    tresorerie: LigneCompte[];
    total_tresorerie: TotalSection;
    provisions: LigneCompte[];
    total_provisions: TotalSection;
  };
  section_ii: {
    creances: LigneCompte[];
    total_creances: TotalSection;
    dettes: LigneCompte[];
    total_dettes: TotalSection;
  };
  total_general_creances: TotalSection;
  total_general_dettes: TotalSection;
}

export interface DetailCopro {
  nom: string;
  solde_avant_regularisation: number;
  regularisation: number;
  solde_apres_regularisation: number;
}

export interface AnnexeData1DetailCopros {
  copros: DetailCopro[];
  total: { solde_avant: number; regularisation: number; solde_apres: number };
}

/**
 * Annexe 2 & 3 - 5 colonnes légales
 * Exercice précédent approuvé | Exercice clos budget voté | Exercice clos réalisé |
 * BP en cours voté | BP à voter
 */
export interface Ligne5Colonnes {
  compte?: string;
  libelle?: string;
  type?: 'charge' | 'produit';
  ex_precedent_approuve: number;
  ex_clos_budget_vote: number;
  ex_clos_realise: number;
  bp_en_cours_vote: number;
  bp_a_voter: number;
}

export interface AnnexeData2 {
  charges_courantes: Ligne5Colonnes[];
  sous_total_charges: Ligne5Colonnes;
  solde_charges: Ligne5Colonnes;
  total_i_charges: Ligne5Colonnes;
  produits_courants: Ligne5Colonnes[];
  sous_total_produits: Ligne5Colonnes;
  charges_travaux: Ligne5Colonnes[];
}

export interface CleAnnexe3 {
  nom: string;
  lignes: Ligne5Colonnes[];
  total_charges: Ligne5Colonnes;
  total_produits: Ligne5Colonnes;
  total_net: Ligne5Colonnes;
}

export interface AnnexeData3 {
  cles: CleAnnexe3[];
  total_general: Ligne5Colonnes;
}

/**
 * Annexe 4 - Travaux et opérations exceptionnelles
 * Colonnes : Dépenses votées / Réalisées / Provisions appelées / Solde
 */
export interface LigneAnnexe4 {
  libelle: string;
  depenses_votees: number;
  depenses_realisees: number;
  provisions_appelees: number;
  solde: number;
}

export interface AnnexeData4 {
  operations: LigneAnnexe4[];
  total: LigneAnnexe4;
}

/**
 * Annexe 5 - Travaux votés non clôturés
 * Colonnes A-F : Votés / Payés / Réalisés / Appels reçus / Solde en attente / Subventions
 */
export interface LigneAnnexe5 {
  libelle: string;
  date_ag: string;
  cle_repartition: string;
  travaux_votes_a: number;
  travaux_payes_b: number;
  travaux_realises_c: number;
  appels_recus_d: number;
  solde_attente_e: number;
  subventions_f: number;
}

export interface AnnexeData5 {
  operations: LigneAnnexe5[];
  total: Omit<LigneAnnexe5, 'libelle' | 'date_ag' | 'cle_repartition'>;
}

/**
 * KPIs aggreges depuis fn_dashboard_kpis
 * Combine annexe 1 (tresorerie, impayes, provisions, dettes),
 * annexe 2 (budget vote/realise), annexe 4 (travaux)
 */
export interface AnnexeKpis {
  tresorerie: number;
  total_impayes: number;
  provisions_travaux: number;
  dettes: number;
  budget_vote: number;
  budget_realise: number;
  budget_pct: number;
  travaux_en_cours: number;
  nb_travaux_ouverts: number;
}

export type GrandLivreViewMode = 'par-compte' | 'chronologique' | 'par-journal';

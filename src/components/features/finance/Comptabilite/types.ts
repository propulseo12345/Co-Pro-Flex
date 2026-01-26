export type TabCompta = 'grand-livre' | 'balance' | 'compte-gestion' | 'annexe-1' | 'annexe-2' | 'annexe-3' | 'annexe-4' | 'annexe-5';
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

export interface EtatCloture {
  annee: number;
  estCloturee: boolean;
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

// Types pour les Annexes comptables (Décret n°2005-240)

/**
 * Annexe 1 - État financier après répartition
 * Situation de trésorerie et des créances/dettes
 */
export interface LigneAnnexe1 {
  id: string;
  rubrique: string;
  sousRubrique?: string;
  montant: number;
  montantN1?: number;
  type: 'actif' | 'passif';
}

/**
 * Annexe 2 - Compte de gestion général
 * Synthèse des charges et produits de l'exercice
 */
export interface LigneAnnexe2 {
  id: string;
  compte: string;
  libelle: string;
  budgetVote: number;
  depensesReelles: number;
  ecart: number;
  pourcentageRealisation: number;
  categorie: 'charges-courantes' | 'charges-travaux' | 'charges-exceptionnelles' | 'produits';
}

/**
 * Annexe 3 - Compte de gestion pour opérations courantes
 * Détail par clé de répartition
 */
export interface LigneAnnexe3 {
  id: string;
  compte: string;
  libelle: string;
  cleRepartition: string;
  montantTotal: number;
  montantN1?: number;
  details?: { lot: string; tantieme: number; montant: number }[];
}

/**
 * Annexe 4 - Compte de gestion pour travaux et opérations exceptionnelles
 */
export interface LigneAnnexe4 {
  id: string;
  operationId: string;
  libelle: string;
  dateDebut: string;
  dateFin?: string;
  budgetVote: number;
  depensesEngagees: number;
  depensesReglees: number;
  soldeAFinancer: number;
  statut: 'en-cours' | 'terminee' | 'a-venir';
}

/**
 * Annexe 5 - État des dettes et créances
 * Situation détaillée vis-à-vis des tiers
 */
export interface LigneAnnexe5 {
  id: string;
  tiers: string;
  typeTiers: 'coproprietaire' | 'fournisseur' | 'syndic' | 'autre';
  nature: string;
  dateOrigine: string;
  dateEcheance?: string;
  montantInitial: number;
  montantRestant: number;
  type: 'creance' | 'dette';
  anciennete: number; // en jours
}

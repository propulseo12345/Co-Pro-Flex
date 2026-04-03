export type TypeMouvement = 'ENTREE' | 'SORTIE';
export type TypeCompte = 'courant' | 'travaux';
export type CategorieComptable = 'charge' | 'produit' | '';
export type StatutRapprochement = 'rapproche' | 'non_rapproche' | 'en_attente';

export type StatutSync = 'connecte' | 'deconnecte' | 'erreur' | 'en_cours';
export type ModeSync = 'automatique' | 'manuel';
export type TypeImport = 'csv' | 'ofx' | 'cfonb' | 'manual';

export interface HistoriqueSynchronisation {
  id: string;
  date: string;
  heure: string;
  mode: ModeSync;
  statut: 'succes' | 'echec' | 'partiel';
  nombreMouvements: number;
  message?: string;
  details?: {
    nouveauxMouvements: number;
    mouvementsMisAJour: number;
    erreurs: number;
  };
}

export interface StatutConnexionBancaire {
  statut: StatutSync;
  banque: string;
  derniereSynchronisation: string | null;
  prochaineSynchronisation: string | null;
  modeActif: ModeSync;
  messageErreur?: string;
  comptesConnectes: number;
  comptesTotal: number;
}

export type TypeEntiteLiee = 'facture' | 'appel_fonds' | 'coproprietaire' | 'fournisseur';

export interface EntiteLiee {
  type: TypeEntiteLiee;
  id: string;
  nom: string;
  reference?: string;
  montant?: number;
  details?: {
    dateEcheance?: string;
    statut?: string;
    periode?: string;
    lot?: string;
    tantiemes?: number;
    email?: string;
    telephone?: string;
  };
}

export interface MouvementBancaireBase {
  id: string;
  date: string;
  libelle: string;
  montant: number;
  type: TypeMouvement;
  categorise: boolean;
  compteComptable?: string;
  categorie?: CategorieComptable;
  fournisseur?: string;
  entiteLiee?: EntiteLiee;
  accountId: string;
  importSource?: 'csv' | 'ofx' | 'cfonb' | 'manual';
  matchRule?: 'auto' | 'manual' | 'rule-based';
  statutRapprochement: StatutRapprochement;
  ecritureRapprocheeId?: string;
}

export interface MouvementBancaire extends MouvementBancaireBase {
  solde: number;
  soldeValide: boolean;
}

export interface ErreurCoherence {
  mouvementId: string;
  date: string;
  soldeAttendu: number;
  soldeTrouve: number;
  ecart: number;
}

export interface SuggestionCategorie {
  id: string;
  type: 'appel_fonds' | 'fournisseur' | 'libelle' | 'historique';
  confiance: 'haute' | 'moyenne' | 'basse';
  raison: string;
  categorie: CategorieComptable;
  compte: string;
  compteLabel: string;
  entiteReference?: {
    type: 'appel_fonds' | 'facture' | 'coproprietaire' | 'fournisseur';
    id: string;
    nom: string;
    montant?: number;
  };
}

export interface AlerteMouvementNonCategorise {
  mouvementId: string;
  date: string;
  libelle: string;
  montant: number;
  joursNonCategorise: number;
  urgence: 'critique' | 'haute' | 'normale';
}

export interface StatutClotureMensuelle {
  mois: string;
  annee: number;
  mouvementsNonCategorises: number;
  peutCloturer: boolean;
  messageBlockage?: string;
}

export interface EcritureComptable {
  id: string;
  date: string;
  libelle: string;
  debit: number;
  credit: number;
  compte: string;
  journal: string;
  piece: string;
  rapproche: boolean;
  mouvementRapproche?: string;
}

export interface SuggestionRapprochement {
  targetType: 'supplier_payment' | 'payment' | 'ecriture';
  targetId: string;
  label: string;
  montant: number;
  confiance: 'haute' | 'moyenne' | 'basse';
  ecart: number;
}

export interface CompteBancaire {
  id: string;
  nom: string;
  type: TypeCompte;
  iban: string;
  soldeInitial: number;
  derniereMaj: string;
}

export interface EcartSoldes {
  soldeComptable: number;
  ecart: number;
  mouvementsNonRapproches: number;
  ecrituresNonRapprochees: number;
}

export interface StatsNonCategorises {
  total: number;
  montantTotal: number;
  entrees: number;
  sorties: number;
}

export interface IReconciliationPeriod {
  id: string;
  accountId: string;
  periodStart: string;
  periodEnd: string;
  statementBalance: number;
  computedBalance: number;
  variance: number;
  status: 'draft' | 'in_progress' | 'reconciled' | 'validated';
  validatedAt?: string;
}

export interface ICompteComptable {
  code: string;
  label: string;
  categorie: 'charge' | 'produit';
  keywords: string[];
}

export type WorkflowMode = 'table' | 'workflow';
export type WorkflowTab = 'import' | 'categorisation' | 'rapprochement' | 'cloture';

// Types pour les données Supabase (matching/rapprochement)
export interface SupplierForMatching {
  id: string;
  name: string;
}

export interface InvoiceForMatching {
  id: string;
  supplier_id: string | null;
  supplier_name: string | null;
  invoice_number: string | null;
  invoice_date: string;
  due_date: string | null;
  label: string | null;
  total_amount: number;
  status: string;
}

export interface PaymentForMatching {
  id: string;
  lot_id: string | null;
  amount: number;
  payment_date: string;
  method: string;
  reference: string | null;
}

export interface MatchingContext {
  suppliers: SupplierForMatching[];
  pendingInvoices: InvoiceForMatching[];
  allMouvements: MouvementBancaireBase[];
}

export interface RapprochementContext {
  pendingInvoices: InvoiceForMatching[];
  unmatchedPayments: PaymentForMatching[];
}

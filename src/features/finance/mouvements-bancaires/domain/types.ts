export type TypeMouvement = 'ENTREE' | 'SORTIE';
export type TypeCompte = 'courant' | 'travaux';
export type CategorieComptable = 'charge' | 'produit' | '';
export type StatutRapprochement = 'rapproche' | 'non_rapproche' | 'en_attente';

export type StatutSync = 'connecte' | 'deconnecte' | 'erreur' | 'en_cours';
export type ModeSync = 'automatique' | 'manuel';
export type TypeImport = 'csv' | 'ofx' | 'qif';

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
  ecritureId: string;
  confiance: 'haute' | 'moyenne' | 'basse';
  raison: string;
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

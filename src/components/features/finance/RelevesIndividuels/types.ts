export interface LotReleve {
  id: string;
  numero: string;
  type: string;
  tantiemesGeneraux: number;
  tantiemesAscenseur?: number;
  tantiemesChauffage?: number;
}

export interface CoproprietaireReleve {
  id: string;
  nom: string;
  prenom: string;
  email?: string;
  telephone?: string;
  adresse: string;
  lots: LotReleve[];
  totalTantiemes: number;
  soldeActuel: number;
  soldeN1?: number;
}

export interface LigneCharge {
  id: string;
  libelle: string;
  cleRepartition: string;
  cleRepartitionId: string;
  montantTotal: number;
  tantiemesAppliques: number;
  montantIndividuel: number;
  montantN1?: number;
}

export interface LigneAppelFonds {
  id: string;
  description: string;
  periode: string;
  dateEcheance: string;
  montantDu: number;
  montantPaye: number;
  datePaiement?: string;
  statut: 'PAYE' | 'PARTIELLEMENT_PAYE' | 'NON_PAYE' | 'EN_ATTENTE';
}

export interface ReleveIndividuel {
  id: string;
  coproprietaireId: string;
  coproprietaire: CoproprietaireReleve;
  exercice: string;
  dateGeneration: string;

  // Synthèse
  totalCharges: number;
  totalAppeles: number;
  totalPaye: number;
  solde: number;

  // Comparatif N-1
  totalChargesN1?: number;
  variationCharges?: number;

  // Détail par clé de répartition
  detailParCle: DetailParCle[];

  // Historique appels
  appelsFonds: LigneAppelFonds[];

  // Lignes de charges détaillées
  lignesCharges: LigneCharge[];
}

export interface DetailParCle {
  cleId: string;
  cleNom: string;
  tantiemes: number;
  totalTantiemesCle: number;
  quotePart: number;
  montantN: number;
  montantN1?: number;
  variation?: number;
  postes: PosteDetailCle[];
}

export interface PosteDetailCle {
  id: string;
  libelle: string;
  montantTotal: number;
  montantIndividuel: number;
  montantN1?: number;
}

export interface CleRepartition {
  id: string;
  nom: string;
  description?: string;
  totalTantiemes: number;
}

export interface RelevesFilters {
  search: string;
  exercice: string;
  statutSolde: 'tous' | 'crediteur' | 'debiteur' | 'equilibre';
  lotType?: string;
}

export interface RelevesStats {
  totalCoproprietaires: number;
  totalSoldeGlobal: number;
  nombreDebiteurs: number;
  nombreCrediteurs: number;
  montantTotalDu: number;
  montantTotalPaye: number;
}

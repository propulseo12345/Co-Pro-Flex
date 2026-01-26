export type StatutRapprochement = 'RAPPROCHE' | 'NON_RAPPROCHE' | 'ECART' | 'EN_ATTENTE';
export type SourceLigne = 'RELEVE' | 'LOGICIEL' | 'LES_DEUX';
export type TypeEcart = 'DANS_RELEVE_UNIQUEMENT' | 'DANS_LOGICIEL_UNIQUEMENT' | 'MONTANT_DIFFERENT' | 'DATE_DIFFERENTE';

export interface LigneReleve {
  id: string;
  date: string;
  libelle: string;
  montant: number;
  reference?: string;
}

export interface LigneLogiciel {
  id: string;
  date: string;
  libelle: string;
  montant: number;
  categorise: boolean;
  compteComptable?: string;
}

export interface LigneRapprochement {
  id: string;
  ligneReleve?: LigneReleve;
  ligneLogiciel?: LigneLogiciel;
  statut: StatutRapprochement;
  source: SourceLigne;
  typeEcart?: TypeEcart;
  confianceMatch?: number;
  valideManuellemnt?: boolean;
  dateValidation?: string;
}

export interface SessionRapprochement {
  id: string;
  mois: number;
  annee: number;
  dateDebut: string;
  dateFin?: string;
  statut: 'EN_COURS' | 'VALIDE' | 'CERTIFIE';
  soldeReleveDebut: number;
  soldeReleveFin: number;
  soldeLogicielDebut: number;
  soldeLogicielFin: number;
  nombreLignesRapprochees: number;
  nombreEcarts: number;
  certifiePar?: string;
  dateCertification?: string;
}

export interface RapprochementStats {
  total: number;
  rapprochees: number;
  ecarts: number;
  dansReleveUniquement: number;
  dansLogicielUniquement: number;
  tauxRapprochement: number;
  soldeTheorique: number;
  ecartSolde: number;
  peutCertifier: boolean;
}

import { ID } from '../common';

export type AlerteSeverite = 'critique' | 'warning' | 'info';
export type AlerteType = 'IMPAYE' | 'FACTURE' | 'BUDGET' | 'RAPPROCHEMENT' | 'CONTRAT' | 'AG';

export interface IAlerteCopropriete {
  id: ID;
  type: AlerteType;
  severite: AlerteSeverite;
  titre: string;
  description: string;
  montant?: number;
  dateEcheance?: string;
  lien: string;
}

export interface ICoproprietePortefeuille {
  id: ID;
  nom: string;
  adresse: string;
  nombreLots: number;
  exerciceCourant: number;
  // Indicateurs financiers
  soldeDisponible: number;
  totalImpayes: number;
  nombreImpayes: number;
  tauxRecouvrement: number;
  // Factures
  facturesEnRetard: number;
  montantFacturesRetard: number;
  // Budget
  budgetTotal: number;
  budgetConsomme: number;
  budgetRestant: number;
  budgetAlerteRisque: boolean;
  // Rapprochement bancaire
  mouvementsNonRapproches: number;
  dernierRapprochement?: string;
  // Alertes
  alertes: IAlerteCopropriete[];
  // AG
  prochaineAG?: string; // date ISO
  // Criticité (calculé côté client)
  criticalityScore: number;
}

export interface IPortefeuilleKPIs {
  totalCoproprietes: number;
  totalLots: number;
  // Impayés
  totalImpayes: number;
  nombreCoproAvecImpayes: number;
  tauxRecouvrementGlobal: number;
  // Factures
  totalFacturesRetard: number;
  montantFacturesRetard: number;
  // Budgets
  budgetsARisque: number;
  budgetGlobalTotal: number;
  budgetGlobalConsomme: number;
  // Rapprochement
  coproNonRapprochees: number;
  mouvementsNonRapprochesTotal: number;
  // Alertes
  alertesCritiques: number;
  alertesWarning: number;
}

export interface IFiltresPortefeuille {
  exercice: number;
  periodeDebut?: string;
  periodeFin?: string;
  recherche: string;
  alertesSeulement: boolean;
  typeAlerte?: AlerteType;
}

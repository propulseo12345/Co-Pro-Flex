/**
 * Statuts des Assemblées Générales
 */
/** @deprecated Utiliser AgStatus de '@/lib/ag/types' à la place */
export enum AGStatut {
  BROUILLON = 'BROUILLON',
  CONVOQUEE = 'CONVOQUEE',
  EN_COURS = 'EN_COURS',
  SESSION_ACTIVE = 'SESSION_ACTIVE',
  PV_GENERE = 'PV_GENERE',
  PV_SIGNE = 'PV_SIGNE',
  PV_DIFFUSE = 'PV_DIFFUSE',
  FINALISEE = 'FINALISEE',
  TERMINEE = 'TERMINEE',
  ANNULEE = 'ANNULEE'
}

/**
 * Statuts des Résolutions
 */
export enum ResolutionStatut {
  BROUILLON = 'BROUILLON',
  SOUMISE = 'SOUMISE',
  VOTEE = 'VOTEE',
  ADOPTEE = 'ADOPTEE',
  REJETEE = 'REJETEE'
}

/**
 * Statuts des Ordres de Service
 * Workflow complet : Brouillon → Envoyé → Accepté/Refusé → Planifié → En cours → Réalisé → Facturé → Payé → Clôturé
 */
export enum OrdreServiceStatut {
  BROUILLON = 'BROUILLON',
  A_ENVOYER = 'A_ENVOYER',
  ENVOYE = 'ENVOYE',
  ACCEPTE = 'ACCEPTE',
  REFUSE = 'REFUSE',
  PLANIFIE = 'PLANIFIE',
  EN_COURS = 'EN_COURS',
  REALISE = 'REALISE',
  FACTURE = 'FACTURE',
  PAYE = 'PAYE',
  CLOTURE = 'CLOTURE',
  ANNULE = 'ANNULE',
  // Legacy aliases pour compatibilité
  EN_ATTENTE_PRESTATAIRE = 'ENVOYE',
  INTERVENTION_PROGRAMMEE = 'PLANIFIE',
  INTERVENTION_REALISEE = 'REALISE'
}

/**
 * Labels des statuts d'ordres de service
 */
export const ORDRE_SERVICE_STATUT_LABELS: Record<string, string> = {
  BROUILLON: 'Brouillon',
  A_ENVOYER: 'À envoyer',
  ENVOYE: 'Envoyé',
  ACCEPTE: 'Accepté',
  REFUSE: 'Refusé',
  PLANIFIE: 'Planifié',
  EN_COURS: 'En cours',
  REALISE: 'Réalisé',
  FACTURE: 'Facturé',
  PAYE: 'Payé',
  CLOTURE: 'Clôturé',
  ANNULE: 'Annulé',
  // Legacy aliases
  EN_ATTENTE_PRESTATAIRE: 'Envoyé',
  INTERVENTION_PROGRAMMEE: 'Planifié',
  INTERVENTION_REALISEE: 'Réalisé'
};

/**
 * Couleurs des statuts d'ordres de service
 */
export const ORDRE_SERVICE_STATUT_COLORS: Record<string, string> = {
  BROUILLON: '#6B7280',      // Gris
  A_ENVOYER: '#F59E0B',      // Orange
  ENVOYE: '#3B82F6',         // Bleu
  ACCEPTE: '#10B981',        // Vert
  REFUSE: '#EF4444',         // Rouge
  PLANIFIE: '#8B5CF6',       // Violet
  EN_COURS: '#F97316',       // Orange foncé
  REALISE: '#22C55E',        // Vert clair
  FACTURE: '#6366F1',        // Indigo
  PAYE: '#14B8A6',           // Teal
  CLOTURE: '#059669',        // Vert foncé
  ANNULE: '#DC2626'          // Rouge foncé
};

/**
 * Descriptions des statuts d'ordres de service
 */
export const ORDRE_SERVICE_STATUT_DESCRIPTIONS: Record<string, string> = {
  BROUILLON: 'Ordre en cours de rédaction',
  A_ENVOYER: 'Ordre prêt à être envoyé au prestataire',
  ENVOYE: 'Ordre envoyé, en attente de réponse du prestataire',
  ACCEPTE: 'Le prestataire a accepté l\'intervention',
  REFUSE: 'Le prestataire a refusé l\'intervention',
  PLANIFIE: 'Date d\'intervention confirmée par le prestataire',
  EN_COURS: 'Intervention en cours d\'exécution',
  REALISE: 'Intervention terminée, en attente de facture',
  FACTURE: 'Facture reçue, en attente de paiement',
  PAYE: 'Facture payée',
  CLOTURE: 'Ordre clôturé et archivé',
  ANNULE: 'Ordre annulé'
};

/**
 * Transitions autorisées pour les Ordres de Service
 */
export const ORDRE_SERVICE_TRANSITIONS: Record<string, string[]> = {
  [OrdreServiceStatut.BROUILLON]: [OrdreServiceStatut.A_ENVOYER, OrdreServiceStatut.ANNULE],
  [OrdreServiceStatut.A_ENVOYER]: [OrdreServiceStatut.ENVOYE, OrdreServiceStatut.BROUILLON, OrdreServiceStatut.ANNULE],
  [OrdreServiceStatut.ENVOYE]: [OrdreServiceStatut.ACCEPTE, OrdreServiceStatut.REFUSE, OrdreServiceStatut.ANNULE],
  [OrdreServiceStatut.ACCEPTE]: [OrdreServiceStatut.PLANIFIE, OrdreServiceStatut.ANNULE],
  [OrdreServiceStatut.REFUSE]: [OrdreServiceStatut.A_ENVOYER, OrdreServiceStatut.ANNULE],
  [OrdreServiceStatut.PLANIFIE]: [OrdreServiceStatut.EN_COURS, OrdreServiceStatut.ANNULE],
  [OrdreServiceStatut.EN_COURS]: [OrdreServiceStatut.REALISE, OrdreServiceStatut.ANNULE],
  [OrdreServiceStatut.REALISE]: [OrdreServiceStatut.FACTURE, OrdreServiceStatut.CLOTURE],
  [OrdreServiceStatut.FACTURE]: [OrdreServiceStatut.PAYE],
  [OrdreServiceStatut.PAYE]: [OrdreServiceStatut.CLOTURE],
  [OrdreServiceStatut.CLOTURE]: [],
  [OrdreServiceStatut.ANNULE]: []
};

/**
 * Ordre des statuts pour l'affichage de la timeline
 */
export const ORDRE_SERVICE_WORKFLOW_STEPS: string[] = [
  OrdreServiceStatut.BROUILLON,
  OrdreServiceStatut.A_ENVOYER,
  OrdreServiceStatut.ENVOYE,
  OrdreServiceStatut.ACCEPTE,
  OrdreServiceStatut.PLANIFIE,
  OrdreServiceStatut.EN_COURS,
  OrdreServiceStatut.REALISE,
  OrdreServiceStatut.FACTURE,
  OrdreServiceStatut.PAYE,
  OrdreServiceStatut.CLOTURE
];

/**
 * Vérifie si une transition est autorisée pour un ordre de service
 */
export function peutTransitionnerOS(
  statutActuel: string,
  nouveauStatut: string
): boolean {
  const transitions = ORDRE_SERVICE_TRANSITIONS[statutActuel];
  return transitions?.includes(nouveauStatut) ?? false;
}

/**
 * Retourne les transitions possibles depuis un statut donné
 */
export function getTransitionsPossiblesOS(statutActuel: string): string[] {
  return ORDRE_SERVICE_TRANSITIONS[statutActuel] || [];
}

/**
 * Statuts des Contrats
 */
export enum ContratStatut {
  ACTIF = 'ACTIF',
  RESILIE = 'RESILIE',
  A_RENOUVELER = 'A_RENOUVELER',
  EXPIRE = 'EXPIRE',
  BROUILLON = 'BROUILLON'
}

/**
 * Statuts des Impayés
 */
export enum ImpayeStatut {
  EN_RETARD = 'EN_RETARD',
  RELANCE_1 = 'RELANCE_1',
  RELANCE_2 = 'RELANCE_2',
  MISE_EN_DEMEURE = 'MISE_EN_DEMEURE',
  CONTENTIEUX = 'CONTENTIEUX',
  REGULARISE = 'REGULARISE'
}

/**
 * Statuts des Documents
 */
export enum DocumentStatut {
  BROUILLON = 'BROUILLON',
  DISPONIBLE = 'DISPONIBLE',
  SIGNE = 'SIGNE',
  ENVOYE = 'ENVOYE',
  EXPIRE = 'EXPIRE',
  ARCHIVE = 'ARCHIVE',
  EN_ATTENTE = 'EN_ATTENTE'
}

/**
 * Statuts des Budgets
 */
export enum BudgetStatut {
  BROUILLON = 'BROUILLON',
  EN_ATTENTE_APPROBATION = 'EN_ATTENTE_APPROBATION',
  APPROUVE = 'APPROUVE',
  REJETE = 'REJETE',
  CLOTURE = 'CLOTURE'
}

/**
 * Transitions autorisees pour les Budgets
 */
export const BUDGET_TRANSITIONS: Record<BudgetStatut, BudgetStatut[]> = {
  [BudgetStatut.BROUILLON]: [BudgetStatut.EN_ATTENTE_APPROBATION],
  [BudgetStatut.EN_ATTENTE_APPROBATION]: [BudgetStatut.APPROUVE, BudgetStatut.REJETE, BudgetStatut.BROUILLON],
  [BudgetStatut.APPROUVE]: [BudgetStatut.CLOTURE],
  [BudgetStatut.REJETE]: [BudgetStatut.BROUILLON],
  [BudgetStatut.CLOTURE]: []
}

/**
 * Statuts des Exercices comptables
 */
export enum ExerciceStatut {
  EN_COURS = 'EN_COURS',
  ARRETE = 'ARRETE',
  CLOTURE = 'CLOTURE'
}

/**
 * Statuts des Ventes
 */
export enum VenteStatut {
  EN_COURS = 'EN_COURS',
  TERMINEE = 'TERMINEE',
  ANNULEE = 'ANNULEE'
}

/**
 * Statuts de paiement
 */
export enum PaiementStatut {
  NON_PAYE = 'NON_PAYE',
  PARTIELLEMENT_PAYE = 'PARTIELLEMENT_PAYE',
  PAYE = 'PAYE'
}

/**
 * Statuts de recommandé
 */
export enum RecommandeStatut {
  NON_ENVOYE = 'NON_ENVOYE',
  PREPARE = 'PREPARE',
  ENVOYE = 'ENVOYE',
  LIVRE = 'LIVRE',
  LU = 'LU'
}

/**
 * Statuts de feuille de présence
 */
export enum FeuillePresenceStatut {
  BROUILLON = 'BROUILLON',
  OUVERTE = 'OUVERTE',
  CLOTUREE = 'CLOTUREE'
}

/**
 * Statuts de travaux prévisionnels
 */
export enum TravauxPrevisionnelStatut {
  A_L_ETUDE = 'A_L_ETUDE',
  PREVU = 'PREVU',
  VOTE = 'VOTE',
  EN_COURS = 'EN_COURS',
  TERMINE = 'TERMINE',
  REPORTE = 'REPORTE',
  ANNULE = 'ANNULE'
}

/**
 * Statuts de contrat syndic
 */
export enum ContratSyndicStatut {
  ACTIF = 'ACTIF',
  A_RENOUVELER = 'A_RENOUVELER',
  RESILIE = 'RESILIE'
}

/**
 * Statuts des Dépenses
 */
export enum DepenseStatut {
  BROUILLON = 'BROUILLON',
  EN_ATTENTE_VALIDATION = 'EN_ATTENTE_VALIDATION',
  VALIDEE = 'VALIDEE',
  REJETEE = 'REJETEE'
}

/**
 * Transitions autorisées pour les Dépenses
 */
export const DEPENSE_TRANSITIONS: Record<DepenseStatut, DepenseStatut[]> = {
  [DepenseStatut.BROUILLON]: [DepenseStatut.EN_ATTENTE_VALIDATION],
  [DepenseStatut.EN_ATTENTE_VALIDATION]: [DepenseStatut.VALIDEE, DepenseStatut.REJETEE],
  [DepenseStatut.VALIDEE]: [],
  [DepenseStatut.REJETEE]: [DepenseStatut.BROUILLON]
}

/**
 * Statuts de ligne d'appel de fonds
 */
export enum LigneAppelStatut {
  A_PAYER = 'A_PAYER',
  PARTIELLEMENT_PAYE = 'PARTIELLEMENT_PAYE',
  SOLDE = 'SOLDE',
  EN_CONTENTIEUX = 'EN_CONTENTIEUX'
}

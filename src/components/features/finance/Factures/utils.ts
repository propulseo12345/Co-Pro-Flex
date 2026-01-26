import { StatutFacture, TypeDepense, Facture, StatutFactureConfig, TransitionStatut, PosteBudget } from './types';
import type { PosteBudgetData } from '@/components/features/finance/Budget/types';
import { MOCK_FOURNISSEURS } from './data';

/**
 * Configuration complète des 5 statuts de facture
 * Workflow MVP : Brouillon → À valider → Validée → À payer → Payée
 */
export const STATUTS_FACTURE: Record<StatutFacture, StatutFactureConfig> = {
  BROUILLON: {
    valeur: 'BROUILLON',
    libelle: 'Brouillon',
    libelleCourt: 'Brouillon',
    description: 'Facture en cours de saisie',
    couleur: 'info',
    icone: 'FileEdit',
    ordre: 1,
  },
  A_VALIDER: {
    valeur: 'A_VALIDER',
    libelle: 'À valider',
    libelleCourt: 'À valider',
    description: 'Facture soumise pour validation',
    couleur: 'warning',
    icone: 'ClipboardCheck',
    ordre: 2,
  },
  VALIDEE: {
    valeur: 'VALIDEE',
    libelle: 'Validée',
    libelleCourt: 'Validée',
    description: 'Facture validée, prête pour paiement',
    couleur: 'info',
    icone: 'CheckCircle2',
    ordre: 3,
  },
  A_PAYER: {
    valeur: 'A_PAYER',
    libelle: 'À payer',
    libelleCourt: 'À payer',
    description: 'Facture en attente de paiement',
    couleur: 'warning',
    icone: 'Clock',
    ordre: 4,
  },
  PAYEE: {
    valeur: 'PAYEE',
    libelle: 'Payée',
    libelleCourt: 'Payée',
    description: 'Facture entièrement traitée',
    couleur: 'success',
    icone: 'CheckCircle',
    ordre: 5,
  },
};

/**
 * Transitions autorisées entre statuts
 * Workflow MVP : Brouillon → À valider → Validée → À payer → Payée
 */
export const TRANSITIONS_STATUT: TransitionStatut[] = [
  // Transitions normales (workflow principal)
  {
    de: 'BROUILLON',
    vers: 'A_VALIDER',
    action: 'Soumettre pour validation',
    condition: 'Tous les champs obligatoires doivent être renseignés',
    estAnnulation: false,
    requiertConfirmation: false,
  },
  {
    de: 'A_VALIDER',
    vers: 'VALIDEE',
    action: 'Valider la facture',
    condition: 'La ventilation comptable doit être complète',
    estAnnulation: false,
    requiertConfirmation: false,
  },
  {
    de: 'VALIDEE',
    vers: 'A_PAYER',
    action: 'Mettre en paiement',
    condition: 'La facture sera transmise au service comptable',
    estAnnulation: false,
    requiertConfirmation: false,
  },
  {
    de: 'A_PAYER',
    vers: 'PAYEE',
    action: 'Marquer comme payée',
    condition: 'Un règlement doit être saisi',
    estAnnulation: false,
    requiertConfirmation: false,
  },
  // Annulations (retour en arrière)
  {
    de: 'A_VALIDER',
    vers: 'BROUILLON',
    action: 'Retourner en brouillon',
    condition: 'La facture pourra être modifiée',
    estAnnulation: true,
    requiertConfirmation: true,
  },
  {
    de: 'VALIDEE',
    vers: 'A_VALIDER',
    action: 'Demander des modifications',
    condition: 'La facture devra être revalidée',
    estAnnulation: true,
    requiertConfirmation: true,
  },
  {
    de: 'A_PAYER',
    vers: 'VALIDEE',
    action: 'Annuler la mise en paiement',
    condition: 'La facture retournera en statut validée',
    estAnnulation: true,
    requiertConfirmation: true,
  },
  {
    de: 'PAYEE',
    vers: 'A_PAYER',
    action: 'Annuler le paiement',
    condition: 'Le règlement associé sera supprimé',
    estAnnulation: true,
    requiertConfirmation: true,
  },
];

/** Statut initial à la création d'une facture */
export const STATUT_INITIAL: StatutFacture = 'BROUILLON';

export const getStatutBadgeClass = (statut: StatutFacture): string => {
  switch (statut) {
    case 'BROUILLON':
      return 'statutBrouillon';
    case 'A_VALIDER':
      return 'statutAValider';
    case 'VALIDEE':
      return 'statutValidee';
    case 'A_PAYER':
      return 'statutAPayer';
    case 'PAYEE':
      return 'statutPayee';
  }
};

export const getStatutLabel = (statut: StatutFacture): string => {
  return STATUTS_FACTURE[statut].libelle;
};

export const getStatutLabelCourt = (statut: StatutFacture): string => {
  return STATUTS_FACTURE[statut].libelleCourt;
};

/**
 * Détermine si un statut est cliquable pour passer à l'étape suivante
 * - BROUILLON : clic pour soumettre
 * - A_VALIDER : clic pour valider
 * - VALIDEE : clic pour mettre en paiement
 * - A_PAYER : clic pour payer
 * - PAYEE : statut final, non cliquable
 */
export const isStatutClickable = (statut: StatutFacture): boolean => {
  return statut !== 'PAYEE';
};

/**
 * Retourne le prochain statut dans le workflow
 */
export const getNextStatut = (statut: StatutFacture): StatutFacture | null => {
  switch (statut) {
    case 'BROUILLON': return 'A_VALIDER';
    case 'A_VALIDER': return 'VALIDEE';
    case 'VALIDEE': return 'A_PAYER';
    case 'A_PAYER': return 'PAYEE';
    case 'PAYEE': return null;
  }
};

/**
 * Calcule le nombre de jours de retard (négatif = en avance)
 */
export const getJoursRetard = (dateEcheance: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const echeance = new Date(dateEcheance);
  echeance.setHours(0, 0, 0, 0);
  const diffTime = today.getTime() - echeance.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Récupère les transitions autorisées depuis un statut
 */
export const getTransitionsAutorisees = (
  statutActuel: StatutFacture,
  inclureAnnulations: boolean = false
): TransitionStatut[] => {
  return TRANSITIONS_STATUT.filter(
    (t) => t.de === statutActuel && (inclureAnnulations || !t.estAnnulation)
  );
};

/**
 * Vérifie si une transition est autorisée
 */
export const estTransitionAutorisee = (
  de: StatutFacture,
  vers: StatutFacture
): { autorisee: boolean; transition?: TransitionStatut; raison?: string } => {
  const transition = TRANSITIONS_STATUT.find((t) => t.de === de && t.vers === vers);

  if (!transition) {
    return {
      autorisee: false,
      raison: `Transition de "${STATUTS_FACTURE[de].libelle}" vers "${STATUTS_FACTURE[vers].libelle}" non autorisée`,
    };
  }

  return { autorisee: true, transition };
};

/**
 * Calcule la progression dans le workflow (0-100%)
 */
export const getProgression = (statut: StatutFacture): number => {
  const config = STATUTS_FACTURE[statut];
  const total = Object.keys(STATUTS_FACTURE).length;
  return Math.round((config.ordre / total) * 100);
};

/**
 * Récupère toutes les configurations triées par ordre
 */
export const getAllStatutsConfigs = (): StatutFactureConfig[] => {
  return Object.values(STATUTS_FACTURE).sort((a, b) => a.ordre - b.ordre);
};

export const detectTypeDepense = (facture: Facture): TypeDepense => {
  const fournisseur = facture.fournisseur.toLowerCase();
  if (fournisseur.includes('edf') || fournisseur.includes('électricité')) return 'electricite';
  if (fournisseur.includes('eau') || fournisseur.includes('veolia')) return 'eau';
  if (fournisseur.includes('assurance') || fournisseur.includes('allianz')) return 'assurance';
  if (fournisseur.includes('btp') || fournisseur.includes('travaux')) return 'travaux';
  if (fournisseur.includes('clean') || fournisseur.includes('ménage')) return 'menage';
  if (fournisseur.includes('ascenseur') || fournisseur.includes('otis')) return 'ascenseur';
  return 'divers';
};

/**
 * Mapping TypeDepense → PosteBudget
 * Les travaux sont gérés via un budget séparé
 */
export const TYPE_DEPENSE_TO_POSTE: Record<TypeDepense, PosteBudget | null> = {
  eau: 'eau',
  electricite: 'electricite',
  assurance: 'assurance',
  menage: 'menage',
  ascenseur: 'ascenseur',
  divers: 'divers',
  entretien: 'divers',
  travaux: null,
};

/**
 * Labels pour l'affichage des postes budgétaires
 */
export const POSTE_BUDGET_LABELS: Record<PosteBudget, string> = {
  eau: 'Eau',
  electricite: 'Électricité',
  assurance: 'Assurance',
  menage: 'Ménage',
  ascenseur: 'Ascenseur',
  espaces_verts: 'Espaces verts',
  divers: 'Divers',
  // Postes maintenance
  plomberie: 'Plomberie',
  chauffage: 'Chauffage',
  toiture: 'Toiture',
  parking: 'Parking',
  securite: 'Sécurité',
  parties_communes: 'Parties communes',
};

/**
 * Détection automatique du poste budgétaire basée sur le fournisseur
 */
export function detectPosteBudgetaire(facture: Partial<Facture>): PosteBudget | null {
  if (!facture.fournisseur) return null;
  const typeDepense = detectTypeDepense(facture as Facture);
  return TYPE_DEPENSE_TO_POSTE[typeDepense];
}

/**
 * Calcule le reste disponible pour un poste budgétaire
 */
export function getResteDisponible(
  poste: PosteBudget | undefined,
  postesBudget: PosteBudgetData[]
): number | null {
  if (!poste) return null;
  const posteBudget = postesBudget.find(p => p.poste === poste);
  if (!posteBudget) return null;
  return posteBudget.budgetVote - posteBudget.consomme;
}

/**
 * Vérifie si le montant dépasse le budget restant
 */
export function isDepassementBudget(
  montant: number,
  poste: PosteBudget | undefined,
  postesBudget: PosteBudgetData[]
): boolean {
  const reste = getResteDisponible(poste, postesBudget);
  if (reste === null) return false;
  return montant > reste;
}

/**
 * Calcule le pourcentage de consommation d'un poste
 */
export function getPourcentageConsommation(
  poste: PosteBudget | undefined,
  postesBudget: PosteBudgetData[]
): number | null {
  if (!poste) return null;
  const posteBudget = postesBudget.find(p => p.poste === poste);
  if (!posteBudget || posteBudget.budgetVote === 0) return null;
  return (posteBudget.consomme / posteBudget.budgetVote) * 100;
}

export const detectFournisseurId = (facture: Facture): string | undefined => {
  const found = MOCK_FOURNISSEURS.find(f =>
    facture.fournisseur.toLowerCase().includes(f.nom.toLowerCase()) ||
    f.nom.toLowerCase().includes(facture.fournisseur.toLowerCase())
  );
  return found?.id;
};

export const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
};

export const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('fr-FR');
};

/**
 * Vérifie si une facture a au moins une pièce jointe
 */
export function hasPieceJointe(facture: Facture): boolean {
  return !!(facture.fichier || (facture.piecesJointes && facture.piecesJointes.length > 0));
}

/**
 * Compte le nombre de pièces jointes d'une facture
 */
export function countPiecesJointes(facture: Facture): number {
  let count = 0;
  if (facture.fichier) count++;
  if (facture.piecesJointes) count += facture.piecesJointes.length;
  return count;
}

/**
 * Calcule le nombre de jours depuis la création de la facture
 */
export function getJoursDepuisCreation(dateFacture: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateCreation = new Date(dateFacture);
  dateCreation.setHours(0, 0, 0, 0);
  const diffTime = today.getTime() - dateCreation.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Vérifie si une facture a une PJ manquante depuis plus de X jours (défaut: 7)
 */
export function isPJManquanteAlerte(facture: Facture, seuilJours: number = 7): boolean {
  if (hasPieceJointe(facture)) return false;
  const joursDepuisCreation = getJoursDepuisCreation(facture.date);
  return joursDepuisCreation > seuilJours;
}

/**
 * Récupère l'URL de la pièce jointe principale
 */
export function getPJPrincipale(facture: Facture): string | null {
  // Priorité au fichier principal
  if (facture.fichier) return facture.fichier;
  // Sinon, la première PJ marquée comme principale ou la première
  if (facture.piecesJointes && facture.piecesJointes.length > 0) {
    const principale = facture.piecesJointes.find(pj => pj.estPrincipale);
    return principale?.url || facture.piecesJointes[0].url;
  }
  return null;
}

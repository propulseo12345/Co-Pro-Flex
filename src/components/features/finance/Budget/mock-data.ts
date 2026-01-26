import type { PosteBudgetData } from './types';

/**
 * Données mockées des postes budgétaires pour 2025
 * Ces données simulent les postes avec leur budget voté et leur consommation actuelle
 */
export const MOCK_POSTES_BUDGET: PosteBudgetData[] = [
  // Postes courants
  {
    poste: 'eau',
    label: 'Eau',
    budgetVote: 12000,
    consomme: 10500,
  },
  {
    poste: 'electricite',
    label: 'Électricité',
    budgetVote: 8500,
    consomme: 6740,
  },
  {
    poste: 'assurance',
    label: 'Assurance',
    budgetVote: 15000,
    consomme: 3200,
  },
  {
    poste: 'menage',
    label: 'Ménage',
    budgetVote: 9600,
    consomme: 4800,
  },
  {
    poste: 'ascenseur',
    label: 'Ascenseur',
    budgetVote: 18000,
    consomme: 9450,
  },
  {
    poste: 'espaces_verts',
    label: 'Espaces verts',
    budgetVote: 6000,
    consomme: 2400,
  },
  {
    poste: 'divers',
    label: 'Divers',
    budgetVote: 18400,
    consomme: 8750,
  },
  // Postes maintenance
  {
    poste: 'plomberie',
    label: 'Plomberie',
    budgetVote: 5000,
    consomme: 520,
  },
  {
    poste: 'chauffage',
    label: 'Chauffage',
    budgetVote: 8000,
    consomme: 1200,
  },
  {
    poste: 'toiture',
    label: 'Toiture',
    budgetVote: 10000,
    consomme: 3550,
  },
  {
    poste: 'parking',
    label: 'Parking',
    budgetVote: 3000,
    consomme: 220,
  },
  {
    poste: 'securite',
    label: 'Sécurité',
    budgetVote: 4000,
    consomme: 1010,
  },
  {
    poste: 'parties_communes',
    label: 'Parties communes',
    budgetVote: 5000,
    consomme: 800,
  },
];

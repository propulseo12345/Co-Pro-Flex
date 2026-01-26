/**
 * Configuration des catégories de notes pour le journal de recouvrement
 */
import type { CategorieNote } from '@/types/models/impaye';

export interface CategorieNoteConfig {
  value: CategorieNote;
  label: string;
  couleur: string;
  icone: string; // Nom de l'icône Lucide
  description: string;
}

export const CATEGORIES_NOTES: CategorieNoteConfig[] = [
  {
    value: 'relance_amiable',
    label: 'Relance amiable',
    couleur: '#3b82f6', // blue-500
    icone: 'Mail',
    description: 'Courrier ou email de relance simple',
  },
  {
    value: 'mise_en_demeure',
    label: 'Mise en demeure',
    couleur: '#f59e0b', // amber-500
    icone: 'AlertTriangle',
    description: 'Courrier recommandé de mise en demeure',
  },
  {
    value: 'echange_avocat',
    label: 'Échange avocat',
    couleur: '#8b5cf6', // violet-500
    icone: 'Scale',
    description: 'Correspondance avec le conseil juridique',
  },
  {
    value: 'courrier_recommande',
    label: 'Courrier recommandé',
    couleur: '#6366f1', // indigo-500
    icone: 'Send',
    description: 'Envoi recommandé avec accusé de réception',
  },
  {
    value: 'appel_telephonique',
    label: 'Appel téléphonique',
    couleur: '#22c55e', // green-500
    icone: 'Phone',
    description: 'Contact téléphonique avec le débiteur',
  },
  {
    value: 'commandement_payer',
    label: 'Commandement de payer',
    couleur: '#ef4444', // red-500
    icone: 'FileWarning',
    description: 'Commandement de payer par huissier',
  },
  {
    value: 'audience',
    label: 'Audience',
    couleur: '#0ea5e9', // sky-500
    icone: 'Gavel',
    description: 'Audience devant le tribunal',
  },
  {
    value: 'jugement',
    label: 'Jugement',
    couleur: '#14b8a6', // teal-500
    icone: 'FileCheck',
    description: 'Décision de justice rendue',
  },
  {
    value: 'huissier',
    label: 'Huissier',
    couleur: '#f97316', // orange-500
    icone: 'UserCheck',
    description: 'Action de l\'huissier de justice',
  },
  {
    value: 'echeancier',
    label: 'Échéancier',
    couleur: '#10b981', // emerald-500
    icone: 'Calendar',
    description: 'Mise en place d\'un plan d\'apurement',
  },
  {
    value: 'paiement_partiel',
    label: 'Paiement partiel',
    couleur: '#84cc16', // lime-500
    icone: 'Banknote',
    description: 'Réception d\'un paiement partiel',
  },
  {
    value: 'decision_cs',
    label: 'Décision CS',
    couleur: '#a855f7', // purple-500
    icone: 'Users',
    description: 'Décision du Conseil Syndical',
  },
  {
    value: 'autre',
    label: 'Autre',
    couleur: '#6b7280', // gray-500
    icone: 'FileText',
    description: 'Note diverse',
  },
];

/**
 * Récupère la configuration d'une catégorie par sa valeur
 */
export function getCategorieConfig(categorie: CategorieNote): CategorieNoteConfig | undefined {
  return CATEGORIES_NOTES.find((c) => c.value === categorie);
}

/**
 * Récupère la couleur d'une catégorie
 */
export function getCategorieColor(categorie: CategorieNote): string {
  return getCategorieConfig(categorie)?.couleur || '#6b7280';
}

/**
 * Récupère le label d'une catégorie
 */
export function getCategorieLabel(categorie: CategorieNote): string {
  return getCategorieConfig(categorie)?.label || categorie;
}

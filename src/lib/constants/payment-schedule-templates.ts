/**
 * Modèles d'échéanciers de paiement pour les appels de fonds travaux
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PaymentScheduleTemplate =
  | 'unique'
  | 'fifty_fifty'
  | 'classic'
  | 'quarterly'
  | 'custom';

export interface SchedulePhaseTemplate {
  label: string;
  percentage: number;
}

export interface ScheduleTemplateConfig {
  id: PaymentScheduleTemplate;
  label: string;
  description: string;
  phases: SchedulePhaseTemplate[];
}

// ---------------------------------------------------------------------------
// Constantes de retenue de garantie
// ---------------------------------------------------------------------------

/** Pourcentage retenu sur la dernière phase (en points de pourcentage) */
export const RETENTION_PERCENTAGE = 5;

/** Durée de la retenue de garantie en mois */
export const RETENTION_DURATION_MONTHS = 12;

// ---------------------------------------------------------------------------
// Modèles prédéfinis
// ---------------------------------------------------------------------------

export const PAYMENT_SCHEDULE_TEMPLATES: ScheduleTemplateConfig[] = [
  {
    id: 'unique',
    label: 'Appel unique',
    description: '100 % en un seul appel',
    phases: [{ label: 'Appel unique', percentage: 100 }],
  },
  {
    id: 'fifty_fifty',
    label: 'Deux appels (50/50)',
    description: '50 % au démarrage, 50 % à mi-parcours',
    phases: [
      { label: '1er appel – Démarrage', percentage: 50 },
      { label: '2e appel – Mi-parcours', percentage: 50 },
    ],
  },
  {
    id: 'classic',
    label: 'Classique (30/30/30/10)',
    description: '3 appels de 30 % + solde de 10 %',
    phases: [
      { label: '1er appel – Démarrage', percentage: 30 },
      { label: '2e appel – Avancement', percentage: 30 },
      { label: '3e appel – Fin de travaux', percentage: 30 },
      { label: 'Solde', percentage: 10 },
    ],
  },
  {
    id: 'quarterly',
    label: 'Trimestriel (25/25/25/25)',
    description: '4 appels trimestriels égaux',
    phases: [
      { label: '1er trimestre', percentage: 25 },
      { label: '2e trimestre', percentage: 25 },
      { label: '3e trimestre', percentage: 25 },
      { label: '4e trimestre', percentage: 25 },
    ],
  },
  {
    id: 'custom',
    label: 'Personnalisé',
    description: 'Définir librement les phases et pourcentages',
    phases: [],
  },
];

// ---------------------------------------------------------------------------
// Map pour accès rapide par ID
// ---------------------------------------------------------------------------

export const PAYMENT_SCHEDULE_MAP: Record<PaymentScheduleTemplate, ScheduleTemplateConfig> =
  PAYMENT_SCHEDULE_TEMPLATES.reduce((acc, tpl) => {
    acc[tpl.id] = tpl;
    return acc;
  }, {} as Record<PaymentScheduleTemplate, ScheduleTemplateConfig>);

// ---------------------------------------------------------------------------
// Fonctions utilitaires
// ---------------------------------------------------------------------------

/**
 * Récupère un modèle d'échéancier par son ID
 */
export function getTemplateById(id: string): ScheduleTemplateConfig | undefined {
  return PAYMENT_SCHEDULE_TEMPLATES.find((t) => t.id === id);
}

/**
 * Applique la retenue de garantie sur un ensemble de phases.
 *
 * Réduit la dernière phase de `RETENTION_PERCENTAGE` points de pourcentage
 * et ajoute une phase « Retenue de garantie » correspondante.
 * Le total reste à 100 %.
 *
 * @returns Nouvelles phases avec retenue (copie, pas de mutation)
 */
export function applyRetention(phases: SchedulePhaseTemplate[]): SchedulePhaseTemplate[] {
  if (phases.length === 0) return [];

  const result = phases.map((p) => ({ ...p }));
  const last = result[result.length - 1];

  if (last.percentage <= RETENTION_PERCENTAGE) {
    // Si la dernière phase est trop petite, on ne peut pas retenir davantage
    return result;
  }

  last.percentage -= RETENTION_PERCENTAGE;

  result.push({
    label: 'Retenue de garantie',
    percentage: RETENTION_PERCENTAGE,
  });

  return result;
}

/**
 * Calcule les montants en euros à partir des pourcentages et du total.
 *
 * @returns Tableau de montants arrondis au centime, ajustés pour que
 *          la somme corresponde exactement au total.
 */
export function computeAmounts(phases: SchedulePhaseTemplate[], total: number): number[] {
  if (phases.length === 0) return [];

  const raw = phases.map((p) => Math.round((p.percentage / 100) * total * 100) / 100);

  // Ajuster l'arrondi sur la dernière phase pour coller au total
  const sum = raw.reduce((s, v) => s + v, 0);
  const diff = Math.round((total - sum) * 100) / 100;
  raw[raw.length - 1] = Math.round((raw[raw.length - 1] + diff) * 100) / 100;

  return raw;
}

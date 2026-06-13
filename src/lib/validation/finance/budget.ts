import { z } from 'zod';
import { montantPositif, texteOptionnel } from '@/lib/validation/common';
import type { PaymentScheduleTemplate } from '@/lib/constants/payment-schedule-templates';

/**
 * Valeurs autorisées pour le modèle d'échéancier prestataire.
 * Alignées sur PaymentScheduleTemplate de payment-schedule-templates.ts.
 */
export const BUDGET_SCHEDULE_TEMPLATES = [
  'unique',
  'fifty_fifty',
  'classic',
  'quarterly',
  'custom',
] as const satisfies readonly PaymentScheduleTemplate[];

/**
 * Schéma de validation du sous-formulaire « budget travaux »
 * (étape de configuration dans CreateBudgetModal).
 *
 * NB1 : Le type fonctionnement ne passe pas par ce schéma (il est délégué
 * à BudgetEditorModal sans formulaire interactif propre).
 *
 * NB2 : L'avertissement « somme des phases customs ≠ 100 % » reste un
 * warning d'UI géré par PaymentSchedulePreview, PAS une erreur bloquante.
 *
 * NB3 : typeTravaux est une string ouverte côté type (NouveauBudgetForm)
 * — on valide uniquement la présence, pas la valeur.
 */
export const budgetTravauxSchema = z.object({
  /** Année budgétaire (ex. 2026). Coercée depuis la valeur string d'un <input type="number">. */
  annee: z.coerce
    .number()
    .int('L\'année doit être un nombre entier')
    .min(2000, 'L\'année doit être supérieure à 2000')
    .max(2100, 'L\'année doit être inférieure à 2100'),

  /** Nom du budget (obligatoire pour les budgets travaux). */
  nom: z.string().trim().min(1, 'Le nom du budget est requis'),

  /** Identifiant du type de travaux (doit correspondre à un TYPES_TRAVAUX[].id). */
  typeTravaux: z.string().min(1, 'Sélectionnez un type de travaux'),

  /** Montant total du budget en euros, strictement positif. */
  montantTotal: montantPositif,

  /** Description libre des travaux (optionnelle). */
  description: texteOptionnel,

  /** Modèle d'échéancier prestataire sélectionné. */
  scheduleTemplate: z.enum(BUDGET_SCHEDULE_TEMPLATES),

  /** Retenue de garantie 5 % activée ou non. */
  withRetention: z.boolean(),
});

/** Type des valeurs telles que saisies dans le formulaire (entrée). */
export type BudgetTravauxInput = z.input<typeof budgetTravauxSchema>;

/** Type des valeurs après validation et coercition (sortie). */
export type BudgetTravauxOutput = z.output<typeof budgetTravauxSchema>;

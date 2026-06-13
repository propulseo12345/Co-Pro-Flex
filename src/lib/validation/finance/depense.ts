import { z } from 'zod';
import { montantPositif, dateISORequise, texteOptionnel } from '@/lib/validation/common';

/**
 * Postes budgétaires reconnus (alignés sur PosteBudget de Budget/types.ts).
 * Définis ici pour pouvoir les valider dans le schéma.
 */
export const POSTES_BUDGET = [
  'eau',
  'electricite',
  'assurance',
  'menage',
  'ascenseur',
  'espaces_verts',
  'divers',
  'plomberie',
  'chauffage',
  'toiture',
  'parking',
  'securite',
  'parties_communes',
] as const;

export type PosteBudgetEnum = (typeof POSTES_BUDGET)[number];

/**
 * Schéma de validation du formulaire de saisie / modification d'une dépense.
 *
 * Règles métier encodées :
 *  - libelle    : requis, non vide après trim
 *  - fournisseur: requis, non vide après trim
 *  - montant    : > 0 (coercion string→number pour les <input type="number">)
 *  - date       : format YYYY-MM-DD, réellement valide
 *  - poste      : optionnel (enum ou chaîne vide)
 *  - compteId   : optionnel — pré-rempli automatiquement depuis le poste
 *  - recuperable / deductible : ≥ 0 (pas de valeur négative)
 *
 * NB : la cohérence recuperable + deductible ≤ montant est un WARNING d'UI,
 *      pas une erreur bloquante (cf. règle avertissements hors Zod).
 */
export const depenseSchema = z.object({
  libelle: z.string().trim().min(1, 'Le libellé est requis'),
  fournisseur: z.string().trim().min(1, 'Le fournisseur est requis'),
  montant: montantPositif,
  date: dateISORequise,
  // '' = aucun poste sélectionné
  poste: z.enum(POSTES_BUDGET).or(z.literal('')).optional(),
  compteId: texteOptionnel,
  recuperable: z.coerce
    .number()
    .refine((n) => Number.isFinite(n), 'Valeur invalide')
    .refine((n) => n >= 0, 'Le montant récupérable doit être ≥ 0')
    .optional()
    .default(0),
  deductible: z.coerce
    .number()
    .refine((n) => Number.isFinite(n), 'Valeur invalide')
    .refine((n) => n >= 0, 'Le montant déductible doit être ≥ 0')
    .optional()
    .default(0),
});

export type DepenseFormInput = z.input<typeof depenseSchema>;
export type DepenseFormOutput = z.output<typeof depenseSchema>;

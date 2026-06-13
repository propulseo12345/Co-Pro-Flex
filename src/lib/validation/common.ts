import { z } from 'zod';

/**
 * Primitives de validation Zod réutilisables (messages en français).
 * Source unique pour les règles transverses des formulaires.
 */

/**
 * Montant en euros strictement positif. Accepte un `number` ou une `string`
 * (les inputs HTML renvoient une string) via coercion.
 */
export const montantPositif = z.coerce
  .number()
  .refine((n) => Number.isFinite(n), 'Montant invalide')
  .refine((n) => n > 0, 'Le montant doit être supérieur à 0');

/**
 * Date au format ISO `YYYY-MM-DD` (valeur d'un `<input type="date">`),
 * requise et réellement valide.
 */
export const dateISORequise = z
  .string()
  .min(1, 'La date est requise')
  .refine(
    (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)),
    'Date invalide'
  );

/** Chaîne optionnelle nettoyée (trim) — pour les champs texte facultatifs. */
export const texteOptionnel = z.string().trim().optional();

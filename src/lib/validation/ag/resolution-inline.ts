import { z } from 'zod';
import type { MajorityType } from '@/lib/constants/resolutions';

/**
 * Majorités légales d'une résolution (loi du 10 juillet 1965).
 * Source unique pour la validation : `as const satisfies` garantit à la
 * compilation que cette liste reste alignée sur le type `MajorityType`
 * (un ajout/retrait de majorité dans resolutions.ts casse ici si on oublie).
 */
export const MAJORITY_TYPES = [
  'ART_24',
  'ART_25',
  'ART_25_1',
  'ART_26',
  'ART_26_1',
  'UNANIMITE',
  'INFORMATION',
] as const satisfies readonly MajorityType[];

/**
 * Schéma de validation de l'édition inline d'une résolution d'AG.
 *
 * Règles métier encodées :
 * - titre : requis, non vide même après trim ;
 * - texte : requis, non vide même après trim ;
 * - majorite : doit être une majorité légale (`MajorityType`).
 *
 * NB : l'identifiant `id` de la résolution n'est pas saisi par l'utilisateur
 * (il est préservé tel quel à la soumission) — il ne fait donc pas partie du schéma.
 */
export const resolutionInlineSchema = z.object({
  titre: z.string().trim().min(1, 'Le titre est obligatoire'),
  texte: z.string().trim().min(1, 'Le texte est obligatoire'),
  majorite: z.enum(MAJORITY_TYPES),
});

export type ResolutionInlineInput = z.input<typeof resolutionInlineSchema>;
export type ResolutionInlineOutput = z.output<typeof resolutionInlineSchema>;

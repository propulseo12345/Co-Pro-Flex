import { z } from 'zod';
import { montantPositif, dateISORequise } from '@/lib/validation/common';

/**
 * Postes budgétaires exposés par PosteBudgetSelector (ALL_POSTES, ligne 19-27).
 * Intentionnellement restreints aux 7 postes rendus dans le <select> :
 * les 6 postes de maintenance (plomberie, chauffage…) ne sont pas accessibles
 * via l'UI actuelle et ne doivent donc pas être validables.
 * Quand ALL_POSTES sera étendu, ajouter les entrées ici ET dans les tests.
 */
export const POSTES_BUDGET = [
  'eau',
  'electricite',
  'assurance',
  'menage',
  'ascenseur',
  'espaces_verts',
  'divers',
] as const;

export type PosteBudgetValue = (typeof POSTES_BUDGET)[number];

/**
 * Schéma de validation de la création d'une facture fournisseur.
 *
 * Règles métier encodées :
 * - fournisseur : requis (saisie libre ou sélection — même mécanisme qu'avant).
 * - montant : TTC > 0 (mono-poste, TVA non récupérable).
 * - posteBudgetaire : poste de charge obligatoire, limité aux 7 postes d'ALL_POSTES.
 * - date : date ISO requise (valeur d'un <input type="date">).
 * - dateEcheance : requise ET >= date facture (superRefine, erreur sur dateEcheance).
 * - reference : requis (aligné sur le label "*" du composant existant).
 *
 * HORS schéma (warnings d'UI uniquement) :
 * - dépassement du budget du poste → warning dans PosteBudgetSelector, jamais bloquant.
 * - pièces jointes manquantes → suggestion non bloquante.
 * - IBAN du fournisseur → non validé ici.
 */
export const factureSchema = z
  .object({
    date: dateISORequise,
    dateEcheance: dateISORequise,
    fournisseur: z.string().min(1, 'Le fournisseur est requis'),
    reference: z.string().min(1, 'La référence est requise'),
    montant: montantPositif,
    posteBudgetaire: z.enum(POSTES_BUDGET, {
      error: 'Sélectionnez un poste budgétaire',
    }),
    // piecesJointes est géré hors schéma (FacturePJSection) — non inclus.
  })
  .superRefine((data, ctx) => {
    // Règle inter-champs : échéance >= date de facture.
    // Les deux champs sont déjà validés comme ISO par dateISORequise, donc
    // la comparaison lexicographique est fiable sur YYYY-MM-DD.
    if (data.dateEcheance && data.date && data.dateEcheance < data.date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La date d'échéance doit être égale ou postérieure à la date de facture",
        path: ['dateEcheance'],
      });
    }
  });

export type FactureFormInput = z.input<typeof factureSchema>;
export type FactureFormOutput = z.output<typeof factureSchema>;

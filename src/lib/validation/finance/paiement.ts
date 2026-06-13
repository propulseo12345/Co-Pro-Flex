import { z } from 'zod';
import { montantPositif, dateISORequise, texteOptionnel } from '@/lib/validation/common';

/** Modes de paiement acceptés (alignés sur PaymentModal / RecordPaymentPayload). */
export const PAYMENT_METHODS = ['transfer', 'direct_debit', 'card', 'check', 'cash', 'other'] as const;

/** Natures d'imputation (filtre FIFO optionnel). */
export const PAYMENT_NATURES = ['current', 'works', 'alur'] as const;

/**
 * Schéma de validation de l'enregistrement d'un paiement.
 * NB : l'avertissement « montant > restant dû » (trop-perçu porté en avance 450-3)
 * reste un *warning* géré dans l'UI, PAS une erreur de validation.
 */
export const paymentSchema = z.object({
  lotId: z.string().min(1, 'Sélectionnez un lot'),
  amount: montantPositif,
  paymentDate: dateISORequise,
  method: z.enum(PAYMENT_METHODS),
  // '' = « toutes natures (FIFO) » ; sinon une nature explicite.
  natureFilter: z.enum(PAYMENT_NATURES).or(z.literal('')).optional(),
  reference: texteOptionnel,
});

export type PaymentFormValues = z.infer<typeof paymentSchema>;
